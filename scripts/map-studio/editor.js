import { validateCatalog } from '/catalog.mjs';
const relayVisuals=await import('/relay-prototype-visuals.js').catch(()=>null);
import {bindStudioKeyboard,nativeKeyboardTarget} from '/studio-keyboard.js';
const {showOptimization,showTextureBudget}=await import('/asset-feedback.js').catch(()=>({showOptimization:host=>{host.textContent='Laporan optimasi belum tersedia. Simpan/ekspor draft sebelum memperbarui server.';},showTextureBudget:host=>{host.textContent='Optimasi baru belum aktif di server ini. Simpan/ekspor draft sebelum restart Map Studio.';}}));
let engineVisible=true;
window.addEventListener('message',event=>{
  if(window.parent!==window&&event.source===window.parent&&event.data?.type==='benteng-engine-visibility'&&typeof event.data.active==='boolean'){
    engineVisible=event.data.active;if(!engineVisible)keys.clear();
  }
});
import {mapVersions, editableMapVersion} from '/map-versions.mjs';
import {
  closestEdge,
  polygonBounds,
  moveDummy,
  MAX_POLYGON_NODES,
} from '/editor-tools.js';
import {
  contains,
  solidAt,
  waterAt,
  frameAt,
  mapIssues,
  validateMap,
  autoFixMap,
  resolveStructureVisual,
  createTerrainPatch,
  editorText,
  repairMapText,
  mapAssets,
} from '/model.js';
const $ = (id) => document.getElementById(id),
  canvas = $('canvas'),
  ctx = canvas.getContext('2d'),
  colors = {
    decoration: '#c8d3c7',
    solid: '#ff7070',
    parkour: '#ffa74b',
    water: '#63caff',
    slow: '#ffe080',
    bridge: '#90ec93',
  },
  layers = ['background', 'world', 'foreground'];
let state,
  map,
  template,
  builtinTemplates = [],
  builtins = [],
  library = [],
  builtinLibrary = [],
  selected = '',
  dirty = false,
  inspectOnly = false,
  choiceValue = '',
  history = [],
  future = [],
  drag = null,
  pointsMode = false,
  selectedNode = -1,
  drawing = null,
  pointer = null,
  falls = 0,
  dummyStatus = '',
  testing = false,
  player,
  last = 0,
  jumpUntil = 0,
  loading = false,
  uploadUrl,
  tileCache;
let replacement = null, fileTarget = null,terrainPick=null,terrainFileTarget='terrain';
let textRepairToken=null;
const recovery=document.createElement('div');recovery.id='editRecovery';recovery.hidden=true;
recovery.innerHTML='<p id="recoveryMessage" role="status" aria-live="polite"></p><div class="recovery-actions"><button id="repairSafeText" type="button">Rapikan nama & isian</button><button id="optimizeBudget" type="button" hidden>Ringankan gambar otomatis</button><button id="locateProblem" type="button">Lihat bagian bermasalah</button><button id="undoTextRepair" type="button" hidden>Batalkan perapian</button><button id="dismissRecovery" type="button">Tutup pesan</button></div><details id="repairReport" hidden><summary id="repairReportTitle">Lihat perubahan</summary><ul id="repairReportList"></ul></details>';
const feedbackArea=document.createElement('div');feedbackArea.id='studioFeedback';$('status').before(feedbackArea);feedbackArea.append($('status'),recovery);
const keys = new Set(),
  cache = new Map(),
  uid = () => crypto.randomUUID().replaceAll('-', ''),
  zoom = () =>
    Math.min(+$('zoom').value / 100, 4096 / Math.max(map.width, map.height)),
  clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
  snap = (n) => ($('grid').checked ? Math.round(n / 20) * 20 : n);
const notice = (s, error = false) => {
    $('status').textContent = error?friendlyError(s):s;
    $('status').title = s;
    $('status').className = error ? 'error' : '';
    if(error)showRecovery(s);
    else if($('repairReport').hidden)recovery.hidden=true;
  },
  safe = (fn) => async () => {
    try {
      await fn();
    } catch (e) {
      notice(e.message, true);
    }
  };
function friendlyError(text){
  if(/Failed to fetch|fetch failed|NetworkError/i.test(text))return 'Koneksi ke Map Studio terputus. Draft masih ada di panel ini. Periksa server, lalu coba lagi; ekspor draft sebelum menutup tab.';
  if(/Nama objek|Nama map|Keterangan.*(panjang|teks)|Keterangan tidak valid/.test(text))return 'Ada nama/keterangan yang perlu dirapikan. Gambar dan posisi objek tetap aman; gunakan “Rapikan nama & isian”.';
  if(/Objek [XY]:/.test(text))return 'Posisi objek berada di luar batas yang diizinkan. Periksa kolom X/Y yang ditandai; gambar Anda tidak dihapus.';
  if(/Perbaiki nilai field/.test(text))return 'Ada isian yang belum sesuai. Periksa kolom yang ditandai, lalu coba Simpan lagi. Draft Anda masih ada.';
  return text;
}
function showRecovery(text){
  recovery.hidden=false;$('recoveryMessage').textContent=friendlyError(text);$('recoveryMessage').title=text;
  $('repairReport').hidden=true;
  $('repairSafeText').hidden=!map||inspectOnly||!repairMapText(map).fixes.length;
  $('optimizeBudget').hidden=!map||inspectOnly||!/Anggaran gambar map|128 MiB/.test(text);
  $('locateProblem').hidden=!map||!(document.querySelector('input:invalid,textarea:invalid,select:invalid')||mapIssues(map).length);$('undoTextRepair').hidden=true;
}
function textInputs(){
  $('mapName').value=map.name;$('description').value=map.description;
  if(object()){$('objectName').value=object().name;$('selectionTitle').textContent=object().name;}
  for(const id of ['mapName','description','objectName']){$(id).setCustomValidity('');$(id).removeAttribute('aria-invalid');}
  $('objectNameCount').textContent=`${object()?.name?.length??0} / 100 karakter`;list();
}
function reportTextRepairs(fixes){
  recovery.hidden=false;$('recoveryMessage').textContent=`${fixes.length} nama/isian dirapikan. Gambar, collider, dan posisi tidak berubah. Periksa hasilnya; perapian bisa dibatalkan.`;
  $('repairSafeText').hidden=true;$('locateProblem').hidden=true;$('undoTextRepair').hidden=false;$('repairReport').hidden=false;
  $('repairReportTitle').textContent=`Lihat ${fixes.length} perubahan`;
  $('repairReportList').replaceChildren(...fixes.map(f=>{const li=document.createElement('li');li.textContent=`${f.message} → ${f.after}`;li.title=`Sebelumnya: ${typeof f.before==='string'?f.before:'belum berupa teks'}`;return li;}));
  textRepairToken=JSON.stringify(map);
}
function repairTextDraft(){
  if(!map||inspectOnly||loading||testing||drawing)return 0;
  const result=repairMapText(map);
  if(result.fixes.length){remember();map=result.map;textInputs();reportTextRepairs(result.fixes);check();}
  else {for(const id of ['mapName','description','objectName']){$(id).setCustomValidity('');$(id).removeAttribute('aria-invalid');}}
  return result.fixes.length;
}
$('repairSafeText').onclick=()=>{const count=repairTextDraft();notice(count?`${count} nama/isian sudah dirapikan. Simpan map jika hasilnya sesuai.`:'Tidak ada nama/isian yang perlu dirapikan. Periksa bagian yang ditandai.');};
$('undoTextRepair').onclick=()=>{if(textRepairToken===JSON.stringify(map)){$('undo').click();recovery.hidden=true;}else{ $('undoTextRepair').hidden=true;notice('Ada perubahan baru setelah perapian. Gunakan Undo di atas untuk membatalkan langkah satu per satu.');}};
$('dismissRecovery').onclick=()=>{recovery.hidden=true;};
$('optimizeBudget').onclick=safe(async()=>{
  if(!map||loading||testing||inspectOnly)return;
  const before=JSON.stringify(map);loading=true;$('optimizeBudget').disabled=true;
  notice('Mengoptimalkan salinan gambar. Objek dan collider tetap.');
  try{
    const result=await api('/api/optimize-map',{map:structuredClone(map)});
    if(JSON.stringify(map)!==before)throw new Error('Draft berubah selama optimasi. Hasil tidak menimpa perubahan baru; coba lagi.');
    remember();map=result.map;fields();check();
    for(const item of result.libraryItems??[]){library=library.filter(i=>i.key!==item.key);library.unshift(item);}renderLibrary();
    const r=result.optimization;
    notice(`Gambar diringankan: ${(r.before/1048576).toFixed(1)} → ${(r.after/1048576).toFixed(1)} MiB. ${r.resized?'Resolusi disesuaikan ringan; periksa preview.':'Tanpa menurunkan resolusi.'} Belum disimpan; gunakan Undo untuk membatalkan, atau Simpan map.`);
    recovery.hidden=true;
  }finally{loading=false;$('optimizeBudget').disabled=false;}
});
$('optimizeMapImages').onclick=()=>$('optimizeBudget').click();
$('objectName').addEventListener('input',()=>{$('objectNameCount').textContent=`${$('objectName').value.length} / 100 karakter`;});
$('locateProblem').onclick=()=>{
  const issue=map?repairMapText(map).fixes[0]??mapIssues(map)[0]:null;if(issue?.object)select(issue.object);
  const field=document.querySelector('input:invalid,textarea:invalid,select:invalid')??$(issue?.field??'objectName');
  if(field&&!field.disabled){for(let parent=field.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;field.scrollIntoView({block:'center'});field.focus();}
};
async function api(route, data) {
  if (data) {
    const live = await (await fetch('/api/state')).json();
    if(route==='/api/optimize-map'&&live.capabilities?.assetBudgetAutofix!==1)throw new Error('Backend belum mendukung perbaikan anggaran gambar. Simpan/ekspor draft sebelum memperbarui server; jangan refresh draft yang belum tersimpan.');
    if (live.capabilities?.structureVisuals !== 1)
      throw new Error('Server editor masih versi lama dan tidak menyimpan visual Benteng/Penjara. Draft tetap di panel ini. Jalankan ulang npm run admin:maps sebelum mencoba Simpan; jangan refresh draft yang belum tersimpan.');
    if (live.revision !== state.revision)
      throw new Error('Map tersimpan telah berubah dari tab/proses lain. Draft ini belum ditimpa. Ekspor draft sebagai cadangan sebelum memuat ulang versi terbaru.');
    // A backend restart need not discard the in-memory draft. Refresh its token
    // only when the persisted document revision still matches exactly.
    state.token = live.token;
  }
  const r = await fetch(
      route,
      data
        ? {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Token': state.token,
            },
            body: JSON.stringify({ revision: state.revision, ...data }),
          }
        : undefined,
    ),
    v = await r.json();
  if (!r.ok) throw new Error(v.error ?? 'Permintaan gagal.');
  return v;
}
function remember() {
  if(inspectOnly)throw new Error('Preview hanya baca. Klik Buka draft editor terlebih dahulu.');
  history.push(structuredClone(map));
  if (history.length > 40) history.shift();
  future = [];
  dirty = true;
  publishSummary();
}
function publishSummary() {
  if(map)showTextureBudget($('textureBudget'),mapAssets(map),state?.assetBudgets?.map??{warning:64*1048576,limit:128*1048576});
  $('optimizeMapImages').hidden=!map||inspectOnly||!['warning','over'].includes($('textureBudget').dataset.level);
  if (!map) return;
  if(choiceValue==='builtin:kampung3d'){
    $('versionBadge').textContent='MAP 3D · PENGELOLAAN DAFTAR SAJA';
    $('versionDetails').textContent=`Sumber: kampung3d · Revisi dokumen ${state.revision.slice(0,8)}`;
    $('saveState').textContent='Tidak ada editor visual 3D';
    $('activationState').textContent='Canvas sebelumnya bukan preview map 3D.';return;
  }
  const current=mapVersions(state.document,builtins,builtinTemplates,true).find(e=>e.value===choiceValue);
  $('versionBadge').textContent=inspectOnly ? (current?.active?'AKTIF LOKAL · PREVIEW HANYA BACA':'VERSI ASLI · PREVIEW HANYA BACA') : dirty?'EDIT · PERUBAHAN BELUM DISIMPAN':map.archived?'ARSIP':map.deleted?'SAMPAH':map.enabled?'VERSI EDITOR · AKTIF LOKAL':'DRAFT EDITOR · NONAKTIF';
  $('versionDetails').textContent=`Sumber: ${current?.kind==='native'?map.replaces:map.id} · Revisi dokumen ${state.revision.slice(0,8)}${dirty?' · perubahan belum disimpan':''}`;
  $('saveState').textContent = inspectOnly ? 'Preview hanya baca · tidak mengubah draft' : dirty ? '● Belum disimpan' : '✓ Tersimpan lokal';
  $('saveState').className = dirty ? 'warning' : '';
  $('activationState').textContent =
    inspectOnly ? 'Status aktif mengikuti konfigurasi lokal, bukan verifikasi deployment GitHub Pages.' : dirty ? 'Perubahan/aktivasi belum disimpan. Simpan terlebih dahulu; Build/publish diperlukan untuk deployment.' : map.enabled && !map.archived && !map.deleted
      ? 'Aktif: versi ini akan tampil setelah deployment selesai.'
      : 'DRAFT NONAKTIF: perubahan ini tidak akan tampil di game. Centang Aktifkan, lalu Simpan.';
}
const object = () => map.objects.find((o) => o.id === selected),
  marker = () => {
    const [k, t] = selected.split(':');
    return k === 'base' ? map.bases[t] : k === 'prison' ? map.prisons[t] : null;
  };
