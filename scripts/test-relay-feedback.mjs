import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPowerRelay} from '../lib/map-events/power-relay.ts';
import {relaySounds} from '../lib/map-events/relay-feedback.ts';
import {createRelayFeedback} from '../modules/world/relay-map/relay-feedback.ts';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';

const actor=()=>({entityId:'me',team:'blue',x:960,y:420,state:'ACTIVE',controller:'local'});
const locate=(a,n)=>Object.assign(a,{y:{A:420,B:540,C:660}[n]});
await test('cancellation has actionable local reasons; notices expire, reset clears, and no per-frame repeats',()=>{
  for(const [change,kind] of [[a=>a.x+=13,'moved'],[a=>a.state='PRISONER','interrupted'],[a=>a.blocked=true,'interrupted'],[()=>{},'released']]){
    const events=[],a=actor(),r=createPowerRelay(createGarduPrototype(),'feedback',{},e=>events.push(e));
    r.step(36500,[a],[]);locate(a,r.get().sequence[0]);r.step(1,[a],[{entityId:'me',held:true}]);change(a);
    r.step(100,[a],[{entityId:'me',held:kind!=='released'}]);assert.equal(r.hud(a).notice.kind,kind);
    r.step(100,[a],[]);assert.equal(events.filter(e=>e.type==='cancel').length,1);
    r.step(3100,[a],[]);assert.equal(r.hud(a).notice,null);r.reset('next');assert.equal(r.hud(a).notice,null);
  }
});
await test('pause cancels once, holds simulation time and gives a retry reason',()=>{
  const events=[],a=actor(),r=createPowerRelay(createGarduPrototype(),'pause',{},e=>events.push(e));r.step(36500,[a],[]);locate(a,r.get().sequence[0]);
  r.step(1,[a],[{entityId:'me',held:true}]);const time=r.get().elapsed;r.cancelChannels();r.cancelChannels();r.step(999,[a],[],false);
  assert.equal(r.get().elapsed,time);assert.equal(r.hud(a).notice.kind,'paused');assert.equal(events.filter(e=>e.type==='cancel').length,1);
});
await test('phase cues fire once; event batches suppress duplicate final connect and opponent input audio',()=>{
  const events=[],a=actor(),r=createPowerRelay(createGarduPrototype(),'sound',{},e=>events.push(e));
  r.step(36500,[a],[]);r.step(1,[a],[]);assert.equal(events.filter(e=>e.type==='ready').length,1);
  assert.deepEqual(relaySounds(events,'me'),['relay-ready']);events.length=0;
  for(const node of r.get().sequence){locate(a,node);r.step(1,[a],[]);r.step(1,[a],[{entityId:'me',held:true}]);r.step(650,[a],[{entityId:'me',held:true}]);}
  const final=events.slice(events.findLastIndex(e=>e.type==='attempt'));
  assert.deepEqual(relaySounds(final,'me'),['relay-start','relay-open']);
  assert.deepEqual(relaySounds([{type:'advance',actorId:'other',elapsed:1}], 'me'),[]);
  events.length=0;r.step(17500,[],[]);r.step(2500,[],[]);r.step(20,[],[]);
  assert.deepEqual(relaySounds(events,'me'),['relay-warning','relay-close']);
});
await test('additive vector states use no animation, texture allocations or map mutations',()=>{
  const map=createGarduPrototype(),before=JSON.stringify(map),r=createPowerRelay(map,'visual'),a=actor();
  const labels=[],ctx=new Proxy({measureText:t=>({width:t.length*8}),fillText:t=>labels.push(t)}, {get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});
  const draw=createRelayFeedback(map);draw(ctx,r.hud(a));assert(labels.includes('A · OFF'));assert(labels.includes('LOCKED'));
  labels.length=0;r.step(36500,[a],[]);draw(ctx,r.hud(a));assert(labels.includes(r.get().sequence[0]+' · NEXT'));
  labels.length=0;r.debugOpen();draw(ctx,r.hud(a));assert(labels.includes('PASS'));
  assert.equal(JSON.stringify(map),before);
});
await test('HUD only offers activation for next node and exposes a non-ticking status region',async()=>{
  const source=await readFile(new URL('../modules/ui/map-event-hud.tsx',import.meta.url),'utf8');
  assert.match(source,/canActivate=view.phase==='ACTIVE'&&node===next/);assert.match(source,/\{canActivate&&/);
  assert.match(source,/className="relay-notice" aria-live="polite" aria-atomic="true"/);assert.match(source,/Online in/);
});
