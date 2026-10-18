import {useEffect,useState} from 'react';
import {useLanguage} from '../../lib/language';
import {tutorialStep} from '../../lib/tutorial/steps';
import type {TutorialSession} from '../../lib/tutorial/types';
import type {TutorialGoal} from '../../lib/tutorial/director';
import './tutorial-coach.css';
export function TutorialCoach({session,goal,onAck,onHelp}:{session:TutorialSession;goal?:TutorialGoal|null;onAck:()=>void;onHelp:()=>void}){
  const id=useLanguage()==='id',[touch,setTouch]=useState(false);
  useEffect(()=>{const media=matchMedia('(pointer:coarse),(max-width:1100px)');const update=()=>setTouch(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const step=tutorialStep(session.stepId);if(!step)return null;
  const keys={move:touch?'D-pad':'WASD / arrows',sprint:touch?'D-pad + SPRINT':'WASD / arrows + Space / right click',parkour:touch?'PARKOUR':'Shift',ultimate:touch?'ULT':'Caps Lock',tag:id?'Sentuh lawan':'Touch opponent',rescue:id?'Sentuh teman':'Touch teammate',fort:id?'Benteng lawan':'Enemy fort'};
  const label=session.stepId==='sprint'?(id?step.idText:step.en):goal?.en?(id?goal.id:goal.en):(id?step.idText:step.en);
  return <aside className="tutorial-coach compact-objective" aria-label={id?'Tujuan tutorial':'Tutorial objective'}>
    <div className="tutorial-copy"><output aria-live="polite">{label}</output>{step.control&&<b>{keys[step.control]}</b>}
    {goal?.recovered&&<small>{id?'Langkah dipulihkan. Coba lagi.':'Lesson reset. Try again.'}</small>}</div>
    <div className="tutorial-objective-actions"><button className="tutorial-help" aria-label={id?'Bantuan tutorial':'Tutorial help'} onClick={onHelp}>?</button>
    {step.signal==='ACK'&&step.recovery!=='handoff'&&<button onClick={onAck} disabled={session.stepId==='observe_prison'&&!goal?.prisonReady}>{id?'SIAP':'GOT IT'}</button>}</div>
  </aside>;
}
