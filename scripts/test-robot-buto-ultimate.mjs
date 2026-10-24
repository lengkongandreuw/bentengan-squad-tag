import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileFunction} from 'node:vm';
import {drainBoost,moveActor} from '../modules/gameplay/movement.ts';
import {CHARACTER_BY_ID,ULTIMATE_CHARACTER_IDS,MULTIPLAYER_ULTIMATE_CHARACTER_IDS} from '../lib/characters.ts';
import {getUltimateUpgradeConfig,createDefaultUltimateUpgrades,parseUltimateUpgradeState,getPlayerUltimateUpgrade} from '../lib/player-profile/ultimate-upgrades.ts';
import {getEffectiveUltimateStats} from '../lib/player-profile/ultimate-effective-stats.ts';
import {stepUltimate,createUltimateState,resetUltimateEffects} from '../modules/gameplay/ultimate.ts';
import {ultimateEffectFor,ROBOT_JAMMER_RADIUS,BUTO_DRIVE_SPEED_MULTIPLIER,isRobotJammerActive,isSprintJammed,isIronDriveActive,ironDriveMultiplier} from '../modules/gameplay/ultimate-effects.ts';
import {createParkourController,parkourCooldownRemaining} from '../modules/gameplay/parkour.ts';
import {createNetworkUltimates} from '../lib/multiplayer/ultimates.ts';

