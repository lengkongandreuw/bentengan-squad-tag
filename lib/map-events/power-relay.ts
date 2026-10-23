import defaults from '../../config/power-relay.json' with {type:'json'};
import type {MapObject,StudioMap} from '../map-studio-model.js';
import {collisionTouches,collisionRects} from '../map-studio-model.js';
import {createMapQueries} from '../../modules/world/map-runtime-index.ts';
import {isRelayPrototypeMap} from '../../modules/world/relay-map/relay-prototype-visuals.js';

export type RelayNode='A'|'B'|'C';
export type RelayTeam='blue'|'red';
export type RelayPhase='DORMANT'|'ANNOUNCING'|'ACTIVE'|'EXPIRED'|'GATE_OPEN'|'CLOSING'|'COMPLETE';
export type RelayActor={entityId:string;team:RelayTeam;x:number;y:number;state:string;controller:string;blocked?:boolean};
export type RelayIntent={entityId:string;held:boolean};
export type RelayNotice='connected'|'already'|'wrong'|'released'|'moved'|'interrupted'|'paused';
export type RelayEvent={type:'announce'|'ready'|'closing'|'cancel'|'already'|'attempt'|'advance'|'wrong'|'complete'|'expired'|'open'|'close'|'reset';elapsed:number;actorId?:string;team?:RelayTeam;node?:RelayNode;debug?:boolean};
export type RelayObserver=(event:RelayEvent)=>void;
export type RelayChannel={node:RelayNode;started:number;x:number;y:number};
export type RelayState={phase:RelayPhase;elapsed:number;sequence:RelayNode[];progress:Record<RelayTeam,number>;winner:RelayTeam|null;gateOpen:boolean;gateRevision:number;openedAt:number;closeAt:number;channels:Record<string,RelayChannel>;feedback:'connected'|'wrong'|'expired'|null;feedbackUntil:number};
export type RelayHud={phase:RelayPhase;sequence:RelayNode[];progress:number;opponentProgress:number;node:RelayNode|null;channel:number;remaining:number;feedback:RelayState['feedback'];waiting:boolean;winner?:'your'|'opponent'|null;laneBoost?:number;target?:{dx:number;dy:number;distance:number}|null;notice?:{serial:number;kind:RelayNotice;node:RelayNode}|null};
export function relayLaneBounds(map:StudioMap){
  const gates=map.objects.filter(isPowerGate),y=gates.reduce((sum,g)=>sum+g.y+g.h/2,0)/gates.length;
  return {left:Math.min(map.bases.blue.x,map.bases.red.x)+110,right:Math.max(map.bases.blue.x,map.bases.red.x)-110,top:y-48,bottom:y+48};
}
const sequences:RelayNode[][]=[['A','B','C'],['A','C','B'],['B','A','C'],['B','C','A'],['C','A','B'],['C','B','A']];
export function relaySequence(seed:string):RelayNode[]{let hash=2166136261;for(const c of seed)hash=Math.imul(hash^c.charCodeAt(0),16777619);return [...sequences[(hash>>>0)%6]];}
export const isPowerGate=(o:Pick<MapObject,'id'>)=>o.id==='obj-power-gate-west'||o.id==='obj-power-gate-east';

