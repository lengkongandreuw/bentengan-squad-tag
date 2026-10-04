import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {flightConfig,startFlight,advanceFlight,isFlying,flightBusy,flightSlot,sequenceComplete,steerFlight,safeFlightLanding,flightPassesObstacle} from '../lib/flight-ultimate.js';
import {actionsForCharacter,slotAllowed,slotLoop,spriteSlot,validateSpriteDocument} from '../lib/sprite-studio-model.js';
import {solidAt} from '../lib/map-studio-model.js';

test('shared config, complete-sequence gating and exact actual flight duration',()=>{
  for(const id of ['bebe','ciici']){
    const c=flightConfig(id),p={flight:startFlight({x:0,y:0})};
    assert.equal(c.flightDuration,4);assert.equal(c.speedMultiplier,id==='bebe'?1.25:1.2);
    assert.equal(c.turnMultiplier,id==='bebe'?.85:1.15);
    advanceFlight(p.flight,c,10,false);assert.equal(isFlying(p),false);assert.equal(p.flight.remaining,0);
    advanceFlight(p.flight,c,.01,true);assert.equal(isFlying(p),true);assert.equal(p.flight.remaining,4);
    advanceFlight(p.flight,c,3.99,false);assert.equal(isFlying(p),true);
    let landed=0;advanceFlight(p.flight,c,.011,false,{onSafeLanding:()=>landed++});
    assert.equal(landed,1);assert.equal(isFlying(p),false);assert.equal(flightSlot(p.flight),'ultimate_land');
    assert.ok(advanceFlight(p.flight,c,10,false));p.flight=advanceFlight(p.flight,c,.01,true);
    assert.equal(flightBusy(p),false);
  }
  assert.equal(flightConfig('raja'),null);assert.equal(flightConfig('kaka'),null);
  const clip={frames:[{}, {}, {}],fps:10};
  assert.equal(sequenceComplete(clip,299,.7),false);assert.equal(sequenceComplete(clip,300,.7),true);
});
test('only flying is immune; cancellation clears derived modifiers and warning once',()=>{
  const p={flight:startFlight({x:0,y:0})},c=flightConfig('bebe');let warnings=0;
  assert.equal(isFlying(p),false);advanceFlight(p.flight,c,1,true);
  advanceFlight(p.flight,c,3.5,false,{onFlightWarning:()=>warnings++});
  advanceFlight(p.flight,c,.1,false,{onFlightWarning:()=>warnings++});assert.equal(warnings,1);
  p.flight=null;assert.equal(isFlying(p),false);assert.equal(flightBusy(p),false);
});
test('Ciici steering is faster than Bebe; finite movement, stop input',()=>{
  const headings=[];
  for(const id of ['bebe','ciici']){const f=startFlight({x:0,y:0});steerFlight(f,1,0,.01,flightConfig(id).turnMultiplier);const v=steerFlight(f,0,1,.1,flightConfig(id).turnMultiplier);headings.push(f.heading);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-10);assert.deepEqual(steerFlight(f,0,0,.1,1),{x:0,y:0});}
  assert.ok(headings[1]>headings[0]);
});
test('filtered low obstacles, solid buildings/boundaries and nearest safe landing',()=>{
  assert.equal(flightPassesObstacle({asset:'crates'}),true);
  for(const o of [{asset:'hall'},{asset:'crates',hidden:true},{asset:'unknown'}])assert.equal(flightPassesObstacle(o),false);
  const map={objects:[{behavior:'parkour',shape:'rect',rotation:0,x:10,y:10,w:20,h:20},{behavior:'solid',shape:'rect',rotation:0,x:50,y:10,w:20,h:20}]};
  assert.equal(solidAt(map,20,20,1,true),false);assert.equal(solidAt(map,60,20,1,true),true);
  const valid=(x,y)=>x>=0&&x<=100&&y>=0&&y<=100&&!solidAt(map,x,y,1);
  const landing=safeFlightLanding({x:20,y:20},{x:0,y:0},valid);assert.ok(valid(landing.x,landing.y));
  assert.deepEqual(safeFlightLanding({x:500,y:500},{x:0,y:0},valid),{x:0,y:0});
  assert.equal(safeFlightLanding({x:0,y:0},{x:0,y:0},()=>false),null);
});
test('three canonical editor slots only for Bebe/Ciici, no forced eight-direction slots',()=>{
  for(const id of ['bebe','ciici'])for(const s of ['ultimate_takeoff','ultimate_fly','ultimate_land']){assert.ok(actionsForCharacter(id).includes(s));assert.ok(slotAllowed(id,s));assert.equal(slotAllowed(id,s+'.east'),false);}
  assert.equal(slotAllowed('raja','ultimate_fly'),false);assert.equal(slotLoop('ultimate_fly'),true);assert.equal(slotLoop('ultimate_takeoff'),false);assert.equal(slotLoop('ultimate_land'),false);
  assert.equal(spriteSlot({state:'ACTIVE',vx:20,vy:0,flightSlot:'ultimate_fly'}),'ultimate_fly');
  assert.equal(spriteSlot({state:'PRISONER',flightSlot:'ultimate_fly'}),'prisoner');
  assert.deepEqual(validateSpriteDocument({version:1,characters:{}},['bebe','ciici']),{version:1,characters:{}});
});
test('runtime retains existing team ultimates and gates all flight interactions',()=>{
  const code=fs.readFileSync('app/prototype.tsx','utf8');
  for(const pattern of ['RAJA_ULTIMATE_SPEED_MULTIPLIER = 1.4','KAKA_ULTIMATE_SHIELD_MS = 5000','flightBusy(winner) || isFlying(loser)','!flightBusy(p) && p.state','flightBusy(p) || p.state','playerMovementLocked','studioFlightClip(me.characterId,slot)'])assert.ok(code.includes(pattern),pattern);
  assert.equal(code.split("onClick={() => keys.current.add('capslock')}").length-1,2,'desktop/mobile ultimate queues a one-shot until consumed');
});
