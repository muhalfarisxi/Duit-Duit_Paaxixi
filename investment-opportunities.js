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
 function renderIPO(){
  const stamp=state.checkedAt?new Date(state.checkedAt).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'})+' WIB':'belum diperiksa';
  return '<div class="invest-ipo-live"><div class="invest-ipo-head"><div><strong>📣 Kalender IPO Terverifikasi</strong>'+
   '<small>Sumber: e-IPO BEI · pemeriksaan '+safe(stamp)+'</small></div>'+
   '<button type="button" data-paax-ipo-refresh '+(state.ipoStatus==='memeriksa'?'disabled':'')+'>'+
   (state.ipoStatus==='memeriksa'?'⏳ Memeriksa':'⟳ Cek Terbaru')+'</button></div>'+
   (state.ipos.length?'<div class="invest-ipo-issuers">'+state.ipos.map(item=>
    '<div><strong>'+safe(item.symbol)+'</strong><span>'+safe(item.name)+'</span>'+
    '<small>'+safe(item.status)+' · '+safe(item.details)+'</small></div>').join('')+'</div>':
    '<p>'+safe(state.ipoStatus==='tidak-ada-terverifikasi'?'Tidak ditemukan IPO bertahap aktif pada halaman resmi yang berhasil dibaca saat pengecekan ini. Itu tidak menjamin tidak ada pengumuman baru.':
    state.ipoStatus==='gagal-verifikasi'?state.error:
    'Belum ada emiten baru yang dapat ditampilkan secara terverifikasi; data akan diperiksa dari e-IPO.')+'</p>')+
   '<a target="_blank" rel="noopener noreferrer" href="'+IPO+'">Buka penawaran dan prospektus e-IPO resmi ↗</a>'+
   '<small>IPO bukan otomatis investasi aman; prospektus, risiko emiten, harga penawaran, dan jadwal perlu dibaca.</small></div>';
 }
 window.PAAX_OPPORTUNITY={loadIpo,contextForGoal,renderIPO,renderProperty,extractRegion,state};
})();