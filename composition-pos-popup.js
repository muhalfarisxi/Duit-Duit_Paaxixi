/* Duit-Duit Paaxixi — Popup multi donut per kelompok.
   Persentase di setiap donut dihitung terhadap TOTAL KELOMPOK, bukan keseluruhan.
   Semua data dibaca dari atribut kartu komposisi; tidak ada perubahan database. */
(()=>{
 'use strict';
 const el=(tag,cls,txt)=>{
  const node=document.createElement(tag);if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=txt;
  return node;
 };
 const svgNode=(tag,attrs={})=>{
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));
  return node;
 };
 const money=n=>'Rp'+Math.round(n||0).toLocaleString('id-ID');
 const short=n=>n>=1e9?'Rp'+(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':
  n>=1e6?'Rp'+(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':
  n>=1000?'Rp'+(n/1000).toLocaleString('id-ID',{maximumFractionDigits:0})+' rb':money(n);
 const percent=(n,d)=>d>0?Math.round(n/d*100):0;
 const color=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#2563eb';
 function arc(a,b){
  const gap=Math.min(.6,(b-a)*.17);
  a+=gap;b-=gap;if(b-a>=359.8)b=a+359.7;
  const point=d=>[120+83*Math.cos((d-90)*Math.PI/180),120+83*Math.sin((d-90)*Math.PI/180)];
  const start=point(a),end=point(b);
  return 'M '+start.map(v=>v.toFixed(3)).join(' ')+' A 83 83 0 '+(b-a>180?1:0)+' 1 '+end.map(v=>v.toFixed(3)).join(' ');
 }
 function chartGroup(group,groupIndex,overall){
  const items=group.items.map(item=>({
   ...item,value:Math.max(0,Number(item.value)||0),color:color(item.color)
  })).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'id'));
  const total=items.reduce((sum,item)=>sum+item.value,0),positive=items.filter(x=>x.value>0);
  const section=el('section','comp-multi-card');
  const header=el('div','comp-multi-card-head');
  const top=el('div','comp-multi-card-title');
  const icon=el('span','comp-multi-card-symbol',group.icon||'🧩');icon.setAttribute('aria-hidden','true');
  const text=el('span','comp-multi-card-heading');
  text.append(el('strong','',group.name),el('small','',items.length+' pos · '+positive.length+' terpakai'));
  top.append(icon,text);
  const aggregate=el('span','comp-multi-card-aggregate',money(total));
  header.append(top,aggregate);section.append(header);
  const body=el('div','comp-multi-card-body');
  const visual=el('div','comp-multi-card-visual');
  const donut=el('div','comp-multi-donut');
  const svg=svgNode('svg',{viewBox:'0 0 240 240',role:'group','aria-label':'Donut komposisi '+group.name+'. Tab untuk memilih irisan.'});
  svg.append(svgNode('circle',{cx:120,cy:120,r:83,class:'comp-multi-track'}));
  const center=el('div','comp-multi-center');
  const centerLabel=el('span','comp-multi-label','TOTAL');
  const centerValue=el('strong','',short(total));
  const centerExtra=el('small','',positive.length+' pos terpakai');
  center.append(centerLabel,centerValue,centerExtra);donut.append(svg,center);
  const note=el('div','comp-multi-note','👑 '+(positive[0]?.label||'Belum ada pengeluaran'));
  visual.append(donut,note);
  const list=el('div','comp-multi-rows');
  list.setAttribute('role','group');
  list.setAttribute('aria-label','Daftar pos '+group.name);
  const rowButtons=[],paths=[];
  let locked=-1;
  const paint=index=>{
   const picked=items[index]||null;
   centerLabel.textContent=picked?'PORSI POS':'TOTAL';
   centerValue.textContent=short(picked?picked.value:total);
   centerExtra.textContent=picked?percent(picked.value,total)+'% dari kelompok':positive.length+' pos terpakai';
   svg.classList.toggle('is-exploring',!!picked);
   paths.forEach(({node,entry})=>{
    node.classList.toggle('picked',entry===picked);
    node.classList.toggle('muted',!!picked&&entry!==picked);
    node.setAttribute('aria-pressed',String(entry===items[locked]));
   });
   rowButtons.forEach((row,i)=>{
    row.classList.toggle('selected',i===index);
    row.setAttribute('aria-pressed',String(i===locked));
   });
   if(picked){
    note.textContent=picked.icon+' '+picked.label+' · '+percent(picked.value,total)+'% kelompok'+
      (overall?' · '+percent(picked.value,overall)+'% keseluruhan':'');
   }else{
    note.textContent=total?'👑 '+positive[0].label+' memimpin ('+percent(positive[0].value,total)+'%)':'🌱 Belum ada pengeluaran';
   }
  };
  const toggle=index=>{locked=locked===index?-1:index;paint(locked);};
  let cursor=0;
  items.forEach((item,i)=>{
   const row=el('button','comp-multi-row');
   row.type='button';row.style.setProperty('--multi-color',item.color);row.setAttribute('aria-pressed','false');
   row.setAttribute('aria-label',item.label+' '+money(item.value)+' '+percent(item.value,total)+' persen dari kelompok');
   const content=el('span','comp-multi-row-line');
   const emoji=el('span','comp-multi-row-icon',item.icon||'🏷️');emoji.setAttribute('aria-hidden','true');
   const label=el('span','comp-multi-row-label',item.label);
   const cash=el('span','comp-multi-row-cash',short(item.value));
   const ratio=el('span','comp-multi-row-ratio',percent(item.value,total)+'%');
   content.append(emoji,label,cash,ratio);
   const meter=el('span','comp-multi-meter');meter.setAttribute('aria-hidden','true');
   const bar=el('i','');bar.style.width=(total?item.value/total*100:0)+'%';meter.append(bar);
   row.append(content,meter);list.append(row);rowButtons.push(row);
   row.addEventListener('mouseenter',()=>paint(i));row.addEventListener('mouseleave',()=>paint(locked));
   row.addEventListener('focus',()=>paint(i));row.addEventListener('blur',()=>paint(locked));
   row.addEventListener('click',()=>toggle(i));
   if(item.value>0&&total>0){
    const start=cursor;cursor+=item.value/total*360;
    const mid=(start+cursor)*Math.PI/360-Math.PI/2;
    const path=svgNode('path',{d:arc(start,cursor),stroke:item.color,class:'comp-multi-arc',role:'button',
     tabindex:0,'aria-pressed':'false','aria-label':item.label+' '+percent(item.value,total)+' persen'});
    path.style.setProperty('--multi-x',(Math.cos(mid)*4).toFixed(2)+'px');
    path.style.setProperty('--multi-y',(Math.sin(mid)*4).toFixed(2)+'px');
    path.style.setProperty('--multi-delay',i*60+'ms');
    path.addEventListener('mouseenter',()=>paint(i));path.addEventListener('mouseleave',()=>paint(locked));
    path.addEventListener('focus',()=>paint(i));path.addEventListener('blur',()=>paint(locked));
    path.addEventListener('click',()=>toggle(i));
    path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(i);}});
    svg.append(path);paths.push({node:path,entry:item});
   }
  });
  body.append(visual,list);section.append(body);
  if(!items.length)section.append(el('p','comp-multi-empty','Belum ada pos dalam kelompok ini.'));
  if(!total)section.classList.add('no-spending');
  paint(-1);
  return section;
 }
 let activeClose=null;
 function open(card,opener){
  if(activeClose)activeClose(false);
  let raw=[];
  try{raw=JSON.parse(card.dataset.compPosGroups||'[]');}catch(_){raw=[];}
  if(!Array.isArray(raw))raw=[];
  const groups=raw.filter(g=>g&&typeof g.name==='string'&&Array.isArray(g.items))
   .map(g=>({
    name:g.name,icon:typeof g.icon==='string'?g.icon:'🧩',
    color:color(g.color),
    items:g.items.filter(x=>x&&typeof x.label==='string'&&typeof x.id==='string')
     .map(x=>({id:x.id,label:x.label,icon:typeof x.icon==='string'?x.icon:'🏷️',
      color:color(x.color),value:Math.max(0,Number(x.value)||0)}))
   }));
  const total=groups.reduce((sum,g)=>sum+g.items.reduce((sub,item)=>sub+item.value,0),0);
  const overlay=el('div','comp-pos-overlay comp-multi-overlay');
  const dialog=el('section','comp-pos-modal comp-multi-modal');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-labelledby','comp-multi-heading');
  const head=el('div','comp-pos-header');
  const headGroup=el('div','comp-pos-heading-wrap');
  const icon=el('span','comp-pos-heading-icon','🍩');icon.setAttribute('aria-hidden','true');
  const words=el('div','');
  const h=el('h3','','Grafik Pengeluaran per Pos');h.id='comp-multi-heading';
  words.append(h,el('p','',(card.dataset.compPosPeriod||'Periode terpilih')+' · '+groups.length+' kelompok · '+groups.reduce((n,g)=>n+g.items.length,0)+' pos'));
  headGroup.append(icon,words);
  const close=el('button','comp-pos-close','✕');close.type='button';close.setAttribute('aria-label','Tutup grafik');
  head.append(headGroup,close);
  const overview=el('div','comp-multi-total');
  overview.append(el('span','','💸 Total pengeluaran sesuai periode'),el('strong','',money(total)));
  const grid=el('div','comp-multi-grid');
  groups.forEach((g,i)=>grid.append(chartGroup(g,i,total)));
  if(!groups.length)grid.append(el('p','comp-multi-empty','Belum ada kelompok pengeluaran.'));
  const foot=el('div','comp-pos-foot','Setiap donut menampilkan porsi pos terhadap total kelompoknya. Klik pos atau irisan untuk mengeksplorasi, tanpa mengubah data.');
  dialog.append(head,overview,grid,foot);overlay.append(dialog);
  const onKey=e=>{
   if(!overlay.isConnected)return;
   if(e.key==='Escape'){e.stopPropagation();e.preventDefault();dispose();return;}
   if(e.key!=='Tab')return;
   const focusable=[...dialog.querySelectorAll('button:not(:disabled),svg [tabindex="0"]')].filter(node=>node.getClientRects().length);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable.at(-1);
   if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
  };
  const observer=new MutationObserver(()=>{if(!card.isConnected)dispose(false);});
  const dispose=(restore=true)=>{
   observer.disconnect();
   overlay.remove();
   document.body.classList.remove('comp-pos-modal-open');
   document.removeEventListener('keydown',onKey,true);
   activeClose=null;
   if(restore&&opener.isConnected)opener.focus({preventScroll:true});
  };
  observer.observe(document.getElementById('content')||document.body,{childList:true});
  overlay.addEventListener('click',e=>{if(e.target===overlay)dispose();});
  close.addEventListener('click',()=>dispose());
  document.addEventListener('keydown',onKey,true);
  document.body.append(overlay);document.body.classList.add('comp-pos-modal-open');
  activeClose=dispose;close.focus({preventScroll:true});
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('#composition-card [data-comp-pos-launch]');
  if(button)open(button.closest('#composition-card'),button);
 });
})();