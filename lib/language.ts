'use client';
import {useSyncExternalStore} from 'react';
import {playerTranslations} from './player-translations';

export type Language = 'en' | 'id';
export const LANGUAGE_STORAGE_KEY = 'benteng.language.v1';
const EVENT = 'benteng-language-change';
let language:Language = 'en';
let initialized = false;
export function getLanguage():Language {
  if(!initialized && typeof window !== 'undefined') {
    initialized = true;
    try {language = localStorage.getItem(LANGUAGE_STORAGE_KEY)==='id'?'id':'en';} catch { /* Session preference still works. */ }
    if(typeof document!=='undefined' && document.documentElement)document.documentElement.lang = language;
  }
  return language;
}
export function setLanguage(value:Language):boolean {
  if(value!=='en' && value!=='id')return false;
  initialized = true;
  language = value;
  let saved = true;
  try {localStorage.setItem(LANGUAGE_STORAGE_KEY,value);} catch {saved = false;}
  document.documentElement.lang = value;
  window.dispatchEvent(new Event(EVENT));
  return saved;
}
function subscribe(callback:()=>void) {
  const storage = (event:StorageEvent)=>{if(event.key===LANGUAGE_STORAGE_KEY || event.key===null){initialized=false;getLanguage();callback();}};
  window.addEventListener(EVENT,callback);
  window.addEventListener('storage',storage);
  return ()=>{window.removeEventListener(EVENT,callback);window.removeEventListener('storage',storage);};
}
export function useLanguage(){return useSyncExternalStore(subscribe,getLanguage,()=> 'en' as Language);}

const escape = (text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates = Object.entries(playerTranslations).filter(([key])=>key.includes('${')).sort(([a],[b])=>b.replace(/\$\{\d+\}/g,'').length-a.replace(/\$\{\d+\}/g,'').length).map(([key,value])=> {
  const indices:number[]=[];
  const chunks=key.split(/(\$\{\d+\})/g);
  const pattern=chunks.map(chunk=>{const match=/^\$\{(\d+)\}$/.exec(chunk);if(match){indices.push(Number(match[1]));return '(.*?)';}return escape(chunk);}).join('');
  return {regex:new RegExp('^'+pattern+'$','s'),indices,value};
});
const cache=new Map<string,string>();
function translated(value:string):string {
  const exact=playerTranslations[value];
  if(exact!==undefined)return exact;
  const trimmed=value.trim();
  if(trimmed!==value && playerTranslations[trimmed]!==undefined)return value.replace(trimmed,playerTranslations[trimmed]);
  for(const template of templates){const match=template.regex.exec(value);if(match){const parameters:Record<number,string>={};template.indices.forEach((index,i)=>parameters[index]=match[i+1]);return template.value.replace(/\$\{(\d+)\}/g,(_,index)=>parameters[Number(index)]??'');}}
  return value;
}
// Translate only presented text. Unknown/user-authored strings and non-string nodes
// pass through untouched; canonical state, IDs, numbers and asset URLs never change.
export function t<T>(value:T):T {
  if(typeof value!=='string' || getLanguage()==='id') return value;
  if(!/[A-Za-z]/.test(value))return value;
  const hit=cache.get(value);if(hit!==undefined)return hit as T;
  const result=translated(value);if(cache.size>=512)cache.clear();cache.set(value,result);
  return result as T;
}
