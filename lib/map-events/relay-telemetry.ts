import type {StudioMap} from '../map-studio-model.js';
import type {GameEvent} from '../game-core/events.ts';
import {isPowerGate,type RelayActor,type RelayEvent} from './power-relay.ts';

/** Development-only, in-memory counters. No storage, network, UI or economy writes. */
export function createRelayTelemetry(map:StudioMap){
  const plaza=map.objects.find(o=>o.id==='obj-relay-plaza')!;
  const gates=map.objects.filter(isPowerGate);
  const fresh=()=>({attempts:0,advances:0,completions:0,wrongInputs:0,timeouts:0,ignored:false,firstInteractionMs:null as number|null,tagsNearRelay:0,tagsDuringChannel:0,gateUses:0,botGateUses:0,humanGateUses:0,botPlazaEntries:0,fortEntriesAfterOpen:0,debugOpens:0,gateCloses:0,routeInvalidations:0});
  let current=fresh(),round=1;
  const history:Array<{round:number;metrics:ReturnType<typeof fresh>}>=[];
  const outside=new Map<string,{x:number;y:number;side:number}>(),inPlaza=new Set<string>();
  const near=(x:number,y:number)=>x>=plaza.x-56&&x<=plaza.x+plaza.w+56&&y>=plaza.y-56&&y<=plaza.y+plaza.h+56;
  return {
    event:(event:RelayEvent)=>{
      switch(event.type){
        case 'reset':history.push({round,metrics:{...current}});if(history.length>8)history.shift();round++;current=fresh();outside.clear();inPlaza.clear();break;
        case 'attempt':current.attempts++;current.firstInteractionMs??=event.elapsed;break;
        case 'advance':current.advances++;break;
        case 'wrong':current.wrongInputs++;break;
        case 'complete':current.completions++;break;
        case 'expired':current.timeouts++;current.ignored=current.attempts===0;break;
        case 'open':if(event.debug)current.debugOpens++;outside.clear();break;
        case 'close':current.gateCloses++;outside.clear();break;
      }
    },
    facts(events:readonly GameEvent[],channelActorIds:readonly string[],gateOpen:boolean){
      for(const event of events){
        if(event.type==='PLAYER_TAGGED'&&near(event.x,event.y)){current.tagsNearRelay++;if(channelActorIds.includes(event.targetId))current.tagsDuringChannel++;}
        if(event.type==='FORT_ENTERED'&&gateOpen)current.fortEntriesAfterOpen++;
      }
    },
    routeInvalidated(){current.routeInvalidations++;},
    actors(actors:readonly RelayActor[],gateOpen:boolean){
      const live=new Set(actors.map(a=>a.entityId));
      for(const actor of actors){
        const eligible=['ACTIVE','IN_BASE'].includes(actor.state);
        const inside=eligible&&near(actor.x,actor.y);
        if(inside&&!inPlaza.has(actor.entityId)&&actor.controller==='bot')current.botPlazaEntries++;
        if(inside)inPlaza.add(actor.entityId);else inPlaza.delete(actor.entityId);
        for(const gate of gates){
          const key=actor.entityId+':'+gate.id;
          if(!gateOpen||!eligible){outside.delete(key);continue;}
          const side=actor.x<gate.x-15?-1:actor.x>gate.x+gate.w+15?1:0;
          if(!side)continue;
          const previous=outside.get(key);
          if(previous&&side!==previous.side){
            const t=(gate.x+gate.w/2-previous.x)/(actor.x-previous.x),y=previous.y+(actor.y-previous.y)*t;
            if(y>=gate.y&&y<=gate.y+gate.h){current.gateUses++;if(actor.controller==='bot')current.botGateUses++;else current.humanGateUses++;}
          }
          outside.set(key,{x:actor.x,y:actor.y,side});
        }
      }
      for(const key of outside.keys())if(!live.has(key.split(':')[0]))outside.delete(key);
      for(const id of inPlaza)if(!live.has(id))inPlaza.delete(id);
    },
    read:()=>structuredClone({round,current,history}),
  };
}
