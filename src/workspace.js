import {useEffect, useMemo, useState} from 'react';
import {makeDemo} from './demo.js';
import {DEFAULT_RULES, reconcile, summarize, recordKey} from './engine.js';
export const STORAGE_KEY='payoutaudit.workspace.v1';
export const EVIDENCE_GAPS=new Set(['missing-payment','missing-order','refund','unassigned','missing-payout','no-transactions']);
export const shortDate=value=>new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
export const signedMoney=(amount,currency)=>new Intl.NumberFormat('en-US',{style:'currency',currency,signDisplay:'exceptZero'}).format(amount/100);
export function evidenceSignature(issue){return JSON.stringify([issue.amount,issue.expected,issue.actual,issue.evidence.map(r=>[recordKey(r),r.amount,r.fee,r.net,r.orderId,r.payoutId]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);}
export function caseStatus(issue,cases){const c=cases[issue.id];if(c?.status==='Resolved'&&c.signature&&c.signature!==evidenceSignature(issue))return 'Needs review';return c?.status||'Needs review';}
export function issuePriority(issue){return issue.amount>=20000?'High':issue.amount>=5000?'Medium':'Low';}
export function issueRows(issues,cases){return issues.map(i=>({issue:i.title,reference:i.reference,platform:i.platform,currency:i.currency,date:i.date,flagged_amount:(i.amount/100).toFixed(2),status:caseStatus(i,cases),explanation:i.why,next_step:i.next,notes:(cases[i.id]?.events||[]).map(e=>`${e.at} | ${e.status} | ${e.resolution?e.resolution+" | ":""}${e.note}`).join('\n')}));}
export function transactionRows(records){return records.map(r=>({id:r.id,type:r.type,date:r.date,platform:r.platform,currency:r.currency,amount:(r.amount/100).toFixed(2),fee:(r.fee/100).toFixed(2),net:r.net==null?'':(r.net/100).toFixed(2),order_id:r.orderId,payout_id:r.payoutId,source_file:r.source.file,source_row:r.source.row}));}
export function settlementRows(rows){return rows.map(r=>({payout:r.id,date:r.date,platform:r.platform,currency:r.currency,expected:r.expected==null?'':(r.expected/100).toFixed(2),recorded:(r.amount/100).toFixed(2),difference:r.difference==null?'':(r.difference/100).toFixed(2),status:r.status,linked_records:r.batch.length}));}
function initial(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.version===1&&Array.isArray(saved.records)&&saved.cases&&Array.isArray(saved.imports)&&saved.rules)return saved;}catch{}return makeDemo();}
export function useWorkspace(filters){
 const [workspace,setWorkspace]=useState(initial);
 const engine=useMemo(()=>reconcile(workspace.records,workspace.rules),[workspace.records,workspace.rules]);
 const data=useMemo(()=>summarize(engine,filters.platform,filters.currency,filters.from,filters.to),[engine,filters.platform,filters.currency,filters.from,filters.to]);
 function save(next){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw new Error('This browser could not save the change. Storage may be full or disabled. Your previous workspace is unchanged.');}setWorkspace(next);}
 function importRecords(records,batch){const base=workspace.mode==='demo'?{...workspace,records:[],cases:{},imports:[]}:workspace;if(base.records.length+records.length>30000)throw new Error('Workspace limit: 30,000 rows. Export reports and start a clean workspace to continue.');save({...base,mode:'local',records:[...base.records,...records],imports:[batch,...base.imports]});}
 function updateCase(issue,status,note,resolution=''){if(!note.trim())throw new Error('Add a note so others can understand your decision.');if(status==='Resolved'&&!resolution)throw new Error('Choose a resolution reason.');const previous=workspace.cases[issue.id]||{events:[]};save({...workspace,cases:{...workspace.cases,[issue.id]:{...previous,status,signature:evidenceSignature(issue),title:issue.title,reference:issue.reference,currency:issue.currency,platform:issue.platform,amount:issue.amount,events:[...previous.events,{status,note:note.trim(),resolution,at:new Date().toISOString()}]}}});}
 function reset(mode){save(mode==='demo'?makeDemo():{version:1,mode:'local',records:[],cases:{},imports:[],rules:DEFAULT_RULES});}
 return {workspace,engine,data,save,importRecords,updateCase,reset};
}
export function useRoute(){
 const read=()=>{const [path,search='']=location.hash.replace(/^#\/?/,'').split('?');return {page:path||'overview',params:new URLSearchParams(search)};};
 const [route,setRoute]=useState(read);
 useEffect(()=>{const onHash=()=>setRoute(read());window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
 function go(page,params={}){const next=new URLSearchParams();if(page.endsWith('/detail')&&page.split('/')[0]===route.page)next.set('returnTo',location.hash);else if(page.endsWith('/detail')&&route.params.has('returnTo'))next.set('returnTo',route.params.get('returnTo'));for(const key of ['platform','currency','from','to'])if(route.params.has(key))next.set(key,route.params.get(key));for(const [key,value] of Object.entries(params)){if(value!==''&&value!=null)next.set(key,String(value));else next.delete(key);}const hash=`#/${page}${next.size?'?'+next:''}`;if(location.hash===hash)setRoute(read());else location.hash=hash;}
 function patch(params){const next=new URLSearchParams(route.params);for(const [key,value] of Object.entries(params)){if(value!==''&&value!=null)next.set(key,String(value));else next.delete(key);}history.replaceState(null,'',`#/${route.page}${next.size?'?'+next:''}`);setRoute(read());}
 function back(fallback){const target=route.params.get('returnTo');if(target&&(target===`#/${fallback}`||target.startsWith(`#/${fallback}?`))){location.hash=target;}else go(fallback);}
 return {...route,go,patch,back};
}
