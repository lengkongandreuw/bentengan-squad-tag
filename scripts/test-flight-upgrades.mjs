import test from 'node:test';
import assert from 'node:assert/strict';
import {flightConfig,startFlight,advanceFlight,flightBusy,isFlying,flightPassesObstacle} from '../modules/gameplay/flight-ultimate.ts';
import {stepFlight} from '../modules/gameplay/ultimate.ts';
import {moveActor,movementBlocked,PARKOUR_LOW_ASSETS} from '../modules/gameplay/movement.ts';
import {solidAt,flightSolidAt} from '../lib/map-studio-model.js';
import {purchaseUltimateUpgrade} from '../lib/player-profile/ultimate-purchase.ts';
import {snapshotUltimateStats} from '../lib/player-profile/ultimate-effective-stats.ts';
const profile=()=>({schemaVersion:1,id:'flight-unit',username:'FlightQA',firstJoin:'2026-10-23',menang:0,kalah:0,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:450,unlockedCharacters:['raja','kaka','bebe','ciici'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},economy:{version:1,tokenBalance:1000,lifetimeTokenEarned:1000,lifetimeTokenSpent:0,recentTransactions:[]},ultimateUpgrades:{version:1,levels:{raja:1,kaka:2}}});
void test('Bebe/Ciici return to normal immediately at expiry, regardless of authored landing duration',()=>{
 for(const id of ['bebe','ciici']){
  const config=flightConfig(id),p={flight:startFlight({x:80,y:300})};let safe=0,ended=0;
  p.flight=advanceFlight(p.flight,config,1,true);
  p.flight=advanceFlight(p.flight,config,config.flightDuration,false,{onSafeLanding:()=>safe++,onFlightEnd:()=>ended++});
  assert.equal(p.flight,null);assert(!flightBusy(p));assert(!isFlying(p));assert.equal(safe,1);assert.equal(ended,1);
  const old={...startFlight({x:80,y:300}),stage:'FLIGHT_LANDING'};
  assert.equal(advanceFlight(old,config,0,false),null,'legacy landing states cannot stall either');
 }
});
void test('flight passes every parkour-class obstacle, including native editor colliders, but not buildings',()=>{
 for(const asset of PARKOUR_LOW_ASSETS)assert(flightPassesObstacle({asset}),asset);
 assert(!flightPassesObstacle({asset:'hall'}));assert(!flightPassesObstacle({asset:'parkBarrier',hidden:true}));
 const m={objects:[{behavior:'parkour',nativeCollision:'rect',shape:'rect',x:150,y:100,w:80,h:400,rotation:0},{behavior:'solid',shape:'rect',x:600,y:100,w:80,h:400,rotation:0}]};
 assert(solidAt(m,180,300));assert(!flightSolidAt(m,180,300));assert(flightSolidAt(m,620,300));
 const world={width:1000,height:600,obstacles:[],kanal:true,kanal2:true,bases:{blue:{x:50,y:50},red:{x:950,y:50}},baseRadius:30,baseChargeTime:()=>1,fortOccupied:()=>false,fortCoreAt:()=>false,studioSolidAt:(...args)=>solidAt(m,...args),studioFlightSolidAt:(...args)=>flightSolidAt(m,...args),waterAt:x=>x>=300&&x<=400,waterBlocks:x=>x>=300&&x<=400,speedAt:()=>1};
 for(const id of ['bebe','ciici']){
  const p={id:0,entityId:'flying-'+id,characterId:id,state:'ACTIVE',team:'blue',x:80,y:300,vx:0,vy:0,parkourUntil:0,fallSafeUntil:0,waterEnteredAt:0,flight:startFlight({x:80,y:300})};
  p.flight=advanceFlight(p.flight,flightConfig(id),1,true);
  assert.equal(moveActor(world,p,1,0,200,1,1000),null);assert(p.x>230,'cross parkour with no jump input');
  assert.equal(moveActor(world,p,1,0,200,1,2000),null);assert(p.x>400,'cross river with no jump input');assert.equal(p.waterEnteredAt,0);
  moveActor(world,p,1,0,200,1,3000);assert(p.x<600,'buildings remain solid');
  assert(movementBlocked(world,180,300,{...p,flight:null},3000),'normal movement still blocks parkour');
 }
});
void test('safe recovery at expiry is immediate and never leaves a normal character inside water or parkour',()=>{
 for(const id of ['bebe','ciici']){
  const p={characterId:id,state:'ACTIVE',x:350,y:300,lastX:350,lastY:300,flight:startFlight({x:80,y:300})};
  p.flight=advanceFlight(p.flight,flightConfig(id),1,true);
  const result=stepFlight(p,flightConfig(id),4,false,(x,y)=>x<280&&x>34&&y>58&&y<568);
  assert(!result.landingFailed);assert.equal(p.flight,null);assert(p.x<280);assert.equal(p.lastX,p.x);
  assert.equal(result.facts.filter(f=>f.name==='ultimate_flight_ended').length,1);
 }
});
void test('DOI buys duration-only flight upgrades; duplicate/locked/insufficient purchases never double debit',()=>{
 for(const id of ['bebe','ciici']){
  let p=profile();const before=structuredClone(p),captured=snapshotUltimateStats(p,id);
  assert.equal(captured.durationMs,4000);
  for(const [level,cost] of [[1,120],[2,280],[3,520]]){
   const tx=id+'-'+level,result=purchaseUltimateUpgrade(p,id,tx,level-1);
   assert(result.applied);assert.equal(result.currentBalance,p.economy.tokenBalance-cost);p=result.profile;
   const stats=snapshotUltimateStats(p,id);assert.equal(stats.durationMs,4000+level*1000);assert.equal(stats.rechargeSeconds,45);
   assert.equal(flightConfig(id,stats.durationMs).flightDuration,4+level);
   assert.equal(purchaseUltimateUpgrade(p,id,tx,level-1).reason,'duplicate');
   assert.equal(p.ultimateUpgrades.levels.raja,1);assert.equal(p.ultimateUpgrades.levels.kaka,2);
  }
  assert.equal(p.economy.tokenBalance,80);assert.equal(purchaseUltimateUpgrade(p,id,'max').reason,'max_level');
  assert.equal(captured.durationMs,4000,'match snapshot remains immutable');assert.equal(before.economy.tokenBalance,1000);
  const empty=profile();empty.economy.tokenBalance=0;assert.equal(purchaseUltimateUpgrade(empty,id,'poor').reason,'insufficient_balance');
  const locked=profile();locked.progression.xp=0;locked.progression.unlockedCharacters=['raja','kaka'];assert.equal(purchaseUltimateUpgrade(locked,id,'locked').reason,'character_locked');
 }
});
