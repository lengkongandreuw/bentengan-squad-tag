import settings from '../config/sprite-studio.json';
import runtime from '../config/sprite-runtime.json';
import { runtimeResource, runtimeFrameKey, type RuntimeManifest, type PackedFrame } from './studio-runtime-resource';
import { frameAt, spriteSlot, spriteDirection, studioSlotFallback, studioFlightSlot } from './sprite-studio-model.js';
import { publicAsset, type CharacterId } from './characters';
type Clip = {asset:string;width:number;height:number;frames:{x:number;y:number;width:number;height:number}[];fps:number;scale:number;x:number;y:number;pivotX:number;pivotY:number;loop:boolean;mirror:boolean};
const clips = settings.characters as Record<string, Record<string,Clip>>;
const images = new Map<string,HTMLImageElement>();
const resources=new WeakMap<Clip,ReturnType<typeof runtimeResource>&{frameMap:Map<Clip['frames'][number],PackedFrame|undefined>}>();
const resource=(clip:Clip)=>{
  let entry=resources.get(clip);
  if(!entry){
    const atlas=runtimeResource(runtime as RuntimeManifest,clip);
    entry={...atlas,frameMap:new Map(clip.frames.map(frame=>[frame,atlas.packed?.[runtimeFrameKey(frame)]]))};
    resources.set(clip,entry);
  }
  return entry;
};
const flightClips=new WeakMap<Clip,{loop:Clip;once:Clip}>();
export function retainStudioImages(ids:readonly CharacterId[]) {
  const used=new Set(ids.flatMap(id=>Object.values(clips[id]??{}).map(c=>resource(c).asset)));
  for(const [asset,image]of images)if(!used.has(asset)){image.removeAttribute('src');images.delete(asset);}
}
export const studioClip = (id:CharacterId,slot:string) => clips[id]?.[slot] ?? null;
export const studioFlightClip = (id:CharacterId,slot:string,direction='south') => {
  const resolved=studioFlightSlot(clips[id],slot,direction);
  return resolved?studioClip(id,resolved):null;
};
export function studioImages(id:CharacterId) {
  return [...new Set(Object.values(clips[id]??{}).map(c=>resource(c).asset))].map(asset=>{
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
    const moving=Math.hypot(c.vx,c.vy)>8;
    const vx=moving?c.vx:previous?.vx??0;
    const vy=moving?c.vy:previous?.vy??1;
    const requested=spriteSlot(c.parkour?{...c,vx,vy}:c);
    const direction=c.flightDirection??spriteDirection(vx,vy);
    const slot=c.flightSlot?studioFlightSlot(clips[id],c.flightSlot,direction):studioSlotFallback(clips[id],requested,direction);
    const start=previous&&previous.slot===slot?previous.start:c.now;
    if(previous){previous.slot=slot;previous.start=start;previous.vx=vx;previous.vy=vy;}
    else actors.set(actor,{slot,start,vx,vy});
    const rawClip=slot?clips[id]?.[slot]:null;
    let clip=rawClip;
    if(rawClip&&c.flightSlot) {
      let variants=flightClips.get(rawClip);
      if(!variants){variants={loop:{...rawClip,loop:true},once:{...rawClip,loop:false}};flightClips.set(rawClip,variants);}
      clip=c.flightSlot==='ultimate_fly'?variants.loop:variants.once;
    }
    if(!clip) return null;
    const atlas=resource(rawClip!);
    const image=images.get(atlas.asset);
    if(!image?.complete||!image.naturalWidth) return null;
    const ultimateElapsed=c.action==='ultimate' && c.ultimateProgress!==undefined
      ? Math.max(0,Math.min(1-Number.EPSILON,c.ultimateProgress))*clip.frames.length/clip.fps*1000 : c.now-start;
    const frame=frameAt(clip,c.flightSlot?c.flightElapsed??0:ultimateElapsed);
    return {clip,image,frame,packedFrame:atlas.frameMap.get(frame)};
  };
}
