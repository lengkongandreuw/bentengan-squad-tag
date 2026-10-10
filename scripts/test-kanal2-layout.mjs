import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { kanalObjectPolygons, kanalObjectRects, pointInPolygon } from '../modules/world/kanal-footprints.ts';
import { pointHitsExpandedRect } from '../modules/gameplay/collision-navigation.ts';

const root = path.resolve(import.meta.dirname, '..');
const source = (await readFile(path.join(root, 'modules/world/map-data/guide-fields.ts'), 'utf8')).replace(/\r\n/g,'\n');
const originalStart = source.indexOf('const kanalGuide: FieldConfig = {');
const originalEnd = source.indexOf('\n};', originalStart);
assert(originalStart >= 0 && originalEnd > originalStart, 'Nusantara 2 source layout must remain');
const original = source.slice(originalStart, originalEnd);
assert.match(source, /id: 'kanal2',\s*name: 'Alun Kanal Nusantara 2'/);
assert.match(source, /const kanalGuide: FieldConfig = \{/);
assert.match(source, /obstacles: \[\.\.\.kanalGuide\.obstacles\.map\(kanal2Item\), \.\.\.kanal2SmallPlanters\]/);
assert.match(source, /guideObstacle\('kanalNusaPlanterOval', 802, 245, 82, 20, 82, 51\)/);
assert.match(source, /guideObstacle\('kanalNusaPlanterOval', MAP4_2_GUIDE_WIDTH - 802 - 82, 245, 82, 20, 82, 51\)/);
assert.match(source, /decorations: kanalGuide\.decorations\.map\(kanal2Item\)/);

const oldWidth = 1699;
const newWidth = 2059;
const insert = 360;
const leftAnchor = 750;
const rightAnchor = 950;
const mapX = (x) => x <= leftAnchor ? x : x >= rightAnchor ? x + insert
  : x + Math.floor(insert / 2);
const mapItem = (item) => ({ ...item, x: Math.round(mapX(item.x + item.w / 2) - item.w / 2) });
assert.equal(mapX(1209) - mapX(490), (1209 - 490) + insert, 'Center bridge separation should grow');
assert(mapX(1209) - mapX(490) <= 1.51 * (1209 - 490), 'Central crossing space must stay moderate');

const originalObstacles = [...original.matchAll(/guideObstacle\('([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/g)]
  .map(([, asset, x, y, w, h, visualW, visualH]) => ({ asset, x:+x, y:+y, w:+w, h:+h, visualW:+visualW, visualH:+visualH }))
  .map(mapItem);
const addedPlanters = [802,newWidth-802-82].map(x=>({asset:'kanalNusaPlanterOval',x,y:245,w:82,h:20,visualW:82,visualH:51}));
const obstacles = [...originalObstacles,...addedPlanters];
assert(obstacles.length >= 20, `Expected all separate object sprites, parsed ${obstacles.length}`);
assert.equal(addedPlanters.length,2);
for(const planter of addedPlanters) {
  for(const neighbor of originalObstacles) {
    const dx=Math.max(planter.x-neighbor.x-neighbor.w,neighbor.x-planter.x-planter.w,0);
    const dy=Math.max(planter.y-neighbor.y-neighbor.h,neighbor.y-planter.y-planter.h,0);
    assert(Math.hypot(dx,dy)>=35,`Planter creates a narrow lane beside ${neighbor.asset}`);
  }
  const polygon=kanalObjectPolygons(planter)[0],colliders=kanalObjectRects(planter);
  const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  const rx=(Math.max(...xs)-Math.min(...xs))/2,ry=(Math.max(...ys)-Math.min(...ys))/2;
  const playerRadius=13/1.4;
  // Approach each footprint from all cardinal and diagonal directions.
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
    const from={x:cx+dx*(rx+playerRadius+8),y:cy+dy*(ry+playerRadius+8)};
    const blocked=(x,y)=>colliders.some(r=>pointHitsExpandedRect(x,y,r,playerRadius));
    assert(!blocked(from.x,from.y),'Planter collision extends into open approach');
    assert(Array.from({length:101},(_,i)=>i/100).some(t=>blocked(from.x+(cx-from.x)*t,from.y+(cy-from.y)*t)),
      `Player can enter planter from direction ${dx},${dy}`);
    for(let t=0;t<=1.1;t+=.02) {
      const x=cx+dx*(Math.max(...xs)-Math.min(...xs))*t/2;
      const y=cy+dy*(Math.max(...ys)-Math.min(...ys))*t/2;
      if(pointInPolygon(x,y,polygon))
        assert(colliders.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h),`Planter collision gap at ${x},${y}`);
    }
  }
}
const bridges = [...original.matchAll(/\{ asset: 'kanalNusaBridgeH', x: (\d+), y: (\d+), w: (\d+), h: (\d+)/g)]
  .map(([, x, y, w, h]) => mapItem({ x:+x, y:+y, w:+w, h:+h }));
assert.equal(bridges.length, 2);
const prisons = [{ x:325, y:246, w:118, h:102 }, { x:1256, y:246, w:118, h:102 }].map(mapItem);
assert.equal(prisons[0].x, 325, 'Left prison stays put');
assert.equal(prisons[1].x, 1616, 'Right prison shifts with its side');

const ground = await sharp(path.join(root, 'public/field/kanal2-ground.webp')).metadata();
const newMask = await sharp(path.join(root, 'public/field/kanal2-water-mask.png')).raw().toBuffer({ resolveWithObject:true });
assert.deepEqual([ground.width, ground.height], [newWidth*2, 926*2]);
assert.deepEqual([newMask.info.width, newMask.info.height], [Math.round(newWidth/2), 463]);
const waterAt = (x,y,layer,width) => {
  const px=Math.max(0,Math.min(layer.info.width-1,Math.round(x/width*(layer.info.width-1))));
  const py=Math.max(0,Math.min(layer.info.height-1,Math.round(y/926*(layer.info.height-1))));
  return layer.data[(py*layer.info.width+px)*layer.info.channels]>127;
};
const water = (x,y) => waterAt(x,y,newMask,newWidth);
// The dedicated Nusantara 2 mask is checked on its own; Nusantara 1 is not a
// runtime or test dependency for this map.
for (const bridge of bridges) {
  const cx=Math.round(bridge.x+bridge.w/2);
  assert.equal(water(cx,460),false,`Bridge ${cx} must be walkable`);
  assert.equal(water(cx,420),true,`Canal above bridge ${cx} must be blocked`);
  assert.equal(water(cx,505),true,`Canal below bridge ${cx} must be blocked`);
}
for (const prop of obstacles) {
  assert(prop.x>=0 && prop.x+prop.w<=newWidth,`${prop.asset} out of bounds`);
  for (let y=prop.y+3;y<prop.y+prop.h-2;y+=4)
    for(let x=prop.x+3;x<prop.x+prop.w-2;x+=4)
      assert.equal(water(x,y),false,`${prop.asset} footprint overlaps water at ${x},${y}`);
}
for (const prison of prisons) {
  const gateX=prison.x+prison.w/2;
  for(let y=prison.y+prison.h+2;y<=prison.y+prison.h+46;y+=4)
    assert.equal(water(gateX,y),false,'Prison entrance overlaps water');
}
console.log('Nusantara 2 PASS: enlarged bridge-to-bridge center, separate unscaled props, two prisons, two walkable bridges, aligned water mask.');
