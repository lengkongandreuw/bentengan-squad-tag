import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourceRoot = path.join(root, 'sprite-sources', 'jago-parts');
const outputPath = path.join(root, 'sprite-sources', 'jago.png');
const cellSize = 256;
const inset = 12;
const contentSize = cellSize - inset * 2;

const partSpecs = {
  idle: ['idle.png', 3],
  runSouth: ['run-south.png', 4],
  runSide: ['run-side.png', 7],
  runNorth: ['run-north.png', 6],
  parkourSouth: ['parkour-south.png', 4],
  parkourSide: ['parkour-side.png', 4],
  parkourNorth: ['parkour-north.png', 4],
  prisoner: ['prisoner.png', 1],
  result: ['result.png', 2],
};

const extractStrip = async (file, frameCount) => {
  const inputPath = path.join(sourceRoot, file);
  const metadata = await sharp(inputPath).metadata();
  if (!metadata.width || !metadata.height || !metadata.hasAlpha)
    throw new Error(`${file}: sumber harus berupa PNG transparan dengan ukuran valid.`);

  const frames = [];
  for (let index = 0; index < frameCount; index++) {
    const left = Math.round(index * metadata.width / frameCount);
    const right = Math.round((index + 1) * metadata.width / frameCount);
    let input;
    try {
      const slice = await sharp(inputPath)
        .extract({ left, top: 0, width: right - left, height: metadata.height })
        .png()
        .toBuffer();
      input = await sharp(slice)
        .ensureAlpha()
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 3 })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } catch (error) {
      throw new Error(`${file}: gagal memotong frame ${index + 1} pada x=${left}..${right}.`, { cause: error });
    }
    const frameMetadata = await sharp(input).metadata();
    if (!frameMetadata.width || !frameMetadata.height)
      throw new Error(`${file}: frame ${index + 1} kosong.`);
    frames.push(input);
  }
  return frames;
};

const extracted = {};
for (const [key, [file, count]] of Object.entries(partSpecs))
  extracted[key] = await extractStrip(file, count);

// Enam baris ini mengikuti kontrak atlas gameplay. Slot yang tidak memiliki
// state khusus diisi ulang dengan pose sumber Jago agar setiap sel tetap valid.
const rows = [
  [extracted.idle[0], ...extracted.runSouth, extracted.runSouth[0], extracted.runSouth[2]],
  [extracted.idle[1], ...extracted.runSide.slice(0, 6)],
  [extracted.idle[2], ...extracted.runNorth],
  [...extracted.parkourSouth, extracted.prisoner[0], extracted.result[0], extracted.result[1]],
  [...extracted.parkourSide, extracted.runSide[6], extracted.runSide[2], extracted.runSide[4]],
  [...extracted.parkourNorth, extracted.runSouth[0], extracted.runSouth[1], extracted.runSouth[2]],
];

if (rows.some(row => row.length !== 7)) throw new Error('Layout sumber Jago harus tepat 7 × 6 frame.');

const composites = [];
for (let row = 0; row < rows.length; row++) {
  for (let column = 0; column < rows[row].length; column++) {
    const normalized = await sharp(rows[row][column])
      .resize({
        width: contentSize,
        height: contentSize,
        fit: 'contain',
        position: 'south',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
    composites.push({ input: normalized, left: column * cellSize + inset, top: row * cellSize + inset });
  }
}

await sharp({
  create: {
    width: cellSize * 7,
    height: cellSize * 6,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log('✓ Sumber Jago 7×6 dibangun dari 9 kelompok animasi terpisah.');
