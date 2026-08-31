import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourcePath = path.join(root, 'vfx-sources', 'sprint-dust.png');
const outputDir = path.join(root, 'public', 'vfx');
const outputPath = path.join(outputDir, 'sprint-dust.webp');
const source = sharp(sourcePath, { failOn: 'none' });
const metadata = await source.metadata();
if (!metadata.width || !metadata.height) throw new Error('VFX sprint tidak memiliki ukuran valid.');

await mkdir(outputDir, { recursive: true });
const sourceCellWidth = Math.floor(metadata.width / 4);
const cells = [];
for (let column = 0; column < 4; column++) {
  const left = column * sourceCellWidth;
  const width = column === 3 ? metadata.width - left : sourceCellWidth;
  const cropped = await sharp(sourcePath, { failOn: 'none' })
    .extract({ left, top: 0, width, height: metadata.height })
    .png()
    .toBuffer();
  const { data: pixels, info } = await sharp(cropped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2], a = pixels[index + 3];
    const maximum = Math.max(r, g, b), minimum = Math.min(r, g, b);
    const saturation = maximum ? (maximum - minimum) / maximum : 0;
    const generatedRedFringe = saturation > .58 && r > 145 && r > g * 1.32 && r > b * 1.35;
    const generatedYellowFringe = saturation > .58 && r > 155 && g > 135 && b < 95;
    if (a <= 20 || generatedRedFringe || generatedYellowFringe) {
      pixels[index] = 0; pixels[index + 1] = 0; pixels[index + 2] = 0; pixels[index + 3] = 0;
    }
  }
  const cleaned = await sharp(pixels, { raw: info }).png().toBuffer();
  const trimmed = await sharp(cleaned)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 12 })
    .modulate({ saturation: .55 })
    .resize({ width: 244, height: 170, fit: 'contain', position: 'south', kernel: sharp.kernel.lanczos3, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const normalized = await sharp({ create: { width: 256, height: 192, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left: 6, top: 16 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  cells.push({ input: normalized, left: column * 256, top: 0 });
}

await sharp({ create: { width: 1024, height: 192, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(cells)
  .webp({ quality: 96, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(outputPath);

console.log('✓ VFX sprint RPG: 4 frame transparan');
