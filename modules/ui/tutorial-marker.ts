import type {Point} from '../../lib/game-core/types.ts';
import type {TutorialStepId} from '../../lib/tutorial/types.ts';
export type TutorialMarkerRect=Point&{w:number;h:number};

export function tutorialMarkerLabel(step:TutorialStepId,indonesian:boolean) {
  if(step==='tag_enemy')return 'TAG CIICI';
  if(step==='observe_prison')return indonesian?'LIHAT ROBOT':'WATCH ROBOT';
  if(step==='rescue_friend')return indonesian?'BEBASKAN ROBOT':'RESCUE ROBOT';
  if(step==='parkour')return indonesian?'JALUR LOMPAT':'JUMP TARGET';
  return indonesian?'TUJUAN LATIHAN':'PRACTICE TARGET';
}

/** Badge positions are presentation-only: never move the actual navigation goal. */
export function tutorialMarkerBadge(goal:Point,actors:readonly Point[],width:number,height:number,badgeWidth:number,protectedAreas:readonly TutorialMarkerRect[]=[]) {
  const candidates=[[90,-84],[-90,-84],[0,-112],[104,62],[-104,62],[0,92],[180,0],[-180,0],[180,-70],[-180,-70]];
  const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(Math.max(min,max),n));
  const boxes=candidates.map(([dx,dy])=>({x:clamp(goal.x+dx,badgeWidth/2+8,width-badgeWidth/2-8),y:clamp(goal.y+dy,100,height-150)}));
  const collisions=(p:Point)=>actors.filter(a=>Math.abs(p.x-a.x)<badgeWidth/2+42&&p.y+14>a.y-80&&p.y-14<a.y+52).length+
    100*protectedAreas.filter(r=>p.x+badgeWidth/2+8>r.x&&p.x-badgeWidth/2-8<r.x+r.w&&p.y+22>r.y&&p.y-22<r.y+r.h).length;
  return boxes.reduce((best,p)=>collisions(p)<collisions(best)?p:best);
}

export function drawTutorialMarker(ctx:CanvasRenderingContext2D,goal:Point,actors:readonly Point[],width:number,height:number,label:string,emphasized:boolean,protectedAreas:readonly TutorialMarkerRect[]=[]) {
  ctx.save();
  ctx.font='900 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  const badgeWidth=ctx.measureText(label).width+24;
  const badge=tutorialMarkerBadge(goal,actors,width,height,badgeWidth,protectedAreas);
  ctx.strokeStyle='#54e6ff';ctx.fillStyle='#071e29';ctx.lineWidth=emphasized?4:3;
  ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(goal.x,goal.y);ctx.lineTo(badge.x,badge.y);ctx.stroke();ctx.setLineDash([]);
  // A ground diamond and a named badge differ from circular actor/team outlines.
  const size=emphasized?19:14;
  ctx.beginPath();ctx.moveTo(goal.x,goal.y-size);ctx.lineTo(goal.x+size,goal.y);ctx.lineTo(goal.x,goal.y+size);ctx.lineTo(goal.x-size,goal.y);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillRect(badge.x-badgeWidth/2,badge.y-14,badgeWidth,28);ctx.strokeRect(badge.x-badgeWidth/2,badge.y-14,badgeWidth,28);
  ctx.fillStyle='#d5faff';ctx.fillText(label,badge.x,badge.y);
  ctx.restore();
}
