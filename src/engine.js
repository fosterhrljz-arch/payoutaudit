export const CURRENCIES = ['USD','EUR','GBP','CAD','AUD'];
export const DEFAULT_RULES = {rate:2.9,fixed:30,tolerance:50};
export function cents(value) {
  if(value === '' || value === null || value === undefined) throw new Error('Amount is required');
  let s=String(value).trim().replace(/[$£€\s]/g,'');
  if(/^\(.*\)$/.test(s)) s='-'+s.slice(1,-1);
  if(s.includes(',')) {if(!/^-?\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(s)) throw new Error('Use 1,234.56 number format'); s=s.replaceAll(',','');}
  if(!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error('Use a number with at most two decimal places');
  const negative=s.startsWith('-'); s=s.replace('-',''); const [a,b='']=s.split('.');
  const n=Number(a)*100+Number(b.padEnd(2,'0'));
  if(!Number.isSafeInteger(n)||n>1e10) throw new Error('Amount exceeds the supported limit (100 million major units)');
  return negative?-n:n;
}
export const money=(n,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format((n||0)/100);
export const total=(rows,field='amount')=>rows.reduce((a,r)=>a+(r[field]||0),0);
const scope=r=>`${r.platform}|${r.currency}`;
export const recordKey=r=>`${scope(r)}|${r.type}|${r.id}`;
export function reconcile(records,rules=DEFAULT_RULES){
  const unique=[],seen=new Map(),issues=[],duplicateIssues=new Map();
  function add(kind,r,amount,title,why,next,evidence=[r],extra={}) {
    issues.push({id:`${kind}|${recordKey(r)}`,kind,title,amount:Math.abs(amount),platform:r.platform,currency:r.currency,date:r.date,reference:r.payoutId||r.orderId||r.id,why,next,evidence,...extra});
  }
  for(const r of records){const key=recordKey(r); if(seen.has(key)){const first=seen.get(key); const existing=duplicateIssues.get(key);if(existing) existing.evidence.push(r);else {add('duplicate',r,r.amount,'Duplicate record','This identifier appears more than once in the same platform and currency. Only the first record is included in totals. Conflicting copies need manual verification.','Compare both source rows. Confirm which is authoritative before replacing an incorrect import.',[first,r]);duplicateIssues.set(key,issues.at(-1));}}else{seen.set(key,r);unique.push(r);}}
  const orders=unique.filter(r=>r.type==='order'), payments=unique.filter(r=>r.type==='payment'), payouts=unique.filter(r=>r.type==='payout'), ledger=unique.filter(r=>['payment','refund','adjustment'].includes(r.type));
  const orderMap=new Map(orders.map(r=>[`${scope(r)}|${r.orderId||r.id}`,r])),orderScopes=new Set(orders.map(scope));
  const paymentMap=new Map(), payoutMap=new Map(payouts.map(r=>[`${scope(r)}|${r.payoutId||r.id}`,r])),batchMap=new Map();
  for(const r of payments){const key=`${scope(r)}|${r.orderId}`;paymentMap.set(key,[...(paymentMap.get(key)||[]),r]);}
  for(const r of ledger){if(r.payoutId){const key=`${scope(r)}|${r.payoutId}`;batchMap.set(key,[...(batchMap.get(key)||[]),r]);}}
  for(const r of orders){const matches=paymentMap.get(`${scope(r)}|${r.orderId||r.id}`)||[];if(!matches.length) add('missing-payment',r,r.amount,'Missing payment record','An order is present, but no payment carries its order reference in this platform and currency. A partial export or uncaptured payment could explain the gap.','Check capture status and export a wider transaction date range. Import the missing payment record.');else if(total(matches)!==r.amount) add('order-amount',r,r.amount-total(matches),'Order and payment differ',`The order total is ${money(r.amount,r.currency)}, but linked captures total ${money(total(matches),r.currency)}. Partial capture or an edited order may explain this.`,`Review all ${matches.length} linked payment(s) and the original order total.`,[r,...matches]);}
  for(const r of payments){
    if(orderScopes.has(scope(r))&&!orderMap.has(`${scope(r)}|${r.orderId}`)) add('missing-order',r,r.amount,'Missing order record','A payment has no matching order in the imported order data. The export may be incomplete.','Import the relevant orders and check the payment’s order reference.');
    const baseline=Math.round(r.amount*rules.rate/100)+rules.fixed;
    if(r.fee>baseline+rules.tolerance) add('fee',r,r.fee-baseline,'Unusually high processing fee',`The recorded fee is ${money(r.fee,r.currency)}. Your review baseline (${rules.rate}% + ${money(rules.fixed,r.currency)}) is ${money(baseline,r.currency)}. International cards or currency conversion may cost more. This is a review signal, not a confirmed overcharge.`,`Check the provider’s fee breakdown and your contracted rate. Adjust the baseline in Settings if this fee is expected.`,[r],{expected:baseline,actual:r.fee});
  }
  for(const r of ledger){
    if(r.net!==null&&r.net!==undefined&&r.net!==r.amount-r.fee) add('net',r,r.net-(r.amount-r.fee),'Transaction net does not balance',`Gross minus fees gives ${money(r.amount-r.fee,r.currency)}; the imported net is ${money(r.net,r.currency)}. A separate adjustment or mapping error may explain it.`,`Review the gross, fee and net fields. Expected payout calculations use gross minus fees.`,[r],{expected:r.amount-r.fee,actual:r.net});
    if(r.type==='refund'&&!paymentMap.has(`${scope(r)}|${r.orderId}`)) add('refund',r,r.amount,'Refund without a payment','The refund cannot be traced to a payment with the same order reference. The original payment may fall outside your imported period.','Import earlier payments and verify the refund’s order reference before treating this as an error.');
    if(!r.payoutId) add('unassigned',r,r.amount-r.fee,'Settlement reference missing','This balance transaction has no payout reference, so it cannot be assigned safely to a settlement.','Import an itemized settlement export with payout IDs. Manual and instant payouts may require an external allocation.');
  }
  for(const [key,batch] of batchMap){if(!payoutMap.has(key)){const r=batch[0];add('missing-payout',r,total(batch)-total(batch,'fee'),'Payout record not imported','Transactions reference a payout that is missing from your payout file. This is missing evidence, not proof of missing money.','Import the payout summary, including this settlement reference.',batch);}}
  const settlements=payouts.map(p=>{const batch=batchMap.get(`${scope(p)}|${p.payoutId||p.id}`)||[],expected=total(batch)-total(batch,'fee'),difference=p.amount-expected;
    if(!batch.length)add('no-transactions',p,p.amount,'Payout has no supporting transactions','No balance transactions reference this payout. There is not enough evidence to calculate its expected amount.','Import the provider’s itemized transactions for this payout.');
    else if(difference!==0)add('payout',p,difference,'Payout amount mismatch',`Supporting transactions total ${money(expected,p.currency)} after fees, but the payout record shows ${money(p.amount,p.currency)}. Reserves, adjustments or an incomplete export could explain the ${money(Math.abs(difference),p.currency)} difference.`,`Check this payout’s adjustment and reserve lines. Compare the payout record with your bank statement.`,[p,...batch],{expected,actual:p.amount});
    return {...p,batch,expected:batch.length?expected:null,difference:batch.length?difference:null,status:!batch.length?'Missing evidence':difference?'Needs review':'Matched'};
  });
  issues.sort((a,b)=>b.amount-a.amount);
  return {unique,orders,payments,payouts,ledger,settlements,issues};
}
export function summarize(result,platform='All platforms',currency='USD',from='',to=''){
  const keep=r=>r.currency===currency&&(platform==='All platforms'||r.platform===platform)&&(!from||r.date>=from)&&(!to||r.date<=to);
  const ledger=result.ledger.filter(keep),settlements=result.settlements.filter(keep),payments=ledger.filter(r=>r.type==='payment');
  return {gross:total(payments),refunds:-total(ledger.filter(r=>r.type==='refund')),fees:total(ledger,'fee'),adjustments:total(ledger.filter(r=>r.type==='adjustment')),net:total(ledger)-total(ledger,'fee'),paid:total(result.payouts.filter(keep)),settlements,issues:result.issues.filter(keep),records:result.unique.filter(keep),payments,ledger};
}
