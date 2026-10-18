import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
// Deterministic export requested by the supplied spec: no redraw or generative changes.
const source=process.argv[2];if(!source)throw Error('Pass the supplied status benteng.png sheet.');
const target=resolve('public/ui-v2/gameplay/fort-status');await mkdir(target,{recursive:true});
const rows=[['safe',20,122],['guarded',842,122],['open',20,363],['attacked',842,363],['critical',20,607],['captured',842,607]];
for(const [name,left,top] of rows){
  const card=sharp(source).extract({left,top,width:810,height:196});
  await card.clone().png({compressionLevel:9}).toFile(resolve(target,`${name}.png`));
  await card.clone().webp({lossless:true,effort:6}).toFile(resolve(target,`${name}.webp`));
}
console.log('Exported six PNG masters and lossless WebP runtime cards.');
