// Shared visual contract: studio and game use the same frame selection and placement.
export const DIRECTIONS = ['south','southwest','west','northwest','north','northeast','east','southeast'];
export const ACTIONS = ['run','tag','parkour','idle','prisoner','ready','ultimate','victory','defeat'];
export const FLIGHT_ACTIONS = ['ultimate_takeoff','ultimate_fly','ultimate_land'];
export const SLOTS = [...ACTIONS.flatMap(a => [a,...DIRECTIONS.map(d=>`${a}.${d}`)]),...FLIGHT_ACTIONS];
export const actionsForCharacter = id => ['bebe','ciici'].includes(id)?[...ACTIONS,...FLIGHT_ACTIONS]:ACTIONS;
export const slotAllowed = (id,slot) => SLOTS.includes(slot) && (!FLIGHT_ACTIONS.includes(slot)||['bebe','ciici'].includes(id));
export const slotLoop = slot => ['run','idle','prisoner','ultimate_fly'].includes(slot.split('.')[0]);
export function studioSlotFallback(slots,slot,direction) {
  if(!slot)return null;
  const action=slot.split('.')[0],specific=slot.includes('.')?slot:`${action}.${direction}`;
  return slots?.[specific]?specific:slots?.[action]?action:null;
}
const number = (v,min,max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validateClip(clip, id) {
  if (!clip || !new RegExp(`^sprite-studio/${id}/[a-f0-9]{64}\\.webp$`).test(clip.asset ?? '')) throw new Error('Aset sprite tidak valid.');
  if (!Array.isArray(clip.frames) || !clip.frames.length || clip.frames.length>128) throw new Error('Jumlah frame 1–128.');
  if (!number(clip.width,1,4096)||!number(clip.height,1,4096)) throw new Error('Ukuran atlas tidak valid.');
  for(const f of clip.frames) if(!f || ![f.x,f.y,f.width,f.height].every(Number.isInteger)||f.x<0||f.y<0||f.width<1||f.height<1||f.x+f.width>clip.width||f.y+f.height>clip.height) throw new Error('Frame keluar dari atlas.');
  if(!number(clip.fps,1,60)||!number(clip.scale,.1,4)||!number(clip.x,-150,150)||!number(clip.y,-150,150)||!number(clip.pivotX,0,1)||!number(clip.pivotY,0,1)||typeof clip.loop!=='boolean'||typeof clip.mirror!=='boolean') throw new Error('Pengaturan animasi tidak valid.');
  return {asset:clip.asset,width:clip.width,height:clip.height,frames:clip.frames.map(f=>({x:f.x,y:f.y,width:f.width,height:f.height})),fps:clip.fps,scale:clip.scale,x:clip.x,y:clip.y,pivotX:clip.pivotX,pivotY:clip.pivotY,loop:clip.loop,mirror:clip.mirror};
}
export function validateSpriteDocument(doc, ids) {
  if(!doc||doc.version!==1||!doc.characters||typeof doc.characters!=='object'||Array.isArray(doc.characters)) throw new Error('Konfigurasi sprite tidak valid.');
  const characters={};
  for(const [id,slots] of Object.entries(doc.characters)) {
    if(!ids.includes(id)||!slots||typeof slots!=='object'||Array.isArray(slots)) throw new Error('Karakter tidak valid.');
    characters[id]={};
    for(const [slot,clip] of Object.entries(slots)) {
      if(!slotAllowed(id,slot)) throw new Error('Slot animasi tidak valid untuk karakter ini.');
      characters[id][slot]=validateClip(clip,id);
    }
  }
  return {version:1,characters};
}
export function spriteDirection(vx,vy) { return DIRECTIONS[(Math.round(Math.atan2(-vx,vy)/(Math.PI/4))+8)%8]; }
export function spriteSlot(c) {
  if(c.result) return c.result==='win'?'victory':'defeat';
  if(c.state==='PRISONER') return 'prisoner';
  if(c.flightSlot) return c.flightSlot;
  if(c.ready) return 'ready';
  if(c.action==='ultimate') return 'ultimate';
  if(c.action==='tag') return `tag.${spriteDirection(c.tagX??c.vx,c.tagY??c.vy)}`;
  if(c.action) return null; // Rescue and other mechanics retain their existing artwork.
  if(c.parkour) return `parkour.${spriteDirection(c.vx,c.vy)}`;
  return Math.hypot(c.vx,c.vy)>8?`run.${spriteDirection(c.vx,c.vy)}`:'idle';
}
export function frameAt(clip,elapsed) {
  const index=Math.max(0,Math.floor(elapsed*clip.fps/1000));
  return clip.frames[clip.loop?index%clip.frames.length:Math.min(index,clip.frames.length-1)];
}
export function spritePlacement(clip,frame,baseHeight=74) {
  const height=baseHeight*clip.scale, width=height*frame.width/frame.height;
  return {width,height,x:-width*clip.pivotX+clip.x,y:-height*clip.pivotY+clip.y};
}
