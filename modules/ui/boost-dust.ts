import {spritePlacement} from '../../lib/sprite-studio-model.js';
import type {studioBoostDust} from '../../lib/sprite-studio';

/** Visual only: shared by both canvas renderers; no gameplay authority. */
export function drawBoostDust(ctx:CanvasRenderingContext2D,p:{x:number;y:number;vx:number;vy:number},now:number,
  legacy:HTMLImageElement,custom:ReturnType<typeof studioBoostDust>,legacyRotation:number) {
  if(!custom&&(!legacy.complete||!legacy.naturalWidth))return;
  ctx.save();ctx.globalAlpha=.58;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.translate(p.x,p.y+3);
  if(custom) {
    const {clip,frame,image,packedFrame:packed}=custom,placement=spritePlacement(clip,frame,69);
    if(custom.rotate)ctx.rotate(Math.atan2(p.vy,p.vx));
    ctx.translate(clip.x,clip.y);if(clip.mirror)ctx.scale(-1,1);
    if(packed){const sx=placement.width/frame.width,sy=placement.height/frame.height;
      ctx.drawImage(image,packed.x,packed.y,packed.width,packed.height,-placement.width*clip.pivotX+packed.left*sx,-placement.height*clip.pivotY+packed.top*sy,packed.width*sx,packed.height*sy);
    } else ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,-placement.width*clip.pivotX,-placement.height*clip.pivotY,placement.width,placement.height);
  } else {
    ctx.rotate(legacyRotation);
    ctx.drawImage(legacy,Math.floor(now/78)%4*256,0,256,192,-78,-29,92,69);
  }
  ctx.restore();
}
