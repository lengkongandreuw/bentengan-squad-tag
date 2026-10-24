import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {actionsForCharacter,slotAllowed,slotLoop,studioCastSlot} from '../lib/sprite-studio-model.js';
import {planBatchEdit} from '../lib/sprite-studio-batch.js';
import {createNetworkUltimates} from '../lib/multiplayer/ultimates.ts';
import {networkUltimateRulesFor} from '../lib/multiplayer/ultimate-rules.ts';
import {createRemoteHumanMovement,createRemoteInputBuffer,neutralInput} from '../lib/multiplayer/remote-input.ts';
import {MULTIPLAYER_PROTOCOL_VERSION,parseProtocolMessage,parseNetworkGameEvent} from '../lib/multiplayer/protocol.ts';
import {GAME_SNAPSHOT_VERSION,createSnapshot,parseSnapshot} from '../lib/game-core/snapshot.ts';
import {isSprintJammed,isIronDriveActive,ironDriveMultiplier} from '../modules/gameplay/ultimate-effects.ts';
import {purchaseUltimateUpgrade} from '../lib/player-profile/ultimate-purchase.ts';
import {snapshotUltimateStats} from '../lib/player-profile/ultimate-effective-stats.ts';
const actor=(id,characterId,team='blue')=>({entityId:id,characterId,team,controller:'remote',state:'ACTIVE',x:200,y:200,vx:0,vy:0,lastX:200,lastY:200,boost:100,boostReadyAt:0,parkourUntil:0,actionUntil:0,waterEnteredAt:0,ultimateShieldUntil:0});
const clip=id=>({asset:`sprite-studio/${id}/${'a'.repeat(64)}.webp`,width:40,height:10,frames:Array.from({length:4},(_,i)=>({x:i*10,y:0,width:10,height:10})),fps:10,scale:1,x:0,y:0,pivotX:.5,pivotY:1,loop:true,mirror:false});
const profile=()=>({schemaVersion:1,id:'upgrade-qa',username:'QA',firstJoin:'2026-10-23',menang:0,kalah:0,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:6000,unlockedCharacters:['raja','kaka','robot','buto'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},economy:{version:1,tokenBalance:1000,lifetimeTokenEarned:1000,lifetimeTokenSpent:0,recentTransactions:[]},ultimateUpgrades:{version:1,levels:{raja:1,kaka:2}}});

void test('phase05 cast slot supports eight directions only for Robot/Buto; batch cannot make it loop',()=>{
 for(const id of ['robot','buto']){
  assert(actionsForCharacter(id).includes('ultimate_cast'));
  assert(slotAllowed(id,'ultimate_cast.northwest'));assert(!slotLoop('ultimate_cast.east'));
  const slots={idle:clip(id),ultimate:clip(id),ultimate_cast:clip(id),'ultimate_cast.east':clip(id)};
  assert.equal(studioCastSlot(slots,'east'),'ultimate_cast.east');assert.equal(studioCastSlot(slots,'north'),'ultimate_cast');
  assert.equal(studioCastSlot({idle:clip(id),ultimate:clip(id)},'north'),'idle');assert.equal(studioCastSlot({ultimate:clip(id)},'north'),null);
  const c={characters:{[id]:slots},character:id,action:'ultimate_cast',scope:'action'};
  const plan=planBatchEdit(c,['ultimate_cast','ultimate_cast.east'],{loop:{mode:'set',value:true},scale:{mode:'set',value:1.2}});
  assert.equal(plan.changes.ultimate_cast.loop,false);assert.equal(plan.changes['ultimate_cast.east'].loop,false);
 }
 for(const id of ['default','bebe','ciici','raja','lala'])assert(!slotAllowed(id,'ultimate_cast'));
});

