import type {CanonicalGameState} from './types';
import {object,oneOf,integer,nonnegative,finite,bool,id,text,team,character,nullable,list,point,bounded,safely} from './validation.ts';

export const GAME_SNAPSHOT_VERSION=1;
const flight=nullable(object({stage:oneOf(['FLIGHT_TAKEOFF','FLYING','FLIGHT_LANDING']),elapsed:nonnegative,remaining:nonnegative,
  heading:finite,headingSet:bool,direction:oneOf(['south','southwest','west','northwest','north','northeast','east','southeast']),
  warning:bool,distance:nonnegative}));
const entity=object({id,character,team,controller:oneOf(['local','remote','bot']),x:finite,y:finite,vx:finite,vy:finite,
  direction:nullable(finite),poseSeed:finite,state:oneOf(['IN_BASE','ACTIVE','PRISONER','RETURNING']),
  action:nullable(oneOf(['tag','rescue','ultimate'])),actionUntil:nonnegative,parkourUntil:nonnegative,
  exitOrder:integer,boost:nonnegative,baseCharge:nonnegative,exitDeadline:nonnegative,boostReadyAt:nonnegative,
  fortCharge:nonnegative,prisonOwner:nullable(team),prisonIndex:integer,rescueShieldUntil:nonnegative,
  ultimateShieldUntil:nonnegative,waterEnteredAt:nonnegative,waterFallUntil:nonnegative,fallNoticeUntil:nonnegative,
  tagDirection:nullable(point),flight,ultimateMeter:bounded(0,100)});
const combo=object({step:integer,expiresAt:nonnegative,surgeUntil:nonnegative});
const schema=object({version:oneOf([GAME_SNAPSHOT_VERSION]),matchId:id,arenaId:id,tick:integer,
  timeMs:nonnegative,simulationTimeMs:nonnegative,phase:oneOf(['COUNTDOWN','PLAYING','ROUND_OVER','MATCH_OVER']),paused:bool,
  round:integer,timer:nonnegative,phaseUntilMs:nullable(nonnegative),suddenDeath:bool,
  entities:list(entity),score:object({red:integer,green:integer}),combos:object({red:combo,green:combo}),
  objective:object({redHeldSeconds:nonnegative,greenHeldSeconds:nonnegative}),
  ultimate:object({actorId:nullable(id),impactAt:nonnegative,impactApplied:bool,buffUntil:nonnegative,shieldUntil:nonnegative,
    castMs:nullable(nonnegative),speedMultiplier:nullable(nonnegative)}),
  refills:list(object({id:integer,x:finite,y:finite,grade:oneOf([25,40,75,100]),lane:oneOf([0,1,2]),expiresAt:nonnegative}),32),
  rescueRequest:nullable(object({requesterId:id,team,expiresAt:nonnegative,assignedRescuerId:nullable(id)})),
  result:nullable(object({winner:team,reason:text(256),complete:bool})),
});
export type GameSnapshot=ReturnType<typeof schema>;
/** Strict structural + identity/reference/phase validation. No browser or transport. */
export function parseSnapshot(value:unknown):GameSnapshot|null {
  const s=safely(schema,value);if(!s||!s.entities.length||s.round<1)return null;
  const ids=new Set(s.entities.map(e=>e.id));if(ids.size!==s.entities.length)return null;
  if(s.ultimate.actorId!==null&&!ids.has(s.ultimate.actorId))return null;
  if(s.rescueRequest&&(!ids.has(s.rescueRequest.requesterId)||(s.rescueRequest.assignedRescuerId!==null&&!ids.has(s.rescueRequest.assignedRescuerId))))return null;
  if(new Set(s.refills.map(r=>r.id)).size!==s.refills.length)return null;
  if(s.result&&((s.phase!=='ROUND_OVER'&&s.phase!=='MATCH_OVER')||s.result.complete!==(s.phase==='MATCH_OVER')))return null;
  if((s.phase==='ROUND_OVER'||s.phase==='MATCH_OVER')&&!s.result)return null;
  if(s.score.red>2||s.score.green>2||s.combos.red.step>3||s.combos.green.step>3)return null;
  if(s.result&&(s.score[s.result.winner]<(s.result.complete?2:1)||(!s.result.complete&&s.score[s.result.winner]>=2)))return null;
  return s;
}
/** Explicit allowlist: no map geometry, assets, profile, legacy IDs, AI goals or statistics. */
export function createSnapshot(state:CanonicalGameState):GameSnapshot {
  const value={version:GAME_SNAPSHOT_VERSION,matchId:state.matchId,arenaId:state.arenaId,tick:state.tick,
    timeMs:state.observedAtMs,simulationTimeMs:state.simulationTimeMs,phase:state.phase,paused:state.paused,round:state.round,
    timer:state.timeRemainingSeconds,phaseUntilMs:state.phaseUntilMs,suddenDeath:state.suddenDeath,
    entities:state.entities.map(p=>({id:p.entityId,character:p.characterId,team:p.team,controller:p.controller,
      x:p.x,y:p.y,vx:p.vx,vy:p.vy,direction:p.headingRadians,poseSeed:p.aiSeed,state:p.state,action:p.action??null,
      actionUntil:p.actionUntil,parkourUntil:p.parkourUntil,exitOrder:p.exitOrder,boost:p.boost,baseCharge:p.baseCharge,
      exitDeadline:p.exitDeadline,boostReadyAt:p.boostReadyAt,fortCharge:p.fortCharge,prisonOwner:p.prisonOwner,
      prisonIndex:p.prisonIndex,rescueShieldUntil:p.rescueShieldUntil,ultimateShieldUntil:p.ultimateShieldUntil,
      waterEnteredAt:p.waterEnteredAt,waterFallUntil:p.waterFallUntil,fallNoticeUntil:p.fallNoticeUntil,
      tagDirection:p.tagDirection,flight:p.flight?{stage:p.flight.stage,elapsed:p.flight.elapsed,remaining:p.flight.remaining,
        heading:p.flight.heading,headingSet:p.flight.headingSet,direction:p.flight.direction,warning:p.flight.warning,distance:p.flight.distance}:null,
      ultimateMeter:p.ultimateMeter})),
    score:{red:state.teams.red.score,green:state.teams.green.score},
    combos:{red:{step:state.teams.red.combo.step,expiresAt:state.teams.red.combo.expiresAt,surgeUntil:state.teams.red.combo.surgeUntil},
      green:{step:state.teams.green.combo.step,expiresAt:state.teams.green.combo.expiresAt,surgeUntil:state.teams.green.combo.surgeUntil}},
    objective:{redHeldSeconds:state.teams.red.allHeldSeconds,greenHeldSeconds:state.teams.green.allHeldSeconds},
    ultimate:{actorId:state.ultimate.actorId,impactAt:state.ultimate.impactAt,impactApplied:state.ultimate.impactApplied,
      buffUntil:state.ultimate.buffUntil,shieldUntil:state.ultimate.shieldUntil,
      castMs:state.ultimate.effectiveStats?.castMs??null,speedMultiplier:state.ultimate.effectiveStats?.speedMultiplier??null},
    refills:state.refills,rescueRequest:state.rescueRequest,result:state.result};
  const parsed=parseSnapshot(value);if(!parsed)throw Error('Cannot snapshot invalid canonical state');return parsed;
}
