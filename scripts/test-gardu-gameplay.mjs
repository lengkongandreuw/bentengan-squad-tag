import test from 'node:test';import assert from 'node:assert/strict';
import {createRelayWorld} from '../lib/map-events/power-relay.ts';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
import {createBotAuthority,planBot} from '../modules/gameplay/ai-movement.ts';
import {moveActor,movementBlocked,parkourLanding} from '../modules/gameplay/movement.ts';
import {urgentGameplayHint} from '../modules/ui/hint-policy.ts';
import {clickRoute} from '../modules/gameplay/click-navigation.ts';
const map=createGarduPrototype();
const actor=(id='runner',team='blue')=>({id,entityId:id,team,controller:'bot',characterId:'raja',state:'ACTIVE',x:960,y:540,vx:0,vy:0,lastX:960,lastY:540,exitOrder:2,boost:100,aiSeed:1,baseCharge:0,parkourUntil:0,actionUntil:0,flight:null});
const world=r=>({width:1920,height:1080,bases:map.bases,baseRadius:68,kanal:false,kanal2:false,obstacles:[],studioSolidAt:r.queries.solidAt,studioFlightSolidAt:r.queries.flightSolidAt,dynamicBlocked:(x,y,n,p)=>r.relay.entryBlocked(p,x,y,n),waterAt:()=>false,waterBlocks:()=>false,fortCoreAt:()=>false,fortOccupied:()=>false,baseChargeTime:()=>.55,speedAt:()=>1});
const botWorld=(players,r)=>({players,bases:map.bases,width:1920,height:1080,baseRadius:68,refills:[],request:null,kanal2:false,localTeam:'blue',profile:{prediction:0,playerBias:0,threatRadius:180,rescueCutoff:0,steerDistance:100},boostThreshold:2,navigate:(_p,v)=>v,relayTargets:{blue:r.relay.targetPoint('blue'),red:r.relay.targetPoint('red')}});
await test('invalid legacy IN_BASE bot returns to charge rather than orbiting the center',()=>{
  const p={...actor(),state:'IN_BASE',x:960,y:540};const r=createRelayWorld(map,'repair');
  const plan=planBot(p,0,botWorld([p],r));assert.equal(plan.objective,'return');assert.equal(plan.vector.x,150-960);
});
await test('both teams solve via actual bot decisions, movement and shared channel duration',()=>{
  for(const team of ['blue','red']){
    const r=createRelayWorld(map,'bot-solver'),p=actor('runner',team),ai=createBotAuthority(),w=world(r);
    r.relay.step(36500,[p],[]);let holds=0;
    for(let i=0;i<800&&!r.relay.gatesOpen();i++){
      let held=false;ai.run('host',botWorld([p],r),40000+i*1000/60,(p,intent)=>{held=!!intent.relayHeld;holds+=Number(held);moveActor(w,p,intent.frame.moveX,intent.frame.moveY,218,1/60,i*1000/60);});
      r.relay.step(1000/60,[p],[{entityId:p.entityId,held}]);
    }
    assert(holds>=117);assert.equal(r.relay.get().winner,team);assert.equal(r.relay.get().progress[team],3);
    assert.equal(r.relay.speedMultiplier({...p,x:960,y:540}),1.35);assert.equal(r.relay.speedMultiplier({...p,x:960,y:540,team:team==='blue'?'red':'blue'}),1);
    assert.equal(r.relay.speedMultiplier({...p,x:960,y:200}),1);
  }
});
await test('one runner per team, nearby human keeps priority, client never decides',()=>{
  const r=createRelayWorld(map,'roles'),p=actor(),other=actor('other');other.x=1000;r.relay.step(36500,[p,other],[]);
  const ai=createBotAuthority(),plans=[];ai.run('host',botWorld([p,other],r),40000,(_p,i)=>plans.push(i.objective));assert.equal(plans.filter(p=>p==='relay').length,1);
  const human={...actor('human'),controller:'local',...r.relay.targetPoint('blue')};const held=[];ai.run('host',botWorld([p,human],r),40100,(_p,i)=>held.push(i.objective));assert(!held.includes('relay'));
  ai.run('client',botWorld([p],r),40100,()=>assert.fail('No client bot authority'));
});
await test('anti-camp blocks entry and gently clears occupants without teleport/damage',()=>{
  const r=createRelayWorld(map,'close'),p={...actor(),x:805,y:540},w=world(r);r.relay.debugOpen();r.relay.step(20000,[p],[]);
  assert(r.relay.gatesOpen());assert.equal(r.relay.egressFor(p),null);
  const outsider={...actor('outside'),x:760,y:540,baseCharge:1};assert(movementBlocked(w,790,540,outsider,0));assert.equal(parkourLanding(w,outsider,{x:1,y:0},110,0),null);
  r.relay.step(2000,[p],[]);const start={x:p.x,y:p.y};
  for(let i=0;i<90&&r.relay.gatesOpen();i++){
    const before={x:p.x,y:p.y},v=r.relay.egressFor(p,(x,y)=>!r.queries.solidAt(x,y,15));
    if(v)moveActor(w,p,v.x,v.y,180,1/60,0);
    assert(Math.hypot(p.x-before.x,p.y-before.y)<=3.01,'No teleport');r.relay.step(1000/60,[p],[]);
  }
  assert(!r.relay.gatesOpen());assert.equal(p.state,'ACTIVE');assert(Math.hypot(p.x-start.x,p.y-start.y)<80);
  assert(r.queries.solidAt(805,540));assert(r.queries.solidAt(1115,540));
});
await test('egress avoids unsafe exits, pause freezes grace, reset removes benefit',()=>{
  const r=createRelayWorld(map,'safe'),p={...actor(),x:805,y:540};r.relay.debugOpen();r.relay.step(22000,[p],[]);
  assert.equal(r.relay.egressFor(p,()=>false),null);const time=r.relay.get().elapsed;r.relay.step(50000,[p],[],false);assert.equal(r.relay.get().elapsed,time);
  r.relay.reset('again');assert.equal(r.relay.speedMultiplier(p),1);assert(!r.relay.entryBlocked(p,800,540));assert.equal(r.relay.egressFor(p),null);
});
await test('both occupied gates, including flight, clear through movement before atomic close',()=>{
  const r=createRelayWorld(map,'two-campers'),a={...actor('west'),x:805,y:540},b={...actor('east','red'),x:1115,y:540,flight:{stage:'FLYING'}},w=world(r);
  r.relay.debugOpen();r.relay.step(22000,[a,b],[]);
  for(let i=0;i<90&&r.relay.gatesOpen();i++){
    for(const p of [a,b]){const v=r.relay.egressFor(p,(x,y)=>!r.queries.solidAt(x,y,15));if(v)moveActor(w,p,v.x,v.y,180,1/60,0);}
    r.relay.step(1000/60,[a,b],[]);
  }
  assert.equal(r.relay.get().phase,'COMPLETE');assert(a.x<775||a.x>835);assert(b.x<1085||b.x>1145);assert.equal(b.flight.stage,'FLYING');
});
await test('winning-team lane saves more than two seconds without changing base stats or paths',()=>{
  const r=createRelayWorld(map,'reward'),p=actor(),w=world(r);r.relay.step(36500,[p],[]);
  const route=clickRoute(map.bases.blue,map.bases.red,1920,1080,(x,y)=>!r.queries.solidAt(x,y),24);
  let from=map.bases.blue,closedLength=0;for(const to of route){closedLength+=Math.hypot(to.x-from.x,to.y-from.y);from=to;}
  for(let i=0;i<3;i++){Object.assign(p,r.relay.targetPoint('blue'));r.relay.step(1,[p],[]);r.relay.step(1,[p],[{entityId:p.entityId,held:true}]);r.relay.step(650,[p],[{entityId:p.entityId,held:true}]);}
  Object.assign(p,{x:150,y:540});let seconds=0;while(p.x<1768&&seconds<20){moveActor(w,p,1,0,218*r.relay.speedMultiplier(p),1/60,0);seconds+=1/60;}
  assert(closedLength/218-seconds>2);assert(seconds<6.5);
});
await test('urgent combat help outranks optional Relay for learned mechanics too',()=>{
  const c={state:'ACTIVE',learned:['rescue','tag','capture'],nearObstacle:false,parkourReady:false,rescueNeeded:false,ultimateReady:false,nearEnemyFort:false,fortOpen:false,moving:true,tagOpportunity:false};
  assert.equal(urgentGameplayHint({...c,rescueNeeded:true}),'rescue');assert.equal(urgentGameplayHint({...c,nearEnemyFort:true,fortOpen:true}),'capture');assert.equal(urgentGameplayHint({...c,tagOpportunity:true}),'tag');assert.equal(urgentGameplayHint({...c,state:'RETURNING'}),'returning');assert.equal(urgentGameplayHint(c),null);
});
