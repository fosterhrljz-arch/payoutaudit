import Papa from 'papaparse';
import {cents,CURRENCIES} from './engine.js';
const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
export const FIELDS={id:['id','transaction id','balance_transaction_id','refund id','payout id','order id','name'],type:['type','transaction type','reporting_category'],date:['date','created','created at','transaction date','created_utc','paid at','payout date'],amount:['amount','gross','total','gross amount','amount usd'],fee:['fee','fees','processing fee'],net:['net','net amount'],orderId:['order id','order','order number','name','metadata order id'],payoutId:['payout id','payout','automatic_payout_id'],currency:['currency','currency code'],platform:['platform','channel','gateway']};
export function detect(headers){return Object.fromEntries(Object.entries(FIELDS).map(([field,aliases])=>[field,aliases.map(alias=>headers.find(h=>normalize(h)===normalize(alias))).find(Boolean)||'']));}
export function parseDate(v){
 if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
 const s=String(v||'').trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
 if(!m)throw new Error('Date must use YYYY-MM-DD (ISO) format');
 const day=`${m[1]}-${m[2]}-${m[3]}`,d=new Date(`${day}T00:00:00Z`);if(isNaN(d)||d.toISOString().slice(0,10)!==day)throw new Error('Invalid calendar date');return day;
}
export function normalizeRows(rows,mapping,defaults,source){
 const records=[],errors=[];
 rows.forEach((raw,index)=>{try{
 const get=f=>mapping[f]?raw[mapping[f]]:'';
 let type=String(get('type')||defaults.type).trim().toLowerCase();
 type=({charge:'payment',sale:'payment',payment:'payment',refund:'refund',refunded:'refund',payout:'payout',order:'order',adjustment:'adjustment'})[type];
 if(!type)throw new Error('Unknown record type; choose a type or map payment/refund/payout/order/adjustment');
 const id=String(get('id')??'').trim();if(!id)throw new Error('Record ID is required');
 const currency=String(get('currency')||defaults.currency).trim().toUpperCase();if(!CURRENCIES.includes(currency))throw new Error(`Unsupported currency ${currency}; use USD, EUR, GBP, CAD or AUD`);
 let amount=cents(get('amount'));if(type==='refund')amount=-Math.abs(amount);if(['order','payment'].includes(type)&&amount<0)throw new Error('Orders and payments must be positive; use refund for returned funds');
 const fee=get('fee')===''||get('fee')==null?0:cents(get('fee'));
 let net=get('net')===''||get('net')==null?null:cents(get('net'));if(type==='refund'&&net!==null&&net>0)net=-net;
 let platform=String(get('platform')||defaults.platform).trim();const lower=platform.toLowerCase();if(lower.includes('shopify'))platform='Shopify';if(lower.includes('stripe'))platform='Stripe';if(!platform)throw new Error('Platform is required');
 records.push({id,type,date:parseDate(get('date')),currency,amount,fee,net,platform,orderId:String(get('orderId')|| (type==='order'?id:'')).trim(),payoutId:String(get('payoutId')||(type==='payout'?id:'')).trim(),uid:crypto.randomUUID(),source:{...source,row:raw.__sourceRow||index+2,raw}});
 }catch(e){errors.push({row:raw.__sourceRow||index+2,message:e.message});}});
 return {records,errors};
}
export async function readFile(file){
 if(file.size>8*1024*1024)throw new Error('This version supports files up to 8 MB. Split larger exports.');
 if(/\.csv$/i.test(file.name)){
  const text=(await file.text()).replace(/^\uFEFF/,''), rows=[],errors=[];let headers=null,cursor=0,line=1;
  Papa.parse(text,{skipEmptyLines:false,step(result){
   const rowLine=line,segment=text.slice(cursor,result.meta.cursor);line+=(segment.match(/\r\n|\r|\n/g)||[]).length;cursor=result.meta.cursor;
   if(result.errors.length){errors.push(`CSV row ${rowLine}: ${result.errors[0].message}`);return;}
   const values=result.data;if(values.every(v=>!String(v).trim()))return;
   if(!headers){headers=values.map(v=>v.trim());if(headers.some(h=>!h)||new Set(headers).size!==headers.length)errors.push('Column names must be nonempty and unique. Rename them before importing.');return;}
   if(values.length!==headers.length){errors.push(`CSV row ${rowLine}: expected ${headers.length} fields, found ${values.length}.`);return;}
   const raw=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));Object.defineProperty(raw,'__sourceRow',{value:rowLine,enumerable:false});rows.push(raw);
  }});
  if(errors.length)throw new Error(errors[0]);return [{name:'CSV',rows,headers:headers||[]}];
 }
 if(!/\.xlsx$/i.test(file.name))throw new Error('Choose a .csv or .xlsx file. Save legacy .xls files as .xlsx first.');
 const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
 return workbook.worksheets.map(sheet=>{const headers=sheet.getRow(1).values.slice(1).map(v=>String(v||'').trim());if(new Set(headers).size!==headers.length)throw new Error('Duplicate Excel column names');const rows=[];sheet.eachRow((row,n)=>{if(n===1)return;const raw={};headers.forEach((h,i)=>{const value=row.getCell(i+1).value;if(value&&typeof value==='object'&&!(value instanceof Date)){if('formula'in value)throw new Error('Formula cells are not accepted. Paste as values before importing.');raw[h]=value.text||value.richText?.map(t=>t.text).join('')||'';}else raw[h]=value instanceof Date?value.toISOString().slice(0,10):value??'';});Object.defineProperty(raw,'__sourceRow',{value:n,enumerable:false});rows.push(raw);});return {name:sheet.name,headers,rows};}).filter(s=>s.rows.length);
}
export function safeCsvValue(v){return typeof v==='string'&&/^(?:\s*[=+\-@]|[\t\r\n])/.test(v)&&! /^-?\d+(?:\.\d+)?$/.test(v)?`'${v}`:v;}
export function csvDownload(name,rows){const text=Papa.unparse(rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,safeCsvValue(v)]))));const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function fingerprint(file){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');}
