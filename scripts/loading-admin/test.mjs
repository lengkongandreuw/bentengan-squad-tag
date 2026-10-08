import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {startLoadingAdmin,inspectMedia} from './server.mjs';
import {validateLoadingMedia,resolveLoadingMedia,loadingBootHtml,usesBuiltinProgress} from '../../lib/loading-media-model.js';
test('wallpaper-only mode retains original progress; existing full replacements retain their behavior',()=>{
  const asset={asset:`loading-media/${'a'.repeat(64)}.gif`,kind:'image',fit:'cover'};
  assert(usesBuiltinProgress(null));assert.equal(usesBuiltinProgress(asset),false);assert.equal(usesBuiltinProgress({...asset,preserveProgress:false}),false);
  assert(usesBuiltinProgress(validateLoadingMedia({version:1,slots:{'character-red':{...asset,preserveProgress:true}}}).slots['character-red']));
  assert.throws(()=>validateLoadingMedia({version:1,slots:{'character-red':{...asset,preserveProgress:'true'}}}));
});
import {builtinPreviews} from './preview-model.mjs';
test('preview catalog uses actual team posters and map artwork/video fallbacks',()=>{
  const p=builtinPreviews([{id:'studio-demo',replaces:'taman',icon:{asset:`map-studio/${'a'.repeat(64)}.webp`}}]);
  assert.equal(p['character-red'].asset,'arena-ui/red-loading.webp');assert.equal(p['character-green'].team,'green');
  assert.equal(p['match:kanal2'].video,'arena-ui/kanal.mp4');assert.match(p['match:studio-demo'].asset,/map-studio/);
});
test('Pages boot media is present before React, preserves default empty config and supports video',()=>{
  const html='<div id="root"></div><script src="app.js"></script>';
  assert.equal(loadingBootHtml(html,{version:1,slots:{}}),html);
  const result=loadingBootHtml(html,{version:1,slots:{boot:{asset:`loading-media/${'a'.repeat(64)}.mp4`,kind:'video',fit:'contain'}}});
  assert.match(result,/autoplay muted loop playsinline/);assert.match(result,/object-fit:contain/);assert.match(result,/Memuat game/);assert.match(result,/<script src="app.js"><\/script>/);
});
test('model guards assets and resolves per-map overrides and default',()=>{
  const image={asset:`loading-media/${'a'.repeat(64)}.gif`,kind:'image',fit:'contain'};
  const doc=validateLoadingMedia({version:1,slots:{match:image,'match:taman':{...image,fit:'cover'}}});
  assert.equal(resolveLoadingMedia(doc,'match','taman').fit,'cover');assert.equal(resolveLoadingMedia(doc,'match','pasar').fit,'contain');assert.equal(resolveLoadingMedia(doc,'profile'),null);
  for(const bad of [{...image,asset:'../../secret.png'},{...image,kind:'video'},{...image,fit:'bad'}])assert.throws(()=>validateLoadingMedia({version:1,slots:{boot:bad}}));
  assert.throws(()=>validateLoadingMedia({version:1,slots:{unknown:image}}));
});
test('media inspection preserves GIF and video, safely rasterizes SVG, rejects junk',async()=>{
  const png=await sharp({create:{width:12,height:12,channels:4,background:'#f00'}}).png().toBuffer();
  const gif=await sharp(png).gif().toBuffer();assert.deepEqual((await inspectMedia(gif,'image')).bytes,gif);
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');assert.equal((await inspectMedia(svg,'image')).extension,'png');
  await assert.rejects(inspectMedia(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="file:///private.png" width="10" height="10"/></svg>'),'image'));
  await assert.rejects(inspectMedia(Buffer.from('not an image'),'image'));await assert.rejects(inspectMedia(png,'video'));
  assert.equal((await inspectMedia(Buffer.from('0000ftypisom00000000'),'video')).extension,'mp4');
});
test('HTTP uploads require local session, retain backups, reject stale writes, reset without deleting media, serve byte ranges',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'benteng-loading-test-'));await mkdir(path.join(root,'config'));
  await writeFile(path.join(root,'config/loading-media.json'),JSON.stringify({version:1,slots:{}}));await writeFile(path.join(root,'config/map-studio.json'),JSON.stringify({maps:[]}));
  const {server,origin}=await startLoadingAdmin(0,root);
  try {
    const state=await(await fetch(origin+'/api/state')).json();
    const image=await sharp({create:{width:16,height:9,channels:4,background:'#f00'}}).png().toBuffer();
    const headers={'Origin':origin,'X-Admin-Token':state.token,'X-Revision':state.revision,'X-Loading-Slot':'boot','X-Media-Kind':'image','X-Media-Fit':'contain'};
    assert.equal((await fetch(origin+'/api/upload',{method:'POST',body:image})).status,403);
    assert.equal((await fetch(origin+'/api/state',{headers:{Origin:'https://evil.example'}})).status,403);
    const response=await fetch(origin+'/api/upload',{method:'POST',headers,body:image});assert.equal(response.status,200);const saved=await response.json();
    assert.equal(saved.document.slots.boot.kind,'image');assert.equal(saved.document.slots.boot.fit,'contain');
    const asset=saved.document.slots.boot.asset;assert.deepEqual(await readFile(path.join(root,'public',asset)),image);
    const range=await fetch(origin+'/'+asset,{headers:{Range:'bytes=0-7'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,8);
    assert.equal((await fetch(origin+'/api/reset',{method:'POST',headers})).status,409);
    const reset=await fetch(origin+'/api/reset',{method:'POST',headers:{...headers,'X-Revision':saved.revision}});assert.equal(reset.status,200);assert.deepEqual((await reset.json()).document.slots,{});
    assert.equal((await fetch(origin+'/'+asset)).status,200);
    assert.equal((await fetch(origin+'/.git/config')).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
