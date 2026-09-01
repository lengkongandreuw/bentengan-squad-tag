import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();

await sharp(path.join(root, 'public', 'characters.png'))
  .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(path.join(root, 'public', 'characters.webp'));

console.log('✓ Montage layar awal WebP teroptimasi (logo dikelola pipeline UI)');
