/* Paaxixi — scrollable IDX instrument catalog.
   Official listed-company data is preferred. Historical ODbL stock symbol
   files are a clearly labeled fallback, NOT a live listing registry. */
(function(){
'use strict';
const ETF_REFERENCE=[
 {symbol:'XKGS',name:'Reksa Dana Syariah KIM Gold ETF Sharia',type:'etf',board:'ETF'},
 {symbol:'XBGS',name:'Reksa Dana Syariah Batavia Gold Sharia ETF',type:'etf',board:'ETF'},
 {symbol:'XGLD',name:'RD Syariah Premier ETF Gold Sharia Indonesia',type:'etf',board:'ETF'}
];
const ETF_URL='https://www.idx.id/id/data-pasar/data-exchange-traded-fund-etf/daftar-exchange-traded-fund-etf/';
const IDX_URL='https://www.idx.id/id/data-pasar/data-saham/daftar-saham';
const ARCHIVE_URL='https://github.com/Pholenk/IDX-Dataset';
const NOW=()=>new Date().toISOString();
const validSymbol=s=>/^[A-Z0-9]{3,6}$/.test(String(s||'').toUpperCase());
const clean=s=>String(s||'').trim().replace(/[<>]/g,'').slice(0,110);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const withTimeout=async(url,ms=10500)=>{
 const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
 try{
  const r=await fetch(url,{cache:'no-store',mode:'cors',credentials:'omit',signal:ac.signal});
  if(!r.ok)throw Error('Status '+r.status);
  return await r.json();
 }finally{clearTimeout(t);}
};
const normalize=list=>{
 const seen=new Set();
 return (Array.isArray(list)?list:[]).map(row=>{
  const symbol=String(row.Code||row.code||row.StockCode||row.symbol||row.ticker||row.name?.replace(/\.json$/i,'')||'').toUpperCase().trim().replace(/\.JK$/,'');
  const name=clean(row.Name||row.nameLabel||row.StockName||row.companyName||row.CompanyName||'')||'Nama emiten belum tersedia';
  const board=clean(row.ListingBoard||row.Board||row.board||'');
  return {symbol,name,board,type:'stock'};
 }).filter(item=>{
  if(!validSymbol(item.symbol)||seen.has(item.symbol))return false;
  seen.add(item.symbol);return true;
 }).sort((a,b)=>a.symbol.localeCompare(b.symbol));
};
function unwrap(raw){
 if(Array.isArray(raw))return raw;
 if(!raw||typeof raw!=='object')return [];
 for(const candidate of [raw.data?.data,raw.data?.records,raw.data?.Items,raw.data,raw.records,raw.Items,raw.result?.data]){
  if(Array.isArray(candidate))return candidate;
 }
 return [];
}
let saved=null;
try{const cached=JSON.parse(sessionStorage.getItem('paax-idx-catalog-v1')||'null');
 if(cached?.savedAt&&Date.now()-Date.parse(cached.savedAt)<12*3600e3&&Array.isArray(cached.items)&&cached.items.length>150)saved=cached;
}catch(_){}
let inFlight=null;
async function load(force=false){
 if(!force&&saved?.items?.length>150)return saved;
 if(inFlight)return inFlight;
 inFlight=(async()=>{
  let source='',items=[],note='',sourceUrl=IDX_URL;
  const official='https://www.idx.co.id/primary/ListedCompany/GetCompanyProfiles?start=0&length=1200';
  try{
   const raw=await withTimeout(official);
   items=normalize(unwrap(raw));
   if(items.length<150)throw Error('Data BEI tidak lengkap');
   source='Daftar Perusahaan Tercatat BEI';note='Data daftar tercatat dari endpoint BEI; status bisa berubah tanpa pemberitahuan.';
  }catch(error){
   const fallbacks=[
    {url:'https://zapi.ink/v1/finance:idx/securities?start=0&length=1000',source:'Cermin IDX pihak ketiga',note:'Cermin data BEI, bukan feed resmi; status pencatatan perlu dicek ulang di BEI.'},
    {url:'https://api.github.com/repos/Pholenk/IDX-Dataset/contents/dataset/stocks/json?per_page=1000',source:'Arsip kode saham turunan BEI (historis)',note:'Arsip historis berlisensi ODbL, terakhir diperbarui menurut metadata 1 Juni 2026. Tidak menjamin seluruh kode masih aktif.'}
   ];
   for(const fallback of fallbacks){
    try{
     const response=await withTimeout(fallback.url);
     const candidate=normalize(unwrap(response));
     if(candidate.length<100)continue;
     items=candidate;source=fallback.source;note=fallback.note;sourceUrl=fallback.url.includes('github')?ARCHIVE_URL:'https://zapi.ink/api/finance/idx?ep=reference';
     break;
    }catch(_){}
   }
  }
  const result={items,source,sourceUrl,note,savedAt:NOW(),etfs:ETF_REFERENCE.map(x=>({...x}))};
  if(items.length>100){
   saved=result;try{sessionStorage.setItem('paax-idx-catalog-v1',JSON.stringify(result));}catch(_){}
  }
  return result;
 })().finally(()=>{inFlight=null;});
 return inFlight;
}
function getItem(code,type='stock',catalog=saved){
 const list=type==='etf'?ETF_REFERENCE:catalog?.items||[];
 return list.find(x=>x.symbol===code)||null;
}
function renderModal(catalog,watchlist=[],term='',type='all',busy=false,error=''){
 const items=(catalog?.items||[]).concat((catalog?.etfs||ETF_REFERENCE));
 const q=String(term||'').trim().toUpperCase().slice(0,60);
 const filtered=items.filter(x=>(type==='all'||x.type===type)&&
  (!q||x.symbol.includes(q)||x.name.toUpperCase().includes(q)));
 const selected=new Set(watchlist.map(x=>String(x).toUpperCase()));
 const cut=filtered.slice(0,1200);
 return '<div class="invest-catalog-backdrop" id="invest-catalog-backdrop">'+
  '<section class="invest-catalog-modal" role="dialog" aria-modal="true" aria-labelledby="invest-catalog-title">'+
  '<header class="invest-catalog-head"><span aria-hidden="true">🏢</span><div><small>KATALOG EFEK BURSA INDONESIA</small>'+
  '<h3 id="invest-catalog-title">Pilih Instrumen yang Ingin Dipantau</h3><p>Gulir katalog, pilih saham atau ETF, lalu harga ditampilkan jika sumber pasar tersedia.</p></div>'+
  '<button type="button" data-market-catalog-close aria-label="Tutup katalog">✕</button></header>'+
  '<div class="invest-catalog-tools"><input class="field" id="invest-catalog-filter" placeholder="Filter daftar berdasarkan nama atau kode (opsional)" value="'+escape(term)+'" autocomplete="off">'+
  '<div class="invest-catalog-tabs">'+[['all','Semua'],['stock','📈 Saham'],['etf','🧺 ETF']].map(([key,name])=>
   '<button type="button" data-market-catalog-type="'+key+'" class="'+(type===key?'active':'')+'">'+name+'</button>').join('')+'</div></div>'+
  '<div class="invest-catalog-source"><strong>'+escape(catalog?.source||'Sumber pasar belum tersedia')+'</strong>'+
  '<small>'+(busy?'⏳ Mengambil katalog…':escape(catalog?.note||'Jika gagal diakses, buka daftar resmi BEI dan coba lagi.'))+'</small>'+
  (catalog?.sourceUrl?'<a href="'+escape(catalog.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Cek sumber ↗</a>':'<a href="'+IDX_URL+'" target="_blank" rel="noopener noreferrer">Daftar resmi BEI ↗</a>')+
  '</div>'+
  (error?'<p class="invest-catalog-error" role="alert">'+escape(error)+'</p>':'')+
  '<div class="invest-catalog-count">'+(busy?'Memuat…':filtered.length+' instrumen ditemukan')+
  ' · '+selected.size+' dipantau · maksimal 8 kode</div>'+
  '<div class="invest-catalog-list" tabindex="0" aria-label="Daftar efek yang bisa digulir">'+
  (cut.length?cut.map(item=>'<button type="button" class="invest-catalog-item '+(selected.has(item.symbol)?'selected':'')+
   '" data-market-catalog-pick="'+escape(item.symbol)+'" data-market-catalog-kind="'+item.type+
   '" '+(selected.has(item.symbol)?'disabled':'')+'><span class="invest-catalog-symbol">'+
   (item.type==='etf'?'🧺':'📈')+' '+escape(item.symbol)+'</span>'+
   '<span class="invest-catalog-name"><strong>'+escape(item.name)+'</strong>'+
   '<small>'+escape(item.type==='etf'?'ETF · Katalog contoh tercatat BEI (Sep 2026)':item.board||'Saham BEI · Verifikasi status aktif')+'</small></span>'+
   '<span class="invest-catalog-action">'+(selected.has(item.symbol)?'✓ Dipantau':'＋ Pantau')+'</span></button>').join(''):
   '<div class="invest-catalog-empty">'+(busy?'Mengambil katalog efek…':items.length?'Tidak ada instrumen yang cocok.':
     'Katalog BEI belum dapat diakses. Pilih Perbarui Katalog untuk mencoba lagi.')+'</div>')+
  '</div>'+
  '<footer class="invest-catalog-bottom"><small>Catatan: pilihan katalog bukan rekomendasi beli. ETF yang tercantum adalah contoh yang terverifikasi pada September 2026, bukan daftar seluruh ETF terkini. Harga bisa tertunda.</small>'+
  '<button type="button" data-market-catalog-reload '+(busy?'disabled':'')+'>⟳ Perbarui Katalog</button>'+
  '<button type="button" data-market-catalog-close>✓ Selesai</button></footer></section></div>';
}
window.PAAX_INVEST_CATALOG={load,getItem,renderModal,ETF_REFERENCE,ETF_URL,IDX_URL};
})();