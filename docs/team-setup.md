# Team accounts and database setup

The frontend remains on GitHub Pages. Supabase provides email/password accounts, PostgreSQL and a private Storage bucket.

## Provisioning

1. Create a Supabase project.
2. Run `supabase/migrations/202609130001_workspaces.sql` in its SQL editor.
3. Set Authentication → URL Configuration → Site URL to `https://richashiny.github.io/evidenceflow/`. Add that same URL to allowed redirects.
4. Retain email confirmation for new accounts.
5. Put the project URL and **publishable key** in `dist/config.js`. Never use a secret or service-role key in the frontend.
6. Run `npm ci`, `npm test`, and `npm run build`; commit the source, configuration, lockfile and bundle.

## Team workflow

Open Team account, create an account, confirm its email, and sign in. Create a workspace. The workspace starts empty; browser-local samples and existing personal records are never uploaded automatically.

The owner may grant an invitation to an email address. Share the website link with the teammate separately; the invitation action does not send a message. Once the teammate confirms that email and signs in, the database grants workspace membership. Members may read and edit shared records and upload/download workspace files.

Refresh shared data loads colleagues' latest committed data. Every save supplies the revision it read. If someone saved first, the database rejects the stale write; the failed form stays open. Copy unsaved edits before cancelling and refreshing, then reapply them.

Personal workspace remains an explicit local mode. Signing out clears shared state from the page and restores personal browser records.

## Storage and security

- Workspace records are committed atomically as a JSON document with a revision counter; this preserves the existing evidence/action/test model. Each document is limited to 4 MB.
- PostgreSQL row-level security isolates workspace reads. Writes run through membership-checked functions with a fixed empty search path.
- Only owners grant invitations or remove other members. Email confirmation is required to accept an invitation.
- Audit records capture workspace creation, saves and membership operations.
- Files use a private bucket, a workspace-prefixed path and membership policies. Each file is limited to 20 MB. Downloads require a signed-in member.
- Failed record saves can leave an unreferenced uploaded object; periodic storage reconciliation is not implemented.
- JSON backups contain metadata, not evidence-file bytes.
- Changes are refreshed explicitly, not streamed in real time.

## Verification

`npm test` executes the migration against embedded PostgreSQL (PGlite) with simulated auth identities. It covers member/outsider isolation, invitation authority, acceptance, membership removal, denied direct writes and stale revisions. These tests do not substitute for live authentication/email/storage checks.
