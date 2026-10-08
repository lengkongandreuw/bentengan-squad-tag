type Frame = {x:number;y:number;width:number;height:number};
export type PackedFrame = Frame & {left:number;top:number};
type Entry = {asset:string;sourceWidth:number;sourceHeight:number;width:number;height:number;frames:Record<string,PackedFrame>};
export type RuntimeManifest = {version:number;assets:Record<string,Entry>};
export const runtimeFrameKey = (f:Frame) => `${f.x},${f.y},${f.width},${f.height}`;
export function runtimeResource(manifest:RuntimeManifest,clip:{asset:string;width:number;height:number;frames:Frame[]}) {
  const entry=manifest.assets[clip.asset];
  if(manifest.version!==1||!entry||entry.sourceWidth!==clip.width||entry.sourceHeight!==clip.height||
    !clip.frames.every(f=>entry.frames[runtimeFrameKey(f)]))return {asset:clip.asset,packed:null};
  return {asset:entry.asset,packed:entry.frames};
}
