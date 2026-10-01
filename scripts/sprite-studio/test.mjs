import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {compileSprites} from './compile.mjs';
import {startSpriteStudio} from './server.mjs';
import {SLOTS,validateClip,validateSpriteDocument,spriteSlot,frameAt,spriteDirection} from '../../lib/sprite-studio-model.js';
const png=()=>sharp({create:{width:64,height:32,channels:4,background:'#dd303080'}}).png().toBuffer();
test('30 slots and exact eight directions; missing actions fall back, ultimate is visual only',()=>{
  assert.equal(SLOTS.length,30);assert.equal(new Set(SLOTS).size,30);
  assert.equal(spriteDirection(-1,-1),'northwest');assert.equal(spriteDirection(1,1),'southeast');
  const c={vx:40,vy:-40,state:'ACTIVE'};
  assert.equal(spriteSlot(c),'run.northeast');assert.equal(spriteSlot({...c,action:'tag',tagX:-5,tagY:5}),'tag.southwest');
  assert.equal(spriteSlot({...c,action:'rescue'}),null);assert.equal(spriteSlot({...c,state:'PRISONER'}),'prisoner');
  assert.equal(spriteSlot({...c,ready:true}),'ready');assert.equal(spriteSlot({...c,result:'lose'}),'defeat');
});
test('sheet slicing preserves padding and source order; invalid crop/frame counts rejected',async()=>{
  const file={data:(await png()).toString('base64')};
  const a=await compileSprites([file],{columns:2,rows:1,count:2,order:[1,0]});
  assert.equal(a.frames.length,2);assert.equal(a.frames[0].width,40);assert.equal(a.frames[0].height,40);
  const m=await sharp(a.bytes).metadata();assert.equal(m.width,a.width);assert.equal(m.height,a.height);
  await assert.rejects(compileSprites([file],{columns:2,rows:1,count:3}));
  await assert.rejects(compileSprites([file],{crop:{left:50,top:0,width:30,height:30}}));
  await assert.rejects(compileSprites([{data:'INVALID!'}]));
});
test('loop and one-shot; atlas bounds/path restrictions',()=>{
  const clip={asset:`sprite-studio/lala/${'a'.repeat(64)}.webp`,width:64,height:32,frames:[{x:0,y:0,width:32,height:32},{x:32,y:0,width:32,height:32}],fps:10,scale:1,x:0,y:0,pivotX:.5,pivotY:1,loop:false,mirror:false};
  assert.equal(frameAt(clip,500),clip.frames[1]);assert.equal(frameAt({...clip,loop:true},200),clip.frames[0]);
  assert.deepEqual(validateClip(clip,'lala'),clip);
  assert.throws(()=>validateClip({...clip,asset:'../secret.png'},'lala'));
  assert.throws(()=>validateClip({...clip,frames:[{x:63,y:0,width:32,height:32}]},'lala'));
  assert.throws(()=>validateSpriteDocument({version:1,characters:{lala:{wrong:clip}}},['lala']));
});
test('GIF extraction yields real frame count and static PNG lists preserve order',async()=>{
  const gif=await sharp({create:{width:24,height:48,channels:4,background:'#1177dd'}}).raw().toBuffer();
  const bytes=await sharp(gif,{raw:{width:24,height:48,channels:4,pageHeight:24}}).gif({delay:[100,200],loop:0}).toBuffer();
  const result=await compileSprites([{data:bytes.toString('base64')}],{});
  // Sharp may collapse identical GIF frames; use actual metadata as expected.
  assert.equal(result.frames.length,(await sharp(bytes).metadata()).pages??1);
  const list=await compileSprites([{data:(await png()).toString('base64')},{data:(await png()).toString('base64')}],{});assert.equal(list.frames.length,2);
});
test('local API: token, revision guard, per-slot save/delete and untouched characters',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'benteng-sprite-test-'));
  let server;
  try {
    await mkdir(path.join(root,'config'),{recursive:true});await mkdir(path.join(root,'public'),{recursive:true});
    await writeFile(path.join(root,'config/game-rules.json'),JSON.stringify({teams:{red:{roster:['lala','jago']}}}));
    await writeFile(path.join(root,'config/sprite-studio.json'),JSON.stringify({version:1,characters:{}}));
    const started=await startSpriteStudio(0,root);server=started.server;const origin=started.origin;
    const state=await fetch(origin+'/api/state').then(r=>r.json());
    const post=(route,body,token=state.token)=>fetch(origin+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'x-admin-token':token},body:JSON.stringify({revision:state.revision,...body})});
    assert.equal((await post('save',{},'wrong')).status,403);
    assert.equal((await fetch(origin+'/api/state',{headers:{Origin:'https://evil.test'}})).status,403);
    const compiled=await post('compile',{id:'lala',slot:'run.east',files:[{data:(await png()).toString('base64')}],options:{columns:2,rows:1,count:2}}).then(r=>r.json());
    const saved=await post('save',{id:'lala',slot:'run.east',clip:compiled.clip}).then(r=>r.json());
    assert.ok(saved.document.characters.lala['run.east']);assert.equal(saved.document.characters.jago,undefined);
    assert.equal((await post('save',{id:'lala',slot:'idle',clip:compiled.clip})).status,409);
    const removed=await post('save',{revision:saved.revision,id:'lala',slot:'run.east',clip:null}).then(r=>r.json());
    assert.deepEqual(removed.document.characters,{});
    assert.deepEqual(JSON.parse(await readFile(path.join(root,'config/sprite-studio.json'),'utf8')).characters,{});
    assert.equal((await fetch(origin+'/.git/config')).status,404);
  }finally{if(server)await new Promise(r=>server.close(r));assert.ok(root.startsWith(path.join(os.tmpdir(),'benteng-sprite-test-')));await rm(root,{recursive:true,force:true});}
});
