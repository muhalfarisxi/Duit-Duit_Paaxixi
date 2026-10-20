/* Duit-Duit Paaxixi — donut ringkas; navigasi kelompok diatur oleh index.html.
   Hanya presentasi, tidak pernah menulis transaksi/anggaran. */
(()=>{
 'use strict';
 const find=(root,q)=>root?.querySelector(q);
 const query=(root,q)=>[...(root?.querySelectorAll(q)||[])];
 const money=n=>'Rp'+Math.round(n).toLocaleString('id-ID');
 const compact=n=>n>=1e9?'Rp'+(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':n>=1e6?'Rp'+(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':n>=1e3?'Rp'+(n/1e3).toLocaleString('id-ID',{maximumFractionDigits:0})+' rb':money(n);
 const make=(tag,cls,txt)=>{
  const element=document.createElement(tag);if(cls)element.className=cls;
  if(txt!==undefined)element.textContent=txt;
  return element;
 };
 function arc(start,end){
  const r=89,c=120,gap=Math.min(.85,(end-start)*.16);
  let a=start+gap,b=end-gap;if(b-a>=359.9)b=a+359.7;
  const point=d=>[c+r*Math.cos((d-90)*Math.PI/180),c+r*Math.sin((d-90)*Math.PI/180)];
  const p=point(a),q=point(b);
  return 'M '+p.map(n=>n.toFixed(2)).join(' ')+' A 89 89 0 '+(b-a>180?1:0)+' 1 '+q.map(n=>n.toFixed(2)).join(' ');
 }
 function enhance(){
  const card=document.getElementById('composition-card');
  if(!card||card.dataset.liveChart==='ready')return;
  const donut=find(card,'.comp-donut'),legend=find(card,'.comp-donut-legend');
  if(!donut||!legend)return;
  const previous=query(legend,'.comp-legend-item');
  const rows=previous.map(node=>({
   label:find(node,'.comp-legend-name')?.textContent?.trim()||'Kategori',
   icon:find(node,'.category-symbol')?.textContent?.trim()||'🧩',
   amount:Number((find(node,'.comp-legend-amount')?.textContent||'0').replace(/[^0-9]/g,''))||0,
   percent:parseInt(find(node,'.comp-legend-percent')?.textContent||'0',10)||0,
   color:node.dataset.compColor||'#2563eb'
  })).filter(row=>row.amount>0);
  if(!rows.length)return;
  card.dataset.liveChart='ready';
  const total=rows.reduce((sum,row)=>sum+row.amount,0);
  donut.style.background='none';
  const center=find(card,'#composition-donut-center');
  if(center)center.prepend(make('span','comp-live-mascot','🪙'));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','comp-live-svg');
  svg.setAttribute('viewBox','0 0 240 240');
  svg.setAttribute('role','group');
  svg.setAttribute('aria-label','Komposisi pengeluaran. Pilih warna dengan Tab dan Enter.');
  const track=document.createElementNS('http://www.w3.org/2000/svg','circle');
  [['cx','120'],['cy','120'],['r','89'],['class','comp-live-track']].forEach(([name,value])=>track.setAttribute(name,value));
  svg.append(track);
  const paths=[],buttons=[];
  let angle=0,locked=-1;
  function paint(index){
   const chosen=index>=0?rows[index]:null;
   svg.classList.toggle('is-exploring',!!chosen);
   paths.forEach((path,i)=>{
    path.classList.toggle('is-active',i===index);
    path.setAttribute('aria-pressed',String(i===locked));
   });
   buttons.forEach((button,i)=>{
    button.classList.toggle('is-active',i===index);
    button.setAttribute('aria-pressed',String(i===locked));
   });
   const caption=find(center,'[data-comp-center-caption]');
   const value=find(center,'[data-comp-center-value]');
   const label=find(center,'[data-comp-center-label]');
   if(caption)caption.textContent=chosen?'PORSI DIPILIH':'TOTAL KELUAR';
   if(value)value.textContent=compact(chosen?chosen.amount:total);
   if(label)label.textContent=chosen?chosen.label:'Semua Pengeluaran';
  }
  function choose(index){locked=locked===index?-1:index;paint(locked);}
  const newLegend=document.createDocumentFragment();
  rows.forEach((row,i)=>{
   const start=angle;angle+=row.amount/total*360;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',arc(start,angle));
   path.setAttribute('stroke',row.color);
   path.setAttribute('class','comp-live-segment'+(i===0?' champion':''));
   path.setAttribute('role','button');
   path.setAttribute('tabindex','0');
   path.setAttribute('aria-pressed','false');
   path.setAttribute('aria-label',row.label+', '+row.percent+' persen, '+money(row.amount));
   const mid=(start+angle)*Math.PI/360-Math.PI/2;
   path.style.setProperty('--push-x',(Math.cos(mid)*4).toFixed(2)+'px');
   path.style.setProperty('--push-y',(Math.sin(mid)*4).toFixed(2)+'px');
   path.style.setProperty('--appearance-delay',i*55+'ms');
   paths.push(path);svg.append(path);
   const button=make('button','comp-live-legend'+(i===0?' champion':''));
   button.type='button';button.setAttribute('aria-pressed','false');
   button.setAttribute('aria-label',row.label+', '+money(row.amount)+', '+row.percent+' persen');
   button.style.setProperty('--live-color',row.color);
   button.style.setProperty('--appearance-delay',i*50+'ms');
   const top=make('span','comp-live-legend-top');
   const emoji=make('span','comp-live-legend-emoji',row.icon);emoji.setAttribute('aria-hidden','true');
   const copy=make('span','comp-live-legend-copy');
   copy.append(make('strong','',row.label),make('small','',money(row.amount)));
   top.append(emoji,copy,make('span','comp-live-legend-percent',row.percent+'%'));
   const bar=make('span','comp-live-bar');bar.setAttribute('aria-hidden','true');
   const fill=make('i','');fill.style.width=(row.amount/total*100).toFixed(3)+'%';bar.append(fill);
   button.append(top,bar);buttons.push(button);newLegend.append(button);
   const preview=()=>paint(i),restore=()=>paint(locked);
   button.addEventListener('mouseenter',preview);
   button.addEventListener('mouseleave',restore);
   button.addEventListener('focus',preview);
   button.addEventListener('blur',restore);
   button.addEventListener('click',()=>choose(i));
   path.addEventListener('mouseenter',preview);
   path.addEventListener('mouseleave',restore);
   path.addEventListener('focus',preview);
   path.addEventListener('blur',restore);
   path.addEventListener('click',()=>choose(i));
   path.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(i);}
   });
  });
  donut.prepend(svg);
  legend.replaceChildren(newLegend);
  // Tidak ada kartu insight/legend tambahan di bawah distribusi.
  find(card,'.comp-insight')?.remove();
  paint(-1);
 }
 function init(){
  const content=document.getElementById('content');if(!content)return;
  const observer=new MutationObserver(enhance);
  observer.observe(content,{childList:true});
  enhance();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();