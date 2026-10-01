import {ACTIONS,DIRECTIONS,SLOTS,frameAt,spritePlacement} from '/model.js';
const $=id=>document.getElementById(id),names={run:'Lari',tag:'Tag / menangkap',parkour:'Lompat / parkour',idle:'Idle',prisoner:'Idle tertangkap',ready:'Bersiap awal',ultimate:'Ultimate (opsional)',victory:'Menang',defeat:'Kalah',south:'Depan / bawah ↓',north:'Belakang / atas ↑',west:'Kiri ←',east:'Kanan →',northwest:'Kiri atas ↖',northeast:'Kanan atas ↗',southwest:'Kiri bawah ↙',southeast:'Kanan bawah ↘'};
let state,clip=null,image=null,legacy=null,dirty=false,playing=true,frame=0,start=performance.now(),uploaded=[],selection='',requestId=0,drag=null;
const numeric=['fps','scale','x','y','pivotX','pivotY'];
const slot=()=>['run','tag','parkour'].includes($('action').value)?`${$('action').value}.${$('direction').value}`:$('action').value;
const id=()=>$('character').value;
const message=s=>{$('status').textContent=s;};
const mark=()=>{dirty=true;$('origin').textContent='Draft belum disimpan';};
async function api(route,body){const res=await fetch(`/api/${route}`,body?{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':state.token},body:JSON.stringify({...body,revision:state.revision})}:{});const data=await res.json();if(!res.ok)throw new Error(data.error);return data;}
function options(select,values,label){select.replaceChildren(...values.map(value=>{const o=document.createElement('option');o.value=value;o.textContent=label(value);return o;}));}
function refreshSlots(){
  const a=$('action').value,slots=SLOTS.filter(s=>s.split('.')[0]===a);
  $('slots').replaceChildren(...slots.map(s=>{const b=document.createElement('button');b.className=`slot ${state.document.characters[id()]?.[s]?'custom':''} ${s===slot()?'selected':''}`;b.textContent=names[s.split('.')[1]]??names[s];b.onclick=()=>{if(s.includes('.'))$('direction').value=s.split('.')[1];void loadSlot();};return b;}));
  const custom=Object.keys(state.document.characters[id()]??{});$('summary').textContent=`${state.roster.find(r=>r.id===id()).team==='red'?'Tim Merah':'Tim Hijau'} · ${custom.length}/30 slot custom`;
  options($('copySource'),custom,s=>`${names[s.split('.')[0]]} ${names[s.split('.')[1]]??''}`);
}
function settings(){numeric.forEach(k=>{$(k).value=clip?.[k]??'';});['loop','mirror'].forEach(k=>{$(k).checked=clip?.[k]??false;});$('settings').disabled=!clip;$('save').disabled=!clip;$('frame').max=String((clip??legacy)?.frames.length-1||0);}
async function loadImage(src){const i=new Image();i.src=src;await i.decode();return i;}
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
  if(dirty&&!confirm('Buang draft slot yang belum disimpan?')){const [oldId,oldSlot]=selection.split('/');$('character').value=oldId;$('action').value=oldSlot.split('.')[0];if(oldSlot.includes('.'))$('direction').value=oldSlot.split('.')[1];return;}
  selection=next;dirty=false;uploaded=[];$('files').value='';$('fileNames').textContent='';
  $('direction').disabled=!['run','tag','parkour'].includes($('action').value);refreshSlots();
  $('title').textContent=`${state.roster.find(r=>r.id===id()).name} · ${names[$('action').value]} ${$('direction').disabled?'':names[$('direction').value]}`;
  clip=structuredClone(state.document.characters[id()]?.[slot()]??null);legacy=null;image=null;frame=0;start=performance.now();settings();
  const ticket=++requestId;
  try {
    const fallback=clip?null:await legacyClip(id(),slot());
    const source=clip??fallback,loaded=await loadImage('/'+source.asset);
    if(ticket!==requestId)return;legacy=fallback;image=loaded;settings();
    $('origin').textContent=clip?'Sprite custom tersimpan':'Sprite lama · ilustrasi atlas';
    message(clip?'Siap mengedit slot ini.':'Slot ini tetap memakai animasi game saat ini. Preview atlas lama hanya referensi; Uji game memakai renderer yang sebenarnya.');
  }catch(e){if(ticket===requestId)message(e.message);}
}
async function save(){if(!clip)throw new Error('Proses upload atau salin slot terlebih dahulu.');const result=await api('save',{id:id(),slot:slot(),clip});Object.assign(state,result);dirty=false;refreshSlots();$('origin').textContent='Sprite custom tersimpan';message('Slot disimpan. Slot/karakter lain tidak berubah.');}
async function job(publish){if(dirty)await save();await api(publish?'publish':'build',{});message('Memulai…');
  const poll=setInterval(async()=>{try{const result=await api('job');message(result.message);if(result.status!=='running'){clearInterval(poll);if(result.url){$('gameLink').href=result.url;$('gameLink').hidden=false;}}}catch(e){clearInterval(poll);message(e.message);}},2000);
}
const safe=fn=>async()=>{try{await fn();}catch(e){message(e.message);}};
$('files').onchange=async()=>{uploaded=[...$('files').files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));$('fileNames').textContent=uploaded.map(f=>f.name).join('\n');if(uploaded.length>1)$('count').value=uploaded.length;};
$('compile').onclick=safe(async()=>{
  if(!uploaded.length)throw new Error('Pilih file dahulu.');
  if(uploaded.reduce((sum,f)=>sum+f.size,0)>30*1024*1024)throw new Error('Total maksimal 30 MB.');
  const files=await Promise.all(uploaded.map(f=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:f.name,data:String(reader.result).split(',')[1]});reader.onerror=reject;reader.readAsDataURL(f);})));message('Memproses frame…');
  const options={columns:+$('columns').value,rows:+$('rows').value,count:+$('count').value};
  if($('order').value.trim())options.order=$('order').value.split(',').map(v=>Number(v.trim()));
  if($('cropWidth').value||$('cropHeight').value)options.crop={left:+$('cropLeft').value,top:+$('cropTop').value,width:+$('cropWidth').value,height:+$('cropHeight').value};
  const result=await api('compile',{id:id(),slot:slot(),files,options});const previous=clip;
  clip=result.clip;if(previous)for(const k of [...numeric,'loop','mirror'])clip[k]=previous[k];
  image=await loadImage('/'+clip.asset);frame=0;start=performance.now();settings();mark();message(`${clip.frames.length} frame siap. Periksa potongan, titik kaki, dan skala sebelum Simpan slot.`);
});
$('copy').onclick=safe(async()=>{const source=state.document.characters[id()]?.[$('copySource').value];if(!source)throw new Error('Belum ada slot custom tersimpan untuk disalin.');clip=structuredClone(source);image=await loadImage('/'+clip.asset);settings();mark();message('Slot disalin sebagai draft. Atur mirror jika perlu, lalu simpan.');});
numeric.forEach(k=>{$(k).oninput=()=>{if(clip){clip[k]=+$(k).value;mark();}};});['loop','mirror'].forEach(k=>{$(k).onchange=()=>{if(clip){clip[k]=$(k).checked;mark();}};});
$('save').onclick=safe(save);$('discard').onclick=safe(async()=>{dirty=false;await loadSlot();});
$('remove').onclick=safe(async()=>{const result=await api('save',{id:id(),slot:slot(),clip:null});Object.assign(state,result);dirty=false;await loadSlot();message('Slot kembali memakai sprite lama.');});
$('publish').onclick=safe(()=>job(true));$('build').onclick=safe(()=>job(false));
for(const k of ['character','action','direction'])$(k).onchange=safe(loadSlot);
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';const c=clip??legacy;if(c)start=performance.now()-frame*1000/c.fps;};
$('restart').onclick=()=>{frame=0;start=performance.now();};
const step=n=>{playing=false;$('play').textContent='Play';const c=clip??legacy;if(c)frame=(frame+n+c.frames.length)%c.frames.length;};
$('previous').onclick=()=>step(-1);$('next').onclick=()=>step(1);$('frame').oninput=()=>{playing=false;$('play').textContent='Play';frame=+$('frame').value;};
const canvas=$('preview'),ctx=canvas.getContext('2d'),ground=new Image();ground.src='/field/kampung-map.webp';
canvas.onpointerdown=e=>{if(!clip)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,ox:clip.x,oy:clip.y};};
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
window.onbeforeunload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};
try{state=await api('state');options($('character'),state.roster.map(r=>r.id),id=>state.roster.find(r=>r.id===id).name);options($('action'),ACTIONS,a=>names[a]);options($('direction'),DIRECTIONS,d=>names[d]);await loadSlot();requestAnimationFrame(draw);}catch(e){message(e.message);}
