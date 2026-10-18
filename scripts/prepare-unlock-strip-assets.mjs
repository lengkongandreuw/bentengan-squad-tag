import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const source=process.argv[2];if(!source)throw Error('Pass the supplied character unlocked info.png sheet.');
const target=resolve('public/ui-v2/character-selection');await mkdir(target,{recursive:true});
// Original empty frame and original filled-bar texture, not a replacement drawing.
await sharp(source).extract({left:50,top:208,width:1580,height:302}).webp({lossless:true,effort:6}).toFile(resolve(target,'next-unlock-frame.webp'));
await sharp(source).extract({left:206,top:731,width:960,height:37}).webp({lossless:true,effort:6}).toFile(resolve(target,'next-unlock-fill.webp'));
console.log('Exported supplied unlock frame and fill as lossless WebP.');
