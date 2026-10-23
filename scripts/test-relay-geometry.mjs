import test from 'node:test';
import assert from 'node:assert/strict';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
import {validateDocument,validateMap,mapIssues,solidAt,flightSolidAt,mapAssets} from '../lib/map-studio-model.js';
import {clickRoute} from '../modules/gameplay/click-navigation.ts';
import {drawRelayPrimitive,drawRelayGround,drawRelayStructure} from '../modules/world/relay-map/relay-prototype-visuals.js';

await test('phase01 geometry is detached, shape-only and uses existing Studio schema without replacing campaign',()=>{
  const map=createGarduPrototype(),before=JSON.stringify(map);assert.equal(map.width,1920);assert.equal(map.height,1080);assert.equal(map.baseRadius,68);
  assert.equal(map.enabled,false);assert.equal(map.replaces,undefined);assert.equal(map.objects.length,28);assert.deepEqual(mapIssues(map),[]);assert.deepEqual(mapAssets(map),[]);
  assert(map.objects.find(o=>o.id==='obj-relay-plaza').z<map.objects.find(o=>o.id==='obj-power-relay-node-a').z);
  for(const prison of Object.values(map.prisons))for(const object of map.objects.filter(o=>['solid','parkour'].includes(o.behavior))){
    assert(!(prison.x<object.x+object.w&&prison.x+prison.w>object.x&&prison.y<object.y+object.h&&prison.y+prison.h>object.y),'prison volume must not overlap a collider');
  }
  assert.deepEqual(validateMap(map),map);assert.deepEqual(validateDocument({version:1,maps:[map]}).maps[0],map);
  createGarduPrototype().objects[0].x=10;assert.equal(JSON.stringify(map),before);
});
await test('collision mirrors around x960 including normal, parkour and flight queries',()=>{
  const map=createGarduPrototype();
  for(let y=80;y<1040;y+=17)for(let x=34;x<1886;x+=17){
    assert.equal(solidAt(map,x,y,13),solidAt(map,1920-x,y,13));
    assert.equal(solidAt(map,x,y,13,true),solidAt(map,1920-x,y,13,true));
    assert.equal(flightSolidAt(map,x,y,13),flightSolidAt(map,1920-x,y,13));
  }
  assert.equal(1920-map.bases.blue.x,map.bases.red.x);assert.equal(1920-map.prisons.blue.x-map.prisons.blue.w,map.prisons.red.x);
});
await test('closed gates block movement, parkour, flight and straight center line; permanent routes remain clear',()=>{
  const map=createGarduPrototype(),point=(x,y,jump=false)=>solidAt(map,x,y,13,jump);
  for(const x of [805,1115]){assert(point(x,540));assert(point(x,540,true));assert(flightSolidAt(map,x,540,13));}
  const clearSegment=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);for(let i=0;i<=n;i++)assert(!point(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n));};
  for(const y of [130,960]){clearSegment(map.bases.blue,{x:150,y});clearSegment({x:150,y},{x:1770,y});clearSegment({x:1770,y},map.bases.red);}
  for(const p of Object.values(map.prisons)){clearSegment({x:p.x+p.w/2,y:960},{x:p.x+p.w/2,y:p.y+p.h/2});}
  clearSegment({x:960,y:130},{x:960,y:700});clearSegment({x:960,y:850},{x:960,y:660});
  for(const o of map.objects.filter(o=>o.id.includes('relay-parkour-'))){assert(point(o.x+o.w/2,o.y+o.h/2));assert(!point(o.x+o.w/2,o.y+o.h/2,true));}
  const route=clickRoute(map.bases.blue,map.bases.red,map.width,map.height,(x,y)=>!point(x,y),40);assert(route.length>0,'existing navigation can route around closed plaza');
});
await test('primitive rendering shares authoritative geometry and stops when final assets are provided',()=>{
  const map=createGarduPrototype(),before=JSON.stringify(map),calls=[];
  const ctx=new Proxy({globalAlpha:1},{get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),set:(target,key,value)=>{target[key]=value;return true;}});
  assert(drawRelayGround(ctx,map));for(const o of map.objects)assert(drawRelayPrimitive(ctx,o));
  for(const team of ['blue','red'])for(const kind of ['base','prison','overlay'])assert(drawRelayStructure(ctx,map,team,kind));
  assert.equal(JSON.stringify(map),before);assert(calls.some(c=>c[0]==='fillText'&&c[1]==='A'));assert(calls.some(c=>c[0]==='fillText'&&c[1]==='PRISON'));
  assert(!drawRelayPrimitive(ctx,{...map.objects[0],asset:{}}));assert(!drawRelayPrimitive(ctx,{...map.objects[0],id:'obj-unrelated'}));assert(!drawRelayGround(ctx,{...map,terrain:{}}));assert(!drawRelayStructure(ctx,{...map,bases:{...map.bases,blue:{...map.bases.blue,visual:{}}}},'blue','base'));
});
