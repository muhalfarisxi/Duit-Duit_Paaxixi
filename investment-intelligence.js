/* Duit-Duit Paaxixi — transparent market intelligence.
   Stockbit/Ajaib are research REFERENCES, not unauthorized data endpoints.
   Public feeds may be delayed or blocked. No logins, holdings, or secrets sent. */
(function(){
'use strict';
const SOURCES=[
 {name:'Stockbit Screener',icon:'📊',url:'https://stockbit.com/info/pro-tools/screener',
  detail:'Saringan fundamental dan valuasi. Akses data spesifik melalui akun Stockbit, bukan API Paaxixi.'},
 {name:'Stockbit Chartbit',icon:'📈',url:'https://stockbit.com/info/pro-tools/chartbit',
  detail:'Grafik dan indikator teknikal. Data tampilan Stockbit tidak diambil otomatis.'},
 {name:'Ajaib Saham',icon:'🪄',url:'https://ajaib.co.id/saham',
  detail:'Riset saham dan fitur analisis melalui Ajaib. Hasil analisis tidak disalin otomatis.'},
 {name:'BEI / IDX',icon:'🏢',url:'https://www.idx.id/id/produk/layanan-data-bei/',
  detail:'Bursa resmi: lisensi diperlukan untuk distribusi harga pasar real-time resmi.'},
 {name:'Kemenkeu SBN',icon:'🇮🇩',url:'https://www.kemenkeu.go.id/sbn',
  detail:'Verifikasi seri baru, penawaran, kupon, tenor, dan jatuh tempo.'},
 {name:'Bank Indonesia',icon:'🏦',url:'https://www.bi.go.id/id/statistik/indikator/bi-rate.aspx',
  detail:'Suku bunga kebijakan resmi; bukan otomatis tingkat bunga deposito.'},
 {name:'OJK Reksa Dana',icon:'🌿',url:'https://reksadana.ojk.go.id',
  detail:'Informasi resmi produk reksa dana; cek NAB, prospektus, biaya, dan risiko.'},
 {name:'CoinGecko',icon:'🪙',url:'https://www.coingecko.com/en/api',
  detail:'API publik harga kripto, dapat berubah serta dibatasi kuota.'}
];
const withTimeout=async(url,ms=13500)=>{
 const ac=new AbortController();const t=setTimeout(()=>ac.abort(),ms);
 try{const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:ac.signal});
  if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}
 finally{clearTimeout(t);}
};
const quoteDate=stamp=>{
 if(!stamp)return 'waktu harga tidak tersedia';
 const date=new Date(stamp);
 return Number.isNaN(date.getTime())?'waktu harga tidak tersedia':
  date.toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'short'})+' WIB';
};
const number=v=>(v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null));
const sym=v=>String(v||'').trim().toUpperCase().replace(/\.(?:JK)$/i,'').replace(/[^A-Z0-9-]/g,'');
const MONEY=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
const change=(price,previous)=>number(previous)>0?(Number(price)-Number(previous))/Number(previous)*100:null;
const safeLink=(url)=>SOURCES.some(x=>x.url===url)?url:'';
const cleanWatchlist=x=>[...new Set((Array.isArray(x)?x:[]).map(sym).filter(x=>/^[A-Z0-9]{3,10}(?:-W[0-9]{0,2})?$/.test(x)))].slice(0,8);
const cleanResearch=x=>(Array.isArray(x)?x:[]).filter(v=>v&&typeof v.id==='string'&&/^[A-Z0-9]{3,10}$/.test(sym(v.symbol))&&
  ['stockbit','ajaib','idx','other'].includes(v.source)).slice(-30);
