import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const characters = [
  { id: 'robot', name: 'Robot', role: 'Guardian', rows: 5 },
  { id: 'ciici', name: 'Ciici', role: 'Rescuer', rows: 5 },
  { id: 'kaka', name: 'Kaka', role: 'Runner', rows: 5 },
  { id: 'buto', name: 'Buto', role: 'Guardian', rows: 6 },
  { id: 'jago', name: 'Jago', role: 'Chaser', rows: 6 },
  { id: 'raja', name: 'Raja', role: 'All-rounder', rows: 5 },
  { id: 'lala', name: 'Lala', role: 'Scout', rows: 6 },
  { id: 'maria', name: 'Maria', role: 'Chaser', rows: 6 },
  { id: 'kumis', name: 'Kumis', role: 'Guardian', rows: 6 },
  { id: 'boke', name: 'Boke', role: 'Disruptor', rows: 6 },
  { id: 'tui', name: 'Tui', role: 'Runner', rows: 6 },
  { id: 'lui', name: 'Lui', role: 'Scout', rows: 6 },
];

const root = process.cwd();
const sourceRoot = path.join(root, 'sprite-sources');
const outputRoot = path.join(root, 'public', 'characters');
const sourceColumns = 7;
const atlasCell = { width: 192, height: 224, padding: 4 };
const atlasWidth = atlasCell.width * sourceColumns;
const atlasRows = 6;
const atlasHeight = atlasCell.height * atlasRows;

