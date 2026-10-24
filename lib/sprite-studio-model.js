// Shared visual contract: studio and game use the same frame selection and placement.
export const DIRECTIONS = ['south','southwest','west','northwest','north','northeast','east','southeast'];
export const ACTIONS = ['run','tag','parkour','idle','prisoner','ready','ultimate','victory','defeat','boost_dust'];
export const BOOST_DUST_LIMITS = {maxFrames:32,maxFrameSide:512,maxAtlasPixels:4_194_304,maxInputBytes:8*1024*1024};
export const BUILTIN_BOOST_DUST = {asset:'vfx/sprint-dust.webp?v=7',width:1024,height:192,frames:Array.from({length:4},(_,i)=>({x:i*256,y:0,width:256,height:192})),fps:1000/78,scale:1,x:-32,y:5.5,pivotX:.5,pivotY:.5,loop:true,mirror:false};
/** Character direction > character default > global direction > global default.
 * @param {Record<string,Record<string,ValidClip>>} characters @param {string} id @param {string} direction
 */
export function boostDustSelection(characters,id,direction) {
  for(const owner of [id,'default'])for(const slot of [`boost_dust.${direction}`,'boost_dust']) {
    const clip=characters?.[owner]?.[slot];
    if(clip)return {clip,owner,slot,rotate:slot==='boost_dust'};
  }
  return null;
}
/** @param {ValidClip} clip */
export function validateBoostDust(clip) {
  if(clip.frames.length>BOOST_DUST_LIMITS.maxFrames||clip.frames.some(f=>f.width>BOOST_DUST_LIMITS.maxFrameSide||f.height>BOOST_DUST_LIMITS.maxFrameSide)||clip.width*clip.height>BOOST_DUST_LIMITS.maxAtlasPixels)throw new Error('Boost dust: maksimal 32 frame, sisi frame 512 px, atlas 4 juta pixel.');
  return clip;
}
export const FLIGHT_ACTIONS = ['ultimate_takeoff','ultimate_fly','ultimate_land'];
export const CAST_ACTIONS = ['ultimate_cast'];
export const SLOTS = [...ACTIONS,...FLIGHT_ACTIONS,...CAST_ACTIONS].flatMap(a => [a,...DIRECTIONS.map(d=>`${a}.${d}`)]);
/** @param {string} slot */
export const isFlightSlot = slot => FLIGHT_ACTIONS.includes(slot.split('.')[0]);
/** @param {string} id */
export const actionsForCharacter = id => id==='default'?['boost_dust']:['bebe','ciici'].includes(id)?[...ACTIONS,...FLIGHT_ACTIONS]:['robot','buto'].includes(id)?[...ACTIONS,...CAST_ACTIONS]:ACTIONS;
/** @param {string} id @param {string} slot */
export const slotAllowed = (id,slot) => SLOTS.includes(slot) && actionsForCharacter(id).includes(slot.split('.')[0]);
/** @param {string} slot */
export const slotLoop = slot => ['run','idle','prisoner','ultimate_fly','boost_dust'].includes(slot.split('.')[0]);
/**
 * @param {Record<string,unknown>|undefined|null} slots
 * @param {string|null} slot @param {string} direction @returns {string|null}
 */
export function studioSlotFallback(slots,slot,direction) {
  if(!slot)return null;
  const action=slot.split('.')[0],specific=slot.includes('.')?slot:`${action}.${direction}`;
  return slots?.[specific]?specific:slots?.[action]?action:null;
}
/**
 * @param {Record<string,unknown>|undefined|null} slots
 * @param {string} slot @param {string} direction @returns {string|null}
 */
export const studioFlightSlot = (slots,slot,direction) => studioSlotFallback(slots,slot,direction) ?? studioSlotFallback(slots,slot.split('.')[0]==='ultimate_takeoff'?'ultimate':'idle',direction);
/** Trigger-only skills never borrow rescue or the legacy ultimate loop.
 * @param {Record<string,unknown>|undefined|null} slots @param {string} direction
 */
