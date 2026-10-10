/** Temporary release routes for Pasar Senggol 2 only. No AI/rule/speed changes.
 * @typedef {{x:number,y:number}} Point
 * @typedef {{x:number,y:number,w:number,h:number}} Prison
 * @typedef {{id:string,state:string,x:number,y:number,lastX?:number,lastY?:number}} Actor
 * @param {Record<string,Prison>} prisons
 * @param {(x:number,y:number)=>boolean} blocked
 * @param {number} radius
 */
export function createPasar2PrisonEgress(prisons,blocked,radius=13){
  /** @type {Map<string,{bottom:number,points:Point[],previous:Point}>} */
  const routes=new Map();
  return {
    /** @param {Actor} player @param {string} owner @param {number} slot @param {number} count */
    release(player,owner,slot,count){
      routes.delete(player.id);
      const prison=prisons[owner];
      if(!prison)return false;
      const bottom=prison.y+prison.h;
      // Two 30-unit-separated lanes fit the actual stair opening. Queue rows
      // remain inside the clear floor, away from the side/back wall contacts.
      const center=prison.x+prison.w*.505;
      const lane=count===1?0:slot%2===0?-15:15;
      const start={x:center+lane,y:bottom-60-Math.floor(slot/2)*32};
      const points=[
        {x:center+lane,y:bottom+radius+13},
        {x:center+(slot-(count-1)/2)*32,y:bottom+62},
      ];
      if(blocked(start.x,start.y)||points.some(p=>blocked(p.x,p.y)))return false;
      player.x=player.lastX=start.x;
      player.y=player.lastY=start.y;
      routes.set(player.id,{bottom,points,previous:start});
      return true;
    },
    /** @param {Actor} player @returns {Point|null} */
    vector(player){
      const route=routes.get(player.id);
      if(!route)return null;
      if(player.state!=='RETURNING'){
        routes.delete(player.id);return null;
      }
      // Never hand over to normal steering while any part of the player's
      // body remains within the prison footprint. Collision/spacing still run.
      const dx=player.x-route.previous.x,dy=player.y-route.previous.y;
      const reached=(/** @type {Point} */ target)=>{
        const t=Math.max(0,Math.min(1,((target.x-route.previous.x)*dx+(target.y-route.previous.y)*dy)/(dx*dx+dy*dy||1)));
        return Math.hypot(target.x-route.previous.x-t*dx,target.y-route.previous.y-t*dy)<5;
      };
      while(route.points.length&&reached(route.points[0])){
        if(player.y<=route.bottom+radius)break;
        route.points.shift();
      }
      route.previous={x:player.x,y:player.y};
      if(!route.points.length){routes.delete(player.id);return null;}
      const target=route.points[0];
      return {x:target.x-player.x,y:target.y-player.y};
    },
  };
}
