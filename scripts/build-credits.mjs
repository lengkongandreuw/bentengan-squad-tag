import fs from 'node:fs/promises';
import sharp from 'sharp';
await fs.mkdir('public/ui-v2/credits',{recursive:true});
await sharp('asset-inbox/2026-09-20-credits/background.png')
  .resize({width:1672,withoutEnlargement:true}).webp({quality:88,effort:5})
  .toFile('public/ui-v2/credits/background.webp');
