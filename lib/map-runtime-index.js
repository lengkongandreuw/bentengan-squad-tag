import {solidAt,flightSolidAt,waterAt,speedAt} from './map-studio-model.js';

// Build once per immutable match map. The exact shared shape/mask tests remain
// authoritative; this only removes distant objects from their candidate list.
/**
 * @typedef {import('./map-studio-model.js').MapObject} IndexedObject
 * @typedef {import('./map-studio-model.js').StudioMap} IndexedMap
 */
/** @param {IndexedObject} o @param {number} [padding] */
export function objectBounds(o, padding=0) {
  const angle=(o.rotation??0)*Math.PI/180;
  const halfW=(Math.abs(Math.cos(angle))*o.w+Math.abs(Math.sin(angle))*o.h)/2+padding;
  const halfH=(Math.abs(Math.sin(angle))*o.w+Math.abs(Math.cos(angle))*o.h)/2+padding;
  return {left:o.x+o.w/2-halfW,right:o.x+o.w/2+halfW,top:o.y+o.h/2-halfH,bottom:o.y+o.h/2+halfH};
}
/** @param {IndexedMap} map */
export function createMapQueries(map) {
  const cell=128,padding=32;
  /** @type {Map<string,IndexedObject[]>} */
  const buckets=new Map();
  /** @type {IndexedObject[]} */
  const global=[];
  /** @type {Map<string,IndexedMap>} */
  const views=new Map();
  for(const o of map.objects) {
    if(!['solid','parkour','water','bridge','slow'].includes(o.behavior))continue;
    const b=objectBounds(o,padding),x0=Math.floor(b.left/cell),x1=Math.floor(b.right/cell),y0=Math.floor(b.top/cell),y1=Math.floor(b.bottom/cell);
    if((x1-x0+1)*(y1-y0+1)>1024){global.push(o);continue;}
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
      const key=`${x},${y}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key)?.push(o);
    }
  }
  const empty={...map,objects:global};
  /** @param {number} x @param {number} y @param {number} [r] @returns {any} */
  const nearby=(x,y,r=0)=>{
    if(r>padding)return map; // No radius-dependent approximation.
    const key=`${Math.floor(x/cell)},${Math.floor(y/cell)}`;
    if(!buckets.has(key))return empty;
    if(!views.has(key))views.set(key,{...map,objects:[...(buckets.get(key)??[]),...global]});
    return views.get(key)??empty;
  };
  return {
    nearby,
    solidAt:(/** @type {number} */ x,/** @type {number} */ y,r=13,jumping=false)=>solidAt(nearby(x,y,r),x,y,r,jumping),
    flightSolidAt:(/** @type {number} */ x,/** @type {number} */ y,r=13)=>flightSolidAt(nearby(x,y,r),x,y,r),
    waterAt:(/** @type {number} */ x,/** @type {number} */ y)=>waterAt(nearby(x,y),x,y),
    speedAt:(/** @type {number} */ x,/** @type {number} */ y)=>speedAt(nearby(x,y),x,y),
  };
}
/** @param {{right:number,left:number,top:number,bottom:number}} bounds @param {{left:number,right:number,top:number,bottom:number}} view @returns {boolean} */
export function visibleBounds(bounds,view) {
  return bounds.right>=view.left&&bounds.left<=view.right&&bounds.bottom>=view.top&&bounds.top<=view.bottom;
}
