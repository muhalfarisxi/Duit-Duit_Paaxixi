/* Goal-specific market references (public evidence, not forecasting).
   IPOs are never inferred from speculative rumors or staging environments. */
(function(){
 'use strict';
 const IPO='https://www.e-ipo.co.id/id';
 const money=n=>'Rp '+Math.max(0,Number(n)||0).toLocaleString('id-ID',{maximumFractionDigits:0});
 const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isHouse=(name,type)=>type==='house'||/\b(rumah|hunian|properti|kpr|dp rumah)\b/i.test(name||'');
 const extractRegion=(name)=>{
  const s=String(name||'');
  if(/\bsragen\b/i.test(s))return 'Sragen';
  const m=s.match(/\b(?:kabupaten|kab\.?|kota|di)\s+([a-z][a-z ]{2,35})/i);
  return m?m[1].replace(/\s+(pertama|impian|baru|sendiri|untuk|tahun)\b.*$/i,'').trim():null;
 };
 const houses={
  Sragen:{
   asOf:'Q4 2026 / ditinjau 4 November 2026',
   markets:[
    {area:'Kabupaten Sragen (cakupan kabupaten)',price:650000000,
     label:'indikasi harga pasaran listing, bukan rata-rata seluruh transaksi',
     url:'https://www.99.co/id/jual/rumah/sragen',source:'99.co'},
    {area:'Kecamatan Sragen / kota',price:378000000,
     label:'harga tengah listing kecamatan (bukan kabupaten keseluruhan)',
     url:'https://www.rumah123.com/jual/sragen/rumah/',source:'Rumah123'},
    {area:'Kecamatan Sragen / kota (pembanding)',price:378000000,
     label:'indikasi harga pasaran listing kecamatan',
     url:'https://www.99.co/id/jual/rumah/sragen/sragen',source:'99.co'}
   ]
  }
 };
 const state={ipoStatus:'belum-ditinjau',ipos:[],checkedAt:null,error:''};
 let request=null;
 async function loadIpo(force=false){
  if(request)return request;
  if(!force&&state.checkedAt&&Date.now()-Date.parse(state.checkedAt)<15*60000)return state;
  request=(async()=>{
   state.ipoStatus='memeriksa';state.error='';const address='https://proxy.cors.dev/'+IPO;
   try{
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),11000);
    let html;
    try{const r=await fetch(address,{cache:'no-store',credentials:'omit',signal:c.signal});
      if(!r.ok)throw Error('HTTP '+r.status);html=await r.text();}
    finally{clearTimeout(timer);}
    const doc=new DOMParser().parseFromString(html,'text/html');
    const found=[];
    for(const node of doc.querySelectorAll('h2,h3,h4,h5,h6')){
     const stage=node.textContent.trim().replace(/\s+/g,' ');
     if(!/^(Offering|Book Building|Waiting For Offering)$/i.test(stage))continue;
     let container=node.parentElement;
     for(let i=0;i<4&&container;i++,container=container.parentElement){
      const text=container.textContent.replace(/\s+/g,' ').trim();
      if(text.length>1100||text.length<22)continue;
      const symbols=[...text.matchAll(/\(([A-Z]{3,6}(?:-[WC]\d?)?)\)/g)];
      if(symbols.length!==1)continue;
      const symbol=symbols[0][1],pos=text.indexOf('('+symbol+')');
      const name=text.slice(0,pos).replace(/^(Offering|Book Building|Waiting For Offering)\s*/i,'').trim();
      if(name.length<5||name.length>110)continue;
      if(!found.some(x=>x.symbol===symbol))found.push({
       symbol,name,status:stage,details:text.slice(pos+symbol.length+2,pos+symbol.length+230)
      });
      break;
     }
    }
    state.ipos=found.slice(0,8);
    state.ipoStatus=found.length?'ditemukan':'tidak-ada-terverifikasi';
   }catch(err){
    state.ipos=[];state.ipoStatus='gagal-verifikasi';
    state.error='Halaman e-IPO belum dapat dibaca otomatis; daftar emiten mendatang tidak akan ditebak.';
   }
   state.checkedAt=new Date().toISOString();
   document.dispatchEvent(new CustomEvent('paax:ipo-updated'));
   return state;
  })().finally(()=>{request=null});
  return request;
 }
 function contextForGoal(name,type,target){
  const region=extractRegion(name);
  const house=isHouse(name,type);
  const snapshot=house&&region&&houses[region]?houses[region]:null;
  return {goalName:String(name||'').slice(0,90),type:type||null,region,property:{
   relevant:house,region,benchmark:snapshot?snapshot.markets.map(x=>({
     area:x.area,observedListingPrice:x.price,scope:x.label,source:x.source,url:x.url
   })):[],
   asOf:snapshot?.asOf||null,
   note:snapshot?'Indikasi harga penawaran listing, bukan median transaksi resmi, tidak otomatis relevan untuk seluruh kecamatan atau tipe rumah. Nominal pada tanggal tujuan dapat berubah.':
    'Tidak ada pembanding harga lokal terverifikasi otomatis untuk wilayah ini; jangan mengarang median, gunakan riset listing aktual yang sejenis.'
  },
  opportunities:verifiedOpportunities({name,type,target}).map(x=>({type:x.kind,name:x.name,status:x.status,estimatedDate:x.eventDate,source:x.source,sourceDate:x.sourceDate,url:x.url,suitability:x.fit,limitations:x.verifiedType})),
  ipo:{status:state.ipoStatus,asOf:state.checkedAt,offerings:state.ipos.map(x=>({
   symbol:x.symbol,name:x.name,status:x.status,
   source:IPO})),source:IPO,
   note:'Hanya IPO resmi dengan tahap aktif yang berhasil dibaca. Situs staging/rumor tidak boleh dijadikan rujukan.'}};
 }
 function renderProperty(name,type,target){
  if(!isHouse(name,type))return '';
  const region=extractRegion(name),snapshot=region?houses[region]:null;
  if(!snapshot)return '<section class="invest-property-market"><div class="invest-property-intro"><span>🏡</span><div><h4>Analisis Lokasi untuk Tujuan Rumah</h4>'+
    '<p>Judul tujuan perlu mencantumkan kota/kabupaten agar harga properti setempat dapat dibandingkan. Data harga wilayah ini belum terverifikasi otomatis.</p></div></div>'+
    '<p>Contoh judul: <strong>Rumah Pertama di Kabupaten Sragen</strong>. Jangan menganggap target harga sama dengan harga rata-rata properti.</p></section>';
  const amount=Number(target)||0;
  const first=snapshot.markets[0],second=snapshot.markets[1];
  return '<section class="invest-property-market"><div class="invest-property-intro"><span>🏡</span><div><h4>Perbandingan Harga Rumah — '+safe(region)+'</h4>'+
   '<p>Indikasi pasar dari iklan properti, bukan estimasi AI tanpa sumber.</p></div><small>'+safe(snapshot.asOf)+'</small></div>'+
   '<div class="invest-property-prices">'+snapshot.markets.map(x=>
     '<a target="_blank" rel="noopener noreferrer" href="'+x.url+'"><small>'+safe(x.area)+'</small>'+
     '<strong>'+money(x.price)+'</strong><span>'+safe(x.source)+' · '+safe(x.label)+' ↗</span></a>').join('')+'</div>'+
   '<p>🎯 Targetmu '+money(amount)+': '+(amount<first.price?'sekitar '+money(first.price-amount)+' di bawah indikasi Kabupaten Sragen; ':'setara atau di atas indikasi kabupaten; ')+
   (amount>=second.price?'lebih tinggi '+money(amount-second.price)+' dari harga tengah listing Kecamatan Sragen.':
   'masih '+money(second.price-amount)+' di bawah indikasi Kecamatan Sragen.')+
   ' Bandingkan rumah dengan lokasi, luas, kondisi, dokumen, dan biaya transaksi yang sama sebelum memutuskan.</p>'+
   '<p>💡 Bila memakai KPR, simulasi DP 20% dari harga rumah target ialah '+money(amount*.2)+
   ' (sekadar contoh, syarat bank dapat berbeda). Biaya notaris, pajak, renovasi, dan perubahan harga sampai tanggal pembelian perlu disiapkan terpisah.</p>'+
   '<small>Harga tercantum dapat berubah dan tidak selalu merepresentasikan transaksi yang benar-benar terjadi.</small></section>';
 }

 /* Only publish named upcoming launches when a dated source supports them.
    Known already-listed funds may be shown as recently available, never pending. */
 const ISSUANCE=[
  {category:'sbn',name:'Sukuk Tabungan ST017',series:'ST017',start:'2026-11-06',end:'2026-12-02',
   source:'BNI — Kalender SBN Ritel 2026 (jadwal tentatif)',
   url:'https://www.bni.co.id/emerald/produk/bonds/informasi-lainnya',
   official:'https://www.kemenkeu.go.id/sbn',type:'Sukuk Tabungan Ritel',
   info:'Jadwal penawaran tentatif. Kupon, tenor, syarat pencairan, serta seri final harus diperiksa melalui dokumen penawaran resmi; ST umumnya tidak diperdagangkan di bursa.'}
 ];
 const RECENT_ETF=[
  {symbol:'XKGS',name:'KIM Gold ETF Sharia',listed:'2026-09-22'},
  {symbol:'XBGS',name:'Batavia Gold Sharia ETF',listed:'2026-09-16'},
  {symbol:'XGLD',name:'Premier ETF Gold Sharia Indonesia',listed:'2026-08-10'}
 ];
 const escDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'tanggal belum tersedia';
  return new Date(value+'T12:00:00Z').toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',year:'numeric'});};
 const todayJakarta=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function horizonMonths(due,now=todayJakarta()){
  if(!/^\d{4}-\d{2}$/.test(due||''))return null;
  return (Number(due.slice(0,4))-Number(now.slice(0,4)))*12+
   (Number(due.slice(5,7))-Number(now.slice(5,7)));
 }
 const dueMonths=(goal)=>{
  if(Number.isFinite(Number(goal?.months))&&goal?.months!==null&&goal?.months!==undefined)return Number(goal.months);
  return horizonMonths(goal?.due);
 };
 const stateName={sbn:'SBN / Sukuk',gold:'Emas',rdpu:'RDPU / Reksa Dana',
  etf:'ETF',ipo:'Saham IPO'};
 function verifiedOpportunities(goal={}){
  const today=todayJakarta(),months=dueMonths(goal);
  const near=months!==null&&months<=36;
  const cards=[];
  for(const x of ISSUANCE){
   if(today>x.end)continue;
   const upcoming=today<x.start,active=today>=x.start;
   cards.push({id:'sbn-'+x.series,kind:'sbn',name:x.name,status:upcoming?'Jadwal mendatang — tentatif':'Dalam rentang jadwal — cek penawaran',
    statusCode:upcoming?'upcoming':'scheduled',eventDate:escDate(x.start)+' – '+escDate(x.end),
    source:x.source,sourceDate:'jadwal 2026, tentatif',url:x.url,official:x.official,
    desc:x.info,fit:near?
    'Untuk tujuan dekat, hanya pertimbangkan jika tenor dan tanggal pencairan benar-benar sebelum dana digunakan.':
    'Periksa tenor dan fasilitas pencairan terhadap jangka waktu tujuan.',
    priority:near?1:1,verifiedType:'Jadwal dari mitra distribusi, bukan konfirmasi penawaran sedang aktif'});
  }
  cards.push({id:'rdpu-scan',kind:'rdpu',name:'Reksa Dana Pasar Uang — pilihan yang sudah tersedia',
    status:'Tersedia untuk dibandingkan',statusCode:'available',
    eventDate:'Peluncuran RDPU baru belum terverifikasi',source:'OJK — data produk reksa dana',
    sourceDate:'produk/kuotasi dapat berubah',url:'https://reksadana.ojk.go.id',
    desc:'Belum ada nama RDPU baru dengan tanggal peluncuran yang terkonfirmasi dalam sumber terhubung. Bandingkan produk yang sudah tersedia lewat NAB terbaru, imbal hasil historis, biaya, portofolio, dan waktu pencairan.',
    fit:near?'Lebih relevan sebagai kandidat likuid untuk dana rumah/nikah yang segera dipakai; nilai tetap dapat berfluktuasi.':
     'Dapat digunakan untuk porsi kas/penyangga, bukan satu-satunya instrumen tujuan panjang.',
    priority:near?2:3,verifiedType:'Kategori tersedia; bukan produk yang diklaim segera terbit'});
  cards.push({id:'gold-watch',kind:'gold',name:'Emas fisik / emas investasi — harga dan spread terbaru',
    status:'Pantau harga, belum ada rilis terkonfirmasi',statusCode:'watch',
    eventDate:'Harga diperbarui berkala oleh penjual, bukan jadwal penerbitan',
    source:'ANTAM Logam Mulia — harga emas harian',
    sourceDate:'harga wajib dibuka ulang pada sumber',url:'https://www.logammulia.com/id/harga-emas-hari-ini',
    desc:'Belum ada produk emas fisik baru dengan jadwal rilis terverifikasi dalam sumber ini. Cek harga beli, buyback, selisih harga, pajak, dan likuiditas; jangan memakai harga lama sebagai penawaran sekarang.',
    fit:near?'Harga bisa turun ketika dana harus dipakai. Jangan menggantungkan DP rumah yang dekat pada kenaikan emas.':
     'Boleh dipertimbangkan sebagai diversifikasi terbatas jika spread dan fluktuasi dapat ditanggung.',
    priority:near?4:2,verifiedType:'Sumber harga, bukan pengumuman produk baru'});
  const recent=RECENT_ETF.filter(x=>x.listed<=today);
  if(recent.length){
   cards.push({id:'etf-gold-new',kind:'etf',name:'ETF Emas yang Baru Tercatat — '+recent.slice(0,2).map(x=>x.symbol).join(' / '),
    status:'Sudah tercatat — bukan upcoming',statusCode:'listed',
    eventDate:recent.slice(0,2).map(x=>x.symbol+' '+escDate(x.listed)).join(' · '),
    source:'BEI — Daftar ETF',sourceDate:'tanggal pencatatan BEI',url:'https://www.idx.id/id/data-pasar/data-exchange-traded-fund-etf/daftar-exchange-traded-fund-etf/',
    desc:'ETF emas '+recent.map(x=>x.symbol).join(', ')+' telah tercatat. Produk baru yang sudah aktif tidak boleh ditampilkan sebagai penawaran mendatang. Cek prospektus, spread bid-ask, volume, dan risiko pergerakan emas.',
    fit:near?'Tidak cocok sebagai tempat utama dana yang wajib tersedia pada tanggal pasti karena harga serta likuiditas dapat berfluktuasi.':
     'Dapat diteliti sebagai diversifikasi emas yang diperdagangkan di bursa.',
    priority:near?5:4,verifiedType:'Tanggal pencatatan historis terkonfirmasi, status perdagangan saat ini perlu dicek'});
  }
  for(const x of state.ipos.slice(0,6)){
   if(!['Offering','Book Building','Waiting For Offering'].includes(x.status))continue;
   cards.push({id:'ipo-'+x.symbol,kind:'ipo',name:x.name+' ('+x.symbol+')',
    status:x.status,statusCode:'scheduled',eventDate:'Tanggal rinci cek prospektus di e-IPO',
    source:'e-IPO resmi',sourceDate:state.checkedAt||'tanggal tidak diketahui',url:IPO,
    desc:'Tahap '+x.status+' berhasil terbaca pada pemeriksaan terakhir. Ini bukan tanda saham pasti menarik; evaluasi prospektus, penjamin emisi, valuasi, dan risiko bisnis.',
    fit:near?'IPO sangat berfluktuasi; jangan menggunakan dana DP rumah atau kebutuhan dekat.':
     'Untuk tujuan panjang pun harus ditimbang dengan kualitas usaha, valuasi, dan konsentrasi portofolio.',
    priority:near?6:6,verifiedType:'Tahap terbaca dari e-IPO, bukan jaminan IPO aktif saat ini'});
  }
  cards.sort((a,b)=>a.priority-b.priority);
  return cards;
 }
 function renderOpportunities(goal={}){
  const stamp=state.checkedAt?new Date(state.checkedAt).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',
   day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' WIB':'belum diperiksa';
  const list=verifiedOpportunities(goal);
  const counts=list.filter(x=>x.statusCode==='upcoming');
  const visual={sbn:'🇮🇩',rdpu:'🌿',gold:'🥇',etf:'🧺',ipo:'📈'};
  return '<div class="invest-opportunities"><div class="invest-opportunities-heading">'+
   '<div><strong>🔭 Peluang Investasi Mendatang & Baru Tersedia</strong>'+
   '<small>SBN / Sukuk · RDPU / Reksa Dana · Emas · ETF · IPO Saham. Pemeriksaan e-IPO: '+safe(stamp)+'</small></div>'+
   '<button type="button" data-paax-ipo-refresh '+(state.ipoStatus==='memeriksa'?'disabled':'')+'>'+
   (state.ipoStatus==='memeriksa'?'⏳ Memeriksa IPO…':'⟳ Perbarui Peluang')+'</button></div>'+
   '<p class="invest-opportunities-context">'+
   (counts.length?'Ada '+counts.length+' jadwal penerbitan SBN mendatang yang tercatat sebagai <strong>tentatif</strong>. ':
    'Belum ada jadwal penerbitan SBN berikutnya yang terverifikasi pada basis data saat ini. ')+
   'Produk yang sudah terbit dibedakan dari pengumuman mendatang; tiap pilihan disesuaikan dengan tenggat tujuan, bukan perintah membeli.</p>'+
   '<div class="invest-opportunities-grid">'+list.map(x=>
    '<article class="invest-opportunity-item invest-opportunity-'+safe(x.statusCode)+'">'+
    '<div class="invest-opportunity-head"><span>'+visual[x.kind]+'</span><div><small>'+safe(stateName[x.kind])+'</small>'+
    '<strong>'+safe(x.name)+'</strong></div></div>'+
    '<div class="invest-opportunity-label">'+safe(x.status)+'</div>'+
    '<p class="invest-opportunity-date">🗓 '+safe(x.eventDate)+'</p>'+
    '<p>'+safe(x.desc)+'</p>'+
    '<p class="invest-opportunity-fit">🎯 '+safe(x.fit)+'</p>'+
    '<div class="invest-opportunity-footer"><small>'+safe(x.source)+' · '+safe(x.sourceDate)+'</small>'+
    '<a href="'+safe(x.url)+'" target="_blank" rel="noopener noreferrer">Lihat sumber ↗</a></div></article>'
   ).join('')+'</div>'+
   '<p class="invest-opportunities-fineprint">'+
   (state.ipoStatus==='gagal-verifikasi'?'⚠ Daftar e-IPO belum berhasil dibaca otomatis; tidak ada nama emiten IPO yang ditebak. ':
    'Status IPO berubah sewaktu-waktu; jadwal prospektus harus diperiksa ulang. ')+
   'Jadwal SBN tentatif bukan konfirmasi pembukaan atau kupon. Harga dan ketersediaan RDPU/emas tidak otomatis realtime.</p>'+
   '</div>';
 }
 /* Keep older references functional while shifting from IPO-only to multi-asset. */
 function renderIPO(){return renderOpportunities({});}
 window.PAAX_OPPORTUNITY={loadIpo,contextForGoal,renderIPO,renderOpportunities,verifiedOpportunities,renderProperty,extractRegion,state};
})();