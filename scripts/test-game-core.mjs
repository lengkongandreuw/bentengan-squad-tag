import assert from 'node:assert/strict';
import {orderArenaSelection} from '../modules/ui/map-selection-assets.ts';
import {getProgressionArenaId} from '../lib/player-profile/arena-identity.ts';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import ts from 'typescript';

const nativeRequire=createRequire(import.meta.url),cache=new Map();

function protocolFixtures(){
  const end=snapshots.createSnapshot(state.describeMatch(truth([actor(),enemy()])));
  const start={...structuredClone(end),phase:'COUNTDOWN',score:{red:0,green:0},result:null,phaseUntilMs:4000};
  const input={moveX:1,moveY:0,sprint:true,keyboardSprint:false,sprintPulse:true,parkour:false,ultimate:false,rescue:false,pause:false,target:{x:400,y:300}};
  const v=protocol.MULTIPLAYER_PROTOCOL_VERSION;
  return [
    {version:v,type:'HELLO',peerId:'peer-1',name:'Pemain 1'},
    {version:v,type:'HELLO_ACK',hostPeerId:'host',assignedPeerId:'peer-1',sessionId:'session-1'},
    {version:v,type:'READY',peerId:'peer-1',ready:true},
    {version:v,type:'PLAYER_SELECTION',peerId:'peer-1',characterId:'bebe',team:'green'},
    {version:v,type:'INPUT',matchId:end.matchId,entityId:'entity-0001',sequence:1,input},
    {version:v,type:'SNAPSHOT',matchId:end.matchId,tick:end.tick,snapshot:end},
    {version:v,type:'GAME_EVENT',matchId:end.matchId,tick:end.tick,eventId:'event-1',event:{type:'PLAYER_TAGGED',actorId:'entity-0001',targetId:'entity-0002',x:200,y:200}},
    {version:v,type:'MATCH_START',matchId:start.matchId,arenaId:start.arenaId,startAtMs:1000,snapshot:start},
    {version:v,type:'MATCH_END',matchId:end.matchId,tick:end.tick,winner:'red',reason:'BENTENG DIREBUT'},
    {version:v,type:'PING',nonce:1,sentAtMs:1000},{version:v,type:'PONG',nonce:1,sentAtMs:1000},
    {version:v,type:'PLAYER_LEFT',peerId:'peer-1',entityId:'entity-0001',reason:'disconnected'},
  ];
}
void test('13 all twelve versioned messages encode/decode to detached validated data without transport',()=>{
  const fixtures=protocolFixtures();assert.equal(fixtures.length,12);
  for(const m of fixtures){
    const copy=protocol.parseProtocolMessage(m);assert.deepEqual(copy,m);assert.notEqual(copy,m);
    assert.equal(protocol.isProtocolMessage(m),true);
    assert.deepEqual(protocol.decodeProtocolMessage(protocol.encodeProtocolMessage(m)),m);
  }
  const source=fs.readFileSync('lib/multiplayer/protocol.ts','utf8');
  assert.doesNotMatch(source,/\b(?:RTCPeerConnection|WebSocket|fetch|window|document|localStorage)\b/);
});
void test('13 message guards reject bad versions/types/keys/getters and inconsistent snapshot envelopes',()=>{
  for(const m of protocolFixtures())for(const alter of [v=>v.version=2,v=>v.type='UNKNOWN',v=>v.extra=true,v=>delete v.version]){
    const bad=structuredClone(m);alter(bad);assert.equal(protocol.parseProtocolMessage(bad),null);assert.equal(protocol.isProtocolMessage(bad),false);
  }
  const fixtures=protocolFixtures(),bad=[];
  const change=(index,mutate)=>{const m=structuredClone(fixtures[index]);mutate(m);bad.push(m);};
  change(0,m=>m.name='   ');change(0,m=>m.peerId='');change(0,m=>m.name='a'.repeat(33));
  change(2,m=>m.ready='true');change(3,m=>m.characterId='alien');change(3,m=>m.team='blue');
  change(4,m=>m.sequence=0);change(4,m=>m.sequence=1.5);change(4,m=>m.input.moveX=2);
  change(4,m=>m.input.target.x=Infinity);change(4,m=>m.input.sprint=false);change(4,m=>delete m.input.pause);
  change(5,m=>m.tick++);change(5,m=>m.matchId='different');change(5,m=>m.snapshot.entities[0].state='INVALID');
  change(6,m=>m.event.actorId=m.event.targetId);change(6,m=>m.event.x=NaN);
  change(7,m=>m.arenaId='different');change(7,m=>m.snapshot.phase='MATCH_OVER');
  change(8,m=>m.winner='blue');change(9,m=>m.sentAtMs=-1);change(10,m=>m.nonce=Infinity);change(11,m=>m.reason='invalid');
  for(const m of bad){assert.equal(protocol.parseProtocolMessage(m),null);assert.throws(()=>protocol.encodeProtocolMessage(m));}
  let calls=0;const hostile={...fixtures[0]};Object.defineProperty(hostile,'type',{enumerable:true,get(){calls++;return 'HELLO';}});
  assert.equal(protocol.parseProtocolMessage(hostile),null);assert.equal(calls,0);
  const hostilePayload=structuredClone(fixtures[4]);Object.defineProperty(hostilePayload.input,'moveX',{enumerable:true,get(){calls++;return 1;}});
  assert.equal(protocol.parseProtocolMessage(hostilePayload),null);assert.equal(calls,0);
  for(const v of [null,undefined,[],new Date(),Object.create(fixtures[0]),new Proxy({},{getPrototypeOf(){throw Error('proxy');}})])
    assert.equal(protocol.parseProtocolMessage(v),null);
});
void test('13 event conversion has explicit canonical teams and validates every event variant',()=>{
  const events=[
    {type:'PLAYER_TAGGED',actorId:'a',targetId:'b',x:10,y:20},{type:'PLAYER_CAPTURED',actorId:'a',targetId:'b'},
    {type:'PLAYER_RESCUED',actorId:'a',targetIds:['b','c'],x:10,y:20},{type:'ULTIMATE_STARTED',actorId:'a',flight:true},
    {type:'ULTIMATE_APPLIED',actorId:'a',effect:'shield',durationMs:5000,speedMultiplier:1.4},
    {type:'FORT_ENTERED',actorId:'a',team:'blue'},{type:'FORT_CAPTURED',actorId:'a',team:'red',reason:'BENTENG DIREBUT'},{type:'HELP_REQUESTED',actorId:'a'},
    {type:'ROUND_ENDED',team:'blue',reason:'TEST'},{type:'MATCH_ENDED',team:'red',reason:'TEST'},
    {type:'FORCED_EXIT',actorId:'a'},{type:'BOOST_RECOVERED',actorId:'a'},
  ];
  for(const event of events){const wire=protocol.toNetworkGameEvent(event);
    assert.deepEqual(protocol.parseNetworkGameEvent(JSON.parse(JSON.stringify(wire))),wire);
    if('team' in event)assert.equal(wire.team,event.team==='blue'?'red':'green');
    assert.equal(protocol.parseNetworkGameEvent({...wire,extra:1}),null);
  }
  for(const ids of [[],['b','b'],['a'],Array(33).fill('b')])
    assert.equal(protocol.parseNetworkGameEvent({type:'PLAYER_RESCUED',actorId:'a',targetIds:ids,x:0,y:0}),null);
  assert.equal(protocol.parseNetworkGameEvent({type:'FORT_ENTERED',actorId:'a',team:'blue'}),null);
});
void test('13 bounded JSON decoding rejects junk/oversize and payload mutations cannot touch source',()=>{
  for(const json of ['', '{', 'null', '[]', '{"version":2,"type":"PING"}', ' '.repeat(protocol.MAX_PROTOCOL_MESSAGE_CHARS+1)])
    assert.equal(protocol.decodeProtocolMessage(json),null);
  const m=protocolFixtures()[5],parsed=protocol.parseProtocolMessage(m),before=structuredClone(m);
  parsed.snapshot.entities[0].x=999;assert.deepEqual(m,before);
  const cyclic={};cyclic.version=1;cyclic.type='HELLO';cyclic.peerId=cyclic;cyclic.name='x';
  assert.equal(protocol.parseProtocolMessage(cyclic),null);
  for(let i=0;i<256;i++){const m=protocolFixtures()[4];m.input.moveY=i+2;assert.equal(protocol.parseProtocolMessage(m),null);}
});

