import type {RuntimeActor,LegacyTeam,Point,EntityId} from './types';
import {flightBusy} from '../flight-ultimate.js';
import {sweptContactDistance} from '../tag-contact.js';
import type {GameEventSink,GameEvent} from './events';

const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const other=(team:LegacyTeam):LegacyTeam=>team==='blue'?'red':'blue';
type InteractionRules={kanal2:boolean;tagRange:(p:RuntimeActor)=>number;tagCooldownMs:(p:RuntimeActor)=>number;lineOfSight:(a:RuntimeActor,b:RuntimeActor)=>boolean};
export type InteractionEvent=
  |{type:'tag';actorId:EntityId;targetId:EntityId}
  |{type:'rescue';actorId:EntityId;targetIds:EntityId[]}
  |{type:'forced-exit'|'boost-recovered';actorId:EntityId}
  |{type:'objective';team:LegacyTeam;reason:'BENTENG DIREBUT'|'SEMUA LAWAN DITANGKAP'};

export function tagEligible(a:RuntimeActor,b:RuntimeActor,now:number,rules:Pick<InteractionRules,'kanal2'>,ignoreCooldown=false) {
  return a.team!==b.team&&!flightBusy(a)&&!flightBusy(b)&&
    !(rules.kanal2&&(a.waterEnteredAt||b.waterEnteredAt))&&
    a.state==='ACTIVE'&&a.exitOrder>b.exitOrder&&(ignoreCooldown||a.tagCooldown<=now)&&
    now>=a.parkourUntil&&now>=b.parkourUntil&&now>=b.ultimateShieldUntil&&
    (b.state==='ACTIVE'||(b.state==='RETURNING'&&now>=b.rescueShieldUntil));
}
/** Presentation only: eligibility, not contact/range or a promise of capture. */
export function tagRelationship(me:RuntimeActor,target:RuntimeActor,now:number,kanal2:boolean) {
  if(me.team===target.team||target.state==='PRISONER'||target.state==='IN_BASE')return 'neutral';
  if(flightBusy(target)||now<target.parkourUntil||now<target.ultimateShieldUntil||
    target.state==='RETURNING'&&now<target.rescueShieldUntil||kanal2&&target.waterEnteredAt)return 'protected';
  if(tagEligible(me,target,now,{kanal2}))return 'target';
  if(tagEligible(target,me,now,{kanal2}))return 'danger';
  return 'neutral';
}
/** Contacts are sorted using legacy tie keys, not newly assigned network IDs. */
export function tagContacts(players:RuntimeActor[],now:number,rules:InteractionRules) {
  const contacts:{attacker:RuntimeActor;target:RuntimeActor}[]=[];
  for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
    const a=players[i],b=players[j],d=Math.min(distance(a,b),sweptContactDistance(a,b));
    // Do not include cooldown here: legacy ordering reserves neither actor when
    // capture fails cooldown; subsequent candidates still get a chance.
    if(tagEligible(a,b,now,rules,true)&&d<=rules.tagRange(a)+4){if(rules.lineOfSight(a,b))contacts.push({attacker:a,target:b});}
    else if(tagEligible(b,a,now,rules,true)&&d<=rules.tagRange(b)+4){if(rules.lineOfSight(a,b))contacts.push({attacker:b,target:a});}
  }
  contacts.sort((a,b)=>b.attacker.exitOrder-a.attacker.exitOrder||b.target.exitOrder-a.target.exitOrder||a.attacker.id.localeCompare(b.attacker.id));
  return contacts;
}
export function resolveTag(players:RuntimeActor[],attackerId:EntityId,targetId:EntityId,now:number,rules:InteractionRules,emit?:GameEventSink):InteractionEvent|null {
  const a=players.find(p=>p.entityId===attackerId),b=players.find(p=>p.entityId===targetId);
  if(!a||!b||!tagEligible(a,b,now,rules)||Math.min(distance(a,b),sweptContactDistance(a,b))>rules.tagRange(a)+4||!rules.lineOfSight(a,b))return null;
  a.tagCooldown=now+rules.tagCooldownMs(a);a.captures++;
  if(!a.capturedIds.includes(b.id))a.capturedIds.push(b.id);
  a.action='tag';a.visualTagVector={x:b.x-a.x,y:b.y-a.y};a.actionUntil=now+420;
  b.state='PRISONER';b.flight=null;b.prisonOwner=a.team;b.fortCharge=0;b.rescueShieldUntil=0;
  emit?.([{type:'PLAYER_TAGGED',actorId:a.entityId,targetId:b.entityId,x:b.x,y:b.y},{type:'PLAYER_CAPTURED',actorId:a.entityId,targetId:b.entityId}]);
  return {type:'tag',actorId:a.entityId,targetId:b.entityId};
}
export function resolveRescue(players:RuntimeActor[],rescuerId:EntityId,now:number,rules:{kanal2:boolean;range:number;shieldMs:number},emit?:GameEventSink):InteractionEvent|null {
  const actor=players.find(p=>p.entityId===rescuerId);
  if(!actor||flightBusy(actor)||actor.state!=='ACTIVE'||(rules.kanal2&&actor.waterEnteredAt))return null;
  const held=players.filter(p=>p.team===actor.team&&p.state==='PRISONER').sort((a,b)=>b.prisonIndex-a.prisonIndex);
  if(!held[0]||distance(actor,held[0])>=rules.range)return null;
  for(const p of held){p.state='RETURNING';p.prisonOwner=undefined;p.rescueShieldUntil=now+rules.shieldMs;p.x+=actor.team==='blue'?-22:22;}
  actor.action='rescue';actor.actionUntil=now+460;
  emit?.([{type:'PLAYER_RESCUED',actorId:actor.entityId,targetIds:held.map(p=>p.entityId),x:held[0].x,y:held[0].y}]);
  return {type:'rescue',actorId:actor.entityId,targetIds:held.map(p=>p.entityId)};
}
export function layoutPrisoners(players:RuntimeActor[],prisons:Record<LegacyTeam,{x:number;y:number;w:number;h:number}>,kanal:boolean) {
  for(const owner of ['blue','red'] as const){
    const prison=prisons[owner];
    players.filter(p=>p.state==='PRISONER'&&p.prisonOwner===owner).forEach((p,i)=>{
      p.prisonIndex=i;
      if(kanal){const column=i%3,row=Math.floor(i/3),left=prison.x+34+column*((prison.w-68)/2);
        p.x=owner==='blue'?left:prison.x+prison.w-(left-prison.x);p.y=prison.y+76+row*30;
      }else{p.x=owner==='blue'?prison.x+62+i*31:prison.x+prison.w-62-i*31;p.y=owner==='blue'?prison.y+116+i*6:prison.y+82-i*6;}
      p.lastX=p.x;p.lastY=p.y;
    });
  }
}
export function fortOccupant(players:RuntimeActor[],bases:Record<LegacyTeam,Point>,radius:number,baseTeam:LegacyTeam,kanal2:boolean,exceptId?:string) {
  return players.find(p=>p.id!==exceptId&&!flightBusy(p)&&!(kanal2&&p.waterEnteredAt)&&p.state==='ACTIVE'&&p.team!==baseTeam&&distance(p,bases[baseTeam])<radius);
}
export type BaseRules={bases:Record<LegacyTeam,Point>;radius:number;kanal2:boolean;boost:number;chargeTime:number;reentryMs:number;tieHash:(id:string)=>number};
export function resolveObjective(players:RuntimeActor[],p:RuntimeActor,dt:number,rules:BaseRules):InteractionEvent[] {
  if(flightBusy(p)||p.state==='PRISONER'||(rules.kanal2&&p.waterEnteredAt))return [];
  if(p.state==='ACTIVE'&&distance(p,rules.bases[other(p.team)])<rules.radius){
    const defending=players.some(q=>q.team!==p.team&&q.state==='ACTIVE'&&distance(q,rules.bases[other(p.team)])<rules.radius);
    p.fortCharge=defending?0:p.fortCharge+dt;
    if(p.fortCharge>=1.5)return [{type:'objective',team:p.team,reason:'BENTENG DIREBUT'}];
  }else p.fortCharge=0;
  return [];
}
export function resolveBase(players:RuntimeActor[],p:RuntimeActor,dt:number,now:number,exitCandidates:RuntimeActor[],rules:BaseRules,emit?:GameEventSink):InteractionEvent[] {
  if(flightBusy(p)||p.state==='PRISONER'||(rules.kanal2&&p.waterEnteredAt))return [];
  const events:InteractionEvent[]=[];
  const previousFortCharge=p.fortCharge;
  const inside=distance(p,rules.bases[p.team])<rules.radius;
  const contested=!!fortOccupant(players,rules.bases,rules.radius,p.team,rules.kanal2);
  if(inside){
    if(contested){if(p.state==='IN_BASE'||p.state==='RETURNING')exitCandidates.push(p);}
    else if(p.state==='ACTIVE'&&now-p.lastExitAt<rules.reentryMs)p.fortCharge=0;
    else{
      if(p.state!=='IN_BASE'){p.state='IN_BASE';p.baseCharge=0;p.exitDeadline=0;p.fortCharge=0;}
      const charging=players.filter(q=>q.team===p.team&&q.state==='IN_BASE'&&distance(q,rules.bases[q.team])<rules.radius)
        .sort((a,b)=>b.baseCharge-a.baseCharge||rules.tieHash(a.id)-rules.tieHash(b.id)).slice(0,3);
      if(charging.some(q=>q.id===p.id)&&p.baseCharge<rules.chargeTime){p.baseCharge=Math.min(rules.chargeTime,p.baseCharge+dt);if(p.baseCharge>=rules.chargeTime&&!p.exitDeadline)p.exitDeadline=now+5000;}
      p.boost=rules.boost;p.boostReadyAt=0;
      if(p.baseCharge>=rules.chargeTime&&p.exitDeadline>0&&now>=p.exitDeadline){
        p.x=rules.bases[p.team].x+(p.team==='blue'?rules.radius+5:-rules.radius-5);exitCandidates.push(p);events.push({type:'forced-exit',actorId:p.entityId});
      }
    }
  }else if(p.state==='IN_BASE'&&p.baseCharge>=rules.chargeTime)exitCandidates.push(p);
  events.push(...resolveObjective(players,p,dt,rules));
  if(p.boost<rules.boost&&p.boostReadyAt>0&&now>=p.boostReadyAt){p.boost=rules.boost;p.boostReadyAt=0;events.push({type:'boost-recovered',actorId:p.entityId});}
  if(emit){const facts:GameEvent[]=[];for(const e of events){
    if(e.type==='forced-exit'||e.type==='boost-recovered')facts.push({type:e.type==='forced-exit'?'FORCED_EXIT':'BOOST_RECOVERED',actorId:e.actorId});
    else if(e.type==='objective'&&e.reason==='BENTENG DIREBUT'&&previousFortCharge<1.5)facts.push({type:'FORT_CAPTURED',team:e.team,reason:e.reason});
  }emit(facts);}
  return events;
}
export function resolveAllHeld(players:RuntimeActor[],totalCapture:Record<LegacyTeam,number>,dt:number):InteractionEvent[] {
  const events:InteractionEvent[]=[];
  for(const team of ['blue','red'] as const){
    const held=players.filter(p=>p.team===other(team)).every(p=>p.state==='PRISONER'&&p.prisonOwner===team);
    totalCapture[team]=held?totalCapture[team]+dt:0;
    if(totalCapture[team]>=2)events.push({type:'objective',team,reason:'SEMUA LAWAN DITANGKAP'});
  }
  return events;
}
