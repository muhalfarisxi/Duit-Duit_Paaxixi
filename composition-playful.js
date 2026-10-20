/* Duit-Duit Paaxixi: Komposisi Pengeluaran v3.
   Tampilan saja: membaca nilai yang sudah dihitung oleh dashboard. */
(()=>{
 'use strict';
 const $=(root,sel)=>root?.querySelector(sel);
 const all=(root,sel)=>[...(root?.querySelectorAll(sel)||[])];
 const rupiah=n=>'Rp'+Math.round(n).toLocaleString('id-ID');
 const compact=n=>n>=1e9?'Rp'+(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':n>=1e6?'Rp'+(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':n>=1e3?'Rp'+(n/1e3).toLocaleString('id-ID',{maximumFractionDigits:0})+' rb':rupiah(n);
 const el=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 function arc(a,b){
  const radius=89,c=120,size=b-a,gap=Math.min(.85,size*.16);
  a+=gap;b-=gap;
  if(b-a>=359.9)b=a+359.8;
  const pt=t=>[c+radius*Math.cos((t-90)*Math.PI/180),c+radius*Math.sin((t-90)*Math.PI/180)];
  const p=pt(a),q=pt(b);
  return 'M '+p.map(v=>v.toFixed(3)).join(' ')+' A 89 89 0 '+(b-a>180?'1':'0')+' 1 '+q.map(v=>v.toFixed(3)).join(' ');
 }
 function enhance(){
  const card=document.getElementById('composition-card');
  if(!card||card.dataset.liveChart==='ready')return;
  const legend=$(card,'.comp-donut-legend'),donut=$(card,'.comp-donut'),original=$(card,'.comp-insight');
  if(!legend||!donut||!original)return;
  const originalRows=all(legend,'.comp-legend-item');
  const rows=originalRows.map((node,index)=>{
   const title=$(node,'.comp-legend-name')?.textContent?.trim()||'Kelompok';
   const full=$(node,'.comp-legend-amount')?.textContent?.trim()||'Rp0';
   const amount=Number(full.replace(/[^0-9]/g,''))||0;
   const percent=parseInt($(node,'.comp-legend-percent')?.textContent||'0',10)||0;
   const symbol=$(node,'.category-symbol')?.textContent?.trim()||'💰';
   const color=node.dataset.compColor||'#2563eb';
   return {title,amount,percent,symbol,color,index};
  }).filter(r=>r.amount>0);
  if(!rows.length)return;
  card.dataset.liveChart='ready';
  const total=rows.reduce((sum,row)=>sum+row.amount,0),top=rows[0],runner=rows[1]||null;
  const topCat=$($(original,'.comp-insight-big'),'strong')||$(original,'.comp-insight-big strong');
  const biggestPos=topCat?.textContent?.trim()||'';
  const topPosPercent=$(original,'.comp-insight-big .comp-insight-pct')?.textContent?.trim()||'';
  const dates=$(card,'.comp-summary')?.textContent||'';
  const countMatch=dates.match(/(\d+)\s*Transaksi/i);
  const txCount=countMatch?Number(countMatch[1]):null;
  const overview=(top.percent>=60?'Pengeluaran cukup terkonsentrasi. ':'Porsi pengeluaran terbagi di beberapa kategori. ')+
   top.title+' menempati urutan pertama dengan '+top.percent+'% ('+rupiah(top.amount)+') dari '+rupiah(total)+'.'+
   (runner?' Posisi berikutnya '+runner.title+' sebesar '+runner.percent+'%.':'')+
   (biggestPos?' Pada tingkat pos, sorotan terbesar adalah '+biggestPos+(topPosPercent?' ('+topPosPercent+')':'')+'.':'');
  const advice=(top.percent>=60?'Karena '+top.title+' menyerap lebih dari setengah pengeluaran, mulailah meninjau rincian pos di kelompok ini. ':
   'Bandingkan beberapa kategori terbesar terlebih dahulu sebelum memutuskan penghematan. ')+
   'Gunakan “Atur Analisis → Per Pos Pengeluaran” untuk melihat penyusunnya. Bandingkan dengan kebutuhan dan anggaran; porsi besar tidak otomatis berarti boros. '+
   'Cocokkan catatan dengan mutasi rekening, e-wallet, dan transaksi tunai untuk mengecek kelengkapannya.';
  // Cute but factual headline.
  const intro=el('div','comp-live-intro');
  intro.append(
   el('span','comp-live-pill',(txCount===null?'📊 Komposisi terfilter':'🧾 '+txCount+' transaksi')),
   el('span','comp-live-pill live-champion','👑 Terbesar: '+top.title+' '+top.percent+'%')
  );
  $(card,'.comp-header')?.after(intro);
  // Replace the visual ring only, preserving the center created by the existing page.
  donut.style.background='none';
  const center=$(card,'#composition-donut-center');
  center?.prepend(el('span','comp-live-mascot','🪙'));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','comp-live-svg');
  svg.setAttribute('viewBox','0 0 240 240');
  svg.setAttribute('role','group');
  svg.setAttribute('aria-label','Diagram cincin interaktif. Tekan Tab lalu Enter untuk memilih kategori.');
  const track=document.createElementNS('http://www.w3.org/2000/svg','circle');
  for(const [name,value] of [['cx','120'],['cy','120'],['r','89'],['class','comp-live-track']])track.setAttribute(name,value);
  svg.appendChild(track);
  const slices=[];
  let cursor=0;
  rows.forEach((row,i)=>{
   const start=cursor;cursor+=row.amount/total*360;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',arc(start,cursor));
   path.setAttribute('stroke',row.color);
   path.setAttribute('class','comp-live-segment'+(i===0?' champion':''));
   path.setAttribute('role','button');
   path.setAttribute('tabindex','0');
   path.setAttribute('aria-pressed','false');
   path.setAttribute('aria-label',row.title+', '+rupiah(row.amount)+', '+row.percent+' persen');
   const mid=(start+cursor)*Math.PI/360-Math.PI/2;
   path.style.setProperty('--push-x',(Math.cos(mid)*4).toFixed(2)+'px');
   path.style.setProperty('--push-y',(Math.sin(mid)*4).toFixed(2)+'px');
   path.style.setProperty('--appearance-delay',i*70+'ms');
   svg.appendChild(path);slices.push(path);
  });
  donut.prepend(svg);
  // New interactive legend keeps the same values as the built-in breakdown.
  const legendButtons=[];
  legend.replaceChildren();
  rows.forEach((row,i)=>{
   const button=el('button','comp-live-legend'+(i===0?' champion':''));
   button.type='button';
   button.setAttribute('aria-pressed','false');
   button.setAttribute('aria-label','Lihat rincian '+row.title+', '+row.percent+' persen');
   button.style.setProperty('--live-color',row.color);
   button.style.setProperty('--appearance-delay',i*55+'ms');
   const main=el('span','comp-live-legend-top');
   const icon=el('span','comp-live-legend-emoji',row.symbol);
   icon.setAttribute('aria-hidden','true');
   const label=el('span','comp-live-legend-copy');
   label.append(el('strong','',row.title),el('small','',rupiah(row.amount)));
   main.append(icon,label,el('span','comp-live-legend-percent',row.percent+'%'));
   const bar=el('span','comp-live-bar');
   bar.setAttribute('aria-hidden','true');
   const fill=el('i','');
   fill.style.width=Math.max(.5,row.amount/total*100)+'%';
   bar.append(fill);
   button.append(main,bar);
   legend.appendChild(button);
   legendButtons.push(button);
  });
  // Rincian tidak lagi memenuhi dashboard; semua dibuka sebagai dialog ringkas.
  const overlay=el('div','comp-live-backdrop');
  const dialog=el('section','comp-live-dialog');
  overlay.setAttribute('aria-hidden','true');
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-labelledby','comp-live-dialog-title');
  dialog.setAttribute('tabindex','-1');
  const modalHead=el('div','comp-live-dialog-head');
  const modalHeading=el('div','comp-live-dialog-titlewrap');
  const modalIcon=el('span','comp-live-dialog-icon','🍩');
  modalIcon.setAttribute('aria-hidden','true');
  const modalWords=el('div','');
  const modalTitle=el('h3','','Bedah Pengeluaran');
  modalTitle.id='comp-live-dialog-title';
  const modalSubtitle=el('p','','Lihat sorotan dan langkah berikutnya ✨');
  modalWords.append(modalTitle,modalSubtitle);
  modalHeading.append(modalIcon,modalWords);
  const closeBtn=el('button','comp-live-close','✕');
  closeBtn.type='button';
  closeBtn.setAttribute('aria-label','Tutup analisis');
  modalHead.append(modalHeading,closeBtn);
  dialog.append(modalHead);overlay.append(dialog);
  const chooser=el('div','comp-live-chooser');
  chooser.setAttribute('role','group');chooser.setAttribute('aria-label','Pilih kategori untuk dianalisis');
  const chooserLabel=el('span','comp-live-chooser-label','🧩 Pilih kategori');
  const chooserList=el('div','comp-live-chooser-list');
  chooser.append(chooserLabel,chooserList);
  const focus=el('section','comp-live-focus');
  focus.setAttribute('aria-live','polite');
  const face=el('span','comp-live-focus-face','🐻');
  face.setAttribute('aria-hidden','true');
  const focusCopy=el('div','comp-live-focus-copy');
  const focusHeading=el('strong','', '👑 '+top.title+' · '+top.percent+'%');
  const focusDescription=el('p','', 'Klik irisan atau legend untuk membedah komposisi pengeluaran ini.');
  focusCopy.append(focusHeading,focusDescription);focus.append(face,focusCopy);
  // Three actual analysis views: overall, selected, action.
  const box=el('section','comp-live-insights');
  box.setAttribute('aria-label','Insight interaktif pengeluaran');
  const title=el('div','comp-live-insight-head');
  title.append(el('strong','','🧠 Uangnya Lari ke Mana?'),el('span','','✦ INSIGHT PAAXIXI'));
  const tabs=el('div','comp-live-tabs');
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Jenis insight');
  const pages=el('div','comp-live-pages');
  const descriptions=[
   {id:'overview',label:'✨ Sorotan',title:'📊 Ini yang paling menonjol',text:overview,foot:'Persentase dihitung dari pengeluaran sesuai filter saat ini, bukan saldo rekening.'},
   {id:'detail',label:'🔎 Bedah Pilihan',title:'🧩 Intip rincian kategori',text:'Klik legend atau potongan donut, nanti ceritanya berubah mengikuti pilihanmu.',foot:'Klik kategori yang sama lagi untuk kembali ke total pengeluaran.'},
   {id:'action',label:'💡 Saran Pintar',title:'💌 Catatan kecil untuk dompetmu',text:advice,foot:'Insight bersifat indikasi, bukan bukti pemborosan atau transaksi yang tertinggal.'}
  ];
  let detailText=null,actionText=null;
  function showTab(id){
   all(tabs,'[data-live-tab]').forEach(node=>node.setAttribute('aria-selected',String(node.dataset.liveTab===id)));
   all(pages,'[data-live-pane]').forEach(node=>node.hidden=node.dataset.livePane!==id);
  }
  descriptions.forEach(page=>{
   const button=el('button','comp-live-tab',page.label);
   button.type='button';button.dataset.liveTab=page.id;
   button.setAttribute('role','tab');button.setAttribute('aria-selected',String(page.id==='overview'));
   button.setAttribute('aria-controls','comp-live-pane-'+page.id);
   button.id='comp-live-tab-'+page.id;
   button.addEventListener('click',()=>showTab(page.id));
   tabs.append(button);
   const pane=el('div','comp-live-pane');
   pane.dataset.livePane=page.id;pane.id='comp-live-pane-'+page.id;
   pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',button.id);
   pane.hidden=page.id!=='overview';
   const story=el('p','',page.text);
   if(page.id==='detail')detailText=story;
   if(page.id==='action')actionText=story;
   pane.append(el('h4','',page.title),story,el('small','',page.foot));
   pages.append(pane);
  });
  box.append(title,tabs,pages);
  dialog.append(chooser,focus,box);
  const mini=el('div','comp-live-mini');
  const miniCopy=el('div','comp-live-mini-copy');
  miniCopy.append(el('strong','','👑 '+top.title+' · '+top.percent+'%'),el('span','','Porsi terbesar · '+rupiah(top.amount)));
  const viewButton=el('button','comp-live-open','✨ Lihat Analisis');
  viewButton.type='button';
  viewButton.setAttribute('aria-haspopup','dialog');
  mini.append(miniCopy,viewButton);
  original.replaceWith(mini);
  let lastFocus=null;
  function closeModal(){
   if(!overlay.isConnected)return;
   overlay.remove();
   document.body.classList.remove('comp-live-dialog-open');
   overlay.setAttribute('aria-hidden','true');
   locked=-1;
   paint(-1);
   if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
  }
  function openModal(tab='overview'){
   if(!card.isConnected)return;
   lastFocus=document.activeElement;
   document.body.appendChild(overlay);
   document.body.classList.add('comp-live-dialog-open');
   overlay.removeAttribute('aria-hidden');
   showTab(tab);
   closeBtn.focus({preventScroll:true});
  }
  viewButton.addEventListener('click',()=>{
   locked=-1;paint(-1);openModal('overview');
  });
  closeBtn.addEventListener('click',closeModal);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeModal();});
  overlay.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    event.preventDefault();event.stopPropagation();closeModal();return;
   }
   if(event.key!=='Tab')return;
   const focusable=all(dialog,'button:not(:disabled),[href],[tabindex]:not([tabindex="-1"])').filter(x=>!x.hidden&&x.getClientRects().length);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){
    event.preventDefault();first.focus();
   }
  });
  const onCardRemoved=new MutationObserver(()=>{
   if(!card.isConnected){
    overlay.remove();
    document.body.classList.remove('comp-live-dialog-open');
    onCardRemoved.disconnect();
   }
  });
  onCardRemoved.observe(document.getElementById('content')||card.parentElement,{childList:true});
  // Hover untuk preview, klik kategori untuk popup. Data transaksi tetap tidak berubah.
  let locked=-1;
  function paint(index){
   const picked=index<0?null:rows[index];
   svg.classList.toggle('is-exploring',!!picked);
   slices.forEach((slice,i)=>{
    slice.classList.toggle('is-active',i===index);
    slice.setAttribute('aria-pressed',String(i===locked));
   });
   legendButtons.forEach((button,i)=>{
    button.classList.toggle('is-active',i===index);
    button.setAttribute('aria-pressed',String(i===locked));
   });
   const caption=$(center,'[data-comp-center-caption]');
   const amount=$(center,'[data-comp-center-value]');
   const name=$(center,'[data-comp-center-label]');
   if(caption)caption.textContent=picked?'PORSI PILIHAN':'TOTAL KELUAR';
   if(amount)amount.textContent=picked?compact(picked.amount):compact(total);
   if(name)name.textContent=picked?picked.title:'Seluruh Pengeluaran';
   if(focusHeading)focusHeading.textContent=picked?'🎯 '+picked.title+' · '+picked.percent+'%':'👑 '+top.title+' · '+top.percent+'%';
   if(focusDescription)focusDescription.textContent=picked?
    'Sebesar '+rupiah(picked.amount)+' dari '+rupiah(total)+' total terfilter. '+(picked.amount>total/2?'Lebih besar daripada gabungan kategori lainnya.':'Sisa kategori lain '+rupiah(total-picked.amount)+'.'):
    'Kategorinya bisa kamu eksplorasi satu per satu. Klik untuk menyematkan pilihan.';
   all(chooserList,'.comp-live-chooser-chip').forEach((chip,i)=>{
    chip.setAttribute('aria-pressed',String(i===locked));
    chip.classList.toggle('active',i===index);
   });
   if(detailText)detailText.textContent=picked?
    picked.title+' berkontribusi '+picked.percent+'% ('+rupiah(picked.amount)+') dari total terfilter. '+
     (runner&&picked.title===top.title?'Selisih terhadap '+runner.title+': '+rupiah(Math.max(0,top.amount-runner.amount))+'. ':'')+
     'Pilih Per Pos di Atur Analisis untuk membedah lebih jauh.':
    overview;
   if(actionText)actionText.textContent=picked?
    'Cek rincian '+picked.title+' senilai '+rupiah(picked.amount)+'. Bandingkan dengan kebutuhan dan anggaran. '+(picked.percent>=60?'Porsi ini cukup dominan, tetapi belum tentu boros. ':'')+'Cocokkan dengan mutasi rekening atau e-wallet bila perlu.':
    advice;
  }
  function toggle(index){
   locked=index;
   paint(index);
   openModal('detail');
  }
  rows.forEach((row,i)=>{
   const chip=el('button','comp-live-chooser-chip',row.symbol+' '+row.title+' · '+row.percent+'%');
   chip.type='button';
   chip.setAttribute('aria-pressed','false');
   chip.style.setProperty('--live-color',row.color);
   chip.addEventListener('click',()=>{locked=i;paint(i);showTab('detail');});
   chooserList.append(chip);
   const button=legendButtons[i],path=slices[i];
   button.addEventListener('mouseenter',()=>paint(i));
   button.addEventListener('mouseleave',()=>paint(locked));
   button.addEventListener('focus',()=>paint(i));
   button.addEventListener('blur',()=>paint(locked));
   button.addEventListener('click',()=>toggle(i));
   path.addEventListener('mouseenter',()=>paint(i));
   path.addEventListener('mouseleave',()=>paint(locked));
   path.addEventListener('focus',()=>paint(i));
   path.addEventListener('blur',()=>paint(locked));
   path.addEventListener('click',()=>toggle(i));
   path.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(i);}
   });
  });
  if(rows.length>3){
   const more=el('button','comp-live-show-more','🧩 Lihat '+(rows.length-3)+' kategori lainnya ↗');
   more.type='button';
   more.addEventListener('click',()=>{locked=-1;paint(-1);openModal('detail');});
   legend.append(more);
  }
  paint(-1);
 }
 // The dashboard replaces #content after filter/date/cloud changes.
 function init(){
  const content=document.getElementById('content');
  if(!content)return;
  const observer=new MutationObserver(enhance);
  observer.observe(content,{childList:true});
  enhance();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();