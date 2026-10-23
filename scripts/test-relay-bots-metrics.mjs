import test from 'node:test';import assert from 'node:assert/strict';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
import {createRelayWorld,createPowerRelay} from '../lib/map-events/power-relay.ts';
import {createRelayTelemetry} from '../lib/map-events/relay-telemetry.ts';
import {createBotAuthority} from '../modules/gameplay/ai-movement.ts';
import {clickRoute} from '../modules/gameplay/click-navigation.ts';
import {moveActor} from '../modules/gameplay/movement.ts';
import {resolveTag} from '../modules/gameplay/tag-combat.ts';
const actor=(id,team,x,y,controller='bot')=>({id,entityId:id,team,x,y,lastX:x,lastY:y,vx:0,vy:0,controller,characterId:'raja',controlled:controller==='local',state:'ACTIVE',exitOrder:team==='blue'?2:1,aiSeed:1,boost:100,baseCharge:1,tagCooldown:0,parkourUntil:0,rescueShieldUntil:0,ultimateShieldUntil:0,waterEnteredAt:0,actionUntil:0,captures:0,capturedIds:[],prisonIndex:0,flight:null});
const map=createGarduPrototype();
const botWorld=(players,navigate)=>({players,bases:map.bases,width:1920,height:1080,refills:[],request:null,kanal2:false,localTeam:'blue',profile:{prediction:0,playerBias:0,threatRadius:180,rescueCutoff:0,steerDistance:100},boostThreshold:2,navigate});
const collision=q=>({width:1920,height:1080,bases:map.bases,baseRadius:68,kanal:false,kanal2:false,obstacles:[],studioSolidAt:q.solidAt,studioFlightSolidAt:q.flightSolidAt,waterAt:()=>false,waterBlocks:()=>false,fortCoreAt:()=>false,fortOccupied:()=>false,baseChargeTime:()=>1,speedAt:()=>1});
await test('bot uses existing route and shared movement: closed center detours, open center crosses both gates',()=>{
  for(const open of [false,true]){
    const runtime=createRelayWorld(map,'bot'),q=runtime.queries;if(open)runtime.relay.debugOpen();
    const bot=actor('bot','blue',740,540),human=actor('human','red',1170,540,'local'),authority=createBotAuthority(),world=collision(q);let crossed=false,minY=540,maxY=540;
    let route;
    const w=botWorld([bot,human],(p,v)=>{route??=clickRoute(p,{x:p.x+v.x,y:p.y+v.y},1920,1080,(x,y)=>!q.solidAt(x,y),40);while(route.length&&Math.hypot(route[0].x-p.x,route[0].y-p.y)<5)route.shift();const next=route[0];return next?{x:next.x-p.x,y:next.y-p.y}:{x:0,y:0};});
    for(let i=0;i<700&&Math.hypot(bot.x-human.x,bot.y-human.y)>30;i++){
      authority.run('host',w,i*1000/60,(p,intent)=>{assert.equal(intent.objective,'tag');moveActor(world,p,intent.frame.moveX,intent.frame.moveY,218,1/60,i*1000/60);});
      assert(!q.solidAt(bot.x,bot.y,12));minY=Math.min(minY,bot.y);maxY=Math.max(maxY,bot.y);if(bot.x>1143)crossed=true;
    }
    assert(crossed,`bot reaches other side (open=${open}, x=${bot.x}, y=${bot.y})`);if(open)assert(maxY-minY<1,'short open route');else assert(minY<330||maxY>750,'closed route goes around plaza');
  }
});
await test('navigation revision refreshes reaction memory without allowing client bot simulation',()=>{
  const bot=actor('bot','blue',900,540),human=actor('human','red',960,540,'local'),a=createBotAuthority(),w=botWorld([bot,human],(_p,v)=>v);w.weakness={reactionMs:[1000,1000],visionRadius:1000};w.navigationRevision=0;
  let x;a.run('host',w,0,(_p,i)=>x=i.frame.targetX);assert.equal(x,960);human.x=1050;
  a.run('host',w,10,(_p,i)=>x=i.frame.targetX);assert.equal(x,960);w.navigationRevision=1;a.run('host',w,20,(_p,i)=>x=i.frame.targetX);assert.equal(x,1050);
  a.run('client',w,30,()=>assert.fail('client must not run bots'));
});
await test('human channel can be tagged by real combat and cancels with no progress; bot can start its own channel',()=>{
  const telemetry=createRelayTelemetry(map),relay=createPowerRelay(map,'tag',{},telemetry.event),human=actor('human','red',960,420,'local'),bot=actor('bot','blue',940,420);
  relay.step(36500,[human,bot],[]);const node=relay.get().sequence[0];human.y=bot.y={A:420,B:540,C:660}[node];relay.step(1,[human,bot],[{entityId:'human',held:true}]);
  const events=[];assert(resolveTag([human,bot],'bot','human',37000,{kanal2:false,tagRange:()=>25,tagCooldownMs:()=>500,lineOfSight:()=>true},facts=>events.push(...facts)));
  telemetry.facts(events,Object.keys(relay.get().channels),false);relay.step(650,[human,bot],[{entityId:'human',held:true},{entityId:'bot',held:true}]);assert.deepEqual(relay.get().progress,{blue:0,red:0});assert.equal(telemetry.read().current.tagsDuringChannel,1);assert.equal(telemetry.read().current.tagsNearRelay,1);assert.equal(telemetry.read().current.attempts,2);
});
await test('telemetry counts attempts, wrongs, completion and reset without mutating runtime/profile',()=>{
  const t=createRelayTelemetry(map),r=createPowerRelay(map,'metrics',{},t.event),a=actor('human','blue',960,420,'local');r.step(36500,[a],[]);
  const activate=node=>{a.y={A:420,B:540,C:660}[node];r.step(1,[a],[]);r.step(1,[a],[{entityId:a.entityId,held:true}]);r.step(650,[a],[{entityId:a.entityId,held:true}]);};
  const seq=r.get().sequence;activate(seq[1]);for(const node of seq)activate(node);assert.equal(t.read().current.attempts,4);assert.equal(t.read().current.wrongInputs,1);assert.equal(t.read().current.completions,1);assert.equal(t.read().current.debugOpens,0);assert.equal(t.read().current.firstInteractionMs,36502);
  t.read().current.attempts=900;assert.equal(t.read().current.attempts,4);r.reset('next');assert.equal(t.read().current.attempts,0);assert.equal(t.read().history[0].metrics.attempts,4);r.step(66500,[],[]);assert(t.read().current.ignored);assert.equal(t.read().current.timeouts,1);
});
await test('gate-use instrumentation counts full crossings, not camping, closed travel or north detours',()=>{
  const t=createRelayTelemetry(map),b=actor('bot','blue',760,540);t.actors([b],false);b.x=850;t.actors([b],false);assert.equal(t.read().current.gateUses,0);
  b.x=760;t.actors([b],true);b.x=805;t.actors([b],true);t.actors([b],true);assert.equal(t.read().current.gateUses,0);b.x=850;t.actors([b],true);assert.equal(t.read().current.botGateUses,1);
  b.x=760;b.y=200;t.actors([b],true);assert.equal(t.read().current.gateUses,1);t.event({type:'open',elapsed:0,debug:true});assert.equal(t.read().current.debugOpens,1);assert.equal(t.read().current.completions,0);
});
