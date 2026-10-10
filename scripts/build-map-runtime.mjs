import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateDocument,mapAssets} from '../lib/map-studio-model.js';
import {optimizeAtlas} from './studio-runtime-pack.mjs';

export async function compileMapRuntime(root) {
  const doc=validateDocument(JSON.parse(await fs.readFile(path.join(root,'config/map-studio.json'),'utf8')));
  const groups=new Map();
  // Include drafts too; their runtime is ready on activation. Original editor
  // assets remain untouched, and unrecognized/new frames fall back safely.
  for(const m of doc.maps)for(const a of mapAssets(m)) {
    if(!a.asset.startsWith('map-studio/'))continue;
    if(!groups.has(a.asset))groups.set(a.asset,[]);
    groups.get(a.asset).push(...a.frames);
  }
  const manifest={version:1,assets:{}},measurements=[];
  await fs.mkdir(path.join(root,'public/map-runtime'),{recursive:true});
  for(const [asset,frames]of groups) {
    const source=await fs.readFile(path.join(root,'public',asset));
    const result=await optimizeAtlas(source,frames);
    if(!result)continue;
    // A <=3% byte overhead is acceptable only for >=10% decoded-memory savings.
    // This trades a few KB for less GPU/decode pressure, not image quality.
    const meaningful=result.width*result.height<=result.sourceWidth*result.sourceHeight*.9;
    if(result.output.length>source.length*(meaningful?1.03:1))continue;
    const hash=createHash('sha256').update(result.output).digest('hex');
    const target=`map-runtime/${hash}.webp`;
    await fs.writeFile(path.join(root,'public',target),result.output);
    const {output,...metadata}=result;
    manifest.assets[asset]={asset:target,...metadata};
    measurements.push({asset,beforeBytes:source.length,afterBytes:output.length,
      beforeRGBA:result.sourceWidth*result.sourceHeight*4,afterRGBA:result.width*result.height*4});
  }
  await fs.writeFile(path.join(root,'config/map-runtime.json'),JSON.stringify(manifest,null,2)+'\n');
  return {manifest,measurements};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=await compileMapRuntime(process.cwd());
  const sum=k=>result.measurements.reduce((n,m)=>n+m[k],0)/1048576;
  console.log(`Map runtime: ${result.measurements.length} atlases; RGBA proxy ${sum('beforeRGBA').toFixed(2)} → ${sum('afterRGBA').toFixed(2)} MiB; downloads ${sum('beforeBytes').toFixed(2)} → ${sum('afterBytes').toFixed(2)} MiB. Pixels/FPS/editor sources unchanged.`);
}
