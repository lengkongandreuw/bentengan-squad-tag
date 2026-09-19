import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {hasSpriteSeries,seriesDirection,seriesFrame} from '../lib/series-animation.js';
const vectors=[[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
vectors.forEach(([x,y],i)=>assert.equal(seriesDirection(x,y),i));
assert.equal(hasSpriteSeries('jago'),false);
const input={vx:100,vy:0,now:0,sprinting:false,state:'ACTIVE',result:null,action:null,parkour:false};
for(const id of ['maria','boke']) {
  const manifest=JSON.parse(await fs.readFile(`public/characters/${id}/series.json`));
  const {data,info}=await sharp(`public/characters/${id}/series-runtime.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,1280);assert.equal(info.height,1760);
  const frames=new Set(manifest.frames.map(f=>`${f.row}:${f.column}`));
  function valid(f){assert.ok(f);assert.ok(frames.has(`${f.y/160}:${f.x/160}`));}
  for(const [vx,vy] of vectors)for(const sprinting of [false,true])for(let now=0;now<2000;now+=13)
    valid(seriesFrame(id,{...input,vx:vx*100,vy:vy*100,sprinting,now}));
  for(const state of ['ACTIVE','PRISONER'])for(let now=0;now<6000;now+=37)valid(seriesFrame(id,{...input,vx:0,state,now}));
  for(const result of ['win','lose'])valid(seriesFrame(id,{...input,result}));
  for(const [tagX,tagY] of vectors)valid(seriesFrame(id,{...input,action:'tag',tagX,tagY}));
  assert.equal(seriesFrame(id,{...input,action:'rescue'}),null);
  assert.equal(seriesFrame(id,{...input,parkour:true}),null);
  for(const f of manifest.frames) {
    let visible=0;
    for(let y=0;y<160;y++)for(let x=0;x<160;x++) {
      const a=data[((f.row*160+y)*info.width+f.column*160+x)*4+3];
      if(a>32){visible++;assert.ok(x>=3&&x<157&&y>=3&&y<157,`${id}: frame touches cut line`);}
    }
    assert.ok(visible>400,`${id}: empty/small pose`);
  }
  console.log(`${id}: ${frames.size} crops, 8 directions, sprint/idle/tag/prison/results and legacy fallback PASS`);
}
assert.equal(seriesFrame('maria',{...input,action:'tag',tagX:-1,tagY:0}).mirror,true);
assert.equal(seriesFrame('maria',{...input,action:'tag',tagX:1,tagY:0}).mirror,false);
console.log('Series animation tests PASS');
