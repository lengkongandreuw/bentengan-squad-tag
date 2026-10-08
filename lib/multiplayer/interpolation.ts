import {parseSnapshot,type GameSnapshot} from '../game-core/snapshot.ts';
import type {CanonicalGameState} from '../game-core/types';

/** Local receive clock, never assumes performance.now() shares an origin with host. */
export function createSnapshotBuffer(matchId:string,arenaId:string,delayMs=100) {
  const entries:{snapshot:GameSnapshot;at:number}[]=[];
  return {
    push(value:unknown,at:number){const s=parseSnapshot(value),last=entries.at(-1);
      if(!s||s.matchId!==matchId||s.arenaId!==arenaId||(last&&s.tick<=last.snapshot.tick))return false;
      entries.push({snapshot:s,at});if(entries.length>8)entries.shift();return true;},
    read(now:number):GameSnapshot|null {
      const latest=entries.at(-1);if(!latest)return null;
      const output=structuredClone(latest.snapshot),time=now-delayMs;
      let a=entries[0],b=entries[0];
      for(const entry of entries){if(entry.at<=time)a=entry;if(entry.at>=time){b=entry;break;}b=entry;}
      const t=a===b?0:Math.max(0,Math.min(1,(time-a.at)/Math.max(1,b.at-a.at)));
      const previous=new Map(a.snapshot.entities.map(e=>[e.id,e])),next=new Map(b.snapshot.entities.map(e=>[e.id,e]));
      for(const entity of output.entities){const from=previous.get(entity.id),to=next.get(entity.id);
        // Never lerp prison/respawn/round transitions through solid terrain.
        if(from&&to&&from.state===to.state&&to.state===entity.state&&a.snapshot.round===output.round&&
          Math.hypot(to.x-from.x,to.y-from.y)<180){entity.x=from.x+(to.x-from.x)*t;entity.y=from.y+(to.y-from.y)*t;}
      }
      return output;
    },
  };
}
/** Presentation-only projection onto static local metadata. No simulation callbacks. */
export function snapshotRenderState(template:CanonicalGameState,s:GameSnapshot):CanonicalGameState {
  const state=structuredClone(template),metadata=new Map(state.entities.map(p=>[p.entityId,p]));
  state.entities=s.entities.map(e=>{
    const p=metadata.get(e.id);if(!p)throw Error('Snapshot entity not in match roster');
    return {...p,characterId:e.character,team:e.team,controller:e.controller,x:e.x,y:e.y,vx:e.vx,vy:e.vy,
      state:e.state,action:e.action??undefined,actionUntil:e.actionUntil,headingRadians:e.direction,aiSeed:e.poseSeed,
      parkourUntil:e.parkourUntil,exitOrder:e.exitOrder,boost:e.boost,baseCharge:e.baseCharge,exitDeadline:e.exitDeadline,
      boostReadyAt:e.boostReadyAt,fortCharge:e.fortCharge,prisonOwner:e.prisonOwner,prisonIndex:e.prisonIndex,
      rescueShieldUntil:e.rescueShieldUntil,ultimateShieldUntil:e.ultimateShieldUntil,waterEnteredAt:e.waterEnteredAt,
      waterFallUntil:e.waterFallUntil,fallNoticeUntil:e.fallNoticeUntil,tagDirection:e.tagDirection,ultimateMeter:e.ultimateMeter,
      flight:e.flight?{...e.flight,lastGround:{x:e.x,y:e.y}}:null};
  });
  state.tick=s.tick;state.observedAtMs=s.timeMs;state.simulationTimeMs=s.simulationTimeMs;
  state.phase=s.phase;state.paused=s.paused;state.round=s.round;state.timeRemainingSeconds=s.timer;state.phaseUntilMs=s.phaseUntilMs;
  state.suddenDeath=s.suddenDeath;state.refills=structuredClone(s.refills);state.result=s.result;
  for(const team of ['red','green'] as const){state.teams[team].score=s.score[team];Object.assign(state.teams[team].combo,s.combos[team]);}
  state.teams.red.allHeldSeconds=s.objective.redHeldSeconds;state.teams.green.allHeldSeconds=s.objective.greenHeldSeconds;
  state.rescueRequest=s.rescueRequest;
  const {castMs,speedMultiplier,...ultimate}=s.ultimate;
  state.ultimate={...state.ultimate,...ultimate,effectiveStats:castMs===null&&speedMultiplier===null?null:{
    ...(castMs!==null?{castMs}:{}),...(speedMultiplier!==null?{speedMultiplier}:{})}};
  return state;
}
