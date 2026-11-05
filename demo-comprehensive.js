/* Duit-Duit Paaxixi: comprehensive deterministic test fixture (fictional).
   No network, no real account numbers, and no future-dated transactions.
   Use only after an explicit, backed-up, offline confirmation. */
(function(){
'use strict';
const KEY='arus-prototype-v1',BACKUP='arus-cadangan-sebelum-demo';
const groups=[
 {id:'group-living-fix',name:'LIVING FIX',color:'#2563eb'},
 {id:'group-playing',name:'PLAYING',color:'#38a8ed'},
 {id:'group-living-lain',name:'LIVING LAIN',color:'#7c73df'},
 {id:'group-travel',name:'TRAVEL & LIBURAN',color:'#e5796d'},
 {id:'group-development',name:'PENGEMBANGAN',color:'#279f7b'}
];
const baseCategories=[
 ['Tempat Tinggal','LIVING FIX','expense'],['Makan-Minum','LIVING FIX','expense'],
 ['Transportasi','LIVING FIX','expense'],['Laundry','LIVING FIX','expense'],
 ['Keluarga','LIVING FIX','expense'],['Infaq','LIVING FIX','expense'],
 ['Jajan-Jajan','PLAYING','expense'],['Rawat Diri','PLAYING','expense'],
 ['Self Reward','PLAYING','expense'],['Kesehatan','LIVING LAIN','expense'],
 ['Internet','LIVING LAIN','expense'],['Lain-Lain','LIVING LAIN','expense'],
 ['Dividen Fastlink','Fastlink','income'],['Gaji Pokok BPS','BPS','income'],
 ['Tukin BPS','BPS','income'],['Uang Makan BPS','BPS','income'],
 ['Lembur BPS','BPS','income'],['Pemasukan Lainnya','Lainnya','income'],
 ['THR & Bonus','Lainnya','income'],['Honor Proyek','Lainnya','income'],
 ['Pendidikan & Kursus','PENGEMBANGAN','expense'],
 ['Liburan & Wisata','TRAVEL & LIBURAN','expense'],
 ['Elektronik','PLAYING','expense'],['Perbaikan Rumah','LIVING FIX','expense'],
 ['Asuransi & Premi','LIVING FIX','expense'],
 ['Peralatan Kerja','PENGEMBANGAN','expense'],
 ['Jasa Sampingan','Lainnya','income']
];
const accounts=[
 {id:'a-cash',name:'Dompet Tunai (SIMULASI)',type:'Tunai',opening:1800000},
 {id:'a-bank',name:'Bank Utama (SIMULASI)',type:'Bank',opening:43000000},
 {id:'a-savings',name:'Bank Tabungan (SIMULASI)',type:'Bank',opening:125000000},
 {id:'a-wallet',name:'Dompet Digital (SIMULASI)',type:'E-Wallet',opening:1500000},
 {id:'a-second',name:'Bank Cadangan (SIMULASI)',type:'Bank',opening:24000000}
];
const sec=(month,day)=>month+'-'+String(day).padStart(2,'0');
const monthShift=(reference,shift)=>{
 const [y,m]=reference.split('-').map(Number);
 return new Date(Date.UTC(y,m-1+shift,1)).toISOString().slice(0,7);
};
const dayLast=m=>new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)).getUTCDate();
const lastOf=m=>sec(m,dayLast(m));
const todayWib=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const stampDate=(date,clock='08:00:00')=>date+'T'+clock+'+07:00';
const stampIso=date=>new Date(stampDate(date)).toISOString();
const round=v=>Math.max(0,Math.round(v));
const mult=(i,n=1)=>Math.floor(100000*(1+(i%13)*n/100));
function build({asOf=todayWib(),months=96}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||months<24||months>120)throw Error('Periode simulasi tidak valid.');
 const latest=asOf.slice(0,7),first=monthShift(latest,-months+1);
 const data={version:2,accounts:accounts.map(x=>({...x})),categories:baseCategories.map((c,i)=>({id:'c'+(i+1),label:c[0],group:c[1],kind:c[2]})),
  expenseGroups:groups.map(g=>({...g})),
  incomeGroups:[{id:'sim-income-bps',name:'BPS',color:'#22956f'},
   {id:'sim-income-fastlink',name:'Fastlink',color:'#159d92'},
   {id:'sim-income-other',name:'Lainnya',color:'#7e9b55'}],
  incomeBudgets:{},incomeBudgetMoves:[],incomeBudgetAdjustments:[],
  incomeBudgetBaseHistory:[],incomeBudgetInitialStates:{},
  transactions:[],budgets:{},budgetMoves:[],budgetAdjustments:[],budgetBaseHistory:[],
  budgetInitialStates:{},debts:[],accountCorrections:[],investmentAssets:[],investmentTrades:[],
  investmentSnapshots:[],investmentPriceHistory:{},investmentGoals:[],investmentWatchlist:['BBCA','BBRI','TLKM','XKGS'],
  investmentResearch:[],reports:{},
  simulationMeta:{mode:'comprehensive',version:1,fictional:true,months,first,last:latest,
   generatedAt:new Date().toISOString(),asOf,
   disclaimer:'SEMUA ANGKA FIKTIF UNTUK UJI COBA. BUKAN CATATAN KEUANGAN NYATA.'}};
 let counter=0;
 const id=prefix=>'sim-'+prefix+'-'+String(++counter).padStart(6,'0');
 const tx=(m,day,type,amount,categoryId,title,accountId='a-bank',toAccountId)=>{
  const date=sec(m,day),cap=m===latest?Number(asOf.slice(8)):dayLast(m);
  if(day>cap||day<1||day>dayLast(m))return;
  data.transactions.push({id:id('tx'),type,date,amount:round(amount),categoryId,
   title:title+' (SIMULASI)',accountId,toAccountId,
   note:'ANGKA FIKTIF • UJI COBA',createdAt:stampIso(date)});
 };
 const at=(m,day,allowed=true)=>allowed&&day<=(m===latest?Number(asOf.slice(8)):dayLast(m))?sec(m,Math.min(day,dayLast(m))):null;
 const categ=id=>data.categories.find(c=>c.id===id);
 const monthToIndex=m=>(Number(m.slice(0,4))-Number(first.slice(0,4)))*12+
     Number(m.slice(5,7))-Number(first.slice(5,7));
 const fixedBudget={
  c1:1650000,c2:1850000,c3:630000,c4:180000,c5:450000,c6:170000,c7:560000,
  c8:245000,c9:340000,c10:270000,c11:220000,c12:200000,c21:260000,
  c22:480000,c23:220000,c24:300000,c25:330000,c26:160000
 };
 const expCats=data.categories.filter(c=>c.kind==='expense');
 const incCats=data.categories.filter(c=>c.kind==='income');
 const incomeTargets={
  c13:220000,c14:4000000,c15:2220000,c16:550000,c17:180000,c18:300000,
  c19:0,c20:360000,c27:225000
 };
 for(let i=0;i<months;i++){
  const m=monthShift(first,i),yr=Math.floor(i/12),monthNum=Number(m.slice(5,7));
  const active=m===latest?Number(asOf.slice(8)):dayLast(m);
  const budgetDraft=i===months-1||i===months-14;
  data.incomeBudgetInitialStates[m]={status:budgetDraft?'draft':'locked',
   lockedAt:budgetDraft?'':stampIso(sec(m,1))};
  for(const c of incCats){
   if(c.id==='c18'&&i%9===0)continue; // intentionally without an income target
   const base=round((incomeTargets[c.id]||0)*(1+yr*.045)+
    (c.id==='c19'&&(monthNum===4||monthNum===12)?2450000+yr*100000:0));
   data.incomeBudgets[m+'|'+c.id]=base;
   if(i%8===0&&['c14','c15'].includes(c.id)){
    data.incomeBudgetBaseHistory.push({id:id('income-history'),month:m,date:sec(m,1),
     createdAt:stampIso(sec(m,1)),categoryId:c.id,categoryLabel:c.label,
     previous:Math.max(0,base-100000),next:base,note:'Perbaikan proyeksi bulanan • simulasi',
     correction:!budgetDraft});
   }
  }
  if(!budgetDraft&&i%4===0){
   data.incomeBudgetMoves.push({id:id('income-move'),month:m,date:sec(m,6),
    createdAt:stampIso(sec(m,6)),from:'c15',to:'c17',amount:55000,
    note:'Alih target estimasi antara tunjangan dan lembur • simulasi'});
  }
  if(!budgetDraft&&i%6===2){
   data.incomeBudgetAdjustments.push({id:id('income-adjust'),month:m,date:sec(m,8),
    createdAt:stampIso(sec(m,8)),categoryId:'c20',type:'increase',amount:220000,
    note:'Perkiraan honor tambahan • simulasi'});
  }
  if(!budgetDraft&&i%7===4){
   data.incomeBudgetAdjustments.push({id:id('income-adjust'),month:m,date:sec(m,9),
    createdAt:stampIso(sec(m,9)),categoryId:'c27',type:'decrease',amount:80000,
    note:'Target jasa sampingan diturunkan • simulasi'});
  }
  data.budgetInitialStates[m]={status:budgetDraft?'draft':'locked',
   lockedAt:budgetDraft?'':stampIso(sec(m,1)),legacy:false};
  for(const c of expCats){
   if(c.id==='c23'&&i%8===0)continue; // intentional unallocated positions
   const base=round((fixedBudget[c.id]||150000)*(1+.038*yr)+((i%6===0&&c.id==='c2')?50000:0));
   data.budgets[m+'|'+c.id]=base;
   if(i%6===0&&['c2','c7'].includes(c.id)){
    data.budgetBaseHistory.push({id:id('budget-edit'),month:m,date:sec(m,1),createdAt:stampIso(sec(m,1)),
     categoryId:c.id,categoryLabel:c.label,previous:Math.max(0,base-50000),next:base,
     note:'Koreksi tahunan data fiktif',correction:!budgetDraft});
   }
  }
  if(!budgetDraft&&i%3===0){
   data.budgetMoves.push({id:id('move'),month:m,date:sec(m,6),from:'c3',to:'c7',amount:90000});
  }
  if(!budgetDraft&&i%4===1){
   data.budgetMoves.push({id:id('move'),month:m,date:sec(m,8),from:'c12',to:'c10',amount:50000});
  }
  if(!budgetDraft&&i%5===0){
   data.budgetAdjustments.push({id:id('adjust'),month:m,date:sec(m,10),createdAt:stampIso(sec(m,10)),
    categoryId:'c10',type:'increase',amount:180000,note:'Biaya kesehatan tambahan • simulasi'});
  }
  if(!budgetDraft&&i%7===2){
   data.budgetAdjustments.push({id:id('adjust'),month:m,date:sec(m,11),createdAt:stampIso(sec(m,11)),
    categoryId:'c9',type:'decrease',amount:70000,note:'Penghematan hiburan • simulasi'});
  }
  if(!budgetDraft&&i%17===9){
   data.budgetBaseHistory.push({id:id('budget-edit'),month:m,date:sec(m,16),createdAt:stampIso(sec(m,16)),
    categoryId:'c5',categoryLabel:'Keluarga',previous:data.budgets[m+'|c5']-30000,
    next:data.budgets[m+'|c5'],note:'Perubahan anggaran awal setelah ditetapkan (simulasi)',correction:true});
  }
  const isLowIncome=i%14===4,largeIncome=i%12===11;
  tx(m,1,'income',isLowIncome?2100000:4100000+yr*350000,'c14','Gaji pokok bulanan');
  tx(m,3,'income',isLowIncome?650000:2200000+yr*250000,'c15','Tunjangan kinerja');
  tx(m,4,'income',580000+yr*35000,'c16','Uang makan');
  if(i%3===0)tx(m,7,'income',350000+yr*100000,'c13','Dividen investasi');
  if(i%4===0)tx(m,18,'income',120000+yr*30000,'c17','Lembur');
  if(i%5===2)tx(m,20,'income',740000+yr*25000,'c20','Honor proyek','a-second');
  if(i%8===3)tx(m,16,'income',300000+yr*15000,'c27','Penghasilan jasa lepas','a-wallet');
  if(monthNum===4||monthNum===12)tx(m,8,'income',largeIncome?4200000:2400000,'c19','Bonus atau THR');
  tx(m,4,'transfer',320000,null,'Tarik uang tunai','a-bank','a-cash');
  tx(m,5,'transfer',380000,null,'Isi saldo dompet digital','a-bank','a-wallet');
  if(i%2===0)tx(m,10,'transfer',620000+yr*75000,null,'Sisihkan tabungan','a-bank','a-savings');
  if(i%3===2)tx(m,11,'transfer',250000,null,'Antar rekening','a-savings','a-second');
  tx(m,2,'expense',1580000+yr*65000,'c1','Sewa tempat tinggal');
  for(const [j,d] of [3,6,9,12,15,18,21,24,27].entries()){
   const amount=125000+((i*11+j*7)%8)*14000;
   tx(m,d,'expense',amount,'c2',['Bahan masak','Belanja pasar','Makan siang',
    'Beras dan lauk','Makan keluarga','Makan kantor','Belanja sayur','Bahan dapur','Belanja mingguan'][j]);
  }
  for(const [j,d] of [5,11,19,26].entries())
   tx(m,d,'expense',70000+((i+j)%5)*16000,'c3','Transportasi & bahan bakar');
  for(const [j,d] of [4,8,14,22].entries())
   tx(m,d,'expense',28000+((i*5+j)%9)*14000,'c7','Ngopi / camilan','a-wallet');
  for(const d of [7,20])tx(m,d,'expense',66000+(i%6)*5500,'c4','Laundry','a-cash');
  tx(m,7,'expense',165000,'c11','Internet bulanan');
  tx(m,9,'expense',115000,'c6','Infaq bulanan');
  tx(m,10,'expense',230000+((i%6)===3?220000:0),'c5','Dukungan keluarga');
  tx(m,14,'expense',120000+(i%4)*25000,'c8','Perawatan pribadi');
  tx(m,17,'expense',i%6===2?1200000:195000,'c9','Hiburan / self reward');
  tx(m,19,'expense',i%9===4?1900000:93000,'c10','Kesehatan / pemeriksaan');
  tx(m,23,'expense',i%5===0?450000:75000,'c12','Pengeluaran tidak terduga');
  tx(m,25,'expense',160000,'c25','Asuransi dan premi');
  if(i%2===1)tx(m,13,'expense',225000,'c21','Kursus & buku');
  if(i%4===2)tx(m,26,'expense',i%20===2?4200000:690000,'c22','Perjalanan wisata');
  if(i%9===0)tx(m,12,'expense',1500000+yr*125000,'c23','Peralatan elektronik');
  if(i%18===3)tx(m,16,'expense',3600000+yr*90000,'c24','Perbaikan mendadak rumah');
  if(i%4===0)tx(m,15,'expense',220000+yr*22000,'c26','Peralatan kerja');
  // Edge case: alternate months with unusually high spending and limited income.
  if(i%21===9)tx(m,22,'expense',3100000,'c10','Biaya darurat rumah sakit','a-second');
  if(i%16===5)tx(m,20,'expense',1780000,'c2','Konsumsi acara besar');
 }
 const debt=(type,person,amount,monthIdx,day,accountId,dueOffset,settles=[])=>{
  const m=monthShift(first,monthIdx),opened=at(m,day);
  if(!opened)return;
  let dueDate='';
  if(typeof dueOffset==='number'){
   const offset=monthShift(m,dueOffset);
   dueDate=sec(offset,Math.min(day,dayLast(offset)));
  }else if(typeof dueOffset==='string')dueDate=dueOffset;
  data.debts.push({id:id('debt'),type,person:person+' (SIMULASI)',amount,date:opened,
   dueDate,accountId,note:'FIKTIF • Uji cicilan, jatuh tempo, dan status lunas',
   settlements:settles.map(([shift,amountPay])=>{
    const dueM=monthShift(m,shift),payDate=at(dueM,Math.min(day+3,dayLast(dueM)));
    return payDate&&payDate<=asOf?{id:id('installment'),date:payDate,amount:amountPay,accountId}:null;
   }).filter(Boolean)});
 };
 debt('receivable','Teman A',600000,19,8,'a-cash',1,[[1,600000]]);
 debt('payable','Kerabat B',1500000,42,12,'a-bank',3,[[1,500000],[2,500000],[3,500000]]);
 debt('receivable','Teman C',2600000,69,10,'a-bank',5,[[1,600000],[4,500000]]);
 debt('payable','Kerabat D',3200000,75,9,'a-second',2,[[1,750000]]);
 debt('payable','Cicilan Perangkat',4800000,85,10,'a-bank',8,[[1,550000],[2,550000],[3,550000]]);
 debt('receivable','Teman E',1200000,90,7,'a-cash',null,[]);
 const lastMonth=latest;
 const currentDay=Number(asOf.slice(8));
 const openDebt=(type,name,amount,daysDiff,paid=0)=>{
  const starting=monthShift(lastMonth,-1);
  const date=sec(starting,Math.min(8,dayLast(starting)));
  const dueDate=new Date(Date.parse(asOf+'T00:00:00Z')+daysDiff*86400000).toISOString().slice(0,10);
  data.debts.push({id:id('debt'),type,person:name+' (SIMULASI)',amount,date,dueDate,
   accountId:type==='payable'?'a-bank':'a-cash',
   note:'FIKTIF • Tenggat '+(daysDiff<0?'terlewat':daysDiff+' hari lagi'),
   settlements:paid?[{id:id('installment'),date:sec(lastMonth,Math.min(currentDay,2)),
    amount:paid,accountId:type==='payable'?'a-bank':'a-cash'}]:[]});
 };
 openDebt('payable','Utang Jatuh Tempo Terlewat',1750000,-12,400000);
 openDebt('receivable','Piutang Jatuh Tempo H-3',2100000,3,0);
 openDebt('payable','Utang Jatuh Tempo Hari Ini',800000,0,0);
 openDebt('receivable','Piutang Jatuh Tempo H-7',1450000,7,250000);
 openDebt('payable','Utang Jatuh Tempo 2 Bulan',2750000,62,0);
 data.accountCorrections=[
  {id:id('correction'),accountId:'a-bank',type:'increase',amount:290000,date:sec(monthShift(first,35),16),note:'Rekonsiliasi saldo lebih (SIMULASI)'},
  {id:id('correction'),accountId:'a-wallet',type:'decrease',amount:90000,date:sec(monthShift(first,53),15),note:'Biaya aplikasi belum tercatat (SIMULASI)'},
  {id:id('correction'),accountId:'a-savings',type:'increase',amount:130000,date:sec(monthShift(first,76),8),note:'Koreksi mutasi bank (SIMULASI)'},
  {id:id('correction'),accountId:'a-cash',type:'decrease',amount:45000,date:sec(monthShift(first,92),6),note:'Selisih tunai (SIMULASI)'}
 ].filter(x=>x.date<=asOf);
 const definitions=[
  {id:'asset-bbca',name:'BBCA — Bank Central Asia (SIMULASI)',type:'stock',symbol:'BBCA',quantity:100,price:9050,unitPrice:7800,autoPrice:true,first:42},
  {id:'asset-bbri',name:'BBRI — Bank Rakyat Indonesia (SIMULASI)',type:'stock',symbol:'BBRI',quantity:300,price:4400,unitPrice:4600,autoPrice:true,first:45},
  {id:'asset-tlkm',name:'TLKM — Telkom Indonesia (SIMULASI)',type:'stock',symbol:'TLKM',quantity:200,price:3100,unitPrice:3300,autoPrice:false,first:47},
  {id:'asset-emas',name:'Emas Logam Mulia (SIMULASI)',type:'gold',symbol:'',quantity:5,price:1700000,unitPrice:1160000,autoPrice:false,first:39},
  {id:'asset-rdpu',name:'RDPU Likuid Contoh (SIMULASI)',type:'money_market_fund',symbol:'',quantity:2800,price:1200,unitPrice:1025,autoPrice:false,first:41},
  {id:'asset-rdpt',name:'RD Pendapatan Tetap Contoh (SIMULASI)',type:'fixed_income_fund',symbol:'',quantity:1500,price:1310,unitPrice:1100,autoPrice:false,first:48},
  {id:'asset-st',name:'Sukuk Negara Contoh (SIMULASI)',type:'state_sukuk',symbol:'',quantity:5,price:1000000,unitPrice:1000000,autoPrice:false,first:52},
  {id:'asset-ori',name:'ORI Ritel Contoh (SIMULASI)',type:'retail_sbn',symbol:'',quantity:4,price:1000000,unitPrice:1000000,autoPrice:false,first:55},
  {id:'asset-btc',name:'Bitcoin BTC (SIMULASI)',type:'crypto',symbol:'BTC',quantity:.0025,price:1100000000,unitPrice:720000000,autoPrice:true,first:58},
  {id:'asset-eth',name:'Ethereum ETH (SIMULASI)',type:'crypto',symbol:'ETH',quantity:.07,price:52000000,unitPrice:44000000,autoPrice:false,first:61},
  {id:'asset-etf',name:'ETF Saham XKGS (SIMULASI)',type:'etf',symbol:'XKGS',quantity:15,price:1100,unitPrice:1000,autoPrice:false,first:87},
  {id:'asset-depo',name:'Deposito Berjangka (SIMULASI)',type:'deposit',symbol:'',quantity:12,price:1000000,unitPrice:1000000,autoPrice:false,first:44}
 ];
 data.investmentAssets=definitions.map(x=>({id:x.id,name:x.name,type:x.type,symbol:x.symbol,note:'SIMULASI FIKTIF — harga dan posisi bukan data riil',
  autoPrice:x.autoPrice,price:x.price,priceSource:'manual',priceDate:asOf,
  priceTimestamp:stampIso(asOf),createdAt:stampIso(sec(monthShift(first,Math.min(x.first,months-1)),1))}));
 const positions=new Map(),priceHist={};let openedCost=0;
 const transaction=(asset,date,type,units,unitPrice,amount,accountId='a-savings',fee=0)=>{
  data.investmentTrades.push({id:id('trade'),assetId:asset.id,type,units:roundTo(units),unitPrice,
   fee,amount:round(amount),date,accountId,note:'SIMULASI FIKTIF',
   createdAt:stampIso(date)});
 };
 function roundTo(v){return Math.round(v*100000000)/100000000}
 for(const d of definitions){
  priceHist[d.id]={};
  const holding={units:0,cost:0};positions.set(d.id,holding);
  for(let i=d.first;i<months;i++){
   const m=monthShift(first,i);
   const variation=1+0.09*Math.sin(i*0.22+d.first)+0.035*Math.cos(i*0.17);
   const price=Math.max(1,Math.round(d.unitPrice*(1+(i-d.first)*0.006)*variation*100)/100);
   priceHist[d.id][m]={price,source:'manual',asOf:m,symbol:d.symbol};
   if(i===d.first||i>d.first&&(i-d.first)%Math.max(4,d.id.length%9+3)===0){
    const date=at(m,Math.min(10,dayLast(m)));
    if(date){
     const units=d.quantity*((i===d.first)?1:(d.type==='stock'?0.5:0.2));
     const gross=round(units*price),fee=d.type==='stock'?round(gross*.0015):0;
     transaction(d,date,'buy',units,price,gross+fee,'a-savings',fee);
     holding.units+=units;holding.cost+=gross+fee;
    }
   }
   if(i-d.first===22&&i<months-3&&holding.units>0&&d.type!=='deposit'&&d.type!=='state_sukuk'){
    const date=at(m,17);
    if(date){
     const units=roundTo(holding.units*.2),gross=round(units*price),fee=d.type==='stock'?round(gross*.002):0;
     transaction(d,date,'sell',units,price,gross-fee,'a-savings',fee);
     const old=holding.units;holding.units-=units;holding.cost-=holding.cost*(units/old);
    }
   }
   if(i>d.first&&((i-d.first)%12===0)&&['stock','state_sukuk','retail_sbn','deposit'].includes(d.type)){
    const date=at(m,22);
    if(date)transaction(d,date,'payout',0,0,Math.max(12000,round(holding.cost*.025)),'a-savings',0);
   }
  }
 }
 data.investmentPriceHistory=priceHist;
 data.investmentTrades.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 function historicInvestment(month){
  const end=lastOf(month),active=[],market={};
  for(const d of definitions){
   const trades=data.investmentTrades.filter(t=>t.assetId===d.id&&t.date<=end);
   let units=0,cost=0,realized=0,payout=0;
   for(const t of trades){
    if(t.type==='buy'){units+=t.units;cost+=t.amount}
    else if(t.type==='sell'){
     const fraction=Math.min(t.units,units);const avg=units?cost/units:0;
     cost-=avg*fraction;units-=fraction;realized+=t.amount-avg*fraction;
    }else payout+=t.amount;
   }
   units=Math.max(0,units);cost=Math.max(0,cost);
   const observed=priceHist[d.id][month]?.price||d.unitPrice;
   if(units>0)active.push({name:d.name,type:d.type,quantity:units,cost,market:round(units*observed),
    realized,payout});
   market[d.id]={value:round(units*observed),cost};
  }
  return {assets:active,market:round(active.reduce((sum,x)=>sum+x.market,0)),
   cost:round(active.reduce((sum,x)=>sum+x.cost,0)),priceBasis:'Harga BULANAN SIMULASI (BUKAN MARKET HISTORIS ASLI)',
   positions:market};
 }
 const snaps={};
 for(let i=0;i<months;i++){
  const m=monthShift(first,i),end=m===latest?asOf:lastOf(m),portfolio=historicInvestment(m);
  const snap={date:end,value:portfolio.market,cost:portfolio.cost,createdAt:stampIso(end)};
  data.investmentSnapshots.push(snap);snaps[m]=portfolio;
 }
 // Archives are real-looking immutable snapshots of the fictional dataset.
 // Retain 12 recent snapshots plus 8 year-end reference snapshots.
 const reportMonths=new Set();
 for(let i=Math.max(0,months-12);i<months;i++)reportMonths.add(monthShift(first,i));
 for(let i=0;i<months;i++)if(monthShift(first,i).endsWith('-12'))reportMonths.add(monthShift(first,i));
 const balanceAt=m=>{
  const end=lastOf(m),r=Object.fromEntries(accounts.map(a=>[a.id,a.opening]));
  for(const t of data.transactions)if(t.date<=end){
   if(t.type==='income')r[t.accountId]+=t.amount;
   if(t.type==='expense')r[t.accountId]-=t.amount;
   if(t.type==='transfer'){r[t.accountId]-=t.amount;r[t.toAccountId]+=t.amount}
  }
  for(const d of data.debts)if(d.date<=end){
   const sign=d.type==='payable'?1:-1;r[d.accountId]+=sign*d.amount;
   for(const p of d.settlements)if(p.date<=end)r[p.accountId]-=sign*p.amount;
  }
  for(const t of data.investmentTrades)if(t.date<=end)r[t.accountId]+=(t.type==='buy'?-1:1)*t.amount;
  for(const x of data.accountCorrections)if(x.date<=end)r[x.accountId]+=(x.type==='increase'?1:-1)*x.amount;
  return r;
 };
 const sum=(rows,type)=>rows.filter(t=>t.type===type).reduce((tot,t)=>tot+t.amount,0);
 const fullYearTx={};
 for(const month of reportMonths){
  const monthTx=data.transactions.filter(t=>t.date.slice(0,7)===month).sort((a,b)=>a.date.localeCompare(b.date));
  const rows=monthTx.map(t=>({...t,categoryLabel:categ(t.categoryId)?.label||'',group:categ(t.categoryId)?.group||'',
   accountLabel:accounts.find(a=>a.id===t.accountId)?.name||'',toAccountLabel:accounts.find(a=>a.id===t.toAccountId)?.name||''}));
  const current=month===latest,monthNow=monthShift(month,0);
  const budOf=id=>(data.budgets[month+'|'+id]||0)+data.budgetAdjustments.filter(x=>x.month===month&&x.categoryId===id)
   .reduce((n,x)=>n+(x.type==='increase'?1:-1)*x.amount,0)+data.budgetMoves.filter(x=>x.month===month)
   .reduce((n,x)=>n+(x.to===id?x.amount:0)-(x.from===id?x.amount:0),0);
  const expenseBreakdown=expCats.map(c=>({label:c.label,group:c.group,budget:budOf(c.id),
   spent:sum(monthTx.filter(t=>t.categoryId===c.id),'expense')}));
  const incomeBreakdown=data.categories.filter(c=>c.kind==='income').map(c=>({
    label:c.label,group:c.group,
    target:(data.incomeBudgets[month+'|'+c.id]||0)+
     data.incomeBudgetMoves.filter(x=>x.month===month).reduce((n,x)=>n+(x.to===c.id?x.amount:0)-(x.from===c.id?x.amount:0),0)+
     data.incomeBudgetAdjustments.filter(x=>x.month===month&&x.categoryId===c.id)
      .reduce((n,x)=>n+(x.type==='increase'?1:-1)*x.amount,0),
    received:sum(monthTx.filter(t=>t.categoryId===c.id),'income')
   }));
  const trends=Array.from({length:6},(_,idx)=>{
   const m=monthShift(month,-5+idx);const x=data.transactions.filter(t=>t.date.slice(0,7)===m);
   return {month:m,income:sum(x,'income'),expense:sum(x,'expense')};
  });
  const trendTransactions=trends.filter(t=>t.month!==month).map(t=>({
   month:t.month,transactions:data.transactions.filter(x=>x.date.slice(0,7)===t.month&&['income','expense'].includes(x.type))
    .map(x=>({date:x.date,type:x.type,title:x.title,group:categ(x.categoryId)?.group||'Lainnya',
     categoryLabel:categ(x.categoryId)?.label||'',amount:x.amount,note:x.note||''}))
  }));
  const debtAll=data.debts.filter(d=>d.date<=lastOf(month)).map(d=>{
   const payments=d.settlements.filter(p=>p.date<=lastOf(month));
   const paidToEnd=payments.reduce((t,p)=>t+p.amount,0),
    thisMonth=payments.filter(p=>p.date.startsWith(month));
   return {id:d.id,type:d.type,person:d.person,date:d.date,dueDate:d.dueDate||'',note:d.note,
    original:d.amount,paidToEnd,paidInMonth:thisMonth.reduce((t,p)=>t+p.amount,0),
    remaining:Math.max(0,d.amount-paidToEnd),
    payments:thisMonth.map(x=>({date:x.date,amount:x.amount}))};
  });
  const debtSummary=debtAll.reduce((o,d)=>{
   o[d.type]+=d.remaining;
   if(d.date.startsWith(month))o[d.type+'New']+=d.original;
   o[d.type+'Paid']+=d.paidInMonth;
   return o;
  },{payable:0,receivable:0,payableNew:0,receivableNew:0,payablePaid:0,receivablePaid:0});
  const r={
   month,createdAt:stampIso(current?asOf:lastOf(month)),income:sum(monthTx,'income'),
   expense:sum(monthTx,'expense'),net:sum(monthTx,'income')-sum(monthTx,'expense'),
   expenseBreakdown,incomeBreakdown,
   balances:Object.entries(balanceAt(month)).map(([id,balance])=>({
    name:accounts.find(a=>a.id===id)?.name||'',type:accounts.find(a=>a.id===id)?.type||'Bank',balance})),
   transactions:rows,debts:debtAll.map(d=>({person:d.person,type:d.type,remaining:d.remaining})),
   debtLedger:debtAll.filter(d=>d.remaining>0||d.date.startsWith(month)||d.paidInMonth>0),
   debtSummary,investment:snaps[month],trends,trendTransactions,
   groupColors:Object.fromEntries(groups.map(g=>[g.name,g.color]))
  };
  data.reports[month]=r;
 }
 const fmtMonthDate=monthShift(latest,26);
 data.investmentGoals=[
  {id:'goal-house',type:'house',name:'Rumah Pertama di Kabupaten Sragen (SIMULASI)',
   due:fmtMonthDate,target:450000000,initial:45000000,monthly:3500000,risk:'medium'},
  {id:'goal-wedding',type:'wedding',name:'Pernikahan & Resepsi (SIMULASI)',
   due:monthShift(latest,16),target:110000000,initial:12500000,monthly:2600000,risk:'low'},
  {id:'goal-vehicle',type:'vehicle',name:'Motor atau Mobil Pertama (SIMULASI)',
   due:monthShift(latest,10),target:39000000,initial:10000000,monthly:950000,risk:'low'},
  {id:'goal-education',type:'education',name:'Pendidikan Pascasarjana (SIMULASI)',
   due:monthShift(latest,46),target:165000000,initial:8000000,monthly:1150000,risk:'medium'},
  {id:'goal-business',type:'business',name:'Membuka Usaha Kecil (SIMULASI)',
   due:monthShift(latest,72),target:220000000,initial:15000000,monthly:1250000,risk:'high'},
  {id:'goal-retirement',type:'retirement',name:'Pensiun & Kebebasan Finansial (SIMULASI)',
   due:monthShift(latest,180),target:1750000000,initial:80000000,monthly:2500000,risk:'high'},
  {id:'goal-other',type:'other',name:'Dana Liburan Keluarga (SIMULASI)',
   due:monthShift(latest,7),target:14000000,initial:3000000,monthly:1200000,risk:'low'}
 ].map(g=>({...g,createdAt:stampIso(asOf),updatedAt:stampIso(asOf)}));
 return data;
}
function summarize(db){
 const income=db.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
 const expense=db.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
 const debtStatus={paid:0,open:0,overdue:0,soon:0};
 const date=todayWib();
 for(const d of db.debts){
  const remaining=d.amount-d.settlements.reduce((s,p)=>s+p.amount,0);
  if(remaining<=0)debtStatus.paid++;else{
   debtStatus.open++;
   if(d.dueDate&&d.dueDate<date)debtStatus.overdue++;
   else if(d.dueDate&&Date.parse(d.dueDate)-Date.parse(date)<=7*86400000)debtStatus.soon++;
  }
 }
 return {months:db.simulationMeta.months,from:db.simulationMeta.first,to:db.simulationMeta.last,
  transactions:db.transactions.length,incomeTransactions:db.transactions.filter(t=>t.type==='income').length,
  expenseTransactions:db.transactions.filter(t=>t.type==='expense').length,
  transfers:db.transactions.filter(t=>t.type==='transfer').length,
  income,expense,budgets:Object.keys(db.budgets).length,changes:db.budgetAdjustments.length,
  moves:db.budgetMoves.length,debtStatus,assets:db.investmentAssets.length,
  trades:db.investmentTrades.length,monthlyHistory:db.investmentSnapshots.length,
  goals:db.investmentGoals.length,archives:Object.keys(db.reports).length,accounts:db.accounts.length};
}
function validate(db,asOf=todayWib()){
 if(!db||!Array.isArray(db.accounts)||!Array.isArray(db.categories)||!db.transactions.length||
    !Array.isArray(db.debts)||!Array.isArray(db.investmentTrades)||!Object.keys(db.reports).length)
   throw Error('Data simulasi tidak lengkap.');
 const accountIds=new Set(db.accounts.map(a=>a.id)),catIds=new Set(db.categories.map(c=>c.id)),
  assetIds=new Set(db.investmentAssets.map(a=>a.id));
 if(new Set(db.transactions.map(t=>t.id)).size!==db.transactions.length)throw Error('ID transaksi duplikat.');
 for(const t of db.transactions){
  if(t.date>asOf||!/^20\d{2}-\d{2}-\d{2}$/.test(t.date)||
     t.amount<0||!['income','expense','transfer'].includes(t.type)||
     !accountIds.has(t.accountId)||t.type==='transfer'&&!accountIds.has(t.toAccountId)||
     t.type!=='transfer'&&!catIds.has(t.categoryId))throw Error('Transaksi contoh tidak konsisten.');
 }
 for(const d of db.debts){
  if(!accountIds.has(d.accountId)||d.settlements.reduce((sum,p)=>sum+p.amount,0)>d.amount)
   throw Error('Pelunasan utang contoh melampaui pokok.');
 }
 for(const t of db.investmentTrades){
  if(t.date>asOf||!assetIds.has(t.assetId)||!accountIds.has(t.accountId)||
     !['buy','sell','payout'].includes(t.type))throw Error('Transaksi investasi contoh tidak konsisten.');
 }
 if(!Object.values(db.incomeBudgetInitialStates||{}).some(x=>x.status==='draft')||
    !Object.values(db.incomeBudgetInitialStates||{}).some(x=>x.status==='locked')||
    !Object.keys(db.incomeBudgets||{}).length)
   throw Error('Contoh target pemasukan belum lengkap.');
 for(const category of db.categories.filter(c=>c.kind==='income')){
  for(const m of new Set(Object.keys(db.incomeBudgets).map(k=>k.slice(0,7)))){
   const base=Number(db.incomeBudgets[m+'|'+category.id]||0);
   const net=base+db.incomeBudgetMoves.filter(x=>x.month===m).reduce((n,x)=>n+(x.to===category.id?x.amount:0)-(x.from===category.id?x.amount:0),0)+
    db.incomeBudgetAdjustments.filter(x=>x.month===m&&x.categoryId===category.id)
     .reduce((n,x)=>n+(x.type==='increase'?1:-1)*x.amount,0);
   if(net<0)throw Error('Target efektif pemasukan simulasi negatif.');
  }
 }
 if(!Object.values(db.budgetInitialStates).some(x=>x.status==='draft')||
    !Object.values(db.budgetInitialStates).some(x=>x.status==='locked'))
  throw Error('Kasus anggaran belum lengkap.');
 if(!db.simulationMeta?.fictional)throw Error('Penanda data fiktif hilang.');
 return summarize(db);
}
window.PAAX_COMPREHENSIVE_DEMO={build,validate,summarize,version:1};
})();