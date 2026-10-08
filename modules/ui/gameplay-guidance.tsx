'use client';
import {useEffect,useRef,useState} from 'react';
import {normalizeHudPreferences,type HudPreferences} from '../../lib/hud-preferences';

const storageKey='benteng-hud-preferences-v1';
export function useHudPreferences() {
  const [preferences,setPreferences]=useState<HudPreferences>({scale:1,contrast:false});
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;try{setPreferences(normalizeHudPreferences(JSON.parse(localStorage.getItem(storageKey)??'null')));}catch{/* Defaults also work with disabled storage. */}});return()=>{active=false;};},[]);
  return [preferences,(value:HudPreferences)=>{const safe=normalizeHudPreferences(value);setPreferences(safe);try{localStorage.setItem(storageKey,JSON.stringify(safe));}catch{/* Session preference remains usable. */}}] as const;
}

export function HudSettings({value,onChange,onOpen}:{value:HudPreferences;onChange:(v:HudPreferences)=>void;onOpen:()=>void}) {
  const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
  return <><button className="icon-button" aria-label="Atur keterbacaan HUD" title="Ukuran teks & kontras HUD" onClick={()=>{onOpen();setOpen(true);}}>Aa</button>
    {open&&<dialog className="hud-settings-dialog" ref={dialog} onCancel={()=>setOpen(false)} onKeyDown={e=>e.stopPropagation()} aria-labelledby="hud-settings-title">
      <header><h2 id="hud-settings-title">Keterbacaan HUD</h2><button autoFocus aria-label="Tutup pengaturan HUD" onClick={()=>setOpen(false)}>×</button></header>
      <label>Skala teks HUD · {Math.round(value.scale*100)}%<input aria-label="Skala teks HUD" type="range" min="100" max="130" step="10" value={Math.round(value.scale*100)} onChange={e=>onChange({...value,scale:Number(e.target.value)/100})}/></label>
      <label><input type="checkbox" checked={value.contrast} onChange={e=>onChange({...value,contrast:e.target.checked})}/> Kontras tinggi</label>
      <p>Mengubah teks dan latar HUD, bukan resolusi gambar atau aturan permainan.</p>
      <button onClick={()=>onChange({scale:1,contrast:false})}>Reset tampilan HUD</button>
    </dialog>}
  </>;
}

const steps=[
  {title:'Benteng',copy:'Tunggu siap di benteng sendiri, lalu keluar. Kembali untuk memperbarui urutan tag.'},
  {title:'Tag',copy:'Dekati lawan bertanda + TAG. ! AWAS berarti ia bisa menangkapmu. Jarak dan rintangan tetap berlaku.'},
  {title:'Rescue',copy:'Saat rekan ditahan, sentuh rekan terluar pada rantai penjara lawan untuk membebaskan tim.'},
  {title:'Rebut',copy:'Dekati benteng lawan dan isi bar perebutan, atau tangkap seluruh lawan. Perhatikan penjaga benteng.'},
];
export function GameplayGuidance({order,tagged,rescued,captured,state}:{order:number;tagged:boolean;rescued:boolean;captured:boolean;state:string}) {
  const [manualStep,setStep]=useState<number|null>(null),[dismissed,setDismissed]=useState(false);
  const done=[order>0,tagged,rescued,captured];
  // Observe real actions without updating React state on every simulation tick.
  const step=manualStep??(captured||rescued?3:tagged?2:order>0?1:0);
  return <aside className={`gameplay-guidance ${dismissed?'collapsed':''}`} aria-label="Panduan praktik">
    {dismissed?<button onClick={()=>setDismissed(false)}>Panduan · Benteng → Tag → Rescue → Rebut</button>:<>
      <header><strong>{done[step]?'✓ ':''}{step+1}/4 · {steps[step].title}</strong><button aria-label="Sembunyikan panduan" onClick={()=>setDismissed(true)}>×</button></header>
      <p>{state==='PRISONER'?'Kamu ditahan. Minta rescue; setelah bebas kamu pulang otomatis.':steps[step].copy}</p>
      <nav aria-label="Langkah panduan">{steps.map((item,i)=><button key={item.title} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}>{done[i]?'✓ ':''}{item.title}</button>)}</nav>
      <small>+ TAG · ! AWAS · ◇ KEBAL (status, bukan jangkauan)</small>
    </>}
  </aside>;
}
