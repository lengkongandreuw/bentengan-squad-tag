import sharp from 'sharp';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const names = ['arena-row-default', 'arena-lock', 'arena-info-panel',
  ...['purple', 'green', 'red'].flatMap(theme =>
    ['map-title', 'map-frame', 'arena-row-selected', 'start-match'].map(part => `${part}-${theme}`))];
await mkdir('outputs/map-selection-sources', {recursive:true});
for (const name of names) {
  const file = `public/ui-v2/map-selection/${name}.png`;
  const input = await readFile(file);
  const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width !== 1920 || info.height !== 1080) {
    console.log(`${name}: already normalized, skipped`);continue;
  }
  let left=info.width, top=info.height, right=-1, bottom=-1;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    if(data[(y*info.width+x)*4+3]===0) continue;
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  if(right<0) throw new Error(`${name}: empty artwork`);
  await writeFile(`outputs/map-selection-sources/${name}.png`,input);
  const cropped=await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1}).png().toBuffer();
  await writeFile(file,cropped);
  console.log(name,`${info.width}x${info.height} -> ${right-left+1}x${bottom-top+1}`,
    createHash('sha256').update(input).digest('hex'));
}
