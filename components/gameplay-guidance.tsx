'use client';
import { t } from '../lib/language';

import {useEffect,useRef,useState} from 'react';
import {normalizeHudPreferences,type HudPreferences} from '../lib/hud-preferences';

const storageKey='benteng-hud-preferences-v1';
export function useHudPreferences() {
  const [preferences,setPreferences]=useState<HudPreferences>({scale:1,contrast:false});
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;try{setPreferences(normalizeHudPreferences(JSON.parse(localStorage.getItem(storageKey)??'null')));}catch{/* Defaults also work with disabled storage. */}});return()=>{active=false;};},[]);
  return [preferences,(value:HudPreferences)=>{const safe=normalizeHudPreferences(value);setPreferences(safe);try{localStorage.setItem(storageKey,JSON.stringify(safe));}catch{/* Session preference remains usable. */}}] as const;
}

export function HudSettings({value,onChange,onOpen}:{value:HudPreferences;onChange:(v:HudPreferences)=>void;onOpen:()=>void}) {
  const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
  return <><button className="icon-button" aria-label={t("Atur keterbacaan HUD")} title={t("Ukuran teks & kontras HUD")} onClick={()=>{onOpen();setOpen(true);}}>{t("Aa")}</button>
    {t(open&&<dialog className="hud-settings-dialog" ref={dialog} onCancel={()=>setOpen(false)} onKeyDown={e=>e.stopPropagation()} aria-labelledby="hud-settings-title">
      <header><h2 id="hud-settings-title">{t("Teks & kontras")}</h2><button autoFocus aria-label={t("Tutup pengaturan HUD")} onClick={()=>setOpen(false)}>{t("×")}</button></header>
      <label>{t("Skala teks HUD · ")}{t(Math.round(value.scale*100))}{t("%")}<input aria-label={t("Skala teks HUD")} type="range" min="100" max="130" step="10" value={Math.round(value.scale*100)} onChange={e=>onChange({...value,scale:Number(e.target.value)/100})}/></label>
      <label><input type="checkbox" checked={value.contrast} onChange={e=>onChange({...value,contrast:e.target.checked})}/>{t(" Kontras tinggi")}</label>
      <p>{t("Mengubah teks dan latar HUD, bukan resolusi gambar atau aturan permainan.")}</p>
      <button onClick={()=>onChange({scale:1,contrast:false})}>{t("Reset tampilan HUD")}</button>
    </dialog>)}
  </>;
}

const steps=[
  {title:'Benteng',copy:'Tunggu siap di bentengmu, lalu keluar. Balik ke benteng untuk memperbarui urutan tag.'},
  {title:'Tag',copy:'Dekati lawan bertanda + TAG. ! AWAS berarti ia bisa menangkapmu. Jarak dan rintangan tetap berlaku.'},
  {title:'Rescue',copy:'Teman ditahan? Sentuh rekan paling ujung di rantai penjara untuk membebaskan semuanya.'},
  {title:'Rebut',copy:'Isi bar perebutan di benteng lawan, atau tangkap semua lawan. Awas penjaga benteng!'},
];
export function GameplayGuidance({order,tagged,rescued,captured,state}:{order:number;tagged:boolean;rescued:boolean;captured:boolean;state:string}) {
  const [manualStep,setStep]=useState<number|null>(null),[dismissed,setDismissed]=useState(false);
  const done=[order>0,tagged,rescued,captured];
  // Observe real actions without updating React state on every simulation tick.
  const step=manualStep??(captured||rescued?3:tagged?2:order>0?1:0);
  return <aside className={`gameplay-guidance ${dismissed?'collapsed':''}`} aria-label={t("Panduan praktik")}>
    {t(dismissed?<button onClick={()=>setDismissed(false)}>{t("Panduan · Benteng → Tag → Rescue → Rebut")}</button>:<>
      <header><strong>{t(done[step]?'✓ ':'')}{t(step+1)}{t("/4 · ")}{t(steps[step].title)}</strong><button aria-label={t("Sembunyikan panduan")} onClick={()=>setDismissed(true)}>{t("×")}</button></header>
      <p>{t(state==='PRISONER'?'Kena tag! Minta rescue. Setelah bebas, kamu pulang otomatis.':steps[step].copy)}</p>
      <nav aria-label={t("Langkah panduan")}>{t(steps.map((item,i)=><button key={item.title} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}>{t(done[i]?'✓ ':'')}{t(item.title)}</button>))}</nav>
      <small>{t("+ TAG · ! AWAS · ◇ KEBAL (status, bukan jangkauan)")}</small>
    </>)}
  </aside>;
}