async function loadMarket(watchlist=[],holdings=[],period='month'){
 const candidates=cleanWatchlist([...watchlist,...holdings]).slice(0,8);
 const provider=window.PAAX_INVEST_MARKET;
 const jobs={
  index:provider?.benchmark?provider.benchmark(period):Promise.reject(Error('Adaptor IHSG belum siap')),
  shares:Promise.allSettled(candidates.map(code=>{
   if(!provider?.quote)throw Error('Adaptor harga saham belum siap');
   return provider.quote({type:'stock',symbol:code}).then(q=>{
    if(!q||!Number.isFinite(Number(q.price))||Number(q.price)<=0)throw Error('Harga kosong');
    return {symbol:code,price:q.price,previousClose:q.previousClose,
     asOf:q.timestamp||null,provider:'Yahoo Finance via proxy publik',status:'delayed-unverified'};
   });
  })),
  crypto:withTimeout('https://api.coingecko.com/api/v3/coins/markets?vs_currency=idr&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h')
 };
 const [index,stocks,crypto]=await Promise.allSettled(Object.values(jobs));
 const fail=[];
 const result={loadedAt:new Date().toISOString(),index:null,shares:[],crypto:[],errors:[],quoteStatuses:[]};
 if(index.status==='fulfilled')result.index={...index.value,source:'Yahoo Finance via proxy publik'};
 else fail.push('IHSG: '+String(index.reason?.message||index.reason).slice(0,95));
 if(stocks.status==='fulfilled'){
  stocks.value.forEach((r,i)=>{
   if(r.status==='fulfilled')result.shares.push(r.value);
   else{fail.push(candidates[i]+': tidak tersedia');result.quoteStatuses.push({symbol:candidates[i],status:'unavailable'});}
  });
 }else fail.push('Saham: '+String(stocks.reason?.message||stocks.reason).slice(0,95));
 if(crypto.status==='fulfilled'&&Array.isArray(crypto.value)){
  result.crypto=crypto.value.slice(0,5).filter(x=>Number(x?.current_price)>0).map(x=>({
   symbol:String(x.symbol||'').toUpperCase().slice(0,12),
   name:String(x.name||'').slice(0,38),price:Number(x.current_price),
   dayChange:number(x.price_change_percentage_24h),asOf:x.last_updated||null,
   provider:'CoinGecko API publik',status:'delayed-unverified'
  }));
 }else fail.push('Kripto: '+String(crypto.reason?.message||crypto.reason).slice(0,95));
 result.errors=fail.slice(0,12);
 return result;
}
let indexPeriod='month',indexOverride=null,lastRenderedState=null,chartLoading=false;
const catalogState={open:false,busy:false,filter:'',kind:'all',data:null,error:''};
function render(state={},watchlist=[],research=[],escape,format){
 lastRenderedState=state;
 if(window.PAAX_FUNDAMENTALS)queueMicrotask(()=>void refreshFundamentals());
 const h=typeof escape==='function'?escape:(x=>String(x));
 const money=typeof format==='function'?format:MONEY;
 const intel=state.data||{},list=cleanWatchlist(watchlist);
 const notes=cleanResearch(research).slice().reverse().slice(0,6);
 const updated=intel.loadedAt?quoteDate(intel.loadedAt):'belum diperiksa';
 const hasPrices=!!(intel.index||(intel.shares||[]).length||(intel.crypto||[]).length);
 const pct=v=>v===null?'—':(v>=0?'+':'')+v.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 const values=(intel.shares||[]).map(item=>({...item,delta:change(item.price,item.previousClose)}));
 const error=(state.error||intel.errors?.length)?'Sebagian data tidak tersedia. Rencana tetap dapat digunakan; jangan menyimpulkan peluang pasar hanya dari harga yang hilang.':'';
 return '<section class="card invest-intel" id="invest-market-intelligence" aria-label="Pusat data pasar dan riset investasi">'+
  '<header class="invest-intel-head"><div><span class="invest-intel-eyebrow">🔎 RADAR RISET & DATA PASAR</span>'+
  '<h3>Inteligensi Pasar untuk Rencana Investasi</h3><p>Harga terkini yang tersedia, sumber riset Stockbit dan Ajaib, serta data fundamental yang kamu verifikasi.</p></div>'+
  '<button class="invest-intel-refresh" type="button" data-market-intel-refresh '+(state.busy?'disabled':'')+'>'+(state.busy?'⏳ Mengambil Data…':'⟳ Perbarui Data')+'</button></header>'+
  '<div class="invest-intel-status"><span class="invest-intel-light '+(state.busy?'loading':hasPrices?'ready':'')+'"></span>'+
  '<span>Pemeriksaan sumber terakhir: <strong>'+h(updated)+'</strong>. '+(hasPrices?'Sebagian harga berhasil diambil. ':'Belum ada harga yang berhasil diambil. ')+'Harga saham melalui Yahoo Finance dan kripto melalui CoinGecko, bukan feed Stockbit/Ajaib. Data dapat tertunda.</span></div>'+
  (error?'<p class="invest-intel-notice" role="status">'+h(error)+'</p>':'')+
  '<div class="invest-intel-market-grid"><div class="invest-intel-block invest-intel-index-wrap">'+
  (window.PAAX_MARKET_INSIGHT?.chartCard(indexOverride||intel.index,indexPeriod,state.busy||chartLoading)||
   '<p class="invest-intel-empty">Grafik IHSG belum siap.</p>')+'</div>'+
  '<div class="invest-intel-block"><div class="invest-intel-blockhead"><h4>🪙 Kripto Terbesar</h4><small>Peringkat kapitalisasi pasar, bukan rekomendasi</small></div>'+
  ((intel.crypto||[]).length?'<div class="invest-intel-quote-list">'+intel.crypto.map(item=>
   '<div><div><b>'+h(item.symbol)+'</b><small>'+h(item.name)+'</small></div><div><strong>'+money(item.price)+'</strong>'+
   '<small class="'+(item.dayChange>=0?'up':'down')+'">'+pct(item.dayChange)+' · 24 jam</small><small>Harga '+h(quoteDate(item.asOf))+'</small></div></div>').join('')+'</div>':
   '<p class="invest-intel-empty">Data kripto belum tersedia, kemungkinan dibatasi kuota atau jaringan.</p>')+'</div></div>'+ 
  (window.PAAX_MARKET_INSIGHT?.analysisCard({...intel,index:indexOverride||intel.index},state.busy||chartLoading)||'')+
  '<div class="invest-intel-stock-block"><div class="invest-intel-blockhead"><h4>📈 Pantau Instrumen Bursa</h4><small>Pilih saham atau ETF dari katalog bergulir; ini bukan rekomendasi beli.</small></div>'+
  '<div class="invest-intel-watch-form"><button type="button" class="invest-intel-open-catalog" data-market-catalog-open>🏢 Buka Katalog Saham & ETF BEI <span aria-hidden="true">✦</span></button></div>'+ 
  '<form id="market-watch-form" style="display:none" aria-hidden="true"><input type="hidden" name="symbol"></form>'+
  '<div class="invest-intel-watch-chips">'+(list.length?list.map(symbol=>
   '<span><b>'+h(symbol)+'</b><button type="button" data-market-watch-remove="'+h(symbol)+'" aria-label="Hapus pantauan '+h(symbol)+'">×</button></span>').join(''):
   '<small>Belum ada instrumen dipantau. Pilih dari katalog; aset yang telah dimiliki tetap dianalisis otomatis.</small>')+'</div>'+
  (values.length?'<div class="invest-intel-stocklist">'+values.map(x=>
    '<div class="invest-intel-stockrow"><strong>'+h(x.symbol)+'</strong><span>'+money(x.price)+'</span>'+
    '<b class="'+(x.delta!==null&&x.delta<0?'down':'up')+'">'+pct(x.delta)+'</b>'+
    '<small>'+h(quoteDate(x.asOf))+'</small></div>').join('')+'</div>':
    '<p class="invest-intel-empty">Belum ada harga instrumen yang berhasil diambil. Pilih instrumen dari katalog lalu perbarui data.</p>')+
  '<small class="invest-intel-footnote">Harga saham dapat tertunda. Tidak mencakup laporan fundamental atau target harga broker secara otomatis. Maksimal 8 kode pantauan. Harga saham/ETF berasal dari sumber publik dan dapat tertunda.</small></div>'+
  '<div id="invest-auto-fundamentals-slot">'+(window.PAAX_FUNDAMENTALS?.render(list)||'')+'</div>'+
  '<details class="invest-intel-references"><summary>📚 Sumber Data & Cara Verifikasi</summary>'+
  '<div class="invest-intel-links">'+SOURCES.map(ref=>'<a href="'+safeLink(ref.url)+'" target="_blank" rel="noopener noreferrer" title="'+h(ref.detail)+'">'+ref.icon+' '+h(ref.name)+' ↗</a>').join('')+'</div>'+
  '<p>Rasio dievaluasi otomatis jika sumber publik mengizinkan. Stockbit dan Ajaib bukan API tersambung di Paaxixi. Nilai kosong tidak boleh ditafsirkan sebagai nol.</p></details>'+
  '<p class="invest-intel-disclaimer">🔒 Penyedia data menerima kode emiten publik saja, tanpa identitas rekening. PER, PBV, ROE, dan dividen diambil bila tersedia; tanggal dan sumber dicantumkan. Analisis bukan jaminan harga maupun anjuran transaksi.</p>'+
  '</section>';
}
function aiContext(data,notes=[]){
 const prices=data||{},shares=(prices.shares||[]).slice(0,8).map(x=>({
  symbol:sym(x.symbol),price:number(x.price),previousClose:number(x.previousClose),
  asOf:x.asOf||null,source:'Yahoo Finance (publik, mungkin tertunda)',verifiedRealTime:false
 }));
 const crypto=(prices.crypto||[]).slice(0,5).map(x=>({
  symbol:sym(x.symbol),priceIDR:number(x.price),change24h:number(x.dayChange),
  asOf:x.asOf||null,source:'CoinGecko API publik',verifiedRealTime:false
 }));
 const research=cleanResearch(notes).slice(-12).map(x=>({
  symbol:sym(x.symbol),source:x.source,asOf:String(x.date||'').slice(0,10),
  per:number(x.per),pbv:number(x.pbv),roe:number(x.roe),dividendYield:number(x.yield),
  independentVerification:false,method:'manual input'
 }));
 return {asOf:prices.loadedAt||null,availability:prices.loadedAt?'partial-public':'not-fetched',
  index:prices.index?{symbol:'^JKSE',price:number(prices.index.price),
   previousClose:number(prices.index.previousClose),asOf:prices.index.timestamp||null,
   source:'Yahoo Finance publik (bukan data BEI berlisensi)',verifiedRealTime:false}:null,
  shares,crypto,research,
  automaticFundamentals:window.PAAX_FUNDAMENTALS?.state?.records?.slice(0,8).map(x=>({symbol:x.symbol,per:x.per,pbv:x.pbv,roe:x.roe,dividendYield:x.dividendYield,source:x.source,asOf:x.sourceDate}))||[],
  dataLimitations:'Tidak ada feed API Stockbit/Ajaib. Catatan rasio adalah transkripsi pengguna; validasi sumber dan masa berlaku wajib. Kegagalan jaringan bukan sinyal beli/jual. Harga publik mungkin tertunda.'};
}

