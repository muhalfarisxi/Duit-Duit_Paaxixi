/* Paaxixi IHSG chart and conservative Indonesia investment-market signals.
   No generated quote data; strategies are general educational risk controls. */
(function(){
'use strict';
const number=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('id-ID',{maximumFractionDigits:2});
const sign=n=>n===null?'—':(n>0?'+':'')+n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const pct=(a,b)=>number(b)>0?(Number(a)-Number(b))/Number(b)*100:null;
const trend=(index)=>pct(index?.price,index?.previousClose);
function tone(index){
 const v=trend(index);
 return v===null?'unknown':v>0?'up':v<0?'down':'flat';
}
function formatDate(ms){
 return new Date(ms).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric'});
}
function validSeries(index){
 return (Array.isArray(index?.series)?index.series:[]).map(p=>({time:Number(p.time),price:Number(p.price)}))
  .filter(p=>Number.isFinite(p.time)&&p.time>0&&Number.isFinite(p.price)&&p.price>0)
  .sort((a,b)=>a.time-b.time).slice(-260);
}
function graph(index){
 const series=validSeries(index),status=tone(index);
 if(series.length<2)return '<div class="invest-ihsg-empty">📉 Grafik belum tersedia dari penyedia harga. Nilai indeks tetap ditampilkan jika ada.</div>';
 const width=720,height=180,padX=6,padY=18;
 const min=Math.min(...series.map(p=>p.price)),max=Math.max(...series.map(p=>p.price));
 const span=Math.max(1,max-min),diff=Math.max(1,series.length-1);
 const coords=series.map((p,i)=>({x:padX+(width-padX*2)*i/diff,
  y:padY+(height-padY*2)*(max-p.price)/span}));
 const line=coords.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
 const area=line+' L '+coords.at(-1).x.toFixed(2)+' '+height+' L '+coords[0].x.toFixed(2)+' '+height+' Z';
 const last=coords.at(-1),ticks=series.length<=40?series:series.filter((_,i)=>i%Math.ceil(series.length/40)===0);
 const gradient=status==='down'?'ihsg-red':status==='up'?'ihsg-green':'ihsg-gray';
 const stroke=status==='down'?'#d45e68':status==='up'?'#249c6d':'#7195b9';
 const changeWindow=pct(series.at(-1).price,series[0].price);
 const first=series[0],end=series.at(-1);
 return '<div class="invest-ihsg-chart" role="img" aria-label="Perkembangan IHSG '+esc(formatDate(first.time))+
  ' sampai '+esc(formatDate(end.time))+', dari '+fmt(first.price)+' menjadi '+fmt(end.price)+' poin">'+
  '<div class="invest-ihsg-chart-meta"><span>Awal '+fmt(first.price)+'</span>'+
  '<strong class="'+(changeWindow===null?'':changeWindow>=0?'up':'down')+'">'+sign(changeWindow)+' selama periode</strong>'+
  '<span>Akhir '+fmt(end.price)+'</span></div>'+
  '<svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" aria-hidden="true">'+
  '<defs><linearGradient id="'+gradient+'" x1="0" x2="0" y1="0" y2="1">'+
  '<stop offset="0" stop-color="'+stroke+'" stop-opacity=".26"/>'+
  '<stop offset="1" stop-color="'+stroke+'" stop-opacity=".005"/></linearGradient></defs>'+
  [0.22,0.5,0.78].map(t=>'<line x1="0" x2="'+width+'" y1="'+(height*t).toFixed(1)+'" y2="'+(height*t).toFixed(1)+
    '" stroke="currentColor" stroke-opacity=".1" stroke-dasharray="4 7"/>').join('')+
  '<path d="'+area+'" fill="url(#'+gradient+')"/>'+
  '<path d="'+line+'" fill="none" stroke="'+stroke+'" stroke-width="3.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>'+
  '<circle cx="'+last.x.toFixed(1)+'" cy="'+last.y.toFixed(1)+'" r="5.2" fill="'+stroke+'" stroke="#fff" stroke-width="2.8" vector-effect="non-scaling-stroke"/>'+
  ticks.map(t=>{const i=series.indexOf(t),p=coords[i];
   return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="7.5" opacity="0"><title>'+esc(formatDate(t.time))+': '+fmt(t.price)+' poin</title></circle>';
  }).join('')+'</svg><div class="invest-ihsg-time-labels"><span>'+esc(formatDate(first.time))+'</span>'+
  '<span>'+esc(formatDate(end.time))+'</span></div></div>';
}
function chartCard(index,period='month',busy=false){
 const change=trend(index),status=tone(index),isRecent=!!index?.timestamp&&
  Date.now()-Date.parse(index.timestamp)<7*86400000;
 const buttons=[['month','1 Bulan'],['quarter','3 Bulan'],['year','1 Tahun'],['fiveyear','5 Tahun']];
 return '<div class="invest-ihsg-panel invest-ihsg-'+status+'">'+
  '<div class="invest-intel-blockhead"><h4>📊 IHSG</h4><small>Indeks utama BEI · sumber publik</small></div>'+
  (index?'<strong class="invest-intel-index">'+fmt(index.price)+'</strong>'+
   '<span class="invest-intel-delta '+status+'">'+sign(change)+' dibanding penutupan sebelumnya</span>'+
   '<small class="invest-ihsg-date">Harga bertanggal '+esc(index.asOf||'waktu tidak tersedia')+
   (isRecent?'':' · ⚠ data mungkin tidak mutakhir')+'</small>':
   '<p class="invest-intel-empty">Harga IHSG belum tersedia. Coba perbarui atau cek BEI.</p>')+
  '<div class="invest-ihsg-modes" role="group" aria-label="Pilih rentang waktu grafik IHSG">'+
  buttons.map(([key,label])=>'<button type="button" data-market-index-period="'+key+
  '" aria-pressed="'+(period===key)+'" class="'+(period===key?'active':'')+'" '+(busy?'disabled':'')+'>'+label+'</button>').join('')+
  '</div>'+graph(index)+'</div>';
}
function marketCondition(data){
 const index=data?.index;
 const delta=trend(index);
 const recent=!!index?.timestamp&&Date.now()-Date.parse(index.timestamp)<7*86400000;
 const points=validSeries(index);
 const window=points.length>=2?pct(points.at(-1).price,points[0].price):null;
 let stance='Tunggu data pasar yang cukup',toneValue='neutral',icon='🔎';
 let headline='Prioritaskan keamanan rencana, bukan mengejar harga';
 let summary='Data IHSG yang valid belum tersedia atau sudah terlalu lama. Jangan jadikan kondisi pasar yang tidak terverifikasi sebagai dasar membeli instrumen berisiko.';
 let actions=[
  ['Dana dekat dipakai','Tempatkan pada tabungan atau produk pasar uang berisiko rendah yang likuid; tetap verifikasi biaya dan risiko.'],
  ['Cari data tepercaya','Periksa pergerakan terbaru di BEI dan data inflasi/suku bunga BI sebelum mengevaluasi imbal hasil produk.'],
  ['Pantau peluang berikutnya','Jika produk SBN ritel atau ETF belum cocok/tersedia, tidak perlu terburu-buru membeli.']
 ];
 if(recent&&delta!==null){
  if(delta<=-2){
   stance='Defensif · Pantau Sebelum Beli';toneValue='down';icon='🛡️';
   headline='IHSG melemah cukup tajam; jangan bereaksi impulsif';
   summary='IHSG '+sign(delta)+' dari penutupan sebelumnya'+(window!==null?' dan '+sign(window)+' pada rentang grafik':'')+
    '. Ini mencerminkan tekanan indeks, bukan bukti seluruh saham akan turun atau waktunya membeli.';
   actions=[
    ['Jaga likuiditas','Untuk tujuan di bawah 3 tahun, utamakan tabungan dan reksa dana pasar uang sesuai profil risiko.'],
    ['Hindari all-in','Untuk tujuan jangka panjang, evaluasi diversifikasi dan pembelian berkala setelah cadangan kas aman; jangan menebak titik terendah.'],
    ['Tunggu konfirmasi','Verifikasi tren beberapa sesi, valuasi, serta berita resmi sebelum menambah risiko saham/ETF.']
   ];
  }else if(delta<0){
   stance='Waspada · Beli Bertahap';toneValue='down';icon='🌦️';
   headline='IHSG melemah, perlu menjaga disiplin risiko';
   summary='IHSG '+sign(delta)+' dari penutupan sebelumnya. Penurunan harian sendiri tidak cukup untuk menyimpulkan investasi tertentu murah.';
   actions=[
    ['Lindungi kebutuhan dekat','Pisahkan dana yang akan dipakai dalam 1–3 tahun ke instrumen likuid, bukan saham berfluktuasi.'],
    ['Masuk secara bertahap','Bila horizon panjang dan arus kas memadai, pertimbangkan diversifikasi berkala, bukan mengejar harga harian.'],
    ['Pemeriksaan wajib','Bandingkan valuasi, biaya, dan risiko produk dari sumber resmi sebelum eksekusi.']
   ];
  }else if(delta>=2){
   stance='Disiplin · Hindari FOMO';toneValue='up';icon='🌤️';
   headline='IHSG menguat tajam; jangan mengejar kenaikan';
   summary='IHSG '+sign(delta)+' dari penutupan sebelumnya. Kenaikan besar bukan jaminan tren berlanjut atau semua instrumen cocok.';
   actions=[
    ['Kebutuhan pendek tetap aman','Gunakan dana likuid untuk target dekat; tidak perlu mengejar saham ketika pasar naik.'],
    ['Hindari FOMO','Jika memilih saham/ETF jangka panjang, pakai alokasi target dan pembelian berkala yang bisa ditanggung.'],
    ['Periksa risiko','Cek valuasi, konsentrasi portofolio, dan biaya transaksi sebelum tambah posisi.']
   ];
  }else{
   stance='Seimbang · Pilih Sesuai Tujuan';toneValue=delta>0?'up':'neutral';icon='🌱';
   headline='IHSG relatif stabil; seleksi instrumen lebih penting';
   summary='IHSG '+sign(delta)+' dari penutupan sebelumnya'+(window!==null?' dan '+sign(window)+' pada rentang grafik':'')+
   '. Belum cukup untuk merekomendasikan saham tertentu.';
   actions=[
    ['Jangka pendek','Pisahkan dana tujuan dekat dalam tabungan atau reksa dana pasar uang sesuai likuiditas.'],
    ['Jangka menengah','Pantau SBN ritel/sukuk yang jatuh temponya tepat; jangan membeli seri yang belum diverifikasi.'],
    ['Jangka panjang','Diversifikasi investasi bertahap dan evaluasi berkala tanpa menebak waktu masuk pasar.']
   ];
  }
 }
 return {stance,tone:toneValue,icon,headline,summary,actions,change:delta,
  asOf:index?.timestamp||null,
  checkedAt:data?.loadedAt||null,verifiedLive:false,
  scope:'Sinyal terbatas dari IHSG; bukan analisis lengkap suku bunga, SBN, semua saham atau seluruh pasar Indonesia.'};
}
function analysisCard(data={},busy=false){
 const out=marketCondition(data);
 const status=out.tone==='down'?'bear':out.tone==='up'?'bull':'wait';
 return '<section class="invest-market-advice invest-market-advice-'+status+'" aria-label="Analisis otomatis investasi Indonesia">'+
  '<div class="invest-market-advice-head"><div><span class="invest-market-advice-eyebrow">✨ ANALISIS PASAR INDONESIA</span>'+
  '<h4>'+out.icon+' '+esc(out.stance)+'</h4></div><span class="invest-market-advice-tag">'+(busy?'⏳ Menyegarkan…':'🧭 Strategi Konservatif')+'</span></div>'+
  '<h3>'+esc(out.headline)+'</h3><p>'+esc(out.summary)+'</p>'+
  '<div class="invest-market-advice-actions">'+out.actions.map(([name,detail],i)=>
    '<div><span class="invest-market-advice-no">0'+(i+1)+'</span><div><strong>'+esc(name)+'</strong><p>'+esc(detail)+'</p></div></div>').join('')+'</div>'+
  '<footer><span>🕒 '+(out.asOf?'Data IHSG: '+esc(new Date(out.asOf).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}))+' WIB':
   'Belum ada harga IHSG yang dapat diverifikasi')+'</span>'+
  '<span>Rekomendasi otomatis diperbarui saat sumber data berhasil diambil; bukan sinyal trading atau feed real-time resmi BEI.</span>'+
  '<a href="https://www.idx.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/" target="_blank" rel="noopener noreferrer">Verifikasi di BEI ↗</a></footer></section>';
}
window.PAAX_MARKET_INSIGHT={chartCard,analysisCard,marketCondition,validSeries};
})();