import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {frameKey} from './studio-runtime-pack.mjs';
import {mapAssets} from '../lib/map-studio-model.js';

void test('all packed map frames preserve every visible source pixel, alpha and dimensions; decoded memory falls',async()=>{
  const manifest=JSON.parse(await fs.readFile('config/map-runtime.json'));
  const doc=JSON.parse(await fs.readFile('config/map-studio.json'));
  const frames=new Map();
  for(const m of doc.maps)for(const a of mapAssets(m)){
    if(!frames.has(a.asset))frames.set(a.asset,new Map());
    for(const f of a.frames)frames.get(a.asset).set(frameKey(f),f);
  }
  let before=0,after=0,count=0;
  for(const [asset,entry]of Object.entries(manifest.assets)){
    assert.match(entry.asset,/^map-runtime\/[a-f0-9]{64}\.webp$/);
    const source=await sharp(await fs.readFile('public/'+asset)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const packed=await sharp(await fs.readFile('public/'+entry.asset)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(source.info.width,entry.sourceWidth);assert.equal(source.info.height,entry.sourceHeight);
    assert.equal(packed.info.width,entry.width);assert.equal(packed.info.height,entry.height);
    assert.ok(entry.width*entry.height<entry.sourceWidth*entry.sourceHeight);
    for(const [key,f]of frames.get(asset)){
      const p=entry.frames[key];assert.ok(p,asset+' '+key);count++;
      for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
        const s=((f.y+y)*source.info.width+f.x+x)*4;
        const inTrim=x>=p.left&&y>=p.top&&x<p.left+p.width&&y<p.top+p.height;
        if(!inTrim){assert.equal(source.data[s+3],0);continue;}
        const target=((p.y+y-p.top)*packed.info.width+p.x+x-p.left)*4;
        assert.equal(source.data[s+3],packed.data[target+3]);
        if(source.data[s+3])for(let c=0;c<3;c++)assert.equal(source.data[s+c],packed.data[target+c],asset+' visible RGBA');
      }
    }
    before+=entry.sourceWidth*entry.sourceHeight*4;after+=entry.width*entry.height*4;
  }
  assert.ok(count>0);assert.ok(after<before);
  console.log(JSON.stringify({packedFrames:count,decodedBeforeMiB:before/1048576,decodedAfterMiB:after/1048576}));
});
