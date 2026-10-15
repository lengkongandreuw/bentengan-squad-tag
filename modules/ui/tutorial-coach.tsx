import {useEffect,useState,type KeyboardEvent} from 'react';
import {useLanguage} from '../../lib/language';
import {tutorialStep} from '../../lib/tutorial/steps';
import type {TutorialSession} from '../../lib/tutorial/types';
import type {TutorialGoal} from '../../lib/tutorial/director';
import './tutorial-coach.css';
export function TutorialCoach({session,goal,onAck,onRetry,onSkip}:{session:TutorialSession;goal?:TutorialGoal|null;onAck:()=>void;onRetry:()=>void;onSkip:()=>void}) {
  const language=useLanguage(),[touch,setTouch]=useState(false),[confirm,setConfirm]=useState(false);
  useEffect(()=>{const media=matchMedia('(pointer: coarse), (max-width: 900px)');const update=()=>setTouch(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const step=tutorialStep(session.stepId);if(!step)return null;
  const buttonKeys={onKeyDown:(event:KeyboardEvent<HTMLButtonElement>)=>{if(['Enter',' ','Escape'].includes(event.key))event.stopPropagation();}};
  const label=goal?.en?(language==='id'?goal.id:goal.en):language==='id'?step.idText:step.en;
  const keys={move:touch?'D-pad':'WASD / arrows',sprint:touch?'SPRINT':'Space / right click',parkour:touch?'PARKOUR':'Shift',ultimate:touch?'ULT':'Caps Lock',tag:language==='id'?'Sentuh lawan':'Touch opponent',rescue:language==='id'?'Sentuh teman':'Touch teammate',fort:language==='id'?'Benteng lawan':'Enemy fort'};
  return <aside className={`tutorial-coach${goal?.hintLevel?' tutorial-coach-help':''}`} aria-label={language==='id'?'Panduan tutorial':'Tutorial coach'}>
    <small>TUTORIAL · {session.transitions+1}/14</small>
    <div className="tutorial-copy">
    <output aria-live="polite">{label}</output>
    {goal?.recovered&&<output aria-live="polite">{language==='id'?'Latihan ini sudah dipulihkan. Coba lagi—langkah sebelumnya tetap tersimpan.':'This lesson is reset. Try again—earlier steps are kept.'}</output>}
    {!!goal?.hintLevel&&!goal.recovered&&<span>{language==='id'?(goal.hintLevel===2?'Ikuti penanda panah. Jika tersangkut, ulangi langkah ini.':'Belum berhasil? Coba kontrol di bawah, atau ulangi langkah ini.'):(goal.hintLevel===2?'Follow the arrow marker. Stuck? Retry this lesson.':'Need a hand? Try the control below, or retry this lesson.')}</span>}
    {step.control&&<b>{keys[step.control]}</b>}
    {session.lastSuccess&&<span key={session.lastSuccess} className="tutorial-success">✓ {language==='id'?'Bagus!':'Nice!'}</span>}
    </div>
    <div>
      {!confirm&&step.recovery!=='handoff'&&<button {...buttonKeys} type="button" onClick={onRetry}>{language==='id'?'ULANGI LANGKAH':'RETRY LESSON'}</button>}
      {!confirm&&step.signal==='ACK'&&step.recovery!=='handoff'&&<button {...buttonKeys} type="button" disabled={session.stepId==='observe_prison'&&!goal?.prisonReady} onClick={onAck}>{language==='id'?'SIAP':'GOT IT'}</button>}
      {confirm?<><span>{language==='id'?'Keluar latihan?':'Leave training?'}</span><button {...buttonKeys} type="button" onClick={onSkip}>{language==='id'?'KELUAR':'LEAVE'}</button><button {...buttonKeys} type="button" onClick={()=>setConfirm(false)}>{language==='id'?'BATAL':'CANCEL'}</button></>:<button {...buttonKeys} type="button" onClick={()=>setConfirm(true)}>{language==='id'?'LEWATI TUTORIAL':'SKIP TUTORIAL'}</button>}
    </div>
  </aside>;
}
