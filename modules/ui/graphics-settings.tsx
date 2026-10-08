'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_GRAPHICS, GRAPHICS_PRESETS, GRAPHICS_SETTINGS_EVENT, GRAPHICS_STORAGE_KEY, graphicsPreset, saveGraphicsPreset, type GraphicsPreset } from '../../lib/graphics-settings.js';

export function GraphicsSettings({onOpen}: {onOpen?:()=>void}) {
  const [open,setOpen] = useState(false);
  const [preset,setPreset] = useState<GraphicsPreset>(DEFAULT_GRAPHICS);
  const [saved,setSaved] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(()=>{
    const update = (event?:Event) => setPreset((event as CustomEvent<GraphicsPreset>)?.detail ?? graphicsPreset());
    update(); window.addEventListener(GRAPHICS_SETTINGS_EVENT,update);
    return ()=>window.removeEventListener(GRAPHICS_SETTINGS_EVENT,update);
  },[]);
  useEffect(()=>{
    const panel=dialog.current;
    if(open&&panel&&!panel.open)panel.showModal();
    return ()=>{if(panel?.open)panel.close();};
  },[open]);
  const choose=(value:GraphicsPreset)=>{
    setPreset(saveGraphicsPreset(value));
    try { setSaved(localStorage.getItem(GRAPHICS_STORAGE_KEY)===value); } catch { setSaved(false); }
  };
  return <>
    <button type="button" className="graphics-settings-trigger" aria-label="Pengaturan grafis" onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()} onClick={()=>{onOpen?.();setOpen(true);}}>GRAFIS</button>
    {open&&createPortal(<dialog ref={dialog} className="graphics-settings-panel" aria-labelledby={title} onCancel={e=>{e.preventDefault();setOpen(false);}} onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
      <header><h2 id={title}>PENGATURAN GRAFIS</h2><button type="button" aria-label="Tutup pengaturan grafis" onClick={()=>setOpen(false)}>×</button></header>
      <p>Pilih tampilan yang nyaman untuk perangkat Anda. Perubahan langsung berlaku tanpa memulai ulang pertandingan.</p>
      <fieldset><legend>Kualitas in-game</legend>
        {(Object.keys(GRAPHICS_PRESETS) as GraphicsPreset[]).map(value=><label key={value} className={preset===value?'selected':''}>
          <input type="radio" name={title} value={value} checked={preset===value} onChange={()=>choose(value)}/>
          <span><b>{GRAPHICS_PRESETS[value].label}</b><small>{value==='auto'?'Efek lengkap; ketajaman menyesuaikan kemampuan perangkat (default).':value==='high'?'Ketajaman dan efek lengkap.':value==='balanced'?'Ketajaman sedang; partikel dan kilau air lebih sedikit.':'Render lebih rendah; partikel dan kilau air minimal.'}</small></span>
        </label>)}
      </fieldset>
      <p>Menu dan teks UI tetap tajam. Semua karakter, animasi, objek, tanda ultimate, collision, dan aturan permainan tetap sama.</p>
      <output aria-live="polite">{saved?'Pilihan disimpan di browser ini.':'Pilihan aktif untuk sesi ini; penyimpanan browser tidak tersedia.'}</output>
      <footer><button type="button" onClick={()=>choose(DEFAULT_GRAPHICS)}>Kembalikan default</button><button type="button" onClick={()=>setOpen(false)}>Selesai</button></footer>
    </dialog>,document.body)}
  </>;
}