/* Interactive add-ons are loaded from existing small modules. No modifications
   to the 1 MB HTML needed, and the app's data/Cloud APIs remain authoritative. */
const addScript=(src,done)=>{
 if(src.includes('index-insight')&&window.PAAX_MARKET_INSIGHT){done?.();return Promise.resolve(true);}
 if(src.includes('catalog')&&window.PAAX_INVEST_CATALOG){done?.();return Promise.resolve(true);}
 return new Promise(resolve=>{
  const script=document.createElement('script');script.src='./'+src;
  script.onload=()=>{done?.();resolve(true)};
  script.onerror=()=>resolve(false);
  document.head.appendChild(script);
 });
};
const link=document.querySelector('link[href*="investment-intelligence.css"]');
if(link)link.href='./investment-intelligence.css?v=2';
function shownIndex(){
 return indexOverride||lastRenderedState?.data?.index||null;
}
function upgradeMarket(){
 if(!window.PAAX_MARKET_INSIGHT||!lastRenderedState)return;
 const card=document.querySelector('#invest-market-intelligence');
 if(!card)return;
 const graph=card.querySelector('.invest-intel-index-wrap');
 if(graph)graph.innerHTML=window.PAAX_MARKET_INSIGHT.chartCard(shownIndex(),indexPeriod,
  chartLoading||!!lastRenderedState.busy);
 const html=window.PAAX_MARKET_INSIGHT.analysisCard(
  {...(lastRenderedState.data||{}),index:shownIndex()},chartLoading||!!lastRenderedState.busy);
 const existing=card.querySelector('.invest-market-advice');
 if(existing)existing.outerHTML=html;
 else card.querySelector('.invest-intel-market-grid')?.insertAdjacentHTML('afterend',html);
}
const insightReady=addScript('investment-index-insight.js?v=1',upgradeMarket);
const catalogReady=addScript('investment-catalog.js?v=1');

