import type {EntityId} from './types';

export type PlayerInputFrame = {
  entityId:EntityId;sequence:number;moveX:number;moveY:number;
  sprint:boolean;keyboardSprint:boolean;parkour:boolean;ultimate:boolean;rescue:boolean;pause:boolean;
  sprintPulse:boolean;targetX?:number;targetY?:number;
  parkourPulse?:boolean;
};
export function createLocalInputAdapter() {
  let sequence=0;
  return {
    sample(entityId:EntityId,keys:ReadonlySet<string>,sprintPulse=false,target?:{x:number;y:number}):PlayerInputFrame {
      if(!entityId||sequence>=Number.MAX_SAFE_INTEGER)throw Error('Invalid input identity/sequence');
      if(target&&(!Number.isFinite(target.x)||!Number.isFinite(target.y)))throw Error('Invalid click target');
      return {entityId,sequence:++sequence,
        moveX:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),
        moveY:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),
        sprint:keys.has(' ')||sprintPulse,keyboardSprint:keys.has(' '),sprintPulse,parkour:keys.has('shift'),
        ultimate:keys.has('capslock'),rescue:keys.has('r'),pause:keys.has('p'),parkourPulse:keys.has('parkour-pulse'),
        ...(target?{targetX:target.x,targetY:target.y}:{}),
      };
    },
  };
}
