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
 // The shared month picker now wraps input#month-input in .pax-month-shell.
 // Do NOT run this legacy period popup after it is installed: insertBefore
 // with the nested input as reference used to throw NotFoundError, aborting
 // initialization of all animated budget/transfer dialogs below.
 if(window.PAAX_MONTH_PICKER){
  window.PAAX_MONTH_PICKER.enhance(label);
  const shell=input.closest('.pax-month-shell');
  if(shell&&label.contains(shell)){
   label.dataset.budgetUx='ready';
   label.classList.add('budget-ux-period-modern');
   if(!label.querySelector('.budget-ux-period-modern-heading')){
    const heading=node('div','budget-ux-period-modern-heading');
    heading.append(node('span','budget-ux-period-top','PERIODE KEUANGAN'));
    shell.parentElement.insertBefore(heading,shell);
    heading.append(shell);
   }
   return;
  }
 }
 label.dataset.budgetUx='ready';
 label.tabIndex=0;
 label.setAttribute('role','button');
 label.setAttribute('aria-haspopup','dialog');
 label.setAttribute('aria-expanded','false');
 label.setAttribute('aria-label','Pilih bulan periode keuangan');
 label.title='Klik untuk melihat keuangan pada bulan tertentu';
 const copy=node('span','budget-ux-period-copy');
 copy.append(node('span','budget-ux-period-top','PERIODE KEUANGAN'));
 const name=node('strong','budget-ux-period-name');copy.append(name);
 copy.append(node('small','budget-ux-period-hint','Klik untuk memilih bulan lain'));
 const caret=node('span','budget-ux-period-caret');caret.setAttribute('aria-hidden','true');
 label.insertBefore(copy,input);label.insertBefore(caret,input);
 const refresh=function(){name.textContent=formatMonth(input.value)};
 refresh();
 function currentWibMonth(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).formatToParts(new Date());
  const y=parts.find(function(p){return p.type==='year'})?.value;
  const m=parts.find(function(p){return p.type==='month'})?.value;
  return String(y)+'-'+String(m).padStart(2,'0');
 }
 const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 let currentPortal=null;
 function closePanel(restore=true){
  if(!currentPortal)return;
  currentPortal.remove();currentPortal=null;
  label.setAttribute('aria-expanded','false');
  label.classList.remove('budget-ux-period-open');
  if(restore&&label.isConnected)label.focus({preventScroll:true});
 }
 function open(e){
  if(e&&e.target===input)return;
  if(e){e.preventDefault();e.stopPropagation();}
  if(currentPortal){closePanel();return}
  const max=/^\d{4}-(?:0[1-9]|1[0-2])$/.test(input.max||'')?input.max:currentWibMonth();
  const selected=/^\d{4}-(?:0[1-9]|1[0-2])$/.test(input.value||'')?input.value:max;
  const maxYear=Number(max.slice(0,4));
  const minYear=Math.min(2000,Number(selected.slice(0,4)));
  let year=Math.min(maxYear,Number(selected.slice(0,4)));
  const portal=node('div','budget-month-portal');
  const shade=node('div','budget-month-shade');
  const panel=node('section','budget-month-panel');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label','Pilih periode keuangan berdasarkan bulan dan tahun');
  const head=node('div','budget-month-head');
  const icon=node('div','budget-month-head-icon','🗓️');
  const heading=node('div','budget-month-heading');
  heading.append(node('small','', 'JELAJAHI KEUANGANMU'),node('h3','', 'Pilih periode keuangan'),node('p','', 'Setiap bulan punya cerita. Pilih bulan yang ingin dilihat.'));
  const close=node('button','budget-month-close','×');close.type='button';close.setAttribute('aria-label','Tutup pilihan bulan');
  head.append(icon,heading,close);
  const nav=node('div','budget-month-year-nav');
  const prev=node('button','budget-month-year-arrow','‹');prev.type='button';prev.setAttribute('aria-label','Tahun sebelumnya');
  const yearToggle=node('button','budget-month-year-toggle');yearToggle.type='button';yearToggle.setAttribute('aria-expanded','false');yearToggle.setAttribute('aria-label','Pilih tahun periode keuangan');
  const next=node('button','budget-month-year-arrow','›');next.type='button';next.setAttribute('aria-label','Tahun berikutnya');
  nav.append(prev,yearToggle,next);
  const yearList=node('div','budget-month-year-list');yearList.hidden=true;yearList.setAttribute('aria-label','Daftar tahun');
  const monthGrid=node('div','budget-month-grid');
  const calendarBody=node('div','budget-month-body');
  calendarBody.append(yearList,monthGrid);
  const footer=node('div','budget-month-footer');
  const note=node('span','budget-month-footer-note','✨ Bulan aktif ditandai dengan warna biru.');
  const now=node('button','budget-month-today','↗ Bulan ini');now.type='button';
  footer.append(note,now);
  panel.append(head,nav,calendarBody,footer);
  portal.append(shade,panel);document.body.append(portal);
  currentPortal=portal;
  label.setAttribute('aria-expanded','true');
  label.classList.add('budget-ux-period-open');
  function hideYears(){
   yearList.hidden=true;
   panel.classList.remove('is-choosing-year');
   monthGrid.inert=false;
   monthGrid.removeAttribute('aria-hidden');
   yearToggle.setAttribute('aria-expanded','false');
  }
  function drawMonths(){
   yearToggle.replaceChildren(node('span','budget-month-year-spark','✦'),node('span','budget-month-year-value',String(year)));
   prev.disabled=year<=minYear;next.disabled=year>=maxYear;
   monthGrid.replaceChildren();
   months.forEach(function(month,i){
    const code=String(year)+'-'+String(i+1).padStart(2,'0');
    const button=node('button','budget-month-cell');button.type='button';
    button.style.setProperty('--month-order',String(i));
    button.disabled=code>max;
    if(code===input.value)button.classList.add('is-selected');
    if(code===currentWibMonth())button.classList.add('is-current');
    const n=node('span','budget-month-cell-number',String(i+1).padStart(2,'0'));
    const title=node('strong','',month);
    const mark=node('span','budget-month-cell-mark',code===input.value?'✓':code===currentWibMonth()?'•':'');
    button.append(n,title,mark);
    button.setAttribute('aria-label',month+' '+year+(code===input.value?', periode sedang aktif':''));
    button.setAttribute('aria-pressed',String(code===input.value));
    button.addEventListener('click',function(){
     if(button.disabled)return;
     closePanel(false);
     if(input.value!==code){
      input.value=code;
      input.dispatchEvent(new Event('change',{bubbles:true}));
     }
     refresh();
     label.focus({preventScroll:true});
    });
    monthGrid.append(button);
   });
  }
  function drawYears(){
   yearList.replaceChildren();
   for(let n=maxYear;n>=minYear;n--){
    const choice=node('button','budget-month-year-item',String(n));choice.type='button';
    if(n===year)choice.classList.add('is-selected');
    choice.addEventListener('click',function(){
     year=n;hideYears();drawMonths();
     monthGrid.querySelector('.budget-month-cell:not(:disabled)')?.focus({preventScroll:true});
    });
    yearList.append(choice);
   }
  }
  prev.addEventListener('click',function(){if(year>minYear){year--;hideYears();drawMonths()}});
  next.addEventListener('click',function(){if(year<maxYear){year++;hideYears();drawMonths()}});
  yearToggle.addEventListener('click',function(){
   const open=yearList.hidden;
   if(!open){hideYears();yearToggle.focus({preventScroll:true});return}
   drawYears();
   yearList.hidden=false;
   panel.classList.add('is-choosing-year');
   monthGrid.inert=true;
   monthGrid.setAttribute('aria-hidden','true');
   yearToggle.setAttribute('aria-expanded','true');
   const selectedYear=yearList.querySelector('.is-selected');
   selectedYear?.scrollIntoView({block:'nearest'});
   selectedYear?.focus({preventScroll:true});
  });
  now.addEventListener('click',function(){
   const code=max;
   closePanel(false);
   if(input.value!==code){input.value=code;input.dispatchEvent(new Event('change',{bubbles:true}))}
   refresh();label.focus({preventScroll:true});
  });
  shade.addEventListener('click',function(){closePanel()});
  close.addEventListener('click',function(){closePanel()});
  drawMonths();
  (monthGrid.querySelector('.is-selected')||monthGrid.querySelector('.is-current')||close).focus({preventScroll:true});
 }
 label.addEventListener('click',open);
 label.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e)}});
 document.addEventListener('keydown',function(e){
  if(!currentPortal)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closePanel();return}
  if(e.key==='Tab'){
   const focusable=Array.from(currentPortal.querySelectorAll('button:not(:disabled)')).filter(function(el){return el.getClientRects().length&&!el.closest('[hidden]')});
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 },true);
 input.addEventListener('change',function(){window.requestAnimationFrame(refresh)});
 new MutationObserver(refresh).observe(input,{attributes:true,attributeFilter:['value']});
 const content=document.getElementById('content');
 if(content)new MutationObserver(refresh).observe(content,{childList:true});
 document.addEventListener('change',function(e){if(e.target===input)window.setTimeout(refresh,0)});
}