void test('12 snapshot JSON roundtrip preserves render/protection/flight data without assets/maps/profile',()=>{
  const a=actor({flight:flight.startFlight({x:200,y:200}),visualTagVector:{x:10,y:-10},ultimateShieldUntil:3000}),canonical=state.describeMatch(truth([a,enemy()]));
  canonical.privateProfile={tokenBalance:999};canonical.images={source:'SECRET_ASSET'};
  const s=snapshots.createSnapshot(canonical),before=structuredClone(canonical);
  assert.deepEqual(snapshots.parseSnapshot(JSON.parse(JSON.stringify(s))),s);
  assert.equal(s.entities[0].character,'raja');assert.equal(s.entities[0].team,'red');assert.equal(s.entities[1].team,'green');
  assert.equal(s.entities[0].flight.direction,'south');assert.equal(s.entities[0].ultimateShieldUntil,3000);
  assert.equal(s.phaseUntilMs,null);assert.deepEqual(s.entities[0].tagDirection,{x:10,y:-10});
  const json=JSON.stringify(s);assert.doesNotMatch(json,/SECRET_ASSET|tokenBalance|privateProfile|effectiveStats|roundStats|matchStats|capturedIds|lastGround|baseRadius/);
  assert.ok(json.length<JSON.stringify(canonical).length);
  s.entities[0].tagDirection.x=999;s.refills[0].x=999;
  assert.deepEqual(canonical,before);
});
void test('12 strict snapshot parser rejects malformed fields, duplicate identities, invalid references and phase truth',()=>{
  const good=snapshots.createSnapshot(state.describeMatch(truth([actor(),enemy()])));
  const mutations=[s=>s.version=2,s=>s.tick=.5,s=>s.timeMs=Infinity,s=>s.arenaId='',s=>s.entities[0].x=NaN,
    s=>s.entities[0].character='unknown',s=>s.entities[0].team='blue',s=>s.entities[0].action='hack',
    s=>s.entities[1].id=s.entities[0].id,s=>s.entities[0].flight={stage:'FLYING'},s=>s.entities[0].ultimateMeter=101,
    s=>s.entities=[],s=>s.entities=Array(33).fill(s.entities[0]),s=>s.ultimate.actorId='missing',
    s=>s.rescueRequest.requesterId='missing',s=>s.refills.push({...s.refills[0]}),s=>s.phase='PLAYING',
    s=>s.result=null,s=>s.result.complete=false,s=>s.score.red=0,s=>s.score.red=3,s=>s.combos.green.step=4,
    s=>s.map={},s=>delete s.entities[0].state,s=>s.entities[0].extra=true,s=>s.round=0];
  for(const mutate of mutations){const s=structuredClone(good);mutate(s);assert.equal(snapshots.parseSnapshot(s),null);}
  for(const v of [null,undefined,[],new Date(),JSON.stringify(good),Object.create(good)])assert.equal(snapshots.parseSnapshot(v),null);
  let getterCalls=0;const hostile={...good};Object.defineProperty(hostile,'tick',{enumerable:true,get(){getterCalls++;return 1;}});
  assert.equal(snapshots.parseSnapshot(hostile),null);assert.equal(getterCalls,0);
  const extraArray=structuredClone(good);extraArray.entities.extra='hack';assert.equal(snapshots.parseSnapshot(extraArray),null);
});
void test('12 invalid canonical source cannot be serialized and actual dev probe builds snapshots on demand',()=>{
  const canonical=state.describeMatch(truth([actor(),enemy()]));canonical.entities[0].x=Infinity;
  assert.throws(()=>snapshots.createSnapshot(canonical),/invalid canonical/);
  const code=fs.readFileSync('app/prototype.tsx','utf8');assert.ok(code.includes('readSnapshot: () => createSnapshot(clientPresentation??readCanonicalState())'));
  assert.ok(code.includes('networkPump?.tickHostSnapshot(localNow, now)'), 'serialization is network-only via the pump adapter');
  const pump=fs.readFileSync('lib/multiplayer/pump.ts','utf8');
  assert.ok(pump.includes('NETWORK_RATES.snapshotHz'), 'pump rate-limits host snapshots');
});

void test('11 rendering reads canonical actor truth with detached nested data and legacy visual identity',()=>{
  const players=[actor({action:'tag',actionUntil:2000,visualTagVector:{x:20,y:0},flight:flight.startFlight({x:200,y:200})}),enemy()];
  const canonical=state.describeMatch(truth(players)),before=structuredClone(canonical),liveBefore=structuredClone(players);
  const render=renderState.createRenderAdapter(players)(canonical);
  for(let i=0;i<players.length;i++)for(const key of ['id','name','entityId','controlled','team','state','x','y','vx','vy','action','actionUntil','rescueShieldUntil','ultimateShieldUntil','prisonIndex','aiSeed'])
    assert.equal(render.players[i][key],players[i][key],key);
  assert.deepEqual(render.players[0].visualTagVector,players[0].visualTagVector);
  assert.equal(render.roundWinner,'blue');assert.equal(render.phase,'MATCH_OVER');assert.equal(render.ultimateMeter,75);
  render.players[0].x=999;render.players[0].flight.lastGround.x=999;render.players[0].visualTagVector.x=999;
  render.refills[0].x=999;render.teamCombos.blue.surgeUntil=999;
  assert.deepEqual(canonical,before);assert.deepEqual(players,liveBefore);
});
void test('11 existing drawing paths use render projections and do not invoke simulation authority',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8'),a=source.indexOf('const drawPlayer ='),b=source.indexOf('let cachedStatsBoard',a),drawing=source.slice(a,b);
  assert.ok(drawing.includes('const {phase,roundWinner,ultimateMeter,ultimateBuffUntil,teamCombos}=render'));
  assert.ok(drawing.includes('const {players,refills,phase,rescueRequest}=render'));
  assert.ok(source.includes('draw(now,renderAdapter(clientPresentation??readCanonicalState(now,development)))'));
  assert.doesNotMatch(drawing,/\b(?:resolveTag|resolveRescue|winRound|stepUltimate|botAuthority|moveActor|recordMatchProgression)\s*\(/);
  assert.doesNotMatch(drawing,/\b(?:paused|phase|timer|score|ultimateMeter)\s*(?:=|\+=|-=)(?!=)/);
  assert.ok(drawing.includes('pendingRenderFailure ='));assert.ok(source.includes('if(pendingRenderFailure!==null){paused=true'));
});

void test('09 bot strategy and sequential shared movement match frozen legacy',()=>{
  const oldFactory=vm.runInThisContext(ts.transpileModule(`(function(c){
    const {players,bases,worldWidth,worldHeight,refills,rescueRequest,aiProfile,field,move,drainBoost,stats}=c;
    const me=players[0],CHARACTER_BY_ID={raja:stats},AI_BOOST_THRESHOLD=-.15,AI_BOOST_DRAIN_MULTIPLIER=.66,AI_SPEED_MULTIPLIER=1;
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),other=t=>t==='blue'?'red':'blue',baseVector=p=>({x:bases[p.team].x-p.x,y:bases[p.team].y-p.y});
    const navigateAroundHazards=(p,d)=>d,rajaUltimateMultiplier=()=>1,teamComboSpeedMultiplier=()=>1,teamCombos={blue:{},red:{}};
    ${fs.readFileSync('scripts/fixtures/bot-legacy.ts.txt','utf8').split('      players.slice(1)')[0]}
    return {vector:aiVector,step(dt,now){
      players.slice(1)${fs.readFileSync('scripts/fixtures/bot-legacy.ts.txt','utf8').split('      players.slice(1)')[1]}
    }};
  })`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
  for(let scenario=0;scenario<48;scenario++){
    const w=world(),profile={rescueCutoff:1.4,threatRadius:220,playerBias:30,prediction:.3,steerDistance:90};
    const players=[actor({x:850,lastX:850}),actor({id:'ally2',entityId:'bot1',controller:'bot',controlled:false,aiSeed:scenario/3,
      state:['ACTIVE','IN_BASE','RETURNING','PRISONER'][scenario%4],boost:[100,32,12][scenario%3],exitOrder:6}),
      enemy({x:400,lastX:400,exitOrder:scenario%2?9:1,aiSeed:2}),
      actor({id:'ally3',entityId:'bot2',controller:'bot',controlled:false,state:scenario%3===0?'PRISONER':'ACTIVE',prisonIndex:4,aiSeed:5,x:280,lastX:280})];
    const actual=structuredClone(players),old=structuredClone(players),refills=[{id:1,x:250,y:230}],request=scenario%5===0?{requesterId:'ally3',assignedRescuerId:'ally2'}:null;
    const stats={speed:220,boostMultiplier:1.5,boostDrain:10},calls=[],oldCalls=[];
    const legacy=oldFactory({players:old,bases:w.bases,worldWidth:w.width,worldHeight:w.height,refills,rescueRequest:request,aiProfile:profile,field:{id:'kampung'},stats,
      drainBoost:movement.drainBoost,move:(p,x,y,speed,dt,now)=>{oldCalls.push({id:p.entityId,x,y,speed});movement.moveActor(w,p,x,y,speed,dt,now);}});
    const ctx={players:actual,bases:w.bases,width:w.width,height:w.height,refills,request,kanal2:false,localTeam:'blue',profile,boostThreshold:-.15,navigate:(p,d)=>d};
    const now=1000+scenario*370;
    for(const p of actual.slice(1))assert.deepEqual(bots.planBot(p,now,ctx).vector,legacy.vector(old.find(q=>q.entityId===p.entityId),now));
    legacy.step(.02,now);
    bots.createBotAuthority().run('host',ctx,now,(p,intent)=>{
      if(intent.blocked){p.vx=0;p.vy=0;return;}
      if(intent.frame.sprint)movement.drainBoost(p,stats.boostDrain*.66,.02,now);
      const speed=stats.speed*(intent.frame.sprint?stats.boostMultiplier:1);
      calls.push({id:p.entityId,x:intent.frame.moveX,y:intent.frame.moveY,speed});
      movement.moveInputActor(w,p,intent.frame,{x:intent.frame.moveX,y:intent.frame.moveY},speed,.02,now);
    });
    assert.deepEqual(calls,oldCalls);assert.deepEqual(actual,old);
  }
});
void test('09 clients never generate/consume bot decisions, controller selection and sequences survive reorder',()=>{
  const driver=bots.createBotAuthority(),players=[actor(),enemy(),actor({entityId:'remote',controller:'remote',controlled:false})];
  let navigation=0;const ctx={...world(),players,refills:[],request:null,localTeam:'blue',profile:{rescueCutoff:1,threatRadius:200,playerBias:20,prediction:.2,steerDistance:90},boostThreshold:-.15,navigate:(p,d)=>{navigation++;return d;}};
  const before=structuredClone(players),frames=[];
  driver.run('client',ctx,1000,()=>{throw Error('Client consumed bot');});assert.equal(navigation,0);assert.deepEqual(players,before);
  driver.run('host',ctx,1000,(p,i)=>frames.push(i));ctx.players.reverse();
  driver.run('host',ctx,1100,(p,i)=>frames.push(i));
  assert.equal(frames.length,2);assert.deepEqual(frames.map(i=>i.frame.sequence),[1,2]);
  assert.ok(frames.every(i=>i.frame.entityId==='entity-0002'));assert.doesNotThrow(()=>JSON.stringify(frames));
  const held=enemy({state:'PRISONER',vx:12}),water=enemy({entityId:'water',waterEnteredAt:1});ctx.players=[held,water];ctx.kanal2=true;
  driver.run('host',ctx,1200,(p,i)=>{assert.equal(i.blocked,true);assert.equal(i.frame.sprint,false);});assert.equal(navigation,2);
});
function load(file){
  const absolute=path.resolve(file);if(cache.has(absolute))return cache.get(absolute).exports;
  const compiledModule={exports:{}};cache.set(absolute,compiledModule);
  if(absolute.endsWith('.json')){compiledModule.exports={__esModule:true,default:JSON.parse(fs.readFileSync(absolute,'utf8'))};return compiledModule.exports;}
  const code=ts.transpileModule(fs.readFileSync(absolute,'utf8').replaceAll('import.meta','({BASE_URL:"/"})'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll('import.meta','({BASE_URL:"/"})');
  const requireLocal=specifier=>{
    if(!specifier.startsWith('.'))return nativeRequire(specifier);
    const base=path.resolve(path.dirname(absolute),specifier);
    const found=[base,base+'.ts',base+'.json',base+'.js'].find(f=>fs.existsSync(f));
    if(!found)throw new Error('Cannot resolve "'+specifier+'" from '+absolute);
    return load(found);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:absolute})(requireLocal,compiledModule,compiledModule.exports);
  return compiledModule.exports;
}
const state=load('lib/game-core/state.ts'),entities=load('lib/game-core/entities.ts');
const input=load('lib/game-core/input.ts'),tick=load('lib/game-core/tick.ts');
const movement=load('modules/gameplay/movement.ts'),interactions=load('modules/gameplay/tag-combat.ts');
const ultimate=load('modules/gameplay/ultimate.ts'),matchRules=load('modules/game-core/match-control.ts');
const bots=load('modules/gameplay/ai-movement.ts');
const gameEvents=load('lib/game-core/events.ts');
const renderState=load('lib/game-core/render-state.ts');
const snapshots=load('lib/game-core/snapshot.ts');
const protocol=load('lib/multiplayer/protocol.ts');
const flight=load('modules/gameplay/flight-ultimate.ts'),collision=load('modules/gameplay/collision-navigation.ts'),contact=load('modules/gameplay/tag-check.ts');
const actor=(overrides={})=>({entityId:'entity-0001',controller:'local',id:'you',name:'RAJA',characterId:'raja',team:'blue',controlled:true,
  x:200,y:200,vx:0,vy:0,lastX:200,lastY:200,state:'ACTIVE',exitOrder:10,boost:100,baseCharge:0,exitDeadline:0,
  lastExitAt:0,tagCooldown:0,parkourUntil:0,boostReadyAt:0,fortCharge:0,prisonIndex:0,captures:0,aiSeed:0,
  rescueShieldUntil:0,ultimateShieldUntil:0,fallSafeUntil:0,fallNoticeUntil:0,waterEnteredAt:0,waterFallUntil:0,capturedIds:[],actionUntil:0,...overrides});
const enemy=(overrides={})=>actor({entityId:'entity-0002',controller:'bot',id:'enemy1',controlled:false,team:'red',x:220,y:200,lastX:220,lastY:200,exitOrder:2,...overrides});
void test('UI tag indicators share eligibility, cooldown, flight and protection without mutating actors',()=>{
  const me=actor(),target=enemy(),before=structuredClone([me,target]);
  assert.equal(interactions.tagRelationship(me,target,1000,false),'target');
  assert.equal(interactions.tagRelationship(target,me,1000,false),'danger');
  assert.deepEqual([me,target],before);
  for(const stage of ['FLIGHT_TAKEOFF','FLYING','FLIGHT_LANDING']){
    target.flight={stage};assert.equal(interactions.tagRelationship(me,target,1000,false),'protected');
    assert.equal(interactions.tagEligible(me,target,1000,{kanal2:false}),false);
  }
  target.flight=null;
  for(const protection of [{parkourUntil:2000},{ultimateShieldUntil:2000},{state:'RETURNING',rescueShieldUntil:2000}])
    assert.equal(interactions.tagRelationship(me,{...target,...protection},1000,false),'protected');
  assert.equal(interactions.tagRelationship({...me,tagCooldown:2000},target,1000,false),'neutral');
  assert.equal(interactions.tagRelationship({...me,flight:{stage:'FLYING'}},target,1000,false),'neutral');
  assert.equal(interactions.tagRelationship(me,{...target,state:'IN_BASE'},1000,false),'neutral');
  assert.equal(interactions.tagRelationship(me,{...target,waterEnteredAt:100},1000,true),'protected');
  assert.equal(interactions.tagRelationship(me,{...target,waterEnteredAt:100},1000,false),'target');
});
void test('HUD preferences reject malformed values and clamp scale without touching gameplay',()=>{
  const {normalizeHudPreferences}=load('lib/hud-preferences.ts');
  for(const value of [null,undefined,'large',{}, {scale:NaN,contrast:'true'}])assert.deepEqual(normalizeHudPreferences(value),{scale:1,contrast:false});
  assert.deepEqual(normalizeHudPreferences({scale:100,contrast:true}),{scale:1.3,contrast:true});
  assert.deepEqual(normalizeHudPreferences({scale:-2}),{scale:1,contrast:false});
});
const prisons={blue:{x:40,y:400,w:240,h:180},red:{x:700,y:400,w:240,h:180}};
const world=(overrides={})=>({width:1000,height:800,bases:{blue:{x:100,y:100},red:{x:900,y:100}},baseRadius:80,kanal:false,kanal2:false,
  obstacles:[],waterAt:()=>false,waterBlocks:()=>false,fortCoreAt:()=>false,fortOccupied:()=>false,baseChargeTime:()=>.8,speedAt:()=>1,...overrides});
const stats={raja:{tagCooldownMs:500,tagRange:28,rescueRange:42,rescueShieldMs:1500,boost:100,baseChargeTime:.8}};
const supported=new Set(['raja','kaka','bebe','ciici']);
void test('10 core tag emits ordered detached JSON facts only after a valid transition',()=>{
  const a=actor(),b=enemy(),events=[];
  const emit=facts=>{assert.equal(b.state,'PRISONER');events.push(...facts);};
  assert.ok(interactions.resolveTag([a,b],a.entityId,b.entityId,1000,rule,emit));
  assert.deepEqual(events,[{type:'PLAYER_TAGGED',actorId:a.entityId,targetId:b.entityId,x:220,y:200},
    {type:'PLAYER_CAPTURED',actorId:a.entityId,targetId:b.entityId}]);
  b.x=800;assert.equal(events[0].x,220);assert.deepEqual(JSON.parse(JSON.stringify(events)),events);
  const before=structuredClone([a,b]),order=[];
  gameEvents.presentGameEvents(events,event=>order.push(event.type));
  assert.deepEqual(order,['PLAYER_TAGGED','PLAYER_CAPTURED']);assert.deepEqual([a,b],before);
  assert.equal(interactions.resolveTag([a,b],a.entityId,b.entityId,1001,rule,facts=>events.push(...facts)),null);
  assert.equal(events.length,2);
  b.state='ACTIVE';b.flight=flight.startFlight(b);
  assert.equal(interactions.resolveTag([a,b],a.entityId,b.entityId,2000,rule,()=>{throw Error('Invalid tag emitted');}),null);
});
void test('10 rescue and base emit stable identity facts while preserving legacy returns',()=>{
  const a=actor(),held=actor({entityId:'held',state:'PRISONER',x:220,prisonIndex:4}),events=[];
  const result=interactions.resolveRescue([a,held],a.entityId,1000,{kanal2:false,range:42,shieldMs:1500},facts=>events.push(...facts));
  assert.equal(result.type,'rescue');assert.equal(held.state,'RETURNING');
  assert.deepEqual(events,[{type:'PLAYER_RESCUED',actorId:a.entityId,targetIds:['held'],x:198,y:200}]);
  held.entityId='changed';assert.equal(events[0].targetIds[0],'held');assert.doesNotThrow(()=>state.assertJsonData(events));
  const w=world(),p=actor({x:900,y:100,fortCharge:1.49}),notices=[];
  const base=interactions.resolveBase([p],p,.02,1000,[],baseRules(w),facts=>notices.push(...facts));
  assert.equal(base[0].type,'objective');assert.deepEqual(notices,[{type:'FORT_CAPTURED',actorId:p.entityId,team:'blue',reason:'BENTENG DIREBUT'}]);
  interactions.resolveBase([p],p,.02,1020,[],baseRules(w),facts=>notices.push(...facts));assert.equal(notices.length,1);
  const recovering=actor({x:500,boost:0,boostReadyAt:1000});
  interactions.resolveBase([recovering],recovering,.02,1000,[],baseRules(w),facts=>notices.push(...facts));
  assert.equal(notices.at(-1).type,'BOOST_RECOVERED');assert.equal(recovering.boost,100);
});
void test('10 fort entry memory emits once, restores on reentry and excludes flight/prisoners',()=>{
  const w=world(),p=actor({x:900,y:100}),memory=new Set();
  assert.deepEqual(gameEvents.fortEntryEvents([p],w.bases,80,memory),[{type:'FORT_ENTERED',actorId:p.entityId,team:'blue'}]);
  assert.deepEqual(gameEvents.fortEntryEvents([p],w.bases,80,memory),[]);
  p.flight=flight.startFlight(p);assert.deepEqual(gameEvents.fortEntryEvents([p],w.bases,80,memory),[]);assert.equal(memory.size,0);
  p.flight=null;assert.equal(gameEvents.fortEntryEvents([p],w.bases,80,memory).length,1);
  p.state='PRISONER';assert.deepEqual(gameEvents.fortEntryEvents([p],w.bases,80,memory),[]);
  p.state='ACTIVE';p.x=500;assert.deepEqual(gameEvents.fortEntryEvents([p],w.bases,80,memory),[]);
});
void test('10 event boundary stays finite and runtime connects presentation without moving profile writes into core',()=>{
  const p=actor(),score={blue:1,red:0},outcome=matchRules.endRound([p],score,'PLAYING','blue','TEST',1000);
  const event={type:outcome.type,team:outcome.team,reason:outcome.reason};assert.equal(event.type,'MATCH_ENDED');state.assertJsonData(event);
  for(const file of ['events.ts'])
    assert.doesNotMatch(fs.readFileSync(`lib/game-core/${file}`,'utf8'),/\b(?:window|document|localStorage|AudioContext|gameplayAudio|recordMatchProgression)\b/);
  for(const file of ['modules/gameplay/tag-combat.ts','modules/gameplay/ultimate.ts','modules/gameplay/ai-movement.ts','modules/game-core/match-control.ts'])
    assert.doesNotMatch(fs.readFileSync(file,'utf8'),/\b(?:window|document|localStorage|AudioContext|gameplayAudio|recordMatchProgression)\b/);
  const source=fs.readFileSync('app/prototype.tsx','utf8');
  for(const anchor of ['botAuthority.run(simulationAuthority','presentInteractionEvents(events,now)','presentGameEvents(ultimateFacts',
    'presentGameEvents([{type:outcome.type','fortEntryEvents(players,bases','facts=>events.push(...facts)'])assert.ok(source.includes(anchor),anchor);
  assert.equal(source.includes('players.slice(1).forEach((p) =>'),false);
  const begin=source.indexOf('const winRound ='),end=source.indexOf('const fortOccupant',begin),wrapper=source.slice(begin,end);
  assert.ok(wrapper.indexOf('recordMatchProgression(')<wrapper.indexOf('presentGameEvents('));
});
void test('10 actual interaction presenter preserves player/bot audio routing and never mutates match truth',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8'),start=source.indexOf('const presentInteractionEvents ='),end=source.indexOf('const capture =',start);
  const initialize=vm.runInThisContext(ts.transpileModule(`(function(players,presentGameEvents){
    let localSignSerial=0;const network=null,clientOnly=false,eventSigns={accept(){}},matchId='test',sounds=[],feed=[],bursts=[],logs=[],TEAM_COLOR={blue:'red',red:'green'},
      distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),gameplayAudio={play:(...args)=>sounds.push(args),resetTagStreak:()=>sounds.push(['reset']),playerTag:now=>sounds.push(['playerTag',now])},
      addMatchEvent=event=>feed.push(event),burst=(...args)=>bursts.push(args),log=text=>logs.push(text),beep=()=>{};
    ${source.slice(start,end)}
    return {present:presentInteractionEvents,read:()=>({sounds,feed,bursts,logs})};
  })`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
  for(const victimLocal of [false,true])for(const attackerLocal of [false,true]){
    const local=actor(),a=actor({entityId:'tagger',controlled:attackerLocal}),b=enemy({controlled:victimLocal}),events=[];
    assert.ok(interactions.resolveTag([a,b],a.entityId,b.entityId,1000,rule,facts=>events.push(...facts)));
    const players=[local,a,b],before=structuredClone(players),run=initialize(players,gameEvents.presentGameEvents);
    run.present(events,1000);assert.deepEqual(players,before);
    const result=run.read();assert.equal(result.feed.length,1);assert.equal(result.bursts.length,1);assert.equal(result.logs.length,1);
    assert.deepEqual(result.sounds,victimLocal?[['reset'],['caught']]:attackerLocal?[['playerTag',1000]]:[['tag',.22]]);
  }
  for(const localRescuer of [false,true]){
    const a=actor({controlled:localRescuer}),b=actor({entityId:'held',state:'PRISONER',controlled:false,x:220}),events=[];
    interactions.resolveRescue([a,b],a.entityId,1000,{kanal2:false,range:42,shieldMs:1500},facts=>events.push(...facts));
    const players=[a,b],before=structuredClone(players),run=initialize(players,gameEvents.presentGameEvents);run.present(events,1000);
    assert.deepEqual(players,before);assert.deepEqual(run.read().sounds,localRescuer?[['rescue'],['rescued']]:[['rescued',.25]]);
  }
});
const ultRules=(id,overrides={})=>({supported,kanal2:false,rechargeSeconds:45,castMs:id==='kaka'?3600:3200,durationMs:5000,speedMultiplier:1.4,...overrides});
const ultState=()=>({meter:0,impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0});
const oldUltimateFactory=vm.runInThisContext(ts.transpileModule(`(function(players,playerUltimateStats,flightLib){
  const {startFlight,flightBusy}=flightLib,me=players[0],config=flightLib.flightConfig(me.characterId),field={id:'kampung'};
  const ULTIMATE_CHARACTER_IDS=new Set(['raja','kaka','bebe','ciici']),RAJA_ULTIMATE_RECHARGE_SECONDS=45,
    RAJA_ULTIMATE_CAST_MS=3200,KAKA_ULTIMATE_CAST_MS=3600,RAJA_ULTIMATE_BUFF_MS=5000,
    KAKA_ULTIMATE_SHIELD_MS=5000,RAJA_ULTIMATE_SPEED_MULTIPLIER=1.4;
  let ultimateMeter=0,ultimateImpactAt=0,ultimateImpactApplied=false,ultimateBuffUntil=0,ultimateShieldUntil=0,boostBurstUntil=0,bannerTimeout=0;
  const noop=()=>{},keys={current:new Set()},window={clearTimeout:noop,setTimeout:()=>0},gameplayAudio={play:noop},
    clearMouse=noop,flightHook=noop,setUltimateBannerVisible=noop,burst=noop,beep=noop,log=noop,ultimateName=id=>id,
    clamp=(v,min,max)=>Math.max(min,Math.min(max,v)),ultimateCastMsFor=()=>playerUltimateStats.castMs;
  return (dt,now,pressed)=>{
    const input={ultimate:pressed};
    ${fs.readFileSync('scripts/fixtures/ultimate-legacy.ts.txt','utf8')}
    return {state:{meter:ultimateMeter,impactAt:ultimateImpactAt,impactApplied:ultimateImpactApplied,buffUntil:ultimateBuffUntil,shieldUntil:ultimateShieldUntil},
      casting:ultimateCasting,speed:players.map(rajaUltimateMultiplier)};
  };
})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);

void test('08 ultimate matches frozen legacy for all characters and base/upgraded team scopes',()=>{
  for(const id of supported)for(const upgraded of [false,true]) {
    const rules=ultRules(id,upgraded?{rechargeSeconds:42,castMs:id==='kaka'?3300:2900,durationMs:6500,speedMultiplier:1.49}:{});
    const actual=[actor({characterId:id}),actor({entityId:'ally',controlled:false}),enemy(),actor({entityId:'held',state:'PRISONER'})];
    const previous=structuredClone(actual),old=oldUltimateFactory(previous,rules,flight),state=ultState();
    for(const [dt,now,press] of [[rules.rechargeSeconds,1000,false],[0,1000,true],[0,1001,true],[0,1000+rules.castMs-1,false],
      [0,1000+rules.castMs,false],[0,1001+rules.castMs,false],[0,1000+rules.castMs+rules.durationMs,false]]) {
      const expected=old(dt,now,press);
      ultimate.stepUltimate(actual,actual[0],state,dt,now,press,rules);
      assert.deepEqual(state,expected.state);assert.deepEqual(actual,previous);
      assert.equal(ultimate.ultimateCasting(actual[0],now,supported),expected.casting);
      assert.deepEqual(actual.map(p=>ultimate.ultimateSpeed(p,actual[0],now,state.buffUntil,rules.speedMultiplier)),expected.speed);
    }
  }
});
void test('08 ultimate eligibility, bonus caps and exactly-once effects cannot bypass guards',()=>{
  const me=actor(),state={...ultState(),meter:100},rules=ultRules('raja');
  for(const changes of [{state:'PRISONER'},{state:'IN_BASE'},{state:'RETURNING'},{parkourUntil:1001},
    {action:'rescue',actionUntil:1001},{flight:flight.startFlight(me)},{characterId:'jago'}]) {
    const a=actor(changes);assert.equal(ultimate.ultimateEligible(a,state,1000,rules),false);
  }
  assert.equal(ultimate.ultimateEligible(actor({waterEnteredAt:1}),state,1000,{...rules,kanal2:true}),false);
  assert.equal(ultimate.ultimateEligible(me,state,1000,rules),true);
  assert.equal(ultimate.gainUltimate(90,me,20,supported),100);
  assert.equal(ultimate.gainUltimate(20,me,30,supported),50);
  assert.equal(ultimate.gainUltimate(20,enemy(),30,supported),20);
  assert.equal(ultimate.gainUltimate(20,actor({characterId:'jago'}),30,supported),20);
  assert.equal(ultimate.stepUltimate([me],me,state,0,1000,true,rules)[0].type,'ULTIMATE_STARTED');
  assert.deepEqual(ultimate.stepUltimate([me],me,state,0,4199,false,rules),[]);
  assert.equal(ultimate.stepUltimate([me],me,state,0,4200,false,rules)[0].type,'ULTIMATE_APPLIED');
  assert.deepEqual(ultimate.stepUltimate([me],me,state,0,4201,false,rules),[]);
  ultimate.freezeUltimateActors([me]);assert.equal(me.vx,0);assert.equal(me.lastX,me.x);
});
void test('08 flight sequence transitions, hooks and safe landing match the shared legacy controller',()=>{
  for(const id of ['bebe','ciici']) {
    const me=actor({characterId:id,flight:flight.startFlight({x:200,y:200})}),old=structuredClone(me),c=flight.flightConfig(id);
    for(const [dt,complete] of [[.5,false],[.01,true],[3.5,false],[.5,false],[.5,false],[.01,true]]) {
      const expected=[];const note=name=>expected.push({name,stage:old.flight.stage,remaining:old.flight.remaining,distance:old.flight.distance});
      old.flight=flight.advanceFlight(old.flight,c,dt,complete,{
        onFlightStart:()=>{note('onFlightStart');note('flight_loop_sfx');},onFlightWarning:()=>note('flight_warning_sfx'),
        onFlightLanding:()=>{note('onFlightLanding');note('flight_land_sfx');},onFlightEnd:()=>note('ultimate_flight_ended'),
        onSafeLanding:()=>{const land=flight.safeFlightLanding(old,old.flight.lastGround,()=>true);old.x=land.x;old.y=land.y;old.lastX=old.x;old.lastY=old.y;},
      });
      if(flight.isFlying(old))old.flight.lastGround={x:old.x,y:old.y};
      const result=ultimate.stepFlight(me,c,dt,complete,()=>true);
      assert.deepEqual(result.facts,expected);assert.equal(result.landingFailed,false);assert.deepEqual(me,old);
    }
    me.flight=flight.startFlight(me);flight.advanceFlight(me.flight,c,0,true);
    assert.equal(ultimate.stepFlight(me,c,4,false,()=>false).landingFailed,true);
  }
});
void test('08 match timeout preserves held-first, unique-second and sudden-death precedence',()=>{
  assert.equal(matchRules.suddenDeathTagWinner(false,'red'),null);
  assert.deepEqual(matchRules.suddenDeathTagWinner(true,'red'),{team:'red',reason:'SUDDEN DEATH TAG'});
  const players=[actor({capturedIds:['a','a','b']}),enemy({state:'PRISONER',capturedIds:['c','d','e']})];
  assert.deepEqual(matchRules.stepMatchTimer(players,.01,false,.02).winner,{team:'blue',reason:'WAKTU HABIS'});
  players[1].state='ACTIVE';
  assert.deepEqual(matchRules.stepMatchTimer(players,0,false,0).winner,{team:'red',reason:'TANGKAPAN UNIK'});
  players[1].capturedIds=['c','d'];
  assert.deepEqual(matchRules.stepMatchTimer(players,0,false,.1),{timer:0,suddenDeath:true,winner:null});
  assert.deepEqual(matchRules.stepMatchTimer(players,0,true,1),{timer:0,suddenDeath:true,winner:null});
  assert.equal(matchRules.stepMatchTimer(players,240,false,.033).timer,239.967);
});
void test('08 best-of-three completion is guarded and clears flights without persistence or presentation',()=>{
  const players=[actor({flight:flight.startFlight({x:0,y:0})})],score={blue:0,red:0};
  assert.equal(matchRules.endRound(players,score,'COUNTDOWN','blue','BENTENG DIREBUT',1000),null);
  const first=matchRules.endRound(players,score,'PLAYING','blue','BENTENG DIREBUT',1000);
  assert.equal(first.type,'ROUND_ENDED');assert.equal(first.phaseUntil,5500);assert.equal(players[0].flight,null);
  assert.equal(matchRules.endRound(players,score,first.phase,'blue','duplicate',1001),null);assert.equal(score.blue,1);
  const final=matchRules.endRound(players,score,'PLAYING','blue','SUDDEN DEATH TAG',6000);
  assert.equal(final.type,'MATCH_ENDED');assert.equal(final.phaseUntil,Infinity);assert.equal(score.blue,2);
  for(const [phase,until,now,next,expected] of [['COUNTDOWN',3000,2999,false,'countdown'],['COUNTDOWN',3000,3000,false,'start-round'],
    ['ROUND_OVER',4500,4499,false,'continue'],['ROUND_OVER',4500,4499,true,'next-round'],['ROUND_OVER',4500,4500,false,'next-round'],
    ['MATCH_OVER',Infinity,9000,false,'finished']])assert.equal(matchRules.phaseTransition(phase,until,now,next),expected);
  for(const file of ['modules/gameplay/ultimate.ts','modules/game-core/match-control.ts'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/\b(?:window|document|localStorage|AudioContext)\b/);
});
void test('08 actual runtime result adapter persists rewards and announces victory only once',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8');
  const start=source.indexOf('const winRound = (team: Team, reason: string) =>');
  const end=source.indexOf('const fortOccupant =',start);
  const initialize=vm.runInThisContext(ts.transpileModule(`(function(endRound,presentGameEvents,network=null){
    const players=[{team:'blue',flight:null}],score={blue:0,red:0},performance={now:()=>1000},clientOnly=false,
      publishNetworkFacts=()=>{},createMatchResult=()=>({}),readCanonicalState=()=>({}),humanIdentities=[],disconnectedPeers=new Set(),resultHandoff=()=>({result:null});
    let phase='PLAYING',roundWinner,roundEndReason,matchEvents=[],resultWinner,resultAnnouncementUntil=0,
      fieldRotationPending=false,phaseUntil=0,announcement='',saved=[],sounds=[],presented=[];
    const pendingProfileStatsRef={current:{tagMusuh:2,rescueTeam:1,masukPenjara:3}},completedMatchesRef={current:0},
      EMPTY_KDA={tagMusuh:0,rescueTeam:0,masukPenjara:0},matchId='actual-test',field={id:'kampung'},
      recordMatchProgression=result=>{saved.push(result);return result;},setMatchProgressionResult=()=>{},setContentGateError=()=>{},
      gameplayAudio={resetTagStreak:()=>{},play:sound=>sounds.push(sound)},teamName=team=>team,
      beep=()=>{},burst=()=>{},worldWidth=1000,worldHeight=800,TEAM_COLOR={blue:'red',red:'green'},log=text=>presented.push(text);
    ${source.slice(start,end)}
    return {winRound,next:()=>{phase='PLAYING';},read:()=>({phase,score,saved,sounds,presented,completed:completedMatchesRef.current})};
  })`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
  const run=initialize(matchRules.endRound,gameEvents.presentGameEvents);
  run.winRound('blue','BENTENG DIREBUT');run.winRound('blue','duplicate');
  assert.equal(run.read().saved.length,0);assert.equal(run.read().score.blue,1);assert.equal(run.read().presented.length,1);
  run.next();run.winRound('blue','SUDDEN DEATH TAG');run.winRound('blue','duplicate');
  const result=run.read();assert.equal(result.phase,'MATCH_OVER');assert.equal(result.score.blue,2);
  assert.equal(result.saved.length,1);assert.equal(result.completed,1);assert.equal(result.presented.length,2);
  assert.equal(result.sounds.filter(s=>s==='victory').length,1);
  assert.deepEqual(result.saved[0],{matchId:'actual-test',arenaId:'kampung',completed:true,won:true,tags:2,rescues:1,timesCaptured:3});
  const packets=[],online=initialize(matchRules.endRound,gameEvents.presentGameEvents,{publishResult:p=>packets.push(p)});
  online.winRound('blue','first');online.next();online.winRound('blue','second');
  assert.equal(online.read().saved.length,0);assert.equal(online.read().completed,0,'multiplayer never writes solo progression or rotation');
  assert.equal(packets.length,1,'online emits one authoritative result, handoff tested independently');
});
const rule={kanal2:false,tagRange:()=>28,tagCooldownMs:()=>500,lineOfSight:()=>true};
const baseRules=w=>({bases:w.bases,radius:w.baseRadius,kanal2:w.kanal2,boost:100,chargeTime:.8,reentryMs:1500,tieHash:id=>id.length});

const baselineCode=ts.transpileModule(`(function(context){
  const {players,bases,baseRadius,field,studioQueries,solidObstacles,hitsObstacle,isInsideFortCore,isWaterAt,kanalWaterBlocks,hasLineOfSight}=context;
  const {isFlying,flightBusy,flightPassesObstacle,pointHitsExpandedRect,sweptContactDistance}=context;
  const CHARACTER_BY_ID=context.stats,PLAYER_COLLISION_RADIUS=13,BASE_REENTRY_COOLDOWN_MS=1500;
  const worldWidth=context.width,worldHeight=context.height,TEAM_COLOR={blue:'red',red:'green'};
  const RAJA_ULTIMATE_TAG_BONUS=20,RAJA_ULTIMATE_RESCUE_BONUS=30;
  const other=team=>team==='blue'?'red':'blue';
  const isKanalField=id=>id==='kanal2',distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const tieHash=id=>id.length;
  const mission={},pendingProfileStatsRef={current:{tagMusuh:0,masukPenjara:0,rescueTeam:0}};
  let rescueRequest=null;const suddenDeath=false;
  const noop=()=>{},burst=noop,clearMouse=noop,log=noop,addStat=noop,addMatchEvent=noop,registerTeamAction=noop,chargeUltimate=noop,beep=noop;
  const gameplayAudio={play:noop,resetTagStreak:noop,playerTag:noop},winRound=context.winRound;
  ${fs.readFileSync('scripts/fixtures/game-core-legacy.ts.txt','utf8')}
  return {move,blocked,findParkourLanding,tagCheck,rescueCheck,baseCheck,layoutPrisons};
})`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const createBaseline=vm.runInThisContext(baselineCode);
function legacy(players,w,los=()=>true,wins=[]){
  return createBaseline({players,width:w.width,height:w.height,bases:w.bases,baseRadius:w.baseRadius,field:{id:w.kanal2?'kanal2':'kampung',prisons},
    studioQueries:{solidAt:w.studioSolidAt??(()=>false),waterAt:w.waterAt,speedAt:w.speedAt},solidObstacles:w.obstacles,
    ...flight,...contact,
    pointHitsExpandedRect:collision.pointHitsExpandedRect,
    hitsObstacle:(x,y)=>movement.hitsSolid(w,x,y),isInsideFortCore:w.fortCoreAt,isWaterAt:w.waterAt,kanalWaterBlocks:w.waterBlocks,
    hasLineOfSight:los,stats,winRound:(team,reason)=>wins.push({team,reason})});
}
const truth=players=>({matchId:'test-match',arenaId:'kampung',phase:'MATCH_OVER',paused:false,tick:15,simulationTimeMs:500,observedAtMs:1000,fixedDeltaMs:1000/30,
  round:2,timer:-.1,phaseUntil:Infinity,suddenDeath:false,score:{blue:2,red:0},players,refills:[{id:1,x:500,y:500,grade:40,lane:1,expiresAt:2000}],
  nextRefillSpawn:3000,exitCounter:20,teamCombos:{blue:{step:1,expiresAt:6500,lastActorId:'you',surgeUntil:0},red:{step:0,expiresAt:0,lastActorId:'',surgeUntil:0}},
  totalCapture:{blue:0,red:0},rescueRequest:{requesterId:'enemy1',team:'red',expiresAt:4000},rescueRequestCooldownUntil:5000,ultimateMeter:75,ultimateImpactAt:0,
  ultimateImpactApplied:true,ultimateBuffUntil:4500,ultimateShieldUntil:0,ultimateStats:{castMs:3200,durationMs:5000},bases:{blue:{x:100,y:100},red:{x:900,y:100}},
  baseRadius:80,roundStats:{you:{tags:1,prisons:0,rescues:2},enemy1:{tags:0,prisons:1,rescues:0}},matchStats:{you:{tags:2,prisons:0,rescues:3},enemy1:{tags:0,prisons:2,rescues:0}},winner:'blue',reason:'BENTENG DIREBUT'});

void test('02 canonical state is detached, finite JSON truth with explicit faction mapping',()=>{
  const p=actor({capturedIds:['enemy1'],flight:flight.startFlight({x:200,y:200})}),q=enemy({state:'PRISONER',prisonOwner:'blue'});
  const source=truth([p,q]),s=state.describeMatch(source);
  assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
  assert.equal(s.phaseUntilMs,null);assert.equal(s.timeRemainingSeconds,0);
  assert.equal(s.teams.red.score,2);assert.equal(s.entities[0].team,'red');assert.equal(s.entities[1].team,'green');assert.equal(s.entities[1].prisonOwner,'red');
  assert.deepEqual(s.entities[0].capturedEntityIds,['entity-0002']);assert.equal(s.rescueRequest.requesterId,'entity-0002');
  assert.equal(s.entities[0].ultimateMeter,75);assert.equal(s.entities[1].ultimateMeter,0);
  s.entities[0].flight.lastGround.x=999;s.refills[0].x=999;s.matchStats['entity-0001'].tags=999;
  assert.equal(p.flight.lastGround.x,200);assert.equal(source.refills[0].x,500);assert.equal(source.matchStats.you.tags,2);
  for(const invalid of [NaN,Infinity,()=>{},new Map(),{bad:undefined},new Date()])assert.throws(()=>state.assertJsonData(invalid));
  assert.throws(()=>state.describeMatch({...source,timer:NaN}));
  // Render-only reads may skip the recursive JSON check; output is otherwise identical.
  assert.doesNotThrow(()=>state.describeMatch({...source,timer:NaN},{validate:false}));
  assert.deepEqual(state.describeMatch(source,{validate:false}),state.describeMatch(source));
  assert.throws(()=>state.describeMatch({...source,players:[p,{...q,entityId:p.entityId}]}));
});
void test('03 host-issued identity survives character changes, reorder, round reset and takeover',()=>{
  const registry=entities.createEntityRegistry(),first=registry.assign('you');
  const ids=Array.from({length:9},(_,i)=>registry.assign(`spawn-${i}`));
  assert.equal(new Set([first,...ids]).size,10);
  for(const key of ['spawn-3','you','spawn-0','you'])assert.equal(registry.assign(key),key==='you'?first:ids[Number(key.slice(6))]);
  const original=actor({entityId:first}),remote=entities.setController(original,'remote','peer-2'),bot=entities.setController(remote,'bot');
  assert.equal(remote.entityId,first);assert.equal(bot.entityId,first);assert.equal(remote.ownerPeerId,'peer-2');assert.equal(bot.ownerPeerId,undefined);assert.equal(original.controller,'local');
});
void test('03 actual runtime factory assigns all ten actors and reuses IDs on round recreation',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8');
  const start=source.indexOf('const entityRegistry = createEntityRegistry()'),end=source.indexOf('let players = makePlayers()',start);
  assert.ok(start>0&&end>start);
  const factory=ts.transpileModule(source.slice(start,end)+'\nreturn {makePlayers,choose:id=>selectedId=id};',{
    compilerOptions:{target:ts.ScriptTarget.ES2022}
  }).outputText;
  const characters=Object.fromEntries(['raja','kaka','bebe','ciici','jago'].map(id=>[id,{name:id,boost:100}]));
  const setup=`const bases={blue:{x:100,y:100},red:{x:900,y:100}},GAME_RULES={spawnOffsets:Array.from({length:5},(_,i)=>({x:i,y:i}))};
    const CHARACTER_BY_ID=characters,selectedFaction='red',TEAM_FOR_FACTION={red:'blue',green:'red'},network=null;
    let selectedId='raja';const lineupFor=(faction,id)=>[id??'kaka','bebe','ciici','jago','raja'];\n`;
  const init=vm.runInThisContext(`(function(createEntityRegistry,characters){${setup}${factory}})`);
  const runtime=init(entities.createEntityRegistry,characters),first=runtime.makePlayers();
  assert.equal(first.length,10);assert.equal(new Set(first.map(p=>p.entityId)).size,10);
  assert.equal(first.filter(p=>p.controller==='local').length,1);assert.equal(first.filter(p=>p.controller==='bot').length,9);
  runtime.choose('ciici');const next=runtime.makePlayers();
  assert.deepEqual(next.map(p=>p.entityId),first.map(p=>p.entityId));assert.equal(next[0].characterId,'ciici');
  assert.deepEqual(next.map(p=>p.id),first.map(p=>p.id),'legacy tie IDs unchanged');
});
void test('04 keyboard aliases/opposing axes and mouse pulses produce monotonic JSON inputs',()=>{
  const adapter=input.createLocalInputAdapter(),keys=['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown',' ','shift','capslock','r'];
  let sequence=0;
  for(let mask=0;mask<4096;mask++){
    const held=new Set(keys.filter((_,i)=>mask&(1<<i))),frame=adapter.sample('entity-0001',held,mask%2===0,{x:123,y:234});
    assert.equal(frame.sequence,++sequence);assert.equal(frame.moveX,Number(held.has('d')||held.has('arrowright'))-Number(held.has('a')||held.has('arrowleft')));
    assert.equal(frame.moveY,Number(held.has('s')||held.has('arrowdown'))-Number(held.has('w')||held.has('arrowup')));
    assert.equal(frame.sprint,held.has(' ')||mask%2===0);assert.equal(frame.parkour,held.has('shift'));assert.equal(frame.ultimate,held.has('capslock'));
    assert.deepEqual(JSON.parse(JSON.stringify(frame)),frame);
  }
  assert.equal(adapter.sample('entity-0001',new Set(['p'])).pause,true);
  assert.throws(()=>adapter.sample('',new Set()));assert.throws(()=>adapter.sample('x',new Set(),false,{x:Infinity,y:1}));
});
void test('05 fixed clock advances independently at render rates without accumulated drift',()=>{
  for(const hz of [30,60,120,144]){
    const clock=tick.createSimulationClock();for(let i=0;i<hz*240;i++)tick.advanceSimulationClock(clock,1000/hz);
    assert.equal(clock.tick,7200);assert.ok(Math.abs(clock.simulationTimeMs-240000)<1e-7);assert.ok(clock.remainderMs<1e-5);
  }
  const clock=tick.createSimulationClock();assert.equal(tick.advanceSimulationClock(clock,10),0);assert.equal(tick.advanceSimulationClock(clock,90),3);
  assert.throws(()=>tick.advanceSimulationClock(clock,NaN));assert.throws(()=>tick.advanceSimulationClock(clock,-1));
});
void test('06 movement/collision matches frozen legacy across obstacles, slow terrain, flight, bases and water',()=>{
  let checked=0;
  for(const mode of ['clear','solid','slow','water','fort','studio'])for(const stage of [null,'FLYING','FLIGHT_TAKEOFF'])for(const status of ['ACTIVE','IN_BASE','RETURNING','PRISONER'])for(const dt of [1/120,1/60,.033]){
    const w=world({kanal:mode==='water',kanal2:mode==='water',obstacles:mode==='solid'?[{asset:'hall',x:220,y:180,w:30,h:60}]:[],
      speedAt:()=>mode==='slow'?.4:1,waterAt:(x,y)=>mode==='water'&&x>218&&y>180,waterBlocks:(x,y)=>mode==='water'&&x>205&&y>180,
      fortCoreAt:x=>mode==='fort'&&x>205,studioSolidAt:mode==='studio'?x=>x>205:undefined});
    const old=actor({state:status,flight:stage?{...flight.startFlight({x:200,y:200}),stage}:null}),next=structuredClone(old);
    legacy([old],w).move(old,1,.5,220,dt,1000);movement.moveActor(w,next,1,.5,220,dt,1000);
    assert.deepEqual(next,old,`${mode}/${stage}/${status}/${dt}`);checked++;
  }
  assert.equal(checked,216);
});
void test('06 free parkour and boost preserve resource/input rules without audio callbacks',()=>{
  for(const water of [false,true])for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
    const w=world({waterAt:x=>water&&x>215&&x<265});const p=actor();
    const landing=movement.parkourLanding(w,p,{x:dx,y:dy},54,1000);if(!dx&&!dy)assert.equal(landing,null);else if(!water||dx<=0){assert(landing);assert(Math.abs(Math.hypot(landing.x-p.x,landing.y-p.y)-54)<1e-9);}else if(landing)assert(landing.x>265&&!w.waterAt(landing.x,landing.y));
  }
  const p=actor();movement.drainBoost(p,30,.1,1000);assert.equal(p.boost,97);assert.equal(p.boostReadyAt,21000);
  const frame=input.createLocalInputAdapter().sample(p.entityId,new Set(['d']));
  const same=structuredClone(p),w=world();movement.moveActor(w,p,1,0,220,.02,1000);
  movement.moveInputActor(w,same,frame,{x:1,y:0},220,.02,1000);assert.deepEqual(same,p);
  assert.throws(()=>movement.moveInputActor(w,same,{...frame,entityId:'another'},{x:1,y:0},220,.02,1000));
});
void test('07 caller intent cannot bypass any flight phase, enemy rescue or occupied fort entry',()=>{
  for(const stage of ['FLIGHT_TAKEOFF','FLYING','FLIGHT_LANDING'])for(const who of ['attacker','target']){
    const p=actor(),q=enemy();(who==='attacker'?p:q).flight={...flight.startFlight(p),stage};
    assert.equal(interactions.resolveTag([p,q],p.entityId,q.entityId,1000,rule),null);
  }
  const p=actor(),q=enemy({state:'PRISONER',prisonOwner:'blue'});
  assert.equal(interactions.resolveRescue([p,q],p.entityId,1000,{kanal2:false,range:100,shieldMs:1500}),null);
  const w=world({fortOccupied:()=>true});p.x=800;p.y=100;
  assert.equal(movement.movementBlocked(w,850,100,p,1000),true);
  assert.equal(movement.movementBlocked({...w,fortOccupied:()=>false},850,100,p,1000),false);
});
void test('07 tag priority, immunity, LOS and prison transitions match legacy',()=>{
  for(const protection of ['none','cooldown','parkour','shield','rescue','flight','water','los']){
    const a=actor(),b=enemy();
    if(protection==='cooldown')a.tagCooldown=2000;
    if(protection==='parkour')b.parkourUntil=2000;
    if(protection==='shield')b.ultimateShieldUntil=2000;
    if(protection==='rescue'){b.state='RETURNING';b.rescueShieldUntil=2000;}
    if(protection==='flight')b.flight=flight.startFlight(b);
    if(protection==='water')b.waterEnteredAt=900;
    const old=[a,b],next=structuredClone(old),w=world({kanal2:protection==='water'}),los=()=>protection!=='los';
    legacy(old,w,los).tagCheck(1000);
    const rules={...rule,kanal2:w.kanal2,lineOfSight:los};const resolved=new Set();
    for(const {attacker,target}of interactions.tagContacts(next,1000,rules)){
      if(resolved.has(attacker.id)||resolved.has(target.id))continue;
      if(interactions.resolveTag(next,attacker.entityId,target.entityId,1000,rules)){resolved.add(attacker.id);resolved.add(target.id);interactions.layoutPrisoners(next,prisons,w.kanal2);}
    }
    assert.deepEqual(next,old,protection);
  }
  const p=actor(),q=enemy({x:800,lastX:800});assert.equal(interactions.resolveTag([p,q],p.entityId,q.entityId,1000,rule),null);
});
void test('07 multiple contacts retain tie order and only one capture per actor per pass',()=>{
  const old=[actor(),enemy(),enemy({entityId:'entity-0003',id:'enemy2',exitOrder:3,x:215,lastX:215})],next=structuredClone(old),w=world();
  legacy(old,w).tagCheck(1000);const resolved=new Set();
  for(const {attacker,target}of interactions.tagContacts(next,1000,rule))if(!resolved.has(attacker.id)&&!resolved.has(target.id)){
    if(interactions.resolveTag(next,attacker.entityId,target.entityId,1000,rule)){resolved.add(attacker.id);resolved.add(target.id);interactions.layoutPrisoners(next,prisons,false);}
  }
  assert.deepEqual(next,old);assert.equal(next.filter(p=>p.state==='PRISONER').length,1);
});
void test('07 outermost rescue, protection, return state and prison geometry match legacy',()=>{
  for(const kanal of [false,true])for(const active of [true,false]){
    const old=[actor({x:250,y:516,lastX:250,lastY:516,state:active?'ACTIVE':'RETURNING'}),enemy({team:'blue',state:'PRISONER',prisonOwner:'red',x:250,y:516,prisonIndex:1})];
    const next=structuredClone(old),w=world({kanal2:kanal});legacy(old,w).rescueCheck(1000);
    interactions.resolveRescue(next,next[0].entityId,1000,{kanal2:kanal,range:42,shieldMs:1500});assert.deepEqual(next,old);
    legacy(old,w).layoutPrisons();interactions.layoutPrisoners(next,prisons,kanal);assert.deepEqual(next,old);
  }
});
void test('07 charging, forced exit, base capture/defense and boost recharge match legacy',()=>{
  for(const position of [100,200,900])for(const status of ['IN_BASE','ACTIVE','RETURNING'])for(const deadline of [0,500,2000]){
    const p=actor({x:position,y:100,lastX:position,lastY:100,state:status,baseCharge:.8,exitDeadline:deadline,boost:50,boostReadyAt:500,lastExitAt:0,fortCharge:1.49});
    const old=[p,enemy({x:600})],next=structuredClone(old),w=world(),wins=[],oldExits=[],newExits=[];
    legacy(old,w,()=>true,wins).baseCheck(old[0],.02,2000,oldExits);
    const events=interactions.resolveBase(next,next[0],.02,2000,newExits,baseRules(w));
    assert.deepEqual(next,old);assert.deepEqual(newExits.map(p=>p.id),oldExits.map(p=>p.id));
    assert.deepEqual(events.filter(e=>e.type==='objective').map(({team,reason})=>({team,reason})),wins);
  }
  const p=actor({x:900,y:100,fortCharge:1.49}),q=enemy({x:900,y:100});
  assert.deepEqual(interactions.resolveObjective([p,q],p,.02,baseRules(world())),[]);assert.equal(p.fortCharge,0);
});
void test('07 all-held objective requires two seconds; broken hold resets',()=>{
  const p=actor(),q=enemy({state:'PRISONER',prisonOwner:'blue'}),holds={blue:0,red:0};
  assert.deepEqual(interactions.resolveAllHeld([p,q],holds,1.99),[]);
  assert.equal(interactions.resolveAllHeld([p,q],holds,.01)[0].reason,'SEMUA LAWAN DITANGKAP');
  q.state='RETURNING';interactions.resolveAllHeld([p,q],holds,.01);assert.equal(holds.blue,0);
});
void test('runtime adapters are connected and core has no DOM/audio/React dependencies',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8');
  for(const symbol of ['entityRegistry.assign(id)','localInput.sample(','advanceSimulationClock(','moveActor(','resolveTag(','resolveRescue(','resolveBase(','describeMatch(','coreHost.__bentengGameCore=coreProbe'])assert.ok(source.includes(symbol),symbol);
  for(const file of ['input','tick','state','entities']){
    const core=fs.readFileSync(`lib/game-core/${file}.ts`,'utf8').replace(/\/\/[^\n]*/g,'');
    assert.doesNotMatch(core,/from ['"]react|\b(?:window|document|Audio|AudioContext|CanvasRenderingContext2D)\b/);
  }
  for(const file of ['modules/gameplay/tag-combat.ts','modules/gameplay/movement.ts'])
    assert.doesNotMatch(fs.readFileSync(file,'utf8').replace(/\/\/[^\n]*/g,''),/from ['"]react|\b(?:window|document|Audio|AudioContext|CanvasRenderingContext2D)\b/);
});

void test('map P1 Kanal 2 legacy/editor/native parity: walk, parkour, flight, prison, water and immutable migration',async()=>{
  const {templates}=await import('./map-studio/templates.mjs');
  const {prepareArenaMap,kanalPrisonWalls,arenaRulesFor}=await import('../modules/world/map-arena-rules.ts');
  const {kanalObjectRects,kanalFortPolygon,polygonToRects}=await import('../modules/world/kanal-footprints.ts');
  const {createMapQueries}=await import('../modules/world/map-runtime-index.ts');
  const {validateMap}=await import('../lib/map-studio-model.js');
  const catalog=await templates(process.cwd()),reference=catalog.builtinTemplates.find(m=>m.replaces==='kanal2');
  // Stable synthetic legacy template: future intentional edits to a user's
  // saved draft must not be mistaken for regressions in the original rules.
  const raw=structuredClone(reference);delete raw.rulesVersion;delete raw.arenaRules;
  raw.objects=raw.objects.map(({nativeCollision,...o})=>({...o,behavior:nativeCollision?'solid':o.behavior}));
  const saved=JSON.parse(fs.readFileSync('config/map-studio.json')).maps.find(m=>m.replaces==='kanal2');
  if(saved){const savedBefore=JSON.stringify(saved),prepared=prepareArenaMap(validateMap(saved),reference.objects);
    assert.equal(JSON.stringify(saved),savedBefore);assert.equal(prepared.enabled,saved.enabled);}
  const before=JSON.stringify(raw),draft=prepareArenaMap(validateMap(raw),reference.objects),q=createMapQueries(draft);
  assert.equal(JSON.stringify(raw),before);assert.equal(draft.enabled,raw.enabled);
  assert.equal(arenaRulesFor(draft),'kanal2');assert.ok(draft.objects.some(o=>o.nativeCollision));
  const guideModule = await import('../modules/world/map-data/guide-fields.ts');
  const nativeFields = guideModule.buildFieldConfigs(guideModule.GUIDE_FIELD_CONFIGS);
  const field = JSON.parse(JSON.stringify(nativeFields)).find(f=>f.id==='kanal2');
  // Evaluate actual runtime field projection with an enabled detached draft;
  // never activate it in the real user's config.
  const fixtureMap={...draft,enabled:true};
  const src=fs.readFileSync('app/prototype.tsx','utf8'),
    mergeStart=src.indexOf('// Custom maps are'),mergeEnd=src.indexOf('const FIELD_BY_ID =');
  assert.ok(mergeStart>0&&mergeEnd>mergeStart,'prototype keeps the studio merge block');
  const copyExports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/player-copy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:copyExports});
  const projected={structuredClone,
    orderArenaSelection,getProgressionArenaId,
    FIELD_CONFIGS:JSON.parse(JSON.stringify(nativeFields)),
    studioMaps:[fixtureMap],studioBuiltinStates:{},
    arenaRulesFor,prepareArenaMap,arenaCopy:copyExports.arenaCopy,playerArenaCopy:copyExports.playerArenaCopy,kanalColliderObjects:(await import('../modules/world/map-arena-rules.ts')).kanalColliderObjects,
    kanalObjectPolygons:(await import('../modules/world/kanal-footprints.ts')).kanalObjectPolygons,result:null};
  vm.runInNewContext(ts.transpile(src.slice(mergeStart,mergeEnd)+';result=FIELD_CONFIGS;',{target:ts.ScriptTarget.ES2022}),projected);
  const replacement=JSON.parse(JSON.stringify(projected.result)).find(f=>f.id===draft.id);
  assert.ok(replacement);assert.ok(!projected.result.some(f=>f.id==='kanal2'));
  for(const k of ['baseRadius','objectScale','designWidth','designHeight'])assert.equal(replacement[k],field[k]);
  for(const owner of ['blue','red'])assert.deepEqual(replacement.prisons[owner],field.prisons[owner]);
  const walls=kanalPrisonWalls(field.prisons),rects=field.obstacles.flatMap(kanalObjectRects);
  const scale=field.objectScale,fortRects=Object.values(field.bases).flatMap(b=>polygonToRects(kanalFortPolygon(b,Math.round(168*scale),Math.round(188*scale),Math.round(130*scale))));
  const common=world({width:field.width,height:field.height,bases:field.bases,baseRadius:field.baseRadius,kanal:true,kanal2:true,
    waterAt:q.waterAt,waterBlocks:(x,y)=>{if(q.waterAt(x,y))return true;for(let i=0;i<16;i++)if(q.waterAt(x+Math.cos(i*Math.PI/8)*13,y+Math.sin(i*Math.PI/8)*13))return true;return false;},
    fortCoreAt:collision.createRectQuery(fortRects)});
  const native={...common,obstacles:[...rects,...walls]},editor={...common,obstacles:walls,studioSolidAt:q.solidAt,studioFlightSolidAt:q.flightSolidAt};
  const point=draft.objects.find(o=>o.name==='Batas kanalNusaPlanterLong');
  assert.equal(movement.movementBlocked(editor,point.x+point.w/2,point.y+point.h/2,actor({x:900,y:700,parkourUntil:2000}),1000),true,'landed animation does not grant wall immunity');
  assert.equal(movement.movementBlocked(editor,461.5,415.5,actor({x:900,y:700,parkourUntil:0}),1000),true);
  let waterPoint;
  for(let y=100;!waterPoint&&y<field.height-100;y+=31)for(let x=100;x<field.width-100;x+=31)if(q.waterAt(x,y)){waterPoint={x,y};break;}
  assert.ok(waterPoint);
  const fallA=actor({x:900,y:700,parkourUntil:0,fallSafeUntil:0}),fallB=structuredClone(fallA);
  assert.equal(movement.enterWaterFall(native,fallA,1000,waterPoint.x,waterPoint.y),true);
  assert.equal(movement.enterWaterFall(editor,fallB,1000,waterPoint.x,waterPoint.y),true);
  assert.deepEqual(fallB,fallA);assert.equal(fallB.waterFallUntil,1720);
  for(const p of [actor({x:900,y:700,parkourUntil:0}),actor({x:900,y:700,parkourUntil:2000}),actor({x:900,y:700,flight:{stage:'FLYING'}})])
    for(let y=58;y<field.height-32;y+=23)for(let x=34;x<field.width-34;x+=23)
      assert.equal(movement.movementBlocked(editor,x,y,p,1000),movement.movementBlocked(native,x,y,p,1000),`${x},${y} ${p.flight?.stage??p.parkourUntil}`);
  for(const owner of ['blue','red'])for(let count=1;count<=5;count++){
    const held=Array.from({length:count},(_,i)=>actor({id:String(i),state:'PRISONER',prisonOwner:owner}));
    const copy=structuredClone(held);interactions.layoutPrisoners(held,field.prisons,true);interactions.layoutPrisoners(copy,draft.prisons,arenaRulesFor(draft)==='kanal2');
    assert.deepEqual(copy,held);
  }
  const changed=structuredClone(raw),o=changed.objects.find(o=>o.id===point.id);o.x+=3;
  assert.equal(prepareArenaMap(validateMap(changed),reference.objects).objects.find(v=>v.id===o.id).behavior,'solid','custom geometry is not overwritten');
  assert.equal(arenaRulesFor({...draft,replaces:undefined,id:'studio-copy-kanal'}),'kanal2');
  assert.doesNotMatch(src,/field\.id\s*===\s*'kanal2'/,'no simulation branch may depend on mutable content ID');
});

void test('performance rectangle broadphase remains exact at seams, outside map and flight filtering',()=>{
  const rects=Array.from({length:1500},(_,i)=>({x:(i%50)*57-30,y:Math.floor(i/50)*39-20,w:17+(i%7),h:5.05,asset:'bush',hidden:!!(i%2)}));
  const query=collision.createRectQuery(rects);
  for(const radius of [0,13,32,130])for(let i=0;i<4000;i++){
    const x=(i*71.13)%3050-100,y=(i*37.09)%1500-100;
    assert.equal(query(x,y,radius),rects.some(r=>collision.pointHitsExpandedRect(x,y,r,radius)));
  }
  const base=world({obstacles:rects}),indexed={...base,obstacleAt:query,flightObstacleAt:collision.createRectQuery(rects.filter(o=>!flight.flightPassesObstacle(o)))};
  for(const p of [actor(),actor({parkourUntil:2000}),actor({flight:{stage:'FLYING'}})])for(let i=0;i<2000;i++){
    const x=(i*83.2)%1000,y=(i*24.7)%800;
    assert.equal(movement.movementBlocked(indexed,x,y,p,1000),movement.movementBlocked(base,x,y,p,1000));
  }
});
