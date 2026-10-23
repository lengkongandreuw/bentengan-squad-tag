import {validateMap,type MapObject,type StudioMap} from '../../../lib/map-studio-model.js';

export const GARDU_PROTOTYPE_ID = 'studio-gardu-tengah';
export const GARDU_FUTURE_SLOT = 'pasar';

/** Independent disabled Studio draft. Gameplay Relay is local-only; slot is phase07. */
export function createGarduPrototype():StudioMap {
  const objects:MapObject[]=[];
  const add=(name:string,x:number,y:number,w:number,h:number,behavior='solid',layer='world',shape='rect')=>objects.push({
    id:`obj-${name}`,name,asset:null,x,y,w,h,behavior,layer,shape,z:0,slow:1,
    rotation:0,opacity:1,points:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],visible:true,locked:false,mirror:false,
  });
  add('relay-plaza',790,330,340,420,'decoration','background');
  objects[0].z=-1; // Floor first; A/B/C markers must remain above it.
  for(const [side,x]of [['left',790],['right',1020]] as const){
    add(`relay-wall-top-${side}`,x,330,110,30);add(`relay-wall-bottom-${side}`,x,720,110,30);
  }
  for(const [side,x]of [['west',790],['east',1100]] as const){
    add(`relay-${side}-wall-top`,x,360,30,140);add(`relay-${side}-wall-bottom`,x,580,30,140);
    add(`power-gate-${side}`,x,500,30,80);
  }
  for(const [name,y]of [['a',420],['b',540],['c',660]] as const)add(`power-relay-node-${name}`,940,y-20,40,40,'decoration','background','ellipse');
  for(const [side,x]of [['left',360],['right',1340]] as const){
    add(`relay-outer-north-${side}`,x,180,220,120);add(`relay-outer-south-${side}`,x,750,220,120);
  }
  for(const [side,x]of [['left',610],['right',1190]] as const){
    add(`relay-parkour-north-${side}`,x,275,120,26,'parkour');add(`relay-parkour-south-${side}`,x,790,120,26,'parkour');
  }
  for(const [side,x]of [['left',470],['right',1270]] as const){
    add(`relay-approach-upper-${side}`,x,430,180,36);add(`relay-approach-lower-${side}`,x,614,180,36);
  }
  // Suggested prison x220 overlapped the south block x360 by30px. Move both
  // prisons/covers outward60px, preserving mirror symmetry and30px clearance.
  add('relay-prison-cover-left',175,735,140,24,'parkour');add('relay-prison-cover-right',1605,735,140,24,'parkour');
  return validateMap({id:GARDU_PROTOTYPE_ID,name:'Gardu Tengah',description:'Prototype · Three routes · Power Relay opens the center shortcut temporarily (single-player).',width:1920,height:1080,
    enabled:false,baseRadius:68,terrain:null,icon:null,terrainMode:'stretch',tileSize:256,objects,
    bases:{blue:{x:150,y:540},red:{x:1770,y:540}},prisons:{blue:{x:160,y:790,w:170,h:120},red:{x:1590,y:790,w:170,h:120}},
  });
}
