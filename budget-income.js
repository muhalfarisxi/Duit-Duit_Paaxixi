/* Paaxixi income budgets.
   Mirrors expense planning while preserving separate income budget records.
   No page navigation, no external traffic, no mutation of expense budgets. */
(function(){
'use strict';
const fmt=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asNum=v=>Math.round(Number(v)||0);
const readMoney=v=>{
 const raw=String(v??'').trim();
 if(!raw)return NaN;
 const normalized=raw.replace(/^Rp\s*/i,'').replace(/\s/g,'');
 if(!/^\d{1,3}(?:\.\d{3})*$|^\d+$/.test(normalized))return NaN;
 const x=Number(normalized.replace(/\./g,''));
 return Number.isSafeInteger(x)&&x>=0?x:NaN;
};
const stamp=()=>new Date().toISOString();
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const id=()=> 'income-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const palette=[
 {name:'Zamrud',color:'#22956f'},{name:'Toska',color:'#159d92'},{name:'Sage',color:'#7e9b55'},
 {name:'Mint',color:'#48a998'},{name:'Jade',color:'#188e7c'},{name:'Lumutan',color:'#7c9460'},
 {name:'Biru Hijau',color:'#308faa'},{name:'Lime',color:'#8baf4e'}
];
const defaults=[['BPS','#279b74'],['Fastlink','#18a59b'],['Lainnya','#7b9c54']];
const hooks={get:null,save:null,rerender:null,toast:null,confirm:null};
let tab='detail',dialog=null;
const expanded={detail:new Set(),edit:new Set()};
const d=()=>hooks.get?.()?.db||null;
const month=()=>hooks.get?.()?.month||today().slice(0,7);
const view=()=>hooks.get?.()?.view||'';
const mm=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
function notify(message,bad=false){hooks.toast?.(message,bad);}
function rerender(){hooks.rerender?.();}
function ensure(){
 const db=d();if(!db)return;
 if(!db.incomeBudgets||typeof db.incomeBudgets!=='object'||Array.isArray(db.incomeBudgets))db.incomeBudgets={};
 for(const field of ['incomeBudgetMoves','incomeBudgetAdjustments','incomeBudgetBaseHistory'])
  if(!Array.isArray(db[field]))db[field]=[];
 if(!db.incomeBudgetInitialStates||typeof db.incomeBudgetInitialStates!=='object')db.incomeBudgetInitialStates={};
 if(!Array.isArray(db.incomeGroups))db.incomeGroups=[];
 const categories=(db.categories||[]).filter(x=>x.kind==='income'),names=new Set();
 const groups=[];
 for(const item of db.incomeGroups){
  const name=String(item?.name||'').trim().slice(0,55);if(!name||names.has(name.toLowerCase()))continue;
  groups.push({id:String(item.id||id()),name,color:/^#[a-f0-9]{6}$/i.test(item.color)?item.color:palette[groups.length%palette.length].color});
  names.add(name.toLowerCase());
 }
 for(const category of categories){
  const name=String(category.group||'Lainnya').trim().slice(0,55)||'Lainnya';
  if(names.has(name.toLowerCase()))continue;
  groups.push({id:id(),name,color:defaults.find(x=>x[0].toLowerCase()===name.toLowerCase())?.[1]||
   palette[groups.length%palette.length].color});
  names.add(name.toLowerCase());
 }
 db.incomeGroups=groups;
}
const rows=()=>((d()?.categories||[]).filter(c=>c.kind==='income'));
const groups=()=>{ensure();return d()?.incomeGroups||[];};
const base=c=>Math.max(0,asNum(d().incomeBudgets[month()+'|'+c]));
const moves=()=>d().incomeBudgetMoves.filter(x=>x.month===month());
const adjustments=()=>d().incomeBudgetAdjustments.filter(x=>x.month===month());
const history=()=>d().incomeBudgetBaseHistory.filter(x=>x.month===month());
const transfer=id=>moves().reduce((sum,x)=>sum+(x.to===id?asNum(x.amount):0)-(x.from===id?asNum(x.amount):0),0);
const delta=id=>adjustments().reduce((sum,x)=>sum+(x.categoryId===id?(x.type==='increase'?1:-1)*asNum(x.amount):0),0);
const effective=id=>base(id)+transfer(id)+delta(id);
const received=id=>d().transactions.filter(x=>x.type==='income'&&x.categoryId===id&&x.date.startsWith(month())).reduce((s,x)=>s+asNum(x.amount),0);
const initialState=()=>d()?.incomeBudgetInitialStates?.[month()]?.status||'draft';
const locked=()=>initialState()==='locked';
function metrics(categories=rows()){
 let original=0,added=0,reduced=0,transfers=0,actual=0;
 for(const c of categories){
  original+=base(c.id);actual+=received(c.id);
  transfers+=transfer(c.id);
 }
 const catIds=new Set(categories.map(x=>x.id));
 for(const item of adjustments())if(catIds.has(item.categoryId)){
  if(item.type==='increase')added+=asNum(item.amount);else reduced+=asNum(item.amount);
 }
 const target=original+added-reduced+transfers;
 return {original,added,reduced,transfers,target,actual,difference:actual-target,
  percent:target>0?Math.round(actual/target*100):0};
}

function allowChanges(){
 const cloud=hooks.get?.()?.cloud;
 if(cloud?.pendingDecision){
  notify('Pilih Unggah Data Lokal atau Mulai Cloud Kosong sebelum mengubah target.',true);return false;
 }
 if(cloud?.signedIn&&!cloud?.ready){
  notify('Tunggu hingga sinkronisasi cloud selesai.',true);return false;
 }
 return true;
}

function persist(message){
 if(hooks.save?.()===false){notify('Gagal menyimpan perubahan anggaran pemasukan.',true);return false;}
 rerender();if(message)notify(message);return true;
}
function pill(x){
 if(x.target<=0)return '<span class="ib-status none">Belum Ada Target</span>';
 if(x.actual>=x.target)return '<span class="ib-status success">✓ Target Tercapai</span>';
 if(x.actual>=x.target*.8)return '<span class="ib-status near">◔ Hampir Tercapai</span>';
 return '<span class="ib-status pending">◷ Masih Berproses</span>';
}
function bar(x,tag){
 const fraction=x.target>0?Math.min(100,Math.max(0,x.actual/x.target*100)):0;
 const overflow=x.target>0&&x.actual>x.target;
 return '<div class="ib-progress" role="progressbar" aria-label="'+safe(tag)+': '+safe(fmt(x.actual))+' dari '+safe(fmt(x.target))+
  '" aria-valuenow="'+Math.round(fraction)+'" aria-valuemin="0" aria-valuemax="100">'+
  '<i style="width:'+fraction.toFixed(2)+'%"></i></div>'+
  '<div class="ib-progress-labels"><span>'+x.percent+'% target terealisasi</span>'+
  '<strong class="'+(overflow?'success':'')+'">'+(overflow?'Surplus ':'Sisa target ')+fmt(Math.abs(x.difference))+'</strong></div>';
}
function equation(x){
 return '<div class="ib-equation"><span>Awal <b>'+fmt(x.original)+'</b></span>'+
  '<span class="plus">＋ Tambahan <b>'+fmt(x.added)+'</b></span>'+
  '<span class="minus">− Pengurangan <b>'+fmt(x.reduced)+'</b></span>'+
  '<span>🔀 Alih <b>'+(x.transfers>=0?'+':'−')+fmt(Math.abs(x.transfers))+'</b></span>'+
  '<strong>Target Efektif '+fmt(x.target)+'</strong></div>';
}
function compactStats(x){
 return '<div class="ib-figures"><span><small>Target Efektif</small><strong>'+fmt(x.target)+'</strong></span>'+
  '<span><small>Realisasi</small><strong>'+fmt(x.actual)+'</strong></span>'+
  '<span><small>'+(x.difference>=0?'Surplus':'Kekurangan')+'</small><strong class="'+(x.difference>=0?'success':'')+'">'+fmt(Math.abs(x.difference))+'</strong></span></div>';
}
function groupDetail(group){
 const cats=rows().filter(x=>x.group===group.name);
 const x=metrics(cats),open=expanded.detail.has(group.id),tone=x.actual>=x.target&&x.target>0?'met':'';
 return '<details class="ib-group-detail '+tone+'" data-income-expand="detail:'+safe(group.id)+'" style="--ib-group:'+safe(group.color)+'" '+(open?'open':'')+'>'+
  '<summary><div class="ib-group-info"><span class="ib-group-icon">🍀</span><div><strong>'+safe(group.name)+'</strong>'+
  '<small>'+cats.length+' pos pemasukan</small></div></div>'+pill(x)+
  compactStats(x)+bar(x,group.name)+equation(x)+
  '<span class="ib-drop-hint">'+(open?'Tutup rincian pos':'Lihat rincian tiap pos')+' <b>⌄</b></span></summary>'+
  '<div class="ib-group-inside">'+(cats.length?cats.map(c=>{
   const t=metrics([c]);return '<article class="ib-pos-detail"><div><span>💵</span><div><strong>'+safe(c.label)+'</strong>'+
    '<small>Pos pemasukan · '+safe(group.name)+'</small></div></div>'+pill(t)+compactStats(t)+bar(t,c.label)+equation(t)+'</article>';
  }).join(''):'<p>Belum ada pos di kelompok ini.</p>')+'</div></details>';
}
function sectionDetail(){
 return '<section class="ib-panel"><div class="ib-section-head"><div><h3>📊 Rincian Anggaran Pemasukan</h3>'+
  '<p>Bandingkan target dengan pemasukan yang sudah diterima pada setiap kelompok dan pos.</p></div>'+
  '<div class="ib-legend"><span>🟢 Tercapai</span><span>🟡 Mendekati</span><span>🔵 Berproses</span></div></div>'+
  '<div class="ib-detail-groups">'+groups().map(groupDetail).join('')+'</div></section>';
}
function changeHistory(){
 const m=month(),c=rows();
 const nameOf=id=>safe(c.find(z=>z.id===id)?.label||'Pos sudah dihapus');
 const hists=[
  ...history().map(x=>({id:x.id,created:x.createdAt||x.date,date:x.date,kind:'base',
   text:nameOf(x.categoryId),description:'Target awal '+fmt(x.previous)+' → '+fmt(x.next)+
    (x.note?' · '+safe(x.note):''),amount:fmt(x.next),action:'base'})),
  ...moves().map(x=>({id:x.id,created:x.createdAt||x.date,date:x.date,kind:'move',
   text:nameOf(x.from)+' → '+nameOf(x.to),description:safe(x.note||'Pengalihan rencana'),
   amount:fmt(x.amount),action:'move'})),
  ...adjustments().map(x=>({id:x.id,created:x.createdAt||x.date,date:x.date,kind:x.type,
   text:nameOf(x.categoryId),description:(x.type==='increase'?'Penambahan':'Pengurangan')+' · '+safe(x.note||''),
   amount:(x.type==='increase'?'+':'−')+fmt(x.amount),action:'adjust'}))
 ].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.created).localeCompare(String(a.created))).slice(0,180);
 if(!hists.length)return '<div class="ib-empty">🗂️ Belum ada perubahan anggaran pemasukan '+safe(mm(m))+'.</div>';
 return '<div class="ib-history" role="region" tabindex="0">'+hists.map(x=>'<article><span class="ib-history-icon">'+
  (x.kind==='move'?'🔀':x.kind==='base'?'✏️':x.kind==='increase'?'➕':'➖')+'</span>'+
  '<div><strong>'+x.text+'</strong><small>'+safe(x.date)+' · '+x.description+'</small></div>'+
  '<b>'+x.amount+'</b>'+((x.kind==='base')?'': '<div class="ib-history-actions"><button type="button" data-income-edit-record="'+x.action+':'+safe(x.id)+'">Edit</button>'+
  '<button type="button" class="danger" data-income-remove-record="'+x.action+':'+safe(x.id)+'">Hapus</button></div>')+'</article>').join('')+'</div>';
}
function groupEditor(group){
 const cats=rows().filter(x=>x.group===group.name),x=metrics(cats),open=expanded.edit.has(group.id);
 return '<details class="ib-group-editor" data-income-expand="edit:'+safe(group.id)+'" style="--ib-group:'+safe(group.color)+'" '+(open?'open':'')+'>'+
  '<summary><span class="ib-group-icon">🍀</span><span><strong>'+safe(group.name)+'</strong><small>'+cats.length+' pos · Awal '+
   fmt(x.original)+' · Efektif '+fmt(x.target)+' · Realisasi '+fmt(x.actual)+'</small></span><b>⌄</b></summary>'+
  '<div class="ib-group-editor-content"><div class="ib-group-actions">'+
  '<button type="button" data-income-dialog="group:'+safe(group.id)+'">✏️ Nama & Warna Kelompok</button>'+
  '<button type="button" data-income-dialog="pos:new:'+safe(group.name)+'">＋ Tambah Pos</button>'+
  '<button type="button" class="danger" data-income-remove-group="'+safe(group.id)+'">Hapus Kelompok</button></div>'+
  '<div class="ib-pos-list">'+cats.map(c=>'<article><span>💵</span><div><strong>'+safe(c.label)+'</strong><small>'+
   'Awal '+fmt(base(c.id))+' · Efektif '+fmt(effective(c.id))+' · Realisasi '+fmt(received(c.id))+'</small></div>'+
   '<button type="button" data-income-dialog="pos:'+safe(c.id)+'">Nama Pos</button>'+
   '<button type="button" class="danger" data-income-remove-pos="'+safe(c.id)+'">Hapus</button>'+
   '<button type="button" class="primary" data-income-dialog="actions:'+safe(c.id)+'">'+
   (locked()?'✏️ Edit Pos':'📝 Isi Target Awal')+'</button></article>').join('')+
  (cats.length?'':'<div class="ib-empty">Tambah pos untuk mulai menetapkan target.</div>')+
  '</div></div></details>';
}
function sectionEdit(){
 const x=metrics(),isLocked=locked();
 return '<section class="ib-panel ib-edit-panel"><div class="ib-section-head"><div><h3>✏️ Edit Anggaran Pemasukan</h3>'+
  '<p>'+safe(mm(month()))+' · '+(isLocked?'Target awal dikunci. Koreksi harus memiliki alasan.':
   'Isi target setiap pos, kemudian tetapkan target awal bulan ini.')+'</p></div>'+
  '<div class="ib-toolbar"><button type="button" data-income-dialog="group:new">＋ Tambah Kelompok</button>'+
  '<button type="button" data-income-dialog="pos:new">＋ Tambah Pos</button></div></div>'+
  (isLocked?'<div class="ib-quick-actions"><span>✨ Kelola Target Pemasukan</span>'+
   '<button type="button" data-income-dialog="move:new">🔀 Alihkan Target</button>'+
   '<button type="button" data-income-dialog="adjust:new">➕➖ Tambah / Kurangi</button></div>':'')+
  '<div class="ib-lock '+(isLocked?'locked':'draft')+'"><div><strong>'+
   (isLocked?'🔒 Target Awal Sudah Ditetapkan':'📝 Target Awal Belum Ditetapkan')+'</strong>'+
   '<small>'+(isLocked?'Koreksi dicatat dalam riwayat.':'Tetapkan target terlebih dahulu untuk mengalihkan atau menyesuaikan.')+
   '</small></div>'+(isLocked?'<span>✓ Ditetapkan</span>':
   '<button type="button" data-income-establish '+(x.original<=0?'disabled':'')+'>✓ Tetapkan Target Awal · '+fmt(x.original)+'</button>')+'</div>'+
  '<div class="ib-editor-groups">'+groups().map(groupEditor).join('')+'</div>'+
  '<div class="ib-history-section"><div><h4>🕘 Riwayat Perubahan Target Pemasukan</h4>'+
  '<span>'+[...history(),...moves(),...adjustments()].length+' catatan</span></div>'+changeHistory()+'</div></section>';
}
function render(){
 ensure();
 const x=metrics();
 return '<div class="ib-root"><div class="ib-metrics">'+
  '<div><small>Target Pemasukan Awal</small><strong>'+fmt(x.original)+'</strong></div>'+
  '<div><small>Penambahan Target</small><strong>+'+fmt(x.added)+'</strong></div>'+
  '<div><small>Pengurangan Target</small><strong>−'+fmt(x.reduced)+'</strong></div>'+
  '<div><small>Target Pemasukan Efektif</small><strong>'+fmt(x.target)+'</strong></div></div>'+
  '<div class="ib-total-progress"><span>💚 Realisasi Pemasukan <strong>'+fmt(x.actual)+'</strong></span>'+
  '<span>'+(x.difference>=0?'✨ Surplus Target':'🎯 Kekurangan Target')+' <strong>'+fmt(Math.abs(x.difference))+'</strong></span>'+
  '<div class="ib-total-progressbar"><i style="width:'+Math.min(100,Math.max(0,x.percent))+'%"></i></div>'+
  '<small>'+x.percent+'% target pemasukan bulanan tercapai</small></div>'+
  '<nav class="budget-work-tabs budget-work-tabs-two ib-tabs" role="tablist" aria-label="Anggaran Pemasukan">'+
  [['detail','📊 Rincian Anggaran'],['edit','✏️ Edit Anggaran']].map(([key,label])=>
   '<button type="button" role="tab" data-income-tab="'+key+'" aria-selected="'+(tab===key)+'" tabindex="'+(tab===key?'0':'-1')+'">'+label+'</button>').join('')+
  '</nav>'+(tab==='edit'?sectionEdit():sectionDetail())+'</div>';
}
const listSelect=(name,value='',exclude='')=>'<select class="field" name="'+name+'" required>'+
 rows().filter(x=>x.id!==exclude).map(c=>'<option value="'+safe(c.id)+'" '+(value===c.id?'selected':'')+'>'+
  safe(c.group)+' · '+safe(c.label)+'</option>').join('')+'</select>';
const groupSelect=(value='')=>'<select class="field" name="group" required>'+
 groups().map(g=>'<option value="'+safe(g.name)+'" '+(value===g.name?'selected':'')+'>'+safe(g.name)+'</option>').join('')+'</select>';
const field=(label,input,className='')=>'<label class="ib-field '+className+'"><span>'+label+'</span>'+input+'</label>';
const txt=(name,value='',placeholder='',max=100)=>'<input class="field" name="'+name+'" value="'+safe(value)+
 '" maxlength="'+max+'" placeholder="'+safe(placeholder)+'" required>';
const moneyField=(name,val,label)=>field(label,'<input class="field" name="'+name+
 '" data-income-money type="text" inputmode="numeric" value="'+asNum(val).toLocaleString('id-ID')+
 '" placeholder="0" required>','is-money');
function dialogMarkup(kind,identifier,extra){
 const categories=rows(),found=categories.find(x=>x.id===identifier),m=month();
 const old=kind==='move'?moves().find(x=>x.id===identifier):kind==='adjust'?adjustments().find(x=>x.id===identifier):null;
 const group=groups().find(x=>x.id===identifier);
 let title='',description='',icon='',fields='',actions=true;
 if(kind==='actions'){
  if(!found)return '';
  title='Edit Pos · '+found.label;icon='🧩';description='Pilih tindakan untuk target pemasukan pada pos ini.';
  fields='<div class="ib-action-choices"><button type="button" data-income-dialog="base:'+safe(found.id)+'">📝 Ubah Target Awal'+
   '<small>'+(locked()?'Perubahan harus memiliki alasan':'Target dasar belum dikunci')+'</small></button>'+
   '<button type="button" data-income-dialog="move:new:'+safe(found.id)+'" '+(!locked()?'disabled':'')+'>'+
   '🔀 Alihkan Target<small>Geser rencana antarpos pemasukan</small></button>'+
   '<button type="button" data-income-dialog="adjust:new:'+safe(found.id)+'" '+(!locked()?'disabled':'')+'>'+
   '➕➖ Tambah / Kurangi<small>Perubahan target tanpa transfer</small></button></div>';
  actions=false;
 }else if(kind==='base'){
  if(!found)return '';title='Ubah Target Awal · '+found.label;icon='📝';
  description=(locked()?'Target sudah ditetapkan; isi alasan koreksi dan konfirmasikan.':'Isi target awal untuk '+safe(mm(m))+'.');
  fields='<input type="hidden" name="categoryId" value="'+safe(found.id)+'">'+
   moneyField('amount',base(found.id),'Target Awal (Rp)')+
   (locked()?field('Alasan Koreksi',txt('note','','Contoh: Revisi proyeksi pendapatan')):'');
 }else if(kind==='move'){
  title=old?'Edit Pengalihan Target':'Alihkan Target Pemasukan';icon='🔀';
  description='Mengubah komposisi target tanpa mengubah jumlah keseluruhan. Bukan memindahkan saldo uang.';
  fields='<input type="hidden" name="editId" value="'+safe(old?.id||'')+'">'+
   field('Sumber Target',listSelect('from',old?.from||extra||''))+
   field('Tujuan Target',listSelect('to',old?.to||'',old?.from||extra||''))+
   moneyField('amount',old?.amount||0,'Jumlah yang Dialihkan (Rp)')+
   field('Catatan',txt('note',old?.note||'','Mengapa target dipindahkan?',220));
 }else if(kind==='adjust'){
  title=old?'Edit Penyesuaian Target':'Tambah / Kurangi Target';icon='➕';
  description='Mengubah target efektif. Jumlahnya tidak mengubah realisasi pemasukan.';
  fields='<input type="hidden" name="editId" value="'+safe(old?.id||'')+'">'+
   field('Pos Pemasukan',listSelect('categoryId',old?.categoryId||extra||''))+
   field('Jenis Penyesuaian','<select class="field" name="type">'+
    '<option value="increase" '+(old?.type!=='decrease'?'selected':'')+'>➕ Tambah Target</option>'+
    '<option value="decrease" '+(old?.type==='decrease'?'selected':'')+'>➖ Kurangi Target</option></select>')+
   moneyField('amount',old?.amount||0,'Nominal (Rp)')+
   field('Alasan',txt('note',old?.note||'','Contoh: Bonus diperkirakan berkurang',220));
 }else if(kind==='group'){
  title=group?'Ubah Kelompok Pemasukan':'Tambah Kelompok Pemasukan';icon='🧩';
  description='Kelompok mempermudah pengelompokan target dan grafik pemasukan.';
  fields='<input type="hidden" name="editId" value="'+safe(group?.id||'')+'">'+
   field('Nama Kelompok',txt('name',group?.name||'','Contoh: Pekerjaan Sampingan',55))+
   field('Warna Kelompok','<div class="ib-color-palette">'+
    (group?.color&&!palette.some(p=>p.color.toLowerCase()===group.color.toLowerCase())?
     '<label style="--group-color:'+safe(group.color)+'"><input type="radio" name="color" value="'+safe(group.color)+
     '" checked><span aria-hidden="true"></span><small>Warna saat ini</small></label>':'')+
    palette.map(p=>'<label style="--group-color:'+p.color+'"><input type="radio" name="color" value="'+p.color+'" '+
    ((group?.color||palette[0].color)===p.color?'checked':'')+'>'+
    '<span aria-hidden="true"></span><small>'+p.name+'</small></label>').join('')+'</div>');
 }else if(kind==='pos'){
  title=found?'Edit Pos Pemasukan':'Tambah Pos Pemasukan';icon='💵';
  description='Pos yang ditambahkan langsung tersedia dalam kategori transaksi pemasukan.';
  fields='<input type="hidden" name="editId" value="'+safe(found?.id||'')+'">'+
   field('Kelompok Pemasukan',groupSelect(found?.group||extra||''))+
   field('Nama Pos',txt('name',found?.label||'','Contoh: Honor Kegiatan',70));
 }else return '';
 return '<div class="ib-backdrop" id="ib-backdrop" role="presentation"><section class="ib-dialog" role="dialog" aria-modal="true" aria-labelledby="ib-title">'+
 '<header><span>'+icon+'</span><div><small>ANGGARAN PEMASUKAN · '+safe(mm(m))+'</small><h3 id="ib-title">'+safe(title)+'</h3>'+
 '<p>'+safe(description)+'</p></div><button type="button" data-income-close aria-label="Tutup">✕</button></header>'+
 (actions?'<form id="income-budget-dialog-form"><input type="hidden" name="action" value="'+safe(kind)+'">'+
 '<div class="ib-form-fields">'+fields+'</div><div class="ib-dialog-actions">'+
 '<button type="button" data-income-close>Batal</button><button type="submit">✓ Simpan Perubahan</button></div></form>':
 '<div class="ib-action-body">'+fields+'<button type="button" data-income-close>Batal</button></div>')+'</section></div>';
}
function closeDialog(refocus=true){
 dialog=null;document.getElementById('ib-backdrop')?.remove();
 if(refocus)document.querySelector('[data-income-dialog]')?.focus({preventScroll:true});
}
function openDialog(value){
 const parts=String(value||'').split(':'),kind=parts[0],identifier=parts[1]==='new'?'':parts[1]||'',
   extra=parts.length>2?parts.slice(2).join(':'):'';
 if(!['group','pos','base','move','adjust','actions'].includes(kind))return;
 if(['move','adjust'].includes(kind)&&!locked()){notify('Tetapkan target pemasukan awal sebelum penyesuaian atau pengalihan.',true);return;}
 const html=dialogMarkup(kind,identifier,extra);
 if(!html)return;
 closeDialog(false);
 dialog={kind,identifier,extra};
 document.body.insertAdjacentHTML('beforeend',html);
 document.querySelector('#ib-backdrop form [name="amount"],#ib-backdrop form [name="name"],#ib-backdrop [data-income-dialog]')?.focus({preventScroll:true});
}
function validEffective(idItem,excludingMove='',excludingAdjustment=''){
 const relevant=rows().some(x=>x.id===idItem);if(!relevant)return false;
 const basis=base(idItem);
 const movesNet=d().incomeBudgetMoves.filter(m=>m.month===month()&&m.id!==excludingMove)
  .reduce((s,x)=>s+(x.to===idItem?asNum(x.amount):0)-(x.from===idItem?asNum(x.amount):0),0);
 const adjNet=d().incomeBudgetAdjustments.filter(x=>x.month===month()&&x.id!==excludingAdjustment)
  .reduce((s,x)=>s+(x.categoryId===idItem?(x.type==='increase'?1:-1)*asNum(x.amount):0),0);
 return basis+movesNet+adjNet;
}
async function submit(form){
 const formdata=new FormData(form),kind=String(formdata.get('action')||''),db=d(),m=month();
 if(!db||view()!=='budgets'||!allowChanges())return;
 const amount=readMoney(formdata.get('amount')),validCategory=id=>rows().some(c=>c.id===id);
 let message='Perubahan anggaran pemasukan disimpan.';
 if(kind==='base'){
  const idItem=String(formdata.get('categoryId')||'');
  if(!validCategory(idItem)||!Number.isSafeInteger(amount))return notify('Isi target awal rupiah yang valid.',true);
  const before=base(idItem),after=amount;
  if(before===after)return notify('Target awal belum berubah.');
  if(after+validEffective(idItem)-before<0)return notify('Target efektif tidak boleh negatif.',true);
  const note=String(formdata.get('note')||'').trim().slice(0,220);
  if(locked()){
   if(!note)return notify('Koreksi target yang terkunci harus memiliki alasan.',true);
   const ok=await hooks.confirm?.({title:'Koreksi Target Pemasukan?',message:
    'Ubah target awal '+(rows().find(x=>x.id===idItem)?.label||'pos')+' dari '+fmt(before)+' menjadi '+fmt(after)+
    '? Perubahan dicatat dalam riwayat.',confirmText:'Ya, Koreksi',icon:'📝'});
   if(!ok)return;
  }
  db.incomeBudgets[m+'|'+idItem]=after;
  db.incomeBudgetBaseHistory.push({id:id(),month:m,date:today(),createdAt:stamp(),categoryId:idItem,
   categoryLabel:rows().find(c=>c.id===idItem)?.label||'',previous:before,next:after,
   correction:locked(),note:note||'Pengisian draft target awal'});
  if(!locked())db.incomeBudgetInitialStates[m]={status:'draft',lockedAt:''};
  message='Target awal pemasukan berhasil '+(locked()?'dikoreksi.':'disimpan.');
 }else if(kind==='move'){
  const from=String(formdata.get('from')||''),to=String(formdata.get('to')||''),
   editId=String(formdata.get('editId')||'');
  const old=editId?moves().find(x=>x.id===editId):null,note=String(formdata.get('note')||'').trim().slice(0,220);
  if(!locked()||!validCategory(from)||!validCategory(to)||from===to||!Number.isSafeInteger(amount)||amount<=0||!note)
   return notify('Pilih dua pos berbeda, nominal positif, dan alasan pengalihan.',true);
  const available=validEffective(from,editId);
  if(amount>available)return notify('Nominal melebihi target yang tersedia pada pos sumber ('+fmt(available)+').',true);
  const affected=new Set([from,to,old?.from,old?.to].filter(Boolean));
  for(const category of affected){
   const simulated=validEffective(category,editId)+(category===to?amount:0)-(category===from?amount:0);
   if(simulated<0)return notify('Perubahan membuat target efektif suatu pos negatif. Sesuaikan pengalihan lain terlebih dahulu.',true);
  }
  const record={id:old?.id||id(),month:m,date:old?.date||today(),createdAt:old?.createdAt||stamp(),
   from,to,amount,note};
  db.incomeBudgetMoves=db.incomeBudgetMoves.filter(x=>x.id!==editId).concat(record);
  message='Pengalihan target pemasukan tersimpan.';
 }else if(kind==='adjust'){
  const categoryId=String(formdata.get('categoryId')||''),type=String(formdata.get('type')||''),
   editId=String(formdata.get('editId')||''),old=editId?adjustments().find(x=>x.id===editId):null,
   note=String(formdata.get('note')||'').trim().slice(0,220);
  if(!locked()||!validCategory(categoryId)||!['increase','decrease'].includes(type)||
     !Number.isSafeInteger(amount)||amount<=0||!note)
   return notify('Lengkapi pos, perubahan, nominal positif, dan alasan.',true);
  const candidates=[...new Set([old?.categoryId,categoryId].filter(Boolean))];
  for(const category of candidates){
   const net=validEffective(category,'',editId)+
    (category===categoryId?(type==='increase'?1:-1)*amount:0);
   if(net<0)return notify('Pengurangan membuat target efektif '+(rows().find(x=>x.id===category)?.label||'')+' negatif.',true);
  }
  db.incomeBudgetAdjustments=db.incomeBudgetAdjustments.filter(x=>x.id!==editId).concat({
   id:old?.id||id(),month:m,date:old?.date||today(),createdAt:old?.createdAt||stamp(),
   type,categoryId,amount,note});
  message='Penyesuaian target pemasukan tersimpan.';
 }else if(kind==='group'){
  const name=String(formdata.get('name')||'').trim().slice(0,55),
    color=String(formdata.get('color')||'');
  const editId=String(formdata.get('editId')||''),old=db.incomeGroups.find(g=>g.id===editId);
  if(!name||!/^#[a-f0-9]{6}$/i.test(color)||db.incomeGroups.some(g=>g.id!==editId&&g.name.toLowerCase()===name.toLowerCase()))
   return notify('Nama atau warna kelompok tidak valid / sudah digunakan.',true);
  if(old){
   const oldName=old.name;old.name=name;old.color=color;
   for(const item of rows())if(item.group===oldName)item.group=name;
  }else db.incomeGroups.push({id:id(),name,color});
  message='Kelompok pemasukan berhasil disimpan.';
 }else if(kind==='pos'){
  const name=String(formdata.get('name')||'').trim().slice(0,70),
   group=String(formdata.get('group')||''),editId=String(formdata.get('editId')||''),
   old=rows().find(c=>c.id===editId);
  if(!name||!groups().some(g=>g.name===group)||
   rows().some(c=>c.id!==editId&&c.label.toLowerCase()===name.toLowerCase()&&c.group===group))
   return notify('Nama pos harus unik di kelompok yang dipilih.',true);
  if(old){old.label=name;old.group=group;}
  else db.categories.push({id:id(),kind:'income',label:name,group});
  message='Pos pemasukan berhasil disimpan.';
 }else return;
 closeDialog(false);persist(message);
}
async function confirmAction(title,message,confirmText='Ya, Lanjutkan'){
 return !!(await hooks.confirm?.({title,message,confirmText,icon:'💚',warning:true}));
}
async function remove(type,identifier){
 const db=d();if(!db||!allowChanges())return;
 if(type==='group'){
  const group=groups().find(g=>g.id===identifier);if(!group)return;
  if(rows().some(x=>x.group===group.name))return notify('Kelompok masih memiliki pos. Pindahkan atau hapus posnya terlebih dahulu.',true);
  if(!(await confirmAction('Hapus Kelompok Pemasukan?','Hapus kelompok '+group.name+' yang belum memiliki pos?')))return;
  db.incomeGroups=db.incomeGroups.filter(x=>x.id!==identifier);
 }else if(type==='pos'){
  const item=rows().find(x=>x.id===identifier);if(!item)return;
  const hasTx=db.transactions.some(x=>x.categoryId===identifier);
  const hasBudget=Object.entries(db.incomeBudgets).some(([k,v])=>k.endsWith('|'+identifier)&&Number(v)!==0);
  const hasHistory=db.incomeBudgetMoves.some(x=>x.from===identifier||x.to===identifier)||
   db.incomeBudgetAdjustments.some(x=>x.categoryId===identifier)||
   db.incomeBudgetBaseHistory.some(x=>x.categoryId===identifier);
  if(hasTx||hasBudget||hasHistory)return notify('Pos digunakan transaksi/target/riwayat. Data terkait harus diselesaikan terlebih dahulu.',true);
  if(!(await confirmAction('Hapus Pos Pemasukan?','Hapus '+item.label+'?')))return;
  db.categories=db.categories.filter(x=>x.id!==identifier);
 }else if(type==='move'||type==='adjust'){
  const collection=type==='move'?'incomeBudgetMoves':'incomeBudgetAdjustments',item=db[collection].find(x=>x.id===identifier);
  if(!item)return;
  const affected=type==='move'?[item.from,item.to]:[item.categoryId];
  for(const category of affected){
   const rest=type==='move'?validEffective(category,item.id):validEffective(category,'',item.id);
   if(rest<0)return notify('Riwayat ini masih diperlukan agar target efektif pos tetap tidak negatif. Koreksi target lain dahulu.',true);
  }
  if(!(await confirmAction('Hapus Riwayat Anggaran Pemasukan?','Hapus '+(type==='move'?'pengalihan':'penyesuaian')+' '+fmt(item.amount)+'?')))return;
  db[collection]=db[collection].filter(x=>x.id!==identifier);
 }else return;
 persist('Catatan anggaran pemasukan berhasil dihapus.');
}
async function establish(){
 if(!allowChanges())return;
 if(locked())return notify('Target bulan ini sudah ditetapkan.');
 const x=metrics();
 if(x.original<=0)return notify('Isi setidaknya satu target pemasukan awal terlebih dahulu.',true);
 if(rows().some(c=>effective(c.id)<0))return notify('Periksa target efektif negatif.',true);
 if(!(await confirmAction('Tetapkan Target Pemasukan Awal?',
  'Target pemasukan '+mm(month())+' sebesar '+fmt(x.original)+' akan dikunci. Perubahan selanjutnya wajib dicatat sebagai koreksi.',
  'Ya, Tetapkan Target')))return;
 d().incomeBudgetInitialStates[month()]={status:'locked',lockedAt:stamp()};
 tab='edit';persist('Target pemasukan awal ditetapkan.');
}
function intercept(event){
 const target=event.target?.closest?.('[data-income-tab],[data-income-dialog],[data-income-close],'+
 '[data-income-establish],[data-income-remove-group],[data-income-remove-pos],'+
 '[data-income-edit-record],[data-income-remove-record]');
 if(event.target?.id==='ib-backdrop'){event.preventDefault();event.stopImmediatePropagation();closeDialog();return;}
 if(!target)return;
 if(!document.getElementById('ib-backdrop')&&view()!=='budgets')return;
 event.preventDefault();event.stopImmediatePropagation();
 if(target.dataset.incomeTab!==undefined){
  if(!['detail','edit'].includes(target.dataset.incomeTab))return;
  tab=target.dataset.incomeTab;rerender();
  document.querySelector('[data-income-tab="'+tab+'"]')?.focus({preventScroll:true});return;
 }
 if(target.dataset.incomeDialog!==undefined){openDialog(target.dataset.incomeDialog);return;}
 if(target.hasAttribute('data-income-close')){closeDialog();return;}
 if(target.hasAttribute('data-income-establish')){void establish();return;}
 if(target.dataset.incomeRemoveGroup!==undefined){void remove('group',target.dataset.incomeRemoveGroup);return;}
 if(target.dataset.incomeRemovePos!==undefined){void remove('pos',target.dataset.incomeRemovePos);return;}
 if(target.dataset.incomeEditRecord!==undefined){
  const [type,identifier]=target.dataset.incomeEditRecord.split(':');openDialog(type+':'+identifier);return;
 }
 if(target.dataset.incomeRemoveRecord!==undefined){
  const [type,identifier]=target.dataset.incomeRemoveRecord.split(':');void remove(type,identifier);
 }
}
function init(config){
 Object.assign(hooks,config);
 document.addEventListener('click',intercept,true);
 document.addEventListener('toggle',event=>{
  const el=event.target;
  const key=el?.dataset?.incomeExpand;
  if(!key)return;
  const [kind,groupId]=key.split(':');
  if(!expanded[kind])return;
  if(el.open)expanded[kind].add(groupId);else expanded[kind].delete(groupId);
 },true);
 document.addEventListener('submit',e=>{
  if(e.target?.id!=='income-budget-dialog-form')return;
  e.preventDefault();e.stopImmediatePropagation();void submit(e.target);
 },true);
 document.addEventListener('input',e=>{
  const input=e.target;
  if(!input?.matches?.('#income-budget-dialog-form [data-income-money]'))return;
  const before=String(input.value||'');let digits=before.replace(/\D/g,'').slice(0,15);
  input.value=digits?Number(digits).toLocaleString('id-ID'):'';
 },true);
 document.addEventListener('change',e=>{
  if(!e.target?.matches?.('#income-budget-dialog-form select[name="from"]'))return;
  const source=e.target.value,other=e.target.form?.elements?.to;
  if(other&&other.value===source){other.value=rows().find(x=>x.id!==source)?.id||'';}
 },true);
 document.addEventListener('keydown',e=>{
  if(!dialog||e.key!=='Escape')return;
  e.preventDefault();e.stopImmediatePropagation();closeDialog();
 },true);
 document.addEventListener('click',e=>{
  if(!e.target.closest?.('[data-nav]'))return;
  closeDialog(false);
 },true);
}
window.PAAX_INCOME_BUDGET={init,render,ensure,metrics,readMoney,version:1};
})();