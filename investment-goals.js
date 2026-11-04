/* Duit-Duit Paaxixi — perencanaan tujuan investasi.
   A deterministic, horizon-aware allocation, not a live product-ranking engine.
   This file never stores financial data or sends portfolio information to quotes. */
(function(){
 'use strict';
 const KINDS={house:'🏡 Rumah',wedding:'💍 Pernikahan',education:'🎓 Pendidikan',
  business:'🏪 Usaha',retirement:'🌿 Pensiun',vehicle:'🚙 Kendaraan',other:'✨ Tujuan Lain'};
 const ASSETS={
  liquid:{name:'Reksa Dana Pasar Uang',icon:'💚',color:'#259b78',note:'Porsi likuid untuk kebutuhan dekat dan dana transit; NAB tetap dapat berfluktuasi'},
  deposit:{name:'Tabungan / Deposito',icon:'🏦',color:'#68b6c9',note:'Pilih bank dan jangka waktu yang sesuai; cek ketentuan penjaminan LPS'},
  government:{name:'SBN Ritel / Sukuk Negara',icon:'🇮🇩',color:'#668bcd',note:'Hanya jika masa penawaran, tenor, dan pencairannya cocok dengan tanggal tujuan'},
  bondfund:{name:'Reksa Dana Pendapatan Tetap',icon:'📘',color:'#788bd7',note:'Harga NAB berfluktuasi karena risiko suku bunga dan kredit'},
  equity:{name:'Reksa Dana Indeks / ETF Saham',icon:'📈',color:'#8a6dd5',note:'Untuk jangka panjang; dapat turun tajam dan perlu disiplin berkala'},
  gold:{name:'Emas Investasi',icon:'🥇',color:'#d4a14c',note:'Diversifikasi; harga dapat naik atau turun dan ada spread jual-beli'}
 };
 const sum=r=>Object.values(r).reduce((a,b)=>a+b,0);
 const money=v=>'Rp'+Math.round(Math.max(0,Number(v)||0)).toLocaleString('id-ID');
 const yearsMonth=(date,now)=>{
  const a=String(date||''),b=String(now||'').slice(0,7);
  if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(a)||a<=b)return 0;
  return (Number(a.slice(0,4))-Number(b.slice(0,4)))*12+Number(a.slice(5,7))-Number(b.slice(5,7));
 };
 const addMonths=(month,months)=>{
  const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));
  const date=new Date(Date.UTC(y,m-1+months,1));
  return date.toISOString().slice(0,7);
 };
 const isoNow=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function weights(months,risk){
  // Time-to-goal overrides risk appetite; avoid equity exposure for short-term needs.
  if(months<=12)return {liquid:80,deposit:20};
  if(months<=24)return {liquid:65,deposit:25,government:10};
  if(months<=36)return {liquid:55,deposit:25,government:20};
  if(months<=60){
   if(risk==='low')return {liquid:45,deposit:25,government:25,bondfund:5};
   return {liquid:35,deposit:15,government:30,bondfund:15,gold:5};
  }
  if(risk==='low')return {liquid:35,deposit:20,government:35,bondfund:10};
  if(months<=96){
   if(risk==='high')return {liquid:15,government:25,bondfund:15,equity:35,gold:10};
   return {liquid:25,government:30,bondfund:20,equity:20,gold:5};
  }
  if(risk==='high')return {liquid:10,government:15,bondfund:15,equity:50,gold:10};
  return {liquid:15,government:25,bondfund:20,equity:30,gold:10};
 }
 function plan(input,asOf=isoNow()){
  const target=Number(input.target),initial=Number(input.initial)||0,contribution=Number(input.monthly)||0;
  const months=yearsMonth(input.due,asOf),risk=['low','medium','high'].includes(input.risk)?input.risk:'medium';
  if(!Number.isFinite(target)||target<=0||target>1e15||!Number.isFinite(initial)||initial<0||initial>1e15||
     !Number.isFinite(contribution)||contribution<0||contribution>1e15||
     !months||months>600)throw Error('Periksa target dana, dana awal, setoran bulanan, dan tenggat (maksimal 50 tahun).');
  const allocation=weights(months,risk),remaining=Math.max(0,target-initial);
  const required=Math.ceil(remaining/months),base=initial+contribution*months;
  const items=Object.entries(allocation).map(([key,percent])=>({
   key,...ASSETS[key],percent,monthly:Math.round(contribution*percent/100),
   targetPortion:Math.round(target*percent/100)
  }));
  if(sum(allocation)!==100)throw Error('Alokasi tidak lengkap.');
  const watch=[
   {title:'Penerbitan SBN / Sukuk berikutnya',detail:'Pantau masa penawaran, kupon, masa penguncian, dan tanggal jatuh tempo di kanal resmi Kemenkeu. Jangan menganggap seri yang belum ditawarkan sudah tersedia.',url:'https://www.kemenkeu.go.id/sbn'},
   {title:'Produk reksa dana resmi',detail:'Bandingkan risiko, prospektus, biaya, dan pembaruan NAB pada kanal resmi OJK/penjual berizin; tidak semua produk cocok untuk targetmu.',url:'https://reksadana.ojk.go.id'},
   {title:'ETF / reksa dana indeks',detail:'Pertimbangkan hanya untuk horizon yang cukup panjang; lakukan pembelian bertahap dan verifikasi ketersediaan di BEI.',url:'https://www.idx.id/id/produk/exchange-traded-fund-etf/'}
  ];
  const monthsLabel=(months>=12?(months/12).toLocaleString('id-ID',{maximumFractionDigits:1})+' tahun':months+' bulan');
  return {months,monthsLabel,risk,target,initial,monthly:contribution,remaining,required,base,
   shortfall:Math.max(0,target-base),surplus:Math.max(0,base-target),
   allocation:items,watch,hasBond:!!allocation.government,hasEquity:!!allocation.equity,
   horizonGroup:months<=36?'Pendek':months<=60?'Menengah':'Panjang',
   note:months<=36?'Prioritaskan menjaga dana agar tersedia tepat waktu. Risiko saham sengaja tidak dimasukkan meski profil risiko tinggi.':
    months<=60?'Utamakan kestabilan dan kecocokan jatuh tempo; investasi berfluktuasi dibatasi.':
    'Pertumbuhan jangka panjang dapat dipertimbangkan, tetapi porsi berisiko harus dikurangi saat tanggal tujuan mendekat.',
   disclaimer:'Alokasi adalah simulasi pendidikan, bukan pilihan produk terbaik yang dijamin. Proyeksi setoran tidak menggunakan asumsi keuntungan agar tidak memberi kepastian palsu.'};
 }

