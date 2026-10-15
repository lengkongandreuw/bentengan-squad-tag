import {test} from 'node:test';import assert from 'node:assert/strict';
import {startEngine} from './server.mjs';import {studioFramePolicy} from '../../lib/local-studio-frame.js';
void test('frame embedding is opt-in and only accepts exact private loopback origins',()=>{
 assert.equal(studioFramePolicy(),"frame-ancestors 'none'");assert.equal(studioFramePolicy('http://127.0.0.1:4330'),'frame-ancestors http://127.0.0.1:4330');
 for(const origin of ['https://evil.test','http://localhost:4330','http://127.0.0.1:4330/path','http://127.0.0.1:4330/','http://127.0.0.1:4330@evil.test'])assert.throws(()=>studioFramePolicy(origin));
});
void test('engine starts three protected editors, serves only shell assets and closes every owned server',async()=>{
 const engine=await startEngine(0);
 try{
  const response=await fetch(engine.origin+'/api/studios'),data=await response.json();assert.equal(response.status,200);assert.deepEqual(data.studios.map(s=>s.id),['maps','sprites','characters']);
  assert.equal((await fetch(engine.origin+'/.git/config')).status,404);assert.equal((await fetch(engine.origin+'/api/studios',{headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await fetch(engine.origin+'/api/studios',{method:'POST'})).status,405);
  const shell=await fetch(engine.origin);assert.equal(shell.status,200);assert.equal(shell.headers.get('x-frame-options'),'DENY');
  for(const studio of engine.studios){
   const html=await fetch(studio.origin);assert.equal(html.status,200);assert.ok(html.headers.get('content-security-policy').includes(`frame-ancestors ${engine.origin}`));assert.equal(html.headers.get('x-frame-options'),null);
   const state=await fetch(studio.origin+'/api/state');assert.equal(state.status,200);
   assert.equal((await fetch(studio.origin+'/api/state',{headers:{Origin:'https://evil.test'}})).status,403);
   assert.equal((await fetch(studio.origin+'/api/save',{method:'POST',headers:{Origin:studio.origin,'Content-Type':'application/json'},body:'{}'})).status,403);
   assert.ok(shell.headers.get('content-security-policy').includes(studio.origin));
  }
 }finally{await engine.close();}
 await assert.rejects(()=>fetch(engine.origin));for(const studio of engine.studios)await assert.rejects(()=>fetch(studio.origin));
});
