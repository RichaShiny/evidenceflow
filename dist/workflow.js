// Workflow corrections retain records created by the previous release.
data.tests ||= [];
let returnFocus;
const modal=document.getElementById('modal');
modal.setAttribute('aria-labelledby','form-title');
document.getElementById('toast').setAttribute('role','status');
const notice=document.createElement('div');
notice.className='local-notice';
notice.textContent='Personal workspace · Records are saved in this browser. Export a backup to keep a separate copy. Existing sample records are retained.';
document.querySelector('.top').after(notice);
const tools=document.createElement('div');
tools.className='workspace-tools';
tools.innerHTML='<button class="btn secondary" id="backup">Download workspace backup</button>';
notice.after(tools);
const periodSelect=document.getElementById('period');
const available=new Set([...periodSelect.options].map(o=>o.value));
try{for(const value of JSON.parse(localStorage.getItem('evidenceflow-periods')||'[]'))available.add(value)}catch{}
for(const collection of [data.evidence,data.actions,data.tests]) for(const record of collection) if(record.period)available.add(record.period);
for(let year=new Date().getFullYear()-1;year<=new Date().getFullYear()+1;year++) for(let quarter=1;quarter<=4;quarter++)available.add('Q'+quarter+' FY'+year);
for(const value of available)if(![...periodSelect.options].some(o=>o.value===value))periodSelect.add(new Option(value,value));
const preferred=localStorage.getItem('evidenceflow-period');
if(preferred&&!available.has(preferred)){periodSelect.add(new Option(preferred,preferred));available.add(preferred)}
if(available.has(preferred))periodSelect.value=preferred;
periodSelect.onchange=()=>{render();try{localStorage.setItem('evidenceflow-period',period());localStorage.setItem('evidenceflow-periods',JSON.stringify([...periodSelect.options].map(o=>o.value)))}catch{toast('Period changed, but this browser could not remember your selection.')}};
const originalRender=render;
render=function(){originalRender();const detail=document.getElementById('control-evidence');const history=document.createElement('div');history.className='test-history';history.innerHTML='<h3>Recorded tests</h3>';const tests=data.tests.filter(t=>t.control===selected&&t.period===period());if(!tests.length)history.innerHTML+='<p>No test recorded for this control and period.</p>';for(const test of tests){const article=document.createElement('article');article.innerHTML='<b>'+esc(test.result)+'</b><span class="sub">'+esc(test.reviewer)+' · '+esc(test.date)+'</span><p>'+esc(test.notes)+'</p>';history.append(article)}detail.append(history)};
function closeDialog(){modal.classList.remove('open');returnFocus?.focus()}
const originalOpen=open;
open=function(kind){returnFocus=document.activeElement;originalOpen(kind);associateLabels();modal.querySelector('input,select')?.focus()};
function associateLabels(){modal.querySelectorAll('.field').forEach((field,i)=>{const input=field.querySelector('input,select,textarea');const label=field.querySelector('label');if(input&&label){input.id='form-field-'+i;label.htmlFor=input.id}})}
function openTest(){returnFocus=document.activeElement;mode='test';document.getElementById('form-title').textContent='Record test · '+selected;document.getElementById('form-fields').innerHTML='<div class="field"><label>Result</label><select name="result"><option>Pass</option><option>Fail</option><option>Inconclusive</option></select></div><div class="field"><label>Reviewer</label><input class="input" name="reviewer" required value="Richa Tigiripally"></div><div class="field"><label>Test date</label><input class="input" name="date" type="date" required></div><div class="field"><label>Procedure, evidence reviewed, and conclusion</label><textarea class="input" name="notes" required></textarea></div>';modal.querySelector('[name=date]').value=new Date().toISOString().slice(0,10);associateLabels();modal.classList.add('open');modal.querySelector('select').focus()}
const originalSubmit=document.getElementById('form').onsubmit;
document.getElementById('form').onsubmit=function(event){event.preventDefault();for(const input of this.querySelectorAll('input[required],textarea[required]')){if(!input.value.trim()){input.setCustomValidity('Enter a value.');input.reportValidity();input.oninput=()=>input.setCustomValidity('');return}}if(mode==='test'){const values=Object.fromEntries(new FormData(this));data.tests.unshift({id:crypto.randomUUID(),...values,control:selected,period:period()});try{save()}catch{data.tests.shift();return}closeDialog();render();toast('Test saved with reviewer and conclusion');return}originalSubmit(event);returnFocus?.focus()};
document.getElementById('cancel').onclick=closeDialog;
modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeDialog()}if(event.key==='Tab'){const elements=[...modal.querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled);const first=elements[0],last=elements.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.getElementById('backup').onclick=()=>download('evidenceflow-backup.json',JSON.stringify({version:1,exportedAt:new Date().toISOString(),...data},null,2),'application/json');
document.getElementById('export-report').onclick=()=>csv('assurance-summary-'+period().replaceAll(' ','-')+'.csv',[['Period',period()],['Evidence records',items('evidence').length],['Mapped evidence',items('evidence').filter(x=>x.status==='Mapped').length],['Open actions',items('actions').filter(x=>x.status!=='Complete').length],[],['Control','Test result','Reviewer','Date','Conclusion'],...data.tests.filter(t=>t.period===period()).map(t=>[t.control,t.result,t.reviewer,t.date,t.notes])]);
const attachmentDB=new Promise((resolve,reject)=>{const request=indexedDB.open('evidenceflow-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
async function attachment(id,value){const db=await attachmentDB;return new Promise((resolve,reject)=>{const tx=db.transaction('files',value?'readwrite':'readonly');const request=value?tx.objectStore('files').put(value,String(id)):tx.objectStore('files').get(String(id));let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error)})}
let editingId=null;
const formOpen=open;
open=function(kind,id=null){editingId=id;formOpen(kind);const form=document.getElementById('form');if(id!==null){const record=data[kind==='evidence'?'evidence':'actions'].find(x=>String(x.id)===String(id));for(const [key,value]of Object.entries(record)){const input=form.elements.namedItem(key);if(input)input.value=value}document.getElementById('form-title').textContent=kind==='evidence'?'Edit evidence':'Edit action'}
if(kind==='evidence'){const field=document.createElement('div');field.className='field';field.innerHTML='<label>Attach evidence file (stored in this browser)</label><input class="input" type="file" name="attachment"><small>Maximum 20 MB. Workspace JSON backups contain records only; keep a separate copy of files.</small>';document.getElementById('form-fields').append(field)}
if(kind==='action'){const field=document.createElement('div');field.className='field';field.innerHTML='<label>Status</label><select name="status"><option>Not started</option><option>In progress</option><option>Complete</option></select>';document.getElementById('form-fields').append(field);if(id!==null)form.elements.status.value=data.actions.find(x=>String(x.id)===String(id)).status}
associateLabels()};
const workflowSubmit=document.getElementById('form').onsubmit;
document.getElementById('form').onsubmit=async function(event){event.preventDefault();if(mode==='test'){workflowSubmit.call(this,event);return}if(!this.reportValidity())return;const values=Object.fromEntries(new FormData(this));for(const key of ['name','title','source','owner'])if(key in values&&!values[key].trim()){toast('Required fields cannot be blank.');return}
const file=values.attachment;delete values.attachment;
if(file?.size>20*1024*1024){toast('Choose a file smaller than 20 MB.');return}
const collection=mode==='evidence'?'evidence':'actions';const index=data[collection].findIndex(x=>String(x.id)===String(editingId));const old=index>=0?data[collection][index]:null;const record={...old,...values,id:old?.id||crypto.randomUUID(),period:old?.period||period()};const button=this.querySelector('button:not([type=button])');button.disabled=true;
try{if(file?.size){await attachment(record.id,file);record.fileName=file.name}if(index>=0)data[collection][index]=record;else data[collection].unshift(record);try{save()}catch(error){if(index>=0)data[collection][index]=old;else data[collection].shift();throw error}closeDialog();render();toast('Record saved')}catch(error){toast('Could not save this record: '+error.message)}finally{button.disabled=false}};
const workflowRender=render;
render=function(){workflowRender();document.querySelectorAll('[data-evidence]').forEach(button=>{button.dataset.editEvidence=button.dataset.evidence;delete button.dataset.evidence;button.title='Edit evidence and review status'});document.querySelectorAll('[data-action]').forEach(button=>{button.dataset.editAction=button.dataset.action;delete button.dataset.action;button.title='Edit action and status'});document.querySelectorAll('#evidence-list tr').forEach((row,index)=>{const record=items('evidence')[index];if(!record?.fileName)return;const button=document.createElement('button');button.className='text-btn';button.textContent='Download '+record.fileName;button.dataset.file=record.id;row.cells[0].append(button)})};
document.addEventListener('click',async event=>{const target=event.target.closest('[data-edit-evidence],[data-edit-action],[data-file]');if(!target)return;if(target.dataset.editEvidence)open('evidence',target.dataset.editEvidence);else if(target.dataset.editAction)open('action',target.dataset.editAction);else{try{const file=await attachment(target.dataset.file);if(!file){toast('This file is unavailable in this browser. Attach it again.');return}download(file.name,file,file.type)}catch(error){toast('File could not be opened: '+error.message)}}});
render();
