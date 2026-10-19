import {frameAt,isFlightSlot,slotLoop} from '/model.js';
import {comparisonSource,comparisonGeometry} from '/lib/sprite-scale-comparison.js';
const sourceNames={draft:'draft lokal',saved:'tersimpan',inherited:'default animasi',legacy:'sprite bawaan'};
export function createScaleComparison({root,getContext,loadLegacy,loadImage}){
  root.className='scale-comparison';root.innerHTML='<div class="scale-compare-controls"><label>Bandingkan dengan<select id="scaleReference"><option value="">Tanpa pembanding</option></select></label><label>Tampilan<select id="scaleCompareMode"><option value="side">Berdampingan</option><option value="overlay">Overlay transparan</option></select></label><button type="button" id="scaleCompareClear">Hapus pembanding</button></div><p id="scaleCompareInfo" role="status" aria-live="polite">Pilih karakter lain. Pijakan, zoom, dan satuan gameplay sama; pembanding tidak diedit.</p>';
  const $=id=>root.querySelector('#'+id);let key='',rosterKey='',ticket=0,reference=null;
  const active=()=>!!reference&&$('scaleReference').value!==''&&getContext().action!=='boost_dust';
  function positions(width){return active()&&$('scaleCompareMode').value==='side'?{current:width/3,reference:width*2/3}:{current:width/2,reference:width/2};}
  async function refresh(){
    const c=getContext();if(!c.roster)return;const roster=c.roster.filter(r=>r.id!=='default'&&r.id!==c.character),listKey=c.character+'/'+roster.map(r=>r.id).join(',');
    if(listKey!==rosterKey){rosterKey=listKey;const previous=$('scaleReference').value;$('scaleReference').replaceChildren(new Option('Tanpa pembanding',''),...roster.map(r=>new Option(r.name,r.id)));if(roster.some(r=>r.id===previous))$('scaleReference').value=previous;}
    const disabled=c.action==='boost_dust'||c.character==='default';$('scaleReference').disabled=disabled;$('scaleCompareMode').disabled=disabled;$('scaleCompareClear').disabled=disabled||!$('scaleReference').value;
    if(disabled||!$('scaleReference').value){ticket++;key='';reference=null;$('scaleCompareInfo').textContent=disabled?'Perbandingan tubuh tidak tersedia untuk efek debu. Pilih animasi karakter.':'Pilih karakter lain. Pijakan dan zoom sama; pembanding hanya lihat.';return;}
    const id=$('scaleReference').value,meta=roster.find(r=>r.id===id),resolved=comparisonSource(c.characters,c.drafts,id,c.slot),next=JSON.stringify([id,c.slot,resolved]);
    if(next===key)return;key=next;const request=++ticket;reference=null;$('scaleCompareInfo').textContent=`Memuat pembanding ${meta.name}…`;
    try{const clip=resolved.clip??await loadLegacy(id,c.slot),image=await loadImage('/'+clip.asset);if(request!==ticket)return;
      reference={id,name:meta.name,visualScale:meta.visualScale??1,clip,image,source:resolved.source,slot:c.slot};
    }catch{if(request===ticket){key='';$('scaleCompareInfo').textContent='Aset/animasi pembanding belum tersedia. Pilih karakter lain; animasi aktif tetap bisa diedit.';}}
  }
  $('scaleReference').onchange=()=>{void refresh();};$('scaleCompareMode').onchange=()=>{root.dataset.mode=$('scaleCompareMode').value;};$('scaleCompareClear').onclick=()=>{$('scaleReference').value='';void refresh();};
  function draw(ctx,{width,baseY,zoom,elapsed,currentClip,currentFrame,currentScale,currentName}){
    if(!active()||!currentClip||!currentFrame)return;
    const mode=isFlightSlot(reference.slot)?{...reference.clip,loop:slotLoop(reference.slot)}:reference.clip,f=frameAt(mode,elapsed),pos=positions(width);
    const g=comparisonGeometry(reference.clip,f,reference.visualScale,zoom,pos.reference,baseY),current=comparisonGeometry(currentClip,currentFrame,currentScale,zoom,pos.current,baseY);
    ctx.save();ctx.translate(pos.reference,baseY);ctx.scale(zoom,zoom);ctx.globalAlpha=$('scaleCompareMode').value==='overlay'?.4:1;ctx.translate(reference.clip.x,reference.clip.y);if(reference.clip.mirror)ctx.scale(-1,1);
    ctx.drawImage(reference.image,f.x,f.y,f.width,f.height,-g.width*reference.clip.pivotX,-g.height*reference.clip.pivotY,g.width,g.height);ctx.strokeStyle='#80d7ff';ctx.setLineDash([3,3]);ctx.strokeRect(-g.width*reference.clip.pivotX,-g.height*reference.clip.pivotY,g.width,g.height);ctx.restore();
    ctx.save();ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#d4f790';ctx.fillText(`${currentName} · EDIT`,pos.current,baseY+26);
    ctx.fillStyle='#80d7ff';ctx.fillText(`${reference.name} · REFERENSI`,pos.reference,$('scaleCompareMode').value==='overlay'?baseY+45:baseY+26);ctx.restore();
    const clipped=[g,current].some(r=>r.x<0||r.x+r.screenWidth>width||r.y<0||r.y+r.screenHeight>ctx.canvas.height);
    const text=`${currentName}: ${current.height.toFixed(1)} px (${currentScale} × ${currentClip.scale}) · ${reference.name}: ${g.height.toFixed(1)} px (${reference.visualScale} × ${reference.clip.scale}, ${sourceNames[reference.source]}) · rasio ${(current.height/g.height*100).toFixed(1)}%. Ukuran frame, bukan siluet; tanpa auto-fit.${clipped?' Sprite keluar canvas: turunkan zoom.':''}`;
    if($('scaleCompareInfo').textContent!==text)$('scaleCompareInfo').textContent=text;
    root.dataset.currentHeight=String(current.height);root.dataset.referenceHeight=String(g.height);root.dataset.baseY=String(baseY);root.dataset.zoom=String(zoom);
    root.dataset.currentX=String(pos.current);root.dataset.referenceX=String(pos.reference);root.dataset.referenceFrame=String(reference.clip.frames.indexOf(f));
  }
  return {refresh,positions,draw,isReferenceArea(x,width){return active()&&$('scaleCompareMode').value==='side'&&x>width*.52;}};
}
