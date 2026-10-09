'use client';
import { t } from '../../lib/language';

import {useState,type ReactNode} from 'react';
import config from '../../config/loading-media.json' with { type: 'json' };
import {resolveLoadingMedia,validateLoadingMedia} from '../../lib/loading-media-model.js';
import {usesBuiltinProgress} from '../../lib/loading-media-model.js';
import {publicAsset} from '../../lib/characters';
const document=validateLoadingMedia(config);
export const loadingMediaFor=(slot:string,arenaId?:string)=>resolveLoadingMedia(document,slot,arenaId);
export const loadingUsesBuiltinProgress=(slot:string)=>usesBuiltinProgress(loadingMediaFor(slot));
export function LoadingMedia({slot,arenaId,fallback}: {slot:string;arenaId?:string;fallback?:ReactNode}) {
  const media=loadingMediaFor(slot,arenaId);
  const [failed,setFailed]=useState<string|null>(null);
  if(!media||failed===media.asset)return <>{t(fallback)}</>;
  const style={objectFit:media.fit};
  return <div className="custom-loading-media" aria-hidden="true">
    {t(media.kind==='video'?<video key={media.asset} src={publicAsset(media.asset)} style={style} autoPlay loop muted playsInline preload="metadata" onError={()=>setFailed(media.asset)}/>:<img key={media.asset} src={publicAsset(media.asset)} style={style} alt="" onError={()=>setFailed(media.asset)}/>)}
  </div>;
}
export function LoadingPanel({slot,label}:{slot:string;label:string}) {
  return <div className="loading-panel-overlay" role="status" aria-busy="true"><LoadingMedia slot={slot}/><p>{t(label)}</p></div>;
}
