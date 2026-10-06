import type {RuntimeActor} from '../game-core/types';
import type {PlayerInputFrame} from '../game-core/input';
import {stepUltimate,stepFlight,ultimateCasting,ultimateSpeed,type UltimateRules,type UltimateState} from '../game-core/ultimate';
import {flightConfig,flightSlot} from '../flight-ultimate.js';
/** Match-local human states. Reuses existing skills, never trusts a client's meter. */
export function createNetworkUltimates(humans:readonly {entityId:string}[]){
  const states=new Map(humans.map(p=>[p.entityId,{meter:0,impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0} satisfies UltimateState]));
  return {
    get:(id:string)=>states.get(id),
    reset(){for(const state of states.values())Object.assign(state,{impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0});},
    gain(actor:RuntimeActor,amount:number,supported:ReadonlySet<string>){const state=states.get(actor.entityId);if(state&&actor.controller!=='bot'&&supported.has(actor.characterId))state.meter=Math.min(100,Math.max(0,state.meter+amount));},
    tick(players:RuntimeActor[],frames:ReadonlyMap<string,PlayerInputFrame>,dt:number,now:number,rules:(p:RuntimeActor)=>UltimateRules,
      complete:(p:RuntimeActor,slot:string,elapsedMs:number,fallbackSeconds:number)=>boolean,valid:(x:number,y:number)=>boolean,fallen:(p:RuntimeActor)=>void){
      const facts:ReturnType<typeof stepUltimate>=[];
      for(const p of players){const state=states.get(p.entityId);if(!state)continue;
        const config=flightConfig(p.characterId);
        if(p.flight&&config){const slot=flightSlot(p.flight,config)!;
          const flight=stepFlight(p,config,dt,complete(p,slot,(p.flight.elapsed+dt)*1000,p.flight.stage==='FLIGHT_TAKEOFF'?config.takeoffSeconds:config.landingSeconds),valid);
          if(flight.landingFailed){fallen(p);p.flight=null;}
        }
        facts.push(...stepUltimate(players,p,state,p.controller==='bot'?0:dt,now,p.controller!=='bot'&&!!frames.get(p.entityId)?.ultimate,rules(p)));
      }
      return {facts,casting:players.some(p=>states.has(p.entityId)&&!flightConfig(p.characterId)&&ultimateCasting(p,now,rules(p).supported))};
    },
    speed(player:RuntimeActor,players:RuntimeActor[],now:number,rules:(p:RuntimeActor)=>UltimateRules){let multiplier=1;
      for(const p of players){const state=states.get(p.entityId);if(state)multiplier=Math.max(multiplier,ultimateSpeed(player,p,now,state.buffUntil,rules(p).speedMultiplier));}
      return multiplier;
    },
  };
}
