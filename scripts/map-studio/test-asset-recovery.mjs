import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {registerMapAsset,readMapAssetLibrary} from './asset-library.mjs';
import {optimizeMapAssets} from './optimize-map-assets.mjs';
import {textureBudget} from '../studio-asset-policy.mjs';
import {mapAssets} from '../../lib/map-studio-model.js';
const empty=()=>({id:'studio-test',name:'Recovery test',description:'',enabled:false,width:1800,height:1200,terrain:null,icon:null,terrainMode:'stretch',tileSize:256,objects:[],bases:{blue:{x:200,y:600},red:{x:1600,y:600}},prisons:{blue:{x:80,y:100,w:240,h:160},red:{x:1480,y:100,w:240,h:160}}});
const object=(id,asset)=>({id:'obj-'+id,name:id,asset,x:400,y:400,w:100,h:80,rotation:17,opacity:.9,layer:'world',z:0,behavior:'solid',slow:.5,shape:'rect',points:[{x:0,y:0},{x:1,y:0},{x:1,y:1}],visible:true,locked:false,mirror:false});
async function fixture(){const base=path.join(process.cwd(),'outputs');await mkdir(base,{recursive:true});const root=await mkdtemp(path.join(base,'map-asset-recovery-'));await mkdir(path.join(root,'public/map-studio'),{recursive:true});return root;}
async function source(root,width,height,color,frames){
  const bytes=await sharp({create:{width,height,channels:4,background:color}}).webp({lossless:true}).toBuffer();
  const asset='map-studio/'+createHash('sha256').update(bytes).digest('hex')+'.webp';
  await writeFile(path.join(root,'public',asset),bytes);
  return {asset,width,height,fps:23,frames:frames??[{x:0,y:0,width,height}]};
}
void test('uploaded assets survive without a saved map and are reusable from another map',async()=>{
  const root=await fixture(),clip=await source(root,256,128,'#7766aa88');
  const first=await registerMapAsset(root,clip,'pohon.png');await registerMapAsset(root,clip,'same-source.png');
  const found=await readMapAssetLibrary(root,{maps:[]});assert.equal(found.items.length,1);assert.equal(found.items[0].key,first.key);
  const another=empty();another.id='studio-other';another.terrain=clip;
  const recovered=await readMapAssetLibrary(root,{maps:[another]});assert.equal(recovered.items.length,1);assert.equal(recovered.items[0].clip.asset,clip.asset);
  const variant={...clip,frames:[...clip.frames,...clip.frames]};assert.notEqual((await registerMapAsset(root,variant,'loop')).key,first.key,'same image may have a different animation timeline');
  const folder=path.join(root,'.preview-admin/map-assets');await writeFile(path.join(folder,'f'.repeat(64)+'.json'),'{broken');
  const partial=await readMapAssetLibrary(root,{maps:[another]});assert.equal(partial.items.length,2);assert.ok(partial.warnings.length);
});
void test('budget autofix repacks exact source pixels, frame order and FPS without geometry changes',async()=>{
  const root=await fixture(),clip=await source(root,512,512,'#ee663388',[{x:0,y:0,width:128,height:64},{x:128,y:0,width:128,height:64},{x:0,y:0,width:128,height:64}]);
  const map=empty();map.objects=[object('one',clip),object('two',clip)];const original=structuredClone(map);
  const result=await optimizeMapAssets(root,map);assert.deepEqual(map,original);
  assert.equal(result.optimization.resized,false);assert.ok(result.optimization.after<result.optimization.before);
  for(let i=0;i<map.objects.length;i++){
    const old=map.objects[i],next=result.map.objects[i];assert.deepEqual({...old,asset:null},{...next,asset:null});
    assert.equal(next.asset.fps,23);assert.equal(next.asset.frames.length,3);assert.deepEqual(next.asset.frames[0],next.asset.frames[2]);
    const a=old.asset.frames[0],b=next.asset.frames[0];
    const src=await sharp(path.join(root,'public',old.asset.asset)).extract({left:a.x,top:a.y,width:a.width,height:a.height}).ensureAlpha().raw().toBuffer();
    const dst=await sharp(path.join(root,'public',next.asset.asset)).extract({left:b.x,top:b.y,width:b.width,height:b.height}).ensureAlpha().raw().toBuffer();
    assert.ok(src.equals(dst),'visible partial-alpha pixels remain identical');
    assert.ok((await readFile(path.join(root,'public',old.asset.asset))).length,'source remains available for Undo');
  }
});
void test('over128MiB map receives modest automatic downsampling rather than deleting objects',async()=>{
  const root=await fixture(),map=empty();
  for(const [i,color]of ['#aa3333','#33aa33','#3333aa'].entries())map.objects.push(object('large'+i,await source(root,4096,3000,color)));
  assert.ok(textureBudget(mapAssets(map),'map').rgbaBytes>128*1048576);
  const original=structuredClone(map),result=await optimizeMapAssets(root,map);
  assert.deepEqual(map,original);assert.equal(result.map.objects.length,3);assert.ok(result.optimization.resized);
  assert.ok(result.optimization.after<=128*1048576);
  for(let i=0;i<3;i++)assert.deepEqual({...map.objects[i],asset:null},{...result.map.objects[i],asset:null});
  console.log(JSON.stringify({autofix:'map texture estimate, not game FPS',beforeMiB:result.optimization.before/1048576,afterMiB:result.optimization.after/1048576,objects:3}));
});