const baseRadius = () =>
  map.baseRadius ?? builtins.find((b) => b.id === (map.replaces ?? map.arenaRules))?.baseRadius ?? 118;
function selectionParts(id = selected) {
  const [kind, team] = id.split(':');
  return ['base', 'prison'].includes(kind) && ['blue', 'red'].includes(team) ? {kind, team} : null;
}
function structureFallback(kind, team, slot) {
  const native = builtins.find(b => b.id === (map.replaces ?? map.arenaRules));
  const scale = native?.objectScale ?? 1, p = map.prisons[team];
  const base = kind === 'base';
  const name = base ? (team === 'blue' ? 'fortRed' : 'fortGreen') :
    native?.prisons?.[team]?.[slot === 'floorVisual' ? 'floorAsset' : 'overlayAsset'] ??
    (slot === 'floorVisual' ? 'prisonFloor' : 'prisonOverlay');
  const clip = library.find(a => a.name === name && a.arena === native?.id)?.clip ??
    library.find(a => a.name === name && !a.arena)?.clip ?? null;
  return {asset: clip,
    w: base ? Math.round(168 * scale) : p.w,
    h: base ? Math.round(188 * scale) : p.h,
    offsetX: base ? -Math.round(168 * scale) / 2 : 0,
    offsetY: base ? -Math.round(130 * scale) : 0,
    rotation: 0, opacity: slot === 'overlayVisual' ? .98 : .96,
    mirror: !base && (native?.prisons?.[team]?.flip ?? team === 'red'), visible: true};
}
function structureTarget(target) {
  const part = selectionParts(target.id);
  if (!part) throw new Error('Pilih Benteng atau Penjara terlebih dahulu.');
  const anchor = part.kind === 'base' ? map.bases[part.team] : map.prisons[part.team];
  return {anchor, visual: anchor[target.slot] ?? structureFallback(part.kind, part.team, target.slot)};
}
function replaceStructure(target, asset) {
  if (testing || loading || inspectOnly) throw new Error('Selesaikan upload/uji cepat dan buka versi editor dahulu.');
  const {anchor, visual} = structureTarget(target);
  const candidate = {...structuredClone(visual), asset: structuredClone(asset)};
  const next = structuredClone(map), part = selectionParts(target.id);
  (part.kind === 'base' ? next.bases[part.team] : next.prisons[part.team])[target.slot] = candidate;
  validateMap(next);
  remember();anchor[target.slot] = candidate;
  propertyFields();notice('Visual diganti. Posisi, ukuran area gameplay, dan collider tetap. Simpan untuk menerapkan.');
}
function structureFields() {
  const root = $('structureProperties'), part = selectionParts();
  root.hidden = !part;root.replaceChildren();
  if (!part) return;
  const anchor = part.kind === 'base' ? map.bases[part.team] : map.prisons[part.team];
  const native = builtins.find(b => b.id === (map.replaces ?? map.arenaRules));
  if (native?.structuresInBackground && map.terrain?.asset === 'field/' + native.background) {
    const warning = document.createElement('p');warning.className = 'warning';
    warning.textContent = 'Gambar struktur asli menyatu dengan terrain. Penggantian visual tidak menghapus gambar lama. Gunakan terrain tanpa struktur untuk hasil penuh.';root.append(warning);
  }
  if (part.kind === 'base') {
    const label = document.createElement('label'), input = document.createElement('input');
    label.textContent = 'Radius capture · kedua benteng';input.type = 'number';input.min = '20';input.max = '400';input.value = baseRadius();input.id = 'baseRadius';
    input.onchange = () => editField(input, m => {m.baseRadius = +input.value;});label.append(input);root.append(label);
  }
  for (const slot of part.kind === 'base' ? ['visual'] : ['floorVisual', 'overlayVisual']) {
    const target = {id: selected, slot}, v = anchor[slot] ?? structureFallback(part.kind, part.team, slot);
    const section = document.createElement('details');section.open = true;section.className = 'structure-visual';section.dataset.slot = slot;
    const title = document.createElement('summary');title.textContent = slot === 'visual' ? 'Visual Benteng' : slot === 'floorVisual' ? 'Lantai Penjara' : 'Overlay Penjara · di atas karakter';section.append(title);
    const thumb = document.createElement('canvas');thumb.width = 160;thumb.height = 90;
    const paint = () => {if(v.asset){const f = v.asset.frames[0], r = Math.min(150/f.width,80/f.height);drawAsset(thumb.getContext('2d'),v.asset,(160-f.width*r)/2,(90-f.height*r)/2,f.width*r,f.height*r);}};
    const img = image(v.asset);if(img?.complete)paint();else img?.addEventListener('load',paint,{once:true});section.append(thumb);
    const path = document.createElement('p');path.textContent = anchor[slot] ? v.asset?.asset ?? 'Tanpa gambar' : 'Visual bawaan';section.append(path);
    const action = (text, fn, name) => {const b = document.createElement('button');b.textContent=text;b.dataset.action=name;b.onclick=safe(fn);section.append(b);};
    action('Ganti dari file',()=>{terrainPick=null;fileTarget=target;$('structureFile').click();},'file');
    action('Pilih dari library',()=>{terrainPick=null;replacement=target;renderReplacement();$('library').scrollIntoView({block:'nearest'});},'library');
    action('Pulihkan visual bawaan',()=>{if(testing||loading||inspectOnly)return;const current=structureTarget(target).anchor;remember();delete current[slot];propertyFields();},'reset');
    const grid = document.createElement('div');grid.className='pair';
    for(const [key,text,min,max] of [['w','Lebar visual',1,map.width],['h','Tinggi visual',1,map.height],['offsetX','Offset X',-map.width,map.width],['offsetY','Offset Y',-map.height,map.height],['rotation','Rotasi °',-180,180],['opacity','Opacity %',0,100],['mirror','Mirror horizontal ↔'],['mirrorY','Mirror vertikal ↕'],['visible','Visual terlihat']]) {
      const label=document.createElement('label'),input=document.createElement('input');label.textContent=text;input.dataset.visualKey=key;
      const bool=['mirror','mirrorY','visible'].includes(key);input.type=bool?'checkbox':'number';
      if(bool){label.className='check';input.checked=!!v[key];}else{input.min=min;input.max=max;input.step=key==='opacity'?'1':'any';input.value=key==='opacity'?v[key]*100:v[key];}
      input.onchange=()=>{if(testing||loading)return;editField(input,m=>{const dest=part.kind==='base'?m.bases[part.team]:m.prisons[part.team];dest[slot]??=structuredClone(v);dest[slot][key]=bool?input.checked:key==='opacity'?+input.value/100:+input.value;});};
      label.append(input);grid.append(label);
    }
    section.append(grid);const hint=document.createElement('p');hint.textContent='Ukuran, offset, rotasi, dan mirror hanya mengubah gambar, bukan area gameplay.';section.append(hint);root.append(section);
  }
}
function renderReplacement() {
  let banner=$('replacementBanner');
  if(!banner){banner=document.createElement('div');banner.id='replacementBanner';$('library').before(banner);}
  banner.replaceChildren();banner.hidden=!replacement&&!terrainPick;
  if(replacement){const text=document.createElement('p');text.textContent=`Pilih aset pengganti ${replacement.id} · ${replacement.slot}. Klik library tidak menambah objek.`;const cancel=document.createElement('button');cancel.textContent='Batal';cancel.onclick=()=>{replacement=null;renderReplacement();};banner.append(text,cancel);}
  else if(terrainPick){const text=document.createElement('p');text.textContent=terrainPick==='terrain'?'Pilih gambar di library untuk mengganti SELURUH terrain. Objek/collider tidak dihapus.':'Pilih gambar di library untuk membuat TAMBALAN visual di layer Latar, tanpa collider.';const cancel=document.createElement('button');cancel.textContent='Batal pilih terrain';cancel.onclick=()=>{terrainPick=null;renderReplacement();};banner.append(text,cancel);}
}
function image(a) {
  if (!a) return null;
  if (!cache.has(a.asset)) {
    const i = new Image();
    i.src = '/' + a.asset + '?v=' + encodeURIComponent(state.revision);
    i.onerror = () => notice('Gambar gagal dimuat: ' + a.asset, true);
    cache.set(a.asset, i);
  }
  return cache.get(a.asset);
}
function drawAsset(c, a, x, y, w, h, now = 0) {
  const i = image(a);
  if (!i?.complete || !i.naturalWidth) return;
  const f = frameAt(a, now);
  c.drawImage(i, f.x, f.y, f.width, f.height, x, y, w, h);
}
function propertyFields() {
  for (const input of $('properties').querySelectorAll('input,select'))
    input.setCustomValidity('');
  const o = object(),
    v = o ?? marker();
  $('nothing').hidden = !!v;
  $('properties').hidden = !v;
  $('objectOnly').hidden = !o;
  $('selectionTitle').textContent = o?.name ?? (selectionParts() ? `${selected.startsWith('base:') ? 'BENTENG' : 'PENJARA'} ${selected.endsWith(':blue') ? 'MERAH' : 'HIJAU'}` : '');
  structureFields();
  if (!v) return;
  $('objectName').disabled = !o;
  $('objectName').value = o?.name ?? selected;
  $('objectNameCount').textContent=o?`${typeof o.name==='string'?o.name.length:0} / 100 karakter`:'Nama objek tidak berlaku untuk benteng/penjara.';
  for (const k of ['x', 'y', 'w', 'h']) {
    $(k).value = v[k] ?? '';
    $(k).disabled = (k === 'w' || k === 'h') && !('w' in v);
    $(k).setCustomValidity('');
  }
  if (!o) return;
  for (const k of ['behavior', 'shape', 'layer', 'rotation', 'z'])
    $(k).value = o[k];
  for (const k of ['mirror', 'mirrorY', 'visible', 'locked']) $(k).checked = !!o[k];
  $('fps').value = o.asset?.fps ?? 12;
  $('fps').disabled = !o.asset;
  $('slow').value = o.slow * 100;
  $('opacity').value = o.opacity * 100;
  $('slowRow').hidden = o.behavior !== 'slow';
  $('editPoints').textContent = pointsMode
    ? 'Selesai edit titik'
    : 'Edit titik polygon';
  nodeFields();
}
function nodeFields() {
  const o = object();
  $('polygonTools').hidden = !pointsMode || !o;
  if (!pointsMode || !o) return;
  $('nodeCount').textContent =
    `${o.points.length} / ${MAX_POLYGON_NODES} titik`;
  $('deleteNode').disabled =
    selectedNode < 0 || o.points.length <= 3 || o.locked;
  $('addNode').disabled = o.points.length >= MAX_POLYGON_NODES || o.locked;
  $('nodes').replaceChildren();
  o.points.forEach((p, index) => {
    const b = document.createElement('button');
    b.textContent = String(index + 1);
    b.title = `Titik${index + 1}: ${Math.round(p.x * o.w)}, ${Math.round(p.y * o.h)}`;
    b.className = index === selectedNode ? 'selected' : '';
    b.onclick = () => {
      selectedNode = index;
      nodeFields();
      canvas.focus({preventScroll:true});
    };
    $('nodes').append(b);
  });
}
function select(id) {
  replacement = null;terrainPick=null;renderReplacement();
  selected = id;
  pointsMode = false;
  selectedNode = -1;
  $('polygonTools').hidden = true;
  propertyFields();
  list();
}
function list() {
  const root = $('objects');
  $('objectCount').textContent=String(map.objects.length+4);
  root.replaceChildren();
  const entries = [
    ['base:blue', '⚑ Benteng Merah'],
    ['base:red', '⚑ Benteng Hijau'],
    ['prison:blue', '▣ Penjara Merah'],
    ['prison:red', '▣ Penjara Hijau'],
    ...map.objects.map((o) => [
      o.id,
      o.name,
    ]),
  ];
  for (const [id, name] of entries) {
    const b = document.createElement('button');
    b.textContent = name;
    const o=map.objects.find(o=>o.id===id);b.title=o?`${o.name} · ${o.behavior}${o.locked?' · posisi terkunci':''}`:name;
    b.className = selected === id ? 'selected' : '';
    b.onclick = () => {select(id);canvas.focus({preventScroll:true});};
    root.append(b);
  }
}
function resize() {
  canvas.width = Math.round(map.width * zoom());
  canvas.height = Math.round(map.height * zoom());
  $('zoomLabel').textContent = Math.round(zoom() * 100) + '%';
}
function fit() {
  $('zoom').value = clamp(
    Math.floor(Math.min(
      ($('viewport').clientWidth - 22) / map.width,
      ($('viewport').clientHeight - 22) / map.height,
    ) * 100),
    10,
    160,
  );
  resize();
}
function fields() {
  for (const [id, key] of [
    ['mapName', 'name'],
    ['description', 'description'],
    ['width', 'width'],
    ['height', 'height'],
    ['terrainMode', 'terrainMode'],
    ['tileSize', 'tileSize'],
  ]) {
    $(id).value = map[key];
    $(id).setCustomValidity('');
  }
  $('enabled').checked = map.enabled;
  $('unlockIdentity').textContent = map.replaces
    ? `Unlock tetap mengikuti arena asli (${map.replaces}). Edit map tidak menambah syarat baru.`
    : 'Mengedit map ini tidak mengubah ID atau syarat unlock yang sudah ada.';
  propertyFields();
  list();
  resize();
  publishSummary();
  terrainFields();
}
function terrainFields(){
  if(!map)return;
  $('terrainInfo').textContent=map.terrain?`${map.terrainMode==='tile'?'Ulang tekstur':'Penuhi map'} · ${map.terrain.frames.length} frame · ${map.terrain.asset}`:'Belum ada gambar terrain. Warna dasar tetap digunakan.';
  $('restoreTerrain').disabled=inspectOnly||!builtinTemplates.some(m=>m.replaces===map.replaces);
}
function terrainEditable(){if(!map||inspectOnly||loading||testing||drawing)throw new Error('Buka draft editor dan selesaikan upload/uji/gambar polygon dahulu.');}
function applyTerrain(asset){terrainEditable();remember();map.terrain=structuredClone(asset);tileCache=null;terrainPick=null;replacement=null;renderReplacement();terrainFields();notice('Terrain diganti sebagai draft visual. Collider, area air, struktur, dan unlock tidak berubah. Simpan map untuk menerapkan.');}
function addTerrainPatch(asset,name){
  if(testing||inspectOnly)throw new Error('Buka draft editor sebelum menambah tambalan.');
  const patch=createTerrainPatch(map,asset,'obj-'+uid(),name);remember();map.objects.push(patch);select(patch.id);canvas.focus({preventScroll:true});
  notice('Tambalan dibuat di tengah map, layer Latar/Dekorasi tanpa collider. Geser dan ubah ukuran; Simpan map jika sudah sesuai.');return patch;
}
function blank() {
  return {
    id: 'studio-' + uid().slice(0, 12),
    name: 'Arena baru',
    description: '',
    width: 1800,
    height: 1200,
    enabled: false,
    terrain: null,
    icon: null,
    terrainMode: 'stretch',
    tileSize: 256,
    objects: [],
    bases: { blue: { x: 200, y: 600 }, red: { x: 1600, y: 600 } },
    prisons: {
      blue: { x: 130, y: 880, w: 240, h: 180 },
      red: { x: 1430, y: 140, w: 240, h: 180 },
    },
  };
}
function open(m, options = {}) {
  if (loading) {
    notice('Tunggu upload selesai.', true);
    return;
  }
  if (
    (dirty || drawing?.length) &&
    !confirm('Tinggalkan perubahan map yang belum disimpan?')
  ) {
    mapChoices();
    return;
  }
  map = structuredClone(m);
  recovery.hidden=true;textRepairToken=null;$('repairReport').hidden=true;
  inspectOnly=!!options.readOnly;
  choiceValue=options.value??m.id;
  $('save').disabled = false;
  $('test').disabled = false;
  $('duplicateMap').disabled = false;
  document.querySelector('.workspace').inert = false;
  document.querySelector('.inspector-edit-region').inert = false;
  for (const id of ['mapName', 'description', 'width', 'height', 'enabled'])
    $(id).disabled = false;
  dirty = !inspectOnly && !state.document.maps.some((v) => v.id === m.id);
  selected = '';
  replacement = null;fileTarget = null;terrainPick=null;renderReplacement();
  drag=null;pointsMode=false;selectedNode=-1;
  history = [];
  future = [];
  $('autoFixSummary').textContent = '';
  testing = false;
  drawing = null;
  $('drawingTools').hidden = true;
  $('testingTools').hidden = true;
  keys.clear();
  $('test').textContent = '▶ Uji cepat';
  fields();
  fit();
  check();
  notice('Siap. Map asli tetap utuh.');
  mapChoices();
  applyViewMode();
}
function applyViewMode() {
  const allowed=new Set(['maps','showArchived','new','clone','garduPrototype','duplicateMap','editVersion','exportDraft','importDraftButton','draftFile','zoom','fit','grid','bounds','cleanPreview','structures','validate']);
  for(const el of document.querySelectorAll('main > aside:first-child input,main > aside:first-child textarea,main > aside:first-child select,main > aside:first-child button'))
    if(!allowed.has(el.id)&&el.dataset.studioHelp!=='true')el.disabled=inspectOnly;
  document.querySelector('.inspector-edit-region').inert=inspectOnly;
  const assets=document.querySelectorAll('main > aside:first-child section')[1];
  if(assets)assets.inert=inspectOnly;
  for(const id of ['save','undo','redo','test','polygon','solidArea','autoFix'])$(id).disabled=inspectOnly;
  $('resetMap').disabled=inspectOnly||!map.replaces;
  $('editVersion').hidden=!inspectOnly;
  const saved=state.document.maps.find(m=>m.id===map.id)??state.document.maps.find(m=>map.replaces&&m.replaces===map.replaces&&m.enabled&&!m.archived&&!m.deleted);
  $('editVersion').textContent=choiceValue.startsWith('builtin:')?'Edit map bawaan terbaru':saved?'Buka versi editor tersimpan':'Buat draft dari versi ini';
}
function add(asset, name = 'Area baru') {
  if (testing || inspectOnly) return;
  remember();
  const f = asset?.frames[0],
    w = f ? Math.min(240, f.width) : 160,
    h = f ? (w * f.height) / f.width : 100,
    o = {
      id: 'obj-' + uid(),
      name:editorText(name,100,'Objek baru'),
      asset: asset ? structuredClone(asset) : null,
      x: Math.round(map.width / 2 - w / 2),
      y: Math.round(map.height / 2 - h / 2),
      w,
      h,
      rotation: 0,
      opacity: 1,
      layer: 'world',
      z: 0,
      behavior: 'decoration',
      slow: 0.5,
      shape: 'rect',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      visible: true,
      locked: false,
      mirror: false,
    };
  map.objects.push(o);
  select(o.id);
  return o;
}
function repairColliders(recordHistory = true) {
  if (inspectOnly || testing || loading || drawing) return 0;
  const labels=repairMapText(map),result = autoFixMap(labels.map);result.fixes.unshift(...labels.fixes);
  if (result.fixes.length) {
    if (recordHistory) remember();
    map = result.map;
    selectedNode = -1;
    fields();
    if(labels.fixes.length)reportTextRepairs(labels.fixes);
  }
  $('autoFixSummary').textContent = result.fixes.length
    ? `Auto-fix: ${result.fixes.map(f => f.message).join(' ')} Bisa Undo; simpan untuk menerapkan.`
    : 'Tidak ada perbaikan geometri aman yang diperlukan.';
  if (result.skipped.length)
    $('autoFixSummary').textContent += ` ${result.skipped.map(f => f.message).join(' ')}`;
  return result.fixes.length;
}
$('autoFix').onclick = safe(() => { repairColliders(); check(); });
function check() {
  const issues = mapIssues(map);
  $('issueCount').textContent = String(issues.length);
  if (issues.length) $('validationPanel').open = true;
  $('issues').replaceChildren();
  for (const i of issues) {
    const li = document.createElement('li');
    if (i.object) {
      const b = document.createElement('button');
      b.textContent = i.message;
      b.onclick = () => select(i.object);
      li.append(b);
    } else li.textContent = i.message;
    $('issues').append(li);
  }
  if (!issues.length) {
    const li = document.createElement('li');
    li.textContent =
      'Pemeriksaan batas/spawn/jalur lulus. Tetap uji pertandingan sebelum publish.';
    $('issues').append(li);
  }
  return issues;
}
const position = (e) => {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / zoom(), y: (e.clientY - r.top) / zoom() };
};
function local(o, p) {
  const a = (-o.rotation * Math.PI) / 180,
    dx = p.x - o.x - o.w / 2,
    dy = p.y - o.y - o.h / 2;
  return {
    x: (dx * Math.cos(a) - dy * Math.sin(a)) / o.w + 0.5,
    y: (dx * Math.sin(a) + dy * Math.cos(a)) / o.h + 0.5,
  };
}
function world(o, p) {
  const a = (o.rotation * Math.PI) / 180,
    dx = (p.x - 0.5) * o.w,
    dy = (p.y - 0.5) * o.h;
  return {
    x: o.x + o.w / 2 + dx * Math.cos(a) - dy * Math.sin(a),
    y: o.y + o.h / 2 + dx * Math.sin(a) + dy * Math.cos(a),
  };
}
function drawObject(o, now) {
  relayVisuals?.drawRelayPrimitive(ctx,o);
  ctx.save();
  ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
  ctx.rotate((o.rotation * Math.PI) / 180);
  if (o.visible) {
    ctx.globalAlpha = o.opacity;
    ctx.scale(o.mirror ? -1 : 1, o.mirrorY ? -1 : 1);
    drawAsset(ctx, o.asset, -o.w / 2, -o.h / 2, o.w, o.h, now);
    ctx.scale(o.mirror ? -1 : 1, o.mirrorY ? -1 : 1);
    ctx.globalAlpha = 1;
  }
  if (!$('cleanPreview').checked && ($('bounds').checked || o.id === selected)) {
    ctx.fillStyle = colors[o.behavior] + '25';
    ctx.strokeStyle = o.id === selected ? '#dcffb5' : colors[o.behavior];
    ctx.lineWidth = 2 / zoom();
    ctx.beginPath();
    if (o.shape === 'ellipse')
      ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    else if (o.shape === 'polygon') {
      o.points.forEach((p, i) =>
        i
          ? ctx.lineTo((p.x - 0.5) * o.w, (p.y - 0.5) * o.h)
          : ctx.moveTo((p.x - 0.5) * o.w, (p.y - 0.5) * o.h),
      );
      ctx.closePath();
    } else ctx.rect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  relayVisuals?.drawRelayNodeLabel(ctx,o);
  if (o.id === selected && !testing)
    for (const [index, p] of (pointsMode
      ? o.points
      : [{ x: 1, y: 1 }]
    ).entries()) {
      const q = world(o, p);
      ctx.fillStyle =
        selectedNode === index && pointsMode ? '#fff08b' : '#bdff81';
      ctx.fillRect(
        q.x - 5 / zoom(),
        q.y - 5 / zoom(),
        10 / zoom(),
        10 / zoom(),
      );
      if (pointsMode) {
        ctx.font = `${12 / zoom()}px system-ui`;
        ctx.fillText(String(index + 1), q.x + 8 / zoom(), q.y - 7 / zoom());
        const next = o.points[(index + 1) % o.points.length],
          mid = world(o, { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 });
        if (o.points.length < MAX_POLYGON_NODES) {
          ctx.fillStyle = '#102519';
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, 7 / zoom(), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#b5ed82';
          ctx.font = `${16 / zoom()}px system-ui`;
          ctx.fillText('+', mid.x - 5 / zoom(), mid.y + 5 / zoom());
        }
      }
    }
}
function terrain(now) {
  if(relayVisuals?.drawRelayGround(ctx,map))return;
  ctx.fillStyle = '#344936';
  ctx.fillRect(0, 0, map.width, map.height);
  if (!map.terrain) return;
  if (map.terrainMode === 'stretch') {
    drawAsset(ctx, map.terrain, 0, 0, map.width, map.height, now);
    return;
  }
  const a = map.terrain,
    i = image(a);
  if (!i?.complete || !i.naturalWidth) return;
  const f = frameAt(a, now),
    key = [a.asset, f.x, f.y, map.tileSize].join('/');
  if (tileCache?.key !== key) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = map.tileSize;
    drawAsset(tile.getContext('2d'), a, 0, 0, map.tileSize, map.tileSize, now);
    tileCache = { key, pattern: ctx.createPattern(tile, 'repeat') };
  }
  ctx.fillStyle = tileCache.pattern;
  ctx.fillRect(0, 0, map.width, map.height);
}
function testStep(now, dt) {
  if (!testing) return;
  const dx =
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
      (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
    dy =
      (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
      (keys.has('w') || keys.has('arrowup') ? 1 : 0),
    jumping = now < jumpUntil;
  const result = moveDummy(map, player, dx, dy, dt, jumping, keys.has(' '));
  player = {
    ...player,
    x: result.x,
    y: result.y,
    moving: !!(dx || dy),
    facing: dx || player.facing || 1,
  };
  if (result.fallen) {
    player = { ...map.bases.blue };
    falls++;
    notice(
      'Terjatuh! Kembali ke benteng Merah. Shift untuk lompat; jembatan aman.',
    );
  }
  const atBase = Object.entries(map.bases).find(
    ([, b]) => Math.hypot(player.x - b.x, player.y - b.y) < baseRadius(),
  );
  const atPrison = Object.entries(map.prisons).find(
    ([, p]) =>
      player.x >= p.x &&
      player.x <= p.x + p.w &&
      player.y >= p.y &&
      player.y <= p.y + p.h,
  );
  dummyStatus = result.fallen
    ? 'Jatuh → kembali ke benteng'
    : jumping
      ? 'Lompat / parkour'
      : result.blocked
        ? 'TERHALANG collider solid'
        : result.multiplier < 1
          ? `Lambat ×${result.multiplier}`
          : atPrison
            ? `Area penjara ${atPrison[0] === 'blue' ? 'Merah' : 'Hijau'}`
            : atBase
              ? `Area benteng ${atBase[0] === 'blue' ? 'Merah' : 'Hijau'}`
              : 'Berjalan / area aman';
  $('dummyStatus').textContent =
    `Dummy · ${dummyStatus} · X${Math.round(player.x)} Y${Math.round(player.y)} · jatuh${falls}`;
}
function drawDummy(now) {
  const x = player.x,
    y = player.y,
    lift = now < jumpUntil ? 25 : 0,
    stride = player.moving ? Math.sin(now / 85) * 6 : 0;
  ctx.save();
  ctx.fillStyle = '#0007';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y - lift);
  ctx.strokeStyle = '#edf5fa';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, -12);
  ctx.lineTo(-8 - stride, -1);
  ctx.moveTo(5, -12);
  ctx.lineTo(8 + stride, -1);
  ctx.stroke();
  ctx.fillStyle = '#52cbe2';
  ctx.fillRect(-11, -33, 22, 24);
  ctx.fillStyle = '#ffdaa6';
  ctx.beginPath();
  ctx.arc(0, -43, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#21313d';
  ctx.fillRect((player.facing || 1) * 4 - 2, -46, 4, 4);
  if ($('bounds').checked) {
    ctx.strokeStyle = '#fff08b';
    ctx.lineWidth = 2 / zoom();
    ctx.beginPath();
    ctx.arc(0, lift, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.font = `${12 / zoom()}px system-ui`;
  ctx.fillText('DUMMY', -22 / zoom(), -62);
  ctx.restore();
}
function drawGameplayAssets(now, overlay = false) {
  if (!$('structures').checked) return;
  const native = builtins.find(b => b.id === (map.replaces ?? map.arenaRules));
  // Authored Taman/Kanal backgrounds already contain the native structures.
  // Do not paint unrelated generic structures over the same pixels.
  const baked = native?.structuresInBackground && map.terrain?.asset === 'field/' + native.background;
  for (const t of ['blue', 'red']) {
    const slots = overlay ? [['prison','overlayVisual']] : [['base','visual'],['prison','floorVisual']];
    for(const [kind,slot] of slots) {
      if(relayVisuals?.drawRelayStructure(ctx,map,t,overlay?'overlay':kind))continue;
      const anchor=kind==='base'?map.bases[t]:map.prisons[t];
      const v=resolveStructureVisual(anchor,anchor[slot],baked?undefined:structureFallback(kind,t,slot));
      if(!v)continue;
      ctx.save();ctx.translate(v.x+v.w/2,v.y+v.h/2);ctx.rotate(v.rotation*Math.PI/180);
      ctx.globalAlpha=v.opacity;ctx.scale(v.mirror?-1:1,v.mirrorY?-1:1);
      drawAsset(ctx,v.asset,-v.w/2,-v.h/2,v.w,v.h,now);ctx.restore();
    }
  }
}
function drawGuides() {
  if ($('cleanPreview').checked) return;
  const part=selectionParts();
  if(part){const anchor=marker();for(const slot of part.kind==='base'?['visual']:['floorVisual','overlayVisual']){
    const v=resolveStructureVisual(anchor,anchor[slot],structureFallback(part.kind,part.team,slot));if(!v)continue;
    ctx.save();ctx.translate(v.x+v.w/2,v.y+v.h/2);ctx.rotate(v.rotation*Math.PI/180);ctx.strokeStyle='#fff';ctx.lineWidth=1/zoom();ctx.setLineDash([6/zoom(),4/zoom()]);ctx.strokeRect(-v.w/2,-v.h/2,v.w,v.h);ctx.restore();
  }}
  for (const t of ['blue', 'red']) {
    const b = map.bases[t],
      p = map.prisons[t],
      color = t === 'blue' ? '#ff6b6b' : '#a0e76f';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = (selected.endsWith(':' + t) ? 4 : 2) / zoom();
    ctx.beginPath();
    ctx.arc(b.x, b.y, baseRadius(), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.font = `bold ${13 / zoom()}px system-ui`;
    ctx.fillText(
      '⚑ BENTENG ' + (t === 'blue' ? 'MERAH' : 'HIJAU'),
      b.x - 45,
      b.y + baseRadius() + 16,
    );
    ctx.fillText(
      '▣ PENJARA ' + (t === 'blue' ? 'MERAH' : 'HIJAU'),
      p.x,
      p.y - 8 / zoom(),
    );
  }
}
function animate(now) {
  requestAnimationFrame(animate);
  if (!map || document.hidden || !engineVisible) {
    last = now;
    return;
  }
  const dt = clamp((now - last) / 1000, 0, 0.04);
  last = now;
  testStep(now, dt);
  ctx.setTransform(zoom(), 0, 0, zoom(), 0, 0);
  terrain(now);
  map.objects.filter(o=>o.layer==='background'&&($('layerFilter').value==='all'||$('layerFilter').value==='background')).sort((a,b)=>a.z-b.z||a.y+a.h-b.y-b.h).forEach(o=>drawObject(o,now));
  drawGameplayAssets(now);
  if ($('grid').checked) {
    ctx.strokeStyle = '#ffffff18';
    ctx.lineWidth = 1 / zoom();
    ctx.beginPath();
    for (let x = 0; x < map.width; x += 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
    }
    for (let y = 0; y < map.height; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
    }
    ctx.stroke();
  }
  const entries = map.objects
    .filter(
      (o) =>
        o.layer!=='background'&&($('layerFilter').value === 'all' || o.layer === $('layerFilter').value),
    )
    .map((o) => ({
      layer: layers.indexOf(o.layer),
      y: o.y + o.h,
      z: o.z,
      draw: () => drawObject(o, now),
    }));
  entries.push({
    layer: 1,
    y: testing ? player.y : 0,
    z: 0,
    draw: () => {
      if (testing) drawDummy(now);
    },
  });
  entries
    .sort((a, b) => a.layer - b.layer || a.z - b.z || a.y - b.y)
    .forEach((e) => e.draw());
  drawGameplayAssets(now, true);
  drawGuides();
  if (drawing) {
    ctx.strokeStyle = '#e7ff93';
    ctx.fillStyle = '#e7ff9325';
    ctx.lineWidth = 2 / zoom();
    ctx.beginPath();
    drawing.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    if (pointer) ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
    drawing.forEach((p, i) => {
      ctx.fillStyle = '#e7ff93';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 / zoom(), 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${13 / zoom()}px system-ui`;
      ctx.fillText(String(i + 1), p.x + 8 / zoom(), p.y);
    });
  }
  const ic = $('iconPreview').getContext('2d');
  ic.clearRect(0, 0, ic.canvas.width, ic.canvas.height);
  if(!map.icon&&relayVisuals?.isRelayPrototypeMap(map)){
    // Same primitive preview as the arena; never inherit the old Pasar picture.
    ic.save();ic.scale(ic.canvas.width/map.width,ic.canvas.height/map.height);
    relayVisuals.drawRelayGround(ic,map);
    for(const object of [...map.objects].sort((a,b)=>a.z-b.z))relayVisuals.drawRelayPrimitive(ic,object);
    for(const team of ['blue','red'])for(const kind of ['base','prison'])relayVisuals.drawRelayStructure(ic,map,team,kind);
    ic.restore();return;
  }
  const artwork = map.icon ?? builtinTemplates.find(m => m.replaces === map.replaces)?.icon ??
    (map.terrain?.frames.length === 1 ? map.terrain : null);
  drawAsset(ic, artwork, 0, 0, ic.canvas.width, ic.canvas.height, now);
}
canvas.onpointerdown = (e) => {
  if(inspectOnly)return;
  canvas.focus();
  const p = position(e);
  if (drawing) {
    if (drawing.length >= MAX_POLYGON_NODES)
      return notice('Maksimal64 titik. Klik Selesai.', true);
    drawing.push({
      x: clamp(snap(p.x), 0, map.width),
      y: clamp(snap(p.y), 0, map.height),
    });
    $('drawingCount').textContent = `${drawing.length} titik`;
    $('finishPolygon').disabled = drawing.length < 3;
    return;
  }
  if (testing) {
    if (!solidAt(map, p.x, p.y) && !waterAt(map, p.x, p.y)) player = p;
    return;
  }
  const o = object();
  if (o && !o.locked) {
    if (pointsMode) {
      const n = o.points.findIndex((v) => {
        const q = world(o, v);
        return Math.hypot(q.x - p.x, q.y - p.y) < 12 / zoom();
      });
      if (n >= 0) {
        selectedNode = n;
        remember();
        if (e.shiftKey && o.points.length > 3) {
          o.points.splice(n, 1);
          selectedNode = -1;
          nodeFields();
          return;
        }
        drag = { kind: 'point', index: n };
        canvas.setPointerCapture(e.pointerId);
        nodeFields();
        return;
      }
      if (o.points.length < MAX_POLYGON_NODES) {
        const edge = o.points.findIndex((a, index) => {
          const b = o.points[(index + 1) % o.points.length];
          const mid = world(o, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          return Math.hypot(mid.x - p.x, mid.y - p.y) < 12 / zoom();
        });
        if (edge >= 0) {
          remember();
          const a = o.points[edge],
            b = o.points[(edge + 1) % o.points.length];
          o.points.splice(edge + 1, 0, {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
          });
          selectedNode = edge + 1;
          nodeFields();
          return;
        }
      }
      return; // Node editing never starts an object drag or steals a gameplay marker.
    } else {
      const q = world(o, { x: 1, y: 1 });
      if (Math.hypot(q.x - p.x, q.y - p.y) < 14 / zoom()) {
        remember();
        drag = { kind: 'resize', initial: structuredClone(o) };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
  }
  let id = map.objects
    .filter(v => (v.visible || $('bounds').checked) && !v.locked &&
      ($('layerFilter').value === 'all' || v.layer === $('layerFilter').value))
    .sort((a,b)=>layers.indexOf(b.layer)-layers.indexOf(a.layer)||b.z-a.z||b.y+b.h-(a.y+a.h))
    .find(v=>contains({...v,shape:'rect'},p.x,p.y))?.id ?? '';
  for (const t of ['blue', 'red']) {
    if(id)break;
    const b = map.bases[t],
      pr = map.prisons[t];
    if (Math.hypot(p.x - b.x, p.y - b.y) < baseRadius()) id = 'base:' + t;
    else if (
      p.x >= pr.x &&
      p.x <= pr.x + pr.w &&
      p.y >= pr.y &&
      p.y <= pr.y + pr.h
    )
      id = 'prison:' + t;
  }
  if (id !== selected || !pointsMode) select(id);
  const v = object() ?? marker();
  if (v && !v.locked) {
    remember();
    drag = { kind: 'move', offset: { x: p.x - v.x, y: p.y - v.y } };
    canvas.setPointerCapture(e.pointerId);
  }
};
canvas.onpointermove = (e) => {
  if(inspectOnly)return;
  if (drawing) {
    pointer = position(e);
    return;
  }
  if (!drag) return;
  const p = position(e),
    o = object(),
    v = o ?? marker();
  if (!v) return;
  if (drag.kind === 'point') {
    const q = local(o, p);
    o.points[drag.index] = { x: clamp(q.x, 0, 1), y: clamp(q.y, 0, 1) };
  } else if (drag.kind === 'resize') {
    const s = drag.initial,
      a = (s.rotation * Math.PI) / 180,
      anchor = world(s, { x: 0, y: 0 }),
      dx = p.x - anchor.x,
      dy = p.y - anchor.y;
    v.w = clamp(snap(dx * Math.cos(a) + dy * Math.sin(a)), 10, map.width);
    v.h = $('ratio').checked
      ? clamp((v.w * s.h) / s.w, 10, map.height)
      : clamp(snap(dy * Math.cos(a) - dx * Math.sin(a)), 10, map.height);
    v.x = clamp(
      anchor.x + (Math.cos(a) * v.w) / 2 - (Math.sin(a) * v.h) / 2 - v.w / 2,
      0,
      map.width - v.w,
    );
    v.y = clamp(
      anchor.y + (Math.sin(a) * v.w) / 2 + (Math.cos(a) * v.h) / 2 - v.h / 2,
      0,
      map.height - v.h,
    );
  } else {
    v.x = clamp(
      snap(p.x - drag.offset.x),
      selected.startsWith('base:') ? 80 : 0,
      map.width - (v.w ?? 80),
    );
    v.y = clamp(
      snap(p.y - drag.offset.y),
      selected.startsWith('base:') ? 100 : 0,
      map.height - (v.h ?? 80),
    );
  }
  propertyFields();
};
canvas.onpointerup = canvas.onpointercancel = () => {
  drag = null;
};
canvas.ondblclick = (e) => {
  if(inspectOnly)return;
  const o = object();
  if (
    !o ||
    !pointsMode ||
    testing ||
    o.locked ||
    o.points.length >= MAX_POLYGON_NODES
  )
    return;
  const q = local(o, position(e));
  if (q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1) return;
  remember();
  const edge = closestEdge(o.points, q, o.w, o.h);
  o.points.splice(edge + 1, 0, q);
  selectedNode = edge + 1;
  nodeFields();
};
document.addEventListener('keydown', (e) => {
  if(inspectOnly||loading||!map||!engineVisible||document.hidden||e.defaultPrevented||e.isComposing)return;
  if (nativeKeyboardTarget(e)) return;
  if (e.key === 'Escape') {
    if (drawing) cancelDrawing();
    else if (pointsMode) {
      pointsMode = false;
      propertyFields();
    } else if (testing) $('test').click();
    return;
  }
  if (e.key === 'Enter' && drawing) {
    e.preventDefault();
    $('finishPolygon').click();
    return;
  }
  if (testing) {
    if (
      [
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        ' ',
        'shift',
        'w',
        'a',
        's',
        'd',
      ].includes(e.key.toLowerCase())
    )
      e.preventDefault();
    if (e.key === 'Shift' && !e.repeat && performance.now() > jumpUntil + 400)
      jumpUntil = performance.now() + 450;
    keys.add(e.key.toLowerCase());
    return;
  }
});
let keyboardMoveRecorded=false;
const releaseKeyboard=bindStudioKeyboard({surface:canvas,enabled:()=>!!map&&!inspectOnly&&!loading&&!testing&&!drawing&&!drag&&engineVisible&&!document.querySelector('.coach-popover:popover-open'),
  undo:()=>{$('undo').click();},redo:()=>{$('redo').click();},
  begin:()=>{keyboardMoveRecorded=false;},end:()=>{keyboardMoveRecorded=false;},
  remove:()=>{if(object()?.locked)return notice('Objek terkunci. Buka kunci sebelum menghapus.');if(object())(pointsMode?$('deleteNode'):$('delete')).click();},
  nudge(dx,dy,step){
    const o=object(),v=o??marker();if(!v||v.locked)return;
    const record=()=>{if(!keyboardMoveRecorded){remember();keyboardMoveRecorded=true;}};
    if(pointsMode&&o&&selectedNode>=0){
      const point=o.points[selectedNode];if(!point)return;
      const angle=(o.rotation??0)*Math.PI/180;
      const x=clamp(point.x+(dx*Math.cos(angle)+dy*Math.sin(angle))*step/o.w,0,1),y=clamp(point.y+(-dx*Math.sin(angle)+dy*Math.cos(angle))*step/o.h,0,1);
      if(x===point.x&&y===point.y)return;record();point.x=x;point.y=y;nodeFields();
    }else{
      const x=clamp(v.x+dx*step,selected.startsWith('base:')?80:0,map.width-(v.w??80)),y=clamp(v.y+dy*step,selected.startsWith('base:')?100:0,map.height-(v.h??80));
      if(x===v.x&&y===v.y)return;record();v.x=x;v.y=y;propertyFields();
    }
  },
});
window.addEventListener('message',event=>{if(event.source===window.parent&&event.data?.type==='benteng-engine-visibility'&&event.data.active===false)releaseKeyboard();});
canvas.setAttribute('aria-label','Map canvas. Panah: geser 1 px; Shift+panah: 10 px; Delete: hapus objek/titik; Ctrl+Z: Undo; Ctrl+Y: Redo.');
const keyboardHint=document.createElement('p');keyboardHint.className='hint';keyboardHint.textContent='Klik canvas untuk keyboard: panah = 1 px · Shift+panah = 10 px · Delete = hapus objek/titik · Ctrl/Cmd+Z = Undo · Ctrl+Y / Ctrl/Cmd+Shift+Z = Redo. Kolom input tetap memakai keyboard normal.';canvas.parentElement.before(keyboardHint);
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('beforeunload', (e) => {
  if (dirty || drawing?.length) {
    e.preventDefault();
  }
});
function editField(el, mutate) {
  let candidate = structuredClone(map),fixes=[];
  try {
    mutate(candidate);
    try{validateMap(candidate);}catch(error){const repaired=repairMapText(candidate);if(!repaired.fixes.length)throw error;validateMap(repaired.map);candidate=repaired.map;fixes=repaired.fixes;}
    el.setCustomValidity('');
    el.removeAttribute('aria-invalid');
    remember();
    map = candidate;
    if(fixes.length){textInputs();reportTextRepairs(fixes);notice('Nama/isian dirapikan otomatis. Perubahan Anda tetap diterapkan; belum disimpan.');}
    else if($('status').classList.contains('error'))notice('Isian sudah sesuai. Perubahan belum disimpan.');
  } catch (e) {
    el.setCustomValidity(e.message);
    el.setAttribute('aria-invalid','true');
    notice(e.message, true);
  }
}
for (const [id, key] of [
  ['mapName', 'name'],
  ['description', 'description'],
  ['width', 'width'],
  ['height', 'height'],
  ['terrainMode', 'terrainMode'],
  ['tileSize', 'tileSize'],
]) {
  const el = $(id);
  el.oninput = () => {
    if (testing || loading) return;
    editField(el, (m) => {
      m[key] = ['width', 'height', 'tileSize'].includes(key)
        ? +el.value
        : el.value;
    });
    resize();
    if(id==='terrainMode'||id==='tileSize'){tileCache=null;terrainFields();}
  };
  el.onchange = el.oninput;
}
$('enabled').onchange = () => {
  if (testing) return;
  remember();
  map.enabled = $('enabled').checked;
  if (map.enabled) repairColliders(false);
  check();
  publishSummary();
};
for (const k of [
  'x',
  'y',
  'w',
  'h',
  'rotation',
  'z',
  'objectName',
  'behavior',
  'shape',
  'layer',
  'fps',
  'slow',
  'opacity',
  'mirror',
  'mirrorY',
  'visible',
  'locked',
]) {
  const el = $(k),
    handler = () => {
      if (testing || loading || (!object() && !marker())) return;
      editField(el, (m) => {
        const o = m.objects.find((v) => v.id === selected),
          [kind, t] = selected.split(':'),
          v = o ?? (kind === 'base' ? m.bases[t] : m.prisons[t]);
        if (k === 'fps' && o.asset) o.asset.fps = +el.value;
        else if (['mirror', 'mirrorY', 'visible', 'locked'].includes(k)) o[k] = el.checked;
        else if (k === 'objectName') o.name = el.value;
        else if (['slow', 'opacity'].includes(k)) o[k] = +el.value / 100;
        else if (['behavior', 'shape', 'layer'].includes(k)) o[k] = el.value;
        else v[k] = +el.value;
      });
      $('slowRow').hidden = object()?.behavior !== 'slow';
      list();
    };
  el.oninput = handler;
  el.onchange = handler;
}
$('editPoints').onclick = () => {
  const o = object();
  if (!o || testing || o.locked) return;
  remember();
  o.shape = 'polygon';
  pointsMode = !pointsMode;
  propertyFields();
};
$('addNode').onclick = () => {
  const o = object();
  if (!o || !pointsMode || o.locked || o.points.length >= MAX_POLYGON_NODES)
    return;
  remember();
  const edge = selectedNode < 0 ? o.points.length - 1 : selectedNode,
    a = o.points[edge],
    b = o.points[(edge + 1) % o.points.length];
  o.points.splice(edge + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  selectedNode = edge + 1;
  nodeFields();
};
$('deleteNode').onclick = () => {
  const o = object();
  if (!o || !pointsMode || o.locked || selectedNode < 0 || o.points.length <= 3)
    return;
  remember();
  o.points.splice(selectedNode, 1);
  selectedNode = -1;
  nodeFields();
};
function cancelDrawing() {
  drawing = null;
  pointer = null;
  $('drawingTools').hidden = true;
  notice('Gambar poligon dibatalkan; tidak ada objek dibuat.');
}
$('polygon').onclick = () => {
  if (testing || loading) return;
  select('');
  drawing = [];
  pointer = null;
  $('drawingTools').hidden = false;
  $('drawingCount').textContent = '0 titik';
  $('finishPolygon').disabled = true;
  canvas.focus();
  notice(
    'Klik canvas mengikuti batas collider, lalu klik Selesai / Enter. Esc membatalkan.',
  );
};
$('cancelPolygon').onclick = cancelDrawing;
$('finishPolygon').onclick = safe(() => {
  if (!drawing) return;
  const bounds = polygonBounds(drawing);
  const o = add(null, 'Collider poligon');
  Object.assign(o, bounds, { shape: 'polygon', behavior: 'solid' });
  drawing = null;
  pointer = null;
  $('drawingTools').hidden = true;
  repairColliders(false);
  $('bounds').checked = true;
  pointsMode = true;
  propertyFields();
  list();
  check();
  notice(
    'Collider poligon dibuat. Klik＋untuk menambah titik; seret titik untuk membentuk ulang.',
  );
});
$('solidArea').onclick = () => {
  if (testing || loading) return;
  const o = add(null, 'Collider kosong');
  o.behavior = 'solid';
  $('bounds').checked = true;
  propertyFields();
  list();
  check();
  notice(
    'Collider kosong dibuat. Pilih Edit titik polygon untuk bentuk bebas.',
  );
};
$('undo').onclick = () => {
  if (!history.length || testing) return;
  future.push(structuredClone(map));
  map = history.pop();
  dirty = true;
  fields();
  check();
  $('autoFixSummary').textContent = 'Undo diterapkan. Geometri sebelumnya dipulihkan; auto-fix tidak dijalankan ulang sampai Anda memeriksa, mengaktifkan, atau menyimpan.';
};
$('redo').onclick = () => {
  if (!future.length || testing) return;
  history.push(structuredClone(map));
  map = future.pop();
  dirty = true;
  fields();
  check();
  $('autoFixSummary').textContent = 'Redo diterapkan. Periksa hasil sebelum menyimpan.';
};
$('new').onclick = () => open(blank());
$('garduPrototype').onclick=safe(async()=>{
  if(loading||testing)return;
  const response=await fetch('/api/prototypes/gardu-tengah');
  if(!response.ok)throw new Error('Prototype memerlukan backend terbaru. Simpan/ekspor draft sebelum restart Map Studio.');
  const draft=validateMap((await response.json()).map);
  if(state.document.maps.some(m=>m.id===draft.id))draft.id='studio-gardu-tengah-'+uid().slice(0,8);
  open(draft);
  if(map.id===draft.id)notice('Gardu Tengah · Prototype Power Relay single-player. Preview editor menampilkan gerbang tertutup; Relay berjalan di pertandingan game. Draft belum disimpan; slot Pasar tidak berubah.');
});
$('clone').onclick = () => {
  const m = structuredClone(template);
  m.id = 'studio-kampung-' + uid().slice(0, 8);
  open(m);
};
$('duplicateMap').onclick = () => {
  const m = structuredClone(map);
  delete m.replaces;
  delete m.archived;
  delete m.deleted;
  m.id = 'studio-copy-' + uid().slice(0, 8);
  m.name = editorText(m.name,80-' — salinan'.length,'Map')+' — salinan';
  m.enabled = false;
  open(m);
};
$('maps').onchange = () => {
  const value = $('maps').value;
  const entry=mapVersions(state.document,builtins,builtinTemplates,$('showArchived').checked).find(v=>v.value===value);
  if(entry?.map){open(entry.map,{value,readOnly:entry.readOnly});return;}
  if (value === 'builtin:kampung3d') {
      if (
        dirty &&
        !confirm('Tinggalkan draft yang belum disimpan untuk mengelola map 3D?')
      ) {
        mapChoices();
        return;
      }
      dirty = false;
      choiceValue=value;inspectOnly=true;
      $('editVersion').hidden=true;
      $('versionBadge').textContent='MAP 3D · PENGELOLAAN DAFTAR SAJA';
      $('versionDetails').textContent=`Sumber: kampung3d · Revisi dokumen ${state.revision.slice(0,8)}`;
      for(const id of ['archiveMap','deleteMap','restoreMap'])$(id).disabled=false;
      $('resetMap').disabled=true;
      $('save').disabled = true;
      $('test').disabled = true;
      $('duplicateMap').disabled = true;
      document.querySelector('.workspace').inert = true;
      document.querySelector('.inspector-edit-region').inert = true;
      for (const id of ['mapName', 'description', 'width', 'height', 'enabled'])
        $(id).disabled = true;
      $('mapOrigin').textContent =
        'Map 3D: hanya pengelolaan daftar (Arsip/Sampah/Pulihkan). Canvas sebelumnya bukan preview 3D.';
      notice(
        'Edit visual map 3D belum didukung. Anda bisa mengatur Arsip/Sampah dari tombol di kiri.',
      );
      publishSummary();
  }
  else if(!entry)mapChoices();
};
$('editVersion').onclick = () => {
  if(!inspectOnly)return;
  const selectedVersion=mapVersions(state.document,builtins,builtinTemplates,true).find(v=>v.value===choiceValue);
  if(!selectedVersion?.map)return;
  const plan=editableMapVersion(selectedVersion,state.document.maps);
  if(plan.refreshed && !confirm('Mulai edit dari map bawaan terbaru? Draft editor lama tetap tersimpan di disk sampai Anda menekan Simpan; saat itu versi lama dicadangkan otomatis. Batal untuk tetap mempertahankan preview ini.'))return;
  open(plan.map,{value:plan.map.id});
  if(!inspectOnly && map.id===plan.map.id && selectedVersion.kind==='native') {
    dirty=true;publishSummary();mapChoices();
    notice('Draft berasal dari map bawaan terbaru. Belum disimpan/diaktifkan. Versi lama masih aman di disk; aktifkan dan Simpan hanya jika sudah siap.');
  }
};
$('showArchived').onchange = mapChoices;
async function manageMap(action) {
  if (loading || testing)
    throw new Error('Selesaikan upload/uji cepat dahulu.');
  const value = $('maps').value;
  if (!value)
    throw new Error('Pilih map yang sudah tersimpan atau map bawaan dahulu.');
  if (dirty && !confirm('Perubahan belum disimpan akan ditinggalkan. Lanjut?'))
    return;
  if (
    ['delete', 'reset'].includes(action) &&
    !confirm(
      action === 'delete'
        ? 'Pindahkan map ke Sampah? Data dan aset tetap tersedia untuk dipulihkan.'
        : 'Pulihkan map bawaan asli? Versi editor dinonaktifkan; data dan aset tetap tersimpan.',
    )
  )
    return;
  if(inspectOnly && value!=='builtin:kampung3d')throw new Error('Buka versi editor sebelum mengelola arena.');
  const id = value.startsWith('builtin:') ? value.slice(8) : action==='reset'&&map.replaces?map.replaces:map.id,
    r = await api('/api/manage', { id, action });
  state.document = r.document;
  state.revision = r.revision;
  dirty = false;
  $('showArchived').checked = true;
  if (builtins.some(b=>b.id===id)) {
    const m =
      r.document.maps.find((m) => m.replaces === id) ??
      builtinTemplates.find((m) => m.replaces === id);
    if (m) {const saved=r.document.maps.some(v=>v.id===m.id);open(m,{value:saved?m.id:'builtin:'+id,readOnly:!saved});}
  } else {
    const m = r.document.maps.find((m) => m.id === id);
    if (m) open(m);
  }
  dirty = false;
  mapChoices();
  publishSummary();
  if (id === 'kampung3d') $('maps').value = value;
  notice(
    action === 'archive'
      ? 'Map diarsipkan. Build/publish untuk menyembunyikannya di game.'
      : action === 'delete'
        ? 'Map dipindahkan ke Sampah, tidak menghapus aset. Build/publish untuk menerapkan.'
        : action === 'reset'
          ? 'Versi asli dipulihkan. Build/publish untuk menerapkan.'
          : 'Map dipulihkan sebagai draft; centang Aktifkan jika ingin memakai versi editor.',
  );
}
for (const [id, action] of [
  ['archiveMap', 'archive'],
  ['deleteMap', 'delete'],
  ['restoreMap', 'restore'],
  ['resetMap', 'reset'],
])
  $(id).onclick = safe(() => manageMap(action));
$('area').onclick = () => add(null);
$('duplicate').onclick = () => {
  const o = object();
  if (!o || testing) return;
  remember();
  const c = structuredClone(o);
  c.id = 'obj-' + uid();
  c.name = editorText(c.name,92,'Objek')+' salinan';
  c.x = clamp(c.x + 20, 0, map.width - c.w);
  c.y = clamp(c.y + 20, 0, map.height - c.h);
  map.objects.push(c);
  select(c.id);
};
$('delete').onclick = () => {
  if (!object() || testing || loading || inspectOnly || object().locked) return;
  remember();
  map.objects = map.objects.filter((o) => o.id !== selected);
  select('');
};
$('removeImage').onclick = () => {
  if (!object() || testing) return;
  remember();
  object().asset = null;
  propertyFields();
};
$('separateCollider').onclick = () => {
  const o = object();
  if (!o || testing) return;
  remember();
  const c = structuredClone(o);
  c.id = 'obj-' + uid();
  c.name = editorText('Batas ' + o.name,100,'Batas objek');
  c.asset = null;
  c.behavior = o.behavior === 'decoration' ? 'solid' : o.behavior;
  o.behavior = 'decoration';
  c.visible = true;
  map.objects.push(c);
  select(c.id);
  notice('Batas terpisah dibuat. Atur batas tanpa mengubah gambar.');
};
for (const k of ['Terrain', 'Icon'])
  $('clear' + k).onclick = () => {
    if(testing||loading||inspectOnly)return;
    remember();
    map[k.toLowerCase()] = null;
    if(k==='Terrain'){tileCache=null;terrainFields();}
  };
$('zoom').oninput = resize;
$('clearWaterMask').onclick = () => {
  if (!map.waterMask) {
    notice('Map tidak memiliki mask air bawaan.');
    return;
  }
  if (
    !confirm(
      'Hapus mask sungai bawaan? Grafik air tetap di terrain; buat area air baru jika masih diperlukan.',
    )
  )
    return;
  remember();
  delete map.waterMask;
  notice(
    'Mask air bawaan dilepas. Anda dapat menggantinya dengan area air/polygon atau jembatan.',
  );
  check();
};
$('fit').onclick = fit;
$('validate').onclick = safe(() => {
  repairColliders();
  validateMap(map);
  check();
});
function mapChoices() {
  $('maps').replaceChildren(new Option('Pilih map…', ''));
  const entries=mapVersions(state.document,builtins,builtinTemplates,$('showArchived').checked),groups=new Map();
  const hiddenSelected=mapVersions(state.document,builtins,builtinTemplates,true).find(e=>e.value===choiceValue);
  if(hiddenSelected&&!entries.some(e=>e.value===choiceValue))entries.push(hiddenSelected);
  for(const title of ['Aktif di konfigurasi lokal','Draft / versi editor untuk diedit','Versi asli / arsip']){
    const group=document.createElement('optgroup');group.label=title;groups.set(title,group);$('maps').append(group);
  }
  for(const e of entries)groups.get(e.group).append(new Option(e.label,e.value));
  if(!inspectOnly&&!entries.some(e=>e.value===choiceValue))groups.get('Draft / versi editor untuk diedit').append(new Option('[Belum disimpan] '+map.name,choiceValue||map.id));
  $('maps').value=choiceValue||map.id;
  $('resetMap').disabled=inspectOnly||!map.replaces;
  $('mapOrigin').textContent=inspectOnly
    ? 'Preview hanya baca. Memilih versi ini tidak menghapus atau menimpa draft. Buka versi editor tersimpan untuk mengedit; tidak perlu Pulihkan versi asli.'
    : `Anda mengedit ${map.replaces?'pengganti '+map.replaces:'map buatan editor'}. ${map.enabled?'Aktif pada konfigurasi lokal; Build/publish diperlukan untuk deployment.':'Draft nonaktif: game tetap memakai versi aktif yang terpisah.'} Arsip/Sampah tidak menghapus aset.`;
  publishSummary();
}
$('exportDraft').onclick = safe(() => {
  if (!map) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(map, null, 2)], {type:'application/json'}));
  const link = document.createElement('a');link.href = url;link.download = `${map.id}-draft.json`;link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice('Draft diekspor sebagai JSON. Aset gambar tetap berada di folder proyek; map tidak diubah.');
});
$('importDraftButton').onclick=()=>{if(!loading&&!testing&&!drawing)$('draftFile').click();};
$('draftFile').onchange=safe(async()=>{
  try{
    const file=$('draftFile').files[0];if(!file)return;if(file.size>8*1024*1024)throw new Error('Cadangan terlalu besar. Gunakan JSON draft Map Studio maksimal8MB.');
    const previous=map,previousContent=JSON.stringify(map);let data;
    try{data=JSON.parse(await file.text());}catch{throw new Error('Cadangan tidak bisa dibaca. Pilih JSON hasil Ekspor draft; map yang terbuka tidak berubah.');}
    const repaired=repairMapText(data),candidate=validateMap(repaired.map);
    if(map!==previous||JSON.stringify(map)!==previousContent)throw new Error('Map berubah saat cadangan dibaca. Draft tidak ditimpa; pilih file cadangan lagi.');
    open(candidate);if(map===previous)return;
    dirty=true;publishSummary();
    if(repaired.fixes.length){reportTextRepairs(repaired.fixes);$('undoTextRepair').hidden=true;textRepairToken=null;}
    notice(`Cadangan dibuka sebagai draft${repaired.fixes.length?`; ${repaired.fixes.length} nama/isian dirapikan`:''}. Belum ditulis ke proyek. Periksa lalu Simpan; gambar harus tetap tersedia di proyek ini.`);
  }finally{$('draftFile').value='';}
});
$('save').onclick = safe(async () => {
  if(inspectOnly)throw new Error('Preview hanya baca. Buka versi editor sebelum menyimpan.');
  if (loading) return;
  if (drawing)
    throw new Error('Klik Selesai poligon atau Batal sebelum menyimpan.');
  const repairedText=repairTextDraft();
  for (const el of document.querySelectorAll('input,textarea,select'))
    if (!el.disabled && !el.checkValidity()) {
      el.reportValidity();
      throw new Error('Perbaiki nilai field yang ditandai sebelum menyimpan.');
    }
  repairColliders();
  map = validateMap(map);
  if (map.archived || map.deleted) {
    map.enabled = false;
    throw new Error(
      'Pulihkan map dari Arsip/Sampah sebelum mengedit dan menyimpan.',
    );
  }
  check();
  const r = await api('/api/save', { map });
  const saved = r.document?.maps.find(m => m.id === map.id);
  if (!saved || JSON.stringify(validateMap(saved)) !== JSON.stringify(map))
    throw new Error('Hasil simpan tidak cocok dengan draft. Pengaturan visual belum dikonfirmasi tersimpan; draft dipertahankan. Jangan refresh panel.');
  state.document = r.document;
  state.revision = r.revision;
  map = validateMap(saved);
  propertyFields();
  dirty = false;
  mapChoices();
  notice(
    (repairedText?`${repairedText} nama/isian dirapikan otomatis. `:'')+(map.enabled
      ? 'Map disimpan dan aktif. Build/publish untuk menerapkan.'
      : 'Draft disimpan lokal; tidak muncul di game sebelum diaktifkan.'),
  );
  publishSummary();
});
$('test').onclick = () => {
  if (loading || drawing)
    return notice('Selesaikan upload atau gambar poligon dahulu.', true);
  testing = !testing;
  pointsMode = false;
  $('polygonTools').hidden = true;
  propertyFields();
  keys.clear();
  player = { ...map.bases.blue };
  jumpUntil = 0;
  falls = 0;
  $('testingTools').hidden = !testing;
  for (const aside of document.querySelectorAll('main > aside'))
    aside.inert = testing;
  for (const id of [
    'undo',
    'redo',
    'save',
    'build',
    'publish',
    'polygon',
    'solidArea',
    'autoFix',
  ])
    $(id).disabled = testing;
  canvas.focus();
  $('test').textContent = testing ? '■ Selesai uji' : '▶ Uji cepat';
  $('hint').textContent = testing
    ? 'WASD/panah = jalan · Shift = lompat · Space = boost · klik area aman untuk titik mulai. Simulasi area, bukan pertandingan lengkap.'
    : 'Klik/seret objek; tarik sudut untuk ukuran. Koleksi aset dapat diseret ke canvas.';
  notice(
    testing
      ? 'Uji cepat aktif. Solid/parkour/air/lambat memakai model yang sama dengan game.'
      : 'Kembali ke editor.',
  );
};
$('spawnRed').onclick = () => {
  if (testing) {
    player = { ...map.bases.blue };
    jumpUntil = 0;
    keys.clear();
    canvas.focus();
  }
};
$('spawnGreen').onclick = () => {
  if (testing) {
    player = { ...map.bases.red };
    jumpUntil = 0;
    keys.clear();
    canvas.focus();
  }
};
$('jumpDummy').onclick = () => {
  if (testing && performance.now() > jumpUntil + 400)
    jumpUntil = performance.now() + 450;
  canvas.focus();
};
$('boostDummy').onclick = () => {
  if (!testing) return;
  keys.add(' ');
  setTimeout(() => keys.delete(' '), 800);
  canvas.focus();
};
for (const button of document.querySelectorAll('[data-move]')) {
  button.onpointerdown = (e) => {
    if (!testing) return;
    keys.add(button.dataset.move);
    button.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  button.onpointerup = button.onpointercancel = () =>
    keys.delete(button.dataset.move);
}
async function job(publish) {
  if (dirty)
    throw new Error(
      'Simpan map dahulu. Draft canvas belum ikut build/publish.',
    );
  if (drawing || testing) throw new Error('Selesaikan mode gambar/uji dahulu.');
  if (publish && !map.enabled)
    notice(
      'Perhatian: map ini masih draft nonaktif. Publish menyimpan data, bukan otomatis mengaktifkannya.',
    );
  for (const id of ['save', 'build', 'publish']) $(id).disabled = true;
  try {
    notice((await api(publish ? '/api/publish' : '/api/build', {})).message);
  } catch (e) {
    for (const id of ['save', 'build', 'publish']) $(id).disabled = false;
    throw e;
  }
  const timer = setInterval(async () => {
    try {
      const j = await api('/api/job');
      notice(j.message, j.status === 'error');
      if (j.status !== 'running') {
        clearInterval(timer);
        for (const id of ['save', 'build', 'publish']) $(id).disabled = false;
        if (j.url) {
          const a = document.createElement('a');
          a.href = j.url;
          a.target = '_blank';
          a.rel = 'noreferrer';
          a.textContent = ' Buka hasil ↗';
          $('status').append(a);
        }
      }
    } catch (e) {
      clearInterval(timer);
      for (const id of ['save', 'build', 'publish']) $(id).disabled = false;
      notice(e.message, true);
    }
  }, 2000);
}
$('build').onclick = safe(() => job(false));
$('publish').onclick = safe(() => job(true));
async function uploadFile(f, target) {
  if(f&&state.capabilities?.assetOptimization!==1)throw new Error('Server Map Studio masih versi lama. Simpan/ekspor draft sebelum restart server, lalu upload ulang untuk optimasi otomatis.');
  if(inspectOnly)throw new Error('Preview hanya baca. Buka versi editor sebelum upload.');
  if (loading || testing) throw new Error('Selesaikan upload/uji cepat dahulu.');
  if ($('maps').value === 'builtin:kampung3d')
    throw new Error('Pilih map 2D untuk upload/edit.');
  if (!f) return;
  if (f.size > 30 * 1024 * 1024)
    throw new Error('File ditolak: maksimal 30 MB.');
  const selectedBefore = selected;
  const structureBefore = target === 'structure' ? fileTarget : null;
  if (target === 'structure' && !structureBefore) throw new Error('Pilih visual struktur dahulu.');
  if (target === 'replace' && !object()) throw new Error('Pilih objek dahulu.');
  if (uploadUrl) URL.revokeObjectURL(uploadUrl);
  uploadUrl = URL.createObjectURL(f);
  $('uploadPreview').src = uploadUrl;
  $('uploadPreview').hidden = false;
  loading = true;
  $('save').disabled = true;
  notice('Preview sumber tampil. Memeriksa dan memproses file…');
  try {
    const data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () =>
          typeof r.result === 'string'
            ? resolve(r.result.split(',')[1])
            : reject(new Error('File gagal dibaca sebagai gambar.'));
        r.onerror = () => reject(new Error('File gagal dibaca.'));
        r.readAsDataURL(f);
      }),
      result = await api('/api/upload', {
        kind: target === 'structure'||target==='patch' ? 'object' : target,
        displaySize:target==='terrain'?{width:map.width,height:map.height}:target==='replace'?{width:object()?.w,height:object()?.h}:target==='structure'?(()=>{const {visual}=structureTarget(structureBefore);return {width:visual.w,height:visual.h};})():{width:360,height:360},
        file: { name: f.name, data },
      });
    if (target === 'structure') {
      // Target captured before async upload. Map switches are blocked by loading.
      loading = false;
      replaceStructure(structureBefore, result.asset);
    } else if(target==='patch') addTerrainPatch(result.asset,f.name.replace(/\.[^.]+$/,''));
    else if(target==='terrain'){loading=false;applyTerrain(result.asset);}
    else if (target === 'object') add(result.asset, f.name.replace(/\.[^.]+$/, ''));
    else {
      if (target === 'replace' && !map.objects.some(o=>o.id===selectedBefore)) throw new Error('Objek berubah. Upload ulang.');
      remember();
      if (target === 'icon') map.icon = result.asset;
      else {
        const o = map.objects.find((o) => o.id === selectedBefore);
        if (!o) throw new Error('Objek berubah. Upload ulang.');
        o.asset = result.asset;
      }
    }
    propertyFields();
    showOptimization($('assetOptimization'),result.optimization);
    if(result.libraryItem){library=library.filter(i=>i.key!==result.libraryItem.key);library.unshift(result.libraryItem);renderLibrary();}
    publishSummary();
    notice(
      `File diterima · ${result.asset.frames.length} frame. Simpan map setelah penempatan selesai.`,
    );
  } finally {
    loading = false;
    $('save').disabled = false;
    $('file').value = '';
    $('structureFile').value = '';
  }
}
$('structureFile').onchange = safe(async () => {
  try { await uploadFile($('structureFile').files[0], 'structure'); }
  finally { $('structureFile').value = ''; fileTarget = null; }
});
$('file').onchange = safe(() => uploadFile($('file').files[0], $('uploadKind').value));
$('replaceTerrain').onclick=safe(()=>{terrainEditable();terrainFileTarget='terrain';$('terrainFile').click();});
for(const element of [$('terrainMode').parentElement,$('tileSize').parentElement,$('clearTerrain')])$('terrainTools').insertBefore(element,$('terrainHelp'));
$('addTerrainPatch').onclick=safe(()=>{terrainEditable();terrainFileTarget='patch';$('terrainFile').click();});
$('terrainFile').onchange=safe(async()=>{try{await uploadFile($('terrainFile').files[0],terrainFileTarget);}finally{$('terrainFile').value='';}});
for(const [button,mode]of [['terrainLibrary','terrain'],['patchLibrary','patch']])$(button).onclick=safe(()=>{terrainEditable();replacement=null;terrainPick=mode;renderReplacement();$('library').scrollIntoView({block:'nearest'});});
$('restoreTerrain').onclick=safe(()=>{terrainEditable();const original=builtinTemplates.find(m=>m.replaces===map.replaces);if(!original)throw new Error('Map ini tidak memiliki terrain asli bawaan. Gunakan Undo atau pilih file baru.');if(!confirm('Pulihkan hanya terrain asli? Tambalan, objek, collider dan struktur tetap dipertahankan.'))return;applyTerrain(original.terrain);map.terrainMode=original.terrainMode;map.tileSize=original.tileSize;fields();});
$('chooseMapPreview').onclick = () => $('mapPreviewFile').click();
$('mapPreviewFile').onchange = safe(async () => {
  try { await uploadFile($('mapPreviewFile').files[0], 'icon'); }
  finally { $('mapPreviewFile').value = ''; }
});
function renderLibrary() {
  const q = $('search').value.toLowerCase();
  const filter=$('libraryFilter').value;
  $('library').replaceChildren();
  const visible=library.filter(i=>i.name.toLowerCase().includes(q)&&(filter==='all'||(filter==='upload')===(i.source==='upload')));
  for (const item of visible) {
    const b = document.createElement('button'),
      thumb = document.createElement('canvas');
    thumb.width = thumb.height = 48;
    const i = image(item.clip),
      paint = () => {
        const f = item.clip.frames[0],
          r = Math.min(46 / f.width, 46 / f.height);
        drawAsset(
          thumb.getContext('2d'),
          item.clip,
          (48 - f.width * r) / 2,
          (48 - f.height * r) / 2,
          f.width * r,
          f.height * r,
        );
      };
    if (i.complete) paint();
    else i.addEventListener('load', paint, { once: true });
    b.append(thumb, document.createTextNode(item.name));b.title=`${item.name} · ${item.source==='upload'?'Upload proyek':item.arena??'Bawaan'}`;
    b.onclick = safe(() => {
      if (loading || testing || inspectOnly) return;
      if(terrainPick==='terrain')applyTerrain(item.clip);
      else if(terrainPick==='patch')addTerrainPatch(item.clip,item.name);
      else if(replacement){const target=replacement;replaceStructure(target,item.clip);replacement=null;renderReplacement();}
      else add(item.clip, item.name);
    });
    b.draggable = true;
    b.ondragstart = (e) =>
      e.dataTransfer.setData('application/map-studio-asset', item.key??`${item.arena ?? ''}:${item.name}`);
    $('library').append(b);
  }
  $('libraryStatus').textContent=`${visible.length} aset`;
}
$('search').oninput = renderLibrary;
$('libraryFilter').onchange=renderLibrary;
async function refreshAssetLibrary(){
  const result=await api('/api/library');
  library=[...result.items,...builtinLibrary];renderLibrary();
  if(result.warnings?.length)notice(result.warnings.join(' '),true);
}
$('refreshLibrary').onclick=safe(refreshAssetLibrary);
try{$('objectsPanel').open=sessionStorage.getItem('benteng-map-objects-open')==='true';}catch{/* Optional UI preference. */}
$('objectsPanel').addEventListener('toggle',()=>{try{sessionStorage.setItem('benteng-map-objects-open',String($('objectsPanel').open));}catch{/* Optional UI preference. */}});
canvas.ondragover = (e) => e.preventDefault();
canvas.ondrop = (e) => {
  e.preventDefault();
  if (testing || loading || inspectOnly || drawing) return;
  const i = library.find(
    (i) => (i.key??`${i.arena ?? ''}:${i.name}`) === e.dataTransfer.getData('application/map-studio-asset'),
  );
  if (!i) return;
  if(terrainPick==='terrain'){applyTerrain(i.clip);return;}
  if(replacement){const target=replacement;replaceStructure(target,i.clip);replacement=null;renderReplacement();return;}
  const added=terrainPick==='patch'?addTerrainPatch(i.clip,i.name):add(i.clip, i.name);
  const p = position(e),
    o = added??object();
  o.x = clamp(snap(p.x - o.w / 2), 0, map.width - o.w);
  o.y = clamp(snap(p.y - o.h / 2), 0, map.height - o.h);
  propertyFields();
};
document.querySelector('main').inert = true;
for (const b of document.querySelectorAll('nav button')) b.disabled = true;
void safe(async () => {
  state = await api('/api/state');
  if (state.capabilities?.mapAssetBundles !== 1) throw new Error('Backend Map Studio belum mendukung gambar map terbaru. Simpan/ekspor draft di tab lama sebelum restart npm run admin:maps, atau gunakan panel terbaru yang diberikan.');
  const t = validateCatalog(await api('/api/templates'));
  template = t.template;
  builtinTemplates = t.builtinTemplates;
  builtins = t.builtins;
  builtinLibrary=t.library;library=[...builtinLibrary];
  try{await refreshAssetLibrary();}catch{$('libraryStatus').textContent='Koleksi upload memerlukan backend terbaru. Aset bawaan tetap tersedia.';}
  const first=mapVersions(state.document,builtins,builtinTemplates).find(e=>e.active&&e.map);
  map=structuredClone(first?.map??blank());inspectOnly=!!first;choiceValue=first?.value??map.id;
  fields();
  fit();
  mapChoices();
  renderLibrary();
  check();
  document.querySelector('main').inert = false;
  for (const b of document.querySelectorAll('nav button')) b.disabled = false;
  applyViewMode();
  notice(
    'Map Studio siap · lokal. Mulai dengan Map kosong atau Salin Kampung.',
  );
  requestAnimationFrame(animate);
  try{const {installMapCoachmarks}=await import('/coachmarks.js');installMapCoachmarks();}catch{notice('Editor siap. Bantuan ringkas memerlukan backend terbaru; simpan/ekspor draft sebelum memperbarui server.');}
})();
