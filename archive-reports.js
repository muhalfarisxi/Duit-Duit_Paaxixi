/* Arsip Laporan v2 – UI interaktif dan PDF vektor berwarna tanpa layanan eksternal. */
(function(){
'use strict';
const COLORS=['#2a71e6','#16a378','#ef7182','#8b69da','#f1af3c','#27a7bb','#ed9564','#8093b6'];
const num=v=>Number(v)||0;
const fmt=v=>'Rp '+Math.round(num(v)).toLocaleString('id-ID');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monthText=s=>{if(!/^\d{4}-\d{2}$/.test(String(s)))return String(s||'');const [y,m]=s.split('-').map(Number);return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));};
const dateText=s=>{const d=String(s||'').split('-');return d.length===3?d[2]+' '+new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(+d[0],+d[1]-1,1))+' '+d[0]:String(s||'');};
const shortMoney=v=>{const n=num(v);return Math.abs(n)>=1e9?(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':Math.abs(n)>=1e6?(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':Math.abs(n)>=1e3?(n/1e3).toLocaleString('id-ID',{maximumFractionDigits:0})+' rb':String(Math.round(n));};
const sum=(a,key)=>a.reduce((n,v)=>n+num(v[key]),0);
function groupExpenses(r){
 const list=new Map();
 (r.expenseBreakdown||[]).forEach(x=>{if(num(x.spent)<=0)return;const k=x.group||'Lainnya';list.set(k,(list.get(k)||0)+num(x.spent));});
 return [...list].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
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
function chartDonut(r){
 const groups=groupExpenses(r).slice(0,6),total=sum(groups,'value');
 if(!total)return '<div class="archive-blank">Belum ada data pengeluaran untuk grafik.</div>';
 let cursor=0;
 const slices=groups.map((x,i)=>{const next=cursor+x.value/total*100;const segment=COLORS[i%COLORS.length]+' '+cursor.toFixed(2)+'% '+next.toFixed(2)+'%';cursor=next;return segment;}).join(',');
 return '<div class="archive-donut-layout"><div class="archive-donut" style="background:conic-gradient('+slices+')" role="img" aria-label="Komposisi pengeluaran"><div><small>Total Keluar</small><strong>'+esc(shortMoney(r.expense))+'</strong></div></div><div class="archive-donut-legend">'+groups.map((x,i)=>'<div><span class="archive-legend-name"><i style="background:'+COLORS[i%COLORS.length]+'"></i>'+esc(x.name)+'</span><strong>'+((x.value/total)*100).toFixed(1).replace('.',',')+'%</strong></div>').join('')+'</div></div>';
}
function chartTrend(r){
 const rows=months6(r),highest=Math.max(1,...rows.map(x=>Math.max(num(x.income),num(x.expense))));
 return '<div class="archive-trend"><div class="archive-trend-legend"><span><i class="is-income"></i>Pemasukan</span><span><i class="is-expense"></i>Pengeluaran</span></div><div class="archive-trend-plot">'+rows.map((v,i)=>{const a=Math.max(2,num(v.income)/highest*100),b=Math.max(2,num(v.expense)/highest*100);return '<div class="archive-trend-slot" title="'+esc(monthText(v.month)+' · Masuk '+fmt(v.income)+' · Keluar '+fmt(v.expense))+'"><div class="archive-trend-bars"><span class="archive-bar is-income" style="height:'+a+'%;animation-delay:'+(i*70)+'ms"></span><span class="archive-bar is-expense" style="height:'+b+'%;animation-delay:'+(i*70+65)+'ms"></span></div><small>'+esc((v.month||'').slice(5))+'/'+esc((v.month||'').slice(2,4))+'</small></div>';}).join('')+'</div></div>';
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
function renderPage(data){
 const r=data.report,months=data.history||[],saved=!!data.saved,sel=data.month||r.month;
 const totalBank=sum(r.balances||[],'balance'),invest=r.investment||{unavailable:true},investValue=invest.unavailable?null:num(invest.market);
 const investSubtitle=invest.unavailable?'Arsip lama · nilai tidak direkam':(invest.assets||[]).length+' jenis aset tercatat';
 return '<div class="archive-v2">'
  +'<div class="archive-intro"><div><span class="archive-kicker">✦ LAPORAN KEUANGAN BULANAN</span><h2>Rapor Keuangan <span>✦</span></h2><p>Ringkasan, grafik, dan analisis dalam satu laporan. Rincian transaksi ada di lampiran.</p></div><span class="archive-intro-ornament" aria-hidden="true">📊</span></div>'
  +'<div class="archive-toolbar"><div class="archive-picker"><span>🗓️</span><label><small>Periode Laporan</small><input id="report-month" type="month" aria-label="Pilih bulan laporan" value="'+esc(sel)+'"></label></div><div class="archive-status '+(saved?'is-saved':'')+'"><span>'+(saved?'✓':'◌')+'</span><div><small>Status Bulan</small><strong>'+(saved?'Arsip tersimpan':'Pratinjau belum disimpan')+'</strong></div></div><div class="archive-toolbar-actions"><button class="btn teal archive-save-btn" data-action="save-report">'+(saved?'↻ Perbarui Arsip':'✦ Simpan Arsip')+'</button><button class="btn archive-pdf-btn" data-action="print-report" '+(saved?'':'disabled title="Simpan arsip dahulu untuk mengunduh PDF"')+'>⬇ Unduh PDF Berwarna</button></div></div>'
  +'<div class="archive-summary-grid">'
  +card('💚','Pemasukan',r.income,'green','Uang masuk pada bulan ini')
  +card('🧡','Pengeluaran',r.expense,'coral','Uang keluar untuk belanja')
  +card('💜','Investasi',investValue,'purple',investSubtitle)
  +card('🏦','Saldo Rekening',totalBank,'blue','Saldo seluruh rekening pada akhir bulan')
  +'</div>'
  +'<div class="archive-net-strip"><span>✦ Arus Kas Bersih</span><strong class="'+(num(r.net)>=0?'is-positive':'is-negative')+'">'+fmt(r.net)+'</strong><small>Selisih pemasukan dan pengeluaran, tidak termasuk mutasi rekening dan pembelian aset</small></div>'
  +'<div class="archive-panels"><section class="archive-panel"><h3>🍩 Komposisi Pengeluaran</h3>'+chartDonut(r)+'</section><section class="archive-panel"><h3>📈 Tren Pemasukan & Pengeluaran</h3>'+chartTrend(r)+'</section></div>'
  +'<section class="archive-ai-panel">'+insightMarkup(r)+'</section>'
  +'<div class="archive-lower"><section class="archive-panel archive-attachment"><div><h3>📋 Lampiran Transaksi</h3><span class="archive-mini-tag">Per tanggal · '+(r.transactions||[]).length+' transaksi</span></div>'+transactionsPreview(r)+'</section>'
  +'<section class="archive-panel archive-history"><h3>📚 Arsip Bulanan</h3><div class="archive-history-list">'+(months.length?months.map(item=>'<div class="archive-history-row '+(item.month===sel?'is-active':'')+'"><div><strong>'+esc(monthText(item.month))+'</strong><small>Keluar '+fmt(item.expense)+'</small></div><div class="archive-history-actions"><button class="btn sm" data-open-report="'+esc(item.month)+'">Buka</button><button class="btn sm danger" data-delete-report="'+esc(item.month)+'" title="Hapus arsip bulan ini">×</button></div></div>').join(''):'<p class="archive-no-history">Belum ada arsip tersimpan.</p>')+'</div><small class="archive-history-note">Arsip merupakan snapshot; perubahan transaksi tidak mengubah arsip tanpa diperbarui.</small></section></div>'
  +'<div class="archive-report-foot">✨ PDF berwarna memuat ringkasan keuangan, akun dan investasi, grafik, analisis AI (bila tersedia), dan semua transaksi sebagai lampiran per tanggal. '+(!saved?'Simpan arsip untuk membekukan angka laporan.':'')+'</div></div>';
}
/* Portable PDF 1.4 renderer (A4, warna vektor); PDF tetap dapat diunduh tanpa CDN. */
function pdfReport(r){
 const W=595,H=842,enc=new TextEncoder(),pages=[];
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
  rect(0,0,W,106,'#112c52');rect(0,103,W,4,'#57b5e5');
  text('DUIT-DUIT PAAXIXI  |  LAPORAN BULANAN',37,37,12,true,'#ffffff');
  text(title,37,65,17,true,'#ffffff');
  text(monthText(r.month),37,91,9,false,'#cae9ff');
  rect(37,814,521,1,'#d8e4f4');text('Arsip '+dateText((r.createdAt||'').slice(0,10))+'  |  Laporan snapshot',37,827,7,false,'#647994');
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
 newPage('RINGKASAN KEUANGAN');
 text('Periode '+monthText(r.month),38,138,11,true,'#345578');
 kpi(37,156,'TOTAL PEMASUKAN',r.income,'#168b68');kpi(308,156,'TOTAL PENGELUARAN',r.expense,'#df596d');
 kpi(37,255,'NILAI INVESTASI',r.investment?num(r.investment.market):null,'#7857ce');kpi(308,255,'SALDO REKENING',sum(r.balances||[],'balance'),'#2672bf');
 y=369;rect(37,y,521,54,num(r.net)>=0?'#e5f6f0':'#fff0f2');text('ARUS KAS BERSIH',52,y+23,10,true,'#27415d');text(fmt(r.net),304,y+28,18,true,num(r.net)>=0?'#137b59':'#ce465c');y+=78;
 heading('KOMPOSISI PENGELUARAN');
 let groups=groupExpenses(r),max=Math.max(1,...groups.map(x=>x.value));
 if(!groups.length){text('Belum ada pengeluaran tercatat.',40,y+14,10,false,'#71849d');y+=30;}
 else groups.slice(0,7).forEach((g,i)=>{need(37);text(g.name.slice(0,37),40,y+7,9,true,'#314c6c');text(fmt(g.value),427,y+7,9,true,COLORS[i%COLORS.length]);rect(40,y+17,505,8,'#edf2fa');rect(40,y+17,505*g.value/max,8,COLORS[i%COLORS.length]);y+=39;});
 need(70);rect(37,y+12,521,48,'#edf4fd');multi('Rekening tidak termasuk nilai investasi. Nilai investasi menggunakan harga aset yang tercatat saat arsip dibuat, bukan harga historis otomatis.',49,y+29,94,8,'#3c587a',12);
 newPage('GRAFIK DAN ANALISIS');
 heading('TREN KEUANGAN - ENAM BULAN');
 const trend=months6(r),mx=Math.max(1,...trend.map(x=>Math.max(num(x.income),num(x.expense))));
 rect(38,y,520,205,'#f3f7ff');const top=y+20,base=y+175,step=480/trend.length;
 for(let n=0;n<=4;n++){const yy=base-(155*n/4);line(56,yy,543,yy,'#dce7f6');text(shortMoney(mx*n/4),43,yy-4,7,false,'#68819b');}
 trend.forEach((m,i)=>{const center=60+(i+.5)*step,bw=Math.min(25,step*.29);const a=155*num(m.income)/mx,b=155*num(m.expense)/mx;rect(center-bw-2,base-a,bw,a,'#21b68b');rect(center+2,base-b,bw,b,'#ef7b8a');text((m.month||'').slice(5),center-8,base+15,8,false,'#516987');});
 text('Hijau: pemasukan   |   Merah: pengeluaran',60,top+5,8,false,'#4e6d91');y+=225;
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
 y+=17;heading('UTANG / PIUTANG BELUM LUNAS');
 const dues=(r.debts||[]).filter(x=>num(x.remaining)>0);
 dues.forEach((d,i)=>tableRow([d.type==='receivable'?'Piutang':'Utang',d.person,fmt(d.remaining)],[100,240,170],{index:i,size:9,height:28}));
 if(!dues.length){text('Tidak ada utang atau piutang tertunggak yang tercatat.',43,y+10,9);y+=26;}
 y+=17;heading('ANGGARAN DAN REALISASI PENGELUARAN');
 (r.expenseBreakdown||[]).filter(x=>num(x.spent)>0||num(x.budget)>0).forEach((x,i)=>tableRow([x.group+' / '+x.label,fmt(x.budget),fmt(x.spent)],[261,126,126],{index:i,size:8,height:27}));
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
 const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const pagesId=add(''),children=[];
 pages.forEach((cmd,i)=>{
  const footer='BT /F1 8 Tf '+rgb('#57718c')+' rg 1 0 0 1 470 20 Tm (Halaman '+(i+1)+' / '+pages.length+') Tj ET\n';
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
 a.href=url;a.download='Duit-Duit-Paaxixi-Laporan-'+r.month+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
window.PAAX_ARCHIVE={renderPage,exportPdf,localInsight};
})();