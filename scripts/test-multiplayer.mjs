import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url),cache=new Map();
function load(file){const absolute=path.resolve(file);if(cache.has(absolute))return cache.get(absolute).exports;
  if(absolute.endsWith('.json'))return JSON.parse(fs.readFileSync(absolute,'utf8'));
  const compiledModule={exports:{}};cache.set(absolute,compiledModule);
  const output=ts.transpileModule(fs.readFileSync(absolute,'utf8').replaceAll('import.meta.env','({BASE_URL:"/"})'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText.replaceAll('import.meta.env','({BASE_URL:"/"})');
  const local=specifier=>{if(!specifier.startsWith('.'))return nativeRequire(specifier);const base=path.resolve(path.dirname(absolute),specifier);return load([base,base+'.ts',base+'.json',base+'.js'].find(f=>fs.existsSync(f)));};
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`,{filename:absolute})(local,compiledModule,compiledModule.exports);return compiledModule.exports;}
const transport=load('lib/multiplayer/transport.ts'),session=load('lib/multiplayer/session.ts'),lobby=load('lib/multiplayer/lobby.ts'),protocol=load('lib/multiplayer/protocol.ts');
const peer=n=>`peer${n}`.padEnd(20,'X');
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
function network(){const rooms=new Map(),links=new Map(),packets=[];
  return {rooms,links,packets,driver:n=>({selfId:peer(n),random:()=>new Uint8Array(8).fill(7),open(code){
    const members=rooms.get(code)??new Map();rooms.set(code,members);
    const handlers={join:()=>{},leave:()=>{},message:()=>{}};let closed=false;
    const link={handlers,send:async(data,target)=>{if(closed)throw Error('closed');packets.push({from:peer(n),target,data});
      for(const [id,other] of members)if(id!==peer(n)&&(!target||target===id))queueMicrotask(()=>{if(members.has(id))other.handlers.message(data,peer(n));});},
      getPeers:()=>Array.from(members.keys()).filter(id=>id!==peer(n)),onMessage:fn=>{handlers.message=fn;},onJoin:fn=>{handlers.join=fn;},onLeave:fn=>{handlers.leave=fn;},
      close(){if(closed)return;closed=true;members.delete(peer(n));for(const other of members.values())queueMicrotask(()=>other.handlers.leave(peer(n)));}};
    for(const [id,other] of members){queueMicrotask(()=>other.handlers.join(peer(n)));queueMicrotask(()=>handlers.join(id));}
    members.set(peer(n),link);links.set(peer(n),link);return link;
  }})};}
function clock(){let now=1000,serial=0;const tasks=new Map();return {tasks,now:()=>now,timeout:(fn,ms)=>{const key=++serial;tasks.set(key,{fn,at:now+ms});return key;},
  interval:(fn,ms)=>{const key=++serial;tasks.set(key,{fn,at:now+ms,interval:ms});return key;},clear:key=>tasks.delete(key),
  advance(ms){now+=ms;for(const [key,t] of tasks)if(t.at<=now){if(t.interval)t.at=now+t.interval;else tasks.delete(key);t.fn();}}};}

test('14 adapter validates bounded protocol, exchanges HELLO/PING/PONG, unsubscribe and disconnect',async()=>{
  const net=network(),host=await transport.createRoom(net.driver(1)),client=await transport.joinRoom(host.roomCode,net.driver(2));
  assert.ok(transport.parseRoomCode(host.roomCode));const seen=[],left=[];
  host.onMessage((p,m)=>{seen.push(m.type);if(m.type==='PING')void host.send(p,{version:1,type:'PONG',nonce:m.nonce,sentAtMs:m.sentAtMs});});
  client.onMessage((p,m)=>seen.push(m.type));host.onPeerLeave(p=>left.push(p));await settle();
  await client.send(host.localPeerId,{version:1,type:'HELLO',peerId:client.localPeerId,name:'Client'});
  await client.send(host.localPeerId,{version:1,type:'PING',nonce:1,sentAtMs:1000});await settle();assert.deepEqual(seen,['HELLO','PING','PONG']);
  net.links.get(host.localPeerId).handlers.message('not-json',client.localPeerId);
  net.links.get(host.localPeerId).handlers.message('{"version":2,"type":"PING"}',client.localPeerId);
  assert.equal(seen.length,3);await assert.rejects(host.send('missing',{version:1,type:'PING',nonce:1,sentAtMs:1000}));
  let callbacks=0;const off=host.onMessage(()=>callbacks++);off();await client.broadcast({version:1,type:'READY',peerId:client.localPeerId,ready:true});await settle();assert.equal(callbacks,0);
  client.close();client.close();await settle();assert.deepEqual(left,[client.localPeerId]);assert.equal(host.getPeers().length,0);host.close();
});
test('14 invalid room/self join fails before opening transport and closed rooms reject sends',async()=>{
  const net=network();await assert.rejects(transport.joinRoom('invalid',net.driver(1)));assert.equal(net.rooms.size,0);
  const host=await transport.createRoom(net.driver(1));await assert.rejects(transport.joinRoom(host.roomCode,net.driver(1)),/tab/);
  host.close();await assert.rejects(host.broadcast({version:1,type:'PING',nonce:1,sentAtMs:0}));
});
test('15 host/client bind HELLO ACK to real peer and session, exchange ping and clean up on leave',async()=>{
  const net=network(),hc=clock(),cc=clock(),host=await session.hostSession('Host',net.driver(1),hc),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),cc);
  await settle();assert.equal(client.read().phase,'lobby');assert.equal(host.read().lobby.participants.length,2);
  assert.equal(host.read().latencyMs,0);assert.equal(client.read().latencyMs,0);
  const copy=host.read();copy.lobby.participants[0].name='mutated';assert.equal(host.read().lobby.participants[0].name,'Host');
  host.close();await settle();assert.equal(client.read().phase,'ended');assert.match(client.read().error,/Host terputus/);assert.equal(hc.tasks.size,0);assert.equal(cc.tasks.size,0);
});
test('15 absent host times out gracefully, no ghost lobby and late callbacks cannot reopen it',async()=>{
  const net=network(),timer=clock(),code=`BNT-ABCDEFGH-${peer(1)}`,client=await session.joinSession(code,'Client',net.driver(2),timer);
  assert.equal(client.read().phase,'connecting');timer.advance(20000);await settle();assert.equal(client.read().phase,'ended');assert.equal(client.read().lobby,null);
  assert.match(client.read().error,/Host tidak ditemukan/);assert.equal(timer.tasks.size,0);assert.equal(net.rooms.get(code).size,0);client.close();
});
test('16 selection/ready synchronize under host authority, duplicate/forged requests fail, bots fill and start is host only',async()=>{
  const net=network(),host=await session.hostSession('Host',net.driver(1),clock()),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock());
  try{await settle();assert.deepEqual(lobby.botPreview(host.read().lobby),{red:4,green:4});assert.equal(host.start(),false);assert.equal(client.start(),false);
    client.select('green','ciici');await settle();assert.equal(host.read().lobby.participants[1].characterId,'ciici');assert.equal(client.read().lobby.participants[1].ready,false);
    client.select('red','raja');await settle();assert.equal(host.read().lobby.participants[1].characterId,'ciici');assert.match(client.read().error,/Pilihan ditolak/);
    const before=host.read().lobby;await net.links.get(peer(2)).send(protocol.encodeProtocolMessage({version:1,type:'READY',peerId:peer(1),ready:false}),peer(1));
    await settle();assert.deepEqual(host.read().lobby,before);
    client.ready(true);await settle();assert.equal(client.read().lobby.participants[1].ready,true);assert.equal(host.start(),true);await settle();
    assert.equal(client.read().phase,'playing');assert.equal(host.read().lobby.phase,'started');client.select('green','kaka');await settle();assert.equal(host.read().lobby.participants[1].characterId,'ciici');
  }finally{client.close();host.close();}
});
test('16 maximum four humans, full room rejection and client departure update authoritative roster',async()=>{
  const net=network(),host=await session.hostSession('Host',net.driver(1),clock()),clients=[];
  try{for(let n=2;n<=5;n++){clients.push(await session.joinSession(host.read().roomCode,`Client${n}`,net.driver(n),clock()));await settle();}
    assert.equal(host.read().lobby.participants.length,4);assert.equal(clients[3].read().phase,'ended');assert.match(clients[3].read().error,/penuh/);
    clients[0].close();await settle();assert.equal(host.read().lobby.participants.length,3);assert.equal(clients[1].read().lobby.participants.length,3);
  }finally{for(const c of clients)c.close();host.close();}
});
test('16 clients ignore forged/stale lobby states and protocol rejects malformed canonical roster',async()=>{
  const net=network(),host=await session.hostSession('Host',net.driver(1),clock()),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock());
  try{await settle();const before=client.read().lobby,bad={version:1,type:'LOBBY_STATE',lobby:{...before,revision:before.revision+1}};
    net.links.get(peer(2)).handlers.message(protocol.encodeProtocolMessage(bad),'impostor');assert.deepEqual(client.read().lobby,before);
    net.links.get(peer(2)).handlers.message(protocol.encodeProtocolMessage({version:1,type:'LOBBY_STATE',lobby:before}),peer(1));assert.deepEqual(client.read().lobby,before);
    for(const alter of [s=>s.participants[1].host=true,s=>s.hostPeerId='missing',s=>s.participants.push(s.participants[0]),s=>s.participants=[]]){
      const state=structuredClone(before);alter(state);assert.equal(protocol.parseProtocolMessage({version:1,type:'LOBBY_STATE',lobby:state}),null);
    }
  }finally{client.close();host.close();}
});
test('14–16 transport unused never runs networking in single-player; session does not write gameplay/profile',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8');assert.ok(source.includes('const MultiplayerPanel = lazy'));
  assert.ok(source.includes('multiplayerOpen&&playerProfile&&<Suspense'));assert.ok(source.includes('if (profileOpen || multiplayerOpen) return'));
  for(const file of ['transport.ts','lobby.ts','session.ts'])assert.doesNotMatch(fs.readFileSync(`lib/multiplayer/${file}`,'utf8'),/\b(?:localStorage|recordMatchProgression|resolveTag|moveActor|stepUltimate)\b/);
});
test('UI invite carries host arena, rejects unknown content and preserves the content handshake',()=>{
  const {createInvite,parseInvite}=load('lib/multiplayer/invite.ts');
  const code='BNT-ABCDEFGH-abcdefghijklmnopqrst',arenas=[{id:'kampung'}];
  const invite=createInvite('https://example.test/benteng/?build=abc',code,'kampung');
  assert.deepEqual(parseInvite(invite,arenas),{code,arenaId:'kampung'});
  assert.equal(new URL(invite).searchParams.get('build'),'abc');
  assert.deepEqual(parseInvite(code,arenas),{code,arenaId:null});
  for(const invalid of ['bad',invite.replace('kampung','unknown'),invite.replace(code,'bad')])assert.equal(parseInvite(invalid,arenas),null);
  assert.throws(()=>createInvite('https://example.test','bad','kampung'));
  assert.ok(fs.readFileSync('lib/multiplayer/session.ts','utf8').includes('contentMismatch'));
});

const remote=load('lib/multiplayer/remote-input.ts'),interpolation=load('lib/multiplayer/interpolation.ts'),content=load('lib/multiplayer/content.ts');
const roster=load('lib/multiplayer/roster.ts');
test('20 takeover preserves actor identity, character, prison and stats; late inputs stay revoked',()=>{
  const p={entityId:'entity-0002',ownerPeerId:peer(2),controller:'remote',controlled:false,characterId:'kodo',state:'PRISONER',x:100,y:200,vx:2,vy:3,captures:2};
  const disconnected=new Set(),changes=roster.takeoverDisconnected([p],new Set([peer(1)]),disconnected);
  assert.deepEqual(changes,[{peerId:peer(2),entityId:p.entityId}]);assert.equal(p.controller,'bot');assert.equal(p.ownerPeerId,undefined);
  assert.equal(p.characterId,'kodo');assert.equal(p.state,'PRISONER');assert.equal(p.captures,2);assert.equal(p.x,100);
  assert.deepEqual(roster.takeoverDisconnected([p],new Set(),disconnected),[]);
  const buffer=remote.createRemoteInputBuffer('match-test',new Map([[p.entityId,peer(2)]]),1000,800);
  buffer.disconnect(peer(2));assert.equal(buffer.accept(peer(2),{version:1,type:'INPUT',matchId:'match-test',entityId:p.entityId,sequence:2,input:remote.neutralInput()},1000),false);
});
test('20 host removes silent client without ending match, retaining frozen reserve roster for future rounds',async()=>{
  const net=network(),hc=clock(),host=await session.hostSession('Host',net.driver(1),hc),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock());
  try{await settle();client.select('green','kodo');await settle();client.ready(true);await settle();host.start();await settle();
    const frozen=roster.createMatchRoster(host.read().lobby);hc.advance(11000);await settle();
    assert.equal(host.read().phase,'playing');assert.equal(host.read().lobby.participants.length,1);assert.equal(client.read().phase,'ended');
    assert.equal(frozen.length,10);assert.equal(frozen.find(p=>p.peerId===peer(2)).characterId,'kodo');
  }finally{client.close();host.close();}
});
function sampleSnapshot(){
  const entity={id:'entity-0001',character:'raja',team:'red',controller:'local',x:200,y:200,vx:0,vy:0,direction:null,poseSeed:0,state:'ACTIVE',
    action:null,actionUntil:0,parkourUntil:0,exitOrder:1,boost:100,baseCharge:0,exitDeadline:0,boostReadyAt:0,fortCharge:0,prisonOwner:null,prisonIndex:0,
    rescueShieldUntil:0,ultimateShieldUntil:0,waterEnteredAt:0,waterFallUntil:0,fallNoticeUntil:0,tagDirection:null,flight:null,ultimateMeter:0};
  return {version:1,matchId:'match-test',arenaId:'kampung',tick:1,timeMs:900000,simulationTimeMs:30,phase:'PLAYING',paused:false,round:1,timer:240,
    phaseUntilMs:null,suddenDeath:false,entities:[entity],score:{red:0,green:0},combos:{red:{step:0,expiresAt:0,surgeUntil:0},green:{step:0,expiresAt:0,surgeUntil:0}},
    objective:{redHeldSeconds:0,greenHeldSeconds:0},ultimate:{actorId:null,impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0,castMs:null,speedMultiplier:null},
    refills:[],rescueRequest:null,result:null};
}
test('17 remote ownership/sequence/shape/bounds gates and timeout neutralization happen before writes',()=>{
  const buffer=remote.createRemoteInputBuffer('match-test',new Map([['entity-0002',peer(2)]]),1000,800);
  const m={version:1,type:'INPUT',matchId:'match-test',entityId:'entity-0002',sequence:1,input:{...remote.neutralInput(),moveX:1,sprint:true,sprintPulse:true}};
  for(const invalid of [{...m,entityId:'entity-0001'},{...m,matchId:'other'},{...m,sequence:0},{...m,input:{...m.input,moveX:NaN}},
    {...m,input:{...m.input,moveY:2}},{...m,input:{...m.input,target:{x:2000,y:200}}},{...m,input:{...m.input,pause:true}}])assert.equal(buffer.accept(peer(2),invalid,1000),false);
  assert.equal(buffer.accept(peer(3),m,1000),false);assert.equal(buffer.accept(peer(2),m,1000),true);
  m.input.moveX=-1;const first=buffer.sample('entity-0002',1001);assert.equal(first.moveX,1);assert.equal(first.sprint,true);assert.equal(first.sprintPulse,true);
  assert.equal(buffer.sample('entity-0002',1002).sprintPulse,false);
  assert.equal(buffer.accept(peer(2),m,1003),false);assert.equal(buffer.sample('entity-0002',1300).moveX,0);
  buffer.disconnect(peer(2));assert.equal(buffer.sample('entity-0002',1301).moveX,0);
});
test('17 remote movement uses human speed/boost/parkour and never moves another actor',()=>{
  const p={entityId:'entity-0002',x:100,y:100,state:'ACTIVE',boost:100,parkourUntil:0,waterEnteredAt:0},other={x:5,y:5},move=remote.createRemoteHumanMovement(),calls=[];
  const frame={entityId:p.entityId,sequence:1,...remote.neutralInput(),moveX:1,sprint:true,keyboardSprint:true,parkour:true};
  const hooks={move:(p,x,y,speed,dt)=>{calls.push(speed);p.x+=x*speed*dt;},landing:()=>({x:150,y:100,crossedWater:false}),near:()=>true,
    returnVector:()=>({x:1,y:0}),combo:()=>1,water:false,boostDurationMs:1400};
  move(p,frame,{speed:100,boostDrain:10,boostMultiplier:2,agility:1},.1,1000,hooks);
  assert.equal(p.x,170);assert.equal(p.boost,91);assert.equal(p.parkourUntil,1360);assert.deepEqual(calls,[200]);assert.deepEqual(other,{x:5,y:5});
  p.state='PRISONER';move(p,frame,{speed:100,boostDrain:10,boostMultiplier:2,agility:1},.1,1100,hooks);assert.equal(p.x,170);assert.equal(p.vx,0);
});
test('18 bounded interpolation uses local receive clock, latest discrete state, no extrapolation or mutation',()=>{
  const buffer=interpolation.createSnapshotBuffer('match-test','kampung'),a=sampleSnapshot(),b=structuredClone(a);
  b.tick=2;b.entities[0].x=300;b.entities[0].action='tag';b.entities[0].direction=1;b.timeMs+=100;
  assert.equal(buffer.push(a,1000),true);assert.equal(buffer.push(b,1100),true);assert.equal(buffer.push(a,1200),false);
  const result=buffer.read(1150);assert.equal(result.entities[0].x,250);assert.equal(result.entities[0].action,'tag');assert.equal(result.entities[0].direction,1);
  result.entities[0].x=999;assert.equal(buffer.read(1150).entities[0].x,250);assert.equal(a.entities[0].x,200);
  assert.equal(buffer.read(2000).entities[0].x,300);assert.equal(buffer.push({...b,matchId:'other'},2100),false);
  const c=structuredClone(b);c.tick=3;c.entities[0].state='PRISONER';c.entities[0].x=20;
  buffer.push(c,1200);assert.equal(buffer.read(1200).entities[0].x,20);
});
test('18 snapshot projection detaches presentation and carries latest prison/ultimate/objective states',()=>{
  const s=sampleSnapshot(),template={entities:[{entityId:'entity-0001',lastX:200,lastY:200,capturedEntityIds:[]}],
    teams:{red:{score:0,combo:{lastActorEntityId:null}},green:{score:0,combo:{lastActorEntityId:null}}},ultimate:{}};
  s.entities[0].state='PRISONER';s.entities[0].ultimateShieldUntil=9999;s.entities[0].parkourUntil=9900;s.objective.redHeldSeconds=1;
  s.ultimate.castMs=3200;s.ultimate.speedMultiplier=1.4;
  const before=structuredClone(template),snapshotBefore=structuredClone(s),render=interpolation.snapshotRenderState(template,s);
  assert.equal(render.entities[0].state,'PRISONER');assert.equal(render.entities[0].ultimateShieldUntil,9999);assert.equal(render.entities[0].parkourUntil,9900);
  assert.deepEqual(render.ultimate.effectiveStats,{castMs:3200,speedMultiplier:1.4});assert.equal(Object.hasOwn(render.ultimate,'castMs'),false);
  assert.equal(render.teams.red.allHeldSeconds,1);render.entities[0].x=999;render.entities[0].capturedEntityIds.push('test');
  assert.deepEqual(template,before);assert.deepEqual(s,snapshotBefore);
});
test('19 compatibility rejects protocol/build/arena/revision differences with readable messages',()=>{
  const c=content.testContent;assert.equal(content.contentMismatch(c,{...c}),null);
  for(const [key,value,pattern] of [['protocolVersion',2,/protokol/],['buildVersion','other',/build/],['arenaId','other',/Arena/],['arenaRevision','other',/Revisi/]])
    assert.match(content.contentMismatch(c,{...c,[key]:value}),pattern);
});
test('19 mismatch never admits participant or starts, including wire protocol mismatch',async()=>{
  for(const alteration of [{arenaRevision:'changed'},{arenaId:'another'},{buildVersion:'changed'},{protocolVersion:2}]){
    const net=network(),host=await session.hostSession('Host',net.driver(1),clock(),content.testContent),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock(),{...content.testContent,...alteration});
    try{await settle();assert.equal(client.read().phase,'ended');assert.equal(host.read().lobby.participants.length,1);assert.equal(host.start(),false);}finally{client.close();host.close();}
  }
  const net=network(),host=await session.hostSession('Host',net.driver(1),clock()),client=await transport.joinRoom(host.read().roomCode,net.driver(2)),seen=[];
  client.onMessage((p,m)=>seen.push(m));await settle();await net.links.get(peer(2)).send(JSON.stringify({version:2,type:'HELLO',peerId:peer(2),name:'Old'}),peer(1));await settle();
  assert.equal(seen[0].code,'incompatible');assert.equal(host.read().lobby.participants.length,1);client.close();host.close();
});
test('19 a peer cannot keep its compatibility approval after changing revision',async()=>{
  const net=network(),host=await session.hostSession('Host',net.driver(1),clock()),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock());
  try{await settle();client.ready(true);await settle();
    await net.links.get(peer(2)).send(protocol.encodeProtocolMessage({version:1,type:'CONTENT_VERSION',content:{...content.testContent,arenaRevision:'changed'}}),peer(1));await settle();
    assert.equal(host.start(),false);assert.equal(host.read().lobby.participants.length,1);assert.equal(client.read().phase,'ended');
  }finally{client.close();host.close();}
});
test('17–18 session routes host-bound INPUT and host-only monotonic snapshots only after start',async()=>{
  const net=network(),identity={...content.testContent,arenaId:'kampung'},host=await session.hostSession('Host',net.driver(1),clock(),identity),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock(),identity);
  try{await settle();client.ready(true);await settle();host.start();await settle();const inputs=[],received=[];
    host.onGameplay((p,m)=>inputs.push({p,m}));client.onGameplay((p,m)=>received.push(m));
    const matchId=`${host.read().roomCode}:match`,s={...sampleSnapshot(),matchId};
    client.sendInput({version:1,type:'INPUT',matchId,entityId:'entity-0002',sequence:1,input:remote.neutralInput()});
    host.publishSnapshot({version:1,type:'SNAPSHOT',matchId,tick:s.tick,snapshot:s});await settle();assert.equal(inputs[0].p,peer(2));assert.equal(received.length,1);
    host.publishSnapshot({version:1,type:'SNAPSHOT',matchId,tick:s.tick,snapshot:s});await settle();assert.equal(received.length,1);
    net.links.get(peer(2)).handlers.message(protocol.encodeProtocolMessage({version:1,type:'SNAPSHOT',matchId,tick:2,snapshot:{...s,tick:2}}),'impostor');assert.equal(received.length,1);
  }finally{client.close();host.close();}
});
test('17–19 live client branch does not call authoritative update, routing, reward; rates are configurable separately',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8'),branch=source.slice(source.indexOf('      if(clientOnly){'),source.indexOf('      const drawStart=profileRuntime'));
  assert.ok(branch.includes('sendInput'));assert.ok(branch.includes('snapshotRenderState'));
  const clientBranch=branch.slice(0,branch.indexOf('      }else {'));
  assert.doesNotMatch(clientBranch,/\b(?:update|move|tagCheck|rescueCheck|botAuthority\.run)\(/);
  assert.ok(source.includes('matchId && !network'));assert.ok(source.includes('NETWORK_RATES.snapshotHz'));
});
test('18 sudden silent host cannot leave client permanently frozen even before WebRTC leave callback',async()=>{
  const net=network(),hc=clock(),cc=clock(),host=await session.hostSession('Host',net.driver(1),hc),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),cc);
  try{await settle();assert.equal(client.read().phase,'lobby');
    cc.advance(11000);assert.equal(client.read().phase,'ended');assert.match(client.read().error,/Host terputus/);assert.equal(cc.tasks.size,0);
  }finally{client.close();host.close();}
});

const results=load('lib/multiplayer/result.ts'),skills=load('lib/multiplayer/ultimates.ts');
function finalPacket(matchId='match-test'){
  const s=sampleSnapshot();s.matchId=matchId;s.tick=20;s.phase='MATCH_OVER';s.score.red=2;s.round=2;s.result={winner:'red',reason:'BENTENG DIREBUT',complete:true};
  s.entities.push({...s.entities[0],id:'entity-0002',character:'kaka',team:'green',controller:'remote'});
  return {version:1,type:'MATCH_RESULT',matchId,arenaId:'kampung',tick:20,winner:'red',reason:'BENTENG DIREBUT',snapshot:s,
    humans:[{peerId:peer(1),entityId:'entity-0001',team:'red',eligible:true,tags:3,rescues:2,prisons:1},
      {peerId:peer(2),entityId:'entity-0002',team:'green',eligible:true,tags:2,rescues:1,prisons:3}]};
}
test('21 existing profile writer persists correct local XP/DOI/stats once, reload dedup and blocked storage retry',()=>{
  const beforeWindow=globalThis.window,values=new Map();let writes=0,blocked=false;
  globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('blocked');writes++;values.set(key,value);}},dispatchEvent:()=>{}};
  try{const service=load('lib/player-profile/profile-service.ts'),storage=load('lib/player-profile/storage.ts');
    const profile=service.createPlayerProfile('ClientQA'),packet=finalPacket(),expected={matchId:packet.matchId,arenaId:'kampung',peerId:peer(2),entityId:'entity-0002',team:'green'};
    const handoff=results.createResultHandoff(expected,service.recordMatchProgression);
    blocked=true;assert.throws(()=>handoff(packet),/penyimpanan browser gagal/);assert.equal(storage.loadPlayerProfile().progression.xp,0);
    blocked=false;const handed=handoff(packet);assert.ok(handed.ack);assert.ok(handed.result.applied);assert.ok(handed.result.xpEarned>0);assert.ok(handed.result.tokenEarned>0);
    const saved=storage.loadPlayerProfile();assert.equal(saved.id,profile.id);assert.equal(saved.kalah,1);assert.equal(saved.menang,0);
    assert.deepEqual(saved.kda,{tagMusuh:2,rescueTeam:1,masukPenjara:3});assert.equal(saved.progression.xp,handed.result.xpEarned);assert.equal(saved.economy.tokenBalance,handed.result.currentTokenBalance);
    assert.equal(handoff(packet).result,null);assert.equal(writes,2);
    const reloaded=results.createResultHandoff(expected,service.recordMatchProgression)(packet);assert.equal(reloaded.result.reason,'duplicate');assert.equal(writes,2);
    const wrong={...packet,arenaId:'other'};assert.equal(handoff(wrong).ack,false);
    const inactive=structuredClone(packet);inactive.humans[1].eligible=false;let calls=0;
    assert.equal(results.createResultHandoff(expected,()=>{calls++;throw Error();})(inactive).ack,true);assert.equal(calls,0);
  }finally{if(beforeWindow===undefined)delete globalThis.window;else globalThis.window=beforeWindow;}
});
test('21 host-only final result delivery and ack/retry, duplicate/conflicting/forged outcomes cannot award',async()=>{
  const net=network(),hc=clock(),identity={...content.testContent,arenaId:'kampung'},host=await session.hostSession('Host',net.driver(1),hc,identity),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock(),identity);
  try{await settle();client.ready(true);await settle();host.start();await settle();const received=[];client.onGameplay((p,m)=>{if(m.type==='MATCH_RESULT')received.push(m);});
    const packet=finalPacket(`${host.read().roomCode}:match`);
    net.links.get(peer(2)).handlers.message(protocol.encodeProtocolMessage(packet),'impostor');assert.equal(received.length,0);
    host.publishResult(packet);await settle();assert.equal(received.length,1);hc.advance(5000);await settle();assert.equal(received.length,2);
    client.ackResult(packet.matchId);await settle();hc.advance(5000);await settle();assert.equal(received.length,2);
    const bad=structuredClone(packet);bad.humans[1].tags++;await net.links.get(peer(1)).send(protocol.encodeProtocolMessage(bad),peer(2));await settle();assert.equal(received.length,2);
    const malformed=structuredClone(packet);malformed.winner='green';assert.equal(protocol.parseProtocolMessage(malformed),null);
  }finally{client.close();host.close();}
});
function skillActor(id,characterId,team='red'){return {entityId:id,controller:'remote',ownerPeerId:id,characterId,controlled:false,team,
  x:200,y:200,vx:0,vy:0,lastX:200,lastY:200,state:'ACTIVE',parkourUntil:0,actionUntil:0,boost:100,waterEnteredAt:0,ultimateShieldUntil:0};}
test('22 each human has independent authoritative ultimate meter; Raja/Kaka effects and flight immunity reuse core',()=>{
  const actors=[skillActor('raja','raja','blue'),skillActor('kaka','kaka'),skillActor('bebe','bebe','blue'),skillActor('ciici','ciici')],supported=new Set(actors.map(p=>p.characterId));
  const authority=skills.createNetworkUltimates(actors),rules=p=>({supported,rechargeSeconds:45,castMs:p.characterId==='kaka'?3600:3200,durationMs:5000,speedMultiplier:1.4,kanal2:false});
  const step=(frames,dt,now)=>authority.tick(actors,new Map(frames),dt,now,rules,()=>true,()=>true,()=>{});
  step([],45,1000);for(const p of actors)assert.equal(authority.get(p.entityId).meter,100);
  const pressed=actors.map(p=>[p.entityId,{entityId:p.entityId,ultimate:true}]);const started=step(pressed,0,1000);
  assert.equal(started.facts.filter(e=>e.type==='ULTIMATE_STARTED').length,4);assert.equal(started.casting,true);
  assert.ok(actors[2].flight);assert.ok(actors[3].flight);assert.equal(authority.get('bebe').meter,0);
  const applied=step([],0,4600);assert.equal(applied.facts.filter(e=>e.type==='ULTIMATE_APPLIED').length,2);
  assert.equal(actors[1].ultimateShieldUntil,9600);assert.equal(actors[3].ultimateShieldUntil,9600);
  assert.equal(authority.speed(actors[0],actors,5000,rules),1.4);assert.equal(authority.speed(actors[1],actors,5000,rules),1);
  assert.equal(step([],0,4601).facts.filter(e=>e.type==='ULTIMATE_APPLIED').length,0);
  authority.gain(actors[2],20,supported);assert.equal(authority.get('bebe').meter,20);assert.equal(authority.get('ciici').meter,0);
  authority.reset();assert.equal(authority.get('bebe').meter,20,'round reset retains charge like single-player');assert.equal(authority.get('raja').buffUntil,0);
  const flight=load('lib/flight-ultimate.js');assert.equal(flight.flightBusy(actors[2]),true);assert.equal(flight.flightBusy(actors[3]),true);
  const interactions=load('lib/game-core/interactions.ts'),attacker={...skillActor('attacker','robot'),exitOrder:99,tagCooldown:0};
  for(const stage of ['FLIGHT_TAKEOFF','FLYING','FLIGHT_LANDING']){
    const target={...actors[2],exitOrder:1,flight:{...actors[2].flight,stage}};
    assert.equal(interactions.resolveTag([attacker,target],attacker.entityId,target.entityId,5000,{kanal2:false,tagRange:()=>500,tagCooldownMs:()=>500,lineOfSight:()=>true}),null);
  }
});
test('22 reliable presentation events are host-only and deduplicated, complete frame stats bound to snapshot identities',async()=>{
  const net=network(),identity={...content.testContent,arenaId:'kampung'},host=await session.hostSession('Host',net.driver(1),clock(),identity),client=await session.joinSession(host.read().roomCode,'Client',net.driver(2),clock(),identity);
  try{await settle();client.ready(true);await settle();host.start();await settle();const received=[];client.onGameplay((p,m)=>received.push(m));
    const matchId=`${host.read().roomCode}:match`,message={version:1,type:'GAME_EVENT',matchId,tick:1,eventId:'evt-1',event:{type:'PLAYER_TAGGED',actorId:'entity-0001',targetId:'entity-0002',x:1,y:1}};
    host.publishEvent(message);host.publishEvent(message);await settle();assert.equal(received.length,1);
    net.links.get(peer(2)).handlers.message(protocol.encodeProtocolMessage({...message,eventId:'evt-forged'}),'other');assert.equal(received.length,1);
    const s={...sampleSnapshot(),matchId},rows=[{entityId:'entity-0001',tags:3,rescues:1,prisons:0}],frame={version:1,type:'MATCH_FRAME',matchId,tick:1,snapshot:s,matchStartedAtMs:1000,rescueCooldownUntil:0,roundStats:rows,matchStats:rows};
    host.publishSnapshot(frame);await settle();assert.equal(received.at(-1).type,'MATCH_FRAME');assert.equal(received.at(-1).matchStats[0].tags,3);
    assert.equal(protocol.parseProtocolMessage({...frame,roundStats:[{...rows[0],entityId:'unknown'}]}),null);
  }finally{client.close();host.close();}
});
test('23 three/four human ownership queues isolate controls, fill 7/6 bots and transfer departed peers individually',()=>{
  for(const humans of [3,4]){
    let state=lobby.createLobby(peer(1),'Host','room');for(let n=2;n<=humans;n++)state=lobby.addParticipant(state,peer(n),`Player${n}`);
    const plan=roster.createMatchRoster(state),actors=plan.map((p,index)=>({...skillActor(`entity-${index+1}`,p.characterId,p.team==='red'?'blue':'red'),
      ownerPeerId:p.peerId??undefined,controller:p.peerId?index===0?'local':'remote':'bot'}));
    assert.equal(actors.length,10);assert.equal(actors.filter(p=>p.controller==='bot').length,10-humans);
    const owners=new Map(actors.filter(p=>p.controller==='remote').map(p=>[p.entityId,p.ownerPeerId])),queue=remote.createRemoteInputBuffer('match-test',owners,1000,800);
    for(const p of actors.filter(p=>p.controller==='remote')){
      const m={version:1,type:'INPUT',matchId:'match-test',entityId:p.entityId,sequence:1,input:{...remote.neutralInput(),moveX:1}};
      assert.equal(queue.accept(peer(1),m,1000),false);assert.equal(queue.accept(p.ownerPeerId,m,1000),true);
    }
    const departed=actors.find(p=>p.controller==='remote'),disconnected=new Set(),present=new Set(state.participants.map(p=>p.peerId));present.delete(departed.ownerPeerId);
    assert.equal(roster.takeoverDisconnected(actors,present,disconnected).length,1);assert.equal(actors.filter(p=>p.controller==='bot').length,11-humans);
    assert.equal(actors.filter(p=>p.controller==='remote').length,humans-2);
  }
});
test('22 one-shot skills survive coalesced network inputs and never consume twice per simulation frame',()=>{
  const queue=remote.createRemoteInputBuffer('match-test',new Map([['entity-0002',peer(2)]]),1000,800);
  const m={version:1,type:'INPUT',matchId:'match-test',entityId:'entity-0002',sequence:1,input:{...remote.neutralInput(),ultimate:true,rescue:true}};
  assert.equal(queue.accept(peer(2),m,1000),true);assert.equal(queue.accept(peer(2),{...m,sequence:2,input:remote.neutralInput()},1001),true);
  const frame=queue.sample(m.entityId,1002);assert.equal(frame.ultimate,true);assert.equal(frame.rescue,true);
  assert.equal(queue.sample(m.entityId,1003).ultimate,false);assert.equal(queue.sample(m.entityId,1004).rescue,false);
});
test('23 telemetry counts exact UTF-8 payload bytes/types, peer-specific sends and detached readings',async()=>{
  const net=network(),host=await transport.createRoom(net.driver(1)),client=await transport.joinRoom(host.roomCode,net.driver(2));
  try{await settle();host.resetMetrics();client.resetMetrics();const m={version:1,type:'HELLO',peerId:peer(2),name:'Pémain'};
    await client.send(peer(1),m);await settle();const expected=new TextEncoder().encode(protocol.encodeProtocolMessage(m)).byteLength;
    assert.equal(client.metrics().sentBytes,expected);assert.equal(host.metrics().receivedBytes,expected);assert.equal(client.metrics().sentByType.HELLO.messages,1);
    const copy=client.metrics();copy.sentByType.HELLO.bytes=0;assert.equal(client.metrics().sentByType.HELLO.bytes,expected);
  }finally{client.close();host.close();}
});
