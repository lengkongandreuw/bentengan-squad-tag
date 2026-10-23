// In-process request-handler unit tests: no listening sockets, browser or fetch.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {Readable} from 'node:stream';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {startMapStudio} from './map-studio/server.mjs';
import {startSpriteStudio} from './sprite-studio/server.mjs';

async function harness(start,root){
  const realCreate=http.createServer;let handler;
  http.createServer=fn=>{handler=fn;return {once(){return this;},listen(_port,_host,ready){ready();},address(){return {port:48001};},close(done){done?.();}};};
  let studio;
  try{studio=await start(0,root);}finally{http.createServer=realCreate;}
  const request=async(url,body,token)=>{
    const req=Readable.from(body?[Buffer.from(JSON.stringify(body))]:[]);
    Object.assign(req,{url,method:body?'POST':'GET',headers:{host:'127.0.0.1:48001',origin:studio.origin,'content-type':'application/json','x-admin-token':token}});
    let status=200;const headers={};let output;
    const res={setHeader(k,v){headers[k]=v;},writeHead(s,h){status=s;Object.assign(headers,h);},end(data){output=String(data??'');}};
    await handler(req,res);
    return {status,headers,data:(headers['Content-Type']??'').includes('json')?JSON.parse(output):output};
  };
  return request;
}
void test('Map and Sprite handler imports optimize by default and save without altering geometry/FPS',async()=>{
  const output=path.join(process.cwd(),'outputs');await mkdir(output,{recursive:true});
  const root=await mkdtemp(path.join(output,'auto-assets-handler-'));
  await mkdir(path.join(root,'config'),{recursive:true});await mkdir(path.join(root,'public'),{recursive:true});
  await writeFile(path.join(root,'config/map-studio.json'),JSON.stringify({version:1,maps:[]}));
  await writeFile(path.join(root,'config/sprite-studio.json'),JSON.stringify({version:1,characters:{}}));
  await writeFile(path.join(root,'config/game-rules.json'),JSON.stringify({teams:{red:{roster:['raja']},green:{roster:['bebe']}}}));
  const file={name:'large.png',data:(await sharp({create:{width:2400,height:1200,channels:4,background:'#7744bb88'}}).png().toBuffer()).toString('base64')};
  const mapRequest=await harness(startMapStudio,root),state=(await mapRequest('/api/state')).data;
  assert.equal(state.capabilities.assetOptimization,1);
  assert.equal((await mapRequest('/asset-feedback.js')).status,200);
  const rejected=await mapRequest('/api/upload',{revision:state.revision,kind:'object',file},'wrong');assert.equal(rejected.status,403);
  const uploaded=await mapRequest('/api/upload',{revision:state.revision,kind:'object',displaySize:{width:300,height:150},file},state.token);
  assert.equal(uploaded.status,200,JSON.stringify(uploaded.data));
  assert.ok(uploaded.data.optimization.resized);assert.ok(uploaded.data.asset.frames[0].width<=608);
  assert.equal((await mapRequest('/api/library')).data.items[0].clip.asset,uploaded.data.asset.asset,'upload available before saving a map');
  assert.deepEqual(await readFile(path.join(root,uploaded.data.optimization.sources[0].path)),Buffer.from(file.data,'base64'));
  const m={id:'studio-test',name:'Test map',description:'',width:1800,height:1200,enabled:false,terrain:uploaded.data.asset,icon:null,terrainMode:'stretch',tileSize:256,objects:[],
    bases:{blue:{x:200,y:600},red:{x:1600,y:600}},prisons:{blue:{x:80,y:100,w:240,h:160},red:{x:1480,y:100,w:240,h:160}}};
  const saved=await mapRequest('/api/save',{revision:state.revision,map:m},state.token);
  assert.equal(saved.status,200,JSON.stringify(saved.data));assert.deepEqual(saved.data.document.maps[0].bases,m.bases);
  assert.deepEqual(saved.data.document.maps[0].prisons,m.prisons);assert.ok(saved.data.budget.rgbaBytes>0);
  const beforeOptimization=await readFile(path.join(root,'config/map-studio.json'));
  const fixed=await mapRequest('/api/optimize-map',{revision:saved.data.revision,map:m},state.token);
  assert.equal(fixed.status,200,JSON.stringify(fixed.data));assert.deepEqual(fixed.data.map.bases,m.bases);
  assert.deepEqual(await readFile(path.join(root,'config/map-studio.json')),beforeOptimization,'autofix prepares a draft, never silently saves');
  const privatePath='/'+uploaded.data.optimization.sources[0].path;assert.notEqual((await mapRequest(privatePath)).status,200);
  const spriteRequest=await harness(startSpriteStudio,root),ss=(await spriteRequest('/api/state')).data;
  assert.equal(ss.assetOptimization,1);
  const compiled=await spriteRequest('/api/compile',{revision:ss.revision,id:'raja',slot:'run',files:[file],options:{}},ss.token);
  assert.equal(compiled.status,200,JSON.stringify(compiled.data));assert.ok(compiled.data.clip.frames[0].width<=512);
  assert.ok(compiled.data.optimization.resized);assert.equal(compiled.data.clip.scale,1);
  const clip={...compiled.data.clip,fps:24,scale:1.5,x:12,y:-7,pivotX:.4,pivotY:.95};
  const spriteSaved=await spriteRequest('/api/save',{revision:ss.revision,id:'raja',slot:'run',clip},ss.token);
  assert.equal(spriteSaved.status,200,JSON.stringify(spriteSaved.data));assert.deepEqual(spriteSaved.data.document.characters.raja.run,clip);
  assert.equal(spriteSaved.data.document.characters.bebe,undefined);assert.ok(spriteSaved.data.budget.rgbaBytes>0);
  assert.equal((await spriteRequest('/asset-feedback.js')).status,200);
});
