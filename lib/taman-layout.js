import bundle from './taman-atlas.generated.json' with {type:'json'};
import {polygonToRects,kanalFortPolygon} from '../modules/world/kanal-footprints.ts';
export const TAMAN_ATLAS=bundle.objects,TAMAN_WIDTH=1920,TAMAN_HEIGHT=960;
const box=(l,t,r,b)=>[[l,t],[r,t],[r,b],[l,b]];
const oval=(cx,cy,rx,ry)=>Array.from({length:24},(_,i)=>[cx+Math.cos(i*Math.PI/12)*rx,cy+Math.sin(i*Math.PI/12)*ry]);
// Enclosed pond stone/water basin + step landing. Upper foliage is visual.
const pondFootprint=[[.21,.32],[.46,.25],[.64,.30],[.71,.40],[.83,.29],[.94,.37],[.99,.59],[.99,.65],[.85,.71],[.81,.85],[.70,.94],[.46,.99],[.19,.94],[.07,.79],[.02,.62],[.08,.46]];
// UV ground contacts, not full sprite height. All positions remain world units.
export const TAMAN_FOOTPRINTS={
  parkBench:[[[.03,.64],[.97,.64],[.97,.91],[.91,.98],[.10,.98],[.03,.91]]],
  parkBarrier:[box(.02,.52,.98,.96)],
  parkLamp:[[[.20,.89],[.80,.89],[.92,.96],[.76,.99],[.22,.99],[.08,.96]]],
  parkPlanterLong:[box(.08,.68,.92,.98),box(.01,.76,.12,.98),box(.88,.76,.99,.98)],
  parkPlanter:[oval(.5,.76,.47,.22)],
  parkTree:[oval(.5,.76,.48,.225)],
  gardenMedium:[oval(.5,.645,.495,.345)],
  flowerBedSmall:[oval(.5,.635,.495,.355)],
  parkFlowerFence:[box(.02,.57,.98,.98)],
  parkCornerNW:[pondFootprint],parkCornerNE:[pondFootprint.map(([x,y])=>[1-x,y])],
  parkCornerSW:[pondFootprint],parkCornerSE:[pondFootprint.map(([x,y])=>[1-x,y])],
};
const sprite=(asset,x,bottom,w)=>{
  const f=TAMAN_ATLAS.assets[asset],visualH=asset==='parkPlanterLong'?w*f.height/f.width:Math.round(w*f.height/f.width);
  const minY=Math.min(...TAMAN_FOOTPRINTS[asset].flat().map(p=>p[1])),h=Math.ceil(visualH*(1-minY));
  return {asset,x,y:bottom-h,w,h,visualW:w,visualH};
};
export const TAMAN_PROPS=[
  sprite('flowerBedSmall',888,460,144),
  ...[685,1135].flatMap(x=>[sprite('parkBarrier',x,355,90),sprite('parkBarrier',x,525,90)]),
  ...[755,1065].flatMap(x=>[sprite('parkBench',x,285,115),sprite('parkBench',x,595,115)]),
  sprite('parkTree',490,255,145),sprite('parkTree',1285,745,145),
  ...[295,1545].flatMap(x=>[sprite('gardenMedium',x,360,80),sprite('gardenMedium',x,525,80)]),
  ...[220,1620].flatMap(x=>[sprite('gardenMedium',x,185,75),sprite('gardenMedium',x,850,75)]),
  ...[420,1490].flatMap(x=>[sprite('parkLamp',x===1490?1508:x,320,28),sprite('parkLamp',x,665,28)]),
  ...[285,1590].flatMap(x=>[sprite('parkLamp',x,195,28),sprite('parkLamp',x,820,28)]),
  ...[785,1105].flatMap(x=>[sprite('parkLamp',x,255,28),sprite('parkLamp',x,780,28)]),
  sprite('parkCornerNW',24,225,205),sprite('parkCornerNE',1691,225,205),
  sprite('parkCornerSW',24,915,205),sprite('parkCornerSE',1691,915,205),
  // Sparse low stone flower beds, with open ground between each group.
  // Individual props/colliders, never a continuous vegetation fence.
  ...[365,650,1145,1430].flatMap(x=>[
    sprite('parkPlanterLong',x,104,140),sprite('parkPlanterLong',x,916,140),
  ]),
  ...[25,1815].flatMap(x=>[sprite('gardenMedium',x,285,80),sprite('gardenMedium',x,690,80)]),
];
export const TAMAN_BASES={blue:{x:150,y:430},red:{x:1770,y:430}};
export const TAMAN_PRISONS={
  blue:{x:496.35,y:630.75,w:185.3,h:178.5,floorAsset:'parkPrisonBlueFloor',overlayAsset:'parkPrisonBlueOverlay',flip:false},
  red:{x:1290.35,y:139.75,w:185.3,h:178.5,floorAsset:'parkPrisonBlueFloor',overlayAsset:'parkPrisonBlueOverlay',flip:false},
};
// Taman-only authored interior slots scale with the building, not the actor.
// Three columns leave body-width clearance to the walls and side openings.
export const tamanPrisonSlot=(p,index)=>({x:p.x+p.w*(.22+(index%3)*.28),y:p.y+p.h*(.45+Math.floor(index/3)*.19)});
export function tamanObjectPolygons(item){
  const left=item.x+(item.w-item.visualW)/2,top=item.y+item.h-item.visualH;
  return TAMAN_FOOTPRINTS[item.asset].map(poly=>poly.map(([u,v])=>[left+u*item.visualW,top+v*item.visualH]));
}
export const tamanObjectRects=item=>tamanObjectPolygons(item).flatMap(p=>polygonToRects(p,2));
export function tamanPrisonPolygons(p){
  // Visible open sides let the unchanged RETURNING steering reach its own base.
  // Raised rail feet and posts remain solid; the paved platform is walkable.
  return [
    box(.05,.18,.30,.21),box(.70,.18,.95,.21),
    box(.30,.19,.39,.24),box(.61,.19,.70,.24),box(.39,.20,.61,.23),
    // Station feet and thin stair posts, not the tall rail/sprite rectangle.
    [[.04,.80],[.38,.80],[.38,.89],[.29,.89],[.29,.98],[.15,.98],[.04,.89]],
    [[.62,.80],[.96,.80],[.96,.89],[.85,.98],[.71,.98],[.71,.89],[.62,.89]],
    box(.34,.87,.38,.995),box(.62,.87,.66,.995),
  ].map(poly=>poly.map(([u,v])=>[p.x+u*p.w,p.y+v*p.h]));
}
export const tamanPrisonRects=p=>tamanPrisonPolygons(p).flatMap(poly=>polygonToRects(poly,2));
export const TAMAN_FORT_RECTS=Object.values(TAMAN_BASES).flatMap(b=>polygonToRects(kanalFortPolygon(b,168,188,130),2));
