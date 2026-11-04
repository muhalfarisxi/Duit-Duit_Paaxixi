/* Arsip Laporan v2 – UI interaktif dan PDF vektor berwarna tanpa layanan eksternal. */
(function(){
'use strict';
const COLORS=['#2a71e6','#16a378','#ef7182','#8b69da','#f1af3c','#27a7bb','#ed9564','#8093b6'];
let archiveActiveReport=null,archiveLegacyTrendRows=null,archivePointDialog=null,archivePointOrigin=null;
const num=v=>Number(v)||0;
const fmt=v=>'Rp '+Math.round(num(v)).toLocaleString('id-ID');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monthText=s=>{if(!/^\d{4}-\d{2}$/.test(String(s)))return String(s||'');const [y,m]=s.split('-').map(Number);return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));};
const dateText=s=>{const d=String(s||'').split('-');return d.length===3?d[2]+' '+new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(+d[0],+d[1]-1,1))+' '+d[0]:String(s||'');};
const shortMoney=v=>{const n=num(v);return Math.abs(n)>=1e9?(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':Math.abs(n)>=1e6?(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':Math.abs(n)>=1e3?(n/1e3).toLocaleString('id-ID',{maximumFractionDigits:0})+' rb':String(Math.round(n));};
const sum=(a,key)=>a.reduce((n,v)=>n+num(v[key]),0);
function groupExpenses(r){
 const list=new Map();
 (r.expenseBreakdown||[]).forEach(x=>{
  if(num(x.spent)<=0)return;
  const k=x.group||'Lainnya';list.set(k,(list.get(k)||0)+num(x.spent));
 });
 const fallback={'LIVING FIX':'#2563eb','PLAYING':'#38a8ed','LIVING LAIN':'#7c73df'};
 return [...list].map(([name,value],i)=>{
  const candidate=r.groupColors?.[name]||fallback[name]||COLORS[i%COLORS.length];
  return {name,value,color:/^#[\da-f]{6}$/i.test(candidate)?candidate:COLORS[i%COLORS.length]};
 }).sort((a,b)=>b.value-a.value);
}
function months6(r){
 if(Array.isArray(r.trends)&&r.trends.length)return r.trends.slice(-6);
 return [{month:r.month,income:num(r.income),expense:num(r.expense)}];
}
function localInsight(r){
 const total=num(r.income),out=num(r.expense),groups=groupExpenses(r),lead=groups[0],net=total-out;
 const headline=out>total&&total>0?'Pengeluaran tercatat lebih besar daripada pemasukan.':net>=0&&total>0?'Pemasukan tercatat masih menutup pengeluaran.':'Periksa kelengkapan catatan keuangan bulan ini.';
 const summary=total===0?'Belum ada pemasukan yang tercatat. Laporan hanya mencerminkan data yang sudah diinput.':'Selisih pemasukan dan pengeluaran adalah '+fmt(net)+'. '+(lead?'Pengeluaran terbesar tercatat pada kelompok '+lead.name+' ('+shortMoney(lead.value)+').':'Belum ada pengeluaran tercatat.');
 return {source:'local',headline,summary,findings:lead?[{label:'Kelompok terbesar',text:lead.name+' mencakup '+(out?Math.round(lead.value/out*100):0)+'% dari pengeluaran tercatat.'}]:[],checks:[],actions:[{label:'Tindak lanjut',text:'Periksa transaksi yang belum dicatat, kemudian evaluasi pos dengan pengeluaran terbesar.'}]};
}
function chartGroups(r){
 const all=groupExpenses(r);
 if(all.length<=7)return all;
 return [...all.slice(0,6),{name:'Lainnya',value:sum(all.slice(6),'value'),color:'#7088aa'}];
}
function archivePolar(angle,r,cx,cy){
 const theta=(angle-90)*Math.PI/180;
 return {x:cx+Math.cos(theta)*r,y:cy+Math.sin(theta)*r};
}
function archiveArc(from,to,r,cx,cy){
 const a=archivePolar(from,r,cx,cy),b=archivePolar(to>=360?359.99:to,r,cx,cy);
 return 'M '+a.x.toFixed(2)+' '+a.y.toFixed(2)+' A '+r+' '+r+' 0 '+(to-from>180?'1':'0')+' 1 '+b.x.toFixed(2)+' '+b.y.toFixed(2);
}
function chartDonut(r){
 const groups=chartGroups(r),total=sum(groups,'value');
 if(!total)return '<div class="archive-blank">Belum ada data pengeluaran untuk grafik.</div>';
 const full=fmt(r.expense),size=full.length>17?13:full.length>14?15:18;
 let running=0;
 const entries=groups.map((g,i)=>{
  const start=running,span=g.value/total*360;running+=span;
  return {...g,i,start,end:running,mid:start+span/2,pct:(g.value/total*100).toFixed(1).replace('.',',')};
 });
 const left=entries.filter(e=>Math.sin(e.mid*Math.PI/180)<0).sort((a,b)=>Math.cos(a.mid*Math.PI/180)-Math.cos(b.mid*Math.PI/180));
 const right=entries.filter(e=>Math.sin(e.mid*Math.PI/180)>=0).sort((a,b)=>Math.cos(a.mid*Math.PI/180)-Math.cos(b.mid*Math.PI/180));
 const H=Math.max(324,Math.max(left.length,right.length)*60+42),cx=320,cy=H/2,radius=87;
 const arcs=entries.map(e=>{
  const d=archiveArc(e.start,e.end,radius,cx,cy);
  return '<path d="'+d+'" stroke="'+e.color+'" class="archive-donut-arc" stroke-width="31" fill="none" stroke-linecap="butt" style="--archive-delay:'+(e.i*80)+'ms"><title>'+esc(e.name+' · '+fmt(e.value)+' · '+e.pct+'%')+'</title></path>';
 }).join('');
 const callouts=side=>side.flatMap((e,i)=>{
  const x=side===left?8:470,yy=Math.max(35,Math.min(H-35,(i+1)*H/(side.length+1))),sign=e.i%2?1:-1;
  const p=archivePolar(e.mid,105,cx,cy),edge=x===8?169:470;
  const path='M '+p.x.toFixed(1)+' '+p.y.toFixed(1)+' L '+(x===8?182:458)+' '+yy.toFixed(1)+' L '+edge+' '+yy.toFixed(1);
  const amount=fmt(e.value),textSize=amount.length>15?8.2:9.2;
  return '<g class="archive-donut-callout" style="--archive-color:'+e.color+'" tabindex="0" role="group" aria-label="'+esc(e.name+' '+amount+' '+e.pct+' persen')+'">'+
   '<path d="'+path+'" stroke="'+e.color+'" class="archive-donut-link" fill="none"/>'+
   '<rect x="'+x+'" y="'+(yy-26)+'" width="162" height="52" rx="12" fill="#f9fbff" stroke="'+e.color+'" stroke-opacity=".65"/>'+
   '<circle cx="'+(x+11)+'" cy="'+(yy-12)+'" r="4" fill="'+e.color+'"/>'+
   '<text x="'+(x+21)+'" y="'+(yy-9)+'" fill="#2b507c" font-size="11" font-weight="800">'+esc(e.name.length>21?e.name.slice(0,19)+'…':e.name)+'</text>'+
   '<text x="'+(x+9)+'" y="'+(yy+13)+'" fill="'+e.color+'" font-size="'+textSize+'" font-weight="850">'+esc(amount+' · '+e.pct+'%')+'</text></g>';
 }).join('');
 const svg='<div class="archive-recap-desktop"><svg class="archive-recap-svg" viewBox="0 0 640 '+H+'" role="img" aria-label="Komposisi pengeluaran, warna kelompok sama dengan Dashboard">'+
  '<circle cx="'+cx+'" cy="'+cy+'" r="'+radius+'" stroke="#e8effa" stroke-width="32" fill="none"/>'+
  '<g class="archive-donut-ring">'+arcs+'</g>'+
  '<circle class="archive-donut-sheen" cx="'+cx+'" cy="'+cy+'" r="'+radius+'" fill="none" stroke="#fff" stroke-width="24" stroke-opacity=".48" stroke-dasharray="31 520" pointer-events="none"/>'+
  callouts(left)+callouts(right)+
  '<text x="'+cx+'" y="'+(cy-17)+'" text-anchor="middle" fill="#7691b0" font-size="12" font-weight="850">Total Pengeluaran</text>'+
  '<text x="'+cx+'" y="'+(cy+12)+'" text-anchor="middle" fill="#245080" font-size="'+size+'" font-weight="900">'+esc(full)+'</text></svg></div>';
 const pieces=entries.map(e=>e.color+' '+(100*e.start/360).toFixed(2)+'% '+(100*e.end/360).toFixed(2)+'%').join(',');
 const small='<div class="archive-recap-mobile"><div class="archive-donut-layout"><div class="archive-donut" style="background:conic-gradient('+pieces+')"><div><small>Total Pengeluaran</small><strong title="'+esc(full)+'" style="font-size:'+(size-3)+'px">'+esc(full)+'</strong></div></div>'+
  '<div class="archive-donut-legend">'+entries.map(e=>'<div><span class="archive-legend-name"><i style="background:'+e.color+'"></i>'+esc(e.name)+'</span><span class="archive-legend-values"><strong>'+fmt(e.value)+'</strong><small>'+e.pct+'%</small></span></div>').join('')+'</div></div></div>';
 return '<div class="archive-dashboard-donut">'+svg+small+'</div>';
}
function chartTrend(r){
 const rows=months6(r),n=rows.length;
 if(!n)return '<div class="archive-blank">Belum tersedia periode tren.</div>';
 const width=720,height=320,left=79,right=48,top=55,bottom=52;
 const plotW=width-left-right,plotH=height-top-bottom;
 const highest=Math.max(1,...rows.flatMap(x=>[num(x.income),num(x.expense)]));
 const max=highest*1.12;
 const X=i=>left+(n===1?plotW/2:i*plotW/(n-1)),Y=v=>top+plotH-num(v)/max*plotH;
 const grid=[0,.25,.5,.75,1].map(k=>'<line x1="'+left+'" y1="'+Y(max*k).toFixed(1)+'" x2="'+(width-right)+'" y2="'+Y(max*k).toFixed(1)+'" stroke="#e2ebf7" stroke-dasharray="4 6"/>'+
  '<text x="'+(left-9)+'" y="'+(Y(max*k)+4).toFixed(1)+'" text-anchor="end" fill="#7990ac" font-size="10">'+esc(shortMoney(max*k))+'</text>').join('');
 const labels=rows.map((v,i)=>'<text x="'+X(i).toFixed(1)+'" y="'+(height-19)+'" text-anchor="middle" fill="#6886a9" font-size="11" font-weight="700">'+esc((v.month||'').slice(5)+'/'+(v.month||'').slice(2,4))+'</text>').join('');
 const series=[{key:'income',name:'Pemasukan',color:'#15966b',className:'is-income'},
  {key:'expense',name:'Pengeluaran',color:'#d95770',className:'is-expense'}];
 const charts=series.map((a,idx)=>{
  const coords=rows.map((v,i)=>({x:X(i),y:Y(v[a.key]),value:num(v[a.key]),month:v.month}));
  const path=coords.map((p,i)=>{
   if(i===0)return 'M '+p.x.toFixed(2)+' '+p.y.toFixed(2);
   const prev=coords[i-1],mid=(prev.x+p.x)/2;
   return ' C '+mid.toFixed(2)+' '+prev.y.toFixed(2)+' '+mid.toFixed(2)+' '+p.y.toFixed(2)+' '+p.x.toFixed(2)+' '+p.y.toFixed(2);
  }).join('');
  const area=path+' L '+coords[n-1].x.toFixed(2)+' '+(top+plotH)+' L '+coords[0].x.toFixed(2)+' '+(top+plotH)+' Z';
  const points=coords.map((p,i)=>{
   const amount=fmt(p.value),nearBottom=p.y>height-bottom-30;
   const position=idx===0||nearBottom?p.y-19:p.y+25;
   const labelY=Math.max(15,Math.min(height-25,position));
   return '<g class="archive-line-point" tabindex="0" role="button" data-archive-trend-point="'+esc(p.month)+'" data-archive-trend-type="'+a.key+'" data-archive-trend-value="'+p.value+'" style="--archive-point-color:'+a.color+';--archive-point-delay:'+(i*75+idx*55)+'ms" aria-label="'+esc(a.name+', '+monthText(p.month)+', '+amount+'. Buka rincian transaksi')+'">'+
    '<title>'+esc(a.name+' · '+monthText(p.month)+' · '+amount+' · klik untuk rincian')+'</title>'+
    '<circle cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="16" fill="transparent" class="archive-line-hit"/>'+
    '<circle cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="10" fill="'+a.color+'" fill-opacity=".12"/>'+
    '<circle cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="5" fill="'+a.color+'" stroke="#fff" stroke-width="2"/>'+
    '<text class="archive-trend-point-value" x="'+p.x.toFixed(2)+'" y="'+labelY.toFixed(2)+'" text-anchor="middle" fill="'+a.color+'" font-size="'+(amount.length>16?'8.6':'10')+'" font-weight="850" paint-order="stroke fill" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">'+esc(amount)+'</text></g>';
  }).join('');
  return '<path d="'+area+'" fill="url(#archive-area-'+a.key+')" class="archive-line-area"/>'+
   '<path d="'+path+'" fill="none" stroke="'+a.color+'" stroke-width="3.8" stroke-linejoin="round" stroke-linecap="round" class="archive-line-path" pathLength="1" style="--archive-line-delay:'+(idx*0.2)+'s"/>'+points;
 }).join('');
 return '<div class="archive-trend archive-dashboard-trend"><div class="archive-trend-legend"><span><i class="is-income"></i>Pemasukan</span><span><i class="is-expense"></i>Pengeluaran</span></div>'+
  '<div class="archive-line-canvas"><svg class="archive-line-svg" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="Grafik tren pemasukan dan pengeluaran enam bulan, setiap titik berlabel rupiah dan dapat dibuka untuk melihat rincian transaksi">'+
  '<defs><linearGradient id="archive-area-income" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#15966b" stop-opacity=".2"/><stop offset="1" stop-color="#15966b" stop-opacity=".01"/></linearGradient>'+
  '<linearGradient id="archive-area-expense" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d95770" stop-opacity=".14"/><stop offset="1" stop-color="#d95770" stop-opacity=".01"/></linearGradient></defs>'+
  grid+charts+labels+'</svg></div>'+
  '<small class="archive-trend-hint">✨ Klik titik atau angka untuk membuka rincian transaksi pemasukan atau pengeluaran bulan tersebut.</small></div>';
}
function insightMarkup(r){
 const ai=r.aiInsight||localInsight(r),real=ai.source==='gemini';
 const notes=[...(ai.findings||[]),...(ai.checks||[]),...(ai.actions||[])].slice(0,4);
 return '<div class="archive-insight-head"><div><span class="archive-kicker">✦ RANGKUMAN CERDAS</span><h3>'+(real?'🤖 Insight AI Bulanan':'💡 Analisis Otomatis')+'</h3></div><span class="archive-source">'+(real?'Gemini · saat arsip dibuat':'Analisis berdasarkan angka')+'</span></div><strong class="archive-ai-headline">'+esc(ai.headline||'Belum ada analisis')+'</strong><p>'+esc(ai.summary||'')+'</p><div class="archive-ai-points">'+notes.map((x,i)=>'<div><span>'+(i===notes.length-1?'→':'✓')+'</span><div><strong>'+esc(x.label)+'</strong><small>'+esc(x.text)+'</small></div></div>').join('')+'</div>';
}
function card(icon,label,value,accent,sub){
 return '<article class="archive-kpi archive-kpi-'+accent+'"><span class="archive-kpi-icon">'+icon+'</span><div><small>'+label+'</small><strong title="'+esc(value===null?'Tidak direkam dalam arsip lama':fmt(value))+'">'+(value===null?'Belum direkam':fmt(value))+'</strong><span>'+sub+'</span></div></article>';
}
function transactionsPreview(r){
 const all=(r.transactions||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)),count=all.length;
 const sample=all.slice(0,8);
 if(!sample.length)return '<div class="archive-blank">Belum ada transaksi pada periode ini.</div>';
 return '<div class="archive-table-scroll"><table class="archive-table"><thead><tr><th>Tanggal</th><th>Kelompok</th><th>Pos</th><th>Komoditas / Transaksi</th><th>Keluar</th><th>Masuk</th></tr></thead><tbody>'+sample.map(t=>'<tr><td>'+esc(dateText(t.date))+'</td><td>'+esc(t.type==='transfer'?'Mutasi':t.group||'Lainnya')+'</td><td>'+esc(t.type==='transfer'?'Antarrekening':t.categoryLabel||'—')+'</td><td><strong>'+esc(t.title||'Tanpa keterangan')+'</strong></td><td class="archive-amount-out">'+(t.type==='expense'?fmt(t.amount):'—')+'</td><td class="archive-amount-in">'+(t.type==='income'?fmt(t.amount):'—')+'</td></tr>').join('')+'</tbody></table></div><small class="archive-preview-foot">Menampilkan '+sample.length+' dari '+count+' transaksi. Rincian lengkap per tanggal tersedia di lampiran PDF'+(count>sample.length?' (termasuk '+(count-sample.length)+' lainnya).':'.')+'</small>';
}
function debtInfo(r){
 const ledger=Array.isArray(r.debtLedger)?r.debtLedger:(r.debts||[]).filter(x=>num(x.remaining)>0).map(x=>({type:x.type,person:x.person,remaining:num(x.remaining),legacy:true}));
 const totals=r.debtSummary||{
  payable:ledger.filter(x=>x.type==='payable').reduce((n,x)=>n+num(x.remaining),0),
  receivable:ledger.filter(x=>x.type==='receivable').reduce((n,x)=>n+num(x.remaining),0),
  payableNew:0,receivableNew:0,payablePaid:0,receivablePaid:0
 };
 return {ledger,totals,legacy:!r.debtSummary};
}
function debtPreview(r){
 const {ledger,totals,legacy}=debtInfo(r);
 const cards='<div class="archive-debt-metrics">'
  +'<div class="archive-debt-stat archive-debt-owed"><small>↙ Sisa Utang Saya</small><strong>'+fmt(totals.payable)+'</strong><span>Masih harus dibayar</span></div>'
  +'<div class="archive-debt-stat archive-debt-receivable"><small>↗ Sisa Piutang Saya</small><strong>'+fmt(totals.receivable)+'</strong><span>Masih harus diterima</span></div>'
  +'<div class="archive-debt-stat"><small>✓ Cicilan Utang Bulan Ini</small><strong>'+(legacy?'Belum direkam':fmt(totals.payablePaid))+'</strong><span>Yang sudah saya bayar</span></div>'
  +'<div class="archive-debt-stat"><small>✧ Piutang Kembali Bulan Ini</small><strong>'+(legacy?'Belum direkam':fmt(totals.receivablePaid))+'</strong><span>Yang sudah dikembalikan</span></div></div>';
 const rows=ledger.length?'<div class="archive-table-scroll"><table class="archive-table"><thead><tr><th>Jenis / Pihak</th><th>Mulai</th><th>Pokok Awal</th><th>Cicilan Bulan Ini</th><th>Sisa Akhir Bulan</th></tr></thead><tbody>'+ledger.map(d=>'<tr><td><strong>'+esc(d.type==='payable'?'Utang':'Piutang')+' · '+esc(d.person)+'</strong></td><td>'+esc(d.date?dateText(d.date):'—')+'</td><td>'+esc(d.original===undefined?'—':fmt(d.original))+'</td><td>'+esc(d.paidInMonth===undefined?'—':fmt(d.paidInMonth))+'</td><td><strong>'+esc(fmt(d.remaining))+'</strong></td></tr>').join('')+'</tbody></table></div>':'<div class="archive-blank">Tidak ada utang atau piutang yang aktif maupun berubah pada bulan tersebut.</div>';
 const note=legacy?'Arsip lama belum menyimpan rincian cicilan atau nominal awal. Perbarui arsip bulan ini untuk melengkapi data.':'Daftar memuat utang/piutang bersaldo atau memiliki aktivitas selama bulan ini. Rincian cicilan juga disertakan dalam PDF.';
 return '<section class="archive-panel archive-debt-panel"><div class="archive-debt-heading"><h3>🤝 Utang & Piutang Bulanan</h3><span class="archive-mini-tag">Posisi akhir bulan</span></div>'+cards+rows+'<small class="archive-preview-foot">'+note+'</small></section>';
}
function archiveHistoryStrip(months,sel){
 const cards=(months||[]).map(item=>{
  const active=item.month===sel;
  return '<article class="archive-quick-item'+(active?' is-active':'')+'" '+(active?'aria-current="true"':'')+'>'+
   '<div class="archive-quick-info"><span class="archive-quick-month">'+esc(monthText(item.month))+'</span>'+
   '<span class="archive-quick-spent">Keluar <strong>'+fmt(item.expense)+'</strong></span></div>'+
   '<div class="archive-quick-actions"><button type="button" class="archive-quick-open" data-open-report="'+esc(item.month)+'" aria-label="Buka arsip '+esc(monthText(item.month))+'">'+(active?'✓ Terbuka':'Buka')+'</button>'+
   '<button type="button" class="archive-quick-delete" data-delete-report="'+esc(item.month)+'" title="Hapus arsip '+esc(monthText(item.month))+'" aria-label="Hapus arsip '+esc(monthText(item.month))+'">×</button></div></article>';
 }).join('');
 return '<section class="archive-quick-section" aria-labelledby="archive-quick-heading">'+
  '<div class="archive-quick-head"><div class="archive-quick-title"><span aria-hidden="true">📚</span><div><h3 id="archive-quick-heading">Arsip Bulanan <small>'+months.length+' tersimpan</small></h3><p>Snapshot tersimpan · pilih bulan untuk membuka laporannya.</p></div></div>'+
  (months.length>2?'<div class="archive-quick-nav" role="group" aria-label="Geser daftar arsip"><button type="button" data-archive-quick-scroll="-1" aria-label="Geser ke kiri">‹</button><button type="button" data-archive-quick-scroll="1" aria-label="Geser ke kanan">›</button></div>':'')+
  '</div>'+
  (months.length?'<div class="archive-quick-list" role="list" aria-label="Arsip bulanan tersimpan">'+cards+'</div>':
   '<div class="archive-quick-empty"><span aria-hidden="true">✦</span> Belum ada arsip tersimpan. Pilih bulan lalu klik <strong>Simpan Arsip</strong>.</div>')+
  '</section>';
}
function renderPage(data){
 archiveClosePointDialog(false);
 archiveActiveReport=data.report;
 archiveLegacyTrendRows=Array.isArray(data.legacyTrendRows)?data.legacyTrendRows:null;
 const r=data.report,months=data.history||[],saved=!!data.saved,sel=data.month||r.month;
 const totalBank=sum(r.balances||[],'balance'),invest=r.investment||{unavailable:true},investValue=invest.unavailable?null:num(invest.market);
 const investSubtitle=invest.unavailable?'Arsip lama · nilai tidak direkam':(invest.assets||[]).length+' jenis aset tercatat';
 return '<div class="archive-v2">'
  +'<div class="archive-intro"><div><span class="archive-kicker">✦ LAPORAN KEUANGAN BULANAN</span><h2>Rapor Keuangan <span>✦</span></h2><p>Ringkasan, grafik, dan analisis dalam satu laporan. Rincian transaksi ada di lampiran.</p></div><span class="archive-intro-ornament" aria-hidden="true">📊</span></div>'
  +'<div class="archive-toolbar"><div class="archive-picker"><span>🗓️</span><label><small>Periode Laporan</small><input id="report-month" type="month" aria-label="Pilih bulan laporan" value="'+esc(sel)+'"></label></div><div class="archive-status '+(saved?'is-saved':'')+'"><span>'+(saved?'✓':'◌')+'</span><div><small>Status Bulan</small><strong>'+(saved?'Arsip tersimpan':'Pratinjau belum disimpan')+'</strong></div></div><div class="archive-toolbar-actions"><button class="btn teal archive-save-btn" data-action="save-report">'+(saved?'↻ Perbarui Arsip':'✦ Simpan Arsip')+'</button><button class="btn archive-pdf-btn" data-action="print-report" '+(saved?'':'disabled title="Simpan arsip sebelum mencetak laporan"')+'>🖨 Cetak / Simpan PDF</button></div></div>'
  +archiveHistoryStrip(months,sel)
  +'<div class="archive-summary-grid">'
  +card('💚','Pemasukan',r.income,'green','Uang masuk pada bulan ini')
  +card('🧡','Pengeluaran',r.expense,'coral','Uang keluar untuk belanja')
  +card('💜','Investasi',investValue,'purple',investSubtitle)
  +card('🏦','Saldo Rekening',totalBank,'blue','Saldo seluruh rekening pada akhir bulan')
  +'</div>'
  +'<div class="archive-net-strip"><span>✦ Arus Kas Bersih</span><strong class="'+(num(r.net)>=0?'is-positive':'is-negative')+'">'+fmt(r.net)+'</strong><small>Selisih pemasukan dan pengeluaran, tidak termasuk mutasi rekening dan pembelian aset</small></div>'
  +'<div class="archive-panels"><section class="archive-panel"><h3>🍩 Komposisi Pengeluaran</h3>'+chartDonut(r)+'</section><section class="archive-panel"><h3>📈 Tren Pemasukan & Pengeluaran</h3>'+chartTrend(r)+'</section></div>'
  +'<section class="archive-ai-panel">'+insightMarkup(r)+'</section>'
  +debtPreview(r)
  +'<section class="archive-panel archive-attachment"><div><h3>📋 Lampiran Transaksi</h3><span class="archive-mini-tag">Per tanggal · '+(r.transactions||[]).length+' transaksi</span></div>'+transactionsPreview(r)+'</section>'
  +'<div class="archive-report-foot">Laporan PDF memuat ringkasan dan rincian transaksi berdasarkan arsip bulan ini, lengkap dengan waktu pengarsipan dan waktu pencetakan (WIB). '+(!saved?'Simpan arsip untuk membekukan angka laporan.':'')+'</div></div>';
}
/* Portable PDF 1.4 renderer (A4, warna vektor); PDF tetap dapat diunduh tanpa CDN. */
function pdfReport(r){
 const W=595,H=842,enc=new TextEncoder(),pages=[];
 // Consistent snapshot and export timestamps; both are rendered in WIB.
 const exportedAt=new Date();
 const inWib=value=>{
  if(!value)return 'Tidak tercatat (arsip lama)';
  const time=new Date(value);
  if(!Number.isFinite(time.getTime()))return 'Tidak tercatat (arsip lama)';
  return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(time).replace(/\./g,':')+' WIB';
 };
 const savedStamp=inWib(r.createdAt),exportStamp=inWib(exportedAt);

 let commands=[],y=0,sectionName='';
 const rgb=hex=>{const x=hex.replace('#','');return [0,2,4].map(i=>(parseInt(x.slice(i,i+2),16)/255).toFixed(3)).join(' ');};
 const clean=t=>String(t??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—−]/g,'-').replace(/[✓✔]/g,'v').replace(/[•·]/g,'-').replace(/[→]/g,'>').replace(/[←]/g,'<').replace(/[^\x20-\x7e]/g,'?');
 const safe=t=>clean(t).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 function rect(x,top,w,h,c){commands.push(rgb(c)+' rg '+x.toFixed(1)+' '+(H-top-h).toFixed(1)+' '+w.toFixed(1)+' '+h.toFixed(1)+' re f\n');}
 function line(x,top,x2,t2,color){commands.push(rgb(color)+' RG 0.8 w '+x+' '+(H-top)+' m '+x2+' '+(H-t2)+' l S\n');}
 function text(v,x,top,size=10,bold=false,color='#16365c'){
  commands.push('BT /F'+(bold?2:1)+' '+size+' Tf '+rgb(color)+' rg 1 0 0 1 '+x.toFixed(1)+' '+(H-top).toFixed(1)+' Tm ('+safe(v)+') Tj ET\n');
 }
 function wrap(s,limit){const words=clean(s).split(/\s+/);let rows=[],cur='';for(const word of words){if(!word)continue; if((cur+' '+word).trim().length>limit&&cur){rows.push(cur);cur=word;}else cur=cur?cur+' '+word:word; while(cur.length>limit+12){rows.push(cur.slice(0,limit));cur=cur.slice(limit);}}if(cur)rows.push(cur);return rows.length?rows:[''];}
 function multi(s,x,top,width=82,size=9,color='#344d70',leading=13){const rows=wrap(s,width);rows.forEach((p,i)=>text(p,x,top+i*leading,size,false,color));return rows.length*leading;}
 function newPage(title){
  if(commands.length)pages.push(commands.join(''));
  commands=[];y=132;sectionName=title;
  rect(0,0,W,106,'#fffefe');
  rect(37,23,521,2.2,'#193b5d');
  text('DUIT-DUIT PAAXIXI  |  DOKUMEN ARSIP KEUANGAN',37,42,10,true,'#334e69');
  text(title,37,69,17,true,'#163856');
  text(monthText(r.month),37,92,11,false,'#856337');
  rect(37,101,521,1,'#c0ac8a');
  // Footer repeats the actual archival and export instants on every page.
  line(37,808,558,808,'#c6d2df');
  text('Diarsipkan: '+savedStamp,38,821,7,false,'#4d6177');
  text('Dicetak/Diunduh: '+exportStamp,38,832,7,false,'#4d6177');
 }
 function need(height){if(y+height>793)newPage(sectionName+' (lanjutan)');}
 function heading(label){need(32);text(label,38,y+10,13,true,'#143a72');line(38,y+18,555,y+18,'#dbe8f7');y+=32;}
 function tableRow(cols,widths,opts={}){
  const height=opts.height||30;need(height+2);
  rect(37,y-5,521,height,(opts.index||0)%2?'#ffffff':'#f1f6fe');
  let x=43;
  cols.forEach((v,i)=>{const max=widths[i];const str=clean(v);const n=Math.max(9,Math.floor(max/(opts.size||8)*1.7));text(str.length>n?str.slice(0,n-3)+'...':str,x,y+12,opts.size||8,i===0,'#263d5e');x+=max;});
  y+=height;
 }
 function kpi(x,top,title,value,c){
  rect(x,top,250,86,'#f0f6ff');rect(x,top,6,86,c);text(title,x+17,top+24,10,true,'#577293');text(value===null?'Belum direkam':fmt(value),x+17,top+56,value===null?12:17,true,c);
 }
 function annular(cx,cy,outer,inner,start,end,color){
  const path=[],count=Math.max(3,Math.ceil((end-start)/(Math.PI/30)));
  for(let i=0;i<=count;i++){
   const theta=start+(end-start)*i/count;
   path.push([cx+outer*Math.cos(theta),cy+outer*Math.sin(theta)]);
  }
  for(let i=count;i>=0;i--){
   const theta=start+(end-start)*i/count;
   path.push([cx+inner*Math.cos(theta),cy+inner*Math.sin(theta)]);
  }
  commands.push(rgb(color)+' rg '+path.map(([px,py],i)=>px.toFixed(2)+' '+(H-py).toFixed(2)+(i?' l ':' m ')).join('')+' h f\n');
 }
 newPage('RINGKASAN KEUANGAN');
 text('Periode Laporan: '+monthText(r.month),38,132,11,true,'#274664');
 text('Tanggal Diarsipkan: '+savedStamp,38,148,9,false,'#4e647d');
 text('Tanggal Dicetak/Diunduh: '+exportStamp,38,161,9,false,'#4e647d');
 kpi(37,174,'TOTAL PEMASUKAN',r.income,'#16715a');kpi(308,174,'TOTAL PENGELUARAN',r.expense,'#a7495f');
 kpi(37,273,'NILAI INVESTASI',r.investment?num(r.investment.market):null,'#4f6d92');kpi(308,273,'SALDO REKENING',sum(r.balances||[],'balance'),'#315e87');
 y=387;rect(37,y,521,54,num(r.net)>=0?'#e5f6f0':'#fff0f2');text('ARUS KAS BERSIH',52,y+23,10,true,'#27415d');text(fmt(r.net),304,y+28,18,true,num(r.net)>=0?'#137b59':'#ce465c');y+=78;
 heading('KOMPOSISI PENGELUARAN');
 const groups=chartGroups(r),total=sum(groups,'value'),cy=y+108,cx=145;
 if(!groups.length){
  text('Belum ada pengeluaran tercatat untuk komposisi.',40,y+22,10,false,'#71849d');
 }else{
  let start=-Math.PI/2;
  groups.forEach((g,i)=>{
   const finish=start+(g.value/total)*2*Math.PI;
   annular(cx,cy,101,62,start,finish,g.color);
   start=finish;
  });
  text('Total Pengeluaran',cx-36,cy-13,8,false,'#69809d');
  const full=fmt(r.expense),size=full.length>16?9.5:full.length>13?11:12;
  text(full,cx-full.length*size*.27,cy+9,size,true,'#1e497b');
  groups.forEach((g,i)=>{
   const yy=y+17+i*29;
   rect(283,yy-10,10,10,g.color);
   text(g.name.slice(0,22),302,yy-2,8,true,'#324d6d');
   const amount=fmt(g.value),fs=amount.length>15?7:8;
   text(amount,432,yy-2,fs,true,'#29527e');
   text((100*g.value/total).toFixed(1).replace('.',',')+'%',523,yy-2,8,true,g.color);
   line(282,yy+7,555,yy+7,'#e5edf7');
  });
 }
 y+=229;
 need(65);rect(37,y+6,521,44,'#fff5e4');
 multi('Nilai investasi tidak termasuk biaya konsumsi. Transfer antarrekening tidak memengaruhi total pemasukan atau pengeluaran.',49,y+25,95,8,'#815e30',12);
 newPage('GRAFIK DAN ANALISIS');
 heading('TREN KEUANGAN - ENAM BULAN');
 const trend=months6(r),mx=Math.max(1,...trend.flatMap(v=>[num(v.income),num(v.expense)]))*1.1;
 rect(38,y,520,217,'#f3f7ff');
 const chartTop=y+28,base=y+179,left=65,right=536,dx=trend.length>1?(right-left)/(trend.length-1):0;
 const xx=i=>trend.length===1?(left+right)/2:left+i*dx,yy=v=>base-num(v)/mx*(base-chartTop);
 for(let n=0;n<=4;n++){
  const pointY=yy(mx*n/4);
  line(56,pointY,543,pointY,'#e1eaf8');
  text(shortMoney(mx*n/4),42,pointY+3.5,7,false,'#7387a6');
 }
 const lineSeries=[{key:'income',color:'#15966b'},{key:'expense',color:'#d95770'}];
 for(const item of lineSeries){
  const points=trend.map((month,i)=>({x:xx(i),y:yy(month[item.key]),value:num(month[item.key])}));
  if(points.length>1){
   commands.push(rgb(item.color)+' RG 3.1 w 1 J 1 j '+points.map((p,i)=>p.x.toFixed(1)+' '+(H-p.y).toFixed(1)+(i?' l ':' m ')).join('')+' S\n');
  }
  points.forEach(p=>{
   // Circle points as filled small polygons, consistent with Dashboard markers.
   const dots=Array.from({length:14},(_,j)=>{
    const angle=2*Math.PI*j/14;
    return {x:p.x+4*Math.cos(angle),y:p.y+4*Math.sin(angle)};
   });
   commands.push(rgb(item.color)+' rg '+dots.map((d,i)=>d.x.toFixed(1)+' '+(H-d.y).toFixed(1)+(i?' l ':' m ')).join('')+' h f\n');
   const amount=fmt(p.value),font=amount.length>17?6.6:7.6;
   const textTop=item.key==='income'?Math.max(chartTop+7,p.y-12):Math.min(base+12,p.y+16);
   text(amount,p.x-amount.length*font*.27,textTop,font,true,item.color);
  });
 }
 trend.forEach((month,i)=>{
  text((month.month||'').slice(5)+'/'+(month.month||'').slice(2,4),xx(i)-12,base+18,8,false,'#536e91');
 });
 rect(63,y+207,9,9,'#15966b');text('Pemasukan',78,y+215,8,true,'#456a80');
 rect(169,y+207,9,9,'#d95770');text('Pengeluaran',184,y+215,8,true,'#456a80');
 y+=241;
 heading('ANALISIS DAN TINDAK LANJUT');
 const insight=r.aiInsight||localInsight(r);
 rect(38,y,519,34,insight.source==='gemini'?'#efe8ff':'#eaf2fb');
 text(insight.source==='gemini'?'ANALISIS AI GEMINI - DIBEKUKAN SAAT ARSIP':'ANALISIS STATISTIK OTOMATIS (TANPA AI)',50,y+21,10,true,insight.source==='gemini'?'#6b48a8':'#315d90');y+=49;
 need(50);y+=multi(insight.headline||'',43,y,85,11,'#16365c',16)+9;
 need(65);y+=multi(insight.summary||'',43,y,94,9,'#2e4c6d',13)+8;
 for(const point of [...(insight.findings||[]),...(insight.checks||[]),...(insight.actions||[])].slice(0,8)){
  const rows=wrap(point.text,93),h=18+rows.length*13;need(h);
  text((point.label||'Catatan').slice(0,72),43,y+7,9,true,'#166d93');multi(point.text,43,y+22,93,8,'#394e6c',12);y+=h+8;
 }
 newPage('REKENING DAN INVESTASI');heading('SALDO REKENING AKHIR BULAN');
 (r.balances||[]).forEach((a,i)=>tableRow([a.name,a.type,fmt(a.balance)],[225,114,173],{index:i,size:9,height:29}));
 if(!(r.balances||[]).length){text('Belum ada rekening.',43,y+9,9);y+=25;}
 y+=18;heading('PORTOFOLIO INVESTASI');
 if(r.investment?.unavailable){text('Data investasi tidak tersedia pada arsip lama ini.',43,y+10,9);y+=28;}
 else{
  text('Nilai portofolio: '+fmt(r.investment?.market),43,y+9,10,true,'#7857ce');y+=28;
  (r.investment?.assets||[]).forEach((a,i)=>tableRow([a.name,a.type,fmt(a.market)],[220,100,192],{index:i,size:9,height:29}));
  if(!(r.investment?.assets||[]).length){text('Belum ada aset investasi.',43,y+10,9);y+=28;}
 }
 newPage('UTANG DAN PIUTANG BULANAN');
 const debt=debtInfo(r),totals=debt.totals,ledger=debt.ledger;
 rect(37,147,250,78,'#fff0f3');rect(37,147,5,78,'#e46579');
 text('TOTAL UTANG BELUM LUNAS',52,171,10,true,'#93506a');
 text(fmt(totals.payable),52,201,17,true,'#b83d57');
 rect(308,147,250,78,'#eaf8f4');rect(308,147,5,78,'#22a07e');
 text('TOTAL PIUTANG BELUM KEMBALI',323,171,10,true,'#28775e');
 text(fmt(totals.receivable),323,201,17,true,'#168469');
 y=243;
 if(!debt.legacy){
  heading('PERGERAKAN UTANG DAN PIUTANG BULAN INI');
  tableRow(['Utang baru',fmt(totals.payableNew),'Utang dibayar',fmt(totals.payablePaid)],[121,128,129,135],{size:9,height:34,index:0});
  tableRow(['Piutang baru',fmt(totals.receivableNew),'Piutang kembali',fmt(totals.receivablePaid)],[121,128,129,135],{size:9,height:34,index:1});
 }
 y+=18;heading('DAFTAR UTANG DAN PIUTANG YANG RELEVAN');
 multi('Daftar termasuk saldo akhir bulan dan pinjaman yang dibuat atau dibayar pada bulan tersebut.',40,y,93,8,'#637995',12);y+=35;
 if(ledger.length){
  rect(37,y,521,25,'#e7effb');
  [['Jenis / Pihak',43],['Tanggal / Jatuh Tempo',171],['Pokok',309],['Cicilan',393],['Sisa',485]].forEach(([name,x])=>text(name,x,y+16,8,true,'#315984'));
  y+=30;
  ledger.forEach((d,i)=>{
   const hgt=47;need(hgt+4);rect(37,y-4,521,hgt,i%2?'#fff':'#f2f6fd');
   const tp=d.type==='payable'?'Utang':'Piutang';
   text(tp,43,y+12,8,true,d.type==='payable'?'#bf4366':'#198569');
   const personRows=wrap(d.person||'',25);personRows.slice(0,2).forEach((t,j)=>text(t,43,y+25+j*10,8,j===0,'#274562'));
   text(d.date?dateText(d.date):'Tgl belum ada',171,y+14,8,false,'#334d6e');
   text(d.dueDate?'Tempo: '+dateText(d.dueDate):'Tempo: -',171,y+29,7,false,'#7288a2');
   text(d.original===undefined?'-':fmt(d.original),309,y+19,8,true,'#304d72');
   text(d.paidInMonth===undefined?'-':fmt(d.paidInMonth),393,y+19,8,false,'#315f9b');
   text(fmt(d.remaining),485,y+19,8,true,d.type==='payable'?'#b9495e':'#18836b');y+=hgt;
  });
 }else{
  text('Tidak ada utang atau piutang yang aktif maupun berubah pada bulan ini.',40,y+12,9,false,'#637995');y+=37;
 }
 if(debt.legacy){
  need(49);rect(37,y+6,521,43,'#fff6e4');
  multi('Arsip lama hanya menyimpan sisa pinjaman. Pokok awal, cicilan bulanan, dan jatuh tempo belum tersedia dalam snapshot ini.',49,y+22,94,8,'#765c37',12);
  y+=50;
 }else{
  y+=16;heading('RIWAYAT CICILAN / PELUNASAN BULAN INI');
  const pays=ledger.flatMap(d=>(d.payments||[]).map(p=>({...p,type:d.type,person:d.person}))).sort((a,b)=>a.date.localeCompare(b.date));
  if(!pays.length){text('Tidak ada pembayaran atau pelunasan yang dicatat pada bulan ini.',40,y+13,9,false,'#71869e');y+=34;}
  else pays.forEach((p,i)=>tableRow([dateText(p.date),p.type==='payable'?'Bayar utang':'Terima piutang',p.person,fmt(p.amount)],[95,129,164,125],{index:i,size:9,height:29}));
 }
 newPage('RINCIAN ANGGARAN');
 heading('ANGGARAN DAN REALISASI PENGELUARAN');
 const budgetLines=(r.expenseBreakdown||[]).filter(x=>num(x.spent)>0||num(x.budget)>0);
 if(!budgetLines.length){text('Belum ada anggaran atau pengeluaran tercatat.',43,y+10,9);y+=26;}
 else budgetLines.forEach((x,i)=>tableRow([x.group+' / '+x.label,fmt(x.budget),fmt(x.spent)],[261,126,126],{index:i,size:8,height:27}));
 newPage('LAMPIRAN TRANSAKSI PER TANGGAL');
 const entries=(r.transactions||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.title||'').localeCompare(String(b.title||'')));
 text('Seluruh transaksi pada periode ini: '+entries.length+' catatan.',38,138,10,true,'#526d90');y=158;
 let last='',row=0;
 for(const t of entries){
  const group=t.type==='transfer'?'Mutasi':t.group||'Lainnya',pos=t.type==='transfer'?'Antarrekening':t.categoryLabel||'--';
  const name=t.title||'Tanpa keterangan',detail=t.note?'Catatan: '+t.note:'';
  const groupLines=wrap(group,19),posLines=wrap(pos,18),nameLines=wrap(name,25);
  const lines=Math.max(groupLines.length,posLines.length,nameLines.length),height=14+lines*13+(detail?14:0);
  if(y+height+83>793){newPage('LAMPIRAN TRANSAKSI (LANJUTAN)');last='';}
  if(t.date!==last){need(58);last=t.date;rect(37,y,521,28,'#e4eefc');text('TANGGAL  '+dateText(last),45,y+18,10,true,'#184276');y+=38;
   rect(37,y,521,22,'#eef5fd');const positions=[43,153,249,394,474];['Kelompok','Pos','Komoditas','Keluar','Masuk'].forEach((v,i)=>text(v,positions[i],y+14,8,true,'#3c5678'));y+=28;row=0;}
  need(height+12);
  rect(37,y-4,521,height,row%2?'#ffffff':'#f6f9ff');
  groupLines.forEach((v,i)=>text(v,43,y+11+i*13,8,false,'#39506b'));
  posLines.forEach((v,i)=>text(v,153,y+11+i*13,8,false,'#39506b'));
  nameLines.forEach((v,i)=>text(v,249,y+11+i*13,8,true,'#263b56'));
  text(t.type==='expense'?Math.round(num(t.amount)).toLocaleString('id-ID'):'-',394,y+11,8,true,'#ca4960');
  text(t.type==='income'?Math.round(num(t.amount)).toLocaleString('id-ID'):'-',474,y+11,8,true,'#168565');
  if(detail)text(detail.slice(0,91),43,y+11+lines*13,7,false,'#6b809c');
  y+=height;row++;
 }
 if(!entries.length)text('Tidak ada transaksi tercatat.',43,y+15,10);
 if(commands.length)pages.push(commands.join(''));
 const objects=[],add=v=>(objects.push(v),objects.length);
 const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');
 const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>');
 const pagesId=add(''),children=[];
 pages.forEach((cmd,i)=>{
  const footer='BT /F1 8 Tf '+rgb('#57718c')+' rg 1 0 0 1 480 11 Tm (Halaman '+(i+1)+' / '+pages.length+') Tj ET\n';
  const content=cmd+footer,cid=add('<< /Length '+enc.encode(content).length+' >>\nstream\n'+content+'endstream');
  children.push(add('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+regular+' 0 R /F2 '+bold+' 0 R >> >> /Contents '+cid+' 0 R >>'));
 });
 objects[pagesId-1]='<< /Type /Pages /Kids ['+children.map(v=>v+' 0 R').join(' ')+'] /Count '+children.length+' >>';
 const root=add('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
 let output='%PDF-1.4\n',offset=enc.encode(output).length,positions=[0];
 objects.forEach((obj,i)=>{positions.push(offset);const block=(i+1)+' 0 obj\n'+obj+'\nendobj\n';output+=block;offset+=enc.encode(block).length;});
 const cross=offset;
 output+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<positions.length;i++)output+=String(positions[i]).padStart(10,'0')+' 00000 n \n';
 output+='trailer\n<< /Size '+(objects.length+1)+' /Root '+root+' 0 R >>\nstartxref\n'+cross+'\n%%EOF';
 return enc.encode(output);
}
function exportPdf(r){
 if(!r||!r.month)throw Error('Arsip tidak ditemukan');
 const data=pdfReport(r),blob=new Blob([data],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Duit-Duit-Paaxixi-Arsip-'+r.month+'-Unduh-'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
/* Titik tren mengikuti interaksi Dashboard tanpa mengubah isi arsip. */

/* Rincian titik tren mengacu pada snapshot: bulan laporan sendiri tersimpan
   di transactions, lima bulan pembanding pada trendTransactions (arsip baru).
   Arsip lama boleh memakai transaksi terkini tetapi diberi penanda eksplisit. */
function archivePointDetails(month,type){
 const r=archiveActiveReport;
 if(!r||!/^\d{4}-\d{2}$/.test(month)||!['income','expense'].includes(type)||
  !months6(r).some(x=>x.month===month))return null;
 const monthly=months6(r).find(x=>x.month===month),claimed=num(monthly?.[type]);
 let rows=[],origin='snapshot';
 if(month===r.month)rows=r.transactions||[];
 else if(Array.isArray(r.trendTransactions)){
  const other=r.trendTransactions.find(x=>x.month===month);
  rows=other?.transactions||[];
 }else{
  rows=archiveLegacyTrendRows||[];
  origin='live';
 }
 rows=rows.filter(tx=>tx.type===type&&String(tx.date||'').slice(0,7)===month)
  .slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||
   String(a.title||'').localeCompare(String(b.title||''),'id'));
 const recorded=rows.reduce((n,tx)=>n+num(tx.amount),0);
 return {month,type,claimed,recorded,rows,origin};
}
function archivePointColors(group,type,index,r){
 if(type==='income')return ['#15966b','#33b58c','#6cbfaa','#1d9e9f','#75ac75','#98c8b5'][index%6];
 const candidate=r.groupColors?.[group];
 return /^#[0-9a-f]{6}$/i.test(candidate||'')?candidate:COLORS[index%COLORS.length];
}
function archivePointContent(info){
 const r=archiveActiveReport,kind=info.type==='income'?'Pemasukan':'Pengeluaran',income=info.type==='income';
 const breakdown=new Map();
 info.rows.forEach(tx=>{
  const group=String(tx.group||'Lainnya');
  breakdown.set(group,(breakdown.get(group)||0)+num(tx.amount));
 });
 const composition=[...breakdown].sort((a,b)=>b[1]-a[1]);
 const categories=composition.map(([name,value],i)=>({name,value,color:archivePointColors(name,info.type,i,r)}));
 let cursor=0;
 const gradient=categories.map((x,i)=>{
  const to=i===categories.length-1?100:cursor+100*x.value/Math.max(1,info.recorded);
  const part=x.color+' '+cursor.toFixed(2)+'% '+to.toFixed(2)+'%';
  cursor=to;return part;
 }).join(',');
 const compositionMarkup=categories.length?'<div class="archive-point-composition"><div class="archive-point-donut" style="background:conic-gradient('+gradient+')" role="img" aria-label="Komposisi '+kind.toLowerCase()+'"><div><small>Total '+kind+'</small><strong>'+fmt(info.recorded)+'</strong></div></div>'+
  '<div class="archive-point-categories">'+categories.map(x=>'<div class="archive-point-category"><span><i style="background:'+x.color+'"></i>'+esc(x.name)+'</span><strong>'+fmt(x.value)+'</strong><small>'+((100*x.value/Math.max(1,info.recorded)).toFixed(1).replace('.',','))+'%</small></div>').join('')+'</div></div>':
  '<div class="archive-point-empty">Belum tersedia transaksi rinci untuk kategori ini.</div>';
 const dates=new Map();
 info.rows.forEach(tx=>{
  const day=String(tx.date||'');
  if(!dates.has(day))dates.set(day,[]);
  dates.get(day).push(tx);
 });
 const items=[...dates].map(([date,txs])=>{
  const total=txs.reduce((n,t)=>n+num(t.amount),0);
  return '<section class="archive-point-day"><div class="archive-point-day-heading"><div><span>📅</span><strong>'+esc(dateText(date))+'</strong><small>'+txs.length+' transaksi</small></div><b>'+fmt(total)+'</b></div>'+
   txs.map(t=>{
    const group=t.group||'Lainnya',pos=t.categoryLabel||'Tanpa pos',name=t.title||'Tanpa keterangan';
    return '<div class="archive-point-tx"><div><strong>'+esc(name)+'</strong><small>'+esc(group)+' · '+esc(pos)+'</small>'+
     (t.note?'<p>'+esc(t.note)+'</p>':'')+'</div><b class="'+(income?'is-income':'is-expense')+'">'+(income?'+':'−')+fmt(t.amount)+'</b></div>';
   }).join('')+'</section>';
 }).join('');
 const mismatch=Math.abs(info.claimed-info.recorded)>1;
 const warning=info.origin==='live'?
  '<div class="archive-point-warning">ℹ️ Arsip lama belum menyimpan rincian bulan pembanding. Daftar ini memakai transaksi yang tercatat saat ini, bukan salinan historis saat arsip dibuat.</div>':
  '';
 const reconcile=mismatch?'<div class="archive-point-warning">⚠️ Angka pada grafik arsip adalah '+fmt(info.claimed)+', sedangkan transaksi rinci yang tersedia berjumlah '+fmt(info.recorded)+'. Angka tersebut berbeda; periksa perubahan data atau perbarui arsip.</div>':'';
 return '<div class="archive-point-modal-head"><div class="archive-point-heading"><span class="archive-point-head-icon">'+(income?'💚':'🧡')+'</span><div><small>RINCIAN TREN BULANAN ✦</small><h3 id="archive-point-heading">'+kind+' · '+esc(monthText(info.month))+'</h3><p>'+ (info.origin==='snapshot'?'Data transaksi yang tercatat pada laporan arsip':'Pratinjau berdasarkan transaksi terkini')+'</p></div></div><button type="button" class="archive-point-close" data-archive-point-close aria-label="Tutup rincian">×</button></div>'+
 '<div class="archive-point-modal-body">'+
 '<div class="archive-point-metrics"><div><span>Total '+kind+'</span><strong class="'+(income?'is-income':'is-expense')+'">'+fmt(info.claimed)+'</strong></div><div><span>Jumlah Transaksi Rinci</span><strong>'+info.rows.length+' transaksi</strong></div></div>'+
 warning+reconcile+
 '<div class="archive-point-section-title"><h4>🍩 Komposisi per Kelompok</h4><small>Proporsi terhadap total '+kind.toLowerCase()+'</small></div>'+
 compositionMarkup+
 '<div class="archive-point-section-title"><h4>📋 Daftar Transaksi per Tanggal</h4><small>'+info.rows.length+' transaksi · '+dates.size+' tanggal</small></div>'+
 (items||'<div class="archive-point-empty">Tidak ada transaksi rinci yang tersedia untuk periode ini.</div>')+
 '</div>';
}
function archiveClosePointDialog(restoreFocus=true){
 if(!archivePointDialog)return;
 const dlg=archivePointDialog,origin=archivePointOrigin;
 archivePointDialog=null;archivePointOrigin=null;
 if(dlg.open)dlg.close();
 dlg.remove();
 if(restoreFocus&&origin?.isConnected)origin.focus({preventScroll:true});
}
function archiveOpenPointDialog(point){
 const month=point?.dataset.archiveTrendPoint,type=point?.dataset.archiveTrendType;
 const data=archivePointDetails(month,type);
 if(!data)return;
 archiveClosePointDialog(false);
 archivePointOrigin=point;
 const dlg=document.createElement('dialog');
 dlg.className='archive-point-dialog';dlg.setAttribute('aria-labelledby','archive-point-heading');
 dlg.innerHTML=archivePointContent(data);
 archivePointDialog=dlg;
 document.body.append(dlg);
 dlg.addEventListener('click',event=>{
  event.stopPropagation();
  if(event.target===dlg||event.target.closest('[data-archive-point-close]'))archiveClosePointDialog();
 });
 dlg.addEventListener('cancel',event=>{event.preventDefault();archiveClosePointDialog()});
 dlg.addEventListener('keydown',event=>{event.stopPropagation();});
 if(typeof dlg.showModal==='function')dlg.showModal();
 else dlg.setAttribute('open','');
 dlg.querySelector('[data-archive-point-close]')?.focus({preventScroll:true});
}
function archiveSelectPoint(target){
 const chart=target?.closest('.archive-dashboard-trend');
 const month=target?.dataset.archiveTrendPoint;
 if(!chart||!/^\d{4}-\d{2}$/.test(String(month||'')))return;
 const matched=[...chart.querySelectorAll('[data-archive-trend-point]')].filter(el=>el.dataset.archiveTrendPoint===month);
 const income=matched.find(el=>el.dataset.archiveTrendType==='income');
 const expense=matched.find(el=>el.dataset.archiveTrendType==='expense');
 chart.querySelectorAll('[data-archive-trend-point]').forEach(el=>el.classList.toggle('is-picked',el.dataset.archiveTrendPoint===month));
 archiveOpenPointDialog(target);
}
document.addEventListener('click',e=>{
 const point=e.target.closest?.('[data-archive-trend-point]');
 if(point){e.preventDefault();archiveSelectPoint(point);}
});
document.addEventListener('keydown',e=>{
 if(!['Enter',' '].includes(e.key))return;
 const point=e.target.closest?.('[data-archive-trend-point]');
 if(point){e.preventDefault();archiveSelectPoint(point);}
});
document.addEventListener('click',event=>{
 const btn=event.target.closest?.('[data-archive-quick-scroll]');
 if(!btn)return;
 const track=btn.closest('.archive-quick-section')?.querySelector('.archive-quick-list');
 if(!track)return;
 event.preventDefault();
 track.scrollBy({left:Number(btn.dataset.archiveQuickScroll)*Math.max(270,track.clientWidth*.7),behavior:'smooth'});
});
window.PAAX_ARCHIVE={renderPage,exportPdf,localInsight};
})();