import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTerrainPatch,validateMap,solidAt,waterAt,speedAt} from '../../lib/map-studio-model.js';
import {templates} from './templates.mjs';
const {template}=await templates(process.cwd());
const asset={asset:'map-studio/'+ 'a'.repeat(64)+'.webp',width:100,height:50,frames:[{x:0,y:0,width:100,height:50}],fps:12};
void test('terrain patches use existing background decoration contract without changing geometry/identity',()=>{
  const map=structuredClone(template),before=JSON.stringify(map),patch=createTerrainPatch(map,asset,'obj-terrain-test','asphalt');
  assert.equal(JSON.stringify(map),before);assert.equal(patch.layer,'background');assert.equal(patch.behavior,'decoration');assert.equal(patch.w/patch.h,2);
  const changed=validateMap({...map,objects:[...map.objects,patch]});
  for(const key of ['terrain','bases','prisons','waterMask','id','replaces','enabled'])assert.deepEqual(changed[key],map[key]);
  for(let i=0;i<200;i++){const x=i*71%map.width,y=i*137%map.height;assert.equal(solidAt(changed,x,y,13),solidAt(map,x,y,13));assert.equal(waterAt(changed,x,y),waterAt(map,x,y));assert.equal(speedAt(changed,x,y),speedAt(map,x,y));}
  patch.asset.frames[0].width=3;assert.equal(asset.frames[0].width,100,'source asset is detached');
});
void test('patch sizing respects tall/wide frames, background order and object limits',()=>{
  const map=structuredClone(template);map.objects=[{layer:'background',z:1000}];
  const tall={...asset,width:1,height:4096,frames:[{x:0,y:0,width:1,height:4096}]};const patch=createTerrainPatch(map,tall,'obj-tall');assert.equal(patch.z,1000);assert(patch.h<=360&&patch.w>=1);
  map.objects=Array.from({length:300},()=>({}));assert.throws(()=>createTerrainPatch(map,asset,'obj-full'),/300/);
  map.objects=[];assert.throws(()=>createTerrainPatch(map,null,'obj-empty'));assert.throws(()=>createTerrainPatch(map,asset,'bad-id'));
});
