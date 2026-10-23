// Presentation only: shared by Studio and game. Stable IDs select the fallback;
// object coordinates remain the sole source of collision/visual geometry.
/** @param {import('../../../lib/map-studio-model.js').StudioMap|null|undefined} map */
export function isRelayPrototypeMap(map){
  return !!map?.objects.some(o=>o.id==='obj-relay-plaza')&&map.objects.some(o=>o.id==='obj-power-relay-node-a');
}
const ids=new Set([
  'relay-plaza',...['top','bottom'].flatMap(row=>['left','right'].map(side=>`relay-wall-${row}-${side}`)),
  ...['west','east'].flatMap(side=>[`relay-${side}-wall-top`,`relay-${side}-wall-bottom`,`power-gate-${side}`]),
  ...['a','b','c'].map(n=>`power-relay-node-${n}`),
  ...['left','right'].flatMap(side=>[`relay-outer-north-${side}`,`relay-outer-south-${side}`,`relay-parkour-north-${side}`,`relay-parkour-south-${side}`,`relay-approach-upper-${side}`,`relay-approach-lower-${side}`,`relay-prison-cover-${side}`]),
].map(name=>'obj-'+name));

/** @param {CanvasRenderingContext2D} ctx @param {import('../../../lib/map-studio-model.js').MapObject} o */
export function drawRelayPrimitive(ctx,o){
  if(o.asset||!o.visible||!ids.has(o.id))return false;
  const node=o.id.startsWith('obj-power-relay-node-'),gate=o.id.startsWith('obj-power-gate-');
  ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);ctx.rotate(o.rotation*Math.PI/180);ctx.globalAlpha*=o.opacity;
  ctx.scale(o.mirror?-1:1,o.mirrorY?-1:1);
  ctx.fillStyle=node?'#81dcf4':gate?'#ff9561':o.behavior==='parkour'?'#d9b559':o.id==='obj-relay-plaza'?'#41494e':'#68747c';
  ctx.strokeStyle=node?'#d5f6ff':gate?'#ffd1a8':'#a4b0b8';ctx.lineWidth=2;
  ctx.beginPath();if(o.shape==='ellipse')ctx.ellipse(0,0,o.w/2,o.h/2,0,0,Math.PI*2);
  else if(o.shape==='polygon'){o.points.forEach((p,i)=>i?ctx.lineTo((p.x-.5)*o.w,(p.y-.5)*o.h):ctx.moveTo((p.x-.5)*o.w,(p.y-.5)*o.h));ctx.closePath();}
  else ctx.rect(-o.w/2,-o.h/2,o.w,o.h);
  ctx.fill();ctx.stroke();
  if(node){ctx.fillStyle='#0b2734';ctx.font='bold 24px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.id.slice(-1).toUpperCase(),0,0);}
  if(gate){ctx.strokeStyle='#422817';ctx.lineWidth=3;for(let y=-o.h/2+10;y<o.h/2;y+=15){ctx.beginPath();ctx.moveTo(-o.w/2+3,y);ctx.lineTo(o.w/2-3,Math.min(o.h/2-3,y+10));ctx.stroke();}}
  ctx.restore();return true;
}

/** @param {CanvasRenderingContext2D} ctx @param {import('../../../lib/map-studio-model.js').StudioMap} map */
export function drawRelayGround(ctx,map){
  if(!isRelayPrototypeMap(map)||map.terrain)return false;
  ctx.save();ctx.fillStyle='#292f33';ctx.fillRect(0,0,map.width,map.height);
  ctx.fillStyle='#d5dce5';ctx.font='bold 24px system-ui';ctx.textAlign='center';
  ctx.fillText('GARDU TENGAH · GEOMETRY PROTOTYPE',map.width/2,60);
  ctx.font='18px system-ui';ctx.fillText('NORTH ROUTE',map.width/2,220);ctx.fillText('SOUTH ROUTE',map.width/2,850);
  ctx.fillStyle='#ffcd9a';ctx.fillText('POWER RELAY · TEMPORARY CENTER SHORTCUT',map.width/2,990);
  ctx.restore();return true;
}

/** @param {CanvasRenderingContext2D} ctx @param {import('../../../lib/map-studio-model.js').MapObject} o @param {boolean} open */
export function drawRelayOpenGate(ctx,o,open){
  if(!open||!o.visible||!['obj-power-gate-west','obj-power-gate-east'].includes(o.id))return false;
  ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);ctx.rotate(o.rotation*Math.PI/180);ctx.globalAlpha*=o.opacity;
  ctx.strokeStyle='#95f3b0';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.strokeRect(-o.w/2,-o.h/2,o.w,o.h);ctx.restore();return true;
}
/** @param {CanvasRenderingContext2D} ctx @param {import('../../../lib/map-studio-model.js').MapObject} o @param {string|null} node */
export function drawRelayTarget(ctx,o,node){
  if(!o.visible||!node||o.id!==`obj-power-relay-node-${node.toLowerCase()}`)return;
  ctx.save();ctx.strokeStyle='#ecff72';ctx.lineWidth=4;ctx.beginPath();ctx.arc(o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)/2+9,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#ecff72';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText('NEXT',o.x+o.w/2,o.y-15);ctx.restore();
}

/** Keep node identity readable independently of generated art and color.
 * @param {CanvasRenderingContext2D} ctx @param {import('../../../lib/map-studio-model.js').MapObject} o */
export function drawRelayNodeLabel(ctx,o){
  if(!o.visible||!o.asset||!/^obj-power-relay-node-[abc]$/.test(o.id))return;
  ctx.save();ctx.font='bold 23px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle='#0b1620';ctx.fillStyle='#fff';
  const label=o.id.slice(-1).toUpperCase();ctx.strokeText(label,o.x+o.w/2,o.y+o.h/2);ctx.fillText(label,o.x+o.w/2,o.y+o.h/2);ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {import('../../../lib/map-studio-model.js').StudioMap|null|undefined} map @param {'blue'|'red'} team @param {'base'|'prison'|'overlay'} kind */
export function drawRelayStructure(ctx,map,team,kind){
  if(!map||!isRelayPrototypeMap(map))return false;
  const base=map.bases[team],prison=map.prisons[team];
  if(kind==='base'&&base.visual||kind==='prison'&&prison.floorVisual||kind==='overlay'&&prison.overlayVisual)return false;
  if(kind==='overlay')return true;
  const color=team==='blue'?'#ff6875':'#8ae588';
  ctx.save();ctx.fillStyle=color+'25';ctx.strokeStyle=color;ctx.lineWidth=4;ctx.font='bold 18px system-ui';ctx.textAlign='center';
  if(kind==='base'){ctx.beginPath();ctx.arc(base.x,base.y,map.baseRadius??68,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillText('FORT',base.x,base.y+6);}
  else{ctx.fillRect(prison.x,prison.y,prison.w,prison.h);ctx.strokeRect(prison.x,prison.y,prison.w,prison.h);ctx.fillStyle=color;ctx.fillText('PRISON',prison.x+prison.w/2,prison.y+prison.h/2+6);}
  ctx.restore();return true;
}