const fundamentalReady=addScript('investment-fundamentals.js?v=1',()=>{
 const style=document.createElement('link');style.rel='stylesheet';style.href='./investment-fundamentals.css?v=1';
 document.head.appendChild(style);
 void refreshFundamentals(false);
});
function watchedFromPage(){
 const items=[];
 document.querySelectorAll('#invest-market-intelligence [data-market-watch-remove]').forEach(button=>{
  const code=String(button.dataset.marketWatchRemove||'').trim().toUpperCase();
  if(/^[A-Z0-9]{3,8}$/.test(code))items.push(code);
 });
 return [...new Set(items)];
}
function upgradeFundamentals(){
 const slot=document.getElementById('invest-auto-fundamentals-slot');
 if(!slot||!window.PAAX_FUNDAMENTALS)return;
 slot.innerHTML=window.PAAX_FUNDAMENTALS.render(watchedFromPage());
}
async function refreshFundamentals(force=false){
 if(!window.PAAX_FUNDAMENTALS)return;
 const symbols=watchedFromPage();
 upgradeFundamentals();
 await window.PAAX_FUNDAMENTALS.getFundamentals(symbols,force);
}
document.addEventListener('paax:fundamentals-updated',upgradeFundamentals);
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-invest-fundamental-refresh]');
 if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 void refreshFundamentals(true);
},true);

