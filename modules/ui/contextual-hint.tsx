import {useEffect,useState,type ReactNode} from 'react';
import {useLanguage} from '../../lib/language';
import {contextualHintCandidates,urgentGameplayHint,type HintContext,type HintId} from './hint-policy';
const copy={
  returning:['Heading home','Your character returns automatically. Get ready to move.','Pulang ke benteng','Karakter kembali otomatis. Bersiap bergerak.'],
  movement:['Make your move','Leave your fort with WASD / arrows.','Mulai bergerak','Keluar benteng dengan WASD / panah.'],
  sprint:['Pick up the pace','While moving, press Space or right click to Sprint.','Saatnya Sprint','Sambil bergerak, tekan Space atau klik kanan.'],
  parkour:['Clear the obstacle','Press Shift to jump across. You can jump on open ground too.','Lewati rintangan','Tekan Shift untuk melompat. Di tanah kosong juga bisa.'],
  tag:['A tag opportunity','Touch a + TAG opponent. Watch your approach.','Peluang tag','Sentuh lawan bertanda + TAG. Perhatikan jalanmu.'],
  rescue:['Bring your squad back','Touch the teammate at the end of the prison chain.','Bebaskan timmu','Sentuh teman di ujung rantai penjara.'],
  ultimate:['Ultimate ready','Press Caps Lock when you are ready to use it.','Ultimate siap','Tekan Caps Lock saat ingin menggunakannya.'],
  capture:['Take their fort','Stay in the enemy fort. Watch for defenders.','Rebut benteng lawan','Bertahan di benteng lawan. Waspadai penjaga.'],
} as const;
export function ContextualHint({context,active=true,priority}:{context:HintContext;active?:boolean;priority?:ReactNode}){
  const language=useLanguage();
  const urgent=priority?urgentGameplayHint(context):null;
  const [touch,setTouch]=useState(false);
  useEffect(()=>{const media=matchMedia('(pointer:coarse),(max-width:1100px)');const update=()=>setTouch(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const candidateKey=active&&(!priority||urgent)?contextualHintCandidates(context).join(','):'';
  const [session,setSession]=useState<{seen:HintId[];current:HintId|null}>({seen:[],current:null});
  useEffect(()=>{let live=true;queueMicrotask(()=>{if(!live)return;const candidates=candidateKey.split(',').filter(Boolean) as HintId[];setSession(previous=>{
    if(previous.current&&candidates.includes(previous.current))return previous;
    const next=candidates.find(id=>!previous.seen.includes(id))??null;
    return {seen:next?[...previous.seen,next]:previous.seen,current:next};
  });});return()=>{live=false;};},[candidateKey]);
  const currentHint=session.current;
  useEffect(()=>{if(!currentHint)return;const timer=setTimeout(()=>setSession(previous=>({...previous,current:null})),4500);return()=>clearTimeout(timer);},[currentHint]);
  const id=urgent??currentHint;
  if(active&&priority&&!urgent&&context.state!=='PRISONER')return priority;
  if(!active||!id||!urgent&&!candidateKey.split(',').includes(id))return null;
  const row=copy[id],title=row[language==='id'?2:0];let instruction:string=row[language==='id'?3:1];
  if(touch){if(id==='movement')instruction=language==='id'?'Keluar benteng dengan D-pad.':'Leave your fort with the D-pad.';if(id==='sprint')instruction=language==='id'?'Gerakkan D-pad, lalu ketuk SPRINT.':'Move with the D-pad, then tap SPRINT.';if(id==='parkour')instruction=language==='id'?'Ketuk PARKOUR untuk melompat.':'Tap PARKOUR to jump across.';if(id==='ultimate')instruction=language==='id'?'Ketuk ULT saat ingin menggunakannya.':'Tap ULT when you are ready to use it.';}
  return <output className="core-context-hint" data-hint-id={id}><strong>{title}</strong><p>{instruction}</p></output>;
}
