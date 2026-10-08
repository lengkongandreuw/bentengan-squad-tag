// Content IDs may change on edit/copy; simulation rules must not.
export const arenaRulesFor = map => map?.arenaRules ?? (map?.replaces === 'kanal2' ? 'kanal2' : 'standard');

// Upgrade only pristine, generated legacy footprints. A user's moved/reshaped
// collider is intentionally left alone. No source document is mutated/written.
export function prepareArenaMap(map, referenceObjects) {
  if (arenaRulesFor(map) !== 'kanal2' || map.rulesVersion === 1) return map;
  const reference = new Map(referenceObjects.map(o => [o.id, o]));
  const same = (a, b) => Math.abs(a - b) < 1e-7;
  return {...map, arenaRules: 'kanal2', rulesVersion: 1, objects: map.objects.map(o => {
    const original = reference.get(o.id);
    if (!original || o.asset || o.name !== original.name || o.behavior !== 'solid' ||
        o.shape !== original.shape || o.rotation !== 0 ||
        !['x','y','w','h'].every(k => same(o[k], original[k])) ||
        o.points.length !== original.points.length ||
        !o.points.every((p, i) => same(p.x, original.points[i].x) && same(p.y, original.points[i].y))) return o;
    return {...o, behavior: 'parkour', nativeCollision: original.nativeCollision};
  })};
}

export function kanalColliderObjects(obstacles, polygons) {
  return obstacles.flatMap((o, i) => polygons(o).map((poly, j) => {
    const x = Math.min(...poly.map(p => p[0])), y = Math.min(...poly.map(p => p[1]));
    const w = Math.max(...poly.map(p => p[0])) - x, h = Math.max(...poly.map(p => p[1])) - y;
    return {id: `obj-collider-${i}-${j}`, name: 'Batas ' + o.asset, x, y, w, h,
      shape: 'polygon', points: poly.map(p => ({x:(p[0]-x)/w, y:(p[1]-y)/h})),
      behavior:'parkour', nativeCollision:o.hidden?'rect':'bands'};
  }));
}

export function kanalPrisonWalls(prisons) {
  return Object.values(prisons).flatMap(p => {
    const thickness=Math.max(12,Math.round(Math.min(p.w,p.h)*.09));
    const gateWidth=Math.max(76,Math.round(p.w*.48)),shoulder=Math.round((p.w-gateWidth)/2);
    const wall=(x,y,w,h)=>({asset:p.floorAsset??'prisonFloor',x,y,w,h,visualW:1,visualH:1,hidden:true});
    return [wall(p.x,p.y,p.w,thickness),wall(p.x,p.y+thickness,thickness,p.h-thickness),
      wall(p.x+p.w-thickness,p.y+thickness,thickness,p.h-thickness),
      wall(p.x,p.y+p.h-thickness,shoulder,thickness),
      wall(p.x+p.w-shoulder,p.y+p.h-thickness,shoulder,thickness)];
  });
}