const quoteAdapterReady=addScript('investment-market.js?v=7',()=>{
 const panel=document.querySelector('#invest-market-intelligence');
 const btn=panel?.querySelector('[data-market-intel-refresh]');
 if(btn&&!btn.disabled&&!(lastRenderedState?.data?.index?.series?.length>1))btn.click();
});
document.addEventListener('click',event=>{
 if(!event.target.closest?.('[data-nav="investments"]'))return;
 indexOverride=null;indexPeriod='month';
 // The host owns view changes. Refresh after navigation, but never overlap its
 // built-in request (disabled buttons indicate that data retrieval is active).
 setTimeout(()=>{
  const btn=document.querySelector('#invest-market-intelligence [data-market-intel-refresh]');
  if(btn&&!btn.disabled)btn.click();
 },450);
},true);

function watched(){
 try{
  const db=JSON.parse(localStorage.getItem('arus-prototype-v1')||'null');
  return Array.isArray(db?.investmentWatchlist)?db.investmentWatchlist:[];
 }catch(_){return [];}
}
function catalogMarkup(){
 return window.PAAX_INVEST_CATALOG?.renderModal(catalogState.data,watched(),
  catalogState.filter,catalogState.kind,catalogState.busy,catalogState.error)||'';
}
function patchCatalogList(){
 const el=document.querySelector('#invest-catalog-backdrop');if(!el)return;
 const template=document.createElement('template');template.innerHTML=catalogMarkup();
 const newList=template.content.querySelector('.invest-catalog-list');
 const oldList=el.querySelector('.invest-catalog-list');
 if(newList&&oldList){const scroll=oldList.scrollTop;oldList.innerHTML=newList.innerHTML;oldList.scrollTop=scroll;}
 const c=el.querySelector('.invest-catalog-count'),nc=template.content.querySelector('.invest-catalog-count');
 if(c&&nc)c.textContent=nc.textContent;
}
function rerenderCatalog(){
 document.querySelector('#invest-catalog-backdrop')?.remove();
 if(!catalogState.open)return;
 document.body.insertAdjacentHTML('beforeend',catalogMarkup());
}
function closeCatalog(){
 catalogState.open=false;document.querySelector('#invest-catalog-backdrop')?.remove();
 document.querySelector('[data-market-catalog-open]')?.focus({preventScroll:true});
}
async function openCatalog(force=false){
 if(!(await catalogReady)||!window.PAAX_INVEST_CATALOG){return;}
 catalogState.open=true;catalogState.busy=true;catalogState.error='';
 if(!catalogState.data){catalogState.kind='all';catalogState.filter='';}
 rerenderCatalog();document.querySelector('#invest-catalog-filter')?.focus({preventScroll:true});
 try{
  catalogState.data=await window.PAAX_INVEST_CATALOG.load(force);
  if(!catalogState.data?.items?.length)
   catalogState.error='Katalog saham belum berhasil dimuat. Pilihan ETF contoh masih tersedia; coba Perbarui Katalog atau kunjungi daftar resmi BEI.';
 }catch(err){catalogState.error=String(err?.message||err).slice(0,160);}
 finally{
  catalogState.busy=false;
  if(catalogState.open){rerenderCatalog();document.querySelector('#invest-catalog-filter')?.focus({preventScroll:true});}
 }
}
async function chooseInstrument(code,kind){
 const item=window.PAAX_INVEST_CATALOG?.getItem(code,kind,catalogState.data);
 if(!item)return;
 const form=document.getElementById('market-watch-form');
 const input=form?.querySelector('input[name="symbol"]');
 if(!input)return;
 input.value=item.symbol;
 if(typeof form.requestSubmit==='function')form.requestSubmit();
 else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 patchCatalogList();
}
async function setIndexPeriod(period){
 if(!['month','quarter','year','fiveyear'].includes(period)||chartLoading||indexPeriod===period)return;
 indexPeriod=period;chartLoading=true;upgradeMarket();
 try{
  const newData=await window.PAAX_INVEST_MARKET?.benchmark(period);
  if(newData)indexOverride=newData;
 }catch(err){
  // Keep the last verified chart instead of inventing historical points.
  indexOverride={...(shownIndex()||{}),series:[],period};
 }finally{chartLoading=false;upgradeMarket();}
}
document.addEventListener('click',event=>{
 if(event.target?.id==='invest-catalog-backdrop'&&catalogState.open){event.preventDefault();closeCatalog();return;}
 const target=event.target.closest?.('[data-market-catalog-open],[data-market-catalog-close],[data-market-catalog-reload],[data-market-catalog-pick],[data-market-catalog-type],[data-market-index-period]');
 if(!target)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(target.hasAttribute('data-market-catalog-open')){void openCatalog();return;}
 if(target.hasAttribute('data-market-catalog-close')){closeCatalog();return;}
 if(target.hasAttribute('data-market-catalog-reload')){void openCatalog(true);return;}
 if(target.dataset.marketCatalogType!==undefined){
  if(!['all','stock','etf'].includes(target.dataset.marketCatalogType))return;
  catalogState.kind=target.dataset.marketCatalogType;catalogState.filter='';
  rerenderCatalog();document.querySelector('#invest-catalog-filter')?.focus({preventScroll:true});return;
 }
 if(target.dataset.marketCatalogPick!==undefined){void chooseInstrument(target.dataset.marketCatalogPick,target.dataset.marketCatalogKind);return;}
 if(target.dataset.marketIndexPeriod!==undefined){void setIndexPeriod(target.dataset.marketIndexPeriod);return;}
},true);
document.addEventListener('input',event=>{
 if(!catalogState.open||event.target?.id!=='invest-catalog-filter')return;
 catalogState.filter=event.target.value.slice(0,60);patchCatalogList();
},true);
document.addEventListener('keydown',event=>{
 if(!catalogState.open||event.key!=='Escape')return;
 event.preventDefault();event.stopImmediatePropagation();closeCatalog();
},true);

window.PAAX_MARKET_INTEL={loadMarket,render,aiContext,cleanWatchlist,cleanResearch,SOURCES};
})();