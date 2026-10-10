// Visual-only helpers. Never write positions, actors, collision, or game state.
const roofAssets=new Set(['map2Center','map2Cart','marketStallA','marketStallC','snackCart','foodCart']);
/** @param {{asset:string,x:number,y:number,w:number,h:number,visualW:number,visualH:number}} item
 * @param {Array<{x:number,y:number}>} players */
export function pasar2OcclusionOpacity(item,players){
  if(!roofAssets.has(item.asset))return 1;
  const left=item.x+(item.w-item.visualW)/2,top=item.y+item.h-item.visualH,bottom=item.y+item.h;
  return players.some(p=>p.y<bottom&&p.y+10>top&&p.y-80<bottom&&p.x+20>left&&p.x-20<left+item.visualW)?0.58:1;
}
/** @param {number} current @param {number} target @param {number} elapsed */
export const pasar2FadeOpacity=(current,target,elapsed)=>current+(target-current)*(1-Math.exp(-Math.max(0,elapsed)/120));
/** @param {CanvasRenderingContext2D} target
 * @param {Array<{asset:string,x:number,y:number,w:number,h:number,visualW:number,visualH:number}>} props */
export function drawPasar2ContactShadows(target,props){
  target.save();
  for(const item of props){
    if(item.asset==='plantFence'||item.asset==='bunting')continue;
    const rx=item.w*.46,ry=Math.max(2.5,Math.min(9,item.h*.22));
    target.save();target.translate(item.x+item.w/2,item.y+item.h-ry*.35);target.scale(rx,ry);
    const shadow=target.createRadialGradient(0,0,.12,0,0,1);
    shadow.addColorStop(0,'rgba(20,28,30,.20)');shadow.addColorStop(.65,'rgba(20,28,30,.08)');shadow.addColorStop(1,'rgba(20,28,30,0)');
    target.fillStyle=shadow;target.fillRect(-1,-1,2,2);target.restore();
  }
  target.restore();
}
/** @param {CanvasRenderingContext2D} target */
export function drawPasar2ShoreDepth(target){
  target.save();
  // Existing stone bank ends at y=960. Cut out the unchanged central pier.
  for(const [x,w] of [[0,1008],[1092,1008]]){
    const shade=target.createLinearGradient(x,958,x,976);
    shade.addColorStop(0,'rgba(13,30,39,.28)');shade.addColorStop(1,'rgba(13,30,39,0)');
    target.fillStyle=shade;target.fillRect(x,958,w,18);
    target.strokeStyle='rgba(126,208,224,.40)';target.lineWidth=1.5;
    target.beginPath();target.moveTo(x,975);target.lineTo(x+w,975);target.stroke();
  }
  target.restore();
}