const frameRect = (width, height, column, row, rows, columns = sourceColumns) => {
  const left = Math.round((column * width) / columns);
  const top = Math.round((row * height) / rows);
  const right = Math.round(((column + 1) * width) / columns);
  const bottom = Math.round(((row + 1) * height) / rows);
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const frames = (width, height, row, columns, rows = atlasRows) => columns.map(column => frameRect(width, height, column, row, rows));

const findRowBounds = (source, width, height, rows) => {
  const density = Array.from({ length: height }, (_, y) => {
    let count = 0;
    for (let x = 0; x < width; x++) if (source[(y * width + x) * 4 + 3] > 48) count++;
    return count;
  });
  const bounds = [0];
  for (let row = 1; row < rows; row++) {
    const expected = row * height / rows;
    const from = Math.max(bounds[bounds.length - 1] + 120, Math.round(expected - 34));
    const to = Math.min(height - 120, Math.round(expected + 34));
    let best = from;
    for (let y = from + 1; y <= to; y++) {
      const score = density[y] + Math.abs(y - expected) * .2;
      const bestScore = density[best] + Math.abs(best - expected) * .2;
      if (score < bestScore) best = y;
    }
    bounds.push(best);
  }
  bounds.push(height);
  return bounds;
};

const removeTinyComponents = (source, width, height) => {
  const visited = new Uint8Array(width * height);
  const components = [];
  for (let start = 0; start < width * height; start++) {
    if (visited[start] || source[start * 4 + 3] <= 18) continue;
    const component = [];
    const stack = [start];
    visited[start] = 1;
    while (stack.length) {
      const index = stack.pop();
      component.push(index);
      const x = index % width, y = Math.floor(index / width);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if ((!ox && !oy) || x + ox < 0 || x + ox >= width || y + oy < 0 || y + oy >= height) continue;
        const next = (y + oy) * width + x + ox;
        if (!visited[next] && source[next * 4 + 3] > 18) { visited[next] = 1; stack.push(next); }
      }
    }
    components.push(component);
  }
  const largestSize = Math.max(0, ...components.map(component => component.length));
  const minimumSize = Math.max(6, Math.floor(largestSize * .0008));
  const keep = new Uint8Array(width * height);
  components.filter(component => component.length >= minimumSize).forEach(component => component.forEach(index => { keep[index] = 1; }));
  const output = Buffer.from(source);
  let sourceOpaque = 0, retainedOpaque = 0;
  for (let index = 0; index < width * height; index++) {
    if (source[index * 4 + 3] > 18) sourceOpaque++;
    if (keep[index]) { retainedOpaque++; continue; }
    output[index * 4] = 0; output[index * 4 + 1] = 0; output[index * 4 + 2] = 0; output[index * 4 + 3] = 0;
  }
  return { data: output, retainedRatio: sourceOpaque ? retainedOpaque / sourceOpaque : 1 };
};

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
  const rowBounds = findRowBounds(data, width, height, character.rows);
  const rawFrames = [];
  for (let row = 0; row < atlasRows; row++) {
    for (let column = 0; column < sourceColumns; column++) {
      const sourceRow = character.rows === 5 ? [0, 1, 1, 2, 3, 4][row] : row;
      const horizontal = frameRect(width, height, column, 0, 1);
      const sourceCell = { x: horizontal.x, y: rowBounds[sourceRow], width: horizontal.width, height: rowBounds[sourceRow + 1] - rowBounds[sourceRow] };
      const extracted = await cleaned
        .clone()
        .extract({ left: sourceCell.x, top: sourceCell.y, width: sourceCell.width, height: sourceCell.height })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const cleanedFrame = removeTinyComponents(extracted.data, extracted.info.width, extracted.info.height);
      const trimmed = await sharp(cleanedFrame.data, { raw: extracted.info })
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
        .png()
        .toBuffer();
      const trimmedMeta = await sharp(trimmed).metadata();
      if (!trimmedMeta.width || !trimmedMeta.height) throw new Error(`Frame kosong ${character.id} r${row} c${column}.`);
      rawFrames.push({ input: trimmed, width: trimmedMeta.width, height: trimmedMeta.height, row, column, retainedRatio: cleanedFrame.retainedRatio });
    }
  }

  const idleHeights = rawFrames.filter(frame => frame.row < 4 && frame.column === 0).map(frame => frame.height).sort((a, b) => a - b);
  const referenceHeight = idleHeights[Math.floor(idleHeights.length / 2)];
  const frameWidth = atlasCell.width - atlasCell.padding * 2;
  const frameHeight = atlasCell.height - atlasCell.padding * 2;
  const baseScale = (frameHeight - 6) / referenceHeight;
  const packedFrames = [];
  for (const frame of rawFrames) {
    const scale = Math.min(baseScale, (frameWidth - 4) / frame.width, (frameHeight - 4) / frame.height);
    const resizeWidth = Math.max(1, Math.round(frame.width * scale));
    const resizeHeight = Math.max(1, Math.round(frame.height * scale));
    const resized = await sharp(frame.input)
      .resize({ width: resizeWidth, height: resizeHeight, fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .sharpen(.35)
      .png({ compressionLevel: 9 })
      .toBuffer();
    const normalized = await sharp({ create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, left: Math.round((frameWidth - resizeWidth) / 2), top: frameHeight - resizeHeight }])
      .png({ compressionLevel: 9 })
      .toBuffer();
    packedFrames.push({ input: normalized, left: frame.column * atlasCell.width + atlasCell.padding, top: frame.row * atlasCell.height + atlasCell.padding });
  }
  await sharp({ create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(packedFrames)
    .webp({ quality: 97, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(path.join(outputDir, 'atlas.webp'));

  const portraitFrame = rawFrames[0]?.input;
  if (!portraitFrame) throw new Error(`Frame portrait ${character.id} tidak tersedia.`);
  await sharp(portraitFrame)
    .resize({ width: 304, height: 304, fit: 'contain', position: 'south', withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 93, alphaQuality: 100, effort: 6 })
    .toFile(path.join(outputDir, 'portrait.webp'));

  const manifest = {
    version: 5,
    id: character.id,
    name: character.name,
    role: character.role,
    source: { width, height, columns: sourceColumns, rows: character.rows, rowBounds },
    atlas: { width: atlasWidth, height: atlasHeight, columns: sourceColumns, rows: atlasRows, gutter: atlasCell.padding },
    quality: { frameCount: rawFrames.length, minimumRetainedRatio: Math.min(...rawFrames.map(frame => frame.retainedRatio)), normalization: 'shared-idle-scale-south-anchor-lanczos3' },
    anchor: { x: 0.5, y: 0.91 },
    directions: {
      south: { idle: frames(atlasWidth, atlasHeight, 0, [0]), run: frames(atlasWidth, atlasHeight, 0, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 0, [6]) },
      west: { idle: frames(atlasWidth, atlasHeight, 1, [0]), run: frames(atlasWidth, atlasHeight, 1, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 1, [6]) },
      east: character.rows === 5 ? { mirror: 'west' } : { idle: frames(atlasWidth, atlasHeight, 2, [0]), run: frames(atlasWidth, atlasHeight, 2, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 2, [6]) },
      north: { idle: frames(atlasWidth, atlasHeight, 3, [0]), run: frames(atlasWidth, atlasHeight, 3, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 3, [6]) },
    },
    actions: {
      tag: frames(atlasWidth, atlasHeight, 4, [0, 1, 2, 3]),
      rescue: frames(atlasWidth, atlasHeight, 4, [3, 4, 5, 6]),
      prisoner: frames(atlasWidth, atlasHeight, 5, [0, 1]),
      victory: frames(atlasWidth, atlasHeight, 5, [2, 3, 4]),
      defeat: frames(atlasWidth, atlasHeight, 5, [5, 6]),
    },
  };
  await writeFile(path.join(outputDir, 'animations.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`✓ ${character.name}: ${width}×${height}`);
}

const montagePortraits = await Promise.all(characters.map(async (character, index) => ({
  input: await sharp(path.join(outputRoot, character.id, 'portrait.webp'))
    .resize({ width: 260, height: 360, fit: 'contain', position: 'south', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer(),
  left: (index % 6) * 320 + 30,
  top: Math.floor(index / 6) * 450 + 45,
})));
await sharp({ create: { width: 1920, height: 900, channels: 4, background: { r: 38, g: 55, b: 71, alpha: 1 } } })
  .composite(montagePortraits)
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public', 'characters.png'));

await writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({ version: 5, atlas: { cell: atlasCell, width: atlasWidth, height: atlasHeight, columns: sourceColumns, rows: atlasRows }, characters: characters.map(({ id, name, role, rows }) => ({ id, name, role, sourceColumns, sourceRows: rows })) }, null, 2)}\n`,
  'utf8',
);

console.log('Sprite atlas, portrait, dan metadata siap digunakan.');
