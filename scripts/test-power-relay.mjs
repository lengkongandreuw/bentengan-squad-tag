import test from 'node:test';import assert from 'node:assert/strict';
import {createPowerRelay,createRelayWorld,relaySequence} from '../lib/map-events/power-relay.ts';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
import {clickRoute} from '../modules/gameplay/click-navigation.ts';
import {movementBlocked,parkourLanding} from '../modules/gameplay/movement.ts';
const actor=(id='human',team='blue')=>({entityId:id,team,x:960,y:420,state:'ACTIVE',controller:'local'});
const position=(a,node)=>Object.assign(a,{x:960,y:{A:420,B:540,C:660}[node]});
const begin=(relay,actors)=>relay.step(26500,actors,[]);
const activate=(r,a,node,all=[a])=>{position(a,node);r.step(1,all,[{entityId:a.entityId,held:false}]);r.step(1,all,[{entityId:a.entityId,held:true}]);r.step(650,all,[{entityId:a.entityId,held:true}]);};

await test('seeded sequences are detached valid permutations; announce/timing/timeout occur once',()=>{
  const choices=new Set();for(let i=0;i<100;i++){const seq=relaySequence('round'+i);assert.equal(seq.join(''),relaySequence('round'+i).join(''));assert.deepEqual([...seq].sort(),['A','B','C']);choices.add(seq.join(''));}assert.equal(choices.size,6);
  const r=createPowerRelay(createGarduPrototype(),'seed');r.step(24999,[],[]);assert.equal(r.get().phase,'DORMANT');r.step(1,[],[]);assert.equal(r.get().phase,'ANNOUNCING');r.step(1500,[],[]);assert.equal(r.get().phase,'ACTIVE');r.step(30000,[],[]);assert.equal(r.get().phase,'EXPIRED');r.step(90000,[],[]);assert.equal(r.get().phase,'EXPIRED');assert(!r.get().gateOpen);
});
await test('correct nodes advance per team, wrong node resets only own progress; held/duplicate input cannot repeat',()=>{
  const r=createPowerRelay(createGarduPrototype(),'seed'),a=actor(),b=actor('other','red');begin(r,[a,b]);const seq=r.get().sequence;
  activate(r,a,seq[0],[a,b]);activate(r,b,seq[0],[a,b]);assert.deepEqual(r.get().progress,{blue:1,red:1});
  r.step(1000,[a,b],[{entityId:b.entityId,held:true},{entityId:b.entityId,held:true}]);assert.equal(r.get().progress.red,1);
  activate(r,a,seq[0],[a,b]);assert.deepEqual(r.get().progress,{blue:1,red:1});assert.equal(r.hud(a).notice.kind,'already');assert.deepEqual(r.get().channels,{});
  activate(r,a,seq[2],[a,b]);assert.deepEqual(r.get().progress,{blue:0,red:1});assert.equal(r.get().feedback,'wrong');
  for(const node of seq)activate(r,a,node,[a,b]);assert.equal(r.get().winner,'blue');assert(r.get().gateOpen);assert.equal(r.get().phase,'GATE_OPEN');
  activate(r,b,seq[1],[a,b]);assert.equal(r.get().winner,'blue');assert.equal(r.get().progress.red,1);
});
await test('release, displacement, radius, prison, returning, blocked actions and round end cancel without immunity',()=>{
  for(const cancel of [a=>a.state='PRISONER',a=>a.state='RETURNING',a=>a.blocked=true,a=>a.x+=13,a=>a.y+=100]){
    const a=actor(),r=createPowerRelay(createGarduPrototype(),'seed');begin(r,[a]);position(a,r.get().sequence[0]);r.step(1,[a],[{entityId:a.entityId,held:true}]);cancel(a);r.step(650,[a],[{entityId:a.entityId,held:true}]);assert.equal(r.get().progress.blue,0);assert.deepEqual(r.get().channels,{});
  }
  const a=actor(),r=createPowerRelay(createGarduPrototype(),'seed');begin(r,[a]);r.step(1,[a],[{entityId:a.entityId,held:true}]);r.step(650,[a],[]);assert.equal(r.get().progress.blue,0);
  r.step(1,[a],[{entityId:a.entityId,held:true}]);const elapsed=r.get().elapsed;r.step(10000,[a],[],false);assert.equal(r.get().elapsed,elapsed);assert.deepEqual(r.get().channels,{});
  r.reset('next');assert.equal(r.get().phase,'DORMANT');assert(!r.get().gateOpen);
});
await test('bots obey shared channel duration and terminal timeout cannot be bypassed by late activation',()=>{
  const a={...actor(),controller:'bot'},r=createPowerRelay(createGarduPrototype(),'seed');begin(r,[a]);for(const node of r.get().sequence)activate(r,a,node);assert.equal(r.get().progress.blue,3);
  const late=createPowerRelay(createGarduPrototype(),'seed');begin(late,[a]);position(a,late.get().sequence[0]);late.step(29700,[a],[]);late.step(1,[a],[{entityId:a.entityId,held:true}]);late.step(650,[a],[{entityId:a.entityId,held:true}]);assert.equal(late.get().phase,'EXPIRED');assert.equal(late.get().progress.blue,0);
});
await test('both gates remain open through warning and occupied closing, including bots/flight; clear closes atomically',()=>{
  const map=createGarduPrototype(),r=createPowerRelay(map,'seed'),a=actor();const before=JSON.stringify(map);r.debugOpen();assert(!r.solidAt(805,540));
  r.step(17500,[],[]);assert.equal(r.get().phase,'CLOSING');a.x=805;a.y=540;a.controller='bot';a.blocked=true;
  r.step(2500,[a],[]);assert(r.get().gateOpen);assert.equal(r.get().phase,'CLOSING');a.x=1115;r.step(1000,[a],[]);assert(r.get().gateOpen);
  a.x=960;r.step(1,[a],[]);assert(!r.get().gateOpen);assert.equal(r.get().phase,'COMPLETE');assert(r.solidAt(805,540));assert(r.solidAt(1115,540));assert.equal(JSON.stringify(map),before);
});
await test('one cached static index plus live gates drives normal/jump/flight/LOS and existing navigation without changing other maps',()=>{
  const map=createGarduPrototype(),before=JSON.stringify(map),w=createRelayWorld(map,'seed'),q=w.queries;
  const cached=q.nearby(805,540);assert(q.solidAt(805,540));assert(q.solidAt(805,540,13,true));assert(q.flightSolidAt(805,540));
  assert(w.recoveryRects().length>=2);const recovery=w.recoveryRects();assert.equal(w.recoveryRects(),recovery);assert(recovery.some(r=>r.x>=790&&r.x<=820));assert(recovery.some(r=>r.x>=1100&&r.x<=1130));
  const route=()=>clickRoute(map.bases.blue,map.bases.red,map.width,map.height,(x,y)=>!q.solidAt(x,y),40);
  assert(route().length>1);w.relay.debugOpen();assert(!q.solidAt(805,540));assert(!q.solidAt(805,540,13,true));assert(!q.flightSolidAt(805,540));assert.equal(w.recoveryRects().length,0);assert.equal(route().length,1);assert.equal(q.nearby(805,540),cached);assert.equal(JSON.stringify(map),before);
  assert.equal(createRelayWorld(map,'seed',false),null);assert.equal(createRelayWorld({...map,objects:[]},'seed'),null);
  assert.equal(createRelayWorld({...map,objects:map.objects.filter(o=>o.id!=='obj-power-relay-node-b')},'seed'),null);
});
await test('650ms is required; simultaneous final activations have one stable winner independent of actor order',()=>{
  for(const reverse of [false,true]){
    const a=actor('alpha','blue'),b=actor('zeta','red'),actors=reverse?[b,a]:[a,b],r=createPowerRelay(createGarduPrototype(),'tie');begin(r,actors);
    const seq=r.get().sequence;for(const node of seq.slice(0,2)){activate(r,a,node,actors);activate(r,b,node,actors);}
    position(a,seq[2]);position(b,seq[2]);r.step(1,actors,[]);
    const intents=actors.map(a=>({entityId:a.entityId,held:true}));r.step(1,actors,intents);r.step(649,actors,intents);
    assert.equal(r.get().winner,null);assert.deepEqual(r.get().progress,{blue:2,red:2});
    r.step(1,actors,intents);assert.equal(r.get().winner,'blue');assert.deepEqual(r.get().progress,{blue:3,red:2});assert.equal(r.revision(),1);
    r.reset('next');assert(!r.gatesOpen());assert.equal(r.revision(),0);assert.deepEqual(r.get().progress,{blue:0,red:0});assert.deepEqual(r.get().channels,{});
  }
});
await test('actual shared movement and parkour sweep cannot cross closed gates; flight obeys the same state',()=>{
  const map=createGarduPrototype(),runtime=createRelayWorld(map,'movement');
  const world={width:map.width,height:map.height,bases:map.bases,baseRadius:68,kanal:false,kanal2:false,obstacles:[],studioSolidAt:runtime.queries.solidAt,studioFlightSolidAt:runtime.queries.flightSolidAt,parkourSolidAt:runtime.relay.solidAt,waterAt:()=>false,waterBlocks:()=>false,fortCoreAt:()=>false,fortOccupied:()=>false,baseChargeTime:()=>1,speedAt:()=>1};
  const a={...actor(),id:'human',x:760,y:540,baseCharge:1,flight:null};
  assert(movementBlocked(world,805,540,a,0));assert.equal(parkourLanding(world,a,{x:1,y:0},110,0),null);
  a.flight={stage:'FLYING'};assert(movementBlocked(world,805,540,a,0));
  runtime.relay.debugOpen();assert(!movementBlocked(world,805,540,a,0));a.flight=null;assert(parkourLanding(world,a,{x:1,y:0},110,0));
  runtime.relay.step(20000,[],[]);assert(movementBlocked(world,805,540,a,0));assert.equal(parkourLanding(world,a,{x:1,y:0},110,0),null);
});
