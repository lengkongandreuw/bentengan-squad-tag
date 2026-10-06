import type {RuntimeActor,Point,LegacyTeam,RefillState} from './types';
import type {PlayerInputFrame} from './input';

export type BotObjective='return'|'exit'|'rescue'|'refill'|'evade'|'tag'|'fort'|'idle';
export type BotPlan={vector:Point;objective:BotObjective;targetId?:string};
export type BotWorld={players:RuntimeActor[];bases:Record<LegacyTeam,Point>;width:number;height:number;
  refills:RefillState[];request:{requesterId:string;assignedRescuerId?:string}|null;kanal2:boolean;localTeam:LegacyTeam;
  profile:{rescueCutoff:number;threatRadius:number;playerBias:number;prediction:number;steerDistance:number};
  boostThreshold:number;navigate:(p:RuntimeActor,desired:Point,now:number,probe:number,bias:number)=>Point};
export type BotIntent={frame:PlayerInputFrame;objective:BotObjective;targetId?:string;blocked:boolean};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Existing strategy order and math. No actor mutation, routing redesign or random calls. */
export function planBot(p:RuntimeActor,now:number,w:BotWorld):BotPlan {
  const toward=(target:Point,objective:BotObjective,targetId?:string):BotPlan=>({vector:{x:target.x-p.x,y:target.y-p.y},objective,...(targetId?{targetId}:{})});
  if(p.state==='RETURNING')return toward(w.bases[p.team],'return');
  if(p.state==='IN_BASE')return toward({x:w.width/2,y:w.height/2+Math.sin(now/920+p.aiSeed)*230},'exit');
  const requester=w.request?w.players.find(q=>q.id===w.request?.requesterId):undefined;
  if(requester?.state==='PRISONER'&&w.request?.assignedRescuerId===p.id)return toward(requester,'rescue',requester.entityId);
  const held=w.players.filter(q=>q.team===p.team&&q.state==='PRISONER').sort((a,b)=>b.prisonIndex-a.prisonIndex);
  if(held.length&&(p.aiSeed%3<w.profile.rescueCutoff||held.length>=3))return toward(held[0],'rescue',held[0].entityId);
  if(p.boost<34){const item=w.refills.slice().sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(item&&distance(p,item)<360)return toward(item,'refill');}
  const threat=w.players.filter(q=>q.team!==p.team&&q.state==='ACTIVE'&&q.exitOrder>p.exitOrder).sort((a,b)=>distance(p,a)-distance(p,b))[0];
  if(threat&&distance(p,threat)<w.profile.threatRadius)return {vector:{x:p.x-threat.x,y:p.y-threat.y},objective:'evade',targetId:threat.entityId};
  const target=w.players.filter(q=>q.team!==p.team&&q.state==='ACTIVE'&&q.exitOrder<p.exitOrder).sort((a,b)=>{
    const aBias=a.controlled?-w.profile.playerBias:0,bBias=b.controlled?-w.profile.playerBias:0;
    return distance(p,a)+aBias-distance(p,b)-bBias;
  })[0];
  if(target)return toward({x:target.x+target.vx*w.profile.prediction,y:target.y+target.vy*w.profile.prediction},'tag',target.entityId);
  if(p.boost<18||Math.sin(now/4300+p.aiSeed)>.86)return toward(w.bases[p.team],'return');
  const enemy=w.bases[p.team==='blue'?'red':'blue'];
  return {vector:{x:enemy.x-p.x,y:enemy.y-p.y+Math.sin(now/740+p.aiSeed)*150},objective:'fort'};
}
export function createBotAuthority() {
  const sequences=new Map<string,number>();
  return {
    /** Sequential consumption preserves legacy AI observing earlier actors' movement. */
    run(authority:'host'|'client',w:BotWorld,now:number,consume:(p:RuntimeActor,intent:BotIntent)=>void) {
      if(authority!=='host')return;
      for(const p of w.players) {
        if(p.controller!=='bot')continue;
        const sequence=(sequences.get(p.entityId)??0)+1;
        if(!Number.isSafeInteger(sequence))throw Error('Bot input sequence overflow');
        sequences.set(p.entityId,sequence);
        const blocked=p.state==='PRISONER'||!!(w.kanal2&&p.waterEnteredAt);
        const plan=blocked?{vector:{x:0,y:0},objective:'idle' as const}:planBot(p,now,w);
        const v=blocked?plan.vector:w.navigate(p,plan.vector,now,p.team!==w.localTeam?w.profile.steerDistance:78,Math.sin(p.aiSeed+now/1700));
        const sprint=!blocked&&p.state==='ACTIVE'&&p.boost>10&&Math.hypot(v.x,v.y)>145&&Math.sin(now/950+p.aiSeed)>w.boostThreshold;
        consume(p,{blocked,objective:plan.objective,...('targetId' in plan&&plan.targetId?{targetId:plan.targetId}:{}),frame:{
          entityId:p.entityId,sequence,moveX:v.x,moveY:v.y,sprint,keyboardSprint:false,sprintPulse:false,
          parkour:false,ultimate:false,rescue:plan.objective==='rescue',pause:false,targetX:p.x+plan.vector.x,targetY:p.y+plan.vector.y,
        }});
      }
    },
  };
}
