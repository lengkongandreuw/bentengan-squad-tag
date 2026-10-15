import {useEffect,useRef,useState} from 'react';
import {t} from '../../lib/language';
import {startPlayerTutorial,skipPlayerTutorial} from '../../lib/player-profile/profile-service';
import type {LocalPlayerProfile} from '../../lib/player-profile/types';
import './tutorial-entry.css';

// Entry only; the shared runtime and profile service own lessons/rewards.
export function TutorialEntry({profile,offer,open,onStarted,onClosed,onSkipped}: {
  profile:LocalPlayerProfile;offer:boolean;open:boolean;
  onStarted:()=>void;onClosed:()=>void;onSkipped:()=>void;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [error,setError]=useState(''),[confirmExit,setConfirmExit]=useState(false);
  const visible=offer||open;
  useEffect(()=>{
    if(!visible)return;
    const node=dialog.current,previous=document.activeElement;
    if(node&&!node.open)node.showModal();
    return ()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
  },[visible,offer]);
  if(!visible)return null;
  const start=()=>{
    try{if(!startPlayerTutorial())throw new Error('Profil pemain tidak tersedia.');setError('');onStarted();}
    catch(e){setError(e instanceof Error?e.message:'Tutorial belum tersimpan.');}
  };
  const skip=()=>{
    try{if(!skipPlayerTutorial())throw new Error('Profil pemain tidak tersedia.');setError('');setConfirmExit(false);if(offer)onSkipped();else onClosed();}
    catch(e){setError(e instanceof Error?e.message:'Tutorial belum tersimpan.');}
  };
  return <dialog ref={dialog} className="tutorial-entry" aria-labelledby="tutorial-entry-title"
    onCancel={event=>{event.preventDefault();if(offer)skip();else setConfirmExit(true);}}
    onKeyDown={event=>event.stopPropagation()}>
    <span className="tutorial-entry-eyebrow">BENTENG · {t('LATIHAN')}</span>
    <h2 id="tutorial-entry-title">{t(offer?'Baru pertama main?':'Mulai dari sini.')}</h2>
    <p>{t(offer?'Kenali gerakan, bantu timmu, lalu rebut benteng. Atau langsung main—pilihanmu.':'Gerak. Tag. Rescue. Rebut benteng.')}</p>
    {offer?<div className="tutorial-entry-actions">
      <button type="button" autoFocus className="tutorial-primary" onClick={start}>{t('IKUTI TUTORIAL')}</button>
      <button type="button" onClick={skip}>{t('LEWATI')}</button>
    </div>:<>
      <div className="tutorial-entry-preview">
        <b>{t('PERSIAPAN TUTORIAL')}</b>
        <p>{t('Latihan 2v2 siap. Pelajari gerak, tag, rescue, Ultimate, dan cara merebut benteng.')}</p>
      </div>
      {profile.tutorial?.replay&&<small>{t('Latihan ulang tidak memberi hadiah pertama kali. Progres dan unlock kamu tetap aman.')}</small>}
      {confirmExit?<section aria-label={t('Konfirmasi keluar tutorial')}>
        <p>{t('Keluar tutorial? Kamu bisa membukanya lagi dari menu.')}</p>
        <div className="tutorial-entry-actions"><button type="button" onClick={skip}>{t('KELUAR TUTORIAL')}</button>
          <button type="button" onClick={()=>setConfirmExit(false)}>{t('TETAP DI SINI')}</button></div>
      </section>:<div className="tutorial-entry-actions">
        <button type="button" onClick={onClosed}>{t('KEMBALI KE MENU')}</button>
        <button type="button" onClick={()=>setConfirmExit(true)}>{t('KELUAR TUTORIAL')}</button>
      </div>}
    </>}
    {error&&<p role="alert" className="tutorial-entry-error">{t(error)}</p>}
  </dialog>;
}
