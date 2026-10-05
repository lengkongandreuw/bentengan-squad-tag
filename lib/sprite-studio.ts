import settings from '../config/sprite-studio.json';
import { frameAt, spriteSlot, spriteDirection, studioSlotFallback, studioFlightSlot } from './sprite-studio-model.js';
import { publicAsset, type CharacterId } from './characters';
type Clip = {asset:string;width:number;height:number;frames:{x:number;y:number;width:number;height:number}[];fps:number;scale:number;x:number;y:number;pivotX:number;pivotY:number;loop:boolean;mirror:boolean};
const clips = settings.characters as Record<string, Record<string,Clip>>;
const images = new Map<string,HTMLImageElement>();
export function retainStudioImages(ids:readonly CharacterId[]) {
  const used=new Set(ids.flatMap(id=>Object.values(clips[id]??{}).map(c=>c.asset)));
  for(const [asset,image]of images)if(!used.has(asset)){image.removeAttribute('src');images.delete(asset);}
}
export const studioClip = (id:CharacterId,slot:string) => clips[id]?.[slot] ?? null;
export const studioFlightClip = (id:CharacterId,slot:string,direction='south') => {
  const resolved=studioFlightSlot(clips[id],slot,direction);
  return resolved?studioClip(id,resolved):null;
};
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
  return (id:CharacterId,actor:string,c:{vx:number;vy:number;now:number;state:string;result:string|null;ready:boolean;action:string|null;parkour:boolean;tagX?:number;tagY?:number;flightSlot?:string|null;flightDirection?:string;flightElapsed?:number;ultimateProgress?:number})=>{
    const previous=actors.get(actor);
    const vx=Math.hypot(c.vx,c.vy)>8?c.vx:previous?.vx??0;
    const vy=Math.hypot(c.vx,c.vy)>8?c.vy:previous?.vy??1;
    const requested=spriteSlot(c.parkour?{...c,vx,vy}:c);
    const direction=c.flightDirection??spriteDirection(vx,vy);
    const slot=c.flightSlot?studioFlightSlot(clips[id],c.flightSlot,direction):studioSlotFallback(clips[id],requested,direction);
    const start=previous&&previous.slot===slot?previous.start:c.now;
    actors.set(actor,{slot,start,vx,vy});
    const rawClip=slot?clips[id]?.[slot]:null;
    const clip=rawClip&&c.flightSlot?{...rawClip,loop:c.flightSlot==='ultimate_fly'}:rawClip;
    if(!clip) return null;
    const image=images.get(clip.asset);
    if(!image?.complete||!image.naturalWidth) return null;
    const ultimateElapsed=c.action==='ultimate' && c.ultimateProgress!==undefined
      ? Math.max(0,Math.min(1-Number.EPSILON,c.ultimateProgress))*clip.frames.length/clip.fps*1000 : c.now-start;
    return {clip,image,frame:frameAt(clip,c.flightSlot?c.flightElapsed??0:ultimateElapsed)};
  };
}
