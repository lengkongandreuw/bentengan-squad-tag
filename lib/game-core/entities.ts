import type {EntityId,PeerId,RuntimeActor} from './types';

/** Host allocation order is deterministic; the ID is not a roster array index. */
export function createEntityRegistry() {
  let serial=0;
  const assigned=new Map<string,EntityId>();
  return {
    assign(lifecycleKey:string):EntityId {
      if(!lifecycleKey)throw Error('Actor lifecycle key required');
      let id=assigned.get(lifecycleKey);
      if(!id){id=`entity-${String(++serial).padStart(4,'0')}`;assigned.set(lifecycleKey,id);}
      return id;
    },
  };
}
/** Takeover changes ownership, never entity identity or character. */
export function setController<T extends RuntimeActor>(actor:T,controller:RuntimeActor['controller'],ownerPeerId?:PeerId):T {
  const next={...actor,controller,controlled:controller==='local'};
  if(ownerPeerId)next.ownerPeerId=ownerPeerId;else delete next.ownerPeerId;
  return next;
}
