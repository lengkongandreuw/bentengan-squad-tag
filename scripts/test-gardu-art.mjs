import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import sharp from 'sharp';
import {applyGarduArt} from '../modules/world/relay-map/relay-art.ts';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
import {validateMap,mapAssets,solidAt,flightSolidAt} from '../lib/map-studio-model.js';
import {createRelayWorld} from '../lib/map-events/power-relay.ts';
import art from '../config/gardu-art.json' with {type:'json'};
const withoutArt=map=>{const m=structuredClone(map);delete m.terrain;delete m.icon;for(const o of m.objects){delete o.asset;delete o.openAsset;}for(const team of ['blue','red']){delete m.bases[team].visual;delete m.prisons[team].floorVisual;delete m.prisons[team].overlayVisual;}return m;};
await test('art replacement preserves all object/structure geometry, identity, unlock slot and rules',()=>{
  const source=createGarduPrototype(),before=JSON.stringify(source),next=applyGarduArt(source,art);assert.deepEqual(withoutArt(next),withoutArt(source));assert.equal(JSON.stringify(source),before);assert(next.objects.every(o=>o.asset));assert.equal(next.objects.filter(o=>o.openAsset).length,2);assert.deepEqual(validateMap(next),next);
  for(let x=70;x<1850;x+=29)for(let y=70;y<1010;y+=29){assert.equal(solidAt(source,x,y),solidAt(next,x,y));assert.equal(solidAt(source,x,y,13,true),solidAt(next,x,y,13,true));assert.equal(flightSolidAt(source,x,y),flightSolidAt(next,x,y));}
  const runtime=createRelayWorld(next,'art');assert(runtime.queries.solidAt(805,540));runtime.relay.debugOpen();assert(!runtime.queries.solidAt(805,540));assert(!runtime.queries.flightSolidAt(805,540));
});
await test('atlas alpha/frame bounds, preload collection, texture memory and download budget remain bounded',async()=>{
  const map=applyGarduArt(createGarduPrototype(),art),assets=mapAssets(map),files=[...new Set(assets.map(a=>a.asset))];assert.equal(files.length,2);assert(assets.includes(map.objects.find(o=>o.openAsset).openAsset));
  for(const file of files){const meta=await sharp('public/'+file).metadata();if(file===art.atlas.asset)assert(meta.hasAlpha);for(const a of assets.filter(a=>a.asset===file))for(const f of a.frames){assert(f.width>0&&f.height>0&&f.x+f.width<=meta.width&&f.y+f.height<=meta.height);}}
  assert(art.decodedBytes<12*1024*1024);assert(art.bytes<2*1024*1024);
});
await test('current edited Gardu validates; historical phase08 freeze comparison is explicit opt-in',async(t)=>{
  const current=JSON.parse(await fs.readFile('config/map-studio.json'));
  const map=current.maps.find(m=>m.id==='studio-gardu-tengah');assert(map.terrain&&map.icon&&map.bases.blue.visual&&map.prisons.red.floorVisual);assert.equal(map.replaces,'pasar');validateMap(map);
  // A mutable editor document is not a golden fixture. Never reject or revert
  // later user/programmer edits merely because a private old backup still exists.
  const metadata=new Map();
  for(const asset of mapAssets(map)){
    if(!metadata.has(asset.asset))metadata.set(asset.asset,await sharp('public/'+asset.asset).metadata());
    const meta=metadata.get(asset.asset);
    for(const frame of asset.frames)assert(frame.x>=0&&frame.y>=0&&frame.width>0&&frame.height>0&&frame.x+frame.width<=meta.width&&frame.y+frame.height<=meta.height,'Current asset frames remain valid');
  }
  if(process.env.BENTENG_VERIFY_PHASE08_BASELINE!=='1'){t.diagnostic('Current editor data validated. Historical geometry freeze is opt-in; detached tests above enforce art-only preservation.');return;}
  let before;try{before=JSON.parse(await fs.readFile('.preview-admin/art-source/gardu-phase08/map-studio.before.json'));}catch(error){if(error.code!=='ENOENT')throw error;t.diagnostic('Local backup absent: geometry preservation is covered by detached fixtures; historical disk comparison not available.');return;}
  const old=before.maps.find(m=>m.id===map.id);assert.deepEqual(withoutArt(map),withoutArt(old));
  for(const m of before.maps.filter(m=>m.id!==map.id))assert.deepEqual(current.maps.find(v=>v.id===m.id),m);assert.equal(current.maps.length,before.maps.length);
});
