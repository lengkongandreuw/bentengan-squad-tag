import atlas from './pasar2-atlas.generated.json' with { type: 'json' };
import { polygonToRects, kanalFortPolygon } from '../modules/world/kanal-footprints.ts';
export const PASAR2_ATLAS=atlas.objects;
export const PASAR2_WIDTH=2100,PASAR2_HEIGHT=1050;
const box=(l,t,r,b)=>[[l,t],[r,t],[r,b],[l,b]];
const oval=(cx,cy,rx,ry)=>Array.from({length:16},(_,i)=>{
  const angle=i*Math.PI/8;return [cx+Math.cos(angle)*rx,cy+Math.sin(angle)*ry];
});
// Render anchors stay independent of collision tuning: no sprite, shadow or
// approved depth-sort baseline moves when a ground-contact outline changes.
const VISUAL_ANCHORS={map2Center:.57,map2Cart:.63,map2BarrierRed:.74,map2PlanterRed:.70,marketStallA:.57,map2Trash:.54,marketStallB:.66,marketStallC:.61,snackCart:.62,foodCart:.63,lamp:.87,plant:.71,plantFence:.72,bunting:.83};
// Sprite-local ground contacts only: roofs/flags/shadows are not solid.
export const PASAR2_FOOTPRINTS={
  map2Center:[[[.02,.79],[.98,.79],[.98,.85],[.95,.87],[.93,.92],[.77,.92],[.74,.98],[.64,.98],[.63,.94],[.26,.94],[.25,.98],[.20,.98],[.18,.93],[.03,.93]]],
  map2Cart:[[[.02,.69],[.18,.64],[.77,.64],[.80,.78],[.98,.81],[.97,.92],[.88,.96],[.80,.94],[.78,.88],[.57,.88],[.55,.96],[.43,.99],[.33,.98],[.28,.93],[.28,.85],[.07,.85],[.01,.80]]],
  map2BarrierRed:[box(.04,.80,.96,.96)],
  map2PlanterRed:[[[.02,.79],[.98,.79],[.98,.97],[.87,.97],[.87,.92],[.14,.92],[.14,.97],[.02,.97]]],
  marketStallA:[[[.02,.70],[.20,.65],[.77,.61],[.78,.64],[.97,.62],[.98,.70],[.93,.75],[.86,.76],[.85,.84],[.76,.87],[.73,.85],[.35,.94],[.32,.99],[.26,.99],[.23,.95],[.23,.82],[.12,.83],[.02,.80]]],
  map2Trash:[[[.02,.72],[.98,.72],[.98,.88],[.92,.88],[.91,.96],[.85,.97],[.84,.94],[.40,.94],[.39,.98],[.34,.98],[.34,.94],[.17,.95],[.10,.92],[.10,.89],[.02,.87]]],
  marketStallB:[box(.02,.79,.98,.97)],
  marketStallC:[[[.01,.75],[.17,.70],[.82,.70],[.85,.75],[.99,.75],[.98,.90],[.86,.92],[.84,.89],[.80,.89],[.80,.98],[.75,.98],[.75,.93],[.27,.93],[.27,.98],[.21,.98],[.21,.96],[.15,.95],[.03,.96],[.01,.91]]],
  snackCart:[[[.02,.73],[.98,.73],[.98,.92],[.81,.92],[.81,.97],[.75,.97],[.75,.94],[.27,.94],[.27,.98],[.21,.98],[.21,.95],[.02,.96]]],
  foodCart:[[[.03,.72],[.97,.72],[.93,.84],[.85,.84],[.84,.91],[.70,.95],[.63,.94],[.61,.89],[.43,.89],[.42,.98],[.36,.98],[.33,.94],[.23,.95],[.16,.90],[.15,.80],[.04,.80]]],
  lamp:[[[.17,.87],[.83,.87],[.98,.96],[.83,.99],[.16,.99],[.02,.96]]],
  plant:[[[.05,.76],[.93,.76],[.95,.87],[.85,.88],[.84,.96],[.37,.97],[.35,.99],[.12,.99],[.08,.92]]],
  plantFence:[box(.01,.72,.99,.99)],
  bunting:[box(.02,.83,.29,.99),box(.72,.83,.99,.99)],
};
const sprite=(asset,x,bottom,w)=>{
  const f=PASAR2_ATLAS.assets[asset],visualH=Math.round(w*f.height/f.width);
  const minV=VISUAL_ANCHORS[asset]??0;
  const h=Math.ceil(visualH*(1-minV));
  return {asset,x,y:bottom-h,w,h,visualW:w,visualH};
};
export const PASAR2_PROPS=[
  // Strong, connected central selling cluster, framed by short low dividers.
  sprite('map2Center',950,590,200),
  sprite('marketStallB',738,590,216),sprite('marketStallB',1146,590,216),
  sprite('map2Trash',985,675,130),
  ...[805,1195].flatMap(x=>[sprite('map2BarrierRed',x,450,100),sprite('map2BarrierRed',x,700,100)]),
  ...[825,1130].map(x=>sprite('map2PlanterRed',x,355,145)),
  ...[805,1150].map(x=>sprite('map2PlanterRed',x,800,145)),
  sprite('marketStallA',605,470,110),sprite('snackCart',1385,470,120),
  sprite('map2Trash',555,690,125),sprite('map2Trash',1420,690,125),
  sprite('marketStallA',735,290,85),sprite('map2Cart',1280,290,100),
  sprite('snackCart',340,850,155),sprite('map2Cart',1605,850,155),
  sprite('marketStallA',695,875,85),sprite('foodCart',1285,875,100),
  // Peripheral kiosks/potted groups frame the open base and prison approaches.
  sprite('marketStallC',35,350,120),sprite('snackCart',1945,350,120),
  sprite('marketStallC',35,815,120),sprite('marketStallC',1945,815,120),
  sprite('marketStallC',990,230,120),
  ...[175,650,1360,1835].flatMap(x=>[sprite('plant',x,135,90),sprite('plant',x,905,90)]),
  ...[65,690,1380,2005].flatMap(x=>[sprite('lamp',x,185,30),sprite('lamp',x,900,30)]),
  // Continuous bank sections. Central gaps deliberately align with the piers.
  ...[24,215,406,597,788,1120,1311,1502,1693,1884].flatMap(x=>[sprite('plantFence',x,120,192),sprite('plantFence',x,960,192)]),
  ...[200,735,1175,1695].flatMap(x=>[sprite('bunting',x,125,190),sprite('bunting',x,925,190)]),
];
// Boats decorate already blocked water. Piers are explicitly walkable decks.
export const PASAR2_DECORATIONS=[
  ...[430,1540].flatMap(x=>[sprite('canalBridgeH',x,65,125),sprite('canalBridgeH',x,1040,125)]),
  sprite('canalBridgeV',1008,140,84),sprite('canalBridgeV',1008,1050,84),
].map(p=>({...p,y:p.y+p.h-p.visualH,h:p.visualH,nonCollidable:true}));
export const PASAR2_TERRAIN_RECTS=[
  {x:0,y:0,w:1008,h:92},{x:1092,y:0,w:1008,h:92},
  {x:0,y:945,w:1008,h:105},{x:1092,y:945,w:1008,h:105},
];
export const PASAR2_PRISONS={
  blue:{x:325,y:170,w:270,h:185,floorAsset:'map2PrisonRedFloor',overlayAsset:'map2PrisonRedOverlay',flip:false},
  red:{x:1505,y:170,w:270,h:185,floorAsset:'map2PrisonGreenFloor',overlayAsset:'map2PrisonGreenOverlay',flip:false},
};
export const PASAR2_BASES={blue:{x:180,y:555},red:{x:1920,y:555}};
export const PASAR2_FORT_RECTS=Object.values(PASAR2_BASES).flatMap(base=>polygonToRects(kanalFortPolygon(base,168,188,130)));
export function pasar2ObjectPolygons(item){
  const left=item.x+(item.w-item.visualW)/2,top=item.y+item.h-item.visualH;
  return PASAR2_FOOTPRINTS[item.asset].map(poly=>poly.map(([u,v])=>[left+u*item.visualW,top+v*item.visualH]));
}
export function pasar2ObjectRects(item){return pasar2ObjectPolygons(item).flatMap(poly=>polygonToRects(poly,2));}
export function pasar2PrisonRects(prison){
  const {x,y,w,h}=prison;
  // Keep physical wall strips blocked, excluding the transparent sprite
  // margins. Front plinths and round pot bases are separate ground contacts;
  // the central stair opening is never filled by the platform/upper artwork.
  return [box(.14,.12,.86,.18),box(.13,.38,.17,.95),box(.83,.38,.87,.95),
    box(.12,.89,.36,.95),box(.65,.89,.87,.95),
    oval(.065,.84,.035,.01),oval(.935,.84,.035,.01)]
    .flatMap(poly=>polygonToRects(poly.map(([u,v])=>[x+u*w,y+v*h]),1));
}
