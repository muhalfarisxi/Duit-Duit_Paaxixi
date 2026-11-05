/* Safe 96-month demo launcher. Data changes only after explicit confirmation. */
(function(){
'use strict';
const KEY='arus-prototype-v1',BACKUP='arus-cadangan-sebelum-demo';
const API=()=>window.PAAX_COMPREHENSIVE_DEMO;
const n=x=>Number(x||0).toLocaleString('id-ID');
const dayWib=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let fixture=null,stats=null,busy=false;
function report(msg,isError=false){
 const el=document.getElementById('paax-demo-message');
 if(el){el.textContent=msg;el.classList.toggle('error',isError);}
}
function showToast(msg){
 const toast=document.getElementById('toast');
 if(toast){toast.textContent=msg;toast.className='toast show bad';setTimeout(()=>toast.className='toast',5000);}
}
function close(){
 if(busy)return;
 document.getElementById('paax-demo-overlay')?.remove();
 fixture=null;stats=null;
 document.querySelector('[data-action="demo"]')?.focus({preventScroll:true});
}
function download(){
 const original=localStorage.getItem(KEY);
 if(!original)return report('Tidak ditemukan data yang dapat diunduh.',true);
 try{
  const blob=new Blob([JSON.stringify(JSON.parse(original),null,2)],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download='paaxixi-cadangan-sebelum-simulasi-'+dayWib()+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
  report('✓ Cadangan JSON berhasil disiapkan untuk disimpan di perangkat.');
 }catch(e){report('Gagal membuat cadangan: '+String(e?.message||e),true);}
}
function show(){
 if(document.getElementById('paax-demo-overlay'))return;
 try{
  fixture=API().build({asOf:dayWib(),months:96});
  stats=API().validate(fixture,dayWib());
  if(JSON.stringify(fixture).length>2.9*1024*1024)throw Error('Ukuran simulasi melampaui batas yang aman.');
 }catch(e){showToast('Simulasi gagal disiapkan: '+String(e?.message||e));return;}
 const hasExisting=!!localStorage.getItem(KEY);
 const tags=['Pemasukan & pengeluaran','Transfer antar rekening','Anggaran draft & terkunci',
  'Pos belum dianggarkan','Anggaran melewati batas','Alihkan anggaran','Tambah/kurangi anggaran',
  'Koreksi anggaran awal','Koreksi saldo','Utang/piutang lunas & cicilan',
  'Lewat jatuh tempo & H-7','Saham dalam lot','Emas, SBN & RDPU','Reksa dana, ETF & kripto',
  'Beli/jual & dividen','Trendline bulanan/tahunan','Tujuan rumah, nikah & pensiun',
  'Arsip laporan dan PDF','Uji Insight AI','Periode bulan berjalan sebagian'];
 const cards=[['🧾 Transaksi',n(stats.transactions)],['🏦 Rekening',n(stats.accounts)],
  ['🎯 Anggaran Pos',n(stats.budgets)],['🤝 Utang/Piutang',n(fixture.debts.length)],
  ['📈 Aset Investasi',n(stats.assets)],['🗃️ Arsip',n(stats.archives)]];
 const html=[
  '<div class="paax-demo-overlay" id="paax-demo-overlay">',
  '<section class="paax-demo-dialog" role="dialog" aria-modal="true" aria-labelledby="paax-demo-title">',
  '<header class="paax-demo-head"><span>🧪</span><div><small>✦ LABORATORIUM DUIT-DUIT PAAXIXI</small>',
  '<h2 id="paax-demo-title">Simulasi Keuangan 8 Tahun</h2>',
  '<p>Data fiktif untuk menguji berbagai fasilitas website.</p></div>',
  '<button type="button" data-paax-demo-cancel aria-label="Tutup">✕</button></header>',
  '<div class="paax-demo-body">',
  '<div class="paax-demo-period"><strong>📅 '+fixture.simulationMeta.first+' — '+fixture.simulationMeta.last+'</strong>',
  '<span>96 bulan · transaksi sampai '+fixture.simulationMeta.asOf+' WIB</span></div>',
  '<div class="paax-demo-stats">'+cards.map(x=>'<div><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join('')+'</div>',
  '<div class="paax-demo-coverage"><h3>Contoh skenario pengujian</h3>',
  '<div class="paax-demo-tags">'+tags.map(t=>'<span>✓ '+t+'</span>').join('')+'</div>',
  '<p>Berisi bulan defisit, pemasukan tak rutin, biaya darurat, target jangka panjang, serta harga investasi historis <strong>buatan</strong>. Tidak ada data riil.</p></div>',
  '<div class="paax-demo-warning"><strong>⚠ Mengganti semua data lokal</strong><p>',
  hasExisting?'Data browser saat ini akan diganti. Unduh cadangan JSON jika ingin memulihkan data asli nanti.':
   'Simulasi akan menjadi data aktif browser hingga dipulihkan.',
  ' Sebelum mengganti, sistem akan mencoba menyimpan cadangan lama di browser. Saat cloud aktif simulasi dinonaktifkan.</p></div>',
  '<p id="paax-demo-message" role="status" aria-live="polite"></p></div>',
  '<footer class="paax-demo-actions">',
  '<button type="button" class="paax-demo-backup" data-paax-demo-backup '+(hasExisting?'':'disabled')+'>↓ Unduh Cadangan</button>',
  '<button type="button" class="paax-demo-cancel" data-paax-demo-cancel>Batal</button>',
  '<button type="button" class="paax-demo-generate" data-paax-demo-generate>✦ Muat Simulasi Lengkap</button>',
  '</footer></section></div>'
 ].join('');
 document.body.insertAdjacentHTML('beforeend',html);
 document.querySelector('[data-paax-demo-cancel]')?.focus({preventScroll:true});
}
function load(){
 if(!fixture||busy)return;
 busy=true;
 const button=document.querySelector('[data-paax-demo-generate]');
 if(button){button.disabled=true;button.textContent='⏳ Menyimpan Simulasi…';}
 try{
  const raw=localStorage.getItem(KEY);
  let previous=null;
  try{previous=raw?JSON.parse(raw):null;}catch(_){}
  const alreadySim=previous?.simulationMeta?.fictional||
   (previous?.transactions?.length>20&&previous.transactions.filter(t=>/simulasi/i.test(t.note||'')).length>previous.transactions.length*.85);
  // Never overwrite the original real backup with a regenerated simulation.
  if(raw&&(!alreadySim||!localStorage.getItem(BACKUP))){
   try{localStorage.setItem(BACKUP,raw);}
   catch(_){throw Error('Penyimpanan cadangan tidak cukup. Unduh cadangan JSON dan kosongkan ruang browser sebelum melanjutkan.');}
  }
  API().validate(fixture,dayWib());
  const encoded=JSON.stringify(fixture);
  localStorage.setItem(KEY,encoded);
  sessionStorage.setItem('paax-demo-loaded','🧪 Simulasi fiktif 96 bulan dimuat. Gunakan filter Tahun atau Atur Rentang untuk menguji grafik.');
  location.reload();
 }catch(e){
  report('Gagal memuat: '+String(e?.message||e),true);busy=false;
  if(button){button.disabled=false;button.textContent='✦ Muat Simulasi Lengkap';}
 }
}
document.addEventListener('click',event=>{
 const trigger=event.target.closest?.('[data-action="demo"]');
 if(trigger&&!trigger.disabled){
  event.preventDefault();event.stopImmediatePropagation();show();return;
 }
 const overlay=document.getElementById('paax-demo-overlay');
 if(!overlay)return;
 if(event.target===overlay||event.target.closest?.('[data-paax-demo-cancel]')){
  event.preventDefault();event.stopImmediatePropagation();close();return;
 }
 if(event.target.closest?.('[data-paax-demo-backup]')){
  event.preventDefault();event.stopImmediatePropagation();download();return;
 }
 if(event.target.closest?.('[data-paax-demo-generate]')){
  event.preventDefault();event.stopImmediatePropagation();load();return;
 }
},true);
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||!document.getElementById('paax-demo-overlay'))return;
 event.preventDefault();event.stopImmediatePropagation();close();
},true);
const postMessage=sessionStorage.getItem('paax-demo-loaded');
if(postMessage){
 sessionStorage.removeItem('paax-demo-loaded');
 setTimeout(()=>{
  const el=document.getElementById('toast');
  if(el){el.textContent=postMessage;el.className='toast show';
   setTimeout(()=>el.className='toast',6500);}
 },500);
}
})();