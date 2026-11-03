/* Kalender bulan Paaxixi. Semua <input type="month"> memakai popup custom,
   sedangkan nilai YYYY-MM tetap dipakai oleh seluruh kode lama. */
(function(){
 'use strict';
 const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 const SHORT=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
 let active=null,dialog=null,year=2026,ready=false;
 const periodOk=v=>/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(String(v||''));
 function todayMonth(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).formatToParts(new Date());
  const y=parts.find(p=>p.type==='year')?.value||'2026',m=parts.find(p=>p.type==='month')?.value||'01';
  return y+'-'+m;
 }
 const valueFor=(y,m)=>String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0');
 const labelFor=period=>periodOk(period)?MONTHS[Number(period.slice(5))-1]+' '+period.slice(0,4):'Pilih bulan';
 function monthBound(input){
  let min=periodOk(input?.min)?input.min:'1900-01';
  let max=periodOk(input?.max)?input.max:'2100-12';
  if(input?.id==='month-input'&&max>todayMonth())max=todayMonth();
  return {min,max};
 }
 function within(month,input){
  const b=monthBound(input);
  return periodOk(month)&&month>=b.min&&month<=b.max;
 }
 function manualParse(text){
  const s=String(text||'').trim().replace(/\s+/g,' ');
  if(periodOk(s))return s;
  let match=s.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if(match){const v=match[2]+'-'+match[1].padStart(2,'0');return periodOk(v)?v:'';}
  match=s.match(/^(\d{4})[\/\-.](\d{1,2})$/);
  if(match){const v=match[1]+'-'+match[2].padStart(2,'0');return periodOk(v)?v:'';}
  match=s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if(match){
   const idx=MONTHS.findIndex((m,i)=>m.toLowerCase()===match[1].toLowerCase()||SHORT[i].toLowerCase()===match[1].toLowerCase());
   if(idx>=0)return match[2]+'-'+String(idx+1).padStart(2,'0');
  }
  return '';
 }
 function safe(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}
 function label(input){
  if(input.id==='month-input')return 'Periode Keuangan';
  if(input.id==='report-month')return 'Bulan Arsip Laporan';
  const near=input.closest('label');
  if(near){
   const clone=near.cloneNode(true);clone.querySelectorAll('input,button,svg').forEach(x=>x.remove());
   const s=clone.textContent.trim();
   if(s&&s.length<95)return s;
  }
  return input.getAttribute('aria-label')||'Pilih Periode Bulanan';
 }
 function sync(root=document){
  if(!root?.querySelectorAll)return;
  const all=[];
  if(root.matches?.('input[type="month"].pax-month-native'))all.push(root);
  root.querySelectorAll('input[type="month"].pax-month-native').forEach(el=>all.push(el));
  all.forEach(input=>{
   const trigger=input.closest('.pax-month-shell')?.querySelector('[data-pax-month-trigger]');
   if(!trigger)return;
   const visible=trigger.querySelector('.pax-month-value');
   if(visible)visible.textContent=labelFor(input.value);
   trigger.dataset.empty=String(!periodOk(input.value));
   trigger.title=(label(input)||'Periode')+' · '+labelFor(input.value)+' · klik untuk memilih atau mengetik';
  });
 }
 function enhance(root=document){
  if(!root?.querySelectorAll)return;
  const inputs=[];
  if(root.matches?.('input[type="month"]'))inputs.push(root);
  root.querySelectorAll('input[type="month"]').forEach(input=>inputs.push(input));
  inputs.forEach(input=>{
   if(input.classList.contains('pax-month-native')||input.closest('.pax-month-dialog'))return;
   if(!input.parentNode)return;
   const wrapper=document.createElement('span');
   wrapper.className='pax-month-shell';
   input.parentNode.insertBefore(wrapper,input);
   wrapper.append(input);
   input.classList.add('pax-month-native');
   input.tabIndex=-1;
   input.setAttribute('aria-hidden','true');
   const trigger=document.createElement('button');
   trigger.type='button';trigger.className='pax-month-trigger';
   trigger.setAttribute('data-pax-month-trigger','');
   trigger.setAttribute('aria-label','Pilih '+label(input)+' melalui kalender bulan');
   trigger.innerHTML='<span class="pax-month-value"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16"/><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 14h2m4 0h2m-8 4h2"/></svg>';
   wrapper.append(trigger);
  });
  sync(root);
 }
 function close(restoreFocus=false){
  if(!dialog)return;
  const old=dialog,target=active;
  dialog=null;active=null;
  if(old.open)old.close();
  old.remove();
  if(restoreFocus&&target?.isConnected)target.closest('.pax-month-shell')?.querySelector('[data-pax-month-trigger]')?.focus({preventScroll:true});
 }
 function choose(month){
  const field=active;
  if(!field||!field.isConnected||!within(month,field))return false;
  const changed=field.value!==month;
  // Close before dispatch: change listeners may re-render the complete page.
  close(false);
  field.value=month;
  sync(document);
  if(changed){
   field.dispatchEvent(new Event('input',{bubbles:true}));
   field.dispatchEvent(new Event('change',{bubbles:true}));
  }
  if(field.isConnected)field.closest('.pax-month-shell')?.querySelector('[data-pax-month-trigger]')?.focus({preventScroll:true});
  return true;
 }
 function render(){
  if(!dialog||!active)return;
  const sel=active.value,now=todayMonth(),limits=monthBound(active);
  const minYear=+limits.min.slice(0,4),maxYear=+limits.max.slice(0,4);
  const cells=MONTHS.map((name,i)=>{
   const month=valueFor(year,i+1);
   const disabled=!within(month,active);
   const classes=[month===sel?'is-picked':'',month===now?'is-current':''].filter(Boolean).join(' ');
   return '<button type="button" class="pax-month-option '+classes+'" data-pax-month-select="'+month+'" '+(disabled?'disabled':'')+' aria-pressed="'+String(month===sel)+'">'
     +'<span>'+SHORT[i]+'</span><strong>'+name+'</strong>'+(month===now?'<small>Bulan ini</small>':'<small>✦</small>')+'</button>';
  }).join('');
  dialog.innerHTML='<div class="pax-month-hero"><div class="pax-month-hero-heading">'
   +'<span class="pax-month-hero-icon" aria-hidden="true">🗓️</span><div><span class="pax-month-overline">KALENDER PAAXIXI ✦</span>'
   +'<h3 id="pax-month-heading">Pilih Bulan & Tahun</h3><p>'+safe(label(active))+'</p></div>'
   +'<button class="pax-month-close" type="button" data-pax-month-close aria-label="Tutup kalender">×</button></div>'
   +'<div class="pax-month-selected"><span>Periode terpilih</span><strong>'+safe(labelFor(sel))+'</strong><span aria-hidden="true">✨</span></div></div>'
   +'<div class="pax-month-content"><div class="pax-month-yearline">'
   +'<button type="button" data-pax-month-prev aria-label="Tahun sebelumnya" '+(year<=minYear?'disabled':'')+'>‹</button>'
   +'<label for="pax-month-year">Pilih Tahun <select id="pax-month-year" data-pax-month-year aria-label="Pilih tahun">'
   +Array.from({length:maxYear-minYear+1},(_,i)=>{const n=maxYear-i;return '<option value="'+n+'" '+(n===year?'selected':'')+'>'+n+'</option>';}).join('')
   +'</select></label>'
   +'<button type="button" data-pax-month-next aria-label="Tahun berikutnya" '+(year>=maxYear?'disabled':'')+'>›</button></div>'
   +'<div class="pax-month-grid" role="group" aria-label="Pilihan bulan tahun '+year+'">'+cells+'</div>'
   +'<div class="pax-month-shortcuts"><button type="button" data-pax-month-this '+(within(now,active)?'':'disabled')+'>✦ Bulan Ini</button>'
   +'<span>Atau isikan bulan secara manual</span></div>'
   +'<div class="pax-month-manual"><label for="pax-month-manual-input">✎ Ketik Bulan / Tahun</label>'
   +'<div><input id="pax-month-manual-input" data-pax-month-manual type="text" autocomplete="off" placeholder="11/2026 atau November 2026" value="'+safe(sel)+'">'
   +'<button type="button" data-pax-month-apply>Terapkan</button></div><p data-pax-month-error role="alert" hidden></p>'
   +'<small>Bisa menggunakan YYYY-MM, MM/YYYY, atau nama bulan dan tahun.</small></div></div>';
 }
 function apply(){
  const field=dialog?.querySelector('[data-pax-month-manual]');
  const error=dialog?.querySelector('[data-pax-month-error]');
  if(!field||!error)return;
  const parsed=manualParse(field.value);
  if(!parsed){error.hidden=false;error.textContent='Periode tidak valid. Contoh: 11/2026, November 2026, atau 2026-11.';field.focus();return;}
  if(!within(parsed,active)){
   const b=monthBound(active);
   error.hidden=false;error.textContent='Pilih periode antara '+labelFor(b.min)+' dan '+labelFor(b.max)+'.';
   field.focus();return;
  }
  choose(parsed);
 }
 function open(field){
  if(!field||field.disabled||field.readOnly)return;
  close(false);
  active=field;
  const bounds=monthBound(field);
  const desired=periodOk(field.value)?field.value:todayMonth();
  const value=desired<bounds.min?bounds.min:desired>bounds.max?bounds.max:desired;
  year=Number(value.slice(0,4));
  dialog=document.createElement('dialog');
  dialog.className='pax-month-dialog';
  dialog.setAttribute('aria-labelledby','pax-month-heading');
  document.body.append(dialog);
  render();
  dialog.addEventListener('click',event=>{
   event.stopPropagation();
   if(event.target===dialog||event.target.closest('[data-pax-month-close]')){close(true);return;}
   const select=event.target.closest('[data-pax-month-select]');
   if(select){choose(select.dataset.paxMonthSelect);return;}
   if(event.target.closest('[data-pax-month-prev]')){year--;render();return;}
   if(event.target.closest('[data-pax-month-next]')){year++;render();return;}
   if(event.target.closest('[data-pax-month-this]')){choose(todayMonth());return;}
   if(event.target.closest('[data-pax-month-apply]'))apply();
  });
  dialog.addEventListener('change',event=>{
   event.stopPropagation();
   if(event.target.matches('[data-pax-month-year]')){
    year=Number(event.target.value);render();dialog.querySelector('[data-pax-month-year]')?.focus({preventScroll:true});
   }
  });
  dialog.addEventListener('keydown',event=>{
   event.stopPropagation();
   if(event.key==='Enter'&&event.target.matches('[data-pax-month-manual]')){event.preventDefault();apply();}
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close(true);});
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  dialog.querySelector('.pax-month-option.is-picked:not(:disabled)')?.focus({preventScroll:true});
 }
 function init(){
  if(ready)return;
  ready=true;enhance(document);
  document.addEventListener('click',event=>{
   const trigger=event.target.closest?.('[data-pax-month-trigger]');
   if(!trigger)return;
   const field=trigger.closest('.pax-month-shell')?.querySelector('input[type="month"]');
   if(!field)return;
   event.preventDefault();event.stopPropagation();open(field);
  },true);
  document.addEventListener('keydown',event=>{
   const trigger=event.target.closest?.('[data-pax-month-trigger]');
   if(trigger&&event.altKey&&event.key==='ArrowDown'){
    event.preventDefault();
    const field=trigger.closest('.pax-month-shell')?.querySelector('input[type="month"]');
    if(field)open(field);
   }
  },true);
  document.addEventListener('change',event=>{
   if(event.target.matches?.('input[type="month"]'))sync(document);
  });
 }
 window.PAAX_MONTH_PICKER={init,enhance,sync,close,open,parse:manualParse};
})();
