import {createHash} from 'node:crypto';
import {mkdir,realpath,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Texture limits bound decoded RGBA cost, not just compressed download bytes.
export const ASSET_PROFILES=Object.freeze({
  sprite:{label:'Sprite karakter',maxFrameSide:512,maxAtlasPixels:4_194_304},
  dust:{label:'Debu boost',maxFrameSide:256,maxAtlasPixels:1_048_576},
  object:{label:'Objek map',maxFrameSide:1536,maxAtlasPixels:4_194_304},
  terrain:{label:'Terrain map',maxFrameSide:3072,maxAtlasPixels:8_388_608},
});
export const BUDGETS={map:{warning:64*1048576,limit:128*1048576},character:{warning:32*1048576,limit:64*1048576}};
export function mapOptimizationProfile(kind,target){
  const profile=kind==='terrain'?ASSET_PROFILES.terrain:ASSET_PROFILES.object;
  if(!target||![target.width,target.height].every(n=>Number.isFinite(n)&&n>0&&n<=5000))return profile;
  // Reserve 2× the placed world size for close cameras/HiDPI; never upscale.
  const side=Math.ceil(Math.max(target.width,target.height)*2)+8;
  return {...profile,maxFrameSide:Math.min(profile.maxFrameSide,Math.max(kind==='terrain'?2048:512,side))};
}
export function textureBudget(assets,kind){
  const unique=new Map(assets.filter(Boolean).map(a=>[a.asset,a]));
  const rgbaBytes=[...unique.values()].reduce((n,a)=>n+a.width*a.height*4,0);
  return {assets:unique.size,rgbaBytes,...BUDGETS[kind],level:rgbaBytes>BUDGETS[kind].limit?'over':rgbaBytes>BUDGETS[kind].warning?'warning':'ok'};
}
export function guardBudget(previous,next,kind){
  const before=textureBudget(previous,kind),after=textureBudget(next,kind);
  // Legacy heavy projects may still be reduced or saved unchanged.
  if(after.rgbaBytes>after.limit&&after.rgbaBytes>before.rgbaBytes)
    throw new Error(`Anggaran gambar ${kind==='map'?'map':'karakter'} menjadi ${(after.rgbaBytes/1048576).toFixed(1)} MiB, melewati batas ${after.limit/1048576} MiB. Kurangi aset/arah unik atau gunakan kembali gambar yang sama. Draft tetap tersedia; versi tersimpan belum berubah.`);
  return after;
}
export async function preserveStudioSources(root,files){
  const base=await realpath(root),parent=path.join(root,'.preview-admin');
  await mkdir(parent,{recursive:true});
  if(!(await realpath(parent)).startsWith(base+path.sep))throw new Error('Folder cadangan di luar proyek.');
  const folder=path.join(parent,'source-imports');
  await mkdir(folder,{recursive:true});
  const resolved=await realpath(folder);
  if(!resolved.startsWith(base+path.sep))throw new Error('Folder cadangan di luar proyek.');
  const sources=[];
  for(const file of files){
    const bytes=Buffer.from(file.data,'base64'),meta=await sharp(bytes,{limitInputPixels:32_000_000}).metadata();
    if(!['png','gif','webp'].includes(meta.format))throw new Error('Format cadangan tidak didukung.');
    const hash=createHash('sha256').update(bytes).digest('hex'),asset=`${hash}.${meta.format}`;
    await writeFile(path.join(resolved,asset),bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
    sources.push({name:String(file.name??'gambar').slice(0,200),path:`.preview-admin/source-imports/${asset}`});
  }
  return sources;
}
