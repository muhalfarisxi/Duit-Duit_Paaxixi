/* Duit-Duit Paaxixi — public market quote adapter, v1.
   No account data, holdings or authentication secrets are ever sent to the
   public quote proxy; only user-entered public market symbols are requested.
   Yahoo chart endpoint is unofficial and quotes can be delayed/unavailable. */
(function(){
 'use strict';
 const ROOT='https://proxy.cors.dev/https://query1.finance.yahoo.com/v8/finance/chart/';
 const IDX_TYPES=new Set(['stock','warrant','etf','dire','dinfra','eba']);
 const CRYPTO=new Set(['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX','DOT','LTC','LINK','TRX','SHIB','BCH','UNI']);
 const positive=v=>Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<1e13;
 function ticker(asset){
  if(!asset||!asset.symbol)return null;
  const symbol=String(asset.symbol).trim().toUpperCase();
  if(IDX_TYPES.has(asset.type)){
   if(!/^[A-Z0-9]{3,10}(?:\.JK)?$/.test(symbol))return null;
   return symbol.endsWith('.JK')?symbol:symbol+'.JK';
  }
  if(asset.type==='crypto'){
   const base=symbol.replace(/[-/]IDR$/,'');
   return CRYPTO.has(base)?base+'-IDR':null;
  }
  return null;
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
   previousClose:positive(data.meta.chartPreviousClose)?Number(data.meta.chartPreviousClose):
      (positive(data.meta.previousClose)?Number(data.meta.previousClose):null),
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
 window.PAAX_INVEST_MARKET={ticker,quote,monthly,source:'Yahoo Finance / cors.dev',
  disclaimer:'Harga publik dapat tertunda atau tidak tersedia. Bursa BEI tidak selalu buka; pembaruan bukan streaming per transaksi.'};
})();