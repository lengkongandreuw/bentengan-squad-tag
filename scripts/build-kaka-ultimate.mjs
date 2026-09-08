import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const input = path.join(root, 'sprite-sources', 'kaka ultimate sprites.png');
const output = path.join(root, 'public', 'characters', 'kaka');
const frameRanges = [
  [0, 190],
  [190, 437],
  [437, 669],
  [669, 909],
  [909, 1225],
  [1260, 1615],
  [1615, 2045],
  [2045, 2406],
  [2406, 2664],
];
const frameCount = frameRanges.length;
const cellWidth = 512;
const cellHeight = 424;
const castDurationMs = 3600;

await mkdir(output, { recursive: true });
const metadata = await sharp(input).metadata();
if (metadata.width !== 2664 || metadata.height !== 724)
  throw new Error(`Ukuran sumber Ultimate Kaka berubah: ${metadata.width}×${metadata.height}.`);

const frames = [];
for (let index = 0; index < frameCount; index++) {
  const [left, right] = frameRanges[index];
  const width = right - left;
  const crop = await sharp(input)
    .extract({ left, top: 0, width, height: metadata.height })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const trimmed = await sharp(crop)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  if (trimmed.info.width > cellWidth || trimmed.info.height > cellHeight)
    throw new Error(`Frame Ultimate Kaka ${index + 1} melebihi sel ${cellWidth}×${cellHeight}.`);
  frames.push({
    input: trimmed.data,
    left: index * cellWidth + Math.round((cellWidth - trimmed.info.width) / 2),
    top: cellHeight - trimmed.info.height,
  });
}

await sharp({
  create: {
    width: cellWidth * frameCount,
    height: cellHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(frames)
  .webp({ quality: 95, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(path.join(output, 'ultimate-runtime.webp'));

await writeFile(
  path.join(output, 'ultimate.json'),
  `${JSON.stringify({
    version: 1,
    source: 'kaka ultimate sprites.png',
    frames: frameCount,
    cell: { width: cellWidth, height: cellHeight },
    castDurationMs,
    playback: 'one-shot',
  }, null, 2)}\n`,
  'utf8',
);

console.log(`Ultimate Kaka: ${frameCount} frame satu-putar · ${castDurationMs} ms.`);
