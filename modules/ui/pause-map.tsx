import {useEffect,useRef,type RefObject} from 'react';
import {CameraSwitcher} from './camera-switcher';
import {useLanguage} from '../../lib/language';

/** Read-only copy of the existing renderer, not a second simulation or map model. */
export function PauseMap({source,options,cameraMode,onSelect}:{source:RefObject<HTMLCanvasElement|null>;options:Array<{id:string;label:string}>;cameraMode:string;onSelect:(id:string)=>void}){
  const preview=useRef<HTMLCanvasElement>(null),initial=useRef(cameraMode),select=useRef(onSelect);
  const language=useLanguage();
  useEffect(()=>{select.current=onSelect;});
  useEffect(()=>{const previous=initial.current;select.current('overview');return()=>select.current(previous);},[]);
  useEffect(()=>{
    let frame=0,last=-Infinity;
    const draw=(now:number)=>{
      const from=source.current,to=preview.current;
      if(from&&to&&from.width&&from.height&&now-last>=160){
        const scale=Math.min(1,1280/from.width,720/from.height),width=Math.max(1,Math.round(from.width*scale)),height=Math.max(1,Math.round(from.height*scale));
        if(to.width!==width||to.height!==height){to.width=width;to.height=height;}
        to.getContext('2d')?.drawImage(from,0,0,width,height);last=now;
      }
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[source]);
  return <><p>{language==='id'?'Lihat arena tanpa menggerakkan karakter. Kamera bermain dipulihkan setelah menutup peta.':'Inspect the arena without moving your character. Your playing camera is restored when you leave this panel.'}</p><canvas ref={preview} className="pause-map-preview" aria-label={language==='id'?'Preview arena saat ini':'Current arena preview'}/><CameraSwitcher options={options} cameraMode={cameraMode} onSelect={onSelect}/></>;
}
