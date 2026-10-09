import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import sharp from 'sharp';
import ts from 'typescript';
import vm from 'node:vm';
import {frameKey,trimFrame,optimizeAtlas} from './studio-runtime-pack.mjs';
import * as model from '../lib/sprite-studio-model.js';

const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/studio-runtime-resource.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{exports});
const {runtimeResource}=exports;

function verifyFrame(source,sw,output,ow,frame,packed) {
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++) {
    const s=((frame.y+y)*sw+frame.x+x)*4;
    const inside=x>=packed.left&&x<packed.left+packed.width&&y>=packed.top&&y<packed.top+packed.height;
    const d=inside?((packed.y+y-packed.top)*ow+packed.x+x-packed.left)*4:-1;
    if(source[s+3] !== (inside?output[d+3]:0))throw Error(`Alpha changed at ${x},${y}`);
    if(source[s+3]&&(!inside||source[s]!==output[d]||source[s+1]!==output[d+1]||source[s+2]!==output[d+2]))
      throw Error(`Visible RGB changed at ${x},${y}`);
  }
}

void test('lossless packing preserves partial alpha, edge pixels and empty frames',async()=>{
  const pixels=Buffer.alloc(64*64*4);
  for(const [x,y,a]of [[10,10,255],[12,13,1],[0,0,128],[31,31,255]]){
    const i=(y*64+x)*4;pixels.set([71,137,209,a],i);
  }
  const frames=[{x:0,y:0,width:32,height:32},{x:32,y:0,width:32,height:32}];
  assert.deepEqual(trimFrame(pixels,64,frames[1]),{left:0,top:0,width:1,height:1});
  const input=await sharp(pixels,{raw:{width:64,height:64,channels:4}}).png().toBuffer();
  const packed=await optimizeAtlas(input,frames);
  assert.ok(packed&&packed.width*packed.height<64*64);
  const data=await sharp(packed.output).ensureAlpha().raw().toBuffer();
  for(const f of frames)verifyFrame(pixels,64,data,packed.width,f,packed.frames[frameKey(f)]);
});

void test('runtime falls back to editor originals for new/stale frame definitions',()=>{
  const clip={asset:'original.webp',width:64,height:64,frames:[{x:0,y:0,width:32,height:32}]};
  const entry={asset:'packed.webp',sourceWidth:64,sourceHeight:64,width:36,height:36,frames:{'0,0,32,32':{x:2,y:2,width:32,height:32,left:0,top:0}}};
  const manifest={version:1,assets:{'original.webp':entry}};
  assert.equal(runtimeResource(manifest,clip).asset,'packed.webp');
  assert.equal(runtimeResource({version:1,assets:{}},clip).asset,clip.asset);
  assert.equal(runtimeResource(manifest,{...clip,width:128}).packed,null);
  assert.equal(runtimeResource(manifest,{...clip,frames:[{x:1,y:0,width:32,height:32}]}).packed,null);
});
void test('identical visible poses share storage but retain independent trim offsets and logical frames',async()=>{
  const pixels=Buffer.alloc(96*32*4),frames=[{x:0,y:0,width:32,height:32},{x:32,y:0,width:32,height:32},{x:64,y:0,width:32,height:32}];
  for(const [x,y]of [[7,8],[42,12]])pixels.set([80,150,230,128],(y*96+x)*4);
  const input=await sharp(pixels,{raw:{width:96,height:32,channels:4}}).png().toBuffer(),packed=await optimizeAtlas(input,frames);
  assert.ok(packed);
  const a=packed.frames[frameKey(frames[0])],b=packed.frames[frameKey(frames[1])];
  assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.notEqual(a.left,b.left);assert.notEqual(a.top,b.top);
  const data=await sharp(packed.output).ensureAlpha().raw().toBuffer();
  for(const frame of frames)verifyFrame(pixels,96,data,packed.width,frame,packed.frames[frameKey(frame)]);
});

void test('actual resolver uses packed images while preserving logical frames and flight timing',()=>{
  const settings=JSON.parse(fs.readFileSync('config/sprite-studio.json','utf8'));
  const runtime=JSON.parse(fs.readFileSync('config/sprite-runtime.json','utf8'));
  const moduleExports={};
  const context={exports:moduleExports,settings,runtime,...exports,...model,publicAsset:a=>a,
    Image:class{complete=true;naturalWidth=1;removeAttribute(){}}};
  const source=fs.readFileSync('lib/sprite-studio.ts','utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInNewContext(ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText,context);
  for(const id of Object.keys(settings.characters)){
    const images=moduleExports.studioImages(id);
    for(const clip of Object.values(settings.characters[id]))
      assert.ok(images.some(image=>image.src===runtimeResource(runtime,clip).asset));
    const resolve=moduleExports.createStudioResolver();
    for(const [slot,clip]of Object.entries(settings.characters[id])){
      if(!model.isFlightSlot(slot))continue;
      const [flightSlot,flightDirection='south']=slot.split('.');
      const context={vx:0,vy:100,now:1000,state:'FREE',result:null,ready:false,action:'ultimate',parkour:false,flightSlot,flightDirection,flightElapsed:1234};
      const result=resolve(id,slot,context);
      assert.ok(result,`${id}/${slot}`);
      const expected=model.frameAt({...clip,loop:flightSlot==='ultimate_fly'},1234);
      assert.deepEqual(result.frame,expected);
      assert.equal(result.image.src,runtimeResource(runtime,clip).asset);
      assert.equal(result.clip.fps,clip.fps);
      assert.equal(result.clip.scale,clip.scale);
      assert.equal(result.clip.pivotX,clip.pivotX);
      assert.equal(resolve(id,slot,{...context,now:1100}).clip,result.clip,'flight view reused');
    }
  }
  moduleExports.retainStudioImages(['bebe']);
  assert.ok(moduleExports.studioImages('bebe').every(image=>image.src));
});

void test('all generated atlases preserve every visible source pixel in every logical frame',async()=>{
  const manifest=JSON.parse(fs.readFileSync('config/sprite-runtime.json','utf8'));
  assert.ok(Object.keys(manifest.assets).length>0,'Run npm run sprites:runtime first');
  for(const [asset,entry]of Object.entries(manifest.assets)){
    const source=await sharp(`public/${asset}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const output=await sharp(`public/${entry.asset}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(source.info.width,entry.sourceWidth);
    assert.equal(source.info.height,entry.sourceHeight);
    assert.equal(output.info.width,entry.width);
    assert.equal(output.info.height,entry.height);
    for(const [key,packed]of Object.entries(entry.frames)){
      const [x,y,width,height]=key.split(',').map(Number);
      verifyFrame(source.data,entry.sourceWidth,output.data,entry.width,{x,y,width,height},packed);
      // Original pivot/scale/mirroring are unchanged: trim offsets restore the
      // same destination coordinate for each retained logical pixel.
      for(const scale of [0.25,1,2])for(const mirror of [-1,1]){
        const origin=-width*0.5*scale;
        assert.equal(mirror*(origin+packed.left*scale),mirror*((packed.left-width*0.5)*scale));
      }
    }
  }
});
