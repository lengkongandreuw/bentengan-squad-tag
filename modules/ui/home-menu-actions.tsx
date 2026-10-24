import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { t } from '../../lib/language';
import { AudioSettings } from './audio-settings.tsx';
import { GraphicsSettings } from './graphics-settings.tsx';
import { HomeActionArt } from './home-menu-art.tsx';

export function HomeMenuActions({onRules,onCredits,onOpen,onTutorial}: {
  onRules:()=>void;onCredits:()=>void;onOpen:()=>void;onTutorial?:()=>void;
}) {
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const panel=dialog.current,button=trigger.current;if(!open||!panel)return;
    panel.showModal();
    return ()=>{panel.close();button?.focus({preventScroll:true});};
  },[open]);
  return <>
    <nav className="home-actions" aria-label={t('Menu utama')}>
      <button type="button" className="comic-secondary supplied-action" aria-label={t('CARA MAIN')} onClick={onRules}><HomeActionArt action="help" /></button>
      <button ref={trigger} type="button" className="comic-secondary supplied-action" aria-label={t('PENGATURAN')} onClick={()=>{onOpen();setOpen(true);}}><HomeActionArt action="settings" /></button>
      <button type="button" className="comic-secondary supplied-action" aria-label={t('KREDIT')} onClick={onCredits}><HomeActionArt action="credits" /></button>
    </nav>
    {open&&<dialog ref={dialog} className="home-settings-dialog" aria-labelledby="home-settings-title" onCancel={event=>{if(event.target!==event.currentTarget)return;event.preventDefault();setOpen(false);}} onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
      <header><h2 id="home-settings-title">{t('PENGATURAN')}</h2><button type="button" aria-label={t('Tutup')} onClick={()=>setOpen(false)}><X aria-hidden="true" /></button></header>
      <div className="home-settings-options"><AudioSettings triggerLabel={t('AUDIO & BAHASA')} /><GraphicsSettings />
        {onTutorial&&<button type="button" onClick={()=>{setOpen(false);onTutorial();}}>{t('TUTORIAL')}</button>}
      </div>
    </dialog>}
  </>;
}
