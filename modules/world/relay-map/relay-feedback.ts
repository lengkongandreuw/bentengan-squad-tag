import type {StudioMap} from '../../../lib/map-studio-model.js';
import type {RelayHud,RelayNode} from '../../../lib/map-events/power-relay.ts';
import {relayLaneBounds} from '../../../lib/map-events/power-relay.ts';

/** Additive, static vector cues. Original artwork/colliders are never mutated.
 * Cache geometry once; no textures, particles, shadows or frame-based animation. */
export function createRelayFeedback(map:StudioMap){
  const nodes=(['A','B','C'] as const).map(node=>({node,object:map.objects.find(o=>o.id===`obj-power-relay-node-${node.toLowerCase()}`)!}));
  const gates=map.objects.filter(o=>/^obj-power-gate-(west|east)$/.test(o.id));
  const parkour=map.objects.filter(o=>o.behavior==='parkour'&&o.visible);
  const plaza=map.objects.find(o=>o.id==='obj-relay-plaza')!;
  const lane=relayLaneBounds(map);
  const centers=nodes.map(({object:o})=>({x:o.x+o.w/2,y:o.y+o.h/2}));
  const bus=Math.max(...centers.map(p=>p.x))+65;
  const badge=(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,color:string)=>{
    ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    const width=ctx.measureText(text).width+16;
    ctx.fillStyle='#0b1823';ctx.fillRect(x-width/2,y-12,width,24);
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x-width/2,y-12,width,24);
    ctx.fillStyle=color;ctx.fillText(text,x,y);
  };
  return (ctx:CanvasRenderingContext2D,view:RelayHud,id=false,player?:{x:number;y:number})=>{
    const active=view.phase==='ACTIVE',open=view.phase==='GATE_OPEN'||view.phase==='CLOSING';
    const complete=new Set<RelayNode>(view.sequence.slice(0,view.progress));
    const color=open?'#a1f7c4':active?'#9ce7fa':'#aab7c3';
    ctx.save();
    if(open&&view.winner){
      const laneColor=view.winner==='your'?'#a1f7c4':'#ffce92';
      ctx.fillStyle=laneColor+'1c';ctx.fillRect(lane.left,lane.top,lane.right-lane.left,lane.bottom-lane.top);
      ctx.strokeStyle=laneColor;ctx.lineWidth=2;ctx.setLineDash([14,12]);
      ctx.beginPath();for(const y of [lane.top,lane.bottom]){ctx.moveTo(lane.left,y);ctx.lineTo(lane.right,y);}ctx.stroke();ctx.setLineDash([]);
      badge(ctx,view.winner==='your'?'TEAM LANE +35%':'RIVAL LANE +35%',plaza.x+plaza.w/2,lane.top-18,laneColor);
    }
    badge(ctx,id?'JALUR UTARA':'NORTH ROUTE',plaza.x+plaza.w/2,plaza.y-95,'#edf2f6');
    badge(ctx,id?'JALUR SELATAN':'SOUTH ROUTE',plaza.x+plaza.w/2,plaza.y+plaza.h+95,'#edf2f6');
    // Only nearby low obstacles get a label, avoiding a map full of permanent captions.
    if(player)for(const o of parkour){if(Math.hypot(player.x-o.x-o.w/2,player.y-o.y-o.h/2)<210)badge(ctx,'PARKOUR',o.x+o.w/2,o.y-18,'#ecff72');}
    // A trunk circuit explicitly connects the existing three node assets to both gates.
    ctx.beginPath();ctx.moveTo(bus,centers[0].y);ctx.lineTo(bus,centers[2].y);
    for(const p of centers){ctx.moveTo(p.x,p.y);ctx.lineTo(bus,p.y);}
    for(const g of gates){ctx.moveTo(bus,g.y+g.h/2);ctx.lineTo(g.x+g.w/2,g.y+g.h/2);}
    ctx.strokeStyle='#0b1823bb';ctx.lineWidth=9;ctx.stroke();
    ctx.strokeStyle=color;ctx.globalAlpha=(active||open) ? .65 : .25;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;
    for(const {node,object:o} of nodes){
      if(!o.visible)continue;
      const x=o.x+o.w/2,y=o.y+o.h/2,r=Math.max(o.w,o.h)/2+7;
      const done=complete.has(node),next=active&&view.sequence[view.progress]===node;
      if(!active&&!open){ctx.fillStyle='#08121b88';ctx.beginPath();ctx.arc(x,y,r-6,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle=done?'#a1f7c4':next?'#ecff72':color;ctx.lineWidth=next?4:2;
      ctx.setLineDash(!active&&!open?[4,4]:[]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      if(next&&view.node===node&&view.channel>0){ctx.lineWidth=6;ctx.beginPath();ctx.arc(x,y,r+5,-Math.PI/2,-Math.PI/2+Math.PI*2*view.channel);ctx.stroke();}
      const text=done?`${node} ✓`:next?`${node} · NEXT`:active?`${node} · ${id?'TUNGGU':'WAIT'}`:open?`${node} · LINK`:node+' · OFF';
      // Side labels stay clear of an actor standing on the node (head/nameplate above).
      badge(ctx,text,x-r-55,y,done?'#a1f7c4':next?'#ecff72':color);
    }
    for(const g of gates){
      if(!g.visible)continue;
      const x=g.x+g.w/2,y=g.y+g.h/2;
      // Outside the pillar silhouette: depth-sorted wall art must not hide the text.
      badge(ctx,open?(view.phase==='CLOSING'?(id?'SEGERA TUTUP':'CLOSING'):(id?'LEWAT':'PASS')):(id?'TERKUNCI':'LOCKED'),x+(x<map.width/2?-85:85),y-34,open?'#a1f7c4':'#ffce92');
      if(open){
        // Two-way floor chevrons explain that BOTH teams may pass, not a solid bar.
        ctx.strokeStyle='#0b1823';ctx.lineWidth=11;
        const arrows=()=>{ctx.beginPath();for(const sign of [-1,1]){const ax=x+sign*48;ctx.moveTo(ax-sign*12,y-12);ctx.lineTo(ax,y);ctx.lineTo(ax-sign*12,y+12);}ctx.stroke();};
        arrows();ctx.strokeStyle='#a1f7c4';ctx.lineWidth=4;arrows();
      }
    }
    ctx.restore();
  };
}
