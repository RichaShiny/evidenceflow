-- Shared state is committed atomically with optimistic concurrency.
create table public.ef_workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 120),
 owner_id uuid not null references auth.users(id),
 revision bigint not null default 0,
 document jsonb not null default '{"evidence":[],"actions":[],"tests":[]}',
 updated_at timestamptz not null default now()
);
create table public.ef_members (
 workspace_id uuid references public.ef_workspaces(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 primary key(workspace_id,user_id)
);
create table public.ef_invites (
 workspace_id uuid references public.ef_workspaces(id) on delete cascade,
 email text not null check(email=lower(trim(email))),
 created_at timestamptz not null default now(),
 primary key(workspace_id,email)
);
create table public.ef_audit (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.ef_workspaces(id) on delete cascade,
 actor uuid not null references auth.users(id),
 event text not null,
 revision bigint,
 created_at timestamptz not null default now()
);
alter table public.ef_workspaces enable row level security;
alter table public.ef_members enable row level security;
alter table public.ef_invites enable row level security;
alter table public.ef_audit enable row level security;
create function public.ef_is_member(w uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ef_members where workspace_id=w and user_id=auth.uid())
$$;
create policy member_read on public.ef_workspaces for select to authenticated using(public.ef_is_member(id));
create policy member_read on public.ef_members for select to authenticated using(public.ef_is_member(workspace_id));
create policy owner_read on public.ef_invites for select to authenticated using(exists(select 1 from public.ef_workspaces w where w.id=workspace_id and w.owner_id=auth.uid()));
create policy member_read on public.ef_audit for select to authenticated using(public.ef_is_member(workspace_id));
grant select on public.ef_workspaces,public.ef_members,public.ef_invites,public.ef_audit to authenticated;
revoke insert,update,delete on public.ef_workspaces,public.ef_members,public.ef_invites,public.ef_audit from authenticated,anon;
create function public.ef_create_workspace(workspace_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into public.ef_workspaces(name,owner_id) values(trim(workspace_name),auth.uid()) returning id into w;
 insert into public.ef_members values(w,auth.uid());
 insert into public.ef_audit(workspace_id,actor,event,revision) values(w,auth.uid(),'Workspace created',0);
 return w;
end $$;
create function public.ef_save_workspace(w uuid,expected_revision bigint,new_document jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare next_revision bigint;
begin
 if not public.ef_is_member(w) then raise exception 'Workspace access denied'; end if;
 if jsonb_typeof(new_document) is distinct from 'object'
 or jsonb_typeof(new_document->'evidence') is distinct from 'array'
 or jsonb_typeof(new_document->'actions') is distinct from 'array'
 or jsonb_typeof(new_document->'tests') is distinct from 'array'
 or octet_length(new_document::text)>4000000 then raise exception 'Invalid workspace data'; end if;
 update public.ef_workspaces set document=new_document,revision=revision+1,updated_at=now()
 where id=w and revision=expected_revision returning revision into next_revision;
 if next_revision is null then raise exception 'CONFLICT: A teammate saved changes. Refresh the workspace before saving again.'; end if;
 insert into public.ef_audit(workspace_id,actor,event,revision) values(w,auth.uid(),'Workspace updated',next_revision);
 return next_revision;
end $$;
create function public.ef_invite_member(w uuid,member_email text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.ef_workspaces where id=w and owner_id=auth.uid()) then raise exception 'Only the workspace owner can invite members'; end if;
 if position('@' in member_email)<2 then raise exception 'Enter a valid email'; end if;
 insert into public.ef_invites(workspace_id,email) values(w,lower(trim(member_email))) on conflict do nothing;
 insert into public.ef_audit(workspace_id,actor,event) values(w,auth.uid(),'Membership invitation added');
end $$;
create function public.ef_accept_invites() returns void
language plpgsql security definer set search_path='' as $$
declare account_email text;
begin
 select lower(email) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null then raise exception 'Confirm your email first'; end if;
 insert into public.ef_members(workspace_id,user_id) select workspace_id,auth.uid() from public.ef_invites where email=account_email on conflict do nothing;
 delete from public.ef_invites where email=account_email;
end $$;
create function public.ef_remove_member(w uuid,member_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.ef_workspaces where id=w and owner_id=auth.uid() and owner_id<>member_id) then raise exception 'Only the owner may remove other members'; end if;
 delete from public.ef_members where workspace_id=w and user_id=member_id;
 insert into public.ef_audit(workspace_id,actor,event) values(w,auth.uid(),'Member removed');
end $$;
revoke all on function public.ef_is_member(uuid),public.ef_create_workspace(text),public.ef_save_workspace(uuid,bigint,jsonb),public.ef_invite_member(uuid,text),public.ef_accept_invites(),public.ef_remove_member(uuid,uuid) from public,anon;
grant execute on function public.ef_is_member(uuid),public.ef_create_workspace(text),public.ef_save_workspace(uuid,bigint,jsonb),public.ef_invite_member(uuid,text),public.ef_accept_invites(),public.ef_remove_member(uuid,uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('evidenceflow','evidenceflow',false,20971520) on conflict(id) do nothing;
create policy ef_files_read on storage.objects for select to authenticated using(bucket_id='evidenceflow' and public.ef_is_member((storage.foldername(name))[1]::uuid));
create policy ef_files_insert on storage.objects for insert to authenticated with check(bucket_id='evidenceflow' and public.ef_is_member((storage.foldername(name))[1]::uuid));
create policy ef_files_delete on storage.objects for delete to authenticated using(bucket_id='evidenceflow' and public.ef_is_member((storage.foldername(name))[1]::uuid));
