/* Duit-Duit Paaxixi — komposisi chart v7.
   Legend kelompok berada di tombol pemilih atas; irisan memakai label langsung.
   Tidak menulis/mengubah transaksi, rekening, filter, atau cloud. */
(()=>{
 'use strict';
 const get=(root,selector)=>root?.querySelector(selector);
 const getAll=(root,selector)=>[...(root?.querySelectorAll(selector)||[])];
 const money=value=>'Rp'+Math.round(value||0).toLocaleString('id-ID');
 const compact=value=>value>=1e9?'Rp'+(value/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':
  value>=1e6?'Rp'+(value/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':
  value>=1e3?'Rp'+(value/1e3).toLocaleString('id-ID',{maximumFractionDigits:0})+' rb':money(value);
 const node=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 };
 const vector=(tag,attrs={})=>{
  const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
  Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));
  return el;
 };
 const xy=(deg,r,cx,cy)=>{
  const theta=(deg-90)*Math.PI/180;
  return {x:cx+r*Math.cos(theta),y:cy+r*Math.sin(theta)};
 };
 function arc(from,to,r,cx,cy){
  const size=to-from,trim=Math.min(.6,size*.16);
  let a=from+trim,b=to-trim;if(b-a>=359.9)b=a+359.75;
  const first=xy(a,r,cx,cy),last=xy(b,r,cx,cy);
  return 'M '+first.x.toFixed(2)+' '+first.y.toFixed(2)+
   ' A '+r+' '+r+' 0 '+(b-a>180?'1':'0')+' 1 '+last.x.toFixed(2)+' '+last.y.toFixed(2);
 }
 function enhance(){
  const card=document.getElementById('composition-card');
  if(!card||card.dataset.liveChart==='ready')return;
  const distribution=get(card,'.comp-distribution');
  const legend=get(card,'.comp-donut-legend');
  if(!distribution||!legend)return;
  const rows=getAll(legend,'.comp-legend-item').map(item=>({
   name:get(item,'.comp-legend-name')?.textContent?.trim()||'Kategori',
   icon:get(item,'.category-symbol')?.textContent?.trim()||'🏷️',
   amount:Number((get(item,'.comp-legend-amount')?.textContent||'0').replace(/[^0-9]/g,''))||0,
   color:item.dataset.compColor||'#2563eb'
  })).filter(item=>item.amount>0);
  if(!rows.length)return;
  card.dataset.liveChart='ready';
  const total=rows.reduce((acc,item)=>acc+item.amount,0);
  const selectedGroup=!!get(card,'.comp-direct-groups .comp-group-colored[aria-pressed="true"]');
  const stage=node('div','comp-recap-stage');
  stage.setAttribute('aria-label',selectedGroup?'Komposisi per pos di kelompok terpilih':'Komposisi per kelompok pengeluaran');
  const desktop=node('div','comp-recap-wide');
  const mobile=node('div','comp-recap-narrow');
  const left=[],right=[];
  let angle=0;
  const figures=rows.map((item,index)=>{
   const start=angle,span=item.amount/total*360;angle+=span;
   const midpoint=start+span/2;
   const side=Math.sin((midpoint)*Math.PI/180)>=0?'right':'left';
   const figure={...item,index,start,end:angle,mid:midpoint,side,percentage:Math.round(item.amount/total*100)};
   (side==='right'?right:left).push(figure);
   return figure;
  });
  const maxItems=Math.max(left.length,right.length);
  const height=Math.max(315,Math.round(maxItems*56+56));
  const cx=320,cy=height/2,radius=87;
  const canvas=vector('svg',{viewBox:'0 0 640 '+height,role:'group',
   'aria-label':'Donut dengan label nominal dan persentase untuk setiap '+(selectedGroup?'pos':'kelompok')});
  const track=vector('circle',{cx,cy,r:radius,fill:'none',stroke:'#e8effa','stroke-width':32});
  canvas.append(track);
  const connectorLayer=vector('g',{class:'comp-recap-connectors'});
  const arcLayer=vector('g',{class:'comp-recap-arcs'});
  const labelLayer=vector('g',{class:'comp-recap-labels'});
  canvas.append(connectorLayer,arcLayer,labelLayer);
  const center=node('div','comp-recap-center');
  const value=node('strong','',compact(total));center.append(value);
  desktop.append(canvas,center);
  // A responsive donut and a narrow adjacent annotation rail for phone widths.
  const smallRing=node('div','comp-recap-small-ring');
  const smallSvg=vector('svg',{viewBox:'0 0 240 240',role:'group','aria-label':'Grafik komposisi interaktif'});
  smallSvg.append(vector('circle',{cx:120,cy:120,r:88,fill:'none',stroke:'#e8effa','stroke-width':32}));
  const smallCenter=node('div','comp-recap-small-center');
  const smallValue=node('strong','',compact(total));smallCenter.append(smallValue);
  smallRing.append(smallSvg,smallCenter);
  const smallRail=node('div','comp-recap-rail');smallRail.setAttribute('aria-label','Label persentase dan nominal di sisi donut');
  mobile.append(smallRing,smallRail);
  stage.append(desktop,mobile);
  const shapes=[],labels=[],mobileLabels=[];
  let locked=-1;
  function paint(index){
   const chosen=index>=0?figures[index]:null;
   value.textContent=compact(chosen?chosen.amount:total);
   smallValue.textContent=value.textContent;
   canvas.classList.toggle('is-exploring',!!chosen);
   smallSvg.classList.toggle('is-exploring',!!chosen);
   shapes.forEach(({wide,narrow},i)=>{
    for(const path of [wide,narrow]){
     path.classList.toggle('is-active',i===index);
     path.setAttribute('aria-pressed',String(i===locked));
    }
   });
   labels.forEach((el,i)=>{el.classList.toggle('is-active',i===index);el.setAttribute('aria-pressed',String(i===locked));});
   mobileLabels.forEach((el,i)=>{el.classList.toggle('is-active',i===index);el.setAttribute('aria-pressed',String(i===locked));});
  }
  const choose=index=>{locked=locked===index?-1:index;paint(locked);};
  function connect(el,index){
   el.addEventListener('mouseenter',()=>paint(index));
   el.addEventListener('mouseleave',()=>paint(locked));
   el.addEventListener('focus',()=>paint(index));
   el.addEventListener('blur',()=>paint(locked));
   el.addEventListener('click',()=>choose(index));
   if(el.namespaceURI==='http://www.w3.org/2000/svg'){
    el.addEventListener('keydown',event=>{
     if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(index);}
    });
   }
  }
  figures.forEach((entry,i)=>{
   const props={stroke:entry.color,fill:'none',role:'button',tabindex:0,
    'aria-label':entry.name+', '+entry.percentage+' persen, '+money(entry.amount),
    'aria-pressed':'false'};
   const wide=vector('path',{...props,d:arc(entry.start,entry.end,radius,cx,cy),class:'comp-recap-arc'});
   const mobilePath=vector('path',{...props,d:arc(entry.start,entry.end,88,120,120),class:'comp-recap-arc'});
   const push=xy(entry.mid,4,0,0);
   wide.style.setProperty('--recap-push-x',push.x.toFixed(2)+'px');
   wide.style.setProperty('--recap-push-y',push.y.toFixed(2)+'px');
   mobilePath.style.setProperty('--recap-push-x',push.x.toFixed(2)+'px');
   mobilePath.style.setProperty('--recap-push-y',push.y.toFixed(2)+'px');
   wide.style.setProperty('--recap-delay',i*65+'ms');
   mobilePath.style.setProperty('--recap-delay',i*65+'ms');
   arcLayer.append(wide);smallSvg.append(mobilePath);
   shapes.push({wide,narrow:mobilePath});
   connect(wide,i);connect(mobilePath,i);
   const mini=node('button','comp-recap-rail-label');
   mini.type='button';mini.setAttribute('aria-pressed','false');mini.style.setProperty('--recap-color',entry.color);
   const top=node('span','comp-recap-rail-name',entry.icon+' '+entry.name);
   const detail=node('span','comp-recap-rail-data',entry.percentage+'% · '+money(entry.amount));
   mini.append(top,detail);mini.setAttribute('aria-label',entry.name+', '+entry.percentage+' persen, '+money(entry.amount));
   smallRail.append(mini);mobileLabels.push(mini);connect(mini,i);
  });
  // Label positions are distributed separately on either side of the ring to prevent collisions.
  for(const list of [left,right]){
   list.sort((a,b)=>xy(a.mid,118,cx,cy).y-xy(b.mid,118,cx,cy).y);
   list.forEach((entry,j)=>{
    const x=entry.side==='left'?7:471;
    const slot=cy+(j-(list.length-1)/2)*56;
    const origin=xy(entry.mid,109,cx,cy);
    const destX=entry.side==='left'?181:459;
    const elbowX=entry.side==='left'?222:418;
    const connector=vector('path',{
     d:'M '+origin.x.toFixed(2)+' '+origin.y.toFixed(2)+
       ' L '+elbowX+' '+slot.toFixed(2)+' L '+destX+' '+slot.toFixed(2),
     stroke:entry.color,fill:'none','stroke-width':1.7,
     'stroke-linecap':'round',opacity:.72
    });
    connectorLayer.append(connector);
    const g=vector('g',{class:'comp-recap-callout',role:'button',tabindex:0,'aria-pressed':'false',
     'aria-label':entry.name+', '+entry.percentage+' persen, '+money(entry.amount)});
    const plate=vector('rect',{x,y:slot-24,width:162,height:48,rx:12,fill:'#f8fbff',
     stroke:entry.color,'stroke-opacity':.44,'stroke-width':1.25});
    const name=vector('text',{x:x+10,y:slot-5,class:'comp-recap-callout-name',fill:entry.color});
    name.textContent=entry.icon+' '+entry.name;
    const detail=vector('text',{x:x+10,y:slot+12,class:'comp-recap-callout-data'});
    detail.textContent=entry.percentage+'% · '+money(entry.amount);
    g.append(plate,name,detail);labelLayer.append(g);
    labels[entry.index]=g;connect(g,entry.index);
   });
  }
  distribution.replaceWith(stage);
  get(card,'.comp-insight')?.remove();
  get(card,'.comp-live-intro')?.remove();
  get(card,'.comp-live-mini')?.remove();
  paint(-1);
 }
 function init(){
  const content=document.getElementById('content');if(!content)return;
  const observer=new MutationObserver(enhance);observer.observe(content,{childList:true});
  enhance();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();