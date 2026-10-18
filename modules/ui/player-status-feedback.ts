import type {Point} from '../../lib/game-core/types.ts';
export type PlayerEffectId='captured'|'warning'|'shielded'|'immune'|'boost'|'powered'|'returning';
export type EffectActor=Point&{entityId:string;state:string;parkourUntil:number;rescueShieldUntil:number;ultimateShieldUntil:number;fallNoticeUntil:number;flight?:{warning?:boolean}|null};
export type Effect={id:PlayerEffectId;token:string};
export const EFFECT_LABELS={captured:['CAPTURED','TERTANGKAP'],warning:['WARNING','WASPADA'],shielded:['SHIELDED','BERPERISAI'],immune:['IMMUNE','KEBAL'],boost:['SPRINT','SPRINT'],powered:['ULTIMATE BUFF','BUFF ULTIMATE'],returning:['RETURNING','KEMBALI']} as const;
const colors:Record<PlayerEffectId,string>={captured:'#e7dcce',warning:'#ffe472',shielded:'#8cffad',immune:'#85edff',boost:'#e5ff7c',powered:'#d0abff',returning:'#fff1a2'};
/** Actual timers/states only. Sprint must be supplied by the accepted local action. */
export function activePlayerEffect(p:EffectActor,now:number,sprintUntil=0,poweredUntil=0):Effect|null{
  if(p.state==='PRISONER')return {id:'captured',token:'captured'};
  if(p.fallNoticeUntil>now||p.flight?.warning)return {id:'warning',token:`warning:${Math.max(0,p.fallNoticeUntil)}`};
  if(p.ultimateShieldUntil>now)return {id:'shielded',token:`shield:${p.ultimateShieldUntil}`};
  const immunity=Math.max(p.parkourUntil,p.state==='RETURNING'?p.rescueShieldUntil:0);
  if(immunity>now)return {id:'immune',token:`immune:${immunity}`};
  if(!p.flight&&sprintUntil>now)return {id:'boost',token:`sprint:${sprintUntil}`};
  if(p.state==='ACTIVE'&&poweredUntil>now)return {id:'powered',token:`powered:${poweredUntil}`};
  return p.state==='RETURNING'?{id:'returning',token:'returning'}:null;
}
/** Read the applicable caster/team deadline, not the observer's team or speed. */
export function teamBuffDeadline(p:{team:string;state:string},casters:readonly {team:string;until:number}[]){
  return p.state==='ACTIVE'?Math.max(0,...casters.filter(c=>c.team===p.team).map(c=>c.until)):0;
}
export type EffectView={x:number;y:number;width:number;height:number;scale:number};
export type EffectBadge={actorId:string;id:PlayerEffectId;x:number;y:number;width:number;height:number;text:string;color:string;alpha:number};
export function projectPlayerEffect(p:Point,view:EffectView,tagRow:boolean,waterRow=false){
  return {x:(p.x-view.x)*view.scale+view.width/2,y:(p.y+40+(tagRow?25:0)+(waterRow?14:0)-view.y)*view.scale+view.height/2+5};
}
/** Bounded presentation memory: at most one current effect per live actor. */
export function createPlayerStatusFeedback(){
  const sessions=new Map<string,{token:string;since:number}>();
  return {
    read(p:EffectActor,now:number,sprintUntil=0,poweredUntil=0){
      const effect=activePlayerEffect(p,now,sprintUntil,poweredUntil);
      if(!effect){sessions.delete(p.entityId);return null;}
      let session=sessions.get(p.entityId);
      if(!session||session.token!==effect.token){session={token:effect.token,since:now};sessions.set(p.entityId,session);}
      const age=Math.max(0,now-session.since);
      return age<2800?{...effect,age}:null;
    },
    retain(ids:readonly string[]){const live=new Set(ids);for(const id of sessions.keys())if(!live.has(id))sessions.delete(id);},
    clear(){sessions.clear();},
  };
}
/** Screen-space text, positioned from the exact same camera projection as the world. */
export function drawPlayerEffects(ctx:CanvasRenderingContext2D,items:readonly {p:EffectActor;id:PlayerEffectId;age:number;tagRow:boolean;waterRow?:boolean}[],view:EffectView,indonesian:boolean,scale=1,reduced=false):EffectBadge[]{
  const badges:EffectBadge[]=[];
  ctx.save();ctx.font=`900 ${Math.round(11*scale)}px Arial`;ctx.textAlign='center';
  for(const item of items){
    const anchor=projectPlayerEffect(item.p,view,item.tagRow,item.waterRow),text=EFFECT_LABELS[item.id][indonesian?1:0],width=ctx.measureText(text).width+14,height=Math.round(20*scale);
    if(anchor.x<0||anchor.x>view.width||anchor.y<0||anchor.y+height>view.height-4)continue;
    const x=Math.max(4,Math.min(view.width-width-4,anchor.x-width/2)),y=anchor.y;
    if(badges.some(b=>x<b.x+b.width+4&&x+width+4>b.x&&y<b.y+b.height+4&&y+height+4>b.y))continue;
    const alpha=reduced?1:Math.min(1,(2800-item.age)/180);
    ctx.globalAlpha=alpha;ctx.fillStyle='#08100ff2';ctx.strokeStyle=colors[item.id];ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(x,y,width,height,4);ctx.fill();ctx.stroke();
    ctx.fillStyle=colors[item.id];ctx.fillText(text,x+width/2,y+height*.71);
    badges.push({actorId:item.p.entityId,id:item.id,x,y,width,height,text,color:colors[item.id],alpha});
  }
  ctx.restore();return badges;
}
