import type {CanonicalGameState,CanonicalEntity,RuntimeActor,LegacyTeam,TeamId,MatchPhase,ActorStats,ComboState,RefillState,Point} from './types';

export const canonicalTeam=(team:LegacyTeam):TeamId=>team==='blue'?'red':'green';
export type RuntimeMatchTruth = {
  matchId:string;arenaId:string;phase:MatchPhase;paused:boolean;tick:number;
  simulationTimeMs:number;observedAtMs:number;fixedDeltaMs:number;round:number;timer:number;
  phaseUntil:number;suddenDeath:boolean;score:Record<LegacyTeam,number>;
  players:readonly RuntimeActor[];refills:readonly RefillState[];nextRefillSpawn:number;exitCounter:number;
  teamCombos:Record<LegacyTeam,ComboState>;totalCapture:Record<LegacyTeam,number>;
  rescueRequest:{requesterId:string;team:LegacyTeam;expiresAt:number;assignedRescuerId?:string}|null;
  rescueRequestCooldownUntil:number;ultimateMeter:number;ultimateImpactAt:number;
  ultimateImpactApplied:boolean;ultimateBuffUntil:number;ultimateShieldUntil:number;
  ultimateStats:Record<string,number>|null;bases:Record<LegacyTeam,Point>;baseRadius:number;
  roundStats:Record<string,ActorStats>;matchStats:Record<string,ActorStats>;
  winner?:LegacyTeam;reason:string;
};

/**
 * A one-way read adapter, not a new simulation or a network serializer.
 * `validate:false` skips the recursive JSON check for per-frame render reads only;
 * keep it on in development, tests and anything sent over the network.
 */
export function describeMatch(source:RuntimeMatchTruth,{validate=true}:{validate?:boolean}={}):CanonicalGameState {
  const ids=new Map(source.players.map(p=>[p.id,p.entityId]));
  if(new Set(ids.values()).size!==source.players.length)throw Error('Duplicate entity identity');
  const identity=(id:string)=>{
    const entity=ids.get(id);if(!entity)throw Error(`Unknown actor reference: ${id}`);return entity;
  };
  const stats=(store:Record<string,ActorStats>)=>Object.fromEntries(source.players.map(p=>[p.entityId,{...store[p.id]}]));
  const entities:CanonicalEntity[]=source.players.map(p=>({
    entityId:p.entityId,controller:p.controller,...(p.ownerPeerId?{ownerPeerId:p.ownerPeerId}:{}),
    characterId:p.characterId,team:canonicalTeam(p.team),state:p.state,
    x:p.x,y:p.y,vx:p.vx,vy:p.vy,lastX:p.lastX,lastY:p.lastY,
    headingRadians:p.vx||p.vy?Math.atan2(p.vy,p.vx):p.flight?.headingSet?p.flight.heading:null,
    tagDirection:p.visualTagVector?{...p.visualTagVector}:null,
    exitOrder:p.exitOrder,boost:p.boost,baseCharge:p.baseCharge,exitDeadline:p.exitDeadline,
    lastExitAt:p.lastExitAt,tagCooldown:p.tagCooldown,parkourUntil:p.parkourUntil,
    boostReadyAt:p.boostReadyAt,fortCharge:p.fortCharge,prisonOwner:p.prisonOwner?canonicalTeam(p.prisonOwner):null,
    prisonIndex:p.prisonIndex,captures:p.captures,aiSeed:p.aiSeed,
    rescueShieldUntil:p.rescueShieldUntil,ultimateShieldUntil:p.ultimateShieldUntil,
    fallSafeUntil:p.fallSafeUntil,fallNoticeUntil:p.fallNoticeUntil,
    waterEnteredAt:p.waterEnteredAt,waterFallUntil:p.waterFallUntil,
    capturedEntityIds:p.capturedIds.map(identity),...(p.action?{action:p.action}:{}),actionUntil:p.actionUntil,
    flight:p.flight?{...p.flight,lastGround:{...p.flight.lastGround}}:null,
    ultimateMeter:p.controller==='local'?source.ultimateMeter:0,
  }));
  const team=(key:LegacyTeam)=>({score:source.score[key],allHeldSeconds:source.totalCapture[key],
    combo:{step:source.teamCombos[key].step,expiresAt:source.teamCombos[key].expiresAt,
      surgeUntil:source.teamCombos[key].surgeUntil,lastActorEntityId:source.teamCombos[key].lastActorId?identity(source.teamCombos[key].lastActorId):null}});
  const state:CanonicalGameState={schemaVersion:1,matchId:source.matchId,arenaId:source.arenaId,
    phase:source.phase,paused:source.paused,tick:source.tick,simulationTimeMs:source.simulationTimeMs,
    observedAtMs:source.observedAtMs,fixedDeltaMs:source.fixedDeltaMs,round:source.round,
    timeRemainingSeconds:Math.max(0,source.timer),
    phaseUntilMs:source.phaseUntil===Infinity?null:source.phaseUntil,suddenDeath:source.suddenDeath,
    teams:{red:team('blue'),green:team('red')},entities,refills:source.refills.map(r=>({...r})),
    nextRefillSpawnMs:source.nextRefillSpawn,exitCounter:source.exitCounter,
    rescueRequest:source.rescueRequest?{requesterId:identity(source.rescueRequest.requesterId),
      team:canonicalTeam(source.rescueRequest.team),expiresAt:source.rescueRequest.expiresAt,
      assignedRescuerId:source.rescueRequest.assignedRescuerId?identity(source.rescueRequest.assignedRescuerId):null}:null,
    rescueRequestCooldownUntil:source.rescueRequestCooldownUntil,
    ultimate:{actorId:source.players.find(p=>p.controller==='local')?.entityId??null,
      impactAt:source.ultimateImpactAt,impactApplied:source.ultimateImpactApplied,
      buffUntil:source.ultimateBuffUntil,shieldUntil:source.ultimateShieldUntil,
      effectiveStats:source.ultimateStats?{...source.ultimateStats}:null},
    objective:{bases:{red:{...source.bases.blue},green:{...source.bases.red}},baseRadius:source.baseRadius},
    roundStats:stats(source.roundStats),matchStats:stats(source.matchStats),
    result:source.winner?{winner:canonicalTeam(source.winner),reason:source.reason,complete:source.phase==='MATCH_OVER'}:null,
  };
  if(validate)assertJsonData(state);
  return state;
}

/** Reject nonfinite values/functions/classes instead of silently losing truth. */
export function assertJsonData(value:unknown):void {
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if(Array.isArray(value)){value.forEach(assertJsonData);return;}
  if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){Object.values(value).forEach(assertJsonData);return;}
  throw Error('Canonical state must contain finite JSON data only');
}
