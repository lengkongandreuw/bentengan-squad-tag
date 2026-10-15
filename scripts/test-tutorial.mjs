import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTutorialSession,advanceTutorial,tutorialEventSignal} from '../lib/tutorial/state-machine.ts';
import {TUTORIAL_STEPS} from '../lib/tutorial/steps.ts';
import {TUTORIAL_MATCH,isTutorialMatch} from '../lib/tutorial/match-config.ts';
import {choosePracticeArea,chooseTutorialSpawn,createTutorialDirector,createMovementLessonMonitor,tutorialCaptureEnabled} from '../lib/tutorial/director.ts';
import {createParkourController} from '../modules/gameplay/parkour.ts';
import {parkourLanding,movementBlocked} from '../modules/gameplay/movement.ts';
import {resolveTag,resolveRescue} from '../modules/gameplay/tag-combat.ts';
import {createTutorialRecovery,createUltimateLesson} from '../lib/tutorial/recovery.ts';
import {stepUltimate} from '../modules/gameplay/ultimate.ts';
import {endRound} from '../modules/game-core/match-control.ts';

void test('09 actual ultimate impact waits for visible effect, ignores others and cannot count START alone',()=>{
  const actor={entityId:'human',characterId:'raja',state:'ACTIVE',parkourUntil:0,actionUntil:0,team:'blue'};
  const state={meter:100,impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0};
  const rules={supported:new Set(['raja']),kanal2:false,rechargeSeconds:45,castMs:3200,durationMs:5000,speedMultiplier:1.4};
  const lesson=createUltimateLesson();
  const started=stepUltimate([actor],actor,state,1/60,100,true,rules);
  assert.equal(lesson.observe(started,'human',100),false);
  assert.equal(tutorialEventSignal(started,'human'),null);
  assert.equal(lesson.observe([],'human',10000),false,'no impact, no success');
  const applied=stepUltimate([actor],actor,state,1/60,3300,false,rules);
  assert.equal(applied[0].type,'ULTIMATE_APPLIED');assert.equal(state.buffUntil,8300);
  assert.equal(lesson.observe(applied,'human',3300),false);
  assert.equal(lesson.observe([],'human',5099),false);
  assert.equal(lesson.observe([],'human',5100),true);
  assert.equal(lesson.observe([],'human',5200),false,'once only');
  lesson.reset();assert.equal(lesson.observe(applied,'other',9000),false);
  assert.equal(lesson.observe([],'other',12000),false);
  assert.equal(rules.rechargeSeconds,45);assert.equal(rules.durationMs,5000);
});
void test('09 one tutorial fort win uses actual match authority; normal still requires two',()=>{
  const normal={blue:0,red:0},practice={blue:0,red:0};
  assert.equal(endRound([],normal,'PLAYING','blue','BENTENG DIREBUT',1).type,'ROUND_ENDED');
  assert.equal(endRound([],normal,'PLAYING','blue','BENTENG DIREBUT',2).type,'MATCH_ENDED');
  assert.equal(endRound([],practice,'PLAYING','blue','BENTENG DIREBUT',1,1).type,'MATCH_ENDED');
  assert.equal(practice.blue,1,'not a preseeded score');
});
void test('10 recovery detects missing/captured/stuck actors, restores detached scenario without step or profile signals',()=>{
  const actors=[{entityId:'human',controller:'local',state:'ACTIVE',x:0,y:0},
    {entityId:'bot',controller:'bot',state:'ACTIVE',x:30,y:0}];
  const recovery=createTutorialRecovery();assert.equal(recovery.enter('move',actors),true);
  assert.equal(recovery.enter('move',actors),false);
  assert.equal(recovery.tick(18,actors,new Map()),null);assert.equal(recovery.hint().level,1);
  recovery.tick(17,actors,new Map());assert.equal(recovery.hint().level,2);
  assert.equal(recovery.tick(0,actors.slice(0,1),new Map()),'missing');
  const restored=recovery.restore();restored[0].x=999;assert.equal(actors[0].x,0);
  assert.equal(recovery.restore()[0].x,0);assert.equal(recovery.hint().recovered,true);
  assert.equal(recovery.tick(1,[{...actors[0],state:'PRISONER'},actors[1]],new Map()),'captured');
  const destinations=new Map([['bot',{x:500,y:0}]]);
  recovery.restore();assert.equal(recovery.tick(1,actors,destinations),null);
  assert.equal(recovery.tick(14,actors,destinations),'blocked');
  recovery.restore();recovery.tick(1,actors,destinations);
  assert.equal(recovery.tick(14,[actors[0],{...actors[1],x:70}],destinations),null,'moving bot must not reset');
});
void test('10 lost lesson targets can recover but do not count as real tag/rescue',()=>{
  const actors=[{entityId:'human',controller:'local',state:'ACTIVE',x:0,y:0},
    {entityId:'ciici',controller:'bot',characterId:'ciici',state:'ACTIVE',x:30,y:0},
    {entityId:'robot',controller:'bot',characterId:'robot',state:'PRISONER',x:60,y:0}];
  const r=createTutorialRecovery();r.enter('tag_enemy',actors);
  assert.equal(r.tick(0,[actors[0],{...actors[1],state:'PRISONER'},actors[2]],new Map()),'target');
  assert.equal(r.restore()[1].state,'ACTIVE');
  r.enter('rescue_friend',actors);
  assert.equal(r.tick(0,[actors[0],actors[1],{...actors[2],state:'RETURNING'}],new Map()),'friend');
  assert.equal(r.restore()[2].state,'PRISONER');assert.equal(tutorialEventSignal([],'human'),null);
});
void test('14 assisted final approach stops a capture-reset loop without completing fort or weakening other lessons',()=>{
  const area={center:{x:300,y:300},barrier:{x:250,y:292,w:100,h:16},start:{x:300,y:268},end:{x:300,y:365}};
  const human={entityId:'human',controller:'local',state:'ACTIVE',team:'blue',x:300,y:300};
  const friend={...human,entityId:'friend',controller:'bot'},target={...friend,entityId:'target',team:'red'},captor={...target,entityId:'captor'};
  const players=[human,friend,target,captor],director=createTutorialDirector('human','friend','target','captor',area,{blue:{x:0,y:0},red:{x:1000,y:0}},118),recovery=createTutorialRecovery();
  recovery.enter('capture_benteng',players);assert.equal(recovery.assisted(),false);
  assert.equal(director.allowsContact('capture_benteng',captor,human),true);
  recovery.restore();assert.equal(recovery.assisted(),true);
  assert.equal(director.allowsContact('capture_benteng',captor,human,recovery.assisted()),false);
  assert.equal(director.allowsContact('capture_benteng',human,captor,recovery.assisted()),true);
  assert.equal(director.allowsContact('observe_prison',captor,friend,true),true,'real prison lesson unchanged');
  assert.equal(tutorialEventSignal([],'human'),null);assert.ok(director.goal('capture_benteng',players,true).en.includes('giving you room'));
  recovery.enter('ultimate',players);assert.equal(recovery.assisted(),false,'assistance is not permanent');
});
void test('deterministic sequence consumes each signal once and never skips multiple steps',()=>{
  let state=createTutorialSession(),serial=0;
  assert.equal(TUTORIAL_STEPS.length,14);
  for(const step of TUTORIAL_STEPS){
    assert.equal(state.stepId,step.id);
    const wrong=advanceTutorial(state,{serial:++serial,kind:step.signal==='ACK'?'MOVED':'ACK'});
    assert.equal(wrong.transitions,state.transitions);
    const signal={serial:++serial,kind:step.signal,expectedStep:step.id};
    const next=advanceTutorial(wrong,signal);
    assert.equal(next.transitions,state.transitions+1);
    assert.equal(advanceTutorial(next,signal),next);
    state=next;
  }
  assert.equal(state.finished,true);assert.equal(state.transitions,14);
});
void test('invalid state recovers to intro; stale ACK and invalid serial are safe',()=>{
  const state=createTutorialSession();
  assert.equal(advanceTutorial({...state,stepId:'bad'},{serial:1,kind:'ACK'}).stepId,'intro_ui');
  for(const serial of [NaN,Infinity,0,-1,1.5])assert.equal(advanceTutorial(state,{serial,kind:'ACK'}),state);
  assert.equal(advanceTutorial(state,{serial:1,kind:'ACK',expectedStep:'observe_prison'}).transitions,0);
});
void test('only local accepted facts count and one batch yields one signal',()=>{
  const events=[{type:'PLAYER_TAGGED',actorId:'other',targetId:'local',x:0,y:0},
    {type:'PLAYER_TAGGED',actorId:'local',targetId:'enemy',x:0,y:0},
    {type:'PLAYER_CAPTURED',actorId:'local',targetId:'enemy'}];
  assert.equal(tutorialEventSignal(events,'local'),'TAGGED');
  assert.equal(tutorialEventSignal(events.slice(0,1),'local'),null);
  assert.equal(tutorialEventSignal([{type:'PLAYER_RESCUED',actorId:'local',targetIds:['ally'],x:0,y:0}],'local'),'RESCUED');
});
void test('tutorial roster/spawns and result identity cannot change ordinary team tables',()=>{
  assert.deepEqual(TUTORIAL_MATCH.friendly,['raja','robot']);assert.deepEqual(TUTORIAL_MATCH.enemy,['ciici','kaka']);
  assert.equal(TUTORIAL_MATCH.spawnOffsets.length,2);
  assert.ok(TUTORIAL_MATCH.spawnOffsets.every(p=>Math.hypot(p.x,p.y)<118),'every bot starts inside its fort, so real charge/exit can work');
  assert.equal(isTutorialMatch('tutorial:match-1'),true);assert.equal(isTutorialMatch('ordinary-1'),false);
});
void test('movement is meaningful, sprint requires a fresh accepted activation, parkour must cross the obstacle',()=>{
  const area=choosePracticeArea({x:100,y:400},1500,900,()=>true),monitor=createMovementLessonMonitor(area);
  assert.ok(area);const none={boosting:false,activated:false,parkour:false};
  assert.equal(monitor.observe('move',{x:1,y:0},{x:0,y:0},none),null);
  assert.equal(monitor.observe('move',{x:100,y:0},{x:1,y:0},none),null);
  assert.equal(monitor.observe('move',{x:110,y:0},{x:100,y:0},none),'MOVED');
  assert.equal(monitor.observe('sprint',{x:200,y:0},{x:110,y:0},{...none,boosting:true}),null);
  assert.equal(monitor.observe('sprint',{x:210,y:0},{x:200,y:0},{...none,activated:true,boosting:true}),'SPRINTED');
  assert.equal(monitor.observe('parkour',{x:10,y:60},{x:10,y:0},{...none,parkour:true}),null,'unrelated free jump cannot satisfy traversal');
  assert.equal(monitor.observe('parkour',area.end,area.start,{...none,parkour:true}),'PARKOURED');
});
void test('safe patch checks all geometry, fails explicitly when edited map has no room',()=>{
  assert.equal(choosePracticeArea({x:100,y:400},1500,900,()=>false),null);
  const area=choosePracticeArea({x:100,y:400},1500,900,(x,y)=>x>300&&y>200&&y<700);
  assert.ok(area);assert.ok(area.barrier.h<24);
  const spawn=chooseTutorialSpawn({x:100,y:400},118,1,x=>x<100);
  assert.ok(spawn.x<100&&Math.hypot(spawn.x-100,spawn.y-400)<118);
});
void test('director never mutates actors, limits allowed contacts and prevents premature prison ACK opportunity',()=>{
  const area=choosePracticeArea({x:100,y:400},1500,900,()=>true);
  const actors=[{entityId:'human',team:'blue',state:'ACTIVE',x:300,y:400,exitOrder:5},
    {entityId:'friend',team:'blue',state:'ACTIVE',x:350,y:400,exitOrder:4},
    {entityId:'target',team:'red',state:'ACTIVE',x:900,y:400,exitOrder:1},
    {entityId:'captor',team:'red',state:'ACTIVE',x:1000,y:400,exitOrder:6}];
  const director=createTutorialDirector('human','friend','target','captor',area,{blue:{x:100,y:400},red:{x:1400,y:400}},118),before=structuredClone(actors);
  for(const step of TUTORIAL_STEPS){for(const actor of actors)director.destination(step.id,actor,actors);director.goal(step.id,actors);}
  assert.deepEqual(actors,before);
  assert.equal(director.allowsContact('move',actors[3],actors[0]),false);
  assert.equal(director.allowsContact('tag_enemy',actors[0],actors[2]),true);
  assert.equal(director.allowsContact('tag_enemy',actors[0],actors[3]),false);
  assert.equal(director.allowsContact('observe_prison',actors[3],actors[1]),true);
  assert.equal(director.goal('observe_prison',actors).prisonReady,false);
  actors[1].state='PRISONER';assert.equal(director.goal('observe_prison',actors).prisonReady,true);
  assert.equal(director.allowsRescue('rescue_friend',actors[0]),true);
  assert.equal(director.allowsRescue('rescue_friend',actors[3]),false);
  assert.equal(tutorialCaptureEnabled('move'),false);assert.equal(tutorialCaptureEnabled('capture_benteng'),true);
});
void test('combat lessons filter exact target and teammate IDs',()=>{
  const targets={tagTargetId:'target',friendId:'friend'};
  assert.equal(tutorialEventSignal([{type:'PLAYER_TAGGED',actorId:'human',targetId:'wrong',x:0,y:0}],'human',targets),null);
  assert.equal(tutorialEventSignal([{type:'PLAYER_RESCUED',actorId:'human',targetIds:['wrong'],x:0,y:0}],'human',targets),null);
  assert.equal(tutorialEventSignal([{type:'PLAYER_RESCUED',actorId:'human',targetIds:['friend'],x:0,y:0}],'human',targets),'RESCUED');
});
const lessonActor=(id,team,order,x,y)=>({id,entityId:id,team,characterId:id==='friend'?'robot':'raja',state:'ACTIVE',x,y,lastX:x,lastY:y,
  exitOrder:order,flight:null,boost:100,parkourUntil:0,tagCooldown:0,ultimateShieldUntil:0,rescueShieldUntil:0,
  waterEnteredAt:0,actionUntil:0,captures:0,capturedIds:[],fortCharge:0});
void test('shared parkour collides when walking but traverses the real low barrier',()=>{
  const area=choosePracticeArea({x:100,y:400},1500,900,()=>true),p=lessonActor('human','blue',2,area.start.x,area.start.y);
  const world={width:1500,height:900,bases:{blue:{x:100,y:100},red:{x:1400,y:100}},baseRadius:118,
    kanal:false,kanal2:false,obstacles:[{...area.barrier,asset:'parkBarrier'}],waterAt:()=>false,waterBlocks:()=>false,
    fortCoreAt:()=>false,fortOccupied:()=>false,baseChargeTime:()=>1,speedAt:()=>1};
  assert.equal(movementBlocked(world,area.center.x,area.center.y,p,1000),true);
  const before={x:p.x,y:p.y},jump=createParkourController().step(p,true,true,{x:0,y:1},1,1000,
    (actor,direction,reach,now)=>parkourLanding(world,actor,direction,reach,now));
  assert.equal(jump.performed,true);
  assert.equal(createMovementLessonMonitor(area).observe('parkour',p,before,{boosting:false,activated:false,parkour:jump.performed}),'PARKOURED');
});
void test('mentor capture and human rescue use actual core emitters, never fabricated facts',()=>{
  const human=lessonActor('human','blue',4,600,600),friend=lessonActor('friend','blue',1,620,600),captor=lessonActor('captor','red',3,600,600);
  const players=[human,friend,captor],facts=[];
  assert.ok(resolveTag(players,'captor','friend',1000,{kanal2:false,tagRange:()=>29,tagCooldownMs:()=>500,lineOfSight:()=>true},events=>facts.push(...events)));
  assert.equal(friend.state,'PRISONER');assert.ok(facts.some(f=>f.type==='PLAYER_CAPTURED'&&f.targetId==='friend'));
  assert.equal(tutorialEventSignal(facts,'human',{tagTargetId:'target',friendId:'friend'}),null);
  facts.length=0;
  assert.ok(resolveRescue(players,'human',1600,{kanal2:false,range:40,shieldMs:1000},events=>facts.push(...events)));
  assert.equal(friend.state,'RETURNING');assert.equal(tutorialEventSignal(facts,'human',{tagTargetId:'target',friendId:'friend'}),'RESCUED');
});
