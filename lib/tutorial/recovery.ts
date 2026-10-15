import type {RuntimeActor,Point} from '../game-core/types.ts';
import type {GameEvent} from '../game-core/events.ts';
import type {TutorialStepId} from './types.ts';

/** Match-local supervision. Time is active simulation time, never wall time. */
export function createTutorialRecovery() {
  let step:TutorialStepId|null=null,elapsed=0,noticeUntil=0,assisted=false;
  let checkpoint:RuntimeActor[]=[];
  const watch=new Map<string,{point:Point;idle:number}>();
  return {
    enter(next:TutorialStepId,players:RuntimeActor[]) {
      if(step===next)return false;
      step=next;elapsed=0;assisted=false;watch.clear();checkpoint=structuredClone(players);return true;
    },
    tick(dt:number,players:RuntimeActor[],destinations:ReadonlyMap<string,Point>):string|null {
      elapsed+=dt;noticeUntil=Math.max(0,noticeUntil-dt);
      if(checkpoint.some(saved=>!players.some(p=>p.entityId===saved.entityId)))return 'missing';
      if(players.some(p=>p.controller==='local'&&p.state==='PRISONER'))return 'captured';
      if(step==='tag_enemy'&&players.some(p=>p.characterId==='ciici'&&p.state==='PRISONER'))return 'target';
      if(step==='rescue_friend'&&players.some(p=>p.characterId==='robot'&&p.state!=='PRISONER'))return 'friend';
      for(const p of players){
        const goal=destinations.get(p.entityId);
        if(p.controller!=='bot'||!goal||p.state==='PRISONER'||Math.hypot(p.x-goal.x,p.y-goal.y)<20){watch.delete(p.entityId);continue;}
        const old=watch.get(p.entityId);
        const moved=!old||Math.hypot(p.x-old.point.x,p.y-old.point.y)>12;
        const next=moved?{point:{x:p.x,y:p.y},idle:0}:{point:old.point,idle:old.idle+dt};
        watch.set(p.entityId,next);
        if(next.idle>=14)return 'blocked';
      }
      return null;
    },
    restore():RuntimeActor[] {elapsed=0;assisted=true;watch.clear();noticeUntil=8;return structuredClone(checkpoint);},
    assisted(){return assisted;},
    hint(){return {level:elapsed>=35?2:elapsed>=18?1:0,recovered:noticeUntil>0};},
  };
}

/** START is not success: require the accepted impact and visible effect time. */
export function createUltimateLesson() {
  let started=false,appliedAt:number|null=null,completed=false;
  return {
    reset(){started=false;appliedAt=null;completed=false;},
    observe(events:readonly GameEvent[],actorId:string,now:number) {
      for(const event of events){
        if(!('actorId'in event)||event.actorId!==actorId)continue;
        if(event.type==='ULTIMATE_STARTED')started=true;
        if(event.type==='ULTIMATE_APPLIED'&&started)appliedAt=now;
      }
      if(!completed&&appliedAt!==null&&now-appliedAt>=1800){completed=true;return true;}
      return false;
    },
    active(){return started;},
    applied(){return appliedAt!==null;},
  };
}
