export function makeDemo(){
  const records=[], fileRows={};let row=2;
  const push=(r,file)=>{const full={fee:0,net:null,currency:'USD',...r};fileRows[file]=(fileRows[file]||1)+1;records.push({...full,uid:`demo-${row++}`,source:{file,sheet:'Sheet1',row:fileRows[file],raw:{...full,amount:(full.amount/100).toFixed(2),fee:(full.fee/100).toFixed(2),net:full.net==null?'':(full.net/100).toFixed(2)}}});};
  for(let day=1;day<=14;day++)for(const platform of ['Shopify','Stripe']){
    const date=`2026-11-${String(day).padStart(2,'0')}`,payoutId=`${platform==='Shopify'?'SP':'ST'}-110${day}`;let net=0;
    for(let j=0;j<6;j++){
      const index=(day-1)*12+j+(platform==='Stripe'?6:0),orderId=`#${1041+index}`,amount=15900+((index*1379)%26000),fee=Math.round(amount*.029)+30+(index===24?5890:0);
      push({id:orderId,orderId,type:'order',platform,date,amount:amount+(index===51?2500:0)},'november-orders.csv');
      push({id:`txn_${10000+index}`,type:'payment',orderId,payoutId,platform,date,amount,fee,net:amount-fee},'november-transactions.csv');net+=amount-fee;
      if(index===42){push({id:`rf_${index}`,type:'refund',orderId,payoutId,platform,date,amount:-8495,net:-8495},'november-refunds.csv');net-=8495;}
      if(index===90){push({id:`txn_${10000+index}`,type:'payment',orderId,payoutId,platform,date,amount,fee,net:amount-fee},'duplicate-export.csv');}
    }
    if(day===9&&platform==='Shopify'){push({id:'rf_orphan',type:'refund',orderId:'#0997',payoutId,platform,date,amount:-4900,net:-4900},'november-refunds.csv');net-=4900;}
    push({id:payoutId,payoutId,type:'payout',platform,date,amount:net-(day===13&&platform==='Shopify'?43210:0)},'november-payouts.csv');
  }
  push({id:'#1210',orderId:'#1210',type:'order',platform:'Shopify',date:'2026-11-12',amount:12600},'november-orders.csv');
  return {version:1,mode:'demo',records,cases:{},imports:[{id:'demo',name:'Oak & Ember · November sample',count:records.length,date:'2026-11-14T09:42:00',kind:'Demo dataset'}],rules:{rate:2.9,fixed:30,tolerance:50}};
}