function splitOption(opt){
 const raw=(opt.textContent||'').trim();
 const pair=raw.split(' · ');
 const group=pair.length>1?pair.shift().trim():'Pos Lainnya';
 let name=pair.length?pair.join(' · ').trim():raw;
 const balance=name.match(/\s*\(Sisa\s+([^)]+)\)\s*$/i);
 if(balance)name=name.slice(0,balance.index).trim();
 const d=opt?.dataset||{};
 const hasStats=['budgetEffective','budgetUsed','budgetRemaining'].every(k=>d[k]!==undefined&&d[k]!=='');
 const effective=hasStats?Number(d.budgetEffective):null;
 const used=hasStats?Number(d.budgetUsed):null;
 const remainingAmount=hasStats?Number(d.budgetRemaining):null;
 const validStats=hasStats&&[effective,used,remainingAmount].every(Number.isFinite);
 const rupiah=n=>'Rp'+Number(n).toLocaleString('id-ID',{maximumFractionDigits:0});
 return {value:opt.value,group:group,name:name,
  remaining:validStats?rupiah(remainingAmount):(balance?balance[1]:''),
  hasStats:validStats,effective:validStats?effective:null,
  used:validStats?used:null,remainingAmount:validStats?remainingAmount:null};
}

let activeBudgetPicker=null;
function closePicker(picker,restoreFocus=true){
 if(!picker)return;
 const trigger=picker.querySelector('[data-budget-picker-toggle]');
 if(activeBudgetPicker?.picker===picker){
  const activeDialog=activeBudgetPicker.el;
  if(typeof activeDialog.close==='function'&&activeDialog.open)activeDialog.close();
  activeDialog.remove();
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
 const sourceLabel=select.parentElement?.tagName==='LABEL'?select.parentElement:null;
 if(sourceLabel){
  // Avoid a label forwarding button clicks to the hidden native select.
  const field=node('div','budget-viz-form-field');
  const labelText=(sourceLabel.firstChild?.textContent||'Pilih pos pengeluaran').trim();
  field.append(node('span','budget-viz-form-label',labelText));
  sourceLabel.parentNode.insertBefore(field,sourceLabel);
  field.append(select);
  sourceLabel.remove();
 }
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
  // Filtering is applied only when replacing a donor after an over-budget warning.
  const requested=Number(select.dataset.budgetQuickAmount||0);
  const quickMode=select.dataset.budgetQuickEligible==='1'&&Number.isSafeInteger(requested)&&requested>0;
  const excluded=select.dataset.budgetQuickExclude||'';
  delete select.dataset.budgetQuickEligible;
  delete select.dataset.budgetQuickAmount;
  delete select.dataset.budgetQuickExclude;
  const parentForm=select.closest('form');
  const visibleOptions=quickMode?allOptions.map(function(option){
   const original=Array.from(select.options).find(o=>o.value===option.value);
   return {...option,quickAvailable:budgetTransferSourceRemaining(parentForm,original)};
  }).filter(function(o){return o.value!==excluded&&o.quickAvailable>=requested})
   .sort(function(a,b){return b.quickAvailable-a.quickAvailable||a.name.localeCompare(b.name,'id')}):allOptions;
  closeAll(wrapper);
  if(activeBudgetPicker)closePicker(activeBudgetPicker.picker,false);
  wrapper.classList.add('is-open');
  trigger.setAttribute('aria-expanded','true');
  const portal=node('dialog','budget-viz-portal');
  const shade=node('div','budget-viz-portal-shade');
  const panel=node('section','budget-viz-portal-panel');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label','Pilih '+role);
  const head=node('header','budget-viz-portal-head');
  const headIcon=node('span','budget-viz-portal-head-icon','🗂️');
  const words=node('div','budget-viz-portal-heading');
  words.append(node('small','', 'PILIH KELOMPOK & POS'));
  const heading=node('h3','',quickMode?'Ganti pos pemberi anggaran':'Pilih '+role);
  words.append(heading);
  if(quickMode)words.querySelector('small').textContent='POS DENGAN SISA MENCUKUPI';
  const close=node('button','budget-viz-portal-close','×');
  close.type='button';close.setAttribute('aria-label','Tutup pemilih pos');
  head.append(headIcon,words,close);
  const guidance=node('p','budget-viz-portal-intro',quickMode?
   'Seluruh pos lintas kelompok yang sisa anggarannya minimal '+budgetTransferMoney(requested)+
   '. Pilih satu untuk otomatis mengganti pemberi anggaran dan memperbarui batas nominal.':
   'Pilih kelompok terlebih dahulu, atau ketik nama pos untuk mencari dari seluruh kelompok.');
  const searchWrap=node('div','budget-viz-search-wrap');
  searchWrap.append(node('span','', '⌕'));
  const search=node('input','budget-viz-search');
  search.type='search';
  search.placeholder=quickMode?'Cari pos pemberi yang memenuhi batas…':'Cari nama pos atau kelompok…';
  search.setAttribute('aria-label','Cari pos dari seluruh kelompok');
  searchWrap.append(search);
  const nav=node('div','budget-viz-portal-nav');
  const body=node('div','budget-viz-portal-content');
  panel.append(head,guidance,searchWrap,nav,body);
  if(quickMode){
   const summary=node('div','budget-viz-filter-summary');
   summary.append(node('span','budget-viz-filter-summary-icon','✅'));
   const details=node('span','budget-viz-filter-summary-copy');
   details.append(node('strong','',visibleOptions.length+' pos memiliki sisa mencukupi'));
   details.append(node('small','','Minimal tersedia '+budgetTransferMoney(requested)+' · Diurutkan dari sisa terbesar'));
   summary.append(details);
   searchWrap.insertAdjacentElement('afterend',summary);
  }
  portal.append(shade,panel);
  document.body.append(portal);
  // Move popup into the browser top layer, above all other modal/backdrop layers.
  try{portal.showModal()}catch(error){portal.setAttribute('open','')}
  activeBudgetPicker={el:portal,picker:wrapper};
  portal.addEventListener('cancel',function(event){event.preventDefault();closePicker(wrapper)});
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
   content.append(node('small','budget-viz-portal-pos-group',option.group));
   let accessible='Pilih '+option.name+' dari '+option.group;
   if(option.hasStats){
    const money=n=>'Rp'+Number(n).toLocaleString('id-ID',{maximumFractionDigits:0});
    const remaining=option.remainingAmount;
    const ratio=option.effective>0?remaining/option.effective:0;
    const tone=remaining<0?'is-over':remaining===0?'is-zero':ratio<=.2?'is-warning':'is-remaining';
    const metrics=node('span','budget-viz-portal-pos-metrics');
    const chip=(label,value,tone)=>{
     const el=node('span','budget-viz-pos-chip '+tone);
     el.append(node('span','budget-viz-chip-label',label),node('strong','budget-viz-chip-value',money(value)));
     metrics.append(el);
    };
    chip('Efektif',option.effective,'is-effective');
    chip('Terpakai',option.used,'is-used');
    chip(remaining<0?'Minus':remaining===0?'Habis':'Sisa',Math.abs(remaining),tone);
    content.append(metrics);
    accessible+=', efektif '+money(option.effective)+', terpakai '+money(option.used)+
     ', '+(remaining<0?'minus ':remaining===0?'habis ':'sisa ')+money(Math.abs(remaining));
   }else if(option.remaining){
    content.append(node('small','budget-viz-portal-pos-remaining','Sisa '+option.remaining));
    accessible+=', sisa '+option.remaining;
   }
   if(quickMode){
    content.append(node('span','budget-viz-pos-eligible',
     '✓ Bisa dialihkan '+budgetTransferMoney(option.quickAvailable)));
    accessible+=', dapat dialihkan '+budgetTransferMoney(option.quickAvailable);
   }
   btn.setAttribute('aria-label',accessible);
   const arrow=node('span','budget-viz-portal-pos-check',select.value===option.value?'✓':'→');
   btn.append(mark,content,arrow);
   btn.addEventListener('click',function(){choose(option.value)});
   return btn;
  }
  function paint(){
   const q=search.value.trim().toLocaleLowerCase('id-ID');
   body.replaceChildren();
   nav.replaceChildren();
   if(q||quickMode){
    const matches=visibleOptions.filter(function(o){
     return (o.name+' '+o.group).toLocaleLowerCase('id-ID').includes(q);
    });
    nav.append(node('strong','budget-viz-search-count',quickMode?
     matches.length+' pos mampu memberikan '+budgetTransferMoney(requested):
     matches.length+' pos ditemukan'));
    const list=node('div','budget-viz-portal-positions');
    matches.forEach(function(option){list.append(optionCard(option))});
    if(!matches.length)list.append(node('p','budget-viz-portal-empty',quickMode?
     (q?'Tidak ada pos yang memenuhi nominal dan cocok dengan pencarian.':
     'Belum ada pos dengan sisa minimal '+budgetTransferMoney(requested)+
     '. Turunkan nominal atau tambahkan alokasi ke pos terlebih dahulu.'):
     'Tidak ditemukan. Coba kata lain atau pilih kelompok.'));
    body.append(list);
   }else if(selectedGroup===null){
    nav.append(node('strong','budget-viz-search-count','LANGKAH 1/2 · Pilih kelompok ('+groups.size+')'));
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
     button.addEventListener('click',function(event){
      event.stopPropagation();
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
    back.addEventListener('click',function(event){event.stopPropagation();selectedGroup=null;paint();panel.querySelector('.budget-viz-portal-group')?.focus({preventScroll:true})});
    nav.append(back,node('strong','budget-viz-search-count','LANGKAH 2/2 · '+selectedGroup+' · '+groups.get(selectedGroup).length+' pos'));
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


/* Real-time transfer amount guard. This is a nonblocking animated popup:
   users can fix the amount or switch the source without losing their draft. */
function budgetTransferMoney(n){
 return 'Rp'+Math.max(0,Number(n)||0).toLocaleString('id-ID',{maximumFractionDigits:0});
}
function budgetTransferInputValue(input){
 const raw=String(input?.value||'').replace(/\D/g,'');
 const value=Number(raw||0);
 return {value,valid:Number.isSafeInteger(value)&&value>0};
}
function budgetTransferSourceRemaining(form,option){
 if(!option?.value)return 0;
 const info=splitOption(option);
 const current=info.hasStats?info.remainingAmount:Number((info.remaining||'').replace(/[^\d-]/g,''))||0;
 const oldAmount=Number(form.dataset.budgetOriginalAmount||0);
 const adjustment=(form.dataset.budgetOriginalFrom===option.value?oldAmount:0)
   -(form.dataset.budgetOriginalTo===option.value?oldAmount:0);
 return Math.max(0,current+adjustment);
}
function budgetTransferLimitPopup(form,input){
 if(!input)return null;
 const popup=node('aside','budget-limit-popup');
 popup.hidden=true;
 popup.setAttribute('role','alert');
 popup.setAttribute('aria-live','assertive');
 popup.id='budget-limit-popup-'+(form.dataset.budgetAnchorId?'anchor':'general');
 const header=node('div','budget-limit-header');
 header.append(node('span','budget-limit-icon','⚠️'));
 const heading=node('span','budget-limit-heading');
 heading.append(node('strong','', 'Nominal melebihi sisa anggaran'));
 const desc=node('p','budget-limit-description');
 const stats=node('div','budget-limit-values');
 const actions=node('div','budget-limit-actions');
 const maxButton=node('button','budget-limit-use-max','');
 maxButton.type='button';
 const otherButton=node('button','budget-limit-other-source','🔎 Pilih pos asal lain');
 otherButton.type='button';
 actions.append(maxButton,otherButton);
 popup.append(header,desc,stats,actions);
 header.append(heading);
 const label=input.closest('label')||input;
 label.insertAdjacentElement('afterend',popup);
 let lastMax=0;
 maxButton.addEventListener('click',function(event){
  event.preventDefault();
  if(lastMax<=0)return;
  input.value=Math.round(lastMax).toLocaleString('id-ID');
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.focus({preventScroll:true});
 });
 otherButton.addEventListener('click',function(event){
  event.preventDefault();
  // This click starts outside the selector. Without stopping propagation,
  // the document's outside-click listener immediately closes the new modal.
  event.stopPropagation();
  const anchored=Boolean(form.dataset.budgetAnchorId);
  const threshold=budgetTransferInputValue(input).value;
  if(!threshold)return;
  if(anchored){
   // In Edit Pos mode, keep the selected pos fixed and replace its donor.
   const receive=form.querySelector('.budget-anchor-mode.is-receive:not(:disabled)');
   if(receive&&receive.getAttribute('aria-pressed')!=='true')receive.click();
   const donor=form.querySelector('select[name="donorPos"]');
   const donorTrigger=donor?.closest('.budget-viz-picker')?.querySelector('[data-budget-picker-toggle]');
   if(donorTrigger&&!donor.disabled){
    donor.dataset.budgetQuickEligible='1';
    donor.dataset.budgetQuickAmount=String(threshold);
    donor.dataset.budgetQuickExclude=String(form.dataset.budgetAnchorId||'');
    donorTrigger.click();
   }
  }else{
   const source=form.querySelector('select[name="from"]');
   const destination=form.querySelector('select[name="to"]');
   const trigger=source?.closest('.budget-viz-picker')?.querySelector('[data-budget-picker-toggle]');
   if(trigger){
    source.dataset.budgetQuickEligible='1';
    source.dataset.budgetQuickAmount=String(threshold);
    source.dataset.budgetQuickExclude=String(destination?.value||'');
    trigger.click();
   }
  }
 });
 function update(details){
  const {over,value,limit,sourceName}=details;
  lastMax=limit;
  popup.hidden=!over;
  input.classList.toggle('budget-transfer-overlimit',Boolean(over));
  if(over){
   input.setAttribute('aria-invalid','true');
   input.setAttribute('aria-describedby',popup.id);
   const extra=value-limit;
   const posName=sourceName||'pos asal';
   const limitFormatted=budgetTransferMoney(limit);
   desc.textContent='Kamu memasukkan '+budgetTransferMoney(value)+', padahal sisa anggaran '+posName+
    ' hanya '+limitFormatted+'. Kelebihan '+budgetTransferMoney(extra)+
    '. Masukkan nominal yang sesuai atau ambil alokasi dari pos lain.';
   stats.replaceChildren();
   [['Dimasukkan',value],['Sisa '+posName,limit],['Kelebihan',extra]].forEach(function(row){
    const box=node('span','budget-limit-stat');
    box.append(node('small','',row[0]),node('strong','',budgetTransferMoney(row[1])));
    stats.append(box);
   });
   maxButton.textContent=limit>0?'✓ Gunakan '+limitFormatted:'Tidak ada sisa anggaran';
   maxButton.disabled=limit<=0;
   otherButton.textContent=form.dataset.budgetAnchorId?'↙ Terima dari pos lain':'🔎 Pilih pos asal lain';
   popup.classList.remove('budget-limit-enter');
   void popup.offsetWidth;
   popup.classList.add('budget-limit-enter');
  }else{
   input.removeAttribute('aria-invalid');
   if(input.getAttribute('aria-describedby')===popup.id)input.removeAttribute('aria-describedby');
   popup.classList.remove('budget-limit-enter');
  }
 }
 return update;
}

function setupAnchoredTransfer(form){
 if(form.dataset.anchorReady)return;
 form.dataset.anchorReady='1';
 const id=form.dataset.budgetAnchorId,source=form.querySelector('select[name="from"]'),target=form.querySelector('select[name="to"]');
 const amount=form.querySelector('input[name="amount"]'),submit=form.querySelector('button[type="submit"]');
 const anchorOption=Array.from(target.options).find(x=>x.value===id);
 if(!anchorOption)return;
 const anchor=splitOption(anchorOption);
 const balance=o=>{
  const item=splitOption(o||{textContent:'',value:''});
  return item.hasStats?Math.max(0,item.remainingAmount):Number(item.remaining.replace(/\D/g,''))||0;
 };
 const available=balance(Array.from(source.options).find(x=>x.value===id));
 const donors=Array.from(source.options).filter(x=>x.value&&x.value!==id&&balance(x)>0);
 const receivers=Array.from(target.options).filter(x=>x.value&&x.value!==id);
 source.closest('label')?.classList.add('budget-anchor-native');
 target.closest('label')?.classList.add('budget-anchor-native');
 source.required=false;target.required=false;source.tabIndex=-1;target.tabIndex=-1;source.value='';target.value='';
 const focus=node('div','budget-anchor-focus');
 focus.append(node('span','budget-anchor-focus-icon','📌'));
 const info=node('span','budget-anchor-focus-info');
 info.append(node('small','','POS YANG SEDANG DIEDIT'),node('strong','',anchor.name),
 node('em','',anchor.group+' · Sisa Rp'+available.toLocaleString('id-ID')));
 focus.append(info);
 form.querySelector('input[name="editId"]').insertAdjacentElement('afterend',focus);
 const title=document.getElementById('budget-flow-heading');if(title)title.textContent='Alihkan Anggaran · '+anchor.name;
 const desc=document.querySelector('#budget-flow-backdrop .budget-flow-dialog-head p');
 if(desc)desc.textContent='Pilih apakah pos ini menerima atau mengirim anggaran.';
 const question=node('strong','budget-anchor-question','1. Arah pengalihan untuk '+anchor.name);
 focus.insertAdjacentElement('afterend',question);
 const modes=node('div','budget-anchor-modes');question.insertAdjacentElement('afterend',modes);
 function addMode(mode,heading,detail,icon,disabled){
  const button=node('button','budget-anchor-mode is-'+mode);
  button.type='button';button.dataset.direction=mode;button.disabled=disabled;
  button.setAttribute('aria-pressed','false');
  const words=node('span','budget-anchor-mode-words');words.append(node('strong','',heading),node('small','',detail));
  button.append(node('span','budget-anchor-mode-icon',icon),words,node('span','budget-anchor-mode-check','✓'));
  modes.append(button);return button;
 }
 const receive=addMode('receive','Terima Anggaran','Ambil dari pos lain untuk '+anchor.name,'↙',!donors.length);
 const send=addMode('send','Kirim Anggaran','Alihkan sisa '+anchor.name+' ke pos lain','↗',available<=0||!receivers.length);
 const hint=node('p','budget-anchor-hint','Pilih salah satu arah terlebih dahulu.');
 modes.insertAdjacentElement('afterend',hint);
 const rPanel=node('div','budget-anchor-partner'),sPanel=node('div','budget-anchor-partner');
 rPanel.hidden=true;sPanel.hidden=true;
 function createSelect(panel,name,description,options){
  panel.append(node('strong','budget-anchor-partner-title',description));
  const select=node('select','field');select.name=name;select.required=true;select.disabled=true;
  const blank=node('option','','Pilih pos melalui kelompok atau pencarian');blank.value='';blank.disabled=true;blank.selected=true;select.append(blank);
  options.forEach(x=>{
   const op=node('option','',x.textContent);op.value=x.value;
   ['budgetEffective','budgetUsed','budgetRemaining'].forEach(key=>{
    if(x.dataset?.[key]!==undefined)op.dataset[key]=x.dataset[key];
   });
   select.append(op);
  });
  panel.append(select);return select;
 }
 const donor=createSelect(rPanel,'donorPos','2. Ambil anggaran dari pos mana?',donors);
 const recipient=createSelect(sPanel,'recipientPos','2. Kirim anggaran ke pos mana?',receivers);
 hint.insertAdjacentElement('afterend',rPanel);rPanel.insertAdjacentElement('afterend',sPanel);
 const preview=node('div','budget-anchor-preview');preview.hidden=true;
 const src=node('div','budget-anchor-preview-node'),dst=node('div','budget-anchor-preview-node');
 const srcLabel=node('strong','','—'),dstLabel=node('strong','','—');
 src.append(node('small','','POS ASAL'),srcLabel);dst.append(node('small','','POS TUJUAN'),dstLabel);
 preview.append(src,node('span','budget-anchor-preview-arrow','➜'),dst);sPanel.insertAdjacentElement('afterend',preview);
 const status=node('p','budget-anchor-status','Pilih arah dan pos pasangan.');
 const amountLabel=amount?.closest('label');
 if(amountLabel){amountLabel.firstChild.textContent='3. Nominal yang Dialihkan (Rp)';amountLabel.insertAdjacentElement('afterend',status)}
 const showLimit=budgetTransferLimitPopup(form,amount);
 let direction='';
 function update(){
  const isReceive=direction==='receive',isSend=direction==='send';
  receive.classList.toggle('is-selected',isReceive);send.classList.toggle('is-selected',isSend);
  receive.setAttribute('aria-pressed',String(isReceive));send.setAttribute('aria-pressed',String(isSend));
  rPanel.hidden=!isReceive;sPanel.hidden=!isSend;donor.disabled=!isReceive;recipient.disabled=!isSend;
  const otherSel=isReceive?donor:recipient;
  const other=Array.from(otherSel.options).find(x=>x.value&&x.value===otherSel.value);
  source.value=isReceive?(other?.value||''):isSend?id:'';
  target.value=isSend?(other?.value||''):isReceive?id:'';
  preview.hidden=!other;
  if(other){const otherName=splitOption(other).name;srcLabel.textContent=isReceive?otherName:anchor.name;dstLabel.textContent=isReceive?anchor.name:otherName}
  const value=Number(String(amount?.value||'').replace(/\D/g,''))||0;
  const max=isReceive?balance(other):available;
  const exceeds=!!other&&value>max,ok=!!direction&&!!other&&value>0&&Number.isSafeInteger(value)&&!exceeds;
  showLimit?.({over:exceeds,value,limit:max,sourceName:isReceive?splitOption(other).name:anchor.name});
  status.classList.toggle('is-error',exceeds);status.classList.toggle('is-ok',ok);
  status.textContent=!direction?'Pilih Terima atau Kirim Anggaran.':!other?'Pilih pos pasangan melalui pencarian atau kelompok.':
    !value?'Isi nominal anggarannya.':exceeds?'⚠️ Sisa anggaran pos asal tidak cukup.':'✓ Siap disimpan, total anggaran bulanan tidak berubah.';
  hint.textContent=isReceive?'↙ '+anchor.name+' menerima alokasi dari pos lain.':
    isSend?'↗ '+anchor.name+' mengirim alokasi ke pos lain.':'Pilih salah satu arah terlebih dahulu.';
  submit.disabled=!ok;
 }
 [receive,send].forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.disabled)return;direction=btn.dataset.direction;update();
  (direction==='receive'?donor:recipient).closest('.budget-viz-picker')?.querySelector('.budget-viz-trigger')?.focus({preventScroll:true});
 }));
 donor.addEventListener('change',update);recipient.addEventListener('change',update);
 amount?.addEventListener('input',update);
 form.addEventListener('submit',e=>{update();if(submit.disabled){e.preventDefault();e.stopImmediatePropagation()}},true);
 populatePicker(donor);populatePicker(recipient);update();
 const first=receive.disabled?send:receive;if(!first.disabled)first.focus({preventScroll:true});
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
 const updatePopup=budgetTransferLimitPopup(form,input);
 const availableLine=node('p','budget-transfer-available');
 input?.closest('label')?.insertAdjacentElement('afterend',availableLine);
 function update(){
  const fromOption=source.options[source.selectedIndex]||{value:'',textContent:''};
  const from=splitOption(fromOption);
  const to=splitOption(dest.options[dest.selectedIndex]||{value:'',textContent:''});
  const available=budgetTransferSourceRemaining(form,fromOption);
  left.replaceChildren(node('small','', 'POS ASAL'),node('strong','',from.name||'Pilih pos asal'),
   node('em','',source.value?'Dapat dialihkan '+budgetTransferMoney(available):'Pilih anggaran yang tersedia'));
  right.replaceChildren(node('small','', 'POS TUJUAN'),node('strong','',to.name||'Pilih pos tujuan'),
   node('em','',to.group||'Menambah alokasi tujuan'));
  const amount=budgetTransferInputValue(input);
  const value=amount.value;
  badge.querySelector('b').textContent=value?budgetTransferMoney(value):'Isi nominal di bawah';
  availableLine.textContent=source.value?'💰 Maksimum dari '+from.name+': '+budgetTransferMoney(available):'Pilih pos asal untuk melihat batas nominal.';
  const same=!!source.value&&source.value===dest.value;
  const excess=!!source.value&&amount.valid&&value>available;
  const missing=!source.value||!dest.value;
  alert.hidden=!(same||missing&&value>0);
  alert.textContent=same?'⚠️ Pos asal dan tujuan harus berbeda.':
   missing&&value>0?'⚠️ Pilih pos asal dan tujuan terlebih dahulu.':'';
  updatePopup?.({over:excess,value,limit:available,sourceName:from.name});
  const submit=form.querySelector('button[type="submit"]');
  const canSubmit=!missing&&!same&&amount.valid&&!excess&&available>0;
  if(submit)submit.disabled=!canSubmit;
 }
 form.addEventListener('change',function(e){if(e.target===source||e.target===dest)update()});
 if(input){input.addEventListener('input',update);input.addEventListener('change',update);}
 form.addEventListener('submit',function(event){
  update();
  if(form.querySelector('button[type="submit"]')?.disabled){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
 update();
 const fromLabel=source.closest('label'),toLabel=dest.closest('label');
 if(fromLabel)fromLabel.firstChild.textContent='1. Ambil anggaran dari pos mana?';
 if(toLabel)toLabel.firstChild.textContent='2. Dialihkan ke pos mana?';
}
function enhanceBudgetDialog(){
 const modal=document.getElementById('budget-flow-backdrop');
 if(!modal){closeAll();return;}
 if(modal.dataset.budgetUx==='ready')return;
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
  if(transfer.dataset.budgetAnchorId)setupAnchoredTransfer(transfer);
  else{
   buildFlowPreview(transfer);
   populatePicker(transfer.querySelector('select[name="from"]'));
   populatePicker(transfer.querySelector('select[name="to"]'));
  }
 }
 const adjust=modal.querySelector('#budget-adjustment-form');
 if(adjust){
  setupAdjustType(adjust);
  populatePicker(adjust.querySelector('select[name="categoryId"]'));
 }
 // Mark enhanced only after the controls are successfully mounted.
 modal.dataset.budgetUx='ready';
}
document.addEventListener('click',function(e){
 const path=typeof e.composedPath==='function'?e.composedPath():[];
 const inside=path.some(n=>n?.classList?.contains?.('budget-viz-portal')||n?.classList?.contains?.('budget-viz-picker'));
 if(!inside&&!e.target.closest?.('.budget-viz-picker,.budget-viz-portal'))closeAll();
});
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
 // Keep the budget selector independent from calendar/header enhancements.
 // A period UI failure must never disable the animated transfer experience.
 try{setupPeriod()}catch(err){console.error('[Paaxixi] Period UI:',err);}
 try{enhanceBudgetDialog()}catch(err){console.error('[Paaxixi] Budget dialog:',err);}
 new MutationObserver(function(){
  try{enhanceBudgetDialog()}catch(err){console.error('[Paaxixi] Budget dialog:',err);}
 }).observe(document.body,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