export const studioCastSlot = (slots,direction) => studioSlotFallback(slots,'ultimate_cast',direction) ?? studioSlotFallback(slots,'idle',direction);
/** @param {unknown} v @param {number} min @param {number} max @returns {boolean} */
const number = (v,min,max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
/** @typedef {{asset?:unknown,frames?:unknown,width?:unknown,height?:unknown,fps?:unknown,scale?:unknown,x?:unknown,y?:unknown,pivotX?:unknown,pivotY?:unknown,loop?:unknown,mirror?:unknown}} RawClip */
/** @typedef {{asset:string,width:number,height:number,frames:Array<{x:number,y:number,width:number,height:number}>,fps:number,scale:number,x:number,y:number,pivotX:number,pivotY:number,loop:boolean,mirror:boolean}} ValidClip */
/** @param {RawClip} clip @param {string} id @returns {ValidClip} */
export function validateClip(clip, id) {
  if (!clip || !new RegExp(`^sprite-studio/${id}/[a-f0-9]{64}\\.webp$`).test(/** @type {string} */ (clip.asset ?? ''))) throw new Error('Aset sprite tidak valid.');
  if (!Array.isArray(clip.frames) || !clip.frames.length || clip.frames.length>128) throw new Error('Jumlah frame 1–128.');
  if (!number(clip.width,1,4096)||!number(clip.height,1,4096)) throw new Error('Ukuran atlas tidak valid.');
  for(const f of clip.frames) if(!f || ![f.x,f.y,f.width,f.height].every(Number.isInteger)||f.x<0||f.y<0||f.width<1||f.height<1||f.x+f.width>/** @type {number} */ (clip.width)||f.y+f.height>/** @type {number} */ (clip.height)) throw new Error('Frame keluar dari atlas.');
  if(!number(clip.fps,1,60)||!number(clip.scale,.1,4)||!number(clip.x,-150,150)||!number(clip.y,-150,150)||!number(clip.pivotX,0,1)||!number(clip.pivotY,0,1)||typeof clip.loop!=='boolean'||typeof clip.mirror!=='boolean') throw new Error('Pengaturan animasi tidak valid.');
  return /** @type {ValidClip} */ ({asset:clip.asset,width:clip.width,height:clip.height,frames:clip.frames.map(f=>({x:f.x,y:f.y,width:f.width,height:f.height})),fps:clip.fps,scale:clip.scale,x:clip.x,y:clip.y,pivotX:clip.pivotX,pivotY:clip.pivotY,loop:clip.loop,mirror:clip.mirror});
}
/** @param {{version?:unknown,characters?:unknown}} doc @param {string[]} ids */
export function validateSpriteDocument(doc, ids) {
  if(!doc||doc.version!==1||!doc.characters||typeof doc.characters!=='object'||Array.isArray(doc.characters)) throw new Error('Konfigurasi sprite tidak valid.');
  /** @type {Record<string,Record<string,ValidClip>>} */
  const characters={};
  for(const [id,slots] of Object.entries(doc.characters)) {
    if((!ids.includes(id)&&id!=='default')||!slots||typeof slots!=='object'||Array.isArray(slots)) throw new Error('Karakter tidak valid.');
    characters[id]={};
    for(const [slot,clip] of Object.entries(slots)) {
      if(!slotAllowed(id,slot)) throw new Error('Slot animasi tidak valid untuk karakter ini.');
      characters[id][slot]=validateClip(/** @type {RawClip} */ (clip),id);
      if(slot.split('.')[0]==='boost_dust')validateBoostDust(characters[id][slot]);
    }
  }
  return {version:1,characters};
}
/** @param {number} vx @param {number} vy @returns {string} */
export function spriteDirection(vx,vy) { return DIRECTIONS[(Math.round(Math.atan2(-vx,vy)/(Math.PI/4))+8)%8]; }
/** @param {{result?:string|null,state?:string,ready?:unknown,action?:string|null,parkour?:unknown,flightSlot?:string|null,tagX?:number,tagY?:number,vx:number,vy:number}} c @returns {string|null} */
export function spriteSlot(c) {
  if(c.result) return c.result==='win'?'victory':'defeat';
  if(c.state==='PRISONER') return 'prisoner';
  if(c.flightSlot) return c.flightSlot;
  if(c.ready) return 'ready';
  if(c.action==='ultimate') return 'ultimate';
  if(c.action==='tag') return `tag.${spriteDirection(/** @type {number} */ (c.tagX ?? c.vx),/** @type {number} */ (c.tagY ?? c.vy))}`;
  if(c.action) return null; // Rescue and other mechanics retain their existing artwork.
  if(c.parkour) return `parkour.${spriteDirection(c.vx,c.vy)}`;
  return Math.hypot(c.vx,c.vy)>8?`run.${spriteDirection(c.vx,c.vy)}`:'idle';
}
/** @param {ValidClip} clip @param {number} elapsed */
export function frameAt(clip,elapsed) {
  const index=Math.max(0,Math.floor(elapsed*clip.fps/1000));
  return clip.frames[clip.loop?index%clip.frames.length:Math.min(index,clip.frames.length-1)];
}
/** @param {ValidClip} clip @param {{width:number,height:number}} frame @param {number} [baseHeight] */
export function spritePlacement(clip,frame,baseHeight=74) {
  const height=baseHeight*clip.scale, width=height*frame.width/frame.height;
  return {width,height,x:-width*clip.pivotX+clip.x,y:-height*clip.pivotY+clip.y};
}