void test('phase01 Robot and Buto descriptors have explicit kinds and preserve base combat stats',()=>{
 for(const [id,kind,name,castMs,speed,boost,tagRange,cooldown]of [
  ['robot','jammer','JAMMER FIELD',650,210,118,30,470],['buto','drive','IRON DRIVE',600,206,122,32,490],
 ]){
  const c=CHARACTER_BY_ID[id];assert.equal(c.ultimate?.kind,kind);assert.equal(c.ultimate.name,name);
  assert.equal(c.ultimate.castMs,castMs);assert.equal(c.ultimate.bannerMs,820);assert.equal(c.ultimate.strip,false);
  assert.equal(c.speed,speed);assert.equal(c.boost,boost);assert.equal(c.tagRange,tagRange);assert.equal(c.tagCooldownMs,cooldown);
  assert.equal(c.ultimate.trackFill,c.accent);assert.equal(c.ultimate.castBurst,c.accent);
 }
});
void test('Robot/Buto duration-only upgrades retain exact costs, fixed cast/recharge and Buto1.25x',()=>{
 for(const [id,castMs]of [['robot',650],['buto',600]])for(let level=0;level<=3;level++){
  const c=getUltimateUpgradeConfig(id,level);assert(c);assert.equal(c.durationMs,4000+500*level);
  assert.equal(c.cost,[0,120,280,520][level]);assert.equal(c.rechargeSeconds,45);assert.equal(c.castMs,castMs);
  assert.equal(c.speedMultiplier,id==='buto'?1.25:undefined);assert(Object.isFrozen(c));
  assert(!('jammerRadius'in c));assert(!('parkourDisabled'in c));
 }
});
void test('old profiles omit new levels safely; defaults do not require migrations or mutate existing levels',()=>{
 const defaults=createDefaultUltimateUpgrades();assert.equal(defaults.levels.robot,0);assert.equal(defaults.levels.buto,0);
 const old={ultimateUpgrades:{version:1,levels:{raja:2,kaka:1,bebe:3,ciici:2}}};
 const before=JSON.stringify(old);assert(parseUltimateUpgradeState(old.ultimateUpgrades));
 for(const id of ['robot','buto']){assert.equal(getPlayerUltimateUpgrade(old,id).level,0);assert.equal(getEffectiveUltimateStats(old,id).durationMs,4000);}
 assert.equal(JSON.stringify(old),before);
});
void test('phase07 all six skills enabled with explicit host-owned multiplayer state',()=>{
 assert.deepEqual([...ULTIMATE_CHARACTER_IDS].sort(),['bebe','buto','ciici','kaka','raja','robot']);
 assert.deepEqual([...MULTIPLAYER_ULTIMATE_CHARACTER_IDS].sort(),['bebe','buto','ciici','kaka','raja','robot']);
 for(const id of ['robot','buto']){
  const actor={entityId:id,characterId:id,controlled:true,state:'ACTIVE',team:'red',parkourUntil:0,actionUntil:0};
  const state={meter:100,impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0};
  const facts=stepUltimate([actor],actor,state,1,1000,true,{supported:MULTIPLAYER_ULTIMATE_CHARACTER_IDS,rechargeSeconds:45,castMs:600,durationMs:4000,speedMultiplier:1.25,kanal2:false});
  assert.equal(facts[0].type,'ULTIMATE_STARTED');assert.equal(state.meter,0);assert.equal(state.buffUntil,0);assert.equal(actor.action,'ultimate');
 }
});
void test('phase03 jammer exact boundary, team/state/expiry, motion, multiple sources and shield/flight neutrality',()=>{
 const robot={characterId:'robot',entityId:'r',state:'ACTIVE',team:'red',x:0,y:0};
 const target={characterId:'buto',entityId:'b',state:'ACTIVE',team:'blue',x:110,y:0,ultimateShieldUntil:9999,flight:{stage:'FLYING'}};
 const states=new Map([['r',{jammerUntil:5000,driveUntil:0}]]),lookup=p=>states.get(p.entityId);
 assert(isRobotJammerActive(robot,1000,lookup(robot)));assert(isSprintJammed(target,[robot],1000,lookup));
 target.x=110.01;assert(!isSprintJammed(target,[robot],1000,lookup));target.x=110;
 target.team='red';assert(!isSprintJammed(target,[robot],1000,lookup));target.team='blue';
 for(const state of ['IN_BASE','PRISONER','RETURNING']){robot.state=state;assert(!isSprintJammed(target,[robot],1000,lookup));}robot.state='ACTIVE';
 assert(!isSprintJammed(target,[robot],5000,lookup));robot.x=-1;assert(!isSprintJammed(target,[robot],1000,lookup));robot.x=0;
 assert.equal(isSprintJammed(target,[robot,robot],1000,lookup),true,'overlap is boolean, not stacked power');
 assert.equal(target.flight.stage,'FLYING');assert.equal(target.ultimateShieldUntil,9999);
});
void test('phase04 Drive applies to active Buto only, composes multiplicatively and survives jammer',()=>{
 const p={entityId:'b',characterId:'buto',state:'ACTIVE',team:'blue',x:0,y:0},state={jammerUntil:0,driveUntil:5000};
 assert(isIronDriveActive(p,1000,state));assert.equal(ironDriveMultiplier(p,1000,state),1.25);
 assert(Math.abs(200*1.1*1.4*ironDriveMultiplier(p,1000,state)*1.65-635.25)<1e-9);
 assert.equal(ironDriveMultiplier({...p,characterId:'raja'},1000,state),1);assert.equal(ironDriveMultiplier(p,5000,state),1);
 assert.equal(ironDriveMultiplier({...p,state:'RETURNING'},1000,state),1);
 const r={...p,entityId:'r',characterId:'robot',team:'red'};
 assert(isSprintJammed(p,[r],1000,()=>({jammerUntil:5000,driveUntil:0})));
 assert.equal(ironDriveMultiplier(p,1000,state),1.25,'jammer blocks sprint only, not Drive');
});
void test('phase03 actual local Sprint adapter cancels an active burst without drain and resumes on exit',()=>{
 const source=readFileSync('app/prototype.tsx','utf8'),start=source.indexOf('const sprintPulse = input.sprintPulse && mouseBoost;'),end=source.indexOf('const vaultBefore',start);
 assert(start>0&&end>start);
 const run=compileFunction(`
  const input={keyboardSprint:true,sprintPulse:false},selected={boostDrain:20},playerComboMultiplier=1,dt=.1,GAME_RULES={boostDurationMs:500},field={id:'kampung'},isKanalField=()=>false,flightBusy=p=>!!p.flight,mission={};
  let boostBurstUntil=prior.burst,boostLatch=prior.latch,mouseBoost=false,localSprintActive=false,dx=1,dy=0;
  ${source.slice(start,end)}
  return {burst:boostBurstUntil,latch:boostLatch,active:localSprintActive,boostActivated,driveActive};
 `,['me','players','now','prior','effectStateFor','isSprintJammed','isIronDriveActive','drainBoost']);
 const me={entityId:'b',characterId:'buto',team:'blue',state:'ACTIVE',x:0,y:0,boost:100,boostReadyAt:0};
 const robot={entityId:'r',characterId:'robot',team:'red',state:'ACTIVE',x:0,y:0};
 const lookup=p=>p===robot?{jammerUntil:5000,driveUntil:0}:{jammerUntil:0,driveUntil:5000};
 const first=run(me,[me,robot],1000,{burst:3000,latch:true},lookup,isSprintJammed,isIronDriveActive,drainBoost);
 assert.equal(first.burst,0);assert.equal(first.active,false);assert.equal(first.driveActive,true);assert.equal(me.boost,100);assert.equal(me.boostReadyAt,0);
 me.x=111;const next=run(me,[me,robot],1100,first,lookup,isSprintJammed,isIronDriveActive,drainBoost);
 assert.equal(next.active,true);assert.equal(next.boostActivated,true);assert.equal(me.boost,98);
});
void test('phase04 Drive retains normal collision and tag/shield fields',()=>{
 const p={entityId:'b',characterId:'buto',team:'blue',state:'ACTIVE',x:50,y:50,vx:0,vy:0,parkourUntil:0,ultimateShieldUntil:0,tagCooldown:800,flight:null};
 const world={width:500,height:500,obstacles:[{asset:'hall',x:100,y:0,w:80,h:400}],bases:{blue:{x:0,y:0},red:{x:450,y:450}},baseRadius:20,baseChargeTime:()=>1,fortOccupied:()=>false,fortCoreAt:()=>false,speedAt:()=>1,waterAt:()=>false,waterBlocks:()=>false};
 for(let tick=0;tick<60;tick++)moveActor(world,p,1,0,200*ironDriveMultiplier(p,1000+tick*16,{jammerUntil:0,driveUntil:5000}),1/60,1000+tick*16);
 assert(p.x<100,'solid wall still blocks');assert.equal(p.ultimateShieldUntil,0);assert.equal(p.tagCooldown,800);assert.equal(p.flight,null);
});
void test('phase04 denied Parkour consumes no boost/cooldown and leaves no delayed jump after Drive',()=>{
 const parkour=createParkourController(),p={entityId:'b',state:'ACTIVE',boost:100,parkourUntil:0,actionUntil:0,fallSafeUntil:0,boostReadyAt:0,x:0,y:0};
 const landing=()=>({x:54,y:0,crossedWater:false});
 const denied=parkour.step(p,true,true,{x:1,y:0},1,1000,landing,'IRON_DRIVE');
 assert.equal(denied.reason,'IRON_DRIVE');assert(!denied.performed);assert.equal(p.boost,100);assert.equal(parkourCooldownRemaining(p,1000),0);
 assert(!parkour.step(p,true,false,{x:1,y:0},1,1100,landing).performed,'rejected request cannot jump later');
 parkour.step(p,false,false,{x:1,y:0},1,1150,landing);
 assert(parkour.step(p,true,true,{x:1,y:0},1,1200,landing).performed);assert.equal(p.boost,92);
});
void test('phase02 resolver has no invented non-flight effect and keeps fixed powers outside upgrades',()=>{
 assert.equal(ROBOT_JAMMER_RADIUS,110);assert.equal(BUTO_DRIVE_SPEED_MULTIPLIER,1.25);
 for(const [id,effect]of [['raja','speed'],['kaka','shield'],['robot','jammer'],['buto','drive'],['bebe',null],['ciici',null],['jago',null],['unknown',null]])assert.equal(ultimateEffectFor(id),effect);
});
void test('phase02 applies each effect once to its dedicated timer, without cross-contaminating other effects',()=>{
 for(const [id,castMs,effect,timer]of [['raja',3200,'speed','buffUntil'],['kaka',3600,'shield','shieldUntil'],['robot',650,'jammer','jammerUntil'],['buto',600,'drive','driveUntil']]){
  const actor={entityId:id,characterId:id,controlled:true,state:'ACTIVE',team:'red',parkourUntil:0,actionUntil:0,vx:10,vy:10};
  const ally={entityId:'ally',team:'red',ultimateShieldUntil:0};
  const state=createUltimateState();state.meter=100;
  const rules={supported:new Set([id]),rechargeSeconds:45,castMs,durationMs:4500,speedMultiplier:1.4,kanal2:false};
  assert.equal(stepUltimate([actor,ally],actor,state,0,1000,true,rules)[0].type,'ULTIMATE_STARTED');
  assert.equal(actor.vx,0);assert.equal(actor.actionUntil,1000+castMs);
  assert.deepEqual(stepUltimate([actor,ally],actor,state,0,999+castMs,false,rules),[]);
  const applied=stepUltimate([actor,ally],actor,state,0,1000+castMs,false,rules);
  assert.equal(applied[0].effect,effect);assert.equal(state[timer],5500+castMs);
  for(const field of ['buffUntil','shieldUntil','jammerUntil','driveUntil'])if(field!==timer)assert.equal(state[field],0);
  assert.equal(ally.ultimateShieldUntil,effect==='shield'?5500+castMs:0);
  if(effect==='drive')assert.equal(applied[0].speedMultiplier,1.25);
  if(effect==='jammer')assert.equal(applied[0].speedMultiplier,1);
  assert.deepEqual(stepUltimate([actor,ally],actor,state,0,1100+castMs,false,rules),[]);
 }
});
void test('phase02 reset clears all effect and cast timers, keeps charge and isolates human states',()=>{
 const authority=createNetworkUltimates([{entityId:'a'},{entityId:'b'}]);
 const state=authority.get('a');Object.assign(state,{meter:37,impactAt:100,impactApplied:true,buffUntil:200,shieldUntil:300,jammerUntil:400,driveUntil:500});
 assert.equal(authority.get('b').jammerUntil,0);authority.reset();
 assert.deepEqual(state,{...createUltimateState(),meter:37});
 const copy=createUltimateState();copy.driveUntil=500;resetUltimateEffects(copy);assert.equal(copy.driveUntil,0);
});
void test('phase02 unknown supported actor cannot cast a fake Raja surge',()=>{
 const actor={entityId:'jago',characterId:'jago',controlled:true,state:'ACTIVE',team:'red',parkourUntil:0,actionUntil:0};
 const state=createUltimateState();state.meter=100;
 assert.deepEqual(stepUltimate([actor],actor,state,1,1000,true,{supported:new Set(['jago']),rechargeSeconds:45,castMs:600,durationMs:4000,speedMultiplier:1.4,kanal2:false}),[]);
 assert.deepEqual(state,{...createUltimateState(),meter:100});
});
