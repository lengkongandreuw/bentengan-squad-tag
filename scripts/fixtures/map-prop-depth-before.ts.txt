import type { FieldConfig, Obstacle } from '../world/map-data/field-types';
import type { RuntimeActor } from '../../lib/game-core/types';
import type { FieldAssetDraw } from './field-assets';
import { TAMAN_ATLAS } from '../../lib/taman-layout.js';
import { drawTamanWaterRipples, tamanDepthProfile, tamanOcclusionOpacity, tamanFadeOpacity, tamanTreeVisual } from '../../lib/taman-visuals.js';
import { pasar2OcclusionOpacity, pasar2FadeOpacity } from '../../lib/pasar2-visuals.js';

// Map-only presentation. Receives detached render actors, never simulation state.
export function createMapPropDepth(field: FieldConfig, getContext: () => CanvasRenderingContext2D, atlas: HTMLImageElement | null, drawAsset: FieldAssetDraw['drawFieldAsset']) {
  const opacity = new Map<Obstacle, number>();
  let lastTime = 0;
  return (players: RuntimeActor[], now: number, drawPlayer: (player: RuntimeActor) => void) => {
    const ctx = getContext();
    const elapsed = lastTime ? Math.min(100, now-lastTime) : 16;
    lastTime = now;
    const props = field.obstacles.filter(p => !p.hidden && !p.underlay);
    if (field.id === 'pasar') {
      const entries = [
        ...players.map(p => ({y:p.y, draw:()=>drawPlayer(p)})),
        ...props.map(p => ({y:p.y+p.h, draw:()=>{
          const alpha=pasar2FadeOpacity(opacity.get(p)??1,pasar2OcclusionOpacity(p,players),elapsed);
          opacity.set(p,alpha);
          drawAsset(ctx,p.asset,p.x+(p.w-p.visualW)/2,p.y+p.h-p.visualH,p.visualW,p.visualH,p.flip,alpha);
        }})),
      ];
      entries.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
      return;
    }
    drawTamanWaterRipples(ctx,props,now);
    const slice = (asset: Obstacle['asset'], x:number,y:number,w:number,h:number,from:number,to:number,flip=false,alpha=1) => {
      if(to<=from)return;
      ctx.save();ctx.beginPath();ctx.rect(x,from,w,to-from);ctx.clip();
      drawAsset(ctx,asset,x,y,w,h,flip,alpha);ctx.restore();
    };
    props.forEach(p=>{const d=tamanDepthProfile(p);slice(p.asset,p.x+(p.w-p.visualW)/2,d.top,p.visualW,p.visualH,d.splitY,d.bottom,p.flip);});
    Object.values(field.prisons).forEach(p=>{
      slice('parkPrisonRedOverlay',p.x,p.y,p.w,p.h,p.y+p.h*.22,p.y+p.h);
      slice('parkPrisonBlueOverlay',p.x,p.y,p.w,p.h,p.y+p.h*.87,p.y+p.h);
    });
    const entries=[
      ...players.map(p=>({y:p.y,draw:()=>drawPlayer(p)})),
      ...props.map(p=>({y:tamanDepthProfile(p).y,draw:()=>{
        const silhouette=p.asset==='parkTree'?tamanTreeVisual(atlas,TAMAN_ATLAS.assets.parkTree):null;
        const alpha=tamanFadeOpacity(opacity.get(p)??1,tamanOcclusionOpacity(p,players,silhouette),elapsed);
        opacity.set(p,alpha);
        const d=tamanDepthProfile(p);
        slice(p.asset,p.x+(p.w-p.visualW)/2,d.top,p.visualW,p.visualH,d.top,d.splitY,p.flip,alpha);
      }})),
      ...Object.values(field.prisons).flatMap(p=>[
        {y:p.y+p.h*.205,draw:()=>slice('parkPrisonRedOverlay',p.x,p.y,p.w,p.h,p.y,p.y+p.h*.22)},
        {y:p.y+p.h*.85,draw:()=>slice('parkPrisonBlueOverlay',p.x,p.y,p.w,p.h,p.y,p.y+p.h*.87)},
      ]),
    ];
    entries.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
  };
}
