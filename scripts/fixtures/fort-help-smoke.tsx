import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FortStatusHud} from '../../modules/ui/fort-status-hud';
import {HowToPlayPanel} from '../../modules/ui/how-to-play-panel';
import {ContextualHint} from '../../modules/ui/contextual-hint';
import {setLanguage} from '../../lib/language';
import type {FortCardState} from '../../modules/ui/fort-status-view';
import '../../modules/ui/pause-hub.css';
import '../../modules/ui/gameplay-screen-shell.css';
import './fort-help-smoke.css';
function Fixture(){
  const [state,setState]=useState<FortCardState>('safe'),[rescue,setRescue]=useState(true),[learned,setLearned]=useState(false);
  return <main><h1>Isolated HUD component QA</h1><nav aria-label="QA card state">{(['safe','guarded','open','attacked','critical','captured'] as const).map(id=><button key={id} onClick={()=>setState(id)}>{id}</button>)}</nav>
    <div className="qa-fort"><FortStatusHud value={{state,lockSeconds:state==='safe'?10:0,capturePercent:state==='critical'?85:0}}/></div>
    <button onClick={()=>setLanguage('id')}>Indonesia</button><button onClick={()=>setLanguage('en')}>English</button>
    <label><input type="checkbox" checked={rescue} onChange={e=>setRescue(e.target.checked)}/>Rescue relevant</label><label><input type="checkbox" checked={learned} onChange={e=>setLearned(e.target.checked)}/>Learned rescue</label>
    <ContextualHint context={{state:'ACTIVE',learned:learned?['rescue']:[],nearObstacle:false,parkourReady:true,rescueNeeded:rescue,ultimateReady:false,nearEnemyFort:false,fortOpen:false,moving:false,tagOpportunity:false}}/>
    <div className="pause-hub"><HowToPlayPanel/></div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
