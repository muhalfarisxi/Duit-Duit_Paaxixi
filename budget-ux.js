/* Enhanced period and budget selectors — presentation only; existing form validation and persistence remain authoritative. */
(function(){
'use strict';
function node(tag,cls,content){
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(content!==undefined)x.textContent=content;return x;
}
function formatMonth(value){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value||''))return 'Pilih bulan';
 var p=value.split('-');
 return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(+p[0],+p[1]-1,1));
}
function setupPeriod(){
 const label=document.querySelector('.month-pill.month-pill-highlight');
 const input=document.getElementById('month-input');
 if(!label||!input||label.dataset.budgetUx==='ready')return;
 label.dataset.budgetUx='ready';label.tabIndex=0;label.setAttribute('role','button');
 label.setAttribute('aria-label','Pilih bulan untuk melihat seluruh catatan keuangan pada periode tersebut');
 label.title='Klik untuk melihat keuangan di bulan tertentu';
 const copy=node('span','budget-ux-period-copy');
 copy.append(node('span','budget-ux-period-top','PERIODE KEUANGAN'));
 const name=node('strong','budget-ux-period-name');copy.append(name);
 copy.append(node('small','budget-ux-period-hint','Klik untuk melihat bulan lain'));
 const caret=node('span','budget-ux-period-caret');caret.setAttribute('aria-hidden','true');
 label.insertBefore(copy,input);label.insertBefore(caret,input);
 const refresh=function(){name.textContent=formatMonth(input.value)};
 refresh();
 function open(e){
  if(e&&e.target===input)return;
  if(e)e.preventDefault();
  try{if(typeof input.showPicker==='function'){input.showPicker();return}}catch(error){}
  input.focus();input.click();
 }
 label.addEventListener('click',open);
 label.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.stopPropagation();open(e)}});
 input.addEventListener('change',function(){window.requestAnimationFrame(refresh)});
 new MutationObserver(refresh).observe(input,{attributes:true,attributeFilter:['value']});
 const content=document.getElementById('content');
 if(content)new MutationObserver(refresh).observe(content,{childList:true});
 // Other views change the input value property without changing its attribute.
 document.addEventListener('change',function(e){if(e.target===input)window.setTimeout(refresh,0)});
}
function splitOption(opt){
 const raw=(opt.textContent||'').trim();
 const pair=raw.split(' · ');
 const group=pair.length>1?pair.shift().trim():'Pos Lainnya';
 let name=pair.length?pair.join(' · ').trim():raw;
 const balance=name.match(/\s*\(Sisa\s+([^)]+)\)\s*$/i);
 if(balance)name=name.slice(0,balance.index).trim();
 return {value:opt.value,group:group,name:name,remaining:balance?balance[1]:''};
}

