import {ACTIONS,frameAt,spritePlacement} from '/model.js';
const $=id=>document.getElementById(id);
const names={run:'Lari',tag:'Tag',parkour:'Parkour',idle:'Idle',prisoner:'Tertangkap',ready:'Bersiap',ultimate:'Ultimate',victory:'Menang',defeat:'Kalah',south:'Depan',north:'Belakang',east:'Kanan',west:'Kiri',northeast:'Kanan atas',northwest:'Kiri atas',southeast:'Kanan bawah',southwest:'Kiri bawah'};
let entries=[],cards=[],playing=true,elapsed=0,last=performance.now(),generation=0;
const imageCache=new Map();
const observer=new IntersectionObserver(changes=>{for(const change of changes){const card=cards.find(c=>c.canvas===change.target);if(card)card.visible=change.isIntersecting;}},{rootMargin:'100px'});
function imageFor(asset){if(!imageCache.has(asset)){const image=new Image();image.src='/'+asset;imageCache.set(asset,image.decode().then(()=>image).catch(e=>{imageCache.delete(asset);throw e;}));}return imageCache.get(asset);}
function option(select,value,text){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
function render(){
  observer.disconnect();cards=[];const gallery=$('compareGallery');gallery.replaceChildren();
  const list=entries.filter(e=>(!$('compareCharacter').value||e.id===$('compareCharacter').value)&&(!$('compareAction').value||e.slot.split('.')[0]===$('compareAction').value));
  const zoom=+$('compareZoom').value;
  // One shared camera for all stored clips; filtering cannot silently change their size.
  let left=80,right=80,top=100,bottom=25;
  for(const e of entries)for(const f of e.clip.frames){const p=spritePlacement(e.clip,f,74*e.visualScale);const x=leftEdge(e.clip,p);left=Math.max(left,-x);right=Math.max(right,x+p.width);top=Math.max(top,-p.y);bottom=Math.max(bottom,p.y+p.height);}
  const width=Math.min(1600,Math.max(320,Math.ceil((left+right)*zoom+32))),height=Math.min(1600,Math.max(260,Math.ceil((top+bottom)*zoom+32))),baseX=Math.min(width-16,left*zoom+16),baseY=Math.min(height-16,top*zoom+16);
  $('compareStatus').textContent=entries.length?`${list.length} / ${entries.length} animasi tersimpan · zoom ${zoom}×. Klik Edit untuk menyesuaikan ukuran di editor.`:'Belum ada animasi custom yang diterapkan. Terapkan movement di Sprite Studio, lalu Muat ulang di sini.';
  for(const e of list){
    const article=document.createElement('article');article.className='comparison-card';
    const title=document.createElement('h2');title.textContent=`${e.name} · ${names[e.slot.split('.')[0]]} · ${names[e.slot.split('.')[1]]??'Default semua arah'}`;
    const viewport=document.createElement('div');viewport.className='comparison-viewport';const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.setAttribute('aria-label',title.textContent);viewport.append(canvas);
    const info=document.createElement('p'),status=document.createElement('p'),edit=document.createElement('a');edit.textContent='Edit ukuran / movement ↗';edit.href=`/?character=${encodeURIComponent(e.id)}&slot=${encodeURIComponent(e.slot)}`;edit.target='_blank';edit.rel='noreferrer';
    article.append(title,viewport,info,status,edit);gallery.append(article);
    const card={...e,canvas,ctx:canvas.getContext('2d'),info,status,image:null,visible:true,zoom,baseX,baseY};cards.push(card);observer.observe(canvas);status.textContent='Memuat aset…';
    imageFor(e.clip.asset).then(image=>{card.image=image;status.textContent='Hasil diterapkan · bukan draft';}).catch(()=>{status.textContent=`Aset gagal dimuat: ${e.clip.asset}. Coba Muat ulang.`;status.className='comparison-error';});
  }
}
async function refresh(){const ticket=++generation;$('compareStatus').textContent='Memuat konfigurasi terbaru…';try{
  const response=await fetch('/api/state');if(!response.ok)throw new Error('Panel tidak dapat membaca konfigurasi.');const state=await response.json();if(ticket!==generation)return;
  entries=state.roster.flatMap(c=>Object.entries(state.document.characters[c.id]??{}).map(([slot,clip])=>({...c,slot,clip,visualScale:c.visualScale??1})));
  const previous=$('compareCharacter').value;$('compareCharacter').replaceChildren();option($('compareCharacter'),'','Semua karakter');for(const c of state.roster)option($('compareCharacter'),c.id,c.name);$('compareCharacter').value=previous;render();
}catch(e){$('compareStatus').textContent=e.message;}}
function animate(now){if(playing&&!document.hidden)elapsed+=Math.max(0,Math.min(now-last,100))*Number($('compareSpeed').value);last=now;
  if(!document.hidden)for(const c of cards){if(!c.visible)continue;const {ctx,canvas,clip,zoom,baseX,baseY}=c;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#b8ed7c';ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(0,baseY);ctx.lineTo(canvas.width,baseY);ctx.stroke();
    ctx.strokeStyle='#ffffff65';ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(0,baseY-74*zoom);ctx.lineTo(canvas.width,baseY-74*zoom);ctx.stroke();ctx.setLineDash([]);
    if(!c.image)continue;const f=frameAt(clip,elapsed),p=spritePlacement(clip,f,74*c.visualScale);
    ctx.save();ctx.translate(baseX,baseY);ctx.scale(zoom,zoom);ctx.translate(clip.x,clip.y);if(clip.mirror)ctx.scale(-1,1);ctx.drawImage(c.image,f.x,f.y,f.width,f.height,-p.width*clip.pivotX,-p.height*clip.pivotY,p.width,p.height);ctx.strokeStyle='#ffffff50';ctx.strokeRect(-p.width*clip.pivotX,-p.height*clip.pivotY,p.width,p.height);ctx.restore();
    const x=leftEdge(clip,p),clipped=baseX+x*zoom<0||baseX+(x+p.width)*zoom>canvas.width||baseY+p.y*zoom<0||baseY+(p.y+p.height)*zoom>canvas.height;
    c.info.textContent=`Ukuran frame dunia: ${p.width.toFixed(1)} × ${p.height.toFixed(1)} · karakter ${c.visualScale}× · slot ${clip.scale}× · ${clip.frames.length} frame / ${clip.fps} FPS${clipped?' · ukuran di luar area, gunakan zoom lebih kecil':''}`;
  }requestAnimationFrame(animate);
}
function leftEdge(c,p){return c.mirror?c.x-p.width*(1-c.pivotX):p.x;}
for(const key of ['compareCharacter','compareAction','compareZoom'])$(key).onchange=render;
for(const a of ACTIONS)option($('compareAction'),a,names[a]);
$('comparePlay').onclick=()=>{playing=!playing;$('comparePlay').textContent=playing?'Pause semua':'Play semua';};$('compareRestart').onclick=()=>{elapsed=0;};$('compareRefresh').onclick=refresh;
await refresh();requestAnimationFrame(animate);
