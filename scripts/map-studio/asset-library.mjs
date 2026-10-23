import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,realpath,writeFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {validateAsset,mapAssets,editorText} from '../../lib/map-studio-model.js';

export function uploadedLibraryItem(clip,name='Aset upload'){
  clip=validateAsset(clip);
  if(!/^map-studio\/[a-f0-9]{64}\.webp$/.test(clip.asset))throw new Error('Koleksi upload hanya menerima aset Map Studio.');
  const key=createHash('sha256').update(JSON.stringify(clip)).digest('hex');
  return {key:`upload:${key}`,source:'upload',name:editorText(name,100,'Aset upload'),clip};
}
async function privateDirectory(root){
  const base=await realpath(root),parent=path.join(base,'.preview-admin');
  await mkdir(parent,{recursive:true});
  if(!(await realpath(parent)).startsWith(base+path.sep))throw new Error('Folder koleksi di luar proyek.');
  const folder=path.join(parent,'map-assets');await mkdir(folder,{recursive:true});
  const resolved=await realpath(folder);
  if(!resolved.startsWith(base+path.sep))throw new Error('Folder koleksi di luar proyek.');
  return resolved;
}
export async function registerMapAsset(root,clip,name){
  const item=uploadedLibraryItem(clip,name),folder=await privateDirectory(root);
  // Immutable per-entry files avoid a shared manifest's read/modify/write race.
  await writeFile(path.join(folder,item.key.slice(7)+'.json'),JSON.stringify({version:1,...item}),{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  return item;
}
export async function readMapAssetLibrary(root,document){
  const items=new Map(),warnings=[],publicDir=await realpath(path.join(root,'public'));
  const add=async(clip,name)=>{
    try{
      const item=uploadedLibraryItem(clip,name),file=await realpath(path.join(publicDir,item.clip.asset));
      if(!file.startsWith(publicDir+path.sep))throw new Error('Aset di luar folder publik.');
      if(!items.has(item.key))items.set(item.key,item);
    }catch{warnings.push('Ada aset koleksi yang tidak tersedia atau metadata-nya tidak valid. Map tersimpan tidak diubah.');}
  };
  const folder=path.join(root,'.preview-admin/map-assets');
  const files=await readdir(folder).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
  if(files.length){
    const base=await realpath(root),resolved=await realpath(folder);
    if(!resolved.startsWith(base+path.sep))throw new Error('Folder koleksi di luar proyek.');
    for(const name of files.filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).sort()){
      try{
        const file=path.join(resolved,name),info=await lstat(file);
        if(!info.isFile()||info.size>65536)throw new Error('Metadata koleksi tidak valid.');
        const data=JSON.parse(await readFile(file,'utf8'));
        if(data.version!==1)throw new Error('Versi koleksi tidak didukung.');
        await add(data.clip,data.name);
      }catch{warnings.push('Satu metadata koleksi tidak dapat dibaca; aset lainnya tetap tersedia.');}
    }
  }
  // Recover previously saved uploads from all maps, including archived drafts.
  for(const map of document.maps)for(const clip of mapAssets(map))if(clip.asset.startsWith('map-studio/'))await add(clip,`${map.name} · aset`);
  return {items:[...items.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.key.localeCompare(b.key)),warnings:[...new Set(warnings)]};
}
