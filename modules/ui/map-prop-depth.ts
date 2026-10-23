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
  // Field geometry is immutable for the lifetime of a match. Prepare static
  // depth entries once; only actors need sorting as they move each frame.
  const props = field.obstacles.filter(p => !p.hidden && !p.underlay);
  const profiles = props.map(p => ({p, d: tamanDepthProfile(p)}));
  const prisons = Object.values(field.prisons);
  let players: RuntimeActor[] = [], elapsed = 16;
  const slice = (asset: Obstacle['asset'], x:number,y:number,w:number,h:number,from:number,to:number,flip=false,alpha=1) => {
    if(to<=from)return;
    const ctx = getContext();
    ctx.save();ctx.beginPath();ctx.rect(x,from,w,to-from);ctx.clip();
    drawAsset(ctx,asset,x,y,w,h,flip,alpha);ctx.restore();
  };
  const entries = field.id === 'pasar'
    ? props.map(p => ({y:p.y+p.h, draw:()=>{
          const alpha=pasar2FadeOpacity(opacity.get(p)??1,pasar2OcclusionOpacity(p,players),elapsed);
          opacity.set(p,alpha);
          drawAsset(getContext(),p.asset,p.x+(p.w-p.visualW)/2,p.y+p.h-p.visualH,p.visualW,p.visualH,p.flip,alpha);
        }}))
    : [
      ...profiles.map(({p,d})=>({y:d.y,draw:()=>{
        const silhouette=p.asset==='parkTree'?tamanTreeVisual(atlas,TAMAN_ATLAS.assets.parkTree):null;
        const alpha=tamanFadeOpacity(opacity.get(p)??1,tamanOcclusionOpacity(p,players,silhouette),elapsed);
        opacity.set(p,alpha);
        slice(p.asset,p.x+(p.w-p.visualW)/2,d.top,p.visualW,p.visualH,d.top,d.splitY,p.flip,alpha);
      }})),
      ...prisons.flatMap(p=>[
        {y:p.y+p.h*.205,draw:()=>slice('parkPrisonRedOverlay',p.x,p.y,p.w,p.h,p.y,p.y+p.h*.22)},
        {y:p.y+p.h*.85,draw:()=>slice('parkPrisonBlueOverlay',p.x,p.y,p.w,p.h,p.y,p.y+p.h*.87)},
      ]),
    ];
  entries.sort((a,b)=>a.y-b.y);
  const actors: RuntimeActor[] = [];
  return (nextPlayers: RuntimeActor[], now: number, drawPlayer: (player: RuntimeActor) => void) => {
    players = nextPlayers;
    elapsed = lastTime ? Math.min(100, now-lastTime) : 16;
    lastTime = now;
    if (field.id !== 'pasar') {
      drawTamanWaterRipples(getContext(),props,now);
      for(const {p,d} of profiles) slice(p.asset,p.x+(p.w-p.visualW)/2,d.top,p.visualW,p.visualH,d.splitY,d.bottom,p.flip);
      for(const p of prisons) {
        slice('parkPrisonRedOverlay',p.x,p.y,p.w,p.h,p.y+p.h*.22,p.y+p.h);
        slice('parkPrisonBlueOverlay',p.x,p.y,p.w,p.h,p.y+p.h*.87,p.y+p.h);
      }
    }
    actors.length = 0;
    for(const p of players) actors.push(p);
    actors.sort((a,b)=>a.y-b.y);
    let index = 0;
    for(const actor of actors) {
      // Actors preceded props in the old stable sort: retain that tie order.
      while(index < entries.length && entries[index].y < actor.y) entries[index++].draw();
      drawPlayer(actor);
    }
    while(index < entries.length) entries[index++].draw();
  };
}