/** Pure local/host-authority boundary. No profile/economy, DOM or random source. */
export function createPowerRelay(map:StudioMap,seed:string,options:Partial<typeof defaults>={},observe?:RelayObserver){
  const config={...defaults,...options};
  for(const [key,value]of Object.entries(config))if(!Number.isFinite(value)||value<=0)throw Error(`Invalid relay config: ${key}`);
  if(config.closingWarningMs>=config.gateOpenMs)throw Error('Relay warning must be shorter than gate open time.');
  const gates=map.objects.filter(isPowerGate);
  const lane=relayLaneBounds(map);
  const nodes=Object.fromEntries((['A','B','C'] as const).map(id=>{
    const o=map.objects.find(o=>o.id===`obj-power-relay-node-${id.toLowerCase()}`);
    if(!o)throw Error(`Relay node ${id} missing`);
    return [id,{x:o.x+o.w/2,y:o.y+o.h/2}];
  })) as Record<RelayNode,{x:number;y:number}>;
  if(gates.length!==2)throw Error('Relay needs both gates.');
  const fresh=(seed:string):RelayState=>({phase:'DORMANT',elapsed:0,sequence:relaySequence(seed),progress:{blue:0,red:0},winner:null,gateOpen:false,gateRevision:0,openedAt:0,closeAt:0,channels:{},feedback:null,feedbackUntil:0});
  let state=fresh(seed);const held=new Set<string>();
  let serial=0;
  const notices=new Map<string,{serial:number;kind:RelayNotice;node:RelayNode;until:number}>();
  const notify=(id:string,kind:RelayNotice,node:RelayNode)=>notices.set(id,{serial:++serial,kind,node,until:state.elapsed+config.feedbackMs});
  const cancelChannels=(reason:RelayNotice='paused')=>{for(const [id,ch] of Object.entries(state.channels)){notify(id,reason,ch.node);observe?.({type:'cancel',elapsed:state.elapsed,actorId:id,node:ch.node});}state.channels={};held.clear();};
  const near=(actor:RelayActor):RelayNode|null=>{
    if(actor.state!=='ACTIVE'||actor.blocked)return null;
    return (['A','B','C'] as const).find(id=>Math.hypot(actor.x-nodes[id].x,actor.y-nodes[id].y)<=config.interactionRadius)??null;
  };
  const solidAt=(x:number,y:number,r=13)=>!state.gateOpen&&gates.some(o=>collisionTouches(o,x,y,r));
  const open=(debug=false)=>{state.gateOpen=true;state.gateRevision++;state.phase='GATE_OPEN';state.openedAt=state.elapsed;state.closeAt=state.elapsed+config.gateOpenMs;state.channels={};state.feedback='connected';state.feedbackUntil=state.elapsed+config.feedbackMs;observe?.({type:'open',elapsed:state.elapsed,debug});};
  return {
    solidAt,
    gatesOpen:()=>state.gateOpen,
    revision:()=>state.gateRevision,
    targetFor:(team:RelayTeam)=>state.phase==='ACTIVE'?state.sequence[state.progress[team]]??null:null,
    targetPoint:(team:RelayTeam)=>state.phase==='ACTIVE'?{...nodes[state.sequence[state.progress[team]]]}:null,
    speedMultiplier:(actor:Pick<RelayActor,'team'|'x'|'y'|'state'>)=>state.gateOpen&&state.winner===actor.team&&actor.state==='ACTIVE'&&actor.x>=lane.left&&actor.x<=lane.right&&actor.y>=lane.top&&actor.y<=lane.bottom?config.laneSpeedMultiplier:1,
    entryBlocked:(actor:Pick<RelayActor,'x'|'y'>,x:number,y:number,r=13)=>state.phase==='CLOSING'&&state.elapsed>=state.closeAt&&gates.some(g=>!collisionTouches(g,actor.x,actor.y,r)&&collisionTouches(g,x,y,r)),
    egressFor:(actor:Pick<RelayActor,'x'|'y'>,clear:(x:number,y:number)=>boolean=()=>true)=>{
      if(state.phase!=='CLOSING'||state.elapsed<state.closeAt+config.closingGraceMs)return null;
      const gate=gates.find(g=>collisionTouches(g,actor.x,actor.y,config.actorRadius));
      if(!gate)return null;
      const rects=collisionRects(gate),left=Math.min(...rects.map(r=>r.x))-config.actorRadius-2,right=Math.max(...rects.map(r=>r.x+r.w))+config.actorRadius+2;
      const top=Math.min(...rects.map(r=>r.y))-config.actorRadius-2,bottom=Math.max(...rects.map(r=>r.y+r.h))+config.actorRadius+2;
      const exits=[{x:left,y:actor.y},{x:right,y:actor.y},{x:actor.x,y:top},{x:actor.x,y:bottom}].sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y));
      for(const exit of exits){
        const dx=exit.x-actor.x,dy=exit.y-actor.y,d=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(d/4));
        if(Array.from({length:steps},(_,i)=>clear(actor.x+dx*(i+1)/steps,actor.y+dy*(i+1)/steps)).every(Boolean))return {x:dx/d,y:dy/d};
      }
      return null; // Never guide an actor into an edited wall/water/boundary.
    },
    get:()=>structuredClone(state),
    reset:(seed:string)=>{observe?.({type:'reset',elapsed:state.elapsed});state=fresh(seed);held.clear();notices.clear();},
    cancelChannels:()=>cancelChannels(),
    debugOpen:()=>{if(state.phase==='COMPLETE'||state.phase==='EXPIRED'||state.gateOpen)return;open(true);},
    step(dtMs:number,actors:readonly RelayActor[],intents:readonly RelayIntent[],playing=true){
      if(!playing){cancelChannels();return;}
      if(!Number.isFinite(dtMs)||dtMs<0)throw Error('Invalid relay step');
      state.elapsed+=dtMs;
      const activeAt=config.announceAfterMs+config.announcementMs,expireAt=activeAt+config.activeWindowMs;
      if(state.phase==='DORMANT'&&state.elapsed>=config.announceAfterMs){state.phase='ANNOUNCING';observe?.({type:'announce',elapsed:state.elapsed});}
      if(state.phase==='ANNOUNCING'&&state.elapsed>=activeAt){state.phase='ACTIVE';observe?.({type:'ready',elapsed:state.elapsed});}
      if(state.phase==='ACTIVE'&&state.elapsed>=expireAt){state.phase='EXPIRED';state.channels={};state.feedback='expired';state.feedbackUntil=state.elapsed+config.feedbackMs;observe?.({type:'expired',elapsed:state.elapsed});}
      const input=new Map(intents.map(i=>[i.entityId,i.held]));
      // Stable identities break exact simultaneous completions, not array/team order.
      for(const actor of [...actors].sort((a,b)=>(state.channels[a.entityId]?.started??Infinity)-(state.channels[b.entityId]?.started??Infinity)||a.entityId.localeCompare(b.entityId))){
        const down=input.get(actor.entityId)===true,edge=down&&!held.has(actor.entityId),node=near(actor),channel=state.channels[actor.entityId];
        if(state.phase!=='ACTIVE'||!down||!node||channel&&(channel.node!==node||Math.hypot(actor.x-channel.x,actor.y-channel.y)>config.movementTolerance)){
          if(channel&&state.phase==='ACTIVE'){
            notify(actor.entityId,actor.state!=='ACTIVE'||actor.blocked?'interrupted':!down?'released':'moved',channel.node);
            observe?.({type:'cancel',elapsed:state.elapsed,actorId:actor.entityId,node:channel.node});
          }
          delete state.channels[actor.entityId];
        }
        else if(channel&&state.elapsed-channel.started>=config.channelMs){
          delete state.channels[actor.entityId];
          if(node===state.sequence[state.progress[actor.team]]){
            notify(actor.entityId,'connected',node);
            observe?.({type:'advance',elapsed:state.elapsed,actorId:actor.entityId,team:actor.team,node});
            if(++state.progress[actor.team]===3){state.winner=actor.team;observe?.({type:'complete',elapsed:state.elapsed,actorId:actor.entityId,team:actor.team});open();}
          }else if(state.sequence.indexOf(node)<state.progress[actor.team]){notify(actor.entityId,'already',node);}
          else{state.progress[actor.team]=0;notify(actor.entityId,'wrong',node);state.feedback='wrong';state.feedbackUntil=state.elapsed+config.feedbackMs;observe?.({type:'wrong',elapsed:state.elapsed,actorId:actor.entityId,team:actor.team,node});}
        }else if(edge){
          // A completed node is safe to revisit; only a future out-of-order node resets progress.
          if(state.sequence.indexOf(node)<state.progress[actor.team]){notify(actor.entityId,'already',node);observe?.({type:'already',elapsed:state.elapsed,actorId:actor.entityId,team:actor.team,node});}
          else{notices.delete(actor.entityId);state.channels[actor.entityId]={node,started:state.elapsed,x:actor.x,y:actor.y};observe?.({type:'attempt',elapsed:state.elapsed,actorId:actor.entityId,team:actor.team,node});}
        }
        if(down)held.add(actor.entityId);else held.delete(actor.entityId);
      }
      const live=new Set(actors.map(a=>a.entityId));for(const id of Object.keys(state.channels))if(!live.has(id))delete state.channels[id];for(const id of held)if(!live.has(id))held.delete(id);
      if(state.phase==='GATE_OPEN'&&state.elapsed>=state.closeAt-config.closingWarningMs){state.phase='CLOSING';observe?.({type:'closing',elapsed:state.elapsed});}
      if(state.phase==='CLOSING'&&state.elapsed>=state.closeAt&&!actors.some(a=>gates.some(g=>collisionTouches(g,a.x,a.y,config.actorRadius)))){
        state.gateOpen=false;state.gateRevision++;state.phase='COMPLETE';state.channels={};state.feedback=null;
        observe?.({type:'close',elapsed:state.elapsed});
      }
    },
    hud(actor:RelayActor):RelayHud{
      const channel=state.channels[actor.entityId];
      const notice=notices.get(actor.entityId);
      const target=state.phase==='ACTIVE'?nodes[state.sequence[state.progress[actor.team]]]:null;
      return {phase:state.phase,sequence:[...state.sequence],progress:state.progress[actor.team],opponentProgress:state.progress[actor.team==='blue'?'red':'blue'],
        node:near(actor),channel:channel?Math.min(1,(state.elapsed-channel.started)/config.channelMs):0,
        remaining:Math.max(0,Math.ceil(((state.gateOpen?state.closeAt:state.phase==='DORMANT'||state.phase==='ANNOUNCING'?config.announceAfterMs+config.announcementMs:activeEnd())-state.elapsed)/1000)),
        notice:notice&&state.elapsed<notice.until?{serial:notice.serial,kind:notice.kind,node:notice.node}:null,
        target:target?{dx:target.x-actor.x,dy:target.y-actor.y,distance:Math.round(Math.hypot(target.x-actor.x,target.y-actor.y))}:null,
        laneBoost:state.winner===actor.team&&state.gateOpen?config.laneSpeedMultiplier:1,
        winner:state.winner?state.winner===actor.team?'your':'opponent':null,
        feedback:state.elapsed<state.feedbackUntil?state.feedback:null,waiting:state.phase==='CLOSING'&&state.elapsed>=state.closeAt};
      function activeEnd(){return config.announceAfterMs+config.announcementMs+config.activeWindowMs;}
    },
  };
}

/** One immutable index, plus the two live gate tests. Original map is untouched. */
export function createRelayWorld(map:StudioMap,seed:string,enabled=true,observe?:RelayObserver){
  if(!enabled||!isRelayPrototypeMap(map))return null;
  // A partially edited Studio draft must remain playable, not crash on mount.
  if(map.objects.filter(isPowerGate).length!==2||!['a','b','c'].every(node=>map.objects.some(o=>o.id===`obj-power-relay-node-${node}`)))return null;
  const relay=createPowerRelay(map,seed,{},observe),staticMap={...map,objects:map.objects.filter(o=>!isPowerGate(o))},queries=createMapQueries(staticMap);
  const gateRects=map.objects.filter(isPowerGate).flatMap(collisionRects),empty:typeof gateRects=[];
  return {relay,recoveryRects:()=>relay.gatesOpen()?empty:gateRects,queries:{...queries,solidAt:(x:number,y:number,r=13,jumping=false)=>queries.solidAt(x,y,r,jumping)||relay.solidAt(x,y,r),flightSolidAt:(x:number,y:number,r=13)=>queries.flightSolidAt(x,y,r)||relay.solidAt(x,y,r)}};
}
