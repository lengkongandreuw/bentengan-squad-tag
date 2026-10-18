/** Input ownership only: two fingers on one action must not release each other. */
export function createTouchPointerOwner(setKey:(key:string,pressed:boolean)=>void){
  const owners=new Map<number,string>();
  const release=(id:number)=>{const key=owners.get(id);if(key===undefined)return;owners.delete(id);if(![...owners.values()].includes(key))setKey(key,false);};
  return {
    press(id:number,key:string){if(owners.get(id)===key)return;release(id);const held=[...owners.values()].includes(key);owners.set(id,key);if(!held)setKey(key,true);},
    release,
    clear(){const held=new Set(owners.values());owners.clear();for(const key of held)setKey(key,false);},
  };
}
