/* Duit-Duit Paaxixi — public market quote adapter, v1.
   No account data, holdings or authentication secrets are ever sent to the
   public quote proxy; only user-entered public market symbols are requested.
   Yahoo chart endpoint is unofficial and quotes can be delayed/unavailable. */
(function(){
 'use strict';
 const IDX_TYPES=new Set(['stock','warrant','etf','dire','dinfra','eba']);
 function positive(value){
  const number=Number(value);
  return Number.isFinite(number)&&number>0;
 }
 // Normalize public market symbols while keeping prices in rupiah.
 // IDX instruments trade per share; crypto assets use the IDR trading pair.
 function ticker(asset){
  if(!asset||asset.autoPrice===false)return null;
  const kind=String(asset.type||'').toLowerCase();
  let symbol=String(asset.symbol||'').trim().toUpperCase().replace(/\s+/g,'');
  if(!symbol)return null;
  if(IDX_TYPES.has(kind)){
   if(symbol.endsWith('.JK'))symbol=symbol.slice(0,-3);
   // Restrict lookup to Indonesian exchange symbols, not arbitrary Yahoo tickers.
   if(!/^[A-Z0-9]{3,12}(?:-W[0-9]{0,2})?$/.test(symbol))return null;
   return symbol+'.JK';
  }
  if(kind==='crypto'){
   if(symbol.endsWith('-IDR'))symbol=symbol.slice(0,-4);
   if(!/^[A-Z0-9]{2,16}$/.test(symbol))return null;
   return symbol+'-IDR';
  }
  return null;
 }

 const queryUrl=q=>'https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q)+
  '&quotesCount=25&newsCount=0&listsCount=0';
 function listedItem(item){
  const symbol=String(item?.symbol||'').trim().toUpperCase();
  const quoteType=String(item?.quoteType||'').toUpperCase();
  const isIdx=/\.JK$/.test(symbol),isCrypto=/-IDR$/.test(symbol);
  let type=null;
  if(isIdx&&quoteType==='EQUITY')type=/-W(?:[0-9]*)\.JK$/.test(symbol)?'warrant':'stock';
  else if(isIdx&&(quoteType==='ETF'||quoteType==='MUTUALFUND'))type='etf';
  else if(isIdx&&['INDEX','OTHER'].includes(quoteType))type=null;
  else if(isCrypto&&(quoteType==='CRYPTOCURRENCY'||quoteType==='CRYPTO'))type='crypto';
  if(!type)return null;
  const name=String(item.longname||item.shortname||item.name||'').trim().slice(0,85);
  if(!name)return null;
  return {symbol,name,type,quoteType,exchange:String(item.exchange||item.exchDisp||'').slice(0,30)};
 }
 async function search(query){
  const q=String(query||'').trim().slice(0,60);
  if(q.length<2)return [];
  const abort=new AbortController();
  const clock=setTimeout(()=>abort.abort(),12000);
  try{
   const fetchQuotes=async term=>{
    const response=await fetch('https://proxy.cors.dev/'+queryUrl(term),{
     method:'GET',mode:'cors',credentials:'omit',signal:abort.signal,cache:'no-store'});
    if(!response.ok)throw Error('Pencarian pasar HTTP '+response.status);
    const data=await response.json();
    if(!Array.isArray(data?.quotes))throw Error('Daftar dari sumber pasar belum tersedia.');
    return data.quotes;
   };
   let quotes=await fetchQuotes(q);
   let items=quotes.map(listedItem).filter(Boolean);
   // Some crypto symbols appear only when the IDR pair is searched explicitly.
   if(!items.length&&/^[A-Z0-9]{2,10}$/i.test(q))
    items=(await fetchQuotes(q.toUpperCase()+'-IDR')).map(listedItem).filter(Boolean);
   const unique=new Set();
   return items.filter(item=>{
    if(unique.has(item.symbol))return false;
    unique.add(item.symbol);return true;
   }).slice(0,14);
  }finally{clearTimeout(clock)}
 }
 async function chart(symbol,range,interval){
  if(!/^[A-Z0-9.^=_-]{3,30}$/.test(symbol))throw Error('Kode bursa tidak valid.');
  const target='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)
   +'?range='+encodeURIComponent(range)+'&interval='+encodeURIComponent(interval);
  const controller=new AbortController();
  const clock=setTimeout(()=>controller.abort(),14000);
  try{
   const response=await fetch('https://proxy.cors.dev/'+target,{method:'GET',mode:'cors',credentials:'omit',signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error('Sumber pasar HTTP '+response.status);
   const body=await response.json(),data=body?.chart?.result?.[0];
   if(!data||!data.meta)throw Error('Data pasar untuk '+symbol+' tidak tersedia.');
   if(String(data.meta.currency||'').toUpperCase()!=='IDR')throw Error('Mata uang '+symbol+' bukan rupiah; harga tidak diimpor.');
   return data;
  }finally{clearTimeout(clock)}
 }
 function toLocalDate(seconds){
  const d=new Date(Number(seconds)*1000);
  return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'';
 }
 async function quote(asset){
  const symbol=ticker(asset);
  if(!symbol)return null;
  const data=await chart(symbol,'5d','1d');
  const rows=data.indicators?.quote?.[0]?.close||[];
  let price=Number(data.meta.regularMarketPrice);
  if(!positive(price))price=Number([...rows].reverse().find(positive));
  if(!positive(price))throw Error('Harga rupiah belum tersedia untuk '+symbol);
  const seconds=Number(data.meta.regularMarketTime)||Number(data.timestamp?.at(-1))||0;
  return {symbol,price,asOf:toLocalDate(seconds)||'',timestamp:seconds?new Date(seconds*1000).toISOString():'',
   previousClose:positive(data.meta.previousClose)?Number(data.meta.previousClose):
      (rows.filter(positive).length>1?Number(rows.filter(positive).at(-2)):
       (positive(data.meta.chartPreviousClose)?Number(data.meta.chartPreviousClose):null)),
   provider:'Yahoo Finance (via proxy publik)'};
 }
 async function monthly(asset){
  const symbol=ticker(asset);
  if(!symbol)return null;
  const data=await chart(symbol,'5y','1mo');
  const dates=data.timestamp||[],closes=data.indicators?.quote?.[0]?.close||[];
  const values={};
  dates.forEach((secs,i)=>{
   const price=Number(closes[i]),month=toLocalDate(secs).slice(0,7);
   if(/^\d{4}-\d{2}$/.test(month)&&positive(price))
    values[month]={price,source:'pasar',asOf:toLocalDate(secs),symbol};
  });
  return {symbol,prices:values};
 }


 /* IHSG context for the goal planner. Delayed public quote; not a trade signal.
    No individual investment holdings are sent to this endpoint. */
 async function benchmark(){
  const data=await chart('^JKSE','5d','1d');
  const rows=(data.indicators?.quote?.[0]?.close||[]).filter(positive);
  let price=Number(data.meta.regularMarketPrice);
  if(!positive(price))price=Number(rows.at(-1));
  if(!positive(price))throw Error('Data IHSG belum tersedia.');
  const previousClose=positive(data.meta.previousClose)?Number(data.meta.previousClose):
   positive(data.meta.chartPreviousClose)?Number(data.meta.chartPreviousClose):
   (rows.length>1?Number(rows.at(-2)):null);
  const seconds=Number(data.meta.regularMarketTime)||Number(data.timestamp?.at(-1))||0;
  return {symbol:'^JKSE',label:'IHSG',price,previousClose:positive(previousClose)?previousClose:null,
   asOf:seconds?new Date(seconds*1000).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}):'waktu tidak tersedia',
   timestamp:seconds?new Date(seconds*1000).toISOString():'',provider:'Yahoo Finance / proxy publik'};
 }
 /* Historical month-end market valuation. Never substitute today's price
    for a past month or silently display a partial sum as total portfolio. */
 function monthEnd(month){
  const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));
  return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
 }
 function portfolioMonthly(db,today,investmentState){
  const buys=(db.investmentTrades||[]).filter(t=>t.type==='buy'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date));
  if(!buys.length)return [];
  const latest=today.slice(0,7),earliest=buys.map(t=>t.date.slice(0,7)).sort()[0];
  const maxStart=new Date(Date.UTC(Number(latest.slice(0,4))-5,Number(latest.slice(5,7))-1,1)).toISOString().slice(0,7);
  const start=earliest>maxStart?earliest:maxStart;
  const records=[];
  let year=Number(start.slice(0,4)),month=Number(start.slice(5,7));
  const endYear=Number(latest.slice(0,4)),endMonth=Number(latest.slice(5,7));
  for(let limit=0;limit<72&&(year<endYear||year===endYear&&month<=endMonth);limit++){
   const key=year+'-'+String(month).padStart(2,'0');
   const cutoff=key===latest?today:monthEnd(key);
   let value=0,cost=0,missing=0;const assets=[];
   (db.investmentAssets||[]).forEach(asset=>{
    const state=investmentState(asset,cutoff);
    if(!(state.quantity>0))return;
    const entry=db.investmentPriceHistory?.[asset.id]?.[key]||null;
    const currentPrice=key===latest&&String(asset.priceDate||'').slice(0,7)===key
      &&positive(asset.price)?Number(asset.price):null;
    const price=currentPrice!==null?currentPrice:positive(entry?.price)?Number(entry.price):null;
    const market=price===null?null:Math.round(price*state.quantity*100)/100;
    if(market===null)missing++;else value+=market;
    cost+=state.cost;
    assets.push({id:asset.id,name:asset.name,symbol:asset.symbol||'',type:asset.type,
      quantity:state.quantity,cost:state.cost,price,market,
      priceSource:currentPrice!==null?(asset.priceSource||'manual'):(entry?.source||'belum ada'),
      priceDate:currentPrice!==null?asset.priceDate:(entry?.asOf||'')});
   });
   records.push({month:key,date:cutoff,assets,value:missing?null:Math.round(value*100)/100,
    partialValue:Math.round(value*100)/100,cost:Math.round(cost*100)/100,missing,
    current:key===latest,hasAssets:assets.length>0});
   month++;if(month>12){month=1;year++}
  }
  return records;
 }
 function portfolioPeriods(records,mode){
  if(mode!=='year')return records.slice(-24);
  const byYear=new Map();
  for(const record of records)byYear.set(record.month.slice(0,4),record);
  return [...byYear.values()].slice(-6);
 }
 /* SVG dots carry period identifiers; existing website event delegation
    opens the precise historical holdings for each selected point. */
 function trendHtml(records,mode,moneyFn,escapeFn){
  const points=portfolioPeriods(records,mode);
  const usable=points.filter(p=>p.value!==null&&p.hasAssets);
  if(!points.length)return '<div class="invest-empty-chart">Catat pembelian investasi untuk mulai menyusun tren portofolio.</div>';
  if(!usable.length)return '<div class="invest-empty-chart">Riwayat harga akhir bulan belum lengkap. Harga saham akan dicoba diambil otomatis; untuk aset lain, catat harga historis melalui tombol Harga.</div>';
  const W=Math.max(660,points.length*66),H=255,top=32,bottom=204,left=60,right=W-31;
  const max=Math.max(1,...usable.map(p=>p.value)),min=Math.min(0,...usable.map(p=>p.value));
  const span=max-min||1;
  const xy=points.map((p,i)=>({
   ...p,x:points.length===1?(left+right)/2:left+(right-left)*i/(points.length-1),
   y:p.value===null?null:bottom-(p.value-min)/span*(bottom-top)}));
  const segments=[];let current=[];
  for(const p of xy){
   if(p.y===null){if(current.length)segments.push(current);current=[];}
   else current.push(p);
  }
  if(current.length)segments.push(current);
  const svgLine=segments.map(segment=>{
   if(segment.length===1)return '';
   return '<polyline points="'+segment.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')+
    '" fill="none" stroke="#2b86cb" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
  }).join('');
  const showLabels=new Set([0,xy.length-1]);
  if(xy.length<=10)xy.forEach((p,i)=>showLabels.add(i));
  else for(let i=0;i<xy.length;i+=Math.max(1,Math.round(xy.length/7)))showLabels.add(i);
  const dots=xy.map((p,i)=>{
   const x=p.x.toFixed(1),label=mode==='year'?p.month.slice(0,4):p.month.slice(5).replace('-','/');
   const tooltip=escapeFn((mode==='year'?p.month.slice(0,4):p.month)+' · '+
    (p.value===null?'Harga belum lengkap':moneyFn(p.value)));
   const dot=p.y===null
    ?'<circle cx="'+x+'" cy="'+(bottom+8)+'" r="4" fill="#f6bd6b" stroke="#fff" stroke-width="2"/>'
    :'<circle cx="'+x+'" cy="'+p.y.toFixed(1)+'" r="6" fill="#fff" stroke="#267dc2" stroke-width="3"/>';
   const point='<g data-invest-period="'+p.month+'" class="invest-history-point" tabindex="0" role="button" aria-label="'+tooltip+'; lihat rincian investasi" style="cursor:pointer"><title>'+tooltip+'</title>'+
     '<circle cx="'+x+'" cy="'+(p.y===null?bottom+8:p.y)+'" r="18" fill="transparent"/>'+dot+'</g>';
   return point+(showLabels.has(i)?'<text x="'+x+'" y="234" text-anchor="middle" fill="#7791a9" font-size="11">'+label+'</text>':'');
  }).join('');
  const ticks=[0,.25,.5,.75,1].map(v=>{
   const y=(bottom-(bottom-top)*v).toFixed(1);
   return '<line x1="'+left+'" y1="'+y+'" x2="'+right+'" y2="'+y+'" stroke="#e0eaf6" stroke-dasharray="4 6"/>';
  }).join('');
  const label=points.at(-1)?.value!==null?moneyFn(points.at(-1).value):'Nilai terakhir belum lengkap';
  const important=escapeFn(label);
  return '<div class="invest-chart-status"><strong>'+important+'</strong><small>'+usable.length+
   ' periode lengkap · klik titik untuk nilai dan instrumen pada akhir periode</small></div>'+
   '<div class="invest-trend-scroll" role="region" aria-label="Tren nilai investasi dapat digeser horizontal" tabindex="0">'+
   '<svg viewBox="0 0 '+W+' '+H+'" style="width:'+W+'px;max-width:none;height:255px" role="img" aria-label="Grafik tren portofolio '+(mode==='year'?'tahunan':'bulanan')+'">'+ticks+svgLine+dots+'</svg></div>'+
   '<p class="invest-trend-foot">Titik oranye menandakan harga instrumen belum lengkap; angka parsial tidak dianggap sebagai total portofolio. Periode berjalan menggunakan harga terkini yang tersedia.</p>';
 }

 window.PAAX_INVEST_MARKET={ticker,quote,monthly,benchmark,search,portfolioMonthly,portfolioPeriods,trendHtml,source:'Yahoo Finance / cors.dev',
  disclaimer:'Harga publik dapat tertunda atau tidak tersedia. Bursa BEI tidak selalu buka; pembaruan bukan streaming per transaksi.'};
})();