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
const number=v=>Number.isFinite(Number(v))?Number(v):null;
const sym=v=>String(v||'').trim().toUpperCase().replace(/\.(?:JK)$/i,'').replace(/[^A-Z0-9-]/g,'');
const MONEY=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
const change=(price,previous)=>number(previous)>0?(Number(price)-Number(previous))/Number(previous)*100:null;
const safeLink=(url)=>SOURCES.some(x=>x.url===url)?url:'';
const cleanWatchlist=x=>[...new Set((Array.isArray(x)?x:[]).map(sym).filter(x=>/^[A-Z0-9]{3,10}(?:-W[0-9]{0,2})?$/.test(x)))].slice(0,8);
const cleanResearch=x=>(Array.isArray(x)?x:[]).filter(v=>v&&typeof v.id==='string'&&/^[A-Z0-9]{3,10}$/.test(sym(v.symbol))&&
  ['stockbit','ajaib','idx','other'].includes(v.source)).slice(-30);
async function loadMarket(watchlist=[],holdings=[]){
 const candidates=cleanWatchlist([...watchlist,...holdings]).slice(0,8);
 const provider=window.PAAX_INVEST_MARKET;
 const jobs={
  index:provider?.benchmark?provider.benchmark():Promise.reject(Error('Adaptor IHSG belum siap')),
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
function render(state={},watchlist=[],research=[],escape,format){
 const h=typeof escape==='function'?escape:(x=>String(x));
 const money=typeof format==='function'?format:MONEY;
 const intel=state.data||{},list=cleanWatchlist(watchlist);
 const notes=cleanResearch(research).slice().reverse().slice(0,6);
 const updated=intel.loadedAt?quoteDate(intel.loadedAt):'belum berhasil mengambil data';
 const pct=v=>v===null?'—':(v>=0?'+':'')+v.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 const values=(intel.shares||[]).map(item=>({...item,delta:change(item.price,item.previousClose)}));
 const error=(state.error||intel.errors?.length)?'Sebagian data tidak tersedia. Rencana tetap dapat digunakan; jangan menyimpulkan peluang pasar hanya dari harga yang hilang.':'';
 return '<section class="card invest-intel" id="invest-market-intelligence" aria-label="Pusat data pasar dan riset investasi">'+
  '<header class="invest-intel-head"><div><span class="invest-intel-eyebrow">🔎 RADAR RISET & DATA PASAR</span>'+
  '<h3>Inteligensi Pasar untuk Rencana Investasi</h3><p>Harga terkini yang tersedia, sumber riset Stockbit dan Ajaib, serta data fundamental yang kamu verifikasi.</p></div>'+
  '<button class="invest-intel-refresh" type="button" data-market-intel-refresh '+(state.busy?'disabled':'')+'>'+(state.busy?'⏳ Mengambil Data…':'⟳ Perbarui Data')+'</button></header>'+
  '<div class="invest-intel-status"><span class="invest-intel-light '+(state.busy?'loading':intel.loadedAt?'ready':'')+'"></span>'+
  '<span>Data terakhir diambil: <strong>'+h(updated)+'</strong>. Harga saham melalui Yahoo Finance dan kripto melalui CoinGecko, bukan feed Stockbit/Ajaib. Data dapat tertunda.</span></div>'+
  (error?'<p class="invest-intel-notice" role="status">'+h(error)+'</p>':'')+
  '<div class="invest-intel-market-grid"><div class="invest-intel-block">'+
  '<div class="invest-intel-blockhead"><h4>📊 IHSG</h4><small>Indeks utama BEI · sumber publik</small></div>'+
  (intel.index?'<strong class="invest-intel-index">'+Number(intel.index.price).toLocaleString('id-ID',{maximumFractionDigits:2})+'</strong>'+
  '<span class="invest-intel-delta">'+pct(change(intel.index.price,intel.index.previousClose))+' dibanding penutupan sebelumnya</span>'+
  '<small>Harga bertanggal '+h(intel.index.asOf||'waktu tidak tersedia')+'</small>':
  '<p class="invest-intel-empty">Harga IHSG belum tersedia. Coba perbarui atau cek BEI.</p>')+'</div>'+
  '<div class="invest-intel-block"><div class="invest-intel-blockhead"><h4>🪙 Kripto Terbesar</h4><small>Peringkat kapitalisasi pasar, bukan rekomendasi</small></div>'+
  ((intel.crypto||[]).length?'<div class="invest-intel-quote-list">'+intel.crypto.map(item=>
   '<div><div><b>'+h(item.symbol)+'</b><small>'+h(item.name)+'</small></div><div><strong>'+money(item.price)+'</strong>'+
   '<small class="'+(item.dayChange>=0?'up':'down')+'">'+pct(item.dayChange)+' · 24 jam</small></div></div>').join('')+'</div>':
   '<p class="invest-intel-empty">Data kripto belum tersedia, kemungkinan dibatasi kuota atau jaringan.</p>')+'</div></div>'+
  '<div class="invest-intel-stock-block"><div class="invest-intel-blockhead"><h4>📈 Pantau Saham BEI</h4><small>Masukkan kode saham yang ingin dianalisis, bukan otomatis daftar rekomendasi beli</small></div>'+
  '<form id="market-watch-form" class="invest-intel-watch-form"><input class="field" name="symbol" autocomplete="off" maxlength="12" placeholder="Kode saham, contoh: BBCA" aria-label="Kode saham yang dipantau" required>'+
  '<button type="submit">＋ Pantau</button></form>'+
  '<div class="invest-intel-watch-chips">'+(list.length?list.map(symbol=>
   '<span><b>'+h(symbol)+'</b><button type="button" data-market-watch-remove="'+h(symbol)+'" aria-label="Hapus pantauan '+h(symbol)+'">×</button></span>').join(''):
   '<small>Belum ada kode pantauan. Saham yang sudah dimiliki juga dianalisis tanpa menambahkan otomatis ke daftar.</small>')+'</div>'+
  (values.length?'<div class="invest-intel-stocklist">'+values.map(x=>
    '<div class="invest-intel-stockrow"><strong>'+h(x.symbol)+'</strong><span>'+money(x.price)+'</span>'+
    '<b class="'+(x.delta!==null&&x.delta<0?'down':'up')+'">'+pct(x.delta)+'</b>'+
    '<small>'+h(quoteDate(x.asOf))+'</small></div>').join('')+'</div>':
    '<p class="invest-intel-empty">Belum ada harga saham yang berhasil diambil. Tambahkan kode lalu pilih Perbarui Data.</p>')+
  '<small class="invest-intel-footnote">Harga saham dapat tertunda. Tidak mencakup laporan fundamental atau target harga broker secara otomatis. Maksimal 8 simbol pantauan termasuk aset saham yang dimiliki.</small></div>'+
  '<div class="invest-intel-research"><div class="invest-intel-blockhead"><h4>📚 Sumber Riset Terverifikasi</h4><small>Buka sumber dan cek tanggal datanya secara langsung</small></div>'+
   '<div class="invest-intel-links">'+SOURCES.map(ref=>'<a href="'+safeLink(ref.url)+'" target="_blank" rel="noopener noreferrer" title="'+h(ref.detail)+'">'+ref.icon+' '+h(ref.name)+' ↗</a>').join('')+'</div>'+
  '<details class="invest-intel-note-editor"><summary>✍️ Catat Hasil Riset Fundamental dari Stockbit / Ajaib</summary>'+
  '<p>Stockbit dan Ajaib tidak tersambung lewat API di website ini. Salin angka penting dari riset yang kamu baca, sertakan sumber dan tanggalnya; AI akan memperlakukannya sebagai data manual yang belum terverifikasi secara independen.</p>'+
  '<form id="invest-research-form"><label>Kode Saham<input class="field" name="symbol" maxlength="10" placeholder="BBCA" required></label>'+
  '<label>Sumber<select class="field" name="source" required><option value="stockbit">Stockbit</option><option value="ajaib">Ajaib</option><option value="idx">BEI / IDX</option><option value="other">Lainnya</option></select></label>'+
  '<label>Tanggal Data<input class="field" name="date" type="date" required max="'+h(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))+'"></label>'+
  '<label>PER (x)<input class="field" name="per" type="number" step="0.01" min="-1000" max="10000" placeholder="Opsional"></label>'+
  '<label>PBV (x)<input class="field" name="pbv" type="number" step="0.01" min="-1000" max="10000" placeholder="Opsional"></label>'+
  '<label>ROE (%)<input class="field" name="roe" type="number" step="0.01" min="-1000" max="1000" placeholder="Opsional"></label>'+
  '<label>Dividend Yield (%)<input class="field" name="yield" type="number" step="0.01" min="0" max="100" placeholder="Opsional"></label>'+
  '<button type="submit">✦ Simpan Catatan Riset</button></form></details>'+
  (notes.length?'<div class="invest-intel-notes">'+notes.map(x=>'<div><div><b>'+h(sym(x.symbol))+'</b><small>'+h(x.source.toUpperCase())+' · '+h(x.date)+' · input manual</small>'+
   '<p>'+['per','pbv','roe','yield'].filter(key=>x[key]!==null&&x[key]!==undefined&&x[key]!=='').map(key=>h(key.toUpperCase())+' '+h(String(x[key]))+(key==='roe'||key==='yield'?'%':'x')).join(' · ')+'</p></div>'+
   '<button type="button" data-market-note-delete="'+h(x.id)+'" title="Hapus catatan">×</button></div>').join('')+'</div>':'')+
  '</div>'+
  '<p class="invest-intel-disclaimer">🔒 Hanya simbol publik yang dikirim ke penyedia harga; daftar portofolio, rekening, dan transaksi pribadi tidak dikirim. Data otomatis dan catatan manual memiliki tingkat keandalan berbeda; status pasar berubah dan hasil historis tidak menjamin hasil masa depan.</p>'+
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
  dataLimitations:'Tidak ada feed API Stockbit/Ajaib. Catatan rasio adalah transkripsi pengguna; validasi sumber dan masa berlaku wajib. Kegagalan jaringan bukan sinyal beli/jual. Harga publik mungkin tertunda.'};
}
window.PAAX_MARKET_INTEL={loadMarket,render,aiContext,cleanWatchlist,cleanResearch,SOURCES};
})();