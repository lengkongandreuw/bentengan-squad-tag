import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { optimizeAtlas } from './studio-runtime-pack.mjs';

const root=process.cwd();
const doc=JSON.parse(await fs.readFile(path.join(root,'config/sprite-studio.json'),'utf8'));
const groups=new Map();
for(const clips of Object.values(doc.characters))for(const clip of Object.values(clips)) {
  if(!/^sprite-studio\/[a-z]+\/[a-f0-9]{64}\.webp$/.test(clip.asset))throw Error('Unexpected source asset');
  if(!groups.has(clip.asset))groups.set(clip.asset,[]);
  groups.get(clip.asset).push(...clip.frames);
}
const manifest={version:1,assets:{}};
let before=0,after=0;
await fs.mkdir(path.join(root,'public/sprite-runtime'),{recursive:true});
for(const [asset,frames]of groups) {
  const result=await optimizeAtlas(path.join(root,'public',asset),frames);
  if(!result)continue;
  const hash=createHash('sha256').update(result.output).digest('hex');
  const target=`sprite-runtime/${hash}.webp`;
  await fs.writeFile(path.join(root,'public',target),result.output);
  const {output:_output,...metadata}=result;
  manifest.assets[asset]={asset:target,...metadata};
  before+=result.sourceWidth*result.sourceHeight*4;after+=result.width*result.height*4;
}
await fs.writeFile(path.join(root,'config/sprite-runtime.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Studio runtime: ${Object.keys(manifest.assets).length} atlases; RGBA proxy ${(before/1048576).toFixed(1)} → ${(after/1048576).toFixed(1)} MiB. Source pixels/FPS/editor files unchanged.`);
