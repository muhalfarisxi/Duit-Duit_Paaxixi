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
 const caret=node('span','budget-ux-period-caret','⌄');caret.setAttribute('aria-hidden','true');
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
function closePicker(picker){
 if(!picker)return;
 picker.classList.remove('is-open');
 const trigger=picker.querySelector('[data-budget-picker-toggle]');
 const menu=picker.querySelector('.budget-viz-menu');
 if(trigger)trigger.setAttribute('aria-expanded','false');
 if(menu)menu.hidden=true;
}
function closeAll(except){
 document.querySelectorAll('.budget-viz-picker.is-open').forEach(function(p){if(p!==except)closePicker(p)});
}
function populatePicker(select){
 if(!select||select.dataset.budgetUx==='ready')return;
 select.dataset.budgetUx='ready';
 const wrapper=node('div','budget-viz-picker');wrapper.dataset.budgetPicker=select.name;
 select.parentNode.insertBefore(wrapper,select);wrapper.appendChild(select);
 select.classList.add('budget-viz-native');select.tabIndex=-1;
 const options=Array.from(select.options).filter(function(o){return o.value!==''&&!o.disabled}).map(splitOption);
 const trigger=node('button','budget-viz-trigger');trigger.type='button';
 trigger.setAttribute('data-budget-picker-toggle','');trigger.setAttribute('aria-expanded','false');
 const symbol=node('span','budget-viz-selected-icon','📌');
 const info=node('span','budget-viz-trigger-info');
 const primary=node('strong','', 'Pilih pos pengeluaran');
 const secondary=node('small','','Ketuk untuk memilih');
 info.append(primary,secondary);
 const chevron=node('span','budget-viz-chevron','⌄');chevron.setAttribute('aria-hidden','true');
 trigger.append(symbol,info,chevron);wrapper.append(trigger);
 const menu=node('div','budget-viz-menu');menu.hidden=true;
 let search=null;
 if(options.length>7){search=node('input','budget-viz-search');search.type='search';search.placeholder='🔎 Cari nama pos atau kelompok…';search.setAttribute('aria-label','Cari pos anggaran');menu.append(search)}
 const list=node('div','budget-viz-list');menu.append(list);wrapper.append(menu);
 let previousGroup='',groupHeads=[];
 options.forEach(function(option,index){
  if(option.group!==previousGroup){
   previousGroup=option.group;
   const head=node('div','budget-viz-group',option.group);
   head.style.setProperty('--budget-group-accent',['#5c8feb','#20b5a0','#9474e5','#e5a14d'][groupHeads.length%4]);
   list.append(head);groupHeads.push(head);
  }
  const choice=node('button','budget-viz-option');choice.type='button';
  choice.dataset.value=option.value;choice.dataset.search=(option.group+' '+option.name).toLocaleLowerCase('id-ID');
  const marker=node('span','budget-viz-option-mark',index===0?'◉':'•');
  const inner=node('span','budget-viz-option-info');
  inner.append(node('strong','',option.name),node('small','',option.group+(option.remaining?' · Sisa '+option.remaining:'')));
  const check=node('span','budget-viz-check','');
  choice.append(marker,inner,check);list.append(choice);
  choice.addEventListener('click',function(){
   select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));
   sync();closePicker(wrapper);trigger.focus({preventScroll:true});
  });
 });
 const empty=node('div','budget-viz-empty','Tidak ada pos yang cocok.');empty.hidden=true;list.append(empty);
 function sync(){
  const selected=options.find(function(o){return o.value===select.value});
  primary.textContent=selected?selected.name:'Pilih pos pengeluaran';
  secondary.textContent=selected?selected.group+(selected.remaining?' · Sisa '+selected.remaining:''):'Belum dipilih';
  Array.from(list.querySelectorAll('.budget-viz-option')).forEach(function(b){
   const active=b.dataset.value===select.value;
   b.classList.toggle('is-selected',active);
   b.querySelector('.budget-viz-check').textContent=active?'✓':'';
  });
 }
 sync();
 select.addEventListener('change',sync);
 trigger.addEventListener('click',function(){
  const shouldOpen=!wrapper.classList.contains('is-open');
  closeAll(wrapper);wrapper.classList.toggle('is-open',shouldOpen);
  trigger.setAttribute('aria-expanded',String(shouldOpen));menu.hidden=!shouldOpen;
  if(shouldOpen){if(search){search.value='';search.dispatchEvent(new Event('input'));search.focus({preventScroll:true})}else{list.querySelector('.is-selected')?.focus({preventScroll:true})}}
 });
 if(search)search.addEventListener('input',function(){
  const term=search.value.trim().toLocaleLowerCase('id-ID');
  let count=0;
  Array.from(list.querySelectorAll('.budget-viz-option')).forEach(function(opt){opt.hidden=!opt.dataset.search.includes(term);if(!opt.hidden)count++});
  groupHeads.forEach(function(head){
   let next=head.nextElementSibling,hasVisible=false;
   while(next&&!next.classList.contains('budget-viz-group')){
    if(next.classList.contains('budget-viz-option')&&!next.hidden)hasVisible=true;
    next=next.nextElementSibling;
   }
   head.hidden=!hasVisible;
  });
  empty.hidden=count>0;
 });
}
function setupAdjustType(form){
 const select=form.querySelector('select[name="type"]');
 if(!select||select.dataset.budgetUx==='ready')return;
 select.dataset.budgetUx='ready';select.classList.add('budget-viz-native');select.tabIndex=-1;
 const container=node('div','budget-ux-type-control');
 ['increase','decrease'].forEach(function(type){
  const btn=node('button','budget-ux-type-option');btn.type='button';btn.dataset.type=type;
  const sign=node('span','budget-ux-type-sign',type==='increase'?'+':'−');
  btn.append(sign,node('span','',type==='increase'?'Tambah Anggaran':'Kurangi Anggaran'));container.append(btn);
  btn.addEventListener('click',function(){select.value=type;select.dispatchEvent(new Event('change',{bubbles:true}))});
 });
 select.insertAdjacentElement('afterend',container);
 function refresh(){container.querySelectorAll('.budget-ux-type-option').forEach(function(btn){const yes=btn.dataset.type===select.value;btn.classList.toggle('is-selected',yes);btn.setAttribute('aria-pressed',String(yes))});form.dataset.budgetAdjustmentType=select.value}
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
 if(!modal||modal.dataset.budgetUx==='ready')return;
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
document.addEventListener('click',function(e){if(!e.target.closest('.budget-viz-picker'))closeAll()});
document.addEventListener('keydown',function(e){
 if(e.key==='Escape'&&document.querySelector('.budget-viz-picker.is-open')){
  e.preventDefault();e.stopImmediatePropagation();
  const opened=document.querySelector('.budget-viz-picker.is-open');
  closePicker(opened);opened.querySelector('.budget-viz-trigger')?.focus({preventScroll:true});
 }
},true);
function init(){
 setupPeriod();enhanceBudgetDialog();
 new MutationObserver(function(){enhanceBudgetDialog()}).observe(document.body,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
