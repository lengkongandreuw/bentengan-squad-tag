import fs from 'node:fs/promises';
import sharp from 'sharp';
await fs.mkdir('public/ui-v2/controls',{recursive:true});
await sharp('asset-inbox/2026-10-07-multiplayer/multiplayer-button.png')
  .resize({width:1024,withoutEnlargement:true})
  .webp({lossless:true,effort:6}).toFile('public/ui-v2/controls/multiplayer.webp');
console.log('Multiplayer UI: 1024px lossless WebP, sized for <=320px display; gameplay assets unchanged.');
