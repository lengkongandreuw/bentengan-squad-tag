import type {RuntimeActor,Point,LegacyTeam} from '../game-core/types.ts';
import type {TutorialStepId} from './types.ts';
export type PracticeArea={center:Point;barrier:{x:number;y:number;w:number;h:number};start:Point;end:Point};
export type TutorialGoal={point:Point|null;en:string;id:string;prisonReady:boolean;targetId:string|null;hintLevel?:number;recovered?:boolean};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function chooseTutorialSpawn(base:Point,radius:number,slot:number,clear:(x:number,y:number)=>boolean):Point|null {
  for(const reach of [radius-24,radius-12,radius-36])for(let i=0;i<24;i++){
    const angle=(i+slot*4)*Math.PI/12;
    const point={x:base.x+Math.cos(angle)*reach,y:base.y+Math.sin(angle)*reach};
    if(clear(point.x,point.y))return point;
  }
  return null;
}
/** Finds an empty local practice patch; never edits map documents or teleports actors. */
export function choosePracticeArea(base:Point,width:number,height:number,clear:(x:number,y:number)=>boolean):PracticeArea|null {
  for(let radius=200;radius<=1000;radius+=80)for(const dy of [0,-radius/2,radius/2,-radius,radius]){
    const center={x:base.x+radius,y:base.y+dy};
    if(center.x<140||center.x>width-140||center.y<160||center.y>height-160)continue;
    let safe=true;
    for(let y=-100;y<=100&&safe;y+=20)for(let x=-100;x<=100;x+=20)if(!clear(center.x+x,center.y+y)){safe=false;break;}
    if(safe)return {center,barrier:{x:center.x-50,y:center.y-8,w:100,h:16},start:{x:center.x,y:center.y-32},end:{x:center.x,y:center.y+65}};
  }
  return null;
}
export function createTutorialDirector(humanId:string,friendId:string,targetId:string,captorId:string,area:PracticeArea,bases:Record<LegacyTeam,Point>,radius:number) {
  const inside=(p:RuntimeActor)=>({x:bases[p.team].x+(p.team==='blue'?1:-1)*(radius-26),y:bases[p.team].y});
  const outside=(p:RuntimeActor)=>({x:bases[p.team].x+(p.team==='blue'?1:-1)*(radius+100),y:bases[p.team].y});
  const actors=(players:RuntimeActor[])=>({human:players.find(p=>p.entityId===humanId)!,friend:players.find(p=>p.entityId===friendId)!,target:players.find(p=>p.entityId===targetId)!,captor:players.find(p=>p.entityId===captorId)!});
  return {
    ids:{humanId,friendId,targetId,captorId},area,
    goal(step:TutorialStepId,players:RuntimeActor[],assisted=false):TutorialGoal {
      const {human,friend,target}=actors(players);
      const base={point:null,en:'',id:'',prisonReady:friend?.state==='PRISONER',targetId:null} as TutorialGoal;
      if(!human||!friend||!target)return base;
      if(step==='ultimate')return {...base,point:human.state==='ACTIVE'?null:outside(human),en:'Leave your fort, then unleash Ultimate. Your training meter is ready.',id:'Keluar benteng, lalu aktifkan Ultimate. Meter latihanmu sudah siap.'};
      if(step==='capture_benteng')return {...base,point:bases[human.team==='blue'?'red':'blue'],en:assisted?'Kaka is giving you room. Reach their Benteng and hold your position.':'Take their Benteng! Reach the enemy fort and hold your position.',id:assisted?'Kaka memberi jalan. Capai benteng lawan dan pertahankan posisimu.':'Rebut benteng lawan! Capai bentengnya dan pertahankan posisimu.'};
      if(step==='move')return {...base,point:area.start,en:'Head toward the practice marker.',id:'Bergerak menuju penanda latihan.'};
      if(step==='sprint')return {...base,point:area.start,en:'Sprint toward the practice marker. Keep moving as you activate Sprint.',id:'Sprint menuju penanda latihan. Tetap bergerak saat mengaktifkan Sprint.'};
      if(step==='parkour')return {...base,point:distance(human,area.start)>24?area.start:area.end,
        en:distance(human,area.start)>24?'Reach the near side of the yellow barrier.':'Face across the yellow barrier, then Parkour.',
        id:distance(human,area.start)>24?'Capai sisi dekat penghalang kuning.':'Hadap ke seberang penghalang kuning, lalu Parkour.'};
      if(step==='tag_enemy'){
        if(human.exitOrder<=target.exitOrder||human.state!=='ACTIVE')return {...base,point:inside(human),en:'Refresh at your fort, then leave. Ciici waits at the marker.',id:'Bersiap lagi di bentengmu, lalu keluar. Ciici menunggu di penanda.',targetId};
        return {...base,point:{x:target.x,y:target.y},en:'Tag Ciici. Touch her—she left her fort before you.',id:'Tag Ciici. Sentuh dia—dia keluar benteng lebih dulu.',targetId};
      }
      if(step==='observe_prison')return {...base,point:{x:friend.x,y:friend.y},en:base.prisonReady?'Robot is in the enemy prison. You can free him.':'Watch Kaka tag Robot. This is a real capture.',id:base.prisonReady?'Robot ada di penjara lawan. Kamu bisa membebaskannya.':'Lihat Kaka menangkap Robot. Ini tangkapan sungguhan.',targetId:friendId};
      if(step==='rescue_friend')return {...base,point:{x:friend.x,y:friend.y},en:'Touch Robot in the enemy prison. Rescue is automatic.',id:'Sentuh Robot di penjara lawan. Rescue berlangsung otomatis.',targetId:friendId};
      return base;
    },
    destination(step:TutorialStepId,p:RuntimeActor,players:RuntimeActor[]):Point|null {
      const {human,friend,captor}=actors(players);
      if(!human||!friend||!captor)return null;
      if(p.state==='PRISONER')return null;
      if(p.state==='RETURNING')return inside(p);
      if(p.entityId===targetId){
        if(p.state==='IN_BASE')return outside(p);
        if(step==='tag_enemy')return {x:area.center.x+75,y:area.center.y+65};
        return outside(p);
      }
      if(p.entityId===captorId){
        if(p.state==='IN_BASE')return outside(p);
        if(step==='observe_prison'&&friend.state!=='PRISONER')return p.exitOrder>friend.exitOrder?{x:friend.x,y:friend.y}:inside(p);
        if(step==='capture_benteng'&&distance(human,bases[p.team])>radius*2)return {x:human.x,y:human.y+55};
        return outside(p);
      }
      if(p.entityId===friendId){
        if(step==='observe_prison')return friend.state==='IN_BASE'?outside(friend):{x:area.center.x+65,y:area.center.y+65};
        // Stay beside/behind the learner, not on the route or landing marker.
        if(['intro_ui','move','sprint','parkour'].includes(step)){
          const goal=step==='parkour'&&distance(human,area.start)<=24?area.end:area.start;
          const dx=goal.x-human.x,dy=goal.y-human.y,length=Math.hypot(dx,dy)||1;
          const forward=Math.hypot(dx,dy)>1?{x:dx/length,y:dy/length}:{x:0,y:1};
          return {x:human.x-forward.x*65-forward.y*110,y:human.y-forward.y*65+forward.x*110};
        }
        if(step==='tag_enemy')return {x:area.center.x-75,y:area.center.y+100};
        if(step==='rescue_friend')return friend.state==='PRISONER'?null:inside(friend);
        return inside(friend);
      }
      void captor;return null;
    },
    allowsContact(step:TutorialStepId,a:RuntimeActor,b:RuntimeActor,assisted=false){
      if(assisted&&step==='capture_benteng'&&a.entityId===captorId&&b.entityId===humanId)return false;
      return step==='tag_enemy'&&a.entityId===humanId&&b.entityId===targetId ||
        step==='observe_prison'&&a.entityId===captorId&&b.entityId===friendId ||
        step==='capture_benteng'&&((a.entityId===humanId&&b.entityId===captorId)||(a.entityId===captorId&&b.entityId===humanId));
    },
    allowsRescue(step:TutorialStepId,p:RuntimeActor){return step==='rescue_friend'&&p.entityId===humanId;},
  };
}
export const tutorialCaptureEnabled=(step:TutorialStepId)=>step==='capture_benteng'||step==='match_complete';
export function createMovementLessonMonitor(area:PracticeArea) {
  let step:TutorialStepId|null=null,origin:Point={x:0,y:0},activated=false;
  return {observe(next:TutorialStepId,p:Point,before:Point,action:{boosting:boolean;activated:boolean;parkour:boolean}):'MOVED'|'SPRINTED'|'PARKOURED'|null {
    if(step!==next){step=next;origin={...before};activated=false;}
    if(next==='move'&&distance(p,origin)>=110)return 'MOVED';
    if(next==='sprint'){activated ||= action.activated;if(activated&&action.boosting&&distance(p,origin)>=35)return 'SPRINTED';}
    if(next==='parkour'&&action.parkour&&before.x>=area.barrier.x-8&&before.x<=area.barrier.x+area.barrier.w+8&&
      before.y<area.barrier.y-12&&p.y>area.barrier.y+area.barrier.h+12)return 'PARKOURED';
    return null;
  }};
}
