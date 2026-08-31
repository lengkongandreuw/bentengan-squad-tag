import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();

await sharp(path.join(root, 'public', 'brand', 'benteng-tag-logo.png'))
  .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(path.join(root, 'public', 'brand', 'benteng-tag-logo.webp'));

await sharp(path.join(root, 'public', 'characters.png'))
  .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(path.join(root, 'public', 'characters.webp'));

console.log('✓ Asset layar awal: logo dan montage WebP teroptimasi');

