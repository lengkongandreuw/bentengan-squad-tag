// Lossless packaging only: no repainting, cropping, resampling or recoloring.
import {mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const source=path.resolve('asset-inbox/2026-10-23-home-menu');
const output=path.resolve('public/ui-v2/home-menu');
export const homeMenuSources={
  actions:'tombol benteng luar.png',play:'play button.png',backplate:'alas 2.png',
  custom:'customroom.png',online:'online squad tombol.png',campaign:'campaign1.png',
  heading:'selectmode2.png',back:'tombolback.png',logo:'judul benteng baru.png',
};
await mkdir(output,{recursive:true});let originalBytes=0,runtimeBytes=0;
for(const [key,file] of Object.entries(homeMenuSources)){
 const original=path.join(source,file),target=path.join(output,`${key}.webp`);
 const info=await sharp(original).webp({lossless:true,effort:6}).toFile(target);
 originalBytes+=(await stat(original)).size;runtimeBytes+=info.size;
 console.log(`${key}: ${info.width}x${info.height}, ${info.size} bytes`);
}
console.log(JSON.stringify({originalBytes,runtimeBytes,savedPercent:Math.round((1-runtimeBytes/originalBytes)*100)}));
