import {useId,useRef,useState} from 'react';
import {useLanguage} from '../../lib/language';
import './how-to-play-panel.css';
export type HelpTab='fort'|'tag'|'rescue'|'capture';
export const HELP_TABS=['fort','tag','rescue','capture'] as const;
export function helpTabForLesson(step:string):HelpTab{
  return step==='tag_enemy'?'tag':['observe_prison','rescue_friend'].includes(step)?'rescue':['capture_benteng','match_complete'].includes(step)?'capture':'fort';
}
const lessons={
  fort:{en:['Reset your advantage','Return to your fort, charge up, then head out again. A later exit gives you tag priority.','WASD / arrows · touch: D-pad'],id:['Perbarui keunggulanmu','Kembali ke benteng, isi tenaga, lalu keluar lagi. Urutan keluar terbaru memberi prioritas tag.','WASD / panah · sentuh: D-pad']},
  tag:{en:['Pick your target','Touch an opponent marked + TAG. If you see ! WATCH OUT, they can tag you instead.','Contact is automatic. Walls and distance still matter.'],id:['Pilih targetmu','Sentuh lawan bertanda + TAG. Kalau muncul ! AWAS, justru dia yang bisa menangkapmu.','Sentuhan otomatis. Tembok dan jarak tetap berlaku.']},
  rescue:{en:['Bring everyone back','Touch the teammate at the far end of the prison chain to free the whole chain.','Touch to rescue · captured? Use R / Request rescue.'],id:['Bebaskan timmu','Sentuh teman di ujung terluar rantai penjara untuk membebaskan seluruh rantai.','Sentuh untuk rescue · tertangkap? Tekan R / Minta rescue.']},
  capture:{en:['Take their fort','Stay inside the enemy fort while it is open. Active defenders can stop your capture.','Contact is automatic. Watch the capture ring fill.'],id:['Rebut benteng lawan','Bertahan di benteng lawan saat terbuka. Penjaga aktif bisa menghentikan perebutan.','Sentuhan otomatis. Perhatikan cincin perebutan terisi.']},
} as const;

/** Static schematic, not simulated gameplay. No timers, videos or expensive render loop. */
function LessonPreview({tab,id}:{tab:HelpTab;id:boolean}){
  const title=id?{fort:'Kembali ke benteng lalu keluar',tag:'Dekati lawan yang bisa ditangkap',rescue:'Sentuh ujung rantai teman',capture:'Isi cincin benteng lawan'}[tab]:{fort:'Return to your fort, then leave',tag:'Approach a taggable opponent',rescue:'Touch the end of your teammate chain',capture:'Fill the enemy fort capture ring'}[tab];
  const fortX=tab==='fort'?100:330;
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Inline vector diagram is one named image, not an HTML img with an external source.
  return <svg className="help-preview" viewBox="0 0 440 155" role="img" aria-label={title}>
    <title>{title}</title>
    <path d="M24 124H416" stroke="#51633e" strokeWidth="2" strokeDasharray="8 8"/>
    {(tab==='fort'||tab==='capture')&&<><circle cx={fortX} cy="79" r="43" fill="#18291d" stroke={tab==='fort'?'#ff7d7d':'#b1ef60'} strokeWidth="4"/>
      <path d={`M${fortX-12} 94V53L${fortX+17} 60L${fortX-12} 69`} fill={tab==='fort'?'#ff7d7d':'#b1ef60'} stroke="#fff" strokeWidth="2"/>
      <text x={fortX} y="145" textAnchor="middle" fill="#f6f5e8" fontSize="12">{tab==='fort'?(id?'BENTENGMU':'YOUR FORT'):(id?'BENTENG LAWAN':'ENEMY FORT')}</text>
    </>}
    {tab==='fort'&&<><path d="M151 59C220 30 240 50 283 72M271 62L284 73L270 78" fill="none" stroke="#d9fa4a" strokeWidth="3" strokeDasharray="6 4"/><circle cx="310" cy="79" r="19" fill="#f87373"/><text x="310" y="84" textAnchor="middle" fill="#07120a" fontSize="13">{id?'KAMU':'YOU'}</text></>}
    {tab==='tag'&&<><circle cx="110" cy="79" r="23" fill="#f87373"/><circle cx="330" cy="79" r="23" fill="#b1ef60"/><path d="M145 79H287M275 69L288 79L275 89" fill="none" stroke="#f6f5e8" strokeWidth="3" strokeDasharray="7 5"/><text x="110" y="121" textAnchor="middle" fill="#fff" fontSize="13">{id?'KAMU':'YOU'}</text><text x="330" y="36" textAnchor="middle" fill="#d9fa4a" fontSize="18" fontWeight="bold">+ TAG</text></>}
    {tab==='rescue'&&<><rect x="300" y="27" width="110" height="97" rx="8" fill="#26362b" stroke="#b1ef60" strokeWidth="3"/><path d="M327 30V120M356 30V120M384 30V120" stroke="#a6b99e" strokeWidth="4"/><path d="M157 79H341" stroke="#f4f1df" strokeWidth="3"/>{[190,250,310].map(x=><circle key={x} cx={x} cy="79" r="17" fill="#f87373" stroke="#fff" strokeWidth="2"/>)}<circle cx="85" cy="79" r="20" fill="#f87373"/><path d="M113 79H159M147 69L160 79L147 89" stroke="#d9fa4a" strokeWidth="3" fill="none"/><text x="190" y="36" textAnchor="middle" fill="#d9fa4a" fontSize="13">{id?'SENTUH UJUNG INI':'TOUCH THIS END'}</text></>}
    {tab==='capture'&&<><circle cx="330" cy="79" r="52" fill="none" stroke="#d9fa4a" strokeWidth="5" strokeDasharray="240 90" transform="rotate(-90 330 79)"/><circle cx="318" cy="99" r="15" fill="#f87373" stroke="#fff" strokeWidth="2"/><path d="M110 79H255M242 69L256 79L242 89" fill="none" stroke="#f6f5e8" strokeWidth="3" strokeDasharray="7 5"/></>}
  </svg>;
}
export function HowToPlayPanel({initialTab='fort'}:{initialTab?:HelpTab}){
  const language=useLanguage(),id=language==='id',uid=useId(),buttons=useRef<Array<HTMLButtonElement|null>>([]);
  const [selected,setSelected]=useState<HelpTab>(initialTab),copy=lessons[selected][id?'id':'en'];
  return <div className="how-to-play-panel">
    <div className="help-tabs" role="tablist" aria-label={id?'Pelajari permainan':'Learn the core loop'}>{HELP_TABS.map((tab,index)=><button key={tab} ref={node=>{buttons.current[index]=node;}} type="button" role="tab" id={`${uid}-${tab}`} aria-selected={selected===tab} aria-controls={`${uid}-panel`} tabIndex={selected===tab?0:-1} onClick={()=>setSelected(tab)} onKeyDown={event=>{
      const next=event.key==='Home'?0:event.key==='End'?3:event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:null;
      if(next!==null){event.preventDefault();event.stopPropagation();setSelected(HELP_TABS[next]);buttons.current[next]?.focus();}
    }}>{id?({fort:'BENTENG',tag:'TAG',rescue:'RESCUE',capture:'REBUT'})[tab]:tab.toUpperCase()}</button>)}</div>
    <section role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-${selected}`} tabIndex={0}>
      <LessonPreview tab={selected} id={id}/><h4>{copy[0]}</h4><p>{copy[1]}</p><div className="help-interaction">{copy[2]}</div>
    </section>
  </div>;
}