let activeBudgetPicker=null;
function closePicker(picker,restoreFocus=true){
 if(!picker)return;
 const trigger=picker.querySelector('[data-budget-picker-toggle]');
 if(activeBudgetPicker?.picker===picker){
  activeBudgetPicker.el.remove();
  activeBudgetPicker=null;
 }
 picker.classList.remove('is-open');
 trigger?.setAttribute('aria-expanded','false');
 if(restoreFocus&&trigger?.isConnected)trigger.focus({preventScroll:true});
}
function closeAll(except){
 document.querySelectorAll('.budget-viz-picker.is-open').forEach(function(p){
  if(p!==except)closePicker(p,false);
 });
}
function populatePicker(select){
 if(!select||select.dataset.budgetUx==='ready')return;
 select.dataset.budgetUx='ready';
 const wrapper=node('div','budget-viz-picker');
 wrapper.dataset.budgetPicker=select.name;
 select.parentNode.insertBefore(wrapper,select);
 wrapper.appendChild(select);
 select.classList.add('budget-viz-native');
 select.tabIndex=-1;
 const trigger=node('button','budget-viz-trigger');
 trigger.type='button';
 trigger.setAttribute('data-budget-picker-toggle','');
 trigger.setAttribute('aria-haspopup','dialog');
 trigger.setAttribute('aria-expanded','false');
 const symbol=node('span','budget-viz-selected-icon','📁');
 const info=node('span','budget-viz-trigger-info');
 const primary=node('strong','', 'Pilih pos pengeluaran');
 const secondary=node('small','','Pilih kelompok lalu pos, atau cari langsung');
 info.append(primary,secondary);
 const chevron=node('span','budget-viz-chevron');
 chevron.setAttribute('aria-hidden','true');
 trigger.append(symbol,info,chevron);
 wrapper.append(trigger);
 const role=select.name==='from'?'pos asal':select.name==='to'?'pos tujuan':'pos pengeluaran';
 const allOptions=Array.from(select.options).filter(function(o){return o.value!==''&&!o.disabled}).map(splitOption);
 const groups=new Map();
 allOptions.forEach(function(option){
  if(!groups.has(option.group))groups.set(option.group,[]);
  groups.get(option.group).push(option);
 });
 const tones=['#3785df','#20aa9a','#9670d9','#d99c46','#c46a9e','#4484b5'];
 function sync(){
  const selected=allOptions.find(function(o){return o.value===select.value});
  primary.textContent=selected?selected.name:'Pilih '+role;
  secondary.textContent=selected?selected.group+(selected.remaining?' · Sisa '+selected.remaining:''):'Pilih kelompok atau cari nama pos';
  symbol.textContent=selected?'📌':'📁';
 }
 sync();
 select.addEventListener('change',sync);
 function openPortal(){
  closeAll(wrapper);
  if(activeBudgetPicker)closePicker(activeBudgetPicker.picker,false);
  wrapper.classList.add('is-open');
  trigger.setAttribute('aria-expanded','true');
  const portal=node('div','budget-viz-portal');
  const shade=node('div','budget-viz-portal-shade');
  const panel=node('section','budget-viz-portal-panel');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label','Pilih '+role);
  const head=node('header','budget-viz-portal-head');
  const headIcon=node('span','budget-viz-portal-head-icon','🗂️');
  const words=node('div','budget-viz-portal-heading');
  words.append(node('small','', 'PILIH KELOMPOK & POS'));
  const heading=node('h3','', 'Pilih '+role);
  words.append(heading);
  const close=node('button','budget-viz-portal-close','×');
  close.type='button';close.setAttribute('aria-label','Tutup pemilih pos');
  head.append(headIcon,words,close);
  const guidance=node('p','budget-viz-portal-intro','Pilih kelompok terlebih dahulu, atau ketik nama pos untuk mencari dari seluruh kelompok.');
  const searchWrap=node('div','budget-viz-search-wrap');
  searchWrap.append(node('span','', '⌕'));
  const search=node('input','budget-viz-search');
  search.type='search';
  search.placeholder='Cari nama pos atau kelompok…';
  search.setAttribute('aria-label','Cari pos dari seluruh kelompok');
  searchWrap.append(search);
  const nav=node('div','budget-viz-portal-nav');
  const body=node('div','budget-viz-portal-content');
  panel.append(head,guidance,searchWrap,nav,body);
  portal.append(shade,panel);
  document.body.append(portal);
  activeBudgetPicker={el:portal,picker:wrapper};
  let selectedGroup=null;
  function choose(id){
   select.value=id;
   select.dispatchEvent(new Event('change',{bubbles:true}));
   sync();
   closePicker(wrapper);
  }
  function optionCard(option){
   const btn=node('button','budget-viz-portal-pos');
   btn.type='button';
   if(select.value===option.value)btn.classList.add('is-selected');
   const mark=node('span','budget-viz-portal-pos-icon','📌');
   const content=node('span','budget-viz-portal-pos-info');
   content.append(node('strong','',option.name));
   content.append(node('small','',option.group+(option.remaining?' · Sisa '+option.remaining:'')));
   const choice=node('span','budget-viz-portal-pos-check',select.value===option.value?'✓':'→');
   btn.append(mark,content,choice);
   btn.addEventListener('click',function(){choose(option.value)});
   return btn;
  }
  function paint(){
   const q=search.value.trim().toLocaleLowerCase('id-ID');
   body.replaceChildren();
   nav.replaceChildren();
   if(q){
    const matches=allOptions.filter(function(o){
     return (o.name+' '+o.group).toLocaleLowerCase('id-ID').includes(q);
    });
    nav.append(node('strong','budget-viz-search-count',matches.length+' pos ditemukan'));
    const list=node('div','budget-viz-portal-positions');
    matches.forEach(function(option){list.append(optionCard(option))});
    if(!matches.length)list.append(node('p','budget-viz-portal-empty','Tidak ditemukan. Coba kata lain atau pilih kelompok.'));
    body.append(list);
   }else if(selectedGroup===null){
    nav.append(node('strong','budget-viz-search-count','1 · Pilih kelompok ('+groups.size+')'));
    const grid=node('div','budget-viz-portal-groups');
    let i=0;
    groups.forEach(function(options,group){
     const button=node('button','budget-viz-portal-group');
     button.type='button';
     button.style.setProperty('--budget-viz-accent',tones[i%tones.length]);
     const name=group.toLocaleLowerCase('id-ID');
     const emoji=/living fix|rumah|pokok/.test(name)?'🏡':/playing|hiburan/.test(name)?'🎈':/lain/.test(name)?'✨':'🗂️';
     const icon=node('span','budget-viz-portal-group-icon',emoji);
     const labels=node('span','budget-viz-portal-group-words');
     labels.append(node('strong','',group),node('small','',options.length+' pos pengeluaran'));
     const arrow=node('span','budget-viz-portal-group-arrow','→');
     button.append(icon,labels,arrow);
     button.addEventListener('click',function(){
      selectedGroup=group;paint();
      panel.querySelector('.budget-viz-portal-pos')?.focus({preventScroll:true});
     });
     grid.append(button);
     i++;
    });
    if(!groups.size)body.append(node('p','budget-viz-portal-empty','Tidak ada pos tersedia untuk dipilih.'));
    body.append(grid);
   }else{
    const back=node('button','budget-viz-portal-back','← Semua kelompok');
    back.type='button';
    back.addEventListener('click',function(){selectedGroup=null;paint();panel.querySelector('.budget-viz-portal-group')?.focus({preventScroll:true})});
    nav.append(back,node('strong','budget-viz-search-count',selectedGroup+' · '+groups.get(selectedGroup).length+' pos'));
    const list=node('div','budget-viz-portal-positions');
    groups.get(selectedGroup).forEach(function(option){list.append(optionCard(option))});
    body.append(list);
   }
   body.scrollTop=0;
  }
  search.addEventListener('input',paint);
  search.addEventListener('keydown',function(e){
   if(e.key==='Enter'&&search.value.trim()){
    e.preventDefault();
    body.querySelector('.budget-viz-portal-pos')?.click();
   }
  });
  shade.addEventListener('click',function(){closePicker(wrapper)});
  close.addEventListener('click',function(){closePicker(wrapper)});
  paint();
  search.focus({preventScroll:true});
 }
 trigger.addEventListener('click',function(e){
  e.preventDefault();
  if(wrapper.classList.contains('is-open'))closePicker(wrapper);
  else openPortal();
 });
}
function setupAdjustType(form){
 const select=form.querySelector('select[name="type"]');
 if(!select||select.dataset.budgetUx==='ready')return;
 select.dataset.budgetUx='ready';select.classList.add('budget-viz-native');select.tabIndex=-1;
 const container=node('div','budget-ux-type-control');
  const guidance=node('p','budget-ux-type-guidance');
 ['increase','decrease'].forEach(function(type){
  const btn=node('button','budget-ux-type-option');btn.type='button';btn.dataset.type=type;
  const sign=node('span','budget-ux-type-sign',type==='increase'?'+':'−');
  btn.append(sign,node('span','',type==='increase'?'Tambah Anggaran':'Kurangi Anggaran'));container.append(btn);
  btn.addEventListener('click',function(){select.value=type;select.dispatchEvent(new Event('change',{bubbles:true}))});
 });
 select.insertAdjacentElement('afterend',container);
  container.insertAdjacentElement('afterend',guidance);
 function refresh(){container.querySelectorAll('.budget-ux-type-option').forEach(function(btn){const yes=btn.dataset.type===select.value;btn.classList.toggle('is-selected',yes);btn.setAttribute('aria-pressed',String(yes))});form.dataset.budgetAdjustmentType=select.value;guidance.textContent=select.value==='increase'?'↗ Tambahan anggaran akan menambah alokasi pos tanpa mengambil dari pos lainnya.':'↘ Pengurangan anggaran akan mengurangi alokasi efektif pos. Riwayat tetap tercatat.'}
 select.addEventListener('change',refresh);refresh();
}
function buildFlowPreview(form){
 const source=form.querySelector('select[name="from"]');
 const dest=form.querySelector('select[name="to"]');
 if(!source||!dest)return;
 const hint=node('div','budget-ux-flow-top','💡 Pilih pos asal dan pos tujuan. Alokasi berpindah, total anggaran tetap sama.');
 const flow=node('div','budget-ux-flow-visual');
 const left=node('div','budget-ux-flow-node from');
 const right=node('div','budget-ux-flow-node to');
 const arrow=node('span','budget-ux-flow-arrow','➜');arrow.setAttribute('aria-hidden','true');
 flow.append(left,arrow,right);
 const badge=node('div','budget-ux-transfer-amount');
 badge.append(node('span','', '💸 Nominal yang dipindahkan:'),node('b','','Isi nominal di bawah'));
 const alert=node('div','budget-ux-alert');alert.hidden=true;
 const input=form.querySelector('input[name="amount"]');
 const anchor=form.querySelector('input[name="editId"]');
 if(anchor)anchor.insertAdjacentElement('afterend',hint);else form.prepend(hint);
 hint.insertAdjacentElement('afterend',flow);flow.insertAdjacentElement('afterend',badge);badge.insertAdjacentElement('afterend',alert);
 function update(){
  const from=splitOption(source.options[source.selectedIndex]||{value:'',textContent:''});
  const to=splitOption(dest.options[dest.selectedIndex]||{value:'',textContent:''});
  left.replaceChildren(node('small','', 'POS ASAL'),node('strong','',from.name||'Pilih pos asal'),node('em','',from.remaining?'Sisa '+from.remaining:'Pilih anggaran yang tersedia'));
  right.replaceChildren(node('small','', 'POS TUJUAN'),node('strong','',to.name||'Pilih pos tujuan'),node('em','',to.group||'Menambah alokasi tujuan'));
  const raw=(input?.value||'').replace(/[^0-9]/g,'');
  const n=Number(raw||0);
  badge.querySelector('b').textContent=n?'Rp'+n.toLocaleString('id-ID'):'Isi nominal di bawah';
  const same=!!source.value&&source.value===dest.value;
  alert.hidden=!same;alert.textContent=same?'⚠️ Pos asal dan tujuan harus berbeda.':'';
  const submit=form.querySelector('button[type="submit"]');
  if(submit)submit.disabled=source.options.length===0||same;
 }
 form.addEventListener('change',function(e){if(e.target===source||e.target===dest)update()});
 if(input)input.addEventListener('input',update);
 update();
 const fromLabel=source.closest('label'),toLabel=dest.closest('label');
 if(fromLabel)fromLabel.firstChild.textContent='1. Ambil anggaran dari pos mana?';
 if(toLabel)toLabel.firstChild.textContent='2. Dialihkan ke pos mana?';
}
function enhanceBudgetDialog(){
 const modal=document.getElementById('budget-flow-backdrop');
 if(!modal){closeAll();return;}
  if(modal.dataset.budgetUx==='ready')return;
 modal.dataset.budgetUx='ready';
 modal.querySelectorAll('.budget-pos-action-choices > button').forEach(function(button){
  const kind=button.dataset.budgetChoice;
  const icons={base:'📝',move:'🔀'};
  const ico=button.querySelector('.budget-pos-choice-icon');
  if(!ico)return;
  if(kind==='adjust'){
   const wrap=node('span','budget-ux-dual-symbol');
   wrap.append(node('b','', '+'),node('b','', '−'));
   ico.replaceChildren(wrap);
  }else if(icons[kind])ico.textContent=icons[kind];
 });
 const transfer=modal.querySelector('#move-budget-form');
 if(transfer){
  buildFlowPreview(transfer);
  populatePicker(transfer.querySelector('select[name="from"]'));
  populatePicker(transfer.querySelector('select[name="to"]'));
 }
 const adjust=modal.querySelector('#budget-adjustment-form');
 if(adjust){
  setupAdjustType(adjust);
  populatePicker(adjust.querySelector('select[name="categoryId"]'));
 }
}
document.addEventListener('click',function(e){if(!e.target.closest('.budget-viz-picker,.budget-viz-portal'))closeAll()});
document.addEventListener('keydown',function(e){
 const portal=document.querySelector('.budget-viz-portal');
 if(!portal)return;
 if(e.key==='Escape'){
  e.preventDefault();e.stopImmediatePropagation();
  if(activeBudgetPicker)closePicker(activeBudgetPicker.picker);
  return;
 }
 if(e.key==='Tab'){
  const controls=Array.from(portal.querySelectorAll('button:not(:disabled),input:not(:disabled)')).filter(function(x){return x.getClientRects().length>0});
  if(!controls.length)return;
  const first=controls[0],last=controls[controls.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
},true);

function init(){
 setupPeriod();enhanceBudgetDialog();
 new MutationObserver(function(){enhanceBudgetDialog()}).observe(document.body,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
