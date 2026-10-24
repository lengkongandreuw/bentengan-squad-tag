import type {RuntimeActor,Point} from '../../lib/game-core/types.ts';
import {ROBOT_JAMMER_RADIUS,isRobotJammerActive,isIronDriveActive,isSprintJammed,type EffectStateLookup} from '../gameplay/ultimate-effects.ts';
// Procedural, short-lived world feedback only. No sprite sheet or permanent HUD.
export function drawUltimateEffects(ctx:CanvasRenderingContext2D,actors:readonly RuntimeActor[],stateFor:EffectStateLookup,now:number,project:(p:Point)=>Point,scale:number,reduced:boolean) {
  ctx.save();
  for(const actor of actors){
    const state=stateFor(actor),jammer=isRobotJammerActive(actor,now,state),drive=isIronDriveActive(actor,now,state);
    if(!jammer&&!drive)continue;
    const p=project(actor);
    if(jammer){
      const radius=ROBOT_JAMMER_RADIUS*scale;
      ctx.strokeStyle='#e5ad60';ctx.lineWidth=2;ctx.globalAlpha=reduced ? .8 : .65+.15*Math.sin(now/180);
      ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.stroke();
      for(let n=0;n<8;n++){const a=n*Math.PI/4;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*(radius-4),p.y+Math.sin(a)*(radius-4));ctx.lineTo(p.x+Math.cos(a)*(radius+4),p.y+Math.sin(a)*(radius+4));ctx.stroke();}
    }
    if(actor.controlled){ctx.globalAlpha=1;label(`${jammer?'JAMMER FIELD':'IRON DRIVE'} · ${Math.max(0,((jammer?state!.jammerUntil:state!.driveUntil)-now)/1000).toFixed(1)}s`,{x:p.x,y:p.y+46*scale},jammer?'#e5ad60':'#c1d888');}
  }
  for(const actor of actors)if(actor.controlled&&isSprintJammed(actor,actors,now,stateFor)){
    const p=project(actor);ctx.globalAlpha=1;label('SPRINT JAMMED',{x:p.x,y:p.y-64*scale},'#ffc06a');
  }
  ctx.restore();
  function label(text:string,p:Point,color:string){
    ctx.font='800 12px Arial';ctx.textAlign='center';const width=ctx.measureText(text).width+14;
    const x=Math.min(ctx.canvas.width-width/2-8,Math.max(width/2+8,p.x)),y=Math.max(24,Math.min(ctx.canvas.height-12,p.y));
    ctx.fillStyle='#101112';ctx.fillRect(x-width/2,y-16,width,22);ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
}
