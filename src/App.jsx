import {useEffect,useState} from 'react';
import {CheckCircle2,X} from 'lucide-react';
import {useWorkspace,useRoute,caseStatus} from './workspace.js';
import {recordKey,CURRENCIES} from './engine.js';
import {Shell,Filters} from './Shell.jsx';
import {Dialog,RecordInspector,PageHeading,Empty,Notice} from './ui.jsx';
import Overview from './pages/Overview.jsx';
import {Reconciliation,SettlementDetail} from './pages/Reconciliation.jsx';
import {Discrepancies,CaseDetail} from './pages/Discrepancies.jsx';
import Transactions from './pages/Transactions.jsx';
import Reports from './pages/Reports.jsx';
import Imports from './pages/Imports.jsx';
import {SettingsPage,Help} from './pages/Utilities.jsx';

export default function App(){
 const route=useRoute();
 const filters={platform:route.params.get('platform')||'All platforms',currency:CURRENCIES.includes(route.params.get('currency'))?route.params.get('currency'):'USD',from:route.params.get('from')||'',to:route.params.get('to')||''};
 const store=useWorkspace(filters),{workspace,engine,data}=store;
 const [record,setRecord]=useState(null),[toast,setToast]=useState(null),[confirm,setConfirm]=useState(null);
 useEffect(()=>{setRecord(null);window.scrollTo({top:0});},[route.page]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),6000);return()=>clearTimeout(timer);},[toast]);
 function notify(message,error=false){setToast({message,error});}
 function safely(fn,message){try{fn();if(message)notify(message);}catch(e){notify(e.message,true);}}
 function onImport(records,batch){store.importRecords(records,batch);route.go('imports',{success:batch.id,currency:records[0].currency,platform:'',from:'',to:''});notify(`${records.length} records imported. Reconciliation is up to date.`);}
 const filterBar=<Filters filters={filters} workspace={workspace} route={route}/>;
 const common={data,workspace,engine,filters,filterBar,route,go:route.go,goBack:route.back,onRecord:setRecord};
 const id=route.params.get('id');
 const openCount=engine.issues.filter(i=>caseStatus(i,workspace.cases)!=='Resolved').length;
 let content;
 if(route.page==='overview')content=<Overview {...common}/>;
 else if(route.page==='imports'||route.page==='imports/new')content=<Imports {...common} onImport={onImport}/>;
 else if(route.page==='reconciliation')content=<Reconciliation {...common}/>;
 else if(route.page==='reconciliation/detail')content=<SettlementDetail key={id} {...common} settlement={engine.settlements.find(r=>r.uid===id)}/>;
 else if(route.page==='discrepancies')content=<Discrepancies {...common}/>;
 else if(route.page==='discrepancies/detail')content=<CaseDetail key={id} {...common} issue={engine.issues.find(i=>i.id===id)} onUpdate={store.updateCase} notify={notify}/>;
 else if(route.page==='transactions')content=<Transactions {...common}/>;
 else if(route.page==='reports')content=<Reports {...common}/>;
 else if(route.page==='settings')content=<><PageHeading title="Settings" description="Workspace preferences, review rules, and data management."/><WorkspaceName workspace={workspace} onSave={name=>safely(()=>store.save({...workspace,name}),'Workspace name saved.')}/><SettingsPage workspace={workspace} onSave={rules=>safely(()=>store.save({...workspace,rules}),'Review rules saved. Records rechecked.')} onReset={setConfirm}/></>;
 else if(route.page==='help')content=<><PageHeading title="Help & resources" description="Understand your workflow, your data, and your next step."/><Help/></>;
 else content=<Empty title="Page not found" text="Choose a workspace from the navigation." action={<button className="button" onClick={()=>route.go('overview')}>Go to overview</button>}/>;
 return <><Shell route={route} workspace={workspace} openCount={openCount}>{filters.from&&filters.to&&filters.from>filters.to?<Notice tone="amber">The end date must be on or after the start date. Use the date filters below to correct the range.</Notice>:null}{content}<footer className="app-footer">{workspace.mode==='demo'?'Fictional sample data':'Browser-local records'}<span>Automatic reconciliation · Original evidence preserved</span></footer></Shell>{record&&<RecordInspector record={record} onClose={()=>setRecord(null)} related={engine.issues.filter(i=>i.evidence.some(r=>recordKey(r)===recordKey(record)))} onRelated={i=>{setRecord(null);route.go('discrepancies/detail',{id:i.id});}}/>}{confirm&&<Dialog title={confirm==='demo'?'Restore the demo workspace?':'Start a clean workspace?'} onClose={()=>setConfirm(null)}><div className="dialog-body"><Notice tone="amber">This replaces the records, import history, and investigation notes stored in this browser. Export reports and source evidence before continuing.</Notice><div className="dialog-actions"><button className="button" onClick={()=>setConfirm(null)}>Keep my workspace</button><button className="button danger" onClick={()=>safely(()=>{store.reset(confirm);setConfirm(null);route.go('overview',{platform:'',currency:'USD',from:'',to:''});},'Workspace replaced.')}>Replace workspace</button></div></div></Dialog>}{toast&&<div className={`toast ${toast.error?'error':''}`} role={toast.error?'alert':'status'}><CheckCircle2 size={18}/><span>{toast.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={()=>setToast(null)}><X size={15}/></button></div>}</>;
}
function WorkspaceName({workspace,onSave}){const [name,setName]=useState(workspace.name||(workspace.mode==='demo'?'Oak & Ember':'My business'));return <section className="panel workspace-preferences"><div><h2>Business name</h2><p>Displayed in your workspace navigation.</p></div><form onSubmit={e=>{e.preventDefault();if(name.trim())onSave(name.trim());}}><input aria-label="Business name" required maxLength={60} value={name} onChange={e=>setName(e.target.value)}/><button type="submit" className="button">Save name</button></form></section>;}
