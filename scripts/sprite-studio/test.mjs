import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {compileSprites} from './compile.mjs';
import {startSpriteStudio} from './server.mjs';
import {SLOTS,validateClip,validateSpriteDocument,spriteSlot,frameAt,spriteDirection,studioSlotFallback} from '../../lib/sprite-studio-model.js';
const png=()=>sharp({create:{width:64,height:32,channels:4,background:'#dd303080'}}).png().toBuffer();
test('all movements support default plus eight directions, preserving legacy slot keys',()=>{
  assert.equal(SLOTS.length,108);assert.equal(new Set(SLOTS).size,108);
  for(const action of ['run','tag','parkour','idle','prisoner','ready','ultimate','victory','defeat'])assert.ok(SLOTS.includes(`${action}.northeast`));
  assert.equal(studioSlotFallback({idle:true},'idle','northwest'),'idle');
  assert.equal(studioSlotFallback({idle:true,'idle.northwest':true},'idle','northwest'),'idle.northwest');
  assert.equal(studioSlotFallback({run:true},'run.east','east'),'run');
  assert.equal(studioSlotFallback({},'idle','northwest'),null);
  assert.equal(spriteDirection(-1,-1),'northwest');assert.equal(spriteDirection(1,1),'southeast');
  const c={vx:40,vy:-40,state:'ACTIVE'};
  assert.equal(spriteSlot(c),'run.northeast');assert.equal(spriteSlot({...c,action:'tag',tagX:-5,tagY:5}),'tag.southwest');
  assert.equal(spriteSlot({...c,action:'rescue'}),null);assert.equal(spriteSlot({...c,state:'PRISONER'}),'prisoner');
  assert.equal(spriteSlot({...c,ready:true}),'ready');assert.equal(spriteSlot({...c,result:'lose'}),'defeat');
});
test('sheet slicing preserves padding and source order; invalid crop/frame counts rejected',async()=>{
  const file={data:(await png()).toString('base64')};
  const single=await compileSprites([file],{});assert.equal(single.frames.length,1);assert.equal(single.frames[0].width,72);assert.equal(single.frames[0].height,40);
  const a=await compileSprites([file],{columns:2,rows:1,count:2,order:[1,0]});
  assert.equal(a.frames.length,2);assert.equal(a.frames[0].width,40);assert.equal(a.frames[0].height,40);
  const m=await sharp(a.bytes).metadata();assert.equal(m.width,a.width);assert.equal(m.height,a.height);
  const cropped=await compileSprites([file],{columns:2,rows:1,count:2,crop:{left:3,top:4,width:20,height:18}});
  assert.equal(cropped.frames.length,2);assert.equal(cropped.frames[0].width,28);assert.equal(cropped.frames[0].height,26);
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
    await writeFile(path.join(root,'config/game-rules.json'),JSON.stringify({teams:{red:{roster:['lala','jago','bebe']},green:{roster:['ciici']}}}));
    await writeFile(path.join(root,'config/sprite-studio.json'),JSON.stringify({version:1,characters:{}}));
    const started=await startSpriteStudio(0,root);server=started.server;const origin=started.origin;
    const state=await fetch(origin+'/api/state').then(r=>r.json());
    assert.ok(state.supportedSlots.bebe.includes('ultimate_fly.northwest'));
    assert.ok(!state.supportedSlots.lala.includes('ultimate_fly.northwest'));
    assert.equal(state.roster[0].visualScale,1);assert.equal((await fetch(origin+'/comparison')).status,200);assert.equal((await fetch(origin+'/comparison.js')).status,200);
    const post=(route,body,token=state.token)=>fetch(origin+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'x-admin-token':token},body:JSON.stringify({revision:state.revision,...body})});
    assert.equal((await post('save',{},'wrong')).status,403);
    assert.equal((await fetch(origin+'/api/state',{headers:{Origin:'https://evil.test'}})).status,403);
    const compiled=await post('compile',{id:'lala',slot:'run.east',files:[{data:(await png()).toString('base64')}],options:{columns:2,rows:1,count:2}}).then(r=>r.json());
    const inspected=await post('inspect',{files:[{name:'frame.png',data:(await png()).toString('base64')}]}).then(r=>r.json());
    assert.equal(inspected.files[0].format,'png');assert.equal(inspected.files[0].pages,1);
    assert.equal((await post('inspect',{files:[{name:'broken.png',data:Buffer.from('not an image').toString('base64')}]})).status,400);
    const saved=await post('save',{id:'lala',slot:'run.east',clip:compiled.clip}).then(r=>r.json());
    assert.ok(saved.document.characters.lala['run.east']);assert.equal(saved.document.characters.jago,undefined);
    assert.equal((await post('save',{id:'lala',slot:'idle',clip:compiled.clip})).status,409);
    const removed=await post('save',{revision:saved.revision,id:'lala',slot:'run.east',clip:null}).then(r=>r.json());
    assert.deepEqual(removed.document.characters,{});
    assert.deepEqual(JSON.parse(await readFile(path.join(root,'config/sprite-studio.json'),'utf8')).characters,{});
    const before=await readFile(path.join(root,'config/sprite-studio.json'),'utf8');
    const invalid=await post('save-character',{revision:removed.revision,id:'lala',clips:{'run.east':compiled.clip,'run.west':{...compiled.clip,width:999}}});
    assert.equal(invalid.status,400);
    assert.equal(await readFile(path.join(root,'config/sprite-studio.json'),'utf8'),before,'failed batch must not partially save');
    const batch=await post('save-character',{revision:removed.revision,id:'lala',clips:{'run.east':compiled.clip,'run.west':{...compiled.clip,mirror:true}}}).then(r=>r.json());
    assert.equal(Object.keys(batch.document.characters.lala).length,2);assert.equal(batch.document.characters.lala['run.west'].mirror,true);
    assert.equal(batch.document.characters.jago,undefined);
    assert.equal((await post('save-character',{revision:removed.revision,id:'lala',clips:{idle:compiled.clip}})).status,409);
    const partial=await post('save-character',{revision:batch.revision,id:'lala',clips:{idle:compiled.clip,'run.west':null}}).then(r=>r.json());
    assert.ok(partial.document.characters.lala['run.east']);assert.ok(partial.document.characters.lala.idle);assert.equal(partial.document.characters.lala['run.west'],undefined);
    const diagonal=await post('save',{revision:partial.revision,id:'lala',slot:'idle.northeast',clip:compiled.clip}).then(r=>r.json());
    assert.ok(diagonal.document.characters.lala['idle.northeast']);assert.ok(diagonal.document.characters.lala.idle);assert.ok(diagonal.document.characters.lala['run.east']);
    let revision=diagonal.revision;
    for(const id of ['bebe','ciici']) {
      const result=await post('compile',{revision,id,slot:'ultimate_fly',files:[{data:(await png()).toString('base64')}],options:{}}).then(r=>r.json());
      assert.equal(result.clip.loop,true);
      const flight=await post('save-character',{revision,id,clips:{ultimate_takeoff:result.clip,ultimate_fly:{...result.clip,loop:false},ultimate_land:result.clip,'ultimate_fly.northwest':{...result.clip,loop:false},'ultimate_takeoff.southeast':result.clip,'ultimate_land.east':result.clip}}).then(r=>r.json());
      assert.equal(flight.document.characters[id].ultimate_takeoff.loop,false);
      assert.equal(flight.document.characters[id].ultimate_fly.loop,true);
      assert.equal(flight.document.characters[id].ultimate_land.loop,false);
      assert.equal(flight.document.characters[id]['ultimate_fly.northwest'].loop,true);
      assert.equal(flight.document.characters[id]['ultimate_takeoff.southeast'].loop,false);
      assert.equal(flight.document.characters[id]['ultimate_land.east'].loop,false);
      assert.deepEqual(flight.document.characters.lala,diagonal.document.characters.lala);
      revision=flight.revision;
    }
    assert.equal((await post('save',{revision,id:'lala',slot:'ultimate_fly',clip:compiled.clip})).status,400);
    assert.equal((await post('save',{revision,id:'lala',slot:'ultimate_fly.northwest',clip:compiled.clip})).status,400);
    const reload=await fetch(origin+'/api/state').then(r=>r.json());
    assert.ok(reload.document.characters.bebe.ultimate_land);assert.ok(reload.document.characters.ciici.ultimate_fly);
    assert.equal((await fetch(origin+'/.git/config')).status,404);
  }finally{if(server)await new Promise(r=>server.close(r));assert.ok(root.startsWith(path.join(os.tmpdir(),'benteng-sprite-test-')));await rm(root,{recursive:true,force:true});}
});
