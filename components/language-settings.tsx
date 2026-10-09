'use client';
import {useState} from 'react';
import {setLanguage,t,useLanguage,type Language} from '../lib/language';

export function LanguageSettings(){
  const language=useLanguage();
  const [saved,setSaved]=useState(true);
  return <fieldset className="language-settings" onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
    <legend>{language==='en'?'LANGUAGE':'BAHASA'}</legend>
    <select aria-label={language==='en'?'Game language':'Bahasa game'} value={language} onChange={event=>setSaved(setLanguage(event.target.value as Language))}>
      <option value="en" lang="en">English</option>
      <option value="id" lang="id">Indonesia</option>
    </select>
    <small>{language==='en'?'Applies right away. Character, arena and ability names stay original.':'Langsung berlaku. Nama karakter, arena, dan kemampuan tetap asli.'}</small>
    {!saved&&<output role="status">{t('Pilihan aktif untuk sesi ini; penyimpanan browser tidak tersedia.')}</output>}
  </fieldset>;
}
