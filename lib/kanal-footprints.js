// Map-only geometry. Coordinates below are fractions of the rendered sprite,
// not screen pixels. Foliage/roofs project above these grounded silhouettes.
const ellipse = (cx, cy, rx, ry, count = 20) => Array.from({ length: count }, (_, i) => {
  const angle = i * Math.PI * 2 / count;
  return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
});

export const KANAL_FOOTPRINTS = {
  kanalNusaPlanterOval: [ellipse(.5, .665, .48, .285)],
  kanalNusaPlanterLong: [[[.02,.57],[.98,.57],[.98,.90],[.02,.90]]],
  kanalNusaFountain: [[[.28,.28],[.72,.28],[.97,.43],[.97,.76],[.73,.96],[.27,.96],[.03,.76],[.03,.43]]],
  kanalNusaBarrier: [[[.01,.66],[.11,.54],[.22,.65],[.78,.65],[.89,.54],[.99,.66],[.99,.83],[.89,.96],[.78,.88],[.22,.88],[.11,.96],[.01,.83]]],
  kanalNusaForest: [[[.14,.69],[.32,.59],[.72,.59],[.94,.70],[.96,.83],[.76,.94],[.45,.97],[.15,.87]]],
  kanalNusaLantern: [[[.06,.74],[.50,.62],[.94,.74],[.94,.83],[.50,.96],[.06,.83]]],
  kanalNusaPosRonda: [[[.05,.53],[.83,.48],[.89,.72],[.65,.89],[.60,.98],[.22,.98],[.18,.86],[.05,.85]]],
  kanalNusaWarung: [[[.12,.51],[.91,.51],[.96,.86],[.76,.97],[.23,.97],[.12,.89]]],
  kanalNusaSembako: [[[.09,.46],[.75,.46],[.96,.61],[.96,.87],[.72,.87],[.70,.98],[.07,.98]]],
  kanalNusaGazebo: [[[.21,.56],[.81,.56],[.86,.84],[.71,.98],[.34,.98],[.23,.91]]],
};

/** @param {{x:number,y:number,w:number,h:number,visualW:number,visualH:number,asset:string,flip?:boolean,hidden?:boolean}} item */
export function kanalObjectPolygons(item) {
  if (item.hidden) return [[[item.x,item.y],[item.x+item.w,item.y],[item.x+item.w,item.y+item.h],[item.x,item.y+item.h]]];
  const shapes = KANAL_FOOTPRINTS[item.asset];
  if (!shapes) throw new Error(`Missing Kanal footprint: ${item.asset}`);
  const left = item.x + (item.w - item.visualW) / 2;
  const top = item.y + item.h - item.visualH;
  return shapes.map(shape => shape.map(([u,v]) => [
    left + (item.flip ? 1-u : u) * item.visualW,
    top + v * item.visualH,
  ]));
}

// Connected horizontal bands feed the existing rectangle collision system.
// Each band includes the extrema of the polygon across its whole height.
// Adjacent bands overlap slightly, eliminating rounding seams at any zoom.
export function polygonToRects(polygon, maxBandHeight = 5) {
  const minY = Math.min(...polygon.map(p => p[1]));
  const maxY = Math.max(...polygon.map(p => p[1]));
  const count = Math.max(1, Math.ceil((maxY-minY)/maxBandHeight));
  const height = (maxY-minY)/count;
  const result = [];
  for (let band=0; band<count; band++) {
    const top=minY+band*height, bottom=minY+(band+1)*height;
    const xs=[];
    for(let i=0;i<polygon.length;i++) {
      const a=polygon[i], b=polygon[(i+1)%polygon.length];
      if(a[1]>=top && a[1]<=bottom) xs.push(a[0]);
      for(const y of [top,bottom]) {
        if(a[1]===b[1] || y<Math.min(a[1],b[1]) || y>Math.max(a[1],b[1])) continue;
        xs.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));
      }
    }
    if(xs.length) result.push({x:Math.min(...xs),y:top,w:Math.max(...xs)-Math.min(...xs),h:height+.05});
  }
  return result;
}

export function kanalObjectRects(item) {
  if(item.hidden) return [{x:item.x,y:item.y,w:item.w,h:item.h}];
  return kanalObjectPolygons(item).flatMap(polygon => polygonToRects(polygon));
}

export function kanalFortPolygon(base, width, height, anchorY) {
  return ellipse(base.x, base.y-anchorY+height*.705, width*.49, height*.265, 24);
}

export function pointInPolygon(x,y,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i], b=polygon[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
