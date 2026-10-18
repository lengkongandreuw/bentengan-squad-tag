import {publicAsset} from '../../lib/characters';
import {useLanguage} from '../../lib/language';
import type {FortStatusView} from './fort-status-view';
import './fort-status-hud.css';
export const FORT_CARD_LABELS={safe:['FORT SAFE','BENTENG AMAN'],guarded:['FORT GUARDED','BENTENG DIJAGA'],open:['FORT OPEN','BENTENG TERBUKA'],attacked:['FORT UNDER ATTACK','BENTENG DISERANG'],critical:['FORT CRITICAL','BENTENG KRITIS'],captured:['FORT CAPTURED','BENTENG DIREBUT']} as const;
export function FortStatusHud({value,baseGrace=0}:{value:FortStatusView;baseGrace?:number}){
  const language=useLanguage(),label=FORT_CARD_LABELS[value.state][language==='id'?1:0];
  return <section className={`fort-status-hud fort-${value.state}`} aria-label={language==='id'?'Status bentengmu':'Your fort status'}>
    <div key={value.state} className="fort-card" data-fort-state={value.state}>
      <img src={publicAsset(`ui-v2/gameplay/fort-status/${value.state}.webp`)} width={810} height={196} alt="" draggable={false}/>
      <strong className="fort-card-label" aria-hidden="true">{label}</strong>
    </div>
    <output className="fort-announcement" aria-live="polite" aria-atomic="true">{label}</output>
    {(value.lockSeconds>0||baseGrace>0||value.capturePercent>0)&&<small className="fort-card-detail">
      {value.lockSeconds>0?(language==='id'?`Terkunci ${value.lockSeconds}s`:`Locked ${value.lockSeconds}s`):value.capturePercent>0?`${language==='id'?'Direbut':'Capture'} ${value.capturePercent}%`:''}
      {baseGrace>0?` · ${language==='id'?'Keluar':'Leave base'} ${baseGrace}s`:''}
    </small>}
  </section>;
}
