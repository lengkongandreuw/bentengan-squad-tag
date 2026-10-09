'use client';
import { t } from '../../lib/language';

import { useEffect, useRef, useState } from 'react';
import { publicAsset } from '../../lib/characters.ts';

const groups = [
  { title: 'Game Design', names: ['Andreuw Lengkong', 'Andria Wahyudi'] },
  { title: 'Programmer', names: ['Andreuw Lengkong', 'Andria Wahyudi', 'David Tjia', 'Timothy Tiwow', 'Hani Ladjamba'] },
  { title: 'Art', names: ['Juliando Kalangie', 'Ariellya Sayow', 'Karen Wendry', 'Andreuw Lengkong'] },
];

export function DeveloperCredits({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const viewport=useRef<HTMLDivElement>(null);
  const [paused,setPaused]=useState(false);
  const [reduced,setReduced]=useState(false);
  const [ready,setReady]=useState(false);
  const [ended,setEnded]=useState(false);
  const [replay,setReplay]=useState(0);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const query=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{setReduced(query.matches);if(query.matches)setPaused(true);};
    update();query.addEventListener('change',update);
    return ()=>{query.removeEventListener('change',update);previous?.focus();};
  },[]);
  useEffect(()=>{
    if(paused||!ready||ended)return;
    let frame=0,last=0,position=viewport.current?.scrollTop ?? 0;
    const tick=(time:number)=>{
      const element=viewport.current;
      if(!element)return;
      if(last&&!document.hidden)position+=Math.min(time-last,50)*.018;
      last=time;
      element.scrollTop=position;
      if(position>=element.scrollHeight-element.clientHeight){setEnded(true);return;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[paused,ready,ended,replay]);
  const restart=()=>{if(viewport.current)viewport.current.scrollTop=0;setEnded(false);setPaused(reduced);setReplay(value=>value+1);};
  return <dialog ref={dialog} className="developer-credits" aria-labelledby="credits-title" onCancel={onClose}>
    <div className="credits-stage">
      <img className="credits-background" src={publicAsset('ui-v2/credits/background.webp?v=1')} alt="" onLoad={()=>setReady(true)} onError={()=>setReady(true)} />
      <header className="credits-toolbar">
        <button autoFocus onClick={onClose}>{t("← BACK")}</button>
        <h2 id="credits-title">{t("ABOUT DEVELOPER")}</h2>
        <button onClick={()=>setPaused(value=>!value)} disabled={ended} aria-pressed={paused}>{t(paused?'▶ LANJUT':'Ⅱ JEDA')}</button>
        <button onClick={restart}>{t("↺ ULANGI")}</button>
      </header>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- ponytail: scrollable credits region needs focus + pause-on-interact */}
      <section ref={viewport} className={`credits-window ${reduced?'reduced-motion':''}`} tabIndex={0} aria-label={t("Daftar kredit pengembang")} onWheel={()=>setPaused(true)} onTouchStart={()=>setPaused(true)} onKeyDown={event=>{
        if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key))setPaused(true);
      }}>
        <div className="credits-spacer" aria-hidden="true" />
        <div className="credits-copy">
          <p className="credits-product">{t("Benteng Squad Tag™ is a product of BigDade® Interactive (PT Kawanua Virtual Teknologi)")}</p>
          {t(groups.map(group=><section key={group.title}><h3>{t(group.title)}</h3>{t(group.names.map(name=><p key={name}>{t(name)}</p>))}</section>))}
          <h3 className="credits-ending">{t("Benteng Squad Tag")}</h3>
        </div>
        <div className="credits-spacer credits-tail" aria-hidden="true" />
      </section>
    </div>
  </dialog>;
}
