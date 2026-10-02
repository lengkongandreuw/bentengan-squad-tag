import {ACTIONS,DIRECTIONS,SLOTS,frameAt,spritePlacement} from '/model.js';
const $=id=>document.getElementById(id),names={run:'Lari',tag:'Tag / menangkap',parkour:'Lompat / parkour',idle:'Idle',prisoner:'Idle tertangkap',ready:'Bersiap awal',ultimate:'Ultimate (opsional)',victory:'Menang',defeat:'Kalah',south:'Depan / bawah ↓',north:'Belakang / atas ↑',west:'Kiri ←',east:'Kanan →',northwest:'Kiri atas ↖',northeast:'Kanan atas ↗',southwest:'Kiri bawah ↙',southeast:'Kanan bawah ↘'};
let state,clip=null,image=null,legacy=null,dirty=false,playing=true,frame=0,start=performance.now(),uploaded=[],selection='',requestId=0,drag=null;
const numeric=['fps','scale','x','y','pivotX','pivotY'];
const drafts={};
names.default='Default · semua arah';
let uploadValid=false;
const fileNotice=(text,error=false)=>{$('fileStatus').textContent=text;$('fileStatus').className=error?'error':'success';};
const filePayload=()=>Promise.all(uploaded.map(f=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:f.name,data:String(reader.result).split(',')[1]});reader.onerror=()=>reject(new Error(`Gagal membaca ${f.name}`));reader.readAsDataURL(f);})));
let processing=false;
function processingState(value){processing=value;for(const k of ['files','columns','rows','count','order','cropLeft','cropTop','cropWidth','cropHeight','sourceFile','sourceCell','compile','resetCrop','character','action','direction'])$(k).disabled=value;$('settings').disabled=value||!clip;refreshBatch();}
const slotName=s=>`${names[s.split('.')[0]]} ${names[s.split('.')[1]]??''}`.trim();
function stageCurrent(reviewed=false){if(!selection||pendingUpload||!clip)return;const [character,s]=selection.split('/');drafts[character]??={};drafts[character][s]={clip:structuredClone(clip),reviewed};}
function refreshBatch(){
  const entries=Object.entries(drafts[id()]??{}),ready=entries.filter(([s,v])=>v.reviewed&&!(pendingUpload&&s===slot())).length;
  $('batchSummary').textContent=entries.length?`${ready} dipilih dari ${entries.length} draft. Draft lainnya tidak ikut diterapkan.`:'Belum ada draft. Anda boleh mengganti satu movement saja.';
  $('batchList').replaceChildren(...entries.map(([s,v])=>{const row=document.createElement('label'),check=document.createElement('input'),b=document.createElement('button');row.className='batch-row';check.type='checkbox';check.checked=v.reviewed;check.disabled=processing;check.setAttribute('aria-label',`Terapkan ${slotName(s)}`);check.onchange=()=>{v.reviewed=check.checked;refreshBatch();};b.className='batch-item';b.textContent=slotName(s);b.onclick=safe(async()=>{$('action').value=s.split('.')[0];$('direction').value=s.split('.')[1]??'default';await loadSlot();});row.append(check,b);return row;}));
  $('saveCharacter').disabled=!ready||processing;
  $('publish').disabled=processing;
  $('applyCurrent').disabled=processing||pendingUpload||!clip;
}
let sourceUrls=[],sourceTicket=0,sourceWidth=0,sourceHeight=0,crop=null,cropDrag=null,pendingUpload=false;
function clearSource(){sourceTicket++;sourceUrls.forEach(URL.revokeObjectURL);sourceUrls=[];sourceWidth=sourceHeight=0;crop=null;pendingUpload=false;$('sourceEditor').hidden=true;$('sourceImage').removeAttribute('src');for(const k of ['cropLeft','cropTop'])$(k).value=0;for(const k of ['cropWidth','cropHeight'])$(k).value='';}
function sourceBounds(){const sheet=uploaded.length===1&&uploaded[0]?.type==='image/png';const columns=sheet?Math.max(1,+$('columns').value||1):1,rows=sheet?Math.max(1,+$('rows').value||1):1;return {width:Math.max(1,Math.floor(sourceWidth/columns)),height:Math.max(1,Math.floor(sourceHeight/rows)),columns,rows};}
function renderCrop(){
  if(!sourceWidth)return;
  const b=sourceBounds(),stage=$('cropStage');
  stage.style.setProperty('--crop-fit',`${500*b.width/b.height}px`);
  const factor=stage.clientWidth/b.width;
  stage.style.height=`${b.height*factor}px`;
  const cell=Math.max(0,Math.min(b.columns*b.rows-1,+$('sourceCell').value||0));
  $('sourceCell').max=b.columns*b.rows-1;$('sourceCell').value=cell;
  const img=$('sourceImage');
  Object.assign(img.style,{width:`${sourceWidth*factor}px`,height:`${sourceHeight*factor}px`,left:`-${(cell%b.columns)*b.width*factor}px`,top:`-${Math.floor(cell/b.columns)*b.height*factor}px`});
  const r=crop??{left:0,top:0,width:b.width,height:b.height};
  Object.assign($('cropBox').style,{left:`${r.left*factor}px`,top:`${r.top*factor}px`,width:`${r.width*factor}px`,height:`${r.height*factor}px`});
  $('cropInfo').textContent=`Frame ${b.width} × ${b.height} px · potongan ${r.width} × ${r.height} px · (${r.left}, ${r.top})`;
  if(state)refreshBatch();
}
function setCrop(r){const b=sourceBounds();const left=Math.max(0,Math.min(b.width-1,Math.round(r.left))),top=Math.max(0,Math.min(b.height-1,Math.round(r.top)));crop={left,top,width:Math.max(1,Math.min(b.width-left,Math.round(r.width))),height:Math.max(1,Math.min(b.height-top,Math.round(r.height)))};for(const [key,input] of Object.entries({left:'cropLeft',top:'cropTop',width:'cropWidth',height:'cropHeight'}))$(input).value=crop[key];pendingUpload=true;$('save').disabled=true;renderCrop();}
async function showSource(){const ticket=++sourceTicket;const index=+$('sourceFile').value||0;sourceWidth=sourceHeight=0;$('sourceImage').src=sourceUrls[index];const loaded=await loadImage(sourceUrls[index]);if(ticket!==sourceTicket)return;sourceWidth=loaded.naturalWidth;sourceHeight=loaded.naturalHeight;if(crop)setCrop(crop);renderCrop();}
const slot=()=>$('direction').value==='default'?$('action').value:`${$('action').value}.${$('direction').value}`;
const id=()=>$('character').value;
const message=s=>{$('status').textContent=s;};
const mark=()=>{dirty=true;stageCurrent(false);$('origin').textContent='Draft · belum diperiksa';refreshSlots();};
async function api(route,body){const res=await fetch(`/api/${route}`,body?{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':state.token},body:JSON.stringify({...body,revision:state.revision})}:{});const data=await res.json();if(!res.ok)throw new Error(data.error);return data;}
function options(select,values,label){select.replaceChildren(...values.map(value=>{const o=document.createElement('option');o.value=value;o.textContent=label(value);return o;}));}
function refreshSlots(){
  const a=$('action').value,slots=SLOTS.filter(s=>s.split('.')[0]===a);
  $('slots').replaceChildren(...slots.map(s=>{const draft=drafts[id()]?.[s];const b=document.createElement('button');b.className=`slot ${state.document.characters[id()]?.[s]?'custom':''} ${draft?.reviewed?'ready':''} ${s===slot()?'selected':''}`;b.textContent=`${draft?(draft.reviewed?'✓ ':'○ '):''}${names[s.split('.')[1]??'default']}`;b.onclick=safe(async()=>{$('direction').value=s.split('.')[1]??'default';await loadSlot();});return b;}));
  const custom=Object.keys(state.document.characters[id()]??{});$('summary').textContent=`${state.roster.find(r=>r.id===id()).team==='red'?'Tim Merah':'Tim Hijau'} · ${custom.length} movement / arah custom`;
  options($('copySource'),[...new Set([...custom,...Object.keys(drafts[id()]??{}).filter(s=>drafts[id()][s].clip)])],slotName);refreshBatch();
}
function settings(){numeric.forEach(k=>{$(k).value=clip?.[k]??'';});['loop','mirror'].forEach(k=>{$(k).checked=clip?.[k]??false;});$('settings').disabled=!clip||processing;$('save').disabled=!clip||pendingUpload||processing;$('frame').max=String((clip??legacy)?.frames.length-1||0);}
async function loadImage(src){const i=new Image();i.src=src;try{await i.decode();}catch{throw new Error('Gambar tidak bisa dibaca atau ditampilkan. Periksa file PNG/GIF/WebP, lalu pilih ulang.');}return i;}
async function legacyClip(character,s){
  const manifest=await fetch(`/characters/${character}/animations.json`).then(r=>r.json());
  const [action,direction]=s.split('.');
  const d=direction?.includes('north')?'north':direction?.includes('south')?'south':direction??'south';
  const frames=manifest.directions[d]?.[action==='run'?'run':'idle']??manifest.directions.south.idle;
  const actionFrames=manifest.actions?.[action];
  return {asset:`characters/${character}/atlas.webp`,frames:actionFrames??frames,fps:11,scale:1,x:0,y:0,pivotX:.5,pivotY:1,loop:true,mirror:false};
}
async function loadSlot(){
  const next=`${id()}/${slot()}`;
  if(processing){const [oldId,oldSlot]=selection.split('/');$('character').value=oldId;$('action').value=oldSlot.split('.')[0];if(oldSlot.includes('.'))$('direction').value=oldSlot.split('.')[1];throw new Error('Tunggu pemrosesan animasi selesai.');}
  if(pendingUpload&&!confirm('File/crop ini belum diproses. Buang upload ini dan berpindah arah? Draft arah lain tetap disimpan.')){const [oldId,oldSlot]=selection.split('/');$('character').value=oldId;$('action').value=oldSlot.split('.')[0];if(oldSlot.includes('.'))$('direction').value=oldSlot.split('.')[1];return;}
  // Edits are already staged by mark(); changing direction must not uncheck a selected draft.
  selection=next;dirty=false;clearSource();uploaded=[];$('files').value='';$('fileNames').textContent='';
  for(const k of ['columns','rows','count'])$(k).value=1;$('order').value='';
  $('direction').disabled=false;uploadValid=false;fileNotice('PNG tunggal, PNG sheet, kumpulan PNG, GIF dan WebP didukung.');refreshSlots();
  $('title').textContent=`${state.roster.find(r=>r.id===id()).name} · ${names[$('action').value]} ${$('direction').disabled?'':names[$('direction').value]}`;
  const draft=drafts[id()]?.[slot()];dirty=Boolean(draft&&!draft.reviewed);
  clip=structuredClone(draft?draft.clip:state.document.characters[id()]?.[slot()]??state.document.characters[id()]?.[$('action').value]??null);legacy=null;image=null;frame=0;start=performance.now();settings();
  const ticket=++requestId;
  try {
    const fallback=clip?null:await legacyClip(id(),slot());
    const source=clip??fallback,loaded=await loadImage('/'+source.asset);
    if(ticket!==requestId)return;legacy=fallback;image=loaded;settings();
    $('origin').textContent=draft?(draft.reviewed?'Draft · sudah sesuai':'Draft · belum diperiksa'):clip?'Sprite custom tersimpan':'Sprite lama · ilustrasi atlas';
    message(clip?'Siap mengedit slot ini.':'Slot ini tetap memakai animasi game saat ini. Preview atlas lama hanya referensi; Uji game memakai renderer yang sebenarnya.');
  }catch(e){if(ticket===requestId)message(e.message);}
}
async function save(){if(pendingUpload)throw new Error('Proses & lihat hasil dahulu sebelum menyatakan arah sudah sesuai.');if(!clip)throw new Error('Proses upload atau salin animasi terlebih dahulu.');stageCurrent(true);dirty=false;refreshSlots();$('origin').textContent='Draft · sudah sesuai';message('Arah ini sudah sesuai. Periksa arah berikutnya, lalu Simpan & update karakter sekaligus.');}
async function saveCharacter(onlyCurrent=false){
  if(onlyCurrent){if(pendingUpload||!clip)throw new Error('Proses file movement ini terlebih dahulu.');stageCurrent(true);dirty=false;}
  const entries=Object.entries(drafts[id()]??{}).filter(([s,v])=>onlyCurrent?s===slot():v.reviewed&&!(pendingUpload&&s===slot()));
  if(!entries.length)return;
  const character=id();processingState(true);
  try {
    const result=await api('save-character',{id:character,clips:Object.fromEntries(entries.map(([s,v])=>[s,v.clip]))});
    Object.assign(state,result);for(const [s] of entries)delete drafts[character][s];dirty=false;
  } finally {processingState(false);settings();}
  if(!pendingUpload)await loadSlot();else refreshSlots();message(`${entries.length} movement / arah diterapkan. Draft lainnya dan karakter lain tidak berubah.`);
}
async function job(publish){await api(publish?'publish':'build',{});message('Memulai publikasi perubahan yang sudah diterapkan. Draft tidak ikut dipublikasikan.');
  const poll=setInterval(async()=>{try{const result=await api('job');message(result.message);if(result.status!=='running'){clearInterval(poll);if(result.url){$('gameLink').href=result.url;$('gameLink').hidden=false;}}}catch(e){clearInterval(poll);message(e.message);}},2000);
}
const safe=fn=>async()=>{try{if(processing)throw new Error('Tunggu pemrosesan animasi selesai.');await fn();}catch(e){message(e.message);fileNotice(e.message,true);}};
$('files').onchange=safe(async()=>{
  clearSource();uploadValid=false;uploaded=[...$('files').files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));$('fileNames').textContent=uploaded.map(f=>f.name).join('\n');if(!uploaded.length)return;
  pendingUpload=true;mark();fileNotice('Memeriksa file…');
  if(uploaded.some(f=>!(/\.(png|gif|webp)$/i.test(f.name))))throw new Error('File ditolak: hanya PNG, GIF atau WebP.');
  if(uploaded.reduce((n,f)=>n+f.size,0)>30*1024*1024)throw new Error('File ditolak: total maksimal 30 MB.');
  if(uploaded.length>1)$('count').value=uploaded.length;
  processingState(true);try {
  sourceUrls=uploaded.map(f=>URL.createObjectURL(f));options($('sourceFile'),uploaded.map((_,i)=>String(i)),i=>uploaded[+i].name);$('sourceCell').value=0;$('sourceEditor').hidden=false;$('save').disabled=true;
  await showSource();const activeTicket=sourceTicket;
  const inspection=await api('inspect',{files:await filePayload()});if(activeTicket!==sourceTicket)return;
  uploadValid=true;fileNotice(`File diterima: ${inspection.files.map(f=>`${f.format.toUpperCase()} ${f.width}×${f.height}, ${f.pages} frame`).join('; ')}. PNG sheet: atur grid di Advanced options. Klik Proses untuk validasi hasil akhir.`);message('File dapat dibaca. Preview belum diterapkan ke game.');
  } finally {processingState(false);settings();}
});
$('sourceFile').onchange=safe(showSource);$('sourceCell').oninput=renderCrop;
for(const k of ['count','order'])$(k).oninput=()=>{if(uploaded.length){pendingUpload=true;mark();$('save').disabled=true;}};
for(const k of ['columns','rows'])$(k).oninput=()=>{crop=null;$('cropWidth').value=$('cropHeight').value='';$('cropLeft').value=$('cropTop').value=0;if(uploaded.length){pendingUpload=true;mark();$('save').disabled=true;}renderCrop();};
for(const k of ['cropLeft','cropTop','cropWidth','cropHeight'])$(k).oninput=()=>{if(sourceWidth){const b=sourceBounds();setCrop({left:+$('cropLeft').value,top:+$('cropTop').value,width:+$('cropWidth').value||b.width,height:+$('cropHeight').value||b.height});}};
$('resetCrop').onclick=()=>{crop=null;$('cropWidth').value=$('cropHeight').value='';$('cropLeft').value=$('cropTop').value=0;pendingUpload=true;$('save').disabled=true;renderCrop();};
$('cropBox').onpointerdown=e=>{if(!sourceWidth||processing)return;e.preventDefault();$('cropBox').setPointerCapture(e.pointerId);const b=sourceBounds();cropDrag={x:e.clientX,y:e.clientY,resize:e.target.closest('#cropHandle')!==null,rect:{...(crop??{left:0,top:0,width:b.width,height:b.height})},factor:b.width/$('cropStage').clientWidth};};
$('cropBox').onpointermove=e=>{if(!cropDrag)return;const d=cropDrag,dx=(e.clientX-d.x)*d.factor,dy=(e.clientY-d.y)*d.factor,b=sourceBounds();setCrop(d.resize?{...d.rect,width:d.rect.width+dx,height:d.rect.height+dy}:{...d.rect,left:Math.max(0,Math.min(b.width-d.rect.width,d.rect.left+dx)),top:Math.max(0,Math.min(b.height-d.rect.height,d.rect.top+dy))});};
$('cropBox').onpointerup=$('cropBox').onpointercancel=$('cropBox').onlostpointercapture=()=>{cropDrag=null;};
new ResizeObserver(renderCrop).observe($('cropStage'));
$('compile').onclick=safe(async()=>{
  if(!uploaded.length)throw new Error('Pilih file dahulu.');
  if(!uploadValid)throw new Error('File belum lolos pemeriksaan. Pilih PNG/GIF/WebP yang valid dan tunggu status File diterima.');
  if(uploaded.reduce((sum,f)=>sum+f.size,0)>30*1024*1024)throw new Error('Total maksimal 30 MB.');
  processingState(true);cropDrag=null;
  try {
  const files=await filePayload();message('Memproses frame…');fileNotice('Memproses dan memvalidasi frame…');
  const options={columns:+$('columns').value,rows:+$('rows').value,count:+$('count').value};
  if($('order').value.trim())options.order=$('order').value.split(',').map(v=>Number(v.trim()));
  if($('cropWidth').value||$('cropHeight').value)options.crop={left:+$('cropLeft').value,top:+$('cropTop').value,width:+$('cropWidth').value,height:+$('cropHeight').value};
  const result=await api('compile',{id:id(),slot:slot(),files,options});const previous=clip;
  clip=result.clip;if(previous)for(const k of [...numeric,'loop','mirror'])clip[k]=previous[k];
  image=await loadImage('/'+clip.asset);pendingUpload=false;frame=0;start=performance.now();settings();mark();fileNotice(`Siap digunakan: ${clip.frames.length} frame. Klik Terapkan movement ini saja, atau centang draft untuk update pilihan.`);message('Pemrosesan berhasil. Movement lain tidak wajib diganti.');
  } finally {processingState(false);settings();}
});
$('copy').onclick=safe(async()=>{const s=$('copySource').value,source=drafts[id()]?.[s]?.clip??state.document.characters[id()]?.[s];if(!source)throw new Error('Belum ada animasi custom untuk disalin.');clearSource();uploaded=[];$('files').value='';$('fileNames').textContent='';clip=structuredClone(source);image=await loadImage('/'+clip.asset);settings();mark();message('Animasi disalin sebagai draft. Atur mirror bila perlu, kemudian tandai sudah sesuai.');});
numeric.forEach(k=>{$(k).oninput=()=>{if(clip){clip[k]=+$(k).value;mark();}};});['loop','mirror'].forEach(k=>{$(k).onchange=()=>{if(clip){clip[k]=$(k).checked;mark();}};});
$('save').onclick=safe(save);$('saveCharacter').onclick=safe(()=>saveCharacter());$('applyCurrent').onclick=safe(()=>saveCharacter(true));
$('discard').onclick=safe(async()=>{if(drafts[id()])delete drafts[id()][slot()];dirty=false;clearSource();await loadSlot();});
$('discardAll').onclick=safe(async()=>{if(!confirm('Buang seluruh draft karakter ini? Sprite game yang tersimpan tidak berubah.'))return;delete drafts[id()];dirty=false;clearSource();await loadSlot();});
$('remove').onclick=safe(async()=>{drafts[id()]??={};drafts[id()][slot()]={clip:null,reviewed:true};dirty=false;clearSource();await loadSlot();message('Reset arah ini masuk daftar perubahan. Simpan & update karakter untuk menerapkannya.');});
$('publish').onclick=safe(()=>job(true));$('build').onclick=safe(()=>job(false));
for(const k of ['character','action','direction'])$(k).onchange=safe(loadSlot);
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';const c=clip??legacy;if(c)start=performance.now()-frame*1000/c.fps;};
$('restart').onclick=()=>{frame=0;start=performance.now();};
const step=n=>{playing=false;$('play').textContent='Play';const c=clip??legacy;if(c)frame=(frame+n+c.frames.length)%c.frames.length;};
$('previous').onclick=()=>step(-1);$('next').onclick=()=>step(1);$('frame').oninput=()=>{playing=false;$('play').textContent='Play';frame=+$('frame').value;};
const canvas=$('preview'),ctx=canvas.getContext('2d'),ground=new Image();ground.src='/field/kampung-map.webp';
canvas.onpointerdown=e=>{if(!clip||processing)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,ox:clip.x,oy:clip.y};};
canvas.onpointermove=e=>{if(!drag||!clip)return;const r=canvas.getBoundingClientRect(),factor=canvas.width/r.width/(+$('zoom').value);clip.x=Math.max(-150,Math.min(150,drag.ox+(e.clientX-drag.x)*factor));clip.y=Math.max(-150,Math.min(150,drag.oy+(e.clientY-drag.y)*factor));settings();mark();};
canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{drag=null;};
function draw(now){
  ctx.fillStyle='#1c261f';ctx.fillRect(0,0,canvas.width,canvas.height);
  if($('arena').checked&&ground.complete&&ground.naturalWidth)ctx.drawImage(ground,0,0,900,440);else for(let y=0;y<440;y+=24)for(let x=0;x<900;x+=24){ctx.fillStyle=(x/24+y/24)%2?'#222f26':'#18231c';ctx.fillRect(x,y,24,24);}
  const c=clip??legacy,zoom=+$('zoom').value,baseX=450,baseY=360;
  ctx.strokeStyle='#b9ed77';ctx.beginPath();ctx.moveTo(0,baseY);ctx.lineTo(900,baseY);ctx.stroke();
  if(c&&image?.complete){
    if(playing) {const f=frameAt(c,now-start);frame=c.frames.indexOf(f);}
    const f=c.frames[frame],p=spritePlacement(c,f,74);ctx.save();ctx.translate(baseX,baseY);ctx.scale(zoom,zoom);
    ctx.strokeStyle='#69dfff';ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();
    ctx.translate(c.x,c.y);if(c.mirror)ctx.scale(-1,1);
    ctx.drawImage(image,f.x,f.y,f.width,f.height,-p.width*c.pivotX,-p.height*c.pivotY,p.width,p.height);
    ctx.strokeStyle='#ffffff70';ctx.strokeRect(-p.width*c.pivotX,-p.height*c.pivotY,p.width,p.height);ctx.restore();
    $('frame').value=frame;$('frameLabel').textContent=`${frame+1}/${c.frames.length}`;
  }requestAnimationFrame(draw);
}
window.onbeforeunload=e=>{if(dirty||pendingUpload||Object.values(drafts).some(d=>Object.keys(d).length)){e.preventDefault();e.returnValue='';}};
try{state=await api('state');options($('character'),state.roster.map(r=>r.id),id=>state.roster.find(r=>r.id===id).name);options($('action'),ACTIONS,a=>names[a]);options($('direction'),['default',...DIRECTIONS],d=>names[d]);await loadSlot();requestAnimationFrame(draw);}catch(e){message(e.message);fileNotice(e.message,true);}
