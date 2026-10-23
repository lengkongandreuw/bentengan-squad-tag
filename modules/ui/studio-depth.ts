/** Stable painter ordering for an immutable match map. Only actors move. */
export function createStudioDepth<T extends {y:number;h:number;z:number}>(objects: readonly T[]) {
  const scenery = [...objects].sort((a,b)=>a.z-b.z||(a.y+a.h)-(b.y+b.h));
  const actors: {y:number}[] = [];
  return <P extends {y:number}>(players: readonly P[],visible:(object:T)=>boolean,drawActor:(actor:P)=>void,drawObject:(object:T)=>void) => {
    actors.length=0;
    for(const p of players) actors.push(p);
    actors.sort((a,b)=>a.y-b.y);
    let index=0;
    const next=()=>{const object=scenery[index++];if(visible(object))drawObject(object);};
    for(const actor of actors) {
      // The original stable sort put players before objects at equal z/y.
      while(index<scenery.length&&(scenery[index].z<0||scenery[index].z===0&&scenery[index].y+scenery[index].h<actor.y))next();
      drawActor(actor as P);
    }
    while(index<scenery.length)next();
  };
}
