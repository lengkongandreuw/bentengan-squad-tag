import type {TutorialSession,TutorialSignal} from './types.ts';
import {tutorialStep} from './steps.ts';
import type {GameEvent} from '../game-core/events.ts';
export const createTutorialSession=():TutorialSession=>({stepId:'intro_ui',lastSerial:0,transitions:0,finished:false,lastSuccess:null});
export function advanceTutorial(state:TutorialSession,signal:TutorialSignal):TutorialSession {
  const step=tutorialStep(state.stepId);
  if(!step)return createTutorialSession();
  if(state.finished||!Number.isSafeInteger(signal.serial)||signal.serial<=state.lastSerial)return state;
  const consumed={...state,lastSerial:signal.serial};
  if(signal.expectedStep&&signal.expectedStep!==step.id||signal.kind!==step.signal)return consumed;
  return {...consumed,stepId:step.next??step.id,finished:step.next===null,transitions:state.transitions+1,lastSuccess:step.id};
}
// A batch can advance at most one step. Only local accepted gameplay facts count.
export function tutorialEventSignal(events:readonly GameEvent[],actorId:string,targets?:{tagTargetId:string;friendId:string}):TutorialSignal['kind']|null {
  for(const event of events){
    if('actorId'in event&&event.actorId!==actorId)continue;
    if(event.type==='PLAYER_TAGGED'&&(!targets||event.targetId===targets.tagTargetId))return 'TAGGED';
    if(event.type==='PLAYER_RESCUED'&&(!targets||event.targetIds.includes(targets.friendId)))return 'RESCUED';
    if(event.type==='FORT_CAPTURED')return 'FORT_CAPTURED';
    if(event.type==='MATCH_ENDED')return 'MATCH_ENDED';
  }
  return null;
}
