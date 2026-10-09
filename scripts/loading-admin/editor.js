const $=id=>document.getElementById(id);
let state,pending=null,objectUrl=null,busy=false,generation=0;
let playing=false,progressStart=0,animationFrame=0;
const message=text=>$('message').textContent=text;
function buttons(){ $('save').disabled=busy||!pending;const own=state?.document.slots[$('slot').value];$('reset').disabled=busy||!own;$('save-fit').disabled=busy||!own;for(const id of ['slot','file','fit','reload'])$(id).disabled=busy; }
function release(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;pending=null;$('file').value='';generation++;}
function current(){const slot=$('slot').value;return state.document.slots[slot]||(slot.startsWith('match:')?state.document.slots.match:null);}
function builtin(){const slot=$('slot').value;return state.builtinPreviews[slot==='match'?$('arena').value:slot]??{label:'Memuat aset…'};}
function drawPane(container,fallback,entry,url,built){
  for(const video of container.querySelectorAll('video'))video.pause();container.replaceChildren();container.className='preview-media '+(entry?.fit??built.fit??'cover');fallback.textContent=built.label??'Memuat aset…';fallback.hidden=Boolean(entry||built.asset);
  const add=(kind,src)=>{const element=document.createElement(kind==='video'?'video':'img');element.src=src;if(kind==='video'){element.autoplay=true;element.muted=true;element.loop=true;element.playsInline=true;element.preload='metadata';element.onerror=()=>element.remove();}else{element.alt='Preview media loading';element.onerror=()=>{element.remove();fallback.hidden=false;fallback.textContent='Media tidak dapat ditampilkan · '+(built.label??'Memuat aset…');};}container.append(element);};
  if(entry)add(entry.kind,url??'/'+entry.asset);
  else if(built.asset){add('image','/'+built.asset);if(built.video)add('video','/'+built.video);}
}
function progressPreview(){
  const value=Number($('percent').value),slot=$('slot').value,built=builtin(),error=$('error-preview').checked;
  $('percent-value').textContent=value+'%';
  const draft=pending||current();
  for(const [frameId,progressId,entry]of [['current-frame','current-progress',current()],['draft-frame','progress',draft?{...draft,preserveProgress:$('preserve-progress').checked}:null]]){
    const frame=$(frameId),card=$(progressId),team=built.team;
    const preserve=!entry||entry.preserveProgress===true;
    frame.hidden=!team||!preserve;
    if(team&&preserve){const milestone=team==='red'&&value<20?'00':String(value>=100?100:Math.max(20,Math.floor(value/20)*20));const src='/loading-ui/'+encodeURIComponent(`TEAM ${team==='red'?'MERAH':'HIJAU'} LOADING ${milestone}_.png`);if(frame.getAttribute('src')!==src)frame.src=src;}
    card.hidden=Boolean(team&&preserve&&!error)||slot==='boot';card.querySelector('b').textContent=error?'GAGAL MEMUAT · COBA LAGI':built.label??'MEMUAT ASET…';card.querySelector('progress').value=value;
    card.querySelector('span').textContent=(slot==='profile'||slot.startsWith('multiplayer'))?'Status koneksi/panel · simulasi':`${value}% · simulasi`;
  }
}
function render(){
  if(state.modeSlot!==$('slot').value||state.modeRevision!==state.revision){$('preserve-progress').checked=current()?current().preserveProgress===true:$('slot').value.startsWith('character-');state.modeSlot=$('slot').value;state.modeRevision=state.revision;}
  $('preserve-row').hidden=!$('slot').value.startsWith('character-');
  const slot=$('slot').value,entry=current(),built=builtin(),next=pending?{...pending,fit:$('fit').value}:entry?{...entry,fit:$('fit').value}:null;
  drawPane($('current-media'),$('current-fallback'),entry,null,built);drawPane($('media'),$('fallback'),next,pending?objectUrl:null,built);
  const source=state.document.slots[slot]?'Override tersimpan':entry?'Mengikuti loading match default':'Media bawaan game';
  $('current-source').textContent=source;$('draft-source').textContent=pending?'File baru · '+pending.name:entry&&entry.fit!==$('fit').value?'Perubahan ukuran tampilan · belum disimpan':'Belum ada perubahan media';
  $('status').textContent=pending?'DRAFT · belum disimpan':state.document.slots[slot]?'TERSIMPAN LOKAL · bukan status publish':entry?'MENGIKUTI LOADING MATCH DEFAULT':'BAWAAN GAME';
  $('details').textContent=pending?`${pending.name} · ${(pending.file.size/1024/1024).toFixed(2)} MB`:(entry?.asset??'Belum ada file pengganti.');$('arena').disabled=slot!=='match';progressPreview();buttons();
}
async function reload(){const response=await fetch('/api/state');if(!response.ok)throw new Error('Panel gagal memuat konfigurasi.');const previous=$('slot').value;state=await response.json();$('slot').replaceChildren();$('arena').replaceChildren();for(const [value,label]of Object.entries(state.slots)){const option=new Option(label,value);$('slot').append(option);if(value.startsWith('match:'))$('arena').append(new Option(label,value));}if(previous&&state.slots[previous])$('slot').value=previous;release();$('fit').value=current()?.fit??'cover';render();}
async function save(route){if(busy)return;busy=true;buttons();message('Menyimpan…');try{const response=await fetch(route,{method:'POST',headers:{'X-Admin-Token':state.token,'X-Revision':state.revision,'X-Loading-Slot':$('slot').value,'X-Media-Fit':$('fit').value,'X-Media-Kind':pending?.kind??'image','X-Preserve-Progress':String($('slot').value.startsWith('character-')&&$('preserve-progress').checked)},body:route==='/api/upload'?pending.file:undefined});const data=await response.json();if(!response.ok)throw new Error(data.error);state={...state,...data};release();$('fit').value=current()?.fit??'cover';render();message('Tersimpan lokal. Reload game untuk melihat perubahan. Belum dipublish ke GitHub.');}catch(error){message(error.message);}finally{busy=false;buttons();}}
$('file').onchange=async()=>{
  const file=$('file').files[0];if(!file)return;release();const revision=generation;
  if(file.size>state.maxBytes){message('Upload maksimal 60 MB.');return;}
  const kind=file.type.startsWith('video/')||/\.(mp4|webm|ogv|mov)$/i.test(file.name)?'video':'image';
  objectUrl=URL.createObjectURL(file);message('Memeriksa apakah media dapat ditampilkan…');
  const probe=document.createElement(kind==='video'?'video':'img');if(kind==='video'){probe.muted=true;probe.preload='auto';}
  const supported=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),15000);const done=value=>{clearTimeout(timer);resolve(value);};probe[kind==='video'?'onloadeddata':'onload']=()=>done(true);probe.onerror=()=>done(false);probe.src=objectUrl;});
  if(revision!==generation)return;
  // Non-browser images (TIFF etc.) may still be decoded and converted safely by server.
  if(!supported&&kind==='video'){release();render();message('Video/codec tidak dapat diputar di browser ini. Konversi ke MP4 H.264 atau WebM terlebih dahulu.');return;}
  pending={file,kind,name:file.name};render();message(supported?'Preview siap. Klik Simpan media ini untuk menerapkan.':'Browser belum dapat preview format ini. Server akan mencoba mengonversi gambar ke PNG saat disimpan.');
};
$('slot').onchange=()=>{if(pending&&!confirm('Buang pilihan file yang belum disimpan?')){$('slot').value=state.selected;return;}release();state.selected=$('slot').value;$('fit').value=current()?.fit??'cover';render();message('');};
$('fit').onchange=render;$('arena').onchange=render;$('aspect').onchange=()=>{for(const id of ['preview','current-preview'])$(id).className='preview '+$('aspect').value;};
$('percent').oninput=()=>{playing=false;cancelAnimationFrame(animationFrame);$('play').textContent='Putar simulasi loading';progressPreview();};$('error-preview').onchange=progressPreview;
$('preserve-progress').onchange=()=>{progressPreview();$('draft-source').textContent=$('preserve-progress').checked?'Wallpaper saja · loading kiri bawah dipertahankan':'Ganti seluruh tampilan loading';};
function tick(now){if(!playing)return;$('percent').value=Math.min(100,Math.floor((now-progressStart)/120));progressPreview();if(Number($('percent').value)<100)animationFrame=requestAnimationFrame(tick);else{playing=false;$('play').textContent='Putar simulasi loading';}}
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Jeda simulasi':'Putar simulasi loading';if(playing){if(Number($('percent').value)>=100)$('percent').value=0;progressStart=performance.now()-Number($('percent').value)*120;animationFrame=requestAnimationFrame(tick);}else cancelAnimationFrame(animationFrame);};
$('save').onclick=()=>void save('/api/upload');$('save-fit').onclick=()=>void save('/api/fit');$('reset').onclick=()=>{if(confirm('Kembalikan slot ini ke bawaan? File lama tetap disimpan.'))void save('/api/reset');};
$('reload').onclick=()=>{if(!pending||confirm('Buang pilihan file yang belum disimpan?'))reload().then(()=>{state.selected=$('slot').value;message('Konfigurasi terbaru dimuat.');}).catch(e=>message(e.message));};
window.addEventListener('beforeunload',e=>{if(pending||busy){e.preventDefault();}});
reload().then(()=>{state.selected=$('slot').value;}).catch(e=>message(e.message));
