import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const characters = [
  { id: 'robot', name: 'Robot', role: 'Guardian', rows: 5 },
  { id: 'ciici', name: 'Ciici', role: 'Rescuer', rows: 5 },
  { id: 'kaka', name: 'Kaka', role: 'Runner', rows: 5 },
  { id: 'buto', name: 'Buto', role: 'Guardian', rows: 6 },
  { id: 'jago', name: 'Jago', role: 'Chaser', rows: 6 },
  { id: 'raja', name: 'Raja', role: 'All-rounder', rows: 6, source: 'raja new sprites.png' },
  { id: 'lala', name: 'Lala', role: 'Scout', rows: 6 },
  { id: 'maria', name: 'Maria', role: 'Chaser', rows: 6 },
  { id: 'kumis', name: 'Kumis', role: 'Guardian', rows: 6 },
  { id: 'boke', name: 'Boke', role: 'Disruptor', rows: 6 },
  { id: 'tui', name: 'Tui', role: 'Runner', rows: 6 },
  { id: 'lui', name: 'Lui', role: 'Scout', rows: 6 },
  { id: 'bebe', name: 'Bebe', role: 'Rescuer', rows: 6 },
  { id: 'kodo', name: 'Kodo', role: 'Guardian', rows: 6 },
];

const root = process.cwd();
const sourceRoot = path.join(root, 'sprite-sources');
const outputRoot = path.join(root, 'public', 'characters');
const sourceColumns = 7;
const atlasRows = 6;
const pipelineVersion = 9;
const runtimeScale = .5;
const minimumAtlasCellHeight = 256;
const atlasPadding = 8;
const segmentationAlpha = 18;