/* Goal popup remains inside the existing rendering lifecycle. */
let goalModalOpen=false,goalModalMode='new',goalLastArgs=null;
const rp=value=>'Rp '+Math.max(0,Math.round(Number(value)||0)).toLocaleString('id-ID');
function rerenderGoalOnly(){
 const el=document.getElementById('invest-goal-planner');
 if(el&&goalLastArgs)el.outerHTML=renderCard(...goalLastArgs);
}
function dismissGoalPopup(){if(!goalModalOpen)return;goalModalOpen=false;rerenderGoalOnly();}
document.addEventListener('click',event=>{
 const openNew=event.target.closest?.('[data-invest-goal-new]');
 const openEdit=event.target.closest?.('[data-invest-goal-edit]');
 const cancel=event.target.closest?.('[data-invest-goal-modal-close]');
 if(cancel||event.target?.id==='invest-goal-modal-backdrop'){
  if(!goalModalOpen)return;
  event.preventDefault();event.stopImmediatePropagation();dismissGoalPopup();return;
 }
 if(openNew||openEdit){
  event.preventDefault();event.stopImmediatePropagation();
  goalModalMode=openEdit?'edit':'new';goalModalOpen=true;rerenderGoalOnly();
  document.querySelector('#invest-goal-form [name="name"]')?.focus({preventScroll:true});
  return;
 }
 if(event.target.closest?.('[data-invest-goal-select],[data-nav]'))goalModalOpen=false;
},true);
document.addEventListener('input',event=>{
 const el=event.target;
 if(!goalModalOpen||!el.matches?.('#invest-goal-form [data-goal-rupiah]'))return;
 const digits=el.value.replace(/[^0-9]/g,'').slice(0,16);
 el.value=digits?'Rp '+Number(digits).toLocaleString('id-ID'):'';
},true);
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.matches?.('#invest-goal-form [name="risk"]'))el.closest('.invest-goal-risk')?.setAttribute('data-risk',el.value);
},true);
document.addEventListener('submit',event=>{
 const form=event.target;if(form?.id!=='invest-goal-form'||!goalModalOpen)return;
 const values={};
 for(const key of ['target','initial','monthly']){
  const field=form.elements[key];
  const raw=String(field?.value||'').replace(/[^0-9]/g,'');
  values[key]=Number(raw||0);
 }
 try{
  plan({...values,due:form.elements.due.value,risk:form.elements.risk.value},isoNow());
 }catch(err){
  event.preventDefault();event.stopImmediatePropagation();
  const warning=form.querySelector('.invest-goal-modal-error');
  if(warning)warning.textContent=String(err?.message||'Nominal tidak valid.');
  return;
 }
 for(const key of Object.keys(values))form.elements[key].value=String(values[key]);
 goalModalOpen=false; // Host handles the actual save and rerender in its submit listener.
},true);
document.addEventListener('keydown',event=>{
 if(!goalModalOpen||event.key!=='Escape')return;
 event.preventDefault();event.stopImmediatePropagation();dismissGoalPopup();
},true);
const goalCSS=document.querySelector('link[href*="investment-goals.css"]');
if(goalCSS)goalCSS.href='./investment-goals.css?v=2';

 function renderCard(goals,currentId,aiState,quoteState,formatMoney,escapeText,asOf=isoNow()){
  goalLastArgs=[goals,currentId,aiState,quoteState,formatMoney,escapeText,asOf];
  const fmt=typeof formatMoney==='function'?formatMoney:money;
  const esc=typeof escapeText==='function'?escapeText:(s=>String(s));
  const all=Array.isArray(goals)?goals:[],chosen=all.find(x=>x.id===currentId)||null;
  const defaults={type:'house',name:'',due:addMonths(asOf.slice(0,7),36),target:0,initial:0,monthly:0,risk:'medium'};
  const editing=goalModalOpen&&goalModalMode==='edit'&&!!chosen;
  const form=goalModalOpen&&goalModalMode==='new'?defaults:(chosen||defaults);
  let report=null,error='';
  if(chosen)try{report=plan(chosen,asOf)}catch(err){error=err.message;}
  const market=quoteState?.value;
  const age=market?.asOf?market.asOf:'';
  const delta=Number(market?.previousClose)>0?(market.price-market.previousClose)/market.previousClose*100:null;
  const benchmark=quoteState?.busy?'Memperbarui data IHSG…':market?
    'IHSG '+Number(market.price).toLocaleString('id-ID',{maximumFractionDigits:2})+
    (delta===null?'':' · '+(delta>=0?'+':'')+delta.toFixed(2).replace('.',',')+'% dari penutupan sebelumnya')+
    ' · data '+age+' WIB':
    'Data IHSG belum berhasil diambil. Alokasi tetap berdasar horizon dan risiko, bukan harga pasar.';
  const count=(s)=>String(s||'').length;
  const selectedLabel=chosen?chosen.name||KINDS[chosen.type]:'';
  const kindOptions=Object.entries(KINDS).map(([id,name])=>'<option value="'+id+'"'+(form.type===id?' selected':'')+'>'+name+'</option>').join('');
  const riskOptions=[['low','Konservatif — lindungi dana'],['medium','Moderat — seimbang'],['high','Agresif — siap fluktuasi']]
   .map(([id,label])=>'<option value="'+id+'"'+(form.risk===id?' selected':'')+'>'+label+'</option>').join('');
  return '<section class="card invest-goal-planner" id="invest-goal-planner" aria-label="Rencana investasi berdasarkan tujuan">'+
    '<div class="invest-goal-head"><div class="invest-goal-heading"><span aria-hidden="true">🎯</span><div><h3>Rencana Investasi Berdasarkan Tujuan</h3>'+
    '<p>Hitung alokasi yang masuk akal untuk rumah, nikah, pendidikan, dan target lainnya.</p></div></div>'+
    '<span class="invest-goal-flag">✨ Rencana & AI</span></div>'+
    '<div class="invest-goal-market"><div><strong>📊 Kondisi Pasar</strong><span>'+esc(benchmark)+'</span>'+
    '<small>Yahoo Finance (data publik dapat tertunda). IHSG hanya konteks, bukan sinyal beli/jual atau harga produk.</small></div>'+
    '<button type="button" data-invest-goal-market '+(quoteState?.busy?'disabled':'')+'>⟳ Cek Pasar</button></div>'+
    '<div class="invest-goal-tabs" role="group" aria-label="Pilih tujuan investasi">'+
    all.map(g=>'<button type="button" data-invest-goal-select="'+esc(g.id)+'" aria-pressed="'+(g.id===currentId)+'" class="'+(g.id===currentId?'active':'')+'">'+
       esc((KINDS[g.type]||KINDS.other).split(' ')[0])+' '+esc(g.name||'Rencana')+'</button>').join('')+
    '<button type="button" class="invest-goal-new" data-invest-goal-new>＋ Rencana Baru</button>'+ 
    (chosen?'<button type="button" class="invest-goal-edit" data-invest-goal-edit>✎ Edit Rencana</button>':'')+'</div>'+
    (goalModalOpen?'<div class="invest-goal-modal-backdrop" id="invest-goal-modal-backdrop"><section class="invest-goal-modal" role="dialog" aria-modal="true" aria-labelledby="invest-goal-modal-title">'+
     '<div class="invest-goal-modal-head"><span class="invest-goal-modal-emoji">🌱</span><div><small>✦ WUJUDKAN IMPIANMU</small>'+
     '<h3 id="invest-goal-modal-title">'+(editing?'Edit Rencana Investasi':'Tambah Rencana Investasi Baru')+'</h3>'+
     '<p>Atur kebutuhan dana dan jangka waktu; Paaxixi akan menghitung komposisi investasimu.</p></div>'+
     '<button type="button" data-invest-goal-modal-close aria-label="Tutup formulir">✕</button></div>'+
    '<form id="invest-goal-form" class="invest-goal-form invest-goal-modal-form"><p class="invest-goal-modal-error" role="alert"></p><input name="editId" type="hidden" value="'+esc(editing?chosen.id:'')+'">'+
    '<label class="invest-goal-field invest-goal-field-use">Tujuan Penggunaan<select class="field" name="type">'+kindOptions+'</select></label>'+
    '<label class="invest-goal-field invest-goal-field-name">Nama Tujuan<input class="field" name="name" maxlength="70" value="'+esc(form.name||'')+'" placeholder="Contoh: DP Rumah Pertama" required></label>'+
    '<label class="invest-goal-field invest-goal-field-date">Bulan Target<input class="field" type="month" name="due" min="'+esc(addMonths(asOf.slice(0,7),1))+'" max="'+esc(addMonths(asOf.slice(0,7),600))+'" value="'+esc(form.due)+'" required></label>'+
    '<label class="invest-goal-field invest-goal-field-target">🎯 Target Dana<input class="field" data-goal-rupiah="1" type="text" inputmode="numeric" name="target" value="'+(form.target?rp(form.target):'')+'" placeholder="Rp 200.000.000" required></label>'+
    '<label class="invest-goal-field invest-goal-field-initial">🌿 Dana Awal Tujuan Ini<input class="field" data-goal-rupiah="1" type="text" inputmode="numeric" name="initial" value="'+rp(form.initial)+'" required></label>'+
    '<label class="invest-goal-field invest-goal-field-monthly">💝 Rencana Setoran Bulanan<input class="field" data-goal-rupiah="1" type="text" inputmode="numeric" name="monthly" value="'+rp(form.monthly)+'" required></label>'+
    '<label class="invest-goal-risk invest-goal-field" data-risk="'+esc(form.risk)+'">⚖️ Toleransi Risiko<select class="field" name="risk">'+riskOptions+'</select></label>'+
    '<div class="invest-goal-form-actions"><button class="invest-goal-save" type="submit">'+(editing?'✓ Perbarui Rencana':'✦ Simpan & Hitung Rekomendasi')+'</button>'+
    '<button type="button" class="invest-goal-cancel" data-invest-goal-modal-close>Batal</button>'+'</div>'+
    '</form>'+    '<p class="invest-goal-modal-footnote">✨ Data tersimpan sebagai angka rupiah; pemisah ribuan hanya untuk memudahkan pengetikan. Risiko investasi dapat berubah.</p>'+
    '</section></div>':'')+
    (!all.length?'<div class="invest-goal-placeholder"><span>🌱</span><p>Mulai dengan tombol Rencana Baru untuk menghitung alokasi dan memantau peluang investasi berikutnya.</p></div>':'')+
    (error?'<p class="invest-goal-error" role="alert">'+esc(error)+'</p>':'')+
    (report?'<div class="invest-goal-outcome"><div class="invest-goal-outcome-head"><div><small>🧭 REKOMENDASI UNTUK '+esc(selectedLabel)+'</small>'+
      '<h4>Alokasi Berdasarkan '+esc(report.monthsLabel)+' · Profil '+esc(report.risk==='low'?'Konservatif':report.risk==='high'?'Agresif':'Moderat')+'</h4>'+
      '<p>'+esc(report.note)+'</p></div><span>'+esc(report.horizonGroup)+'</span></div>'+
      '<div class="invest-goal-metrics"><div><small>Target Dana</small><strong>'+fmt(report.target)+'</strong></div>'+
      '<div><small>Setoran Minimum / Bulan*</small><strong>'+fmt(report.required)+'</strong></div>'+
      '<div><small>Rencana Dana Terkumpul*</small><strong>'+fmt(report.base)+'</strong></div>'+
      '<div class="'+(report.shortfall>0?'invest-goal-shortfall':'invest-goal-meets')+'"><small>'+(report.shortfall>0?'Kekurangan Target*':'Sisa Setelah Target*')+'</small><strong>'+fmt(report.shortfall||report.surplus)+'</strong></div></div>'+
      (window.PAAX_OPPORTUNITY?.renderProperty(chosen.name,chosen.type,report.target)||'')+
      '<div class="invest-goal-allocation-head"><h4>Komposisi Alokasi yang Disarankan</h4><small>Total 100% · bukan instruksi beli otomatis</small></div>'+
      '<div class="invest-goal-stack">'+report.allocation.map(x=>'<span style="width:'+x.percent+'%;background:'+x.color+'" title="'+esc(x.name)+' '+x.percent+'%"></span>').join('')+'</div>'+
      '<div class="invest-goal-allocations">'+report.allocation.map(x=>'<div class="invest-goal-asset"><span class="invest-goal-asset-icon" style="background:'+x.color+'22">'+x.icon+'</span>'+
        '<div><strong>'+esc(x.name)+'</strong><small>'+esc(x.note)+'</small></div><b>'+x.percent+'%<small>'+fmt(x.monthly)+'/bulan</small></b></div>').join('')+'</div>'+
      '<div class="invest-goal-watch invest-goal-watch-multitype"><div class="invest-goal-watch-icon">🔭</div><div><h4>Peluang Investasi Mendatang yang Sesuai Tujuan</h4>'+
      '<p>Berisi jadwal <strong>SBN / sukuk</strong>, riset <strong>RDPU / reksa dana</strong>, perkembangan <strong>emas</strong> dan <strong>ETF</strong>, serta <strong>IPO saham</strong> bila sudah diumumkan resmi. Peluang disusun menurut tenggat rencana ini; <strong>tidak harus membeli sekarang</strong>.</p>'+
      (window.PAAX_OPPORTUNITY?.renderOpportunities({name:chosen.name,type:chosen.type,due:chosen.due,months:report.months,target:report.target})||'<p>Menyiapkan kalender peluang investasi…</p>')+
      '</div></div>'+
      '<div class="invest-goal-ai"><div class="invest-goal-ai-intro"><span>🧠</span><div><strong>Analisis AI untuk '+esc(selectedLabel)+'</strong>'+
      '<small>Gemini mengulas tujuan, kebutuhan lokal, kondisi arus kas, portofolio, serta peluang SBN, RDPU, emas, ETF, dan IPO yang terverifikasi. Tidak semua peluang harus dibeli.</small></div>'+
      '<button type="button" data-invest-goal-ai '+(aiState?.busy?'disabled':'')+'>'+(aiState?.busy?'⏳ Menganalisis…':aiState?.result?'↻ Analisis Ulang':'✨ Jelaskan dengan AI')+'</button></div>'+
      (aiState?.error?'<div class="invest-goal-ai-error" role="alert">'+esc(aiState.error)+'</div>':'')+
      (aiState?.result?'<div class="invest-goal-ai-content"><h4>'+esc(aiState.result.headline)+'</h4><p>'+esc(aiState.result.summary)+'</p>'+
       ['findings','checks','actions'].map((key,i)=>'<section><h5>'+['🔍 Pertimbangan Utama','⏳ Kondisi & Alasan Menunggu','🧭 Langkah Nyata'][i]+'</h5>'+
       (aiState.result[key]||[]).map(item=>'<p><strong>'+esc(item.label)+':</strong> '+esc(item.text)+'</p>').join('')+'</section>').join('')+
       '<small>Model '+esc(aiState.result.modelName||'Gemini')+' · penjelasan AI dapat keliru, periksa sumber resmi.</small></div>':'')+
      (!aiState?.result?'<p class="invest-goal-ai-local">💡 '+esc(report.months<=36?'Fokus pada likuiditas dan kepastian waktu penggunaan dana.':
        'Mulai dari produk yang mudah dipahami. Untuk bagian yang belum ada produk cocok, menunggu lebih baik daripada terburu-buru.')+'</p>':'')+
      '<p class="invest-goal-ai-privacy">AI membaca ringkasan agregat saldo, arus kas, utang-piutang, serta posisi investasi (termasuk kode instrumen publik) untuk memberi analisis tujuan. Nama rekening, identitas peminjam, dan transaksi mentah tidak dikirim. Butuh Firebase AI Logic aktif; hasil dapat keliru.</p></div>'+
      '<p class="invest-goal-disclaimer">*Hitungan setoran tanpa asumsi keuntungan, tidak memasukkan pajak, biaya, atau inflasi. Target diisi sebagai kebutuhan nominal saat jatuh tempo. Reksa dana, obligasi, emas, dan saham tetap memiliki risiko. Siapkan dana darurat terpisah.</p></div>':'')+
      '</section>';
 }

const opportunityScript=document.createElement('script');
opportunityScript.src='./investment-opportunities.js?v=2';
opportunityScript.onload=()=>{
 if(!goalModalOpen)rerenderGoalOnly();
 void window.PAAX_OPPORTUNITY?.loadIpo();
};
document.head.appendChild(opportunityScript);
document.addEventListener('paax:ipo-updated',()=>{if(!goalModalOpen)rerenderGoalOnly();});
document.addEventListener('click',event=>{
 if(!event.target.closest?.('[data-nav="investments"]'))return;
 setTimeout(()=>{void window.PAAX_OPPORTUNITY?.loadIpo();},150);
},true);
document.addEventListener('click',event=>{
 if(!event.target.closest?.('[data-paax-ipo-refresh]'))return;
 event.preventDefault();event.stopImmediatePropagation();
 void window.PAAX_OPPORTUNITY?.loadIpo(true);
},true);
const opportunityCss=document.createElement('link');
opportunityCss.rel='stylesheet';opportunityCss.href='./investment-opportunities.css?v=2';
document.head.appendChild(opportunityCss);

 window.PAAX_INVEST_GOALS={KINDS,ASSETS,plan,renderCard,addMonths};
})();