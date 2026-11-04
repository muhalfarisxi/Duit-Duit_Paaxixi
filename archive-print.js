/* Duit-Duit Paaxixi — Laporan resmi Times New Roman.
   Browser Print/Save PDF uses the user's installed Times New Roman,
   with archived and export timestamps captured separately in WIB. */
(function(){
 'use strict';
 const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const n=x=>Number(x)||0;
 const rup=x=>'Rp '+Math.round(n(x)).toLocaleString('id-ID');
 const numeric=x=>Math.round(n(x)).toLocaleString('id-ID');
 const month=x=>{
  if(!/^\d{4}-\d{2}$/.test(String(x||'')))return 'Periode tidak tercatat';
  const [year,m]=x.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(year,m-1,1));
 };
 const date=x=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x||'')))return E(x||'Tanggal tidak tercatat');
  const [y,m,d]=x.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d));
 };
 const fullTime=x=>{
  if(!x)return 'Tidak tercatat pada arsip lama';
  const t=new Date(x);
  if(!Number.isFinite(t.getTime()))return 'Tidak tercatat pada arsip lama';
  return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(t).replace(/\./g,':')+' WIB';
 };
 const safeColor=x=>/^#[0-9a-f]{6}$/i.test(String(x||''))?x:'#507ca5';
 const sums=(xs,key)=>xs.reduce((a,x)=>a+n(x[key]),0);
 const table=(headers,rows,classes='')=>
  '<table class="formal-table '+classes+'"><thead><tr>'+headers.map(h=>'<th>'+E(h)+'</th>').join('')+'</tr></thead><tbody>'+
  (rows.length?rows.map(row=>'<tr>'+row.map((x,i)=>'<td class="'+(i===0?'primary-col':'')+'">'+x+'</td>').join('')+'</tr>').join(''):
  '<tr><td colspan="'+headers.length+'" class="formal-empty">Belum ada data tercatat.</td></tr>')+
  '</tbody></table>';
 const moneyCell=x=>'<strong class="money">'+E(rup(x))+'</strong>';
 function expenseGroups(r){
  const map=new Map();
  (r.expenseBreakdown||[]).forEach(pos=>{
   const value=n(pos.spent),group=pos.group||'Lainnya';
   if(value>0)map.set(group,(map.get(group)||0)+value);
  });
  const palette=['#31588c','#a98142','#1d806f','#98724e','#617b9c','#b66a79','#8b7ea8'];
  return [...map].sort((a,b)=>b[1]-a[1]).map(([name,value],i)=>({name,value,color:safeColor(r.groupColors?.[name]||palette[i%palette.length])}));
 }
 function donut(r){
  const groups=expenseGroups(r),all=sums(groups,'value');
  if(!all)return '<div class="formal-muted">Belum ada pengeluaran yang tercatat.</div>';
  const C=2*Math.PI*74;
  let p=0;
  const circles=groups.map(g=>{
   const ratio=g.value/all,stroke=C*ratio;
   const c='<circle cx="115" cy="115" r="74" fill="none" stroke="'+E(g.color)+'" stroke-width="29" '+
    'stroke-dasharray="'+stroke.toFixed(4)+' '+(C-stroke).toFixed(4)+'" stroke-dashoffset="'+(-p).toFixed(4)+'" transform="rotate(-90 115 115)"/>';
   p+=stroke;
   return c;
  }).join('');
  return '<div class="formal-chart-pair"><svg viewBox="0 0 230 230" aria-label="Komposisi Pengeluaran" class="formal-donut">'+
   '<circle cx="115" cy="115" r="74" fill="none" stroke="#e8edf2" stroke-width="29"/>'+circles+
   '<text x="115" y="107" text-anchor="middle" font-size="12" fill="#586575">Total Pengeluaran</text>'+
   '<text x="115" y="127" text-anchor="middle" font-size="15" font-weight="bold" fill="#152d46">'+E(rup(r.expense))+'</text></svg>'+
   '<div class="formal-donut-legend">'+groups.map(g=>
    '<div class="formal-donut-item"><span><i style="background:'+g.color+'"></i>'+E(g.name)+'</span><strong>'+E(rup(g.value))+'</strong><small>'+(g.value/all*100).toFixed(1).replace('.',',')+'%</small></div>'
    ).join('')+'</div></div>';
 }
 function chart(r){
  const data=(r.trends||[]).slice(-6);
  if(!data.length)return '<p class="formal-muted">Belum tersedia tren keuangan.</p>';
  const W=750,H=282,box={l:69,r:28,t:49,b:37},pW=W-box.l-box.r,pH=H-box.t-box.b;
  const top=Math.max(1,...data.flatMap(v=>[n(v.income),n(v.expense)]))*1.16;
  const X=i=>box.l+(data.length===1?pW/2:i*pW/(data.length-1));
  const Y=v=>box.t+pH-n(v)/top*pH;
  const grid=[0,.25,.5,.75,1].map(v=>'<line x1="'+box.l+'" x2="'+(W-box.r)+'" y1="'+Y(top*v)+'" y2="'+Y(top*v)+'" stroke="#dfe6ef" stroke-dasharray="4 4"/>'+
   '<text x="'+(box.l-8)+'" y="'+(Y(top*v)+4)+'" text-anchor="end" fill="#5a697a" font-size="11">'+E(Math.round(top*v/1e6*10)/10+' jt')+'</text>').join('');
  const lines=[['income','#1b806c','Pemasukan',-17],['expense','#b45a67','Pengeluaran',22]].map(([key,color,name,offset])=>{
   const pts=data.map((v,i)=>[X(i),Y(v[key]),n(v[key])]);
   const poly='<polyline points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
   return poly+pts.map(([x,y,val])=>'<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="'+color+'" stroke="#fff" stroke-width="1.5"/>'+
    '<text text-anchor="middle" x="'+x+'" y="'+Math.max(14,Math.min(H-39,y+offset))+'" fill="'+color+'" font-size="10.5" font-weight="bold">'+E(rup(val))+'</text>').join('');
  }).join('');
  return '<svg class="formal-trend" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Grafik tren bulanan pemasukan dan pengeluaran">'+
   grid+lines+data.map((v,i)=>'<text x="'+X(i)+'" y="'+(H-12)+'" text-anchor="middle" font-size="11" fill="#334d67">'+E(String(v.month||'').slice(5)+'/'+String(v.month||'').slice(2,4))+'</text>').join('')+'</svg>'+
   '<div class="formal-chart-legend"><span><i style="background:#1b806c"></i> Pemasukan</span><span><i style="background:#b45a67"></i> Pengeluaran</span></div>';
 }
 function kpi(label,value,color){
  return '<div class="formal-kpi"><span>'+E(label)+'</span><strong style="color:'+color+'">'+(value===null?'Belum tercatat':E(rup(value)))+'</strong></div>';
 }
 function summary(r){
  return '<section class="formal-page"><div class="formal-cover">'+
   '<div class="formal-kicker">LAPORAN KEUANGAN PRIBADI</div>'+
   '<h1>ARSIP LAPORAN KEUANGAN BULANAN</h1>'+
   '<div class="formal-cover-period">'+E(month(r.month))+'</div>'+
   '<div class="formal-cover-caption">Duit-Duit Paaxixi · Dokumen Arsip Keuangan</div>'+
   '<div class="formal-rule"></div>'+
   '<table class="formal-metadata"><tr><th>Periode Laporan</th><td>'+E(month(r.month))+'</td></tr>'+
   '<tr><th>Tanggal Diarsipkan</th><td><strong>'+E(fullTime(r.createdAt))+'</strong></td></tr>'+
   '<tr><th>Tanggal Dicetak / Diunduh</th><td><strong>'+E(fullTime(r.exportTime))+'</strong></td></tr>'+
   '<tr><th>Jenis Dokumen</th><td>Salinan arsip bulanan (snapshot)</td></tr></table>'+
   '<p class="formal-archive-note">Laporan menggambarkan data saat arsip disimpan. Perubahan catatan setelah pengarsipan tidak mengubah dokumen ini tanpa pembaruan arsip.</p></div>'+
   '<h2 class="formal-heading">I. Ringkasan Keuangan</h2>'+
   '<div class="formal-kpi-grid">'+kpi('Total Pemasukan',r.income,'#1b806c')+kpi('Total Pengeluaran',r.expense,'#b45a67')+
   kpi('Nilai Investasi',r.investment?.unavailable?null:r.investment?.market,'#365e86')+
   kpi('Saldo Rekening',sums(r.balances||[],'balance'),'#365e86')+'</div>'+
   '<div class="formal-net"><span>Arus Kas Bersih</span><strong>'+E(rup(r.net))+'</strong></div>'+
   '<p class="formal-explain">Arus kas bersih merupakan selisih pemasukan dan pengeluaran; pemindahan dana antarrekening tidak dihitung sebagai pemasukan atau pengeluaran baru.</p>'+
   '<h2 class="formal-heading">II. Komposisi Pengeluaran</h2>'+donut(r)+'</section>';
 }
 function analysis(r){
  const ai=r.aiInsight||null;
  const label=ai?.source==='gemini'?'Analisis AI Gemini Saat Pengarsipan':'Analisis Keuangan Otomatis';
  const notes=[...(ai?.findings||[]),...(ai?.checks||[]),...(ai?.actions||[])].slice(0,9);
  return '<section class="formal-page formal-break-before"><h2 class="formal-heading">III. Tren Keuangan Enam Bulan</h2>'+
   '<p class="formal-text">Perbandingan pemasukan dan pengeluaran bulanan sebelum dan termasuk bulan pelaporan.</p>'+
   chart(r)+'<h2 class="formal-heading">IV. Analisis dan Rekomendasi</h2>'+
   '<div class="formal-analysis"><div class="formal-analysis-label">'+E(label)+'</div>'+
   '<h3>'+E(ai?.headline||'Ringkasan kondisi keuangan')+'</h3>'+
   '<p>'+E(ai?.summary||'Analisis AI belum tersedia pada arsip ini. Gunakan total dan komposisi yang tercatat untuk menilai kondisi keuangan.')+'</p>'+
   (notes.length?'<ol>'+notes.map(x=>'<li><strong>'+E(x.label||'Catatan')+':</strong> '+E(x.text||'')+'</li>').join('')+'</ol>':'')+
   '</div>'+
   '<p class="formal-source">Catatan: analisis mengikuti data yang tersedia ketika arsip dibuat; periksa kembali transaksi yang mungkin belum dicatat.</p></section>';
 }
 function accounts(r){
  const balances=r.balances||[],assets=r.investment?.assets||[];
  const ledger=r.debtLedger||r.debts||[];
  const summary=r.debtSummary||{};
  return '<section class="formal-page formal-break-before"><h2 class="formal-heading">V. Rekening dan Investasi</h2>'+
   '<h3 class="formal-subheading">A. Saldo Rekening Akhir Bulan</h3>'+
   table(['Nama Rekening','Jenis','Saldo Akhir'],balances.map(a=>[E(a.name),E(a.type),moneyCell(a.balance)]))+
   '<div class="formal-table-total"><span>Jumlah Saldo Rekening</span><strong>'+E(rup(sums(balances,'balance')))+'</strong></div>'+
   '<h3 class="formal-subheading">B. Portofolio Investasi</h3>'+
   (r.investment?.unavailable?'<p class="formal-muted">Nilai investasi belum direkam pada arsip lama.</p>':
    table(['Nama Aset','Jenis','Nilai Portofolio'],assets.map(a=>[E(a.name),E(a.type),moneyCell(a.market)]))+
    '<div class="formal-table-total"><span>Jumlah Nilai Investasi</span><strong>'+E(rup(r.investment?.market))+'</strong></div>')+
   '<h2 class="formal-heading">VI. Utang dan Piutang</h2>'+
   '<div class="formal-kpi-grid two">'+kpi('Total Utang Belum Lunas',summary.payable??sums(ledger.filter(x=>x.type==='payable'),'remaining'),'#a34a57')+
   kpi('Total Piutang Belum Kembali',summary.receivable??sums(ledger.filter(x=>x.type==='receivable'),'remaining'),'#1b806c')+'</div>'+
   table(['Jenis / Pihak','Tanggal / Jatuh Tempo','Pokok Awal','Cicilan Bulan Ini','Sisa Akhir Bulan'],
    ledger.map(d=>[
     '<strong>'+E(d.type==='payable'?'Utang':'Piutang')+'</strong> · '+E(d.person),
     E(date(d.date))+(d.dueDate?'<br><small>Jatuh tempo: '+E(date(d.dueDate))+'</small>':''),
     d.original==null?'-':moneyCell(d.original),
     d.paidInMonth==null?'-':moneyCell(d.paidInMonth),
     moneyCell(d.remaining)
    ]),'debt-table')+
   (r.debtSummary?'<div class="formal-debt-summary"><span>Utang Baru: <strong>'+E(rup(summary.payableNew))+'</strong></span>'+
   '<span>Cicilan Utang: <strong>'+E(rup(summary.payablePaid))+'</strong></span>'+
   '<span>Piutang Baru: <strong>'+E(rup(summary.receivableNew))+'</strong></span>'+
   '<span>Piutang Kembali: <strong>'+E(rup(summary.receivablePaid))+'</strong></span></div>':'')+
   '<h3 class="formal-subheading">Riwayat Pembayaran pada Bulan Laporan</h3>'+
   table(['Tanggal','Jenis','Pihak','Nominal'],
    ledger.flatMap(d=>(d.payments||[]).map(p=>[E(date(p.date)),E(d.type==='payable'?'Pembayaran Utang':'Penerimaan Piutang'),E(d.person),moneyCell(p.amount)]))
     .sort((a,b)=>a[0].localeCompare(b[0],'id')))+
   '</section>';
 }
 function budgets(r){
  const rows=(r.expenseBreakdown||[]).filter(x=>n(x.budget)||n(x.spent));
  return '<section class="formal-page formal-break-before"><h2 class="formal-heading">VII. Anggaran dan Realisasi Pengeluaran</h2>'+
   table(['Kelompok','Pos','Anggaran Efektif','Realisasi','Sisa / Kelebihan'],
    rows.map(x=>[E(x.group),E(x.label),moneyCell(x.budget),moneyCell(x.spent),
     '<strong class="'+(n(x.budget)-n(x.spent)<0?'neg':'')+'">'+E(rup(n(x.budget)-n(x.spent)))+'</strong>']))+
   '<p class="formal-source">Anggaran efektif merupakan alokasi sesudah penambahan, pengurangan, dan pengalihan yang tercatat pada periode bersangkutan.</p></section>';
 }
 function appendix(r){
  const entries=(r.transactions||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.title||'').localeCompare(String(b.title||''),'id'));
  const days=new Map();
  for(const x of entries){
   const key=x.date||'Tanggal tidak tercatat';
   if(!days.has(key))days.set(key,[]);
   days.get(key).push(x);
  }
  const content=[...days].map(([d,list])=>'<div class="formal-date-section"><div class="formal-date-heading">Tanggal '+E(date(d))+
   '<span>'+list.length+' transaksi</span></div>'+
   table(['Kelompok','Pos','Komoditas / Keterangan','Keluar (Rp)','Masuk (Rp)'],
    list.map(t=>[
     E(t.type==='transfer'?'Mutasi':t.group||'Lainnya'),
     E(t.type==='transfer'?'Antarrekening':t.categoryLabel||'-'),
     '<strong>'+E(t.title||'Tanpa keterangan')+'</strong>'+(t.note?'<br><small>'+E(t.note)+'</small>':''),
     t.type==='expense'?E(numeric(t.amount)):'-',
     t.type==='income'?E(numeric(t.amount)):'-'
    ]),'transaction-table')+'</div>').join('');
  return '<section class="formal-page formal-break-before"><h2 class="formal-heading">Lampiran: Daftar Transaksi per Tanggal</h2>'+
   '<p class="formal-text">Lampiran ini memuat '+entries.length+' transaksi yang tercatat pada periode '+E(month(r.month))+'. Pengeluaran dan pemasukan ditampilkan terpisah dalam nominal rupiah penuh.</p>'+
   (content||'<p class="formal-muted">Tidak ada transaksi tercatat pada bulan ini.</p>')+
   '<div class="formal-appendix-final">Jumlah Pemasukan: <strong>'+E(rup(r.income))+'</strong> · Jumlah Pengeluaran: <strong>'+E(rup(r.expense))+'</strong></div></section>';
 }
 function documentHtml(r){
  const title='Duit-Duit Paaxixi - Arsip '+month(r.month)+' - '+fullTime(r.exportTime);
  return '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+E(title)+'</title>'+
  '<style>'+
  '@page{size:A4;margin:17mm 15mm 18mm}*{box-sizing:border-box}html{background:#d8e0eb}body{margin:0;color:#14243a;font-family:"Times New Roman",Times,serif;font-size:11.5pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
  '.formal-document{width:210mm;min-height:297mm;margin:28px auto 50px;padding:17mm 15mm 18mm;background:#fff;box-shadow:0 12px 40px #142b4830}'+
  '.formal-page{min-width:0}.formal-break-before{break-before:page;page-break-before:always;padding-top:6mm}.formal-cover{text-align:center;margin-bottom:14mm}.formal-kicker{font-size:10pt;font-weight:700;letter-spacing:1.8px;color:#54687e;margin-bottom:14px}.formal-cover h1{font-size:20pt;font-weight:700;color:#132d4b;margin:0 auto 9px;max-width:162mm;line-height:1.3}.formal-cover-period{font-size:16.5pt;font-weight:700;color:#a2763a}.formal-cover-caption{color:#68768a;font-size:10.5pt;margin:6px 0 13px}.formal-rule{width:100%;border-top:2px solid #23486e;border-bottom:1px solid #c6a36d;height:5px;margin:15px auto 17px}'+
  '.formal-metadata{border-collapse:collapse;text-align:left;margin:auto;width:100%;font-size:10pt}.formal-metadata th{width:37%;padding:5px 12px;background:#eff3f7;color:#2a435d;vertical-align:top}.formal-metadata td{padding:5px 12px;border-bottom:1px solid #e2e7ee}.formal-archive-note{font-size:9.5pt;color:#48596c;background:#f5f7fa;border-left:3px solid #ba945b;padding:8px 11px;text-align:left;margin:13px 0 0}'+
  '.formal-heading{font-size:14pt;color:#16375a;font-weight:700;margin:17px 0 10px;border-bottom:1.5px solid #aebed0;padding-bottom:5px;break-after:avoid}.formal-subheading{font-size:11.5pt;color:#1e4267;margin:12px 0 6px;break-after:avoid}.formal-text,.formal-explain,.formal-source{color:#596777;font-size:9.5pt;margin:9px 0}.formal-source{font-style:italic}.formal-muted{color:#768292;font-style:italic;padding:14px;background:#f8f9fb}'+
  '.formal-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.formal-kpi-grid.two{margin-bottom:12px}.formal-kpi{border:1px solid #dbe3ed;border-left:3px solid #8fa9c7;padding:8px 12px;background:#f9fbfd;min-width:0}.formal-kpi span{display:block;font-size:9.5pt;color:#536476}.formal-kpi strong{display:block;margin-top:3px;font-size:14pt;font-weight:700;white-space:nowrap}.formal-net{margin:10px 0;background:#edf3f8;border-top:1px solid #c0d1e1;border-bottom:1px solid #c0d1e1;padding:9px 13px;display:flex;justify-content:space-between;align-items:center}.formal-net span{font-weight:700}.formal-net strong{font-size:15pt;color:#153c61}'+
  '.formal-chart-pair{display:flex;align-items:center;gap:18px;break-inside:avoid}.formal-donut{display:block;flex:none;width:205px;max-width:43%;height:auto}.formal-donut-legend{flex:1;min-width:0}.formal-donut-item{display:grid;grid-template-columns:minmax(0,1fr) auto 44px;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #e5eaf0;font-size:9pt}.formal-donut-item span{display:flex;gap:7px;align-items:center;min-width:0;overflow-wrap:anywhere}.formal-donut-item span i,.formal-chart-legend i{width:10px;height:10px;display:inline-block;flex:none;border-radius:50%}.formal-donut-item strong{color:#2b4057;white-space:nowrap}.formal-donut-item small{color:#526c86;font-size:8pt;text-align:right}.formal-trend{width:100%;height:auto;display:block;margin-top:10px}.formal-chart-legend{display:flex;justify-content:center;gap:28px;font-size:9pt;margin:6px 0 15px}'+
  '.formal-analysis{border:1px solid #dce4ed;background:#f8fafc;border-left:3px solid #a78250;padding:13px 15px}.formal-analysis-label{font-variant:small-caps;font-weight:bold;color:#6f5634;letter-spacing:.7px}.formal-analysis h3{font-size:12.5pt;margin:6px 0;color:#16395c}.formal-analysis p{margin:7px 0 9px}.formal-analysis ol{margin:7px 0 0;padding-left:19px}.formal-analysis li{margin:6px 0}'+
  '.formal-table{width:100%;border-collapse:collapse;font-size:9.3pt;table-layout:fixed}.formal-table thead{display:table-header-group}.formal-table th{text-align:left;padding:7px;background:#eaf0f6;color:#223c59;border-top:1.2px solid #8da5bb;border-bottom:1px solid #91a9c0;vertical-align:bottom}.formal-table td{padding:6px 7px;border-bottom:1px solid #e0e6ee;vertical-align:top;overflow-wrap:anywhere}.formal-table tr:nth-child(even) td{background:#f9fbfd}.formal-table tr{break-inside:avoid;page-break-inside:avoid}.formal-table .primary-col{font-weight:700;color:#1d3f60}.formal-table .money{font-weight:700;white-space:nowrap}.formal-table .formal-empty{font-style:italic;text-align:center;color:#67798c}.formal-table small{font-size:8pt;color:#637286}.formal-table .neg{color:#a34a57}.formal-table-total{display:flex;justify-content:space-between;padding:9px 10px;background:#f1f5f8;border-bottom:1px solid #c1d1df;font-size:10pt}.formal-debt-summary{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.formal-debt-summary span{padding:7px 10px;background:#f4f7fa;font-size:9pt}.formal-date-section{margin:16px 0;break-inside:auto}.formal-date-heading{display:flex;justify-content:space-between;align-items:center;font-size:11pt;font-weight:700;color:#1d4166;border-bottom:1px solid #bed0df;background:#eef3f8;padding:7px 9px;break-after:avoid}.formal-date-heading span{font-size:8.5pt;color:#698097;font-weight:400}.formal-appendix-final{padding:12px;background:#edf3f8;margin-top:20px;text-align:right;font-size:10pt;font-weight:700}'+
  '.formal-running-footer{position:fixed;bottom:-12mm;left:0;right:0;font-size:8pt;color:#6b798a;border-top:1px solid #b8c8da;padding:3mm 0 0;text-align:center;background:#fff}.formal-screen-toolbar{position:sticky;top:0;z-index:99;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 24px;background:#123456;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 7px 20px #112d5040}.formal-screen-toolbar button{border:0;background:#f8f1e4;color:#173657;padding:10px 18px;border-radius:10px;cursor:pointer;font:700 13px system-ui,sans-serif}.formal-screen-toolbar p{margin:0;font:500 12px system-ui,sans-serif;color:#e6eaf0}'+
  '@media print{html{background:#fff}body{background:#fff}.formal-document{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}.formal-screen-toolbar{display:none!important}.formal-break-before{break-before:page;page-break-before:always}.formal-chart-pair,.formal-analysis,.formal-net,.formal-kpi{break-inside:avoid}}'+
  '@media(max-width:700px){.formal-document{width:100%;margin:0 auto;padding:16px}.formal-screen-toolbar{display:block}.formal-screen-toolbar button{margin-top:8px}.formal-chart-pair{gap:8px}.formal-donut{width:145px}.formal-donut-item{grid-template-columns:1fr auto;gap:4px}.formal-donut-item small{grid-column:2}.formal-kpi strong{font-size:11pt}}'+
  '</style></head><body>'+
  '<div class="formal-screen-toolbar"><div><strong>Pratinjau Laporan PDF · Times New Roman</strong><p>Pilih printer "Save as PDF" / "Simpan sebagai PDF". Aktifkan cetak latar belakang untuk warna.</p></div>'+
  '<button onclick="window.print()">Cetak / Simpan PDF</button></div>'+
  '<main class="formal-document">'+summary(r)+analysis(r)+accounts(r)+budgets(r)+appendix(r)+'</main>'+
  '<footer class="formal-running-footer">Duit-Duit Paaxixi · Diarsipkan: '+E(fullTime(r.createdAt))+' · Dicetak/Diunduh: '+E(fullTime(r.exportTime))+'</footer>'+
  '<script>window.addEventListener("load",function(){var run=function(){window.setTimeout(function(){window.focus();window.print();},400)};if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run,run);else run();});<\/script>'+
  '</body></html>';
 }
 function print(r){
  if(!r||!/^\d{4}-\d{2}$/.test(String(r.month)))throw Error('Arsip laporan belum dipilih.');
  // Captured exactly when export is requested; archive timestamp stays unchanged.
  const snapshot={...r,exportTime:new Date().toISOString()};
  const w=window.open('','_blank');
  if(!w)return false;
  w.document.open();w.document.write(documentHtml(snapshot));w.document.close();
  w.focus();
  return true;
 }
 window.PAAX_FORMAL_PRINT={print,documentHtml,fullTime};
})();
