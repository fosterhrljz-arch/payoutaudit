import test from 'node:test';
import assert from 'node:assert/strict';
import {detect,readFile,normalizeRows,safeCsvValue} from '../src/importer.js';
import {caseStatus,evidenceSignature,issueRows,settlementRows} from '../src/workspace.js';
import {reconcile} from '../src/engine.js';
import {makeDemo} from '../src/demo.js';

test('transaction IDs win over order and payout references regardless of column order',()=>{
 const mapping=detect(['order_id','payout_id','transaction_id','date','amount']);
 assert.equal(mapping.id,'transaction_id');assert.equal(mapping.orderId,'order_id');assert.equal(mapping.payoutId,'payout_id');
});
test('CSV source locations preserve blank and multiline rows',async()=>{
 const text='id,date,amount,note\r\na,2026-11-01,10.00,"first\r\nsecond"\r\n\r\nb,2026-11-01,20.00,valid\r\n';
 const [sheet]=await readFile({name:'test.csv',size:text.length,text:async()=>text});
 assert.equal(sheet.rows.length,2);assert.equal(sheet.rows[0].__sourceRow,2);assert.equal(sheet.rows[1].__sourceRow,5);
 const result=normalizeRows(sheet.rows,detect(sheet.headers),{type:'payment',currency:'USD',platform:'Stripe'},{file:'test.csv'});
 assert.equal(result.errors.length,0);assert.equal(result.records[1].source.row,5);assert.equal(result.records[0].source.raw.note,'first\r\nsecond');
});
test('malformed CSV and duplicate headers are rejected atomically',async()=>{
 for(const text of ['id,id,amount\na,b,1','id,date,amount\na,2026-11-01,1\nb,2026-11-01,1,extra'])await assert.rejects(()=>readFile({name:'bad.csv',size:text.length,text:async()=>text}));
});
test('resolved financial evidence reopens on change while stable reimports remain resolved',()=>{
 const issue=reconcile(makeDemo().records).issues.find(i=>i.kind==='payout');
 const cases={[issue.id]:{status:'Resolved',signature:evidenceSignature(issue)}};
 assert.equal(caseStatus(issue,cases),'Resolved');
 const copied={...issue,evidence:issue.evidence.map(r=>({...r,uid:crypto.randomUUID()})).reverse()};
 assert.equal(caseStatus(copied,cases),'Resolved');
 copied.evidence[0]={...copied.evidence[0],fee:copied.evidence[0].fee+1};
 assert.equal(caseStatus(copied,cases),'Needs review');
 assert.equal(caseStatus({...issue,amount:issue.amount+1},cases),'Needs review');
 assert.equal(caseStatus(issue,{[issue.id]:{status:'Resolved',events:[]}}),'Resolved');
});
test('exports retain signed differences, unknown expectations, and resolution reasons',()=>{
 const engine=reconcile(makeDemo().records),issue=engine.issues[0];
 const row=settlementRows(engine.settlements.filter(s=>s.difference))[0];assert.equal(row.difference,'-432.10');
 assert.equal(settlementRows([{id:'unknown',expected:null,difference:null,amount:100,batch:[]}])[0].expected,'');
 const cases={[issue.id]:{status:'Resolved',events:[{at:'2026-11-15',status:'Resolved',resolution:'Timing difference confirmed',note:'Checked provider statement.'}]}};
 assert.match(issueRows([issue],cases)[0].notes,/Timing difference confirmed/);
});
test('negative financial exports stay numeric while formulas are neutralized',()=>{
 for(const value of ['-432.10','0.00','1502.49'])assert.equal(safeCsvValue(value),value);
 for(const value of ['=1+1','-1+2','+SUM(A1:A2)','@SUM(A1:A2)','  =1+1','\t=1+1'])assert.equal(safeCsvValue(value),"'"+value);
});
