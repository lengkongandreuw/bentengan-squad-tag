import settings from '../config/sprite-studio.json';
import { frameAt, spriteSlot, spriteDirection, studioSlotFallback } from './sprite-studio-model.js';
import { publicAsset, type CharacterId } from './characters';
type Clip = {asset:string;width:number;height:number;frames:{x:number;y:number;width:number;height:number}[];fps:number;scale:number;x:number;y:number;pivotX:number;pivotY:number;loop:boolean;mirror:boolean};
const clips = settings.characters as Record<string, Record<string,Clip>>;
const images = new Map<string,HTMLImageElement>();
export function studioImages(id:CharacterId) {
  return [...new Set(Object.values(clips[id]??{}).map(c=>c.asset))].map(asset=>{
    let image=images.get(asset);
    if(!image) { image=new Image(); image.src=publicAsset(asset); images.set(asset,image); }
    return image;
  });
}
// Restart one-shot clips only on a real visual state transition, per actor.
export function createStudioResolver() {
  const actors=new Map<string,{slot:string|null;start:number;vx:number;vy:number}>();
  return (id:CharacterId,actor:string,c:{vx:number;vy:number;now:number;state:string;result:string|null;ready:boolean;action:string|null;parkour:boolean;tagX?:number;tagY?:number})=>{
    const previous=actors.get(actor);
    const vx=Math.hypot(c.vx,c.vy)>8?c.vx:previous?.vx??0;
    const vy=Math.hypot(c.vx,c.vy)>8?c.vy:previous?.vy??1;
    const requested=spriteSlot(c.parkour?{...c,vx,vy}:c);
    const slot=studioSlotFallback(clips[id],requested,spriteDirection(vx,vy));
    const start=previous&&previous.slot===slot?previous.start:c.now;
    actors.set(actor,{slot,start,vx,vy});
    const clip=slot?clips[id]?.[slot]:null;
    if(!clip) return null;
    const image=images.get(clip.asset);
    if(!image?.complete||!image.naturalWidth) return null;
    return {clip,image,frame:frameAt(clip,c.now-start)};
  };
}
