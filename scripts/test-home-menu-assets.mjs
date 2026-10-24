import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import sharp from 'sharp';
const sources={actions:'tombol benteng luar.png',play:'play button.png',backplate:'alas 2.png',custom:'customroom.png',online:'online squad tombol.png',campaign:'campaign1.png',heading:'selectmode2.png',back:'tombolback.png',logo:'judul benteng baru.png'};
void test('all nine supplied menu assets preserve dimensions, visible pixels and alpha losslessly',async()=>{
 for(const [key,file]of Object.entries(sources)){
  const source=await sharp(`asset-inbox/2026-10-23-home-menu/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const runtime=await sharp(`public/ui-v2/home-menu/${key}.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(runtime.info,source.info,key);let alphaChanges=0,visibleChanges=0;
  for(let i=0;i<source.data.length;i+=4){
   if(source.data[i+3]!==runtime.data[i+3])alphaChanges++;
   if(source.data[i+3]>0)for(let c=0;c<3;c++)if(source.data[i+c]!==runtime.data[i+c])visibleChanges++;
  }
  assert.equal(alphaChanges,0,`${key} alpha`);assert.equal(visibleChanges,0,`${key} artwork`);
 }
});
void test('lossless runtime menu package is smaller than PNG originals and below3MiB',async()=>{
 let originals=0,runtime=0;
 for(const [key,file]of Object.entries(sources)){
  originals+=(await stat(`asset-inbox/2026-10-23-home-menu/${file}`)).size;
  runtime+=(await stat(`public/ui-v2/home-menu/${key}.webp`)).size;
 }
 assert(runtime<originals*.65);assert(runtime<3*1024*1024);
});
