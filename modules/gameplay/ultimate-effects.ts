import type {GameEvent} from '../../lib/game-core/events.ts';
import type {RuntimeActor} from '../../lib/game-core/types.ts';
export type EffectTimers={jammerUntil:number;driveUntil:number};
export type EffectStateLookup=(actor:RuntimeActor)=>EffectTimers|undefined;
export type UltimateEffect=Extract<GameEvent,{type:'ULTIMATE_APPLIED'}>['effect'];
export const ROBOT_JAMMER_RADIUS=110;
export const BUTO_DRIVE_SPEED_MULTIPLIER=1.25;
export function isRobotJammerActive(actor:RuntimeActor,now:number,state:EffectTimers|undefined) {
  return actor.characterId==='robot'&&actor.state==='ACTIVE'&&now<(state?.jammerUntil??0);
}
export function isSprintJammed(target:RuntimeActor,actors:readonly RuntimeActor[],now:number,stateFor:EffectStateLookup) {
  return actors.some(caster=>caster.team!==target.team&&isRobotJammerActive(caster,now,stateFor(caster))&&
    (caster.x-target.x)**2+(caster.y-target.y)**2<=ROBOT_JAMMER_RADIUS**2);
}
export function isIronDriveActive(actor:RuntimeActor,now:number,state:EffectTimers|undefined) {
  return actor.characterId==='buto'&&actor.state==='ACTIVE'&&now<(state?.driveUntil??0);
}
export function ironDriveMultiplier(actor:RuntimeActor,now:number,state:EffectTimers|undefined) {
  return isIronDriveActive(actor,now,state)?BUTO_DRIVE_SPEED_MULTIPLIER:1;
}
export function ultimateEffectDeadline(characterId:string,state:EffectTimers&{buffUntil:number;shieldUntil:number}) {
  switch(ultimateEffectFor(characterId)){
    case 'speed':return state.buffUntil;
    case 'shield':return state.shieldUntil;
    case 'jammer':return state.jammerUntil;
    case 'drive':return state.driveUntil;
    default:return 0;
  }
}
// One explicit non-flight resolver; an unsupported actor never inherits Raja.
export function ultimateEffectFor(characterId:string):UltimateEffect|null {
  switch(characterId){
    case 'kaka':return 'shield';
    case 'raja':return 'speed';
    case 'robot':return 'jammer';
    case 'buto':return 'drive';
    default:return null;
  }
}