const frameRect = (width, height, column, row, rows, columns = sourceColumns) => {
  const left = Math.round((column * width) / columns);
  const top = Math.round((row * height) / rows);
  const right = Math.round(((column + 1) * width) / columns);
  const bottom = Math.round(((row + 1) * height) / rows);
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const frames = (width, height, row, columns, rows = atlasRows) => columns.map(column => frameRect(width, height, column, row, rows));

const componentFrames = (source, width, height, rows, columns, removeGeneratedBars = false) => {
  const rowDensity = Array.from({ length: height }, (_, y) => {
    let count = 0;
    for (let x = 0; x < width; x++) if (source[(y * width + x) * 4 + 3] > segmentationAlpha) count++;
    return count;
  });
  const rowBounds = [0];
  for (let row = 1; row < rows; row++) {
    const expected = row * height / rows;
    const radius = Math.round(height / rows * .28);
    const from = Math.max(rowBounds[row - 1] + Math.round(height / rows * .55), Math.round(expected - radius));
    const to = Math.min(height - Math.round((rows - row) * height / rows * .55), Math.round(expected + radius));
    let best = from;
    for (let y = from + 1; y <= to; y++) {
      const score = (rowDensity[y - 1] + rowDensity[y] + rowDensity[y + 1]) * 100 + Math.abs(y - expected);
      const bestScore = (rowDensity[best - 1] + rowDensity[best] + rowDensity[best + 1]) * 100 + Math.abs(best - expected);
      if (score < bestScore) best = y;
    }
    rowBounds.push(best);
  }
  rowBounds.push(height);
  const rowForY = new Uint8Array(height);
  for (let row = 0; row < rows; row++) rowForY.fill(row, rowBounds[row], rowBounds[row + 1]);

  const visited = new Uint8Array(width * height);
  const components = [];
  for (let start = 0; start < width * height; start++) {
    if (visited[start] || source[start * 4 + 3] <= segmentationAlpha) continue;
    const indices = [];
    const stack = [start];
    let minX = width, minY = height, maxX = 0, maxY = 0, sumX = 0, sumY = 0;
    visited[start] = 1;
    while (stack.length) {
      const index = stack.pop();
      indices.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      sumX += x; sumY += y;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if ((!ox && !oy) || x + ox < 0 || x + ox >= width || y + oy < 0 || y + oy >= height || rowForY[y + oy] !== rowForY[y]) continue;
        const next = (y + oy) * width + x + ox;
        if (!visited[next] && source[next * 4 + 3] > segmentationAlpha) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }
    components.push({ indices, size: indices.length, minX, minY, maxX, maxY, cx: sumX / indices.length, cy: sumY / indices.length });
  }

  const rowComponents = Array.from({ length: rows }, () => []);
  for (const component of components) {
    const row = rowForY[Math.max(0, Math.min(height - 1, Math.round(component.cy)))];
    rowComponents[row].push(component);
  }

  const groups = rowComponents.map((componentsInRow, row) => {
    const seeds = [...componentsInRow].sort((a, b) => b.size - a.size).slice(0, columns).sort((a, b) => a.cx - b.cx);
    if (seeds.length !== columns) throw new Error(`Baris sumber ${row} hanya memiliki ${seeds.length} pose utama (${componentsInRow.map(component => `${Math.round(component.cx)},${Math.round(component.cy)}:${component.size}`).join(' | ')}).`);
    const seedSet = new Set(seeds);
    const rowGroups = seeds.map(seed => [seed]);
    for (const component of componentsInRow) {
      if (seedSet.has(component)) continue;
      let nearest = 0;
      for (let column = 1; column < columns; column++) {
        if (Math.abs(component.cx - seeds[column].cx) < Math.abs(component.cx - seeds[nearest].cx)) nearest = column;
      }
      rowGroups[nearest].push(component);
    }
    return rowGroups;
  });

  return { rowBounds, frames: groups.map((rowGroups, row) => rowGroups.map((group, column) => {
    const largest = Math.max(0, ...group.map(component => component.size));
    const minimumSize = Math.max(24, Math.floor(largest * .01));
    const primary = group[0];
    const associationRadius = Math.max(18, Math.max(primary.maxX - primary.minX, primary.maxY - primary.minY) * .16);
    const distanceFromPrimary = component => Math.hypot(
      Math.max(0, primary.minX - component.maxX, component.minX - primary.maxX),
      Math.max(0, primary.minY - component.maxY, component.minY - primary.maxY),
    );
    const isGeneratedBar = component => {
      const componentWidth = component.maxX - component.minX + 1;
      const componentHeight = component.maxY - component.minY + 1;
      return removeGeneratedBars && componentWidth >= 40 && componentHeight <= 14 && componentWidth / componentHeight >= 4;
    };
    const kept = group.filter(component => !isGeneratedBar(component) && component.size >= minimumSize && (component === primary || distanceFromPrimary(component) <= associationRadius));
    if (!kept.length) throw new Error(`Frame sumber kosong pada baris ${row}, kolom ${column}.`);
    const minX = Math.max(0, Math.min(...kept.map(component => component.minX)) - 1);
    const minY = Math.max(0, Math.min(...kept.map(component => component.minY)) - 1);
    const maxX = Math.min(width - 1, Math.max(...kept.map(component => component.maxX)) + 1);
    const maxY = Math.min(height - 1, Math.max(...kept.map(component => component.maxY)) + 1);
    const frameWidth = maxX - minX + 1;
    const frameHeight = maxY - minY + 1;
    const data = Buffer.alloc(frameWidth * frameHeight * 4);
    for (const component of kept) for (const index of component.indices) {
      if (source[index * 4 + 3] <= 48) continue;
      const sourceX = index % width;
      const sourceY = Math.floor(index / width);
      const target = ((sourceY - minY) * frameWidth + sourceX - minX) * 4;
      source.copy(data, target, index * 4, index * 4 + 4);
    }
    const assignedPixels = group.reduce((total, component) => total + component.size, 0);
    const retainedPixels = kept.reduce((total, component) => total + component.size, 0);
    return {
      input: sharp(data, { raw: { width: frameWidth, height: frameHeight, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer(),
      width: frameWidth,
      height: frameHeight,
      sourceBox: { x: minX, y: minY, width: frameWidth, height: frameHeight },
      componentCount: kept.length,
      retainedRatio: assignedPixels ? retainedPixels / assignedPixels : 1,
    };
  })) };
};

const requestedCharacter = process.argv[2];
const buildCharacters = requestedCharacter ? characters.filter(character => character.id === requestedCharacter) : characters;
if (requestedCharacter && !buildCharacters.length) throw new Error(`Karakter ${requestedCharacter} tidak dikenal.`);

for (const character of buildCharacters) {
  const inputPath = path.join(sourceRoot, character.source ?? `${character.id}.png`);
  const outputDir = path.join(outputRoot, character.id);
  await mkdir(outputDir, { recursive: true });

  const sourceFile = await readFile(inputPath);
  const image = sharp(sourceFile, { failOn: 'none' });
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) throw new Error(`Ukuran sprite ${character.id} tidak dapat dibaca.`);

  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (character.id === 'raja' && data[index] < 24 && data[index + 1] < 24 && data[index + 2] < 24) {
      data[index] = 0; data[index + 1] = 0; data[index + 2] = 0; data[index + 3] = 0;
      continue;
    }
    if (data[index + 3] <= 12) {
      data[index] = 0; data[index + 1] = 0; data[index + 2] = 0; data[index + 3] = 0;
    }
  }

  const segmented = componentFrames(data, width, height, character.rows, sourceColumns, character.id === 'raja');
  const logicalFrames = segmented.frames;
  const rawFrames = [];
  for (let row = 0; row < atlasRows; row++) {
    const sourceRow = character.rows === 5 ? [0, 1, 1, 2, 3, 4][row] : row;
    for (let column = 0; column < sourceColumns; column++) {
      const frame = logicalFrames[sourceRow][column];
      rawFrames.push({ ...frame, input: await frame.input, row, column, sourceRow });
    }
  }

  const idleHeights = logicalFrames.slice(0, Math.min(4, character.rows)).map(row => row[0].height).sort((a, b) => a - b);
  const referenceHeight = idleHeights[Math.floor(idleHeights.length / 2)];
  const baseScale = 232 / referenceHeight;
  const requiredWidth = Math.max(...rawFrames.map(frame => Math.ceil(frame.width * baseScale)));
  const requiredHeight = Math.max(...rawFrames.map(frame => Math.ceil(frame.height * baseScale)));
  const widestFrame = rawFrames.reduce((widest, frame) => frame.width > widest.width ? frame : widest, rawFrames[0]);
  const atlasCellWidth = Math.max(256, Math.ceil((requiredWidth + atlasPadding * 2 + 8) / 16) * 16);
  const atlasCellHeight = Math.max(minimumAtlasCellHeight, Math.ceil((requiredHeight + atlasPadding * 2 + 8) / 16) * 16);
  if (atlasCellWidth > 512) throw new Error(`${character.name}: lebar frame ${atlasCellWidth}px tidak wajar pada r${widestFrame.row} c${widestFrame.column} (${widestFrame.width}×${widestFrame.height}); kemungkinan dua pose tergabung.`);
  if (atlasCellHeight > 512) throw new Error(`${character.name}: tinggi frame ${atlasCellHeight}px tidak wajar; kemungkinan dua pose tergabung.`);
  const atlasWidth = atlasCellWidth * sourceColumns;
  const atlasHeight = atlasCellHeight * atlasRows;
  const frameWidth = atlasCellWidth - atlasPadding * 2;
  const frameHeight = atlasCellHeight - atlasPadding * 2;

  const packedFrames = [];
  for (const frame of rawFrames) {
    const resizeWidth = Math.max(1, Math.round(frame.width * baseScale));
    const resizeHeight = Math.max(1, Math.round(frame.height * baseScale));
    const resized = await sharp(frame.input)
      .resize({ width: resizeWidth, height: resizeHeight, fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .sharpen(.25)
      .png({ compressionLevel: 9 })
      .toBuffer();
    const normalized = await sharp({ create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, left: Math.round((frameWidth - resizeWidth) / 2), top: frameHeight - resizeHeight }])
      .png({ compressionLevel: 9 })
      .toBuffer();
    packedFrames.push({ input: normalized, left: frame.column * atlasCellWidth + atlasPadding, top: frame.row * atlasCellHeight + atlasPadding });
  }

  await sharp({ create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(packedFrames)
    .webp({ quality: 97, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(path.join(outputDir, 'atlas.webp'));

  await sharp(path.join(outputDir, 'atlas.webp'))
    .resize({ width: atlasWidth * runtimeScale, height: atlasHeight * runtimeScale, kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 94, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(path.join(outputDir, 'atlas-runtime.webp'));

  const portraitFrame = rawFrames[0]?.input;
  if (!portraitFrame) throw new Error(`Frame portrait ${character.id} tidak tersedia.`);
  await sharp(portraitFrame)
    .resize({ width: 304, height: 304, fit: 'contain', position: 'south', withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 93, alphaQuality: 100, effort: 6 })
    .toFile(path.join(outputDir, 'portrait.webp'));

  const sourceFrames = rawFrames.map(({ row, column, sourceRow, sourceBox, width: frameSourceWidth, height: frameSourceHeight, componentCount, retainedRatio }) => ({
    row, column, sourceRow, box: sourceBox, width: frameSourceWidth, height: frameSourceHeight, componentCount, retainedRatio,
  }));
  const manifest = {
    version: pipelineVersion,
    id: character.id,
    name: character.name,
    role: character.role,
    source: { file: character.source ?? `${character.id}.png`, width, height, columns: sourceColumns, rows: character.rows, segmentation: 'row-separated-alpha-components', rowBounds: segmented.rowBounds, frames: sourceFrames },
    atlas: { width: atlasWidth, height: atlasHeight, columns: sourceColumns, rows: atlasRows, cell: { width: atlasCellWidth, height: atlasCellHeight }, gutter: atlasPadding },
    quality: {
      frameCount: rawFrames.length,
      minimumRetainedRatio: Math.min(...rawFrames.map(frame => frame.retainedRatio)),
      normalization: 'uniform-character-scale-south-anchor-lanczos3',
      referenceHeight,
      scale: baseScale,
    },
    anchor: { x: 0.5, y: 0.91 },
    directions: character.id === 'raja' ? {
      south: { idle: frames(atlasWidth, atlasHeight, 0, [0]), run: frames(atlasWidth, atlasHeight, 0, [1, 2, 3]), boost: frames(atlasWidth, atlasHeight, 0, [4, 5, 6]) },
      west: { idle: frames(atlasWidth, atlasHeight, 1, [0]), run: frames(atlasWidth, atlasHeight, 1, [1, 2, 3]), boost: frames(atlasWidth, atlasHeight, 1, [4, 5, 6]) },
      east: { mirror: 'west' },
      north: { idle: frames(atlasWidth, atlasHeight, 2, [0]), run: frames(atlasWidth, atlasHeight, 2, [1, 2, 3]), boost: frames(atlasWidth, atlasHeight, 2, [4, 5, 6]) },
    } : {
      south: { idle: frames(atlasWidth, atlasHeight, 0, [0]), run: frames(atlasWidth, atlasHeight, 0, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 0, [1, 2, 3, 4, 5]) },
      west: { idle: frames(atlasWidth, atlasHeight, 1, [0]), run: frames(atlasWidth, atlasHeight, 1, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 1, [1, 2, 3, 4, 5]) },
      east: character.rows === 5 ? { mirror: 'west' } : { idle: frames(atlasWidth, atlasHeight, 2, [0]), run: frames(atlasWidth, atlasHeight, 2, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 2, [1, 2, 3, 4, 5]) },
      north: { idle: frames(atlasWidth, atlasHeight, 3, [0]), run: frames(atlasWidth, atlasHeight, 3, [1, 2, 3, 4, 5]), boost: frames(atlasWidth, atlasHeight, 3, [1, 2, 3, 4, 5]) },
    },
    actions: character.id === 'raja' ? {
      tag: { row: 3, directionalColumns: { south: 0, east: 1, west: 2, north: 3 } },
      parkour: frames(atlasWidth, atlasHeight, 3, [4, 5, 6]),
      rescue: frames(atlasWidth, atlasHeight, 4, [6]),
      prisoner: frames(atlasWidth, atlasHeight, 4, [0, 1, 2]),
      victory: frames(atlasWidth, atlasHeight, 4, [3, 4, 6]),
      defeat: frames(atlasWidth, atlasHeight, 4, [5]),
      ultimate: { name: 'TITAH HALILINTAR', frames: frames(atlasWidth, atlasHeight, 5, [0, 1, 2, 3]) },
    } : {
      tag: frames(atlasWidth, atlasHeight, 4, [0, 1, 2, 3]),
      rescue: frames(atlasWidth, atlasHeight, 4, [3, 4, 5, 6]),
      prisoner: frames(atlasWidth, atlasHeight, 5, [0, 1]),
      victory: frames(atlasWidth, atlasHeight, 5, [2, 3, 4]),
      defeat: frames(atlasWidth, atlasHeight, 5, [5, 6]),
    },
  };
  await writeFile(path.join(outputDir, 'animations.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`✓ ${character.name}: ${rawFrames.length} frame komponen · sel ${atlasCellWidth}×${atlasCellHeight}`);
}

const montagePortraits = await Promise.all(characters.map(async (character, index) => ({
  input: await sharp(path.join(outputRoot, character.id, 'portrait.webp'))
    .resize({ width: 260, height: 360, fit: 'contain', position: 'south', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer(),
  left: (index % 7) * 274 + 22,
  top: Math.floor(index / 7) * 450 + 45,
})));
await sharp({ create: { width: 1920, height: 900, channels: 4, background: { r: 38, g: 55, b: 71, alpha: 1 } } })
  .composite(montagePortraits)
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public', 'characters.png'));

await writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({ version: pipelineVersion, atlas: { minimumCell: 256, padding: atlasPadding, columns: sourceColumns, rows: atlasRows, runtimeScale }, characters: characters.map(({ id, name, role, rows, source }) => ({ id, name, role, source: source ?? `${id}.png`, sourceColumns, sourceRows: rows })) }, null, 2)}\n`,
  'utf8',
);

console.log(`Sprite atlas v${pipelineVersion} + runtime 50% dibangun tanpa pemotongan grid tetap.`);
