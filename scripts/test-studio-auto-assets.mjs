import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {compileSprites} from './sprite-studio/compile.mjs';
import {ASSET_PROFILES,mapOptimizationProfile,textureBudget,guardBudget,preserveStudioSources} from './studio-asset-policy.mjs';
import {spritePlacement} from '../lib/sprite-studio-model.js';
import {showOptimization,showTextureBudget} from './studio-asset-feedback.js';

const file=async(width,height,color='#ee773399')=>({name:'original.png',data:(await sharp({create:{width,height,channels:4,background:color}}).png().toBuffer()).toString('base64')});
const compile=(files,profile,options={})=>compileSprites(files,options,{optimization:profile});

void test('oversized map source is resized automatically; alpha, aspect and source bytes retained',async()=>{
  const input=await file(5000,2000),before=input.data;
  const result=await compile([input],mapOptimizationProfile('object',{width:300,height:200}));
  assert.equal(input.data,before);assert.equal(result.frames.length,1);
  assert.ok(result.frames[0].width<=608);assert.ok(result.optimization.resized);
  assert.ok(result.optimization.afterRGBA<result.optimization.beforeRGBA*.1);
  const sourceRatio=5008/2008,actualRatio=result.frames[0].width/result.frames[0].height;
  assert.ok(Math.abs(actualRatio-sourceRatio)/sourceRatio<.01);
  const {data,info}=await sharp(result.bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4);const center=(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*4;
  assert.ok(Math.abs(data[center+3]-153)<=1,'partial alpha survives resize/encoding');
  assert.equal(data[3],0,'padding remains transparent');
  console.log(JSON.stringify({example:'5000x2000 map object for 300x200 placement',output:result.optimization.outputFrame,beforeRGBA:result.optimization.beforeRGBA,afterRGBA:result.optimization.afterRGBA}));
});
void test('terrain keeps a larger detail budget than props and never upscales small sources',async()=>{
  const terrain=await compile([await file(4096,2048)],mapOptimizationProfile('terrain',{width:2000,height:1500}));
  assert.ok(terrain.frames[0].width>=3000&&terrain.frames[0].width<=3072);
  assert.ok(terrain.width*terrain.height<=ASSET_PROFILES.terrain.maxAtlasPixels);
  const small=await compile([await file(80,40)],ASSET_PROFILES.object);
  assert.deepEqual(small.optimization.outputFrame,{width:88,height:48});assert.equal(small.optimization.resized,false);
  const expected=await sharp(Buffer.from((await file(80,40)).data,'base64')).ensureAlpha().raw().toBuffer();
  const restored=await sharp(small.bytes).extract({left:4,top:4,width:80,height:40}).ensureAlpha().raw().toBuffer();
  assert.ok(restored.equals(expected),'no extra pixel loss when no resizing needed');
});
void test('animation ordering and count stay intact while duplicate frames share atlas coordinates',async()=>{
  const red=await file(128,96,'#ff0000ff'),green=await file(128,96,'#00ff00ff');
  const result=await compile([red,green,red],ASSET_PROFILES.sprite);
  assert.equal(result.frames.length,3);assert.equal(result.optimization.uniqueFrames,2);
  assert.deepEqual(result.frames[0],result.frames[2]);assert.notDeepEqual(result.frames[0],result.frames[1]);
  for(const [index,channel] of [[0,0],[1,1],[2,0]]){
    const f=result.frames[index],pixel=await sharp(result.bytes).extract({left:f.x+10,top:f.y+10,width:1,height:1}).ensureAlpha().raw().toBuffer();
    assert.equal(pixel[channel],255);
  }
  const old=await compileSprites([red],{}),next=await compile([red],ASSET_PROFILES.sprite);
  const clip={scale:1.7,pivotX:.5,pivotY:1,x:5,y:-4};
  assert.deepEqual(spritePlacement(clip,next.frames[0]),spritePlacement(clip,old.frames[0]));
});
void test('packed animations automatically fit texture budgets, including dust limits',async()=>{
  const files=await Promise.all(Array.from({length:20},(_,i)=>file(400,300,`rgb(${i*10},${255-i*7},50)`)));
  const result=await compile(files,{...ASSET_PROFILES.sprite,maxAtlasPixels:350000});
  assert.equal(result.frames.length,20);assert.ok(result.width*result.height<=350000);
  assert.ok(result.width<=4096&&result.height<=4096);
  const dust=await compile([await file(1024,512)],ASSET_PROFILES.dust);
  assert.ok(dust.frames[0].width<=256);assert.ok(dust.width*dust.height<=1_048_576);
});
void test('sheet crop/reorder remains aligned and GIF frame count is not reduced',async()=>{
  const png=await file(256,128);
  const result=await compile([png],ASSET_PROFILES.sprite,{columns:2,rows:1,count:2,order:[1,0],crop:{left:10,top:10,width:90,height:80}});
  assert.equal(result.frames.length,2);assert.deepEqual(result.optimization.outputFrame,{width:98,height:88});
  const pixels=Buffer.alloc(16*32*4);pixels.fill(255,0,16*16*4);pixels.fill(80,16*16*4);
  const gif=await sharp(pixels,{raw:{width:16,height:32,channels:4,pageHeight:16}}).gif({delay:[100,200],loop:0}).toBuffer();
  const animated=await compile([{name:'motion.gif',data:gif.toString('base64')}],ASSET_PROFILES.sprite);
  assert.equal(animated.frames.length,(await sharp(gif).metadata()).pages??1);
});
void test('texture guard deduplicates shared atlases and allows unchanged/reduced legacy heavy data',()=>{
  const a={asset:'a',width:4096,height:4096},b={...a,asset:'b'};
  assert.equal(textureBudget([a,a],'character').rgbaBytes,64*1048576);
  assert.doesNotThrow(()=>guardBudget([a,b],[a,b],'character'));
  assert.doesNotThrow(()=>guardBudget([a,b],[a],'character'));
  assert.throws(()=>guardBudget([a],[a,b],'character'),/versi tersimpan belum berubah/);
  assert.throws(()=>guardBudget([],[a,b,{...a,asset:'c'}],'map'),/128/);
  assert.equal(mapOptimizationProfile('object',{width:10,height:10}).maxFrameSide,512);
  assert.deepEqual(mapOptimizationProfile('object',{width:NaN,height:3}),ASSET_PROFILES.object);
});
void test('original uploads are backed up byte-for-byte outside public asset tree',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'benteng-auto-assets-')),input=await file(20,20);
  const first=await preserveStudioSources(root,[input]),second=await preserveStudioSources(root,[input]);
  assert.deepEqual(first,second);assert.ok(first[0].path.startsWith('.preview-admin/source-imports/'));
  assert.deepEqual(await readFile(path.join(root,first[0].path)),Buffer.from(input.data,'base64'));
});
void test('feedback uses plain text, explicit estimates and non-color budget labels',()=>{
  class Element{
    children=[];dataset={};textContent='';
    constructor(tag){this.tag=tag;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(){this.children=[];}
  }
  const fakeDocument={createElement:tag=>new Element(tag)};
  const previous=globalThis.document;globalThis.document=fakeDocument;
  try{
    const host=new Element('div');
    showOptimization(host,{sourceFrame:{width:5000,height:2000},outputFrame:{width:608,height:244},frames:1,uniqueFrames:1,beforeRGBA:40000000,afterRGBA:593408,outputBytes:8000,resized:true,profile:'Objek map',sources:[{name:'<img onerror=bad>',path:'.preview-admin/source.png'}],warnings:['Periksa detail.']});
    assert.match(host.children[1].textContent,/5000 × 2000 → 608 × 244/);
    assert.equal(host.children[3].tag,'details');assert.equal(host.children[3].children[0].tag,'summary');
    assert.match(host.children[3].children[1].textContent,/bukan pengukuran RAM\/FPS/);
    assert.match(host.children[3].children[2].textContent,/<img onerror=bad>/);
    showTextureBudget(host,[{asset:'a',width:100,height:100},{asset:'a',width:100,height:100}],{warning:30000,limit:50000});
    assert.equal(host.dataset.level,'warning');assert.match(host.textContent,/Perlu perhatian · 1 tekstur unik/);
  }finally{globalThis.document=previous;}
});
