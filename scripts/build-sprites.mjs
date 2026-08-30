import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const characters = [
  { id: 'robot', name: 'Robot', role: 'Guardian' },
  { id: 'ciici', name: 'Ciici', role: 'Rescuer' },
  { id: 'kaka', name: 'Kaka', role: 'Runner' },
  { id: 'buto', name: 'Buto', role: 'Guardian' },
  { id: 'jago', name: 'Jago', role: 'Chaser' },
  { id: 'raja', name: 'Raja', role: 'All-rounder' },
];

const root = process.cwd();
const sourceRoot = path.join(root, 'sprite-sources');
const outputRoot = path.join(root, 'public', 'characters');

const frameRect = (width, height, column, row) => {
  const left = Math.round((column * width) / 8);
  const top = Math.round((row * height) / 5);
  const right = Math.round(((column + 1) * width) / 8);
  const bottom = Math.round(((row + 1) * height) / 5);
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const frames = (width, height, row, columns) => columns.map(column => frameRect(width, height, column, row));

for (const character of characters) {
  const inputPath = path.join(sourceRoot, `${character.id}.png`);
  const outputDir = path.join(outputRoot, character.id);
  await mkdir(outputDir, { recursive: true });

  const source = await readFile(inputPath);
  const image = sharp(source, { failOn: 'none' });
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) throw new Error(`Ukuran sprite ${character.id} tidak dapat dibaca.`);

  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] <= 12) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    }
  }

  const cleaned = sharp(data, { raw: info });
  await cleaned.clone().webp({ quality: 91, alphaQuality: 100, effort: 6, smartSubsample: true }).toFile(path.join(outputDir, 'atlas.webp'));

  const portraitCell = frameRect(width, height, 0, 0);
  await cleaned
    .clone()
    .extract({ left: portraitCell.x, top: portraitCell.y, width: portraitCell.width, height: portraitCell.height })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: 320, height: 320, fit: 'contain', position: 'south', withoutEnlargement: false })
    .webp({ quality: 93, alphaQuality: 100, effort: 6 })
    .toFile(path.join(outputDir, 'portrait.webp'));

  const manifest = {
    version: 1,
    id: character.id,
    name: character.name,
    role: character.role,
    source: { width, height, columns: 8, rows: 5 },
    anchor: { x: 0.5, y: 0.91 },
    directions: {
      south: { idle: frames(width, height, 0, [0]), run: frames(width, height, 0, [1, 2, 3, 4, 5, 6]), boost: frames(width, height, 0, [7]) },
      west: { idle: frames(width, height, 1, [0]), run: frames(width, height, 1, [1, 2, 3, 4, 5, 6]), boost: frames(width, height, 1, [7]) },
      east: { mirror: 'west' },
      north: { idle: frames(width, height, 2, [0]), run: frames(width, height, 2, [1, 2, 3, 4, 5, 6]), boost: frames(width, height, 2, [7]) },
    },
    actions: {
      tag: frames(width, height, 3, [0, 1, 2, 3]),
      rescue: frames(width, height, 3, [4, 5, 6, 7]),
      prisoner: frames(width, height, 4, [0, 1]),
      victory: frames(width, height, 4, [2, 3, 4]),
      defeat: frames(width, height, 4, [5, 6, 7]),
    },
  };
  await writeFile(path.join(outputDir, 'animations.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`✓ ${character.name}: ${width}×${height}`);
}

await writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({ version: 1, characters: characters.map(({ id, name, role }) => ({ id, name, role })) }, null, 2)}\n`,
  'utf8',
);

console.log('Sprite atlas, portrait, dan metadata siap digunakan.');
