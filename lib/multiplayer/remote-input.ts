import {parseProtocolMessage,type ProtocolMessage,type NetworkInput} from './protocol.ts';
import type {PlayerInputFrame} from '../game-core/input';
import type {RuntimeActor} from '../game-core/types';
import {flightConfig,isFlying,steerFlight} from '../../modules/gameplay/flight-ultimate.ts';

export const neutralInput=():NetworkInput=>({moveX:0,moveY:0,sprint:false,keyboardSprint:false,sprintPulse:false,
  parkour:false,ultimate:false,rescue:false,pause:false,target:null});
export function wireInput(frame:PlayerInputFrame):NetworkInput {
  return {...neutralInput(),moveX:frame.moveX,moveY:frame.moveY,sprint:frame.sprint,keyboardSprint:frame.keyboardSprint,
    sprintPulse:frame.sprintPulse,parkour:frame.parkour,ultimate:frame.ultimate,rescue:frame.rescue,
    target:frame.targetX!==undefined&&frame.targetY!==undefined?{x:frame.targetX,y:frame.targetY}:null};
}
/** Ownership/sequence gates precede any mutation. Latest intent expires on silence. */
export function createRemoteInputBuffer(matchId:string,owners:ReadonlyMap<string,string>,width:number,height:number,timeoutMs=250) {
  const frames=new Map<string,{sequence:number;input:NetworkInput;at:number}>();
  const revoked=new Set<string>();
  return {
    accept(peerId:string,value:unknown,now:number):boolean {
      const m=parseProtocolMessage(value);
      if(revoked.has(peerId)||!m||m.type!=='INPUT'||m.matchId!==matchId||owners.get(m.entityId)!==peerId||
        m.sequence<=(frames.get(m.entityId)?.sequence??0)||m.input.pause||
        (m.input.target&&(m.input.target.x<0||m.input.target.y<0||m.input.target.x>width||m.input.target.y>height)))return false;
      const input=structuredClone(m.input),old=frames.get(m.entityId);
      if(old&&now-old.at<=timeoutMs){input.ultimate ||= old.input.ultimate;input.rescue ||= old.input.rescue;input.sprintPulse ||= old.input.sprintPulse;input.sprint=input.keyboardSprint||input.sprintPulse;}
      frames.set(m.entityId,{sequence:m.sequence,input,at:now});return true;
    },
    sample(entityId:string,now:number):PlayerInputFrame {
      const entry=frames.get(entityId),input=entry&&now-entry.at<=timeoutMs?structuredClone(entry.input):neutralInput();
      // A right-click pulse is consumed once, not on every simulation frame.
      const pulse=input.sprintPulse;
      if(entry){entry.input.sprintPulse=false;entry.input.sprint=entry.input.keyboardSprint;entry.input.ultimate=false;entry.input.rescue=false;}
      return {entityId,sequence:entry?.sequence??0,...input,sprintPulse:pulse,
        ...(input.target?{targetX:input.target.x,targetY:input.target.y}:{})};
    },
    disconnect(peerId:string){revoked.add(peerId);for(const [id,owner] of owners)if(owner===peerId)frames.delete(id);},
  };
}
export type HumanMovementHooks={move:(p:RuntimeActor,x:number,y:number,speed:number,dt:number,now:number,frame:PlayerInputFrame)=>void;
  landing:(p:RuntimeActor,vector:{x:number;y:number},distance:number,now:number)=>{x:number;y:number;crossedWater:boolean}|null;
  near:(p:RuntimeActor)=>boolean;returnVector:(p:RuntimeActor,now:number)=>{x:number;y:number};
  combo:(p:RuntimeActor,now:number)=>number;water:boolean;boostDurationMs:number;groundValid?:(x:number,y:number)=>boolean};
/** Remote humans use the same movement/landing/drain rules, without bot multipliers. */
export function createRemoteHumanMovement() {
  const latches=new Map<string,{boost:boolean;parkour:boolean;burstUntil:number}>();
  return (p:RuntimeActor,frame:PlayerInputFrame,stats:{speed:number;boostDrain:number;boostMultiplier:number;agility:number},dt:number,now:number,h:HumanMovementHooks)=>{
    if(frame.entityId!==p.entityId)throw Error('Input belongs to another entity');
    const latch=latches.get(p.entityId)??{boost:false,parkour:false,burstUntil:0};latches.set(p.entityId,latch);
    let x=frame.moveX,y=frame.moveY,limit=Infinity;
    if(!x&&!y&&frame.targetX!==undefined&&frame.targetY!==undefined){x=frame.targetX-p.x;y=frame.targetY-p.y;const d=Math.hypot(x,y);if(d<=5){x=0;y=0;}else limit=d/Math.max(dt,.001);}
    const active=(p.state==='ACTIVE'||p.state==='IN_BASE')&&!(h.water&&p.waterEnteredAt)&&!p.flight;
    if(active&&frame.sprint&&(!latch.boost||frame.sprintPulse)&&p.boost>0)latch.burstUntil=now+h.boostDurationMs;
    const boost=active&&now<latch.burstUntil&&p.boost>0&&!!(x||y);
    latch.boost=frame.keyboardSprint;
    const combo=h.combo(p,now),cost=8/stats.agility;
    if(active&&frame.parkour&&!latch.parkour&&p.boost>=cost&&now>p.parkourUntil&&(x||y)&&h.near(p)){
      const landing=h.landing(p,{x,y},54*stats.agility,now);
      if(landing){p.x=landing.x;p.y=landing.y;p.parkourUntil=now+360;p.fallSafeUntil=now+(landing.crossedWater?620:430);p.boost=Math.max(0,p.boost-cost);p.boostReadyAt=now+20000;}
    }
    latch.parkour=frame.parkour;
    if(boost){p.boost=Math.max(0,p.boost-stats.boostDrain*(combo>1?.8:1)*dt);p.boostReadyAt=now+20000;}
    if(p.state==='RETURNING'){const vector=h.returnVector(p,now);x=vector.x;y=vector.y;limit=Infinity;}
    const config=flightConfig(p.characterId),flying=isFlying(p),before={x:p.x,y:p.y};
    if(flying&&config){const steering=steerFlight(p.flight!,x,y,dt,config.turnMultiplier);x=steering.x;y=steering.y;}
    if((active||flying||p.state==='RETURNING')&&(x||y))h.move(p,x,y,Math.min(limit,stats.speed*combo*(boost?stats.boostMultiplier:1)*(flying&&config?config.speedMultiplier:1)),dt,now,frame);
    else {p.vx=0;p.vy=0;}
    if(p.flight){p.flight.distance+=Math.hypot(p.x-before.x,p.y-before.y);if(flying&&h.groundValid?.(p.x,p.y))p.flight.lastGround={x:p.x,y:p.y};}
  };
}
export type InputMessage=Extract<ProtocolMessage,{type:'INPUT'}>;
