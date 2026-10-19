import {spritePlacement} from './sprite-studio-model.js';
/** Resolve read-only local draft > saved direction > action default > legacy. */
export function comparisonSource(characters,drafts,character,slot){
  const saved=characters[character]??{},pending=drafts[character]??{},action=slot.split('.')[0];
  for(const key of new Set([slot,action])){
    const staged=Object.hasOwn(pending,key),clip=staged?pending[key].clip:saved[key];
    if(clip)return {clip,slot:key,source:staged?'draft':key===slot?'saved':'inherited'};
  }
  return {clip:null,slot,source:'legacy'};
}
/** Same world units, zoom and foot baseline; never normalize each character to fit. */
export function comparisonGeometry(clip,frame,visualScale,zoom,baseX,baseY){
  const p=spritePlacement(clip,frame,74*visualScale);
  const x=clip.mirror?clip.x-p.width*(1-clip.pivotX):p.x;
  return {width:p.width,height:p.height,x:baseX+x*zoom,y:baseY+p.y*zoom,screenWidth:p.width*zoom,screenHeight:p.height*zoom,baseX,baseY,zoom};
}
