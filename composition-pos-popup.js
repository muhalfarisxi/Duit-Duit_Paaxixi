/* Duit-Duit Paaxixi — Grafik seluruh pos di popup. Visualisasi baca-saja. */
(()=>{
 'use strict';
 const money=n=>'Rp'+Math.round(n||0).toLocaleString('id-ID');
 const compact=n=>n>=1e9?'Rp'+(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':n>=1e6?'Rp'+(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':n>=1e3?'Rp'+(n/1e3).toLocaleString('id-ID',{maximumFractionDigits:0})+' rb':money(n);
 const pct=(x,t)=>t>0?Math.round(x/t*100):0;
 const make=(tag,cls,value)=>{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(value!==undefined)item.textContent=value;
  return item;
 };
 const svgEl=(tag,attrs={})=>{
  const item=document.createElementNS('http://www.w3.org/2000/svg',tag);
  Object.entries(attrs).forEach(([k,v])=>item.setAttribute(k,v));
  return item;
 };
 function arc(start,end){
  const gap=Math.min(.6,(end-start)*.16);
  let a=start+gap,b=end-gap;
  if(b-a>=359.9)b=a+359.7;
  const point=d=>[120+82*Math.cos((d-90)*Math.PI/180),120+82*Math.sin((d-90)*Math.PI/180)];
  const first=point(a),last=point(b);
  return 'M '+first.map(n=>n.toFixed(3)).join(' ')+' A 82 82 0 '+(b-a>180?'1':'0')+' 1 '+last.map(n=>n.toFixed(3)).join(' ');
 }
 let closeCurrent=null;
 function open(card,opener){
  if(typeof closeCurrent==='function')closeCurrent(false);
  let entries=[];
  try{entries=JSON.parse(card.dataset.compPosList||'[]');}catch(_){entries=[];}
  if(!Array.isArray(entries))entries=[];
  entries=entries.filter(e=>e&&typeof e.id==='string'&&typeof e.label==='string')
   .map(e=>({id:e.id,label:e.label,group:e.group||'',icon:e.icon||'💸',
    color:/^#[0-9a-fA-F]{6}$/.test(e.color||'')?e.color:'#2563eb',value:Math.max(0,Number(e.value)||0)}))
   .sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'id'));
  const total=entries.reduce((sum,item)=>sum+item.value,0),largest=entries[0]||null;
  const overlay=make('div','comp-pos-overlay');
  overlay.id='comp-pos-overlay';
  const dialog=make('section','comp-pos-modal');
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-labelledby','comp-pos-heading');
  dialog.setAttribute('tabindex','-1');
  const header=make('div','comp-pos-header');
  const headingWrap=make('div','comp-pos-heading-wrap');
  const icon=make('span','comp-pos-heading-icon','🍩');icon.setAttribute('aria-hidden','true');
  const titleWrap=make('div','');
  const title=make('h3','','Komposisi Per Pos');title.id='comp-pos-heading';
  const subtitle=make('p','',(card.dataset.compPosPeriod||'Periode terpilih')+' · '+entries.length+' pos');
  titleWrap.append(title,subtitle);headingWrap.append(icon,titleWrap);
  const closeButton=make('button','comp-pos-close','✕');
  closeButton.type='button';closeButton.setAttribute('aria-label','Tutup grafik per pos');
  header.append(headingWrap,closeButton);
  const body=make('div','comp-pos-body');
  const visual=make('div','comp-pos-visual');
  const chart=make('div','comp-pos-donut');
  const svg=svgEl('svg',{viewBox:'0 0 240 240',role:'group','aria-label':'Diagram komposisi seluruh pos pengeluaran. Tekan Tab dan Enter untuk menyorot pos.'});
  svg.appendChild(svgEl('circle',{cx:'120',cy:'120',r:'82',class:'comp-pos-track'}));
  const center=make('div','comp-pos-center');
  const face=make('span','comp-pos-face','🪙');face.setAttribute('aria-hidden','true');
  const centerLabel=make('small','','Total Pengeluaran');
  const centerValue=make('strong','',compact(total));
  const centerHint=make('span','',entries.length+' pos');
  center.append(face,centerLabel,centerValue,centerHint);chart.append(svg,center);
  const insight=make('div','comp-pos-insight');
  const insightHead=make('strong','','👑 Porsi Paling Besar');
  const insightText=make('p','','');
  insight.append(insightHead,insightText);
  const reset=make('button','comp-pos-reset','↺ Lihat Total');
  reset.type='button';
  visual.append(chart,insight,reset);
  const listing=make('div','comp-pos-listing');
  const listHead=make('div','comp-pos-list-head');
  listHead.append(make('strong','','🏷️ Semua Pos'),make('small','',entries.length+' pos · '+entries.filter(e=>e.value>0).length+' terpakai'));
  const list=make('div','comp-pos-list');
  listing.append(listHead,list);
  body.append(visual,listing);
  const foot=make('div','comp-pos-foot','Semua pos yang sesuai filter ditampilkan, termasuk yang belum memiliki transaksi (0%).');
  dialog.append(header,body,foot);overlay.append(dialog);
  const rows=[],paths=[];
  let active=-1;
  function paint(index){
   active=index;
   const picked=entries[index]||null;
   rows.forEach((r,i)=>{r.classList.toggle('active',i===index);r.setAttribute('aria-pressed',String(i===index));});
   svg.classList.toggle('comp-pos-is-selecting',!!picked);
   paths.forEach(({item,segment})=>{segment.classList.toggle('selected',item===picked);segment.classList.toggle('dim',!!picked&&item!==picked);segment.setAttribute('aria-pressed',String(item===picked));});
   centerLabel.textContent=picked?picked.label:'Total Pengeluaran';
   centerValue.textContent=compact(picked?picked.value:total);
   centerHint.textContent=picked?pct(picked.value,total)+'% dari total':entries.length+' pos';
   insightHead.textContent=picked?'🔎 '+picked.label:(largest?'👑 Paling Besar':'🌱 Belum Ada Pos');
   insightText.textContent=picked?
    (money(picked.value)+' ('+pct(picked.value,total)+'%) pada periode ini. '+(picked.value?'Angka besar belum otomatis berarti boros.':'Belum ada transaksi tercatat pada pos ini.')):
    (largest&&total?largest.label+' menyumbang '+pct(largest.value,total)+'% dari '+money(total)+'. Pilih salah satu pos untuk melihat bagiannya.':'Belum ada pengeluaran yang tercatat dalam filter ini.');
  }
  function choose(i){paint(active===i?-1:i);}
  let angle=0;
  entries.forEach((item,i)=>{
   const ratio=pct(item.value,total);
   const row=make('button','comp-pos-row');
   row.type='button';row.setAttribute('aria-pressed','false');
   row.style.setProperty('--pos-color',item.color);
   row.setAttribute('aria-label',item.label+', '+money(item.value)+', '+ratio+' persen');
   const line=make('span','comp-pos-row-line');
   const emoji=make('span','comp-pos-row-emoji',item.icon);emoji.setAttribute('aria-hidden','true');
   const label=make('span','comp-pos-row-name');label.append(make('strong','',item.label),make('small','',item.group));
   const amount=make('span','comp-pos-row-amount',money(item.value));
   const ratioText=make('span','comp-pos-row-percent',ratio+'%');
   line.append(emoji,label,amount,ratioText);
   const bar=make('span','comp-pos-bar');bar.setAttribute('aria-hidden','true');
   const fill=make('i','');fill.style.width=(total>0?item.value/total*100:0)+'%';bar.append(fill);
   row.append(line,bar);row.addEventListener('click',()=>choose(i));list.append(row);rows.push(row);
   if(item.value>0&&total>0){
    const start=angle;angle+=item.value/total*360;
    const mid=(start+angle)*Math.PI/360-Math.PI/2;
    const path=svgEl('path',{d:arc(start,angle),stroke:item.color,role:'button',tabindex:'0',
     'aria-label':item.label+' '+ratio+' persen','aria-pressed':'false',class:'comp-pos-arc'});
    path.style.setProperty('--px',(Math.cos(mid)*4).toFixed(2)+'px');
    path.style.setProperty('--py',(Math.sin(mid)*4).toFixed(2)+'px');
    path.addEventListener('click',()=>choose(i));
    path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(i);}});
    path.addEventListener('mouseenter',()=>paint(i));
    path.addEventListener('mouseleave',()=>paint(active)); // click selection is persistent below
    svg.append(path);paths.push({item,segment:path});
   }
  });
  // Keep hover previews separate from the committed selection.
  let chosen=-1;
  rows.forEach((row,i)=>{
   row.addEventListener('mouseenter',()=>paint(i));
   row.addEventListener('mouseleave',()=>paint(chosen));
   row.addEventListener('focus',()=>paint(i));
   row.addEventListener('blur',()=>paint(chosen));
   row.addEventListener('click',()=>{chosen=chosen===i?-1:i;paint(chosen);});
  });
  paths.forEach(({item,segment})=>{
   const i=entries.indexOf(item);
   segment.addEventListener('mouseenter',()=>paint(i));
   segment.addEventListener('mouseleave',()=>paint(chosen));
   segment.addEventListener('focus',()=>paint(i));
   segment.addEventListener('blur',()=>paint(chosen));
   segment.addEventListener('click',()=>{chosen=chosen===i?-1:i;paint(chosen);});
  });
  reset.addEventListener('click',()=>{chosen=-1;paint(-1);});
  function dispose(restore=true){
   observer.disconnect();
   overlay.remove();
   document.body.classList.remove('comp-pos-modal-open');
   document.removeEventListener('keydown',onKey,true);
   closeCurrent=null;
   if(restore&&opener.isConnected)opener.focus({preventScroll:true});
  }
  const observer=new MutationObserver(()=>{if(!card.isConnected)dispose(false);});
  observer.observe(document.getElementById('content')||document.body,{childList:true});
  function onKey(e){
   if(!overlay.isConnected)return;
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dispose();return;}
   if(e.key!=='Tab')return;
   const focusable=[...dialog.querySelectorAll('button:not([disabled]),svg [tabindex="0"]')].filter(x=>x.getClientRects().length);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable.at(-1);
   if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
  }
  overlay.addEventListener('click',e=>{if(e.target===overlay)dispose();});
  closeButton.addEventListener('click',()=>dispose());
  document.addEventListener('keydown',onKey,true);
  document.body.append(overlay);
  document.body.classList.add('comp-pos-modal-open');
  closeCurrent=dispose;
  paint(-1);
  closeButton.focus({preventScroll:true});
 }
 document.addEventListener('click',e=>{
  const launch=e.target.closest?.('#composition-card [data-comp-pos-launch]');
  if(launch){
   const card=launch.closest('#composition-card');
   if(card)open(card,launch);
  }
 });
})();