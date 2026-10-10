import type {EntityId,LegacyTeam,Point,RuntimeActor} from './types';

/** Small data-only boundary, not a bus or a network/replay protocol. */
export type GameEvent =
  | {type:'PLAYER_TAGGED';actorId:EntityId;targetId:EntityId;x:number;y:number}
  | {type:'PLAYER_CAPTURED';actorId:EntityId;targetId:EntityId}
  | {type:'PLAYER_RESCUED';actorId:EntityId;targetIds:EntityId[];x:number;y:number}
  | {type:'ULTIMATE_STARTED';actorId:EntityId;flight:boolean}
  | {type:'ULTIMATE_APPLIED';actorId:EntityId;effect:'shield'|'speed';durationMs:number;speedMultiplier:number}
  | {type:'FORT_ENTERED';actorId:EntityId;team:LegacyTeam}
  | {type:'FORT_CAPTURED';actorId:EntityId;team:LegacyTeam;reason:'BENTENG DIREBUT'}
  | {type:'HELP_REQUESTED';actorId:EntityId}
  | {type:'ROUND_ENDED'|'MATCH_ENDED';team:LegacyTeam;reason:string}
  | {type:'FORCED_EXIT'|'BOOST_RECOVERED';actorId:EntityId};
export type GameEventSink=(events:readonly GameEvent[])=>void;
/** Immediate ordered delivery keeps legacy effects at the same simulation point. */
export function presentGameEvents(events:readonly GameEvent[],consume:(event:GameEvent)=>void) {
  for(const event of events)consume(event);
}
/** Derived occupancy memory belongs to the simulation adapter, not renderer. */
export function fortEntryEvents(players:RuntimeActor[],bases:Record<LegacyTeam,Point>,radius:number,previous:Set<EntityId>):GameEvent[] {
  const events:GameEvent[]=[],inside=new Set<EntityId>();
  for(const p of players){
    const enemy=p.team==='blue'?'red':'blue';
    if(!p.flight&&p.state==='ACTIVE'&&Math.hypot(p.x-bases[enemy].x,p.y-bases[enemy].y)<radius){
      inside.add(p.entityId);if(!previous.has(p.entityId))events.push({type:'FORT_ENTERED',actorId:p.entityId,team:p.team});
    }
  }
  previous.clear();for(const id of inside)previous.add(id);
  return events;
}
