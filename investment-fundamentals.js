/* Investment fundamentals from publicly accessible sources.
   Only available, dated figures are shown. No user entry, login, or false rankings. */
(function(){
'use strict';
const number=v=>{if(v===null||v===undefined||v===''||v==='-')return null;const x=Number(String(v).replace(/,/g,'').replace(/%/g,''));return Number.isFinite(x)?x:null;};
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url='https://www.screener.id/fundamental-screener';
const searchStock=s=>String(s||'').trim().toUpperCase().replace(/\.JK$/,'');
const VALID=/^[A-Z0-9]{3,7}$/;
const scores={records:[],loading:false,checkedAt:null,error:'',source:'',sourceDate:'',requestKey:''};
const fromYahoo=(raw,code)=>{
 const d=raw?.quoteSummary?.result?.[0];if(!d)return null;
 const pick=x=>number(typeof x==='object'&&x!==null?x.raw:x);
 const stats=d.defaultKeyStatistics||{},summary=d.summaryDetail||{},financial=d.financialData||{};
 return {symbol:code,name:code,per:pick(summary.trailingPE)||pick(stats.trailingPE),
  pbv:pick(stats.priceToBook),roe:pick(financial.returnOnEquity)!==null?
   pick(financial.returnOnEquity)*100:null,
  dividendYield:pick(summary.dividendYield)!==null?pick(summary.dividendYield)*100:null,
  source:'Yahoo Finance quoteSummary (publik)',sourceDate:new Date().toISOString().slice(0,10)};
};
function parseScreener(html,symbols){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const visible=doc.querySelector('main')?.textContent||doc.body?.textContent||'';
 const mention=visible.match(/Data keystats per\s*([0-9]{1,2}\s+[A-Za-z]{3,10}\s+20[0-9]{2}\s+[0-9]{2}:[0-9]{2})/i);
 const stamp=mention?.[1]||'waktu rasio tidak terdeteksi';
 const result=new Map();
 for(const table of doc.querySelectorAll('table')){
  const header=Array.from(table.querySelectorAll('thead th')).map(t=>t.textContent.trim().toLowerCase());
  const looksLike=header.some(x=>x==='pbv'||x==='pb')&&header.some(x=>x==='pe'||x==='per'||x.includes('p/e'));
  if(!looksLike)continue;
  const find=keys=>header.findIndex(x=>keys.includes(x));
  const idxSymbol=find(['kode','code','ticker','symbol']);
  const idxName=find(['nama','name']);
  const idxPer=find(['pe','per','p/e']);
  const idxPbv=find(['pbv','pb','p/b']);
  const idxRoe=find(['roe%','roe']);
  const idxDiv=header.findIndex(x=>x.includes('div')&&x.includes('yield'));
  for(const row of table.querySelectorAll('tbody tr')){
   const cells=Array.from(row.querySelectorAll('td'));
   const val=i=>i>=0&&cells[i]?cells[i].textContent.trim():'';
   const code=searchStock(val(idxSymbol).match(/\b[A-Z0-9]{3,7}\b/)?.[0]);
   if(!symbols.includes(code)||result.has(code))continue;
   const entry={symbol:code,name:val(idxName)||code,per:number(val(idxPer)),
    pbv:number(val(idxPbv)),roe:number(val(idxRoe)),dividendYield:number(val(idxDiv)),
    source:'IDX Screener — fundamental publik',sourceDate:stamp};
   if([entry.per,entry.pbv,entry.roe,entry.dividendYield].some(x=>x!==null))result.set(code,entry);
  }
 }
 return [...result.values()];
}
async function fetchUrl(address,ms=12000){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(address,{credentials:'omit',signal:c.signal,cache:'no-store'});
  if(!r.ok)throw Error('Sumber merespons '+r.status);return r;}
 finally{clearTimeout(t);}
}
async function getFundamentals(symbols){
 const clean=[...new Set((symbols||[]).map(searchStock).filter(x=>VALID.test(x)))].slice(0,8);
 if(!clean.length){scores.records=[];scores.requestKey='';scores.loading=false;return;}
 const key=clean.slice().sort().join(',');
 if(scores.loading||scores.requestKey===key&&Date.now()-Date.parse(scores.checkedAt||0)<20*60000)return;
 scores.loading=true;scores.requestKey=key;scores.error='';
 const next=new Map();
 try{
  for(const address of [url,'https://proxy.cors.dev/'+url]){
   try{
    const html=await (await fetchUrl(address)).text();
    const rows=parseScreener(html,clean);
    if(rows.length){rows.forEach(x=>next.set(x.symbol,x));break;}
   }catch(_){}
  }
  // Yahoo is a fallback and may reject unauthenticated requests.
  const missing=clean.filter(x=>!next.has(x));
  await Promise.all(missing.map(async code=>{
   try{
    const target='https://query1.finance.yahoo.com/v10/finance/quoteSummary/'+encodeURIComponent(code+'.JK')+
     '?modules=defaultKeyStatistics,summaryDetail,financialData';
    const data=await (await fetchUrl('https://proxy.cors.dev/'+target,9500)).json();
    const row=fromYahoo(data,code);
    if(row&&[row.per,row.pbv,row.roe,row.dividendYield].some(x=>x!==null))next.set(code,row);
   }catch(_){}
  }));
 }catch(e){scores.error=String(e?.message||e).slice(0,135);}
 finally{
  scores.records=clean.map(symbol=>next.get(symbol)||{symbol,name:symbol,per:null,pbv:null,roe:null,
   dividendYield:null,source:'Tidak tersedia dari sumber publik',sourceDate:null});
  scores.checkedAt=new Date().toISOString();scores.loading=false;
  if(next.size===0)scores.error='Rasio otomatis belum dapat diakses (CORS, kuota, atau sumber tidak memuat data). Tidak ada angka yang diisi dengan perkiraan.';
  document.dispatchEvent(new CustomEvent('paax:fundamentals-updated'));
 }
}
function assess(r){
 const available=[r.per,r.pbv,r.roe,r.dividendYield].filter(x=>x!==null).length;
 if(available<2)return {grade:'Data Belum Cukup',tone:'neutral',
  reason:'Minimal dua indikator fundamental diperlukan untuk ulasan yang masuk akal. Harga bergerak saja bukan bukti kualitas emiten.'};
 const flags=[],good=[];
 if(r.per!==null){if(r.per<=0)flags.push('PER nonpositif menandakan laba per saham negatif/tidak bermakna untuk valuasi biasa');
  else if(r.per>35)flags.push('PER tinggi relatif terhadap laba; periksa ekspektasi pertumbuhan');
  else if(r.per>=3&&r.per<=18)good.push('PER berada pada tingkat yang layak diperbandingkan dengan rekan sektornya');}
 if(r.pbv!==null){if(r.pbv>5)flags.push('PBV tinggi; bandingkan dengan ROE dan bisnis sejenis');
  else if(r.pbv<1)good.push('PBV di bawah 1x, tetapi bisa mencerminkan masalah fundamental');}
 if(r.roe!==null){if(r.roe<0)flags.push('ROE negatif: perusahaan sedang mencatat kerugian atau modal bermasalah');
  else if(r.roe<7)flags.push('ROE rendah; efisiensi modal perlu diteliti');
  else if(r.roe>=15)good.push('ROE cukup kuat pada data yang tersedia');}
 if(r.dividendYield!==null&&r.dividendYield>12)flags.push('Yield dividen sangat tinggi; pastikan keberlanjutannya dan tidak hanya dividen khusus');
 const risky=flags.some(x=>/negatif|tinggi|rendah/.test(x));
 const grade=risky?'Perlu Kehati-hatian':good.length>=2&&available>=3?'Menarik untuk Diteliti':'Perlu Kajian Lanjutan';
 return {grade,tone:risky?'danger':good.length>=2&&available>=3?'positive':'neutral',
  reason:(flags.length?flags.slice(0,2):good.slice(0,2)).join('. ')+'. '+
   'Rasio harus dibandingkan dengan sektor, tren laba, utang, dan laporan keuangan; bukan sinyal beli otomatis.'};
}
function render(symbols){
 const clean=[...new Set((symbols||[]).map(searchStock).filter(x=>VALID.test(x)))].slice(0,8);
 if(!clean.length)return '';
 const rows=clean.map(code=>scores.records.find(x=>x.symbol===code)||
  {symbol:code,name:code,per:null,pbv:null,roe:null,dividendYield:null,source:'Belum diambil'});
 const fmt=(v,suffix='')=>v===null||v===undefined?'—':v.toLocaleString('id-ID',{maximumFractionDigits:2})+suffix;
 return '<section class="invest-auto-fundamentals" aria-label="Evaluasi fundamental otomatis saham pantauan">'+
  '<div class="invest-fundamental-head"><div><small>🧠 PENILAIAN SAHAM PANTAUAN</small><h4>Fundamental & Alasan Penilaiannya</h4>'+
  '<p>PER, PBV, ROE, dividen dan pembacaan risiko otomatis, tanpa input manual.</p></div>'+
  '<button type="button" data-invest-fundamental-refresh '+(scores.loading?'disabled':'')+'>'+
   (scores.loading?'⏳ Memeriksa…':'⟳ Perbarui Rasio')+'</button></div>'+
  (scores.error?'<p class="invest-fundamental-warning">'+h(scores.error)+'</p>':'')+
  '<div class="invest-fundamental-list">'+rows.map(r=>{
   const review=assess(r);
   return '<article class="invest-fundamental-stock"><div class="invest-fundamental-stock-head"><div><strong>'+h(r.symbol)+'</strong>'+
    '<span>'+h(r.name!==r.symbol?r.name:'Emiten BEI')+'</span></div><b class="invest-grade '+review.tone+'">'+h(review.grade)+'</b></div>'+
    '<div class="invest-ratio-grid">'+[['PER',r.per,'x'],['PBV',r.pbv,'x'],['ROE',r.roe,'%'],['Yield',r.dividendYield,'%']]
     .map(([name,v,unit])=>'<div><small>'+name+'</small><strong>'+fmt(v,unit)+'</strong></div>').join('')+'</div>'+
    '<p class="invest-fundamental-why">'+h(review.reason)+'</p>'+
    '<small class="invest-fundamental-source">Sumber: '+h(r.source)+' · '+h(r.sourceDate||'tanggal tidak tersedia')+
    ' · harga / rasio dapat tertunda</small></article>';
  }).join('')+'</div>'+
  '<p class="invest-fundamental-disclaimer">Tidak ada label “pasti bagus”. Ini penyaringan awal dari rasio yang tersedia, bukan analisis auditor atau rekomendasi jual/beli. Sumber bisa dibatasi akses; jika gagal, rasio tetap kosong.</p></section>';
}
window.PAAX_FUNDAMENTALS={getFundamentals,render,assess,parseScreener,state:scores};
})();