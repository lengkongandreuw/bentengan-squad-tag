import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'asset-inbox', '2026-08-31-character-select-v1');
const rosterExpansion = path.join(root, 'asset-inbox', '2026-09-01-roster-expansion-v1');
const output = path.join(root, 'public', 'ui-v2');

const portraits = {
  maria: 'characters/hijau maria.png',
  kaka: 'characters/hijau kaka.png',
  ciici: 'characters/hiijau ciici.png',
  buto: 'characters/hiijau buto.png',
  boke: 'characters/hijau boke.png',
  kumis: 'characters/merah kumis.png',
  robot: 'characters/merah robot.png',
  jago: 'characters/merah jago.png',
  lala: 'characters/merah lala.png',
  raja: 'characters/merah raja.png',
};

const expansionPortraits = {
  tui: 'portraits/merah tui.png',
  lui: 'portraits/hijau lui.png',
  bebe: 'portraits/merah bebe.png',
  kodo: 'portraits/hijau kodo.png',
};

const heroes = {
  'green-active': 'ui-states/char tim hijau active.png',
  'red-active': 'ui-states/char tim merah active.png',
  'green-inactive': 'ui-states/char hijau inactive.png',
  'red-inactive': 'ui-states/char merah inactive.png',
};

const controls = {
  back: 'buttons/backbutton.png',
  primary: 'buttons/button primary normal state.png',
  'primary-hover': 'buttons/button primary hover state.png',
};

const ensureSource = async file => {
  const absolute = path.join(source, file);
  await fs.access(absolute);
  return absolute;
};

const encodeContained = async (input, destination, width, height, quality = 78) => {
  await sharp(input)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width, height, fit: 'inside', withoutEnlargement: false })
    .webp({ quality, alphaQuality: 86, effort: 5 })
    .toFile(destination);
};

await fs.mkdir(path.join(output, 'portraits'), { recursive: true });
await fs.mkdir(path.join(output, 'heroes'), { recursive: true });
await fs.mkdir(path.join(output, 'controls'), { recursive: true });

for (const [id, relative] of Object.entries(portraits)) {
  await encodeContained(await ensureSource(relative), path.join(output, 'portraits', `${id}.webp`), 400, 600, 76);
}

for (const [id, relative] of Object.entries(expansionPortraits)) {
  await encodeContained(path.join(rosterExpansion, relative), path.join(output, 'portraits', `${id}.webp`), 400, 600, 76);
}

for (const [id, relative] of Object.entries(heroes)) {
  await encodeContained(await ensureSource(relative), path.join(output, 'heroes', `${id}.webp`), 620, 980, 80);
}

for (const [id, relative] of Object.entries(controls)) {
  await encodeContained(await ensureSource(relative), path.join(output, 'controls', `${id}.webp`), id === 'back' ? 180 : 520, id === 'back' ? 180 : 180, 82);
}

for (const faction of ['red', 'green']) {
  const input = await ensureSource(`buttons/button tim ${faction === 'red' ? 'merah' : 'hijau'}.png`);
  const metadata = await sharp(input).metadata();
  const half = Math.floor((metadata.height ?? 0) / 2);
  for (const [state, top] of [['normal', 0], ['active', half]]) {
    const crop = await sharp(input)
      .extract({ left: 0, top, width: metadata.width ?? 1, height: Math.min(half - 1, (metadata.height ?? half) - top) })
      .png()
      .toBuffer();
    await sharp(crop)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize({ width: 720, height: 250, fit: 'inside' })
      .webp({ quality: 82, alphaQuality: 88, effort: 5 })
      .toFile(path.join(output, 'controls', `team-${faction}-${state}.webp`));
  }
}

const files = [];
const walk = async directory => {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.name !== 'manifest.json') {
      const stats = await fs.stat(absolute);
      files.push({ file: path.relative(output, absolute).replaceAll('\\', '/'), bytes: stats.size });
    }
  }
};
await walk(output);
files.sort((a, b) => a.file.localeCompare(b.file));
await fs.writeFile(path.join(output, 'manifest.json'), `${JSON.stringify({ version: 3, files, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) }, null, 2)}\n`);
console.log(`UI runtime v3: ${files.length} files, ${(files.reduce((sum, file) => sum + file.bytes, 0) / 1024).toFixed(1)} KiB`);