void test('phase05 actual runtime resolver stretches one-shot frames to cast time then returns to normal movement',()=>{
 const cache=new Map(),require=createRequire(import.meta.url);
 const custom={version:1,characters:{robot:{idle:clip('robot'),run:clip('robot'),ultimate_cast:clip('robot')},buto:{idle:clip('buto'),run:clip('buto')}}};
 function load(file){
  const absolute=path.resolve(file);if(absolute.endsWith('config\\sprite-studio.json'))return custom;
  if(absolute.endsWith('config\\sprite-runtime.json'))return {version:1,assets:{}};
  if(cache.has(absolute))return cache.get(absolute).exports;
  if(absolute.endsWith('.json'))return JSON.parse(fs.readFileSync(absolute,'utf8'));
  const mod={exports:{}};cache.set(absolute,mod);
  const output=ts.transpileModule(fs.readFileSync(absolute,'utf8').replaceAll('import.meta.env','({BASE_URL:"/"})'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText.replaceAll('import.meta.env','({BASE_URL:"/"})');
  const local=s=>{if(!s.startsWith('.'))return require(s);const base=path.resolve(path.dirname(absolute),s);return load([base,base+'.ts',base+'.js',base+'.json'].find(f=>fs.existsSync(f)));};
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(local,mod,mod.exports);return mod.exports;
 }
 const before=globalThis.Image;globalThis.Image=class {complete=true;naturalWidth=40;naturalHeight=10;};
 try{
  const runtime=load('lib/sprite-studio.ts');runtime.studioImages('robot');runtime.studioImages('buto');
  const resolve=runtime.createStudioResolver(),base={vx:0,vy:0,now:1000,state:'ACTIVE',result:null,ready:false,action:'ultimate',parkour:false};
  assert.equal(resolve('robot','r',{...base,ultimateProgress:0}).frame.x,0);
  const middle=resolve('robot','r',{...base,now:1325,ultimateProgress:.5});assert.equal(middle.frame.x,20);assert.equal(middle.clip.loop,false);
  assert.equal(resolve('robot','r',{...base,now:1649,ultimateProgress:.999}).frame.x,30);
  assert.equal(resolve('robot','r',{...base,now:1650,action:null,vx:200}).clip,custom.characters.robot.run);
  assert.equal(resolve('buto','b',{...base,ultimateProgress:.5}).clip.asset,custom.characters.buto.idle.asset);
 }finally{if(before===undefined)delete globalThis.Image;else globalThis.Image=before;}
});

void test('phase06 all DOI tiers persist duration only; duplicate/stale/locked/poor/max requests never debit twice',()=>{
 for(const id of ['robot','buto']){
  let p=profile();const captured=snapshotUltimateStats(p,id);
  for(const [level,cost]of [[1,120],[2,280],[3,520]]){
   const tx=`${id}-${level}`,purchase=purchaseUltimateUpgrade(p,id,tx,level-1);assert(purchase.applied);
   assert.equal(purchase.currentBalance,p.economy.tokenBalance-cost);p=JSON.parse(JSON.stringify(purchase.profile));
   const stats=snapshotUltimateStats(p,id);assert.equal(stats.durationMs,4000+500*level);assert.equal(stats.castMs,id==='robot'?650:600);assert.equal(stats.rechargeSeconds,45);
   assert.equal(stats.speedMultiplier,id==='buto'?1.25:undefined);
   assert.equal(purchaseUltimateUpgrade(p,id,tx,level-1).reason,'duplicate');
   assert.equal(purchaseUltimateUpgrade(p,id,tx+'stale',level-1).reason,'level_mismatch');
   assert.equal(p.ultimateUpgrades.levels.raja,1);assert.equal(p.ultimateUpgrades.levels.kaka,2);
  }
  assert.equal(p.economy.tokenBalance,80);assert.equal(purchaseUltimateUpgrade(p,id,'max').reason,'max_level');assert.equal(captured.durationMs,4000);
  const poor=profile();poor.economy.tokenBalance=0;assert.equal(purchaseUltimateUpgrade(poor,id,'poor').reason,'insufficient_balance');
  const locked=profile();locked.progression.xp=0;locked.progression.unlockedCharacters=['raja','kaka'];assert.equal(purchaseUltimateUpgrade(locked,id,'locked').reason,'character_locked');
 }
});

void test('phase07 host rules use real descriptors, independent meters and effects; reset never carries a field',()=>{
 const robot=actor('r','robot'),buto=actor('b','buto','red'),players=[robot,buto],authority=createNetworkUltimates(players),rules=p=>networkUltimateRulesFor(p,false);
 assert.equal(rules(robot).castMs,650);assert.equal(rules(buto).castMs,600);assert.equal(rules(buto).speedMultiplier,1.25);
 const tick=(frames,dt,now)=>authority.tick(players,new Map(frames),dt,now,rules,()=>true,()=>true,()=>{});
 tick([],45,1000);for(const p of players)assert.equal(authority.get(p.entityId).meter,100);
 const starts=tick(players.map(p=>[p.entityId,{entityId:p.entityId,ultimate:true}]),0,1000);assert.equal(starts.facts.length,2);
 assert.equal(tick([],0,1599).facts.length,0);
 assert.equal(tick([],0,1600).facts[0].effect,'drive');assert.equal(tick([],0,1650).facts[0].effect,'jammer');
 const stateFor=p=>authority.get(p.entityId);assert(isSprintJammed(buto,players,1700,stateFor));assert.equal(ironDriveMultiplier(buto,1700,stateFor(buto)),1.25);
 assert.equal(authority.speed(buto,players,1700,rules),1,'neither skill invents Raja team speed');
 robot.state='PRISONER';assert(!isSprintJammed(buto,players,1800,stateFor));robot.state='ACTIVE';
 authority.reset();for(const p of players){const s=stateFor(p);assert.equal(s.driveUntil,0);assert.equal(s.jammerUntil,0);assert.equal(s.impactAt,0);}
});

void test('phase07 remote Sprint cannot bypass Jammer; Drive keeps self speed but denies Parkour without spending',()=>{
 const robot=actor('r','robot'),buto=actor('b','buto','red'),players=[robot,buto],timers={jammerUntil:5000,driveUntil:5000};
 const lookup=()=>timers,move=createRemoteHumanMovement(),speeds=[];
 const hooks={move:(p,x,y,speed)=>{speeds.push(speed);p.vx=x*speed;p.vy=y*speed;},landing:p=>({x:p.x+100,y:p.y,crossedWater:false}),near:()=>true,returnVector:()=>({x:0,y:0}),combo:()=>1.4,water:false,boostDurationMs:500,
  sprintJammed:(p,now)=>isSprintJammed(p,players,now,lookup),driveActive:(p,now)=>isIronDriveActive(p,now,lookup(p)),driveMultiplier:(p,now)=>ironDriveMultiplier(p,now,lookup(p))};
 const frame={entityId:'b',sequence:1,...neutralInput(),moveX:1,sprint:true,keyboardSprint:true,parkour:true,parkourPulse:true};
 const stats={speed:200,boostDrain:20,boostMultiplier:1.5,agility:1};
 move(buto,frame,stats,.1,1000,hooks);assert.equal(buto.boost,100);assert.equal(buto.parkourUntil,0);assert.equal(speeds.at(-1),200*1.4*1.25);
 buto.x=311;move(buto,{...frame,parkour:false,parkourPulse:false},stats,.1,1100,hooks);assert.equal(buto.boost,98.4);assert.equal(speeds.at(-1),200*1.4*1.25*1.5);
 move(buto,{...frame,sprint:false,keyboardSprint:false,parkour:false,parkourPulse:false},stats,.1,5100,hooks);assert.equal(buto.parkourUntil,0,'no buffered jump after expiry');
 move(buto,{...frame,sprint:false,keyboardSprint:false},stats,.1,5200,hooks);assert(buto.parkourUntil>5200,'fresh Parkour request works after expiry');
});

void test('phase07 v2 wire rejects legacy, forged effect timers/speed and wrong owners; explicit new events roundtrip',()=>{
 assert.equal(MULTIPLAYER_PROTOCOL_VERSION,2);assert.equal(GAME_SNAPSHOT_VERSION,2);
 const message={version:2,type:'INPUT',matchId:'match-1',entityId:'b',sequence:1,input:neutralInput()},buffer=createRemoteInputBuffer('match-1',new Map([['b','peer-1']]),1000,800);
 assert.equal(parseProtocolMessage({...message,version:1}),null);
 for(const extra of [{driveActive:true},{speed:999},{jammerUntil:99999},{driveUntil:99999}])assert.equal(parseProtocolMessage({...message,input:{...message.input,...extra}}),null);
 assert(!buffer.accept('attacker',message,1000));assert(buffer.accept('peer-1',message,1000));assert(!buffer.accept('peer-1',message,1001));
 for(const [effect,speedMultiplier]of [['jammer',1],['drive',1.25]]){
  const e={type:'ULTIMATE_APPLIED',actorId:'b',effect,durationMs:4000,speedMultiplier};assert.deepEqual(parseNetworkGameEvent(e),e);
  assert(parseProtocolMessage({version:2,type:'GAME_EVENT',matchId:'match-1',tick:1,eventId:'evt-1',event:e}));
 }
});

void test('phase07 snapshot carries independent effect deadlines and rejects duplicate/unknown caster references',()=>{
 const entities=['robot','buto'].map((characterId,i)=>({...actor(`actor-${i}`,characterId),team:i?'green':'red',headingRadians:0,aiSeed:0,
  exitOrder:1,baseCharge:0,exitDeadline:0,fortCharge:0,prisonOwner:null,prisonIndex:0,rescueShieldUntil:0,
  waterFallUntil:0,fallNoticeUntil:0,tagDirection:null,flight:null,ultimateMeter:2}));
 const effects=entities.map((p,i)=>({actorId:p.entityId,buffUntil:0,shieldUntil:0,jammerUntil:i?0:5000,driveUntil:i?5100:0}));
 const team=()=>({score:0,combo:{step:0,expiresAt:0,surgeUntil:0},allHeldSeconds:0});
 const canonical={matchId:'match-1',arenaId:'kampung',tick:1,observedAtMs:1000,simulationTimeMs:1000,phase:'PLAYING',paused:false,round:1,timeRemainingSeconds:200,phaseUntilMs:null,suddenDeath:false,
  entities,teams:{red:team(),green:team()},ultimate:{actorId:'actor-0',impactAt:0,impactApplied:true,buffUntil:0,shieldUntil:0,effectiveStats:null,actors:effects},refills:[],rescueRequest:null,result:null};
 const snapshot=createSnapshot(canonical),wire=JSON.parse(JSON.stringify(snapshot));assert(parseSnapshot(wire));assert.deepEqual(wire.ultimate.actors,effects);
 for(const alter of [s=>s.version=1,s=>s.ultimate.actors.push(s.ultimate.actors[0]),s=>s.ultimate.actors[0].actorId='missing',s=>s.ultimate.actors[0].driveUntil=Infinity,s=>s.ultimate.actors[0].driveActive=true]){
  const bad=structuredClone(snapshot);alter(bad);assert.equal(parseSnapshot(bad),null);
 }
 wire.ultimate.actors[0].jammerUntil=0;assert.equal(canonical.ultimate.actors[0].jammerUntil,5000,'snapshot detached from authority');
});
