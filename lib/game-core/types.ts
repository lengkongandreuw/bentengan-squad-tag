import type { CharacterId } from '../characters';

export type EntityId = string;
export type PeerId = string;
export type TeamId = 'red' | 'green';
/** Compatibility names only. blue is the visible red faction. */
export type LegacyTeam = 'blue' | 'red';
export type ActorStatus = 'IN_BASE' | 'ACTIVE' | 'PRISONER' | 'RETURNING';
export type ActorAction = 'tag' | 'rescue' | 'ultimate';
export type MatchPhase = 'COUNTDOWN' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER';
export type Point = {x:number;y:number};
export type FlightState = {
  stage:string;elapsed:number;remaining:number;heading:number;headingSet:boolean;
  direction:string;lastGround:Point;warning:boolean;distance:number;
};
/** Data-only legacy simulation actor. id remains a tie-order compatibility key. */
export type RuntimeActor = {
  entityId:EntityId;ownerPeerId?:PeerId;controller:'local'|'remote'|'bot';
  id:string;name:string;team:LegacyTeam;characterId:CharacterId;controlled?:boolean;
  x:number;y:number;vx:number;vy:number;lastX:number;lastY:number;
  state:ActorStatus;exitOrder:number;boost:number;baseCharge:number;exitDeadline:number;
  lastExitAt:number;tagCooldown:number;parkourUntil:number;boostReadyAt:number;
  fortCharge:number;prisonOwner?:LegacyTeam;prisonIndex:number;captures:number;
  aiSeed:number;rescueShieldUntil:number;ultimateShieldUntil:number;
  fallSafeUntil:number;fallNoticeUntil:number;waterEnteredAt:number;waterFallUntil:number;
  capturedIds:string[];action?:ActorAction;actionUntil:number;
  flight?:FlightState|null;visualTagVector?:Point;
};
export type ActorStats = {tags:number;prisons:number;rescues:number};
export type ComboState = {step:number;expiresAt:number;lastActorId:string;surgeUntil:number};
export type RefillState = {id:number;x:number;y:number;grade:25|40|75|100;lane:0|1|2;expiresAt:number};
export type CanonicalEntity = Omit<RuntimeActor,'id'|'name'|'controlled'|'team'|'prisonOwner'|'capturedIds'|'visualTagVector'> & {
  team:TeamId;prisonOwner:TeamId|null;capturedEntityIds:EntityId[];
  headingRadians:number|null;tagDirection:Point|null;ultimateMeter:number;
};
export type CanonicalGameState = {
  schemaVersion:1;matchId:string;arenaId:string;phase:MatchPhase;paused:boolean;
  tick:number;simulationTimeMs:number;observedAtMs:number;fixedDeltaMs:number;
  round:number;timeRemainingSeconds:number;phaseUntilMs:number|null;suddenDeath:boolean;
  teams:Record<TeamId,{score:number;combo:Omit<ComboState,'lastActorId'>&{lastActorEntityId:EntityId|null};allHeldSeconds:number}>;
  entities:CanonicalEntity[];refills:RefillState[];nextRefillSpawnMs:number;exitCounter:number;
  rescueRequest:{requesterId:EntityId;team:TeamId;expiresAt:number;assignedRescuerId:EntityId|null}|null;
  rescueRequestCooldownUntil:number;
  ultimate:{actorId:EntityId|null;impactAt:number;impactApplied:boolean;buffUntil:number;shieldUntil:number;
    effectiveStats:Record<string,number>|null};
  objective:{bases:Record<TeamId,Point>;baseRadius:number};
  roundStats:Record<EntityId,ActorStats>;matchStats:Record<EntityId,ActorStats>;
  result:{winner:TeamId;reason:string;complete:boolean}|null;
};
