import {MULTIPLAYER_PROTOCOL_VERSION} from './protocol.ts';
export type ContentIdentity={protocolVersion:number;buildVersion:string;arenaId:string;arenaRevision:string};
declare const __BENTENG_CONTENT__: {buildVersion:string;mapAssetsRevision:string}|undefined;
export const testContent:ContentIdentity={protocolVersion:1,buildVersion:'injected-test-build',arenaId:'test-arena',arenaRevision:'injected-test-map'};
export function contentMismatch(a:ContentIdentity,b:ContentIdentity):string|null {
  if(a.protocolVersion!==b.protocolVersion)return 'Versi protokol berbeda. Perbarui game kedua pemain.';
  if(a.buildVersion!==b.buildVersion)return 'Versi build game berbeda. Reload kedua perangkat dari versi yang sama.';
  if(a.arenaId!==b.arenaId)return 'Arena berbeda. Pilih arena yang sama dengan host sebelum join.';
  if(a.arenaRevision!==b.arenaRevision)return 'Revisi/isi map berbeda meskipun namanya sama. Perbarui map lalu reload.';
  return null;
}
export async function createContentIdentity(arenaId:string,definition:unknown):Promise<ContentIdentity> {
  if(typeof __BENTENG_CONTENT__==='undefined')throw Error('Manifest kompatibilitas belum tersedia. Jalankan game melalui konfigurasi Vite GitHub Pages.');
  const bytes=new TextEncoder().encode(JSON.stringify({definition,assets:__BENTENG_CONTENT__.mapAssetsRevision}));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return {protocolVersion:MULTIPLAYER_PROTOCOL_VERSION,buildVersion:__BENTENG_CONTENT__.buildVersion,arenaId,
    arenaRevision:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')};
}
