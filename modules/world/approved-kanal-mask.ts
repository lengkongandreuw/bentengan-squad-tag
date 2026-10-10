import type { StudioMap } from '../../lib/map-studio-model.js';

type Mask = NonNullable<StudioMap['waterMask']>;
const masks = new WeakMap<HTMLImageElement,Mask>();
// Adapt the approved local PNG to the editor's existing RLE API. The editor
// document, objects, world geometry and mask querying implementation stay intact.
export function kanalMaskRows(pixels:ArrayLike<number>,width:number,height:number):Mask {
  const rows:number[][]=[];
  for(let y=0;y<height;y++) {
    const row:number[]=[];let active=false;
    for(let x=0;x<=width;x++) {
      const hit=x<width&&pixels[(y*width+x)*4]>127;
      if(hit!==active){row.push(x);active=hit;}
    }
    rows.push(row);
  }
  return {width,height,rows};
}
export function withApprovedKanalMask(map:StudioMap,image:HTMLImageElement,width:number,height:number):StudioMap {
  if(map.replaces!=='kanal'||!image.complete||!image.naturalWidth)return map;
  let mask=masks.get(image);
  if(!mask) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return map;
    ctx.drawImage(image,0,0,width,height);
    mask=kanalMaskRows(ctx.getImageData(0,0,width,height).data,width,height);
    masks.set(image,mask);
  }
  return {...map,waterMask:mask};
}
