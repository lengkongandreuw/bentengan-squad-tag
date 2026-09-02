import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourceDir = path.join(root, 'field-sources');
const outputDir = path.join(root, 'public', 'field');
const generatedFile = path.join(root, 'lib', 'field-assets.generated.ts');
const padding = 8;

const objects = [
  { id: 'bush', file: 'semak.png', width: 180, height: 118 },
  { id: 'tree', file: 'pohon.png', width: 150, height: 184 },
  { id: 'crates', file: 'replace crate minuman.png', width: 132, height: 126 },
  { id: 'drain', file: 'got.png', width: 252, height: 88 },
  { id: 'lamp', file: 'lampu.png', width: 74, height: 152 },
  { id: 'bunting', file: 'lines.png', width: 224, height: 116 },
  { id: 'clothesline', file: 'jemuran.png', width: 210, height: 170 },
  { id: 'bucket', file: 'replace ember.png', width: 112, height: 104 },
  { id: 'trash', file: 'tempat sampaj.png', width: 74, height: 112 },
  { id: 'plant', file: 'pot bunga.png', width: 88, height: 112 },
  { id: 'fortGreen', file: 'benteng tim hijau.png', width: 194, height: 188 },
  { id: 'fortRed', file: 'benteng tim merah.png', width: 194, height: 188 },
  { id: 'guardPost', file: 'replace pos ronda.png', width: 222, height: 205 },
  { id: 'hall', file: 'replace balai desa.png', width: 238, height: 198 },
  { id: 'warung', file: 'warung v2.png', width: 238, height: 198 },
  { id: 'parkTree', file: 'pohon untuk taman.png', width: 154, height: 184 },
  { id: 'flowerBedSmall', file: 'taman petak kecil.png', width: 130, height: 104 },
  { id: 'gardenMedium', file: 'taman petak sedang.png', width: 196, height: 148 },
  { id: 'flowerFence', file: 'pagar bunga.png', width: 244, height: 82 },
  { id: 'plantFence', file: 'pagar tanaman.png', width: 244, height: 78 },
  { id: 'coffeeStall', file: 'kedai statis.png', width: 214, height: 206 },
  { id: 'snackCart', file: 'gerobak statis.png', width: 156, height: 178 },
  { id: 'foodCart', file: 'gerobak 2 statis.png', width: 166, height: 178 },
  { id: 'marketStallA', file: 'variasi lapak.png', width: 200, height: 160, grid: { columns: 3, rows: 1, column: 0, row: 0 } },
  { id: 'marketStallB', file: 'variasi lapak.png', width: 200, height: 160, grid: { columns: 3, rows: 1, column: 1, row: 0 } },
  { id: 'marketStallC', file: 'variasi lapak.png', width: 200, height: 160, grid: { columns: 3, rows: 1, column: 2, row: 0 } },
  { id: 'prisonFloor', file: 'panjara latar.png', width: 254, height: 190 },
  { id: 'prisonOverlay', file: 'penjara overlay.png', width: 254, height: 190 },
  // V3: modular crops supplied for the four guide-based arenas.
  { id: 'parkBench', file: 'v3-park-objects.png', crop: { left: 54, top: 42, width: 279, height: 136 }, width: 220, height: 108 },
  { id: 'parkBenchLong', file: 'v3-park-objects.png', crop: { left: 400, top: 42, width: 500, height: 136 }, width: 330, height: 100 },
  { id: 'parkBarrier', file: 'v3-park-objects.png', crop: { left: 51, top: 226, width: 245, height: 99 }, width: 220, height: 88 },
  { id: 'parkBarrierLong', file: 'v3-park-objects.png', crop: { left: 383, top: 226, width: 444, height: 99 }, width: 330, height: 76 },
  { id: 'parkPlanter', file: 'v3-park-objects.png', crop: { left: 38, top: 373, width: 301, height: 224 }, width: 250, height: 160 },
  { id: 'parkPlanterLong', file: 'v3-park-objects.png', crop: { left: 63, top: 623, width: 569, height: 173 }, width: 340, height: 108 },
  { id: 'parkFlowerFence', file: 'v3-park-objects.png', crop: { left: 58, top: 830, width: 344, height: 184 }, width: 270, height: 142 },
  { id: 'parkFlowerFenceLong', file: 'v3-park-objects.png', crop: { left: 518, top: 830, width: 633, height: 184 }, width: 350, height: 120 },
  { id: 'parkLamp', file: 'v3-park-objects.png', crop: { left: 1279, top: 830, width: 83, height: 184 }, width: 72, height: 150 },
  { id: 'parkCornerNW', file: 'v3-park-corners.png', crop: { left: 16, top: 33, width: 499, height: 416 }, width: 330, height: 275 },
  { id: 'parkCornerNE', file: 'v3-park-corners.png', crop: { left: 1152, top: 33, width: 502, height: 416 }, width: 330, height: 275 },
  { id: 'parkCornerSW', file: 'v3-park-corners.png', crop: { left: 10, top: 492, width: 489, height: 419 }, width: 330, height: 275 },
  { id: 'parkCornerSE', file: 'v3-park-corners.png', crop: { left: 1168, top: 492, width: 497, height: 419 }, width: 330, height: 275 },
  { id: 'canalBarrier', file: 'v3-canal-barriers.png', crop: { left: 70, top: 122, width: 466, height: 382 }, width: 250, height: 142 },
  { id: 'canalBarrierV', file: 'v3-canal-barriers.png', crop: { left: 650, top: 122, width: 148, height: 382 }, width: 88, height: 220 },
  { id: 'canalBarrierCorner', file: 'v3-canal-barriers.png', crop: { left: 919, top: 122, width: 458, height: 382 }, width: 240, height: 190 },
  { id: 'canalBarrierLong', file: 'v3-canal-barriers.png', crop: { left: 470, top: 559, width: 670, height: 377 }, width: 340, height: 150 },
  { id: 'canalBridgeH', file: 'v3-canal-bridges.png', crop: { left: 63, top: 67, width: 420, height: 453 }, width: 220, height: 170 },
  { id: 'canalBridgeV', file: 'v3-canal-bridges.png', crop: { left: 600, top: 67, width: 252, height: 453 }, width: 136, height: 220 },
  { id: 'canalBridgeDiag', file: 'v3-canal-bridges.png', crop: { left: 971, top: 67, width: 436, height: 453 }, width: 220, height: 200 },
  { id: 'canalStraightH', file: 'v3-canals.png', crop: { left: 68, top: 18, width: 476, height: 389 }, width: 280, height: 160 },
  { id: 'canalStraightV', file: 'v3-canals.png', crop: { left: 634, top: 18, width: 206, height: 389 }, width: 128, height: 240 },
  { id: 'canalT', file: 'v3-canals.png', crop: { left: 942, top: 18, width: 429, height: 389 }, width: 250, height: 210 },
  { id: 'canalCurve', file: 'v3-canals.png', crop: { left: 424, top: 432, width: 254, height: 305 }, width: 170, height: 190 },
  { id: 'jungleNW', file: 'v3-edge-nw.png', width: 330, height: 330 },
  { id: 'jungleNE', file: 'v3-edge-ne.png', width: 330, height: 330 },
  { id: 'jungleSW', file: 'v3-edge-sw.png', width: 330, height: 330 },
  { id: 'jungleSE', file: 'v3-edge-se.png', width: 330, height: 330 },
  { id: 'industrialPrisonBlueFloor', file: 'v3-prison-industrial-blue.png', width: 310, height: 250 },
  { id: 'industrialPrisonBlueOverlay', file: 'v3-prison-industrial-blue.png', width: 310, height: 250, overlayBottom: .38 },
  { id: 'industrialPrisonRedFloor', file: 'v3-prison-industrial-red.png', width: 310, height: 250 },
  { id: 'industrialPrisonRedOverlay', file: 'v3-prison-industrial-red.png', width: 310, height: 250, overlayBottom: .38 },
  { id: 'parkPrisonBlueFloor', file: 'v3-park-prison-blue.png', width: 310, height: 250 },
  { id: 'parkPrisonBlueOverlay', file: 'v3-park-prison-blue.png', width: 310, height: 250, overlayBottom: .38 },
  { id: 'parkPrisonRedFloor', file: 'v3-park-prison-red.png', width: 310, height: 250 },
  { id: 'parkPrisonRedOverlay', file: 'v3-park-prison-red.png', width: 310, height: 250, overlayBottom: .38 },
];

const animations = [
  { id: 'fountain', file: 'air mancur.png', columns: 6, rows: 1, width: 92, height: 90, fps: 8 },
  { id: 'flag', file: 'gif object bendera indonesia.png', columns: 3, rows: 2, width: 74, height: 102, fps: 7 },
  { id: 'vendor', file: 'mas sayur sprite object.png', columns: 6, rows: 1, width: 132, height: 108, fps: 5 },
  { id: 'boost25', file: 'boost package 25.png', columns: 3, rows: 2, width: 52, height: 56, fps: 10 },
  { id: 'boost40', file: 'superboost package 40.png', columns: 3, rows: 2, width: 52, height: 56, fps: 10 },
  { id: 'boost75', file: 'super boost 75 package spriite.png', columns: 3, rows: 2, width: 52, height: 56, fps: 10 },
  { id: 'boost100', file: 'super boost 100 package spriite.png', columns: 3, rows: 2, width: 54, height: 58, fps: 10 },
];

const grounds = [
  { id: 'grass', file: 'tiles latar.png', crop: { left: 15, top: 55, width: 690, height: 460 } },
  { id: 'dirt', file: 'tiles latar.png', crop: { left: 742, top: 55, width: 690, height: 460 } },
  { id: 'paving', file: 'tiles latar.png', crop: { left: 15, top: 578, width: 690, height: 460 } },
  { id: 'concrete', file: 'tiles latar.png', crop: { left: 742, top: 578, width: 690, height: 460 } },
  { id: 'kampungGround', file: 'v3-ground-kampung.png' },
  { id: 'parkGrass', file: 'v3-ground-park-grass.png' },
  { id: 'parkPaving', file: 'v3-ground-park-paving.png' },
  { id: 'canalGrass', file: 'v3-ground-canal.png' },
];

const gridCrop = (width, height, grid) => {
  const left = Math.round(grid.column * width / grid.columns);
  const top = Math.round(grid.row * height / grid.rows);
  const right = Math.round((grid.column + 1) * width / grid.columns);
  const bottom = Math.round((grid.row + 1) * height / grid.rows);
  return { left, top, width: right - left, height: bottom - top };
};

const pack = (assets, atlasWidth) => {
  const sorted = [...assets].sort((a, b) => b.height - a.height || b.width - a.width || a.id.localeCompare(b.id));
  let x = padding, y = padding, shelfHeight = 0;
  const placed = {};
  const composites = [];
  for (const asset of sorted) {
    if (x + asset.width + padding > atlasWidth) { x = padding; y += shelfHeight + padding; shelfHeight = 0; }
    placed[asset.id] = { x, y, width: asset.width, height: asset.height };
    composites.push({ input: asset.data, left: x, top: y });
    x += asset.width + padding;
    shelfHeight = Math.max(shelfHeight, asset.height);
  }
  const height = Math.ceil((y + shelfHeight + padding) / 128) * 128;
  return { placed, composites, height };
};

await mkdir(outputDir, { recursive: true });

const preparedObjects = [];
for (const object of objects) {
  const sourcePath = path.join(sourceDir, object.file);
  const metadata = await sharp(sourcePath).metadata();
  const crop = object.crop ?? (object.grid ? gridCrop(metadata.width, metadata.height, object.grid) : undefined);
  const objectInput = crop ? await sharp(sourcePath).extract(crop).png().toBuffer() : sourcePath;
  let pipeline = sharp(objectInput)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
    .resize({ width: object.width, height: object.height, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha();
  if (object.overlayBottom) {
    const resized = await pipeline.png().toBuffer({ resolveWithObject: true });
    const overlayHeight = Math.max(1, Math.round(resized.info.height * object.overlayBottom));
    const bottom = await sharp(resized.data).extract({ left: 0, top: resized.info.height - overlayHeight, width: resized.info.width, height: overlayHeight }).png().toBuffer();
    pipeline = sharp({ create: { width: resized.info.width, height: resized.info.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: bottom, left: 0, top: resized.info.height - overlayHeight }]);
  }
  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true });
  preparedObjects.push({ id: object.id, data, width: info.width, height: info.height });
}

const objectAtlasWidth = 2048;
const objectPack = pack(preparedObjects, objectAtlasWidth);
await sharp({ create: { width: objectAtlasWidth, height: objectPack.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(objectPack.composites)
  .webp({ quality: 80, alphaQuality: 90, effort: 6, smartSubsample: true })
  .toFile(path.join(outputDir, 'objects.webp'));

const preparedFrames = [];
const animationManifest = {};
for (const animation of animations) {
  const sourcePath = path.join(sourceDir, animation.file);
  const metadata = await sharp(sourcePath).metadata();
  const frameIds = [];
  for (let row = 0; row < animation.rows; row++) for (let column = 0; column < animation.columns; column++) {
    const frameId = `${animation.id}-${row * animation.columns + column}`;
    const crop = gridCrop(metadata.width, metadata.height, { columns: animation.columns, rows: animation.rows, column, row });
    const frameInput = await sharp(sourcePath).extract(crop).png().toBuffer();
    const data = await sharp(frameInput)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
      .resize({ width: animation.width, height: animation.height, fit: 'contain', position: 'south', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha().png().toBuffer();
    preparedFrames.push({ id: frameId, data, width: animation.width, height: animation.height });
    frameIds.push(frameId);
  }
  animationManifest[animation.id] = { fps: animation.fps, width: animation.width, height: animation.height, frameIds };
}

const animatedAtlasWidth = 1024;
const animatedPack = pack(preparedFrames, animatedAtlasWidth);
await sharp({ create: { width: animatedAtlasWidth, height: animatedPack.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(animatedPack.composites)
  .webp({ quality: 78, alphaQuality: 88, effort: 6, smartSubsample: true })
  .toFile(path.join(outputDir, 'animated.webp'));
for (const animation of Object.values(animationManifest)) animation.frames = animation.frameIds.map(id => animatedPack.placed[id]);
for (const animation of Object.values(animationManifest)) delete animation.frameIds;

const tileWidth = 320;
const tileHeight = 224;
const groundColumns = 4;
const groundTiles = {};
const groundComposites = [];
for (let index = 0; index < grounds.length; index++) {
  const { id, file, crop } = grounds[index];
  let tile = sharp(path.join(sourceDir, file));
  if (crop) tile = tile.extract(crop);
  const data = await tile.resize(tileWidth, tileHeight, { fit: 'cover' }).removeAlpha().png().toBuffer();
  const tileX = (index % groundColumns) * tileWidth;
  const tileY = Math.floor(index / groundColumns) * tileHeight;
  groundTiles[id] = { x: tileX, y: tileY, width: tileWidth, height: tileHeight };
  groundComposites.push({ input: data, left: tileX, top: tileY });
}
const groundRows = Math.ceil(grounds.length / groundColumns);
await sharp({ create: { width: tileWidth * groundColumns, height: tileHeight * groundRows, channels: 3, background: '#737354' } })
  .composite(groundComposites)
  .webp({ quality: 72, effort: 6, smartSubsample: true })
  .toFile(path.join(outputDir, 'grounds.webp'));

const manifest = {
  version: 3,
  objects: { file: 'objects.webp', width: objectAtlasWidth, height: objectPack.height, assets: objectPack.placed },
  animated: { file: 'animated.webp', width: animatedAtlasWidth, height: animatedPack.height, animations: animationManifest },
  grounds: { file: 'grounds.webp', width: tileWidth * groundColumns, height: tileHeight * groundRows, tiles: groundTiles },
};
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const ts = `// Generated by scripts/build-field-assets.mjs. Do not edit by hand.\n` +
  `export const FIELD_ASSET_VERSION = ${manifest.version} as const;\n` +
  `export const FIELD_OBJECT_ATLAS = ${JSON.stringify({ width: objectAtlasWidth, height: objectPack.height, assets: objectPack.placed }, null, 2)} as const;\n` +
  `export const FIELD_ANIMATED_ATLAS = ${JSON.stringify({ width: animatedAtlasWidth, height: animatedPack.height, animations: animationManifest }, null, 2)} as const;\n` +
  `export const FIELD_GROUND_ATLAS = ${JSON.stringify({ width: tileWidth * groundColumns, height: tileHeight * groundRows, tiles: groundTiles }, null, 2)} as const;\n` +
  `export type FieldAssetId = keyof typeof FIELD_OBJECT_ATLAS.assets;\n` +
  `export type FieldAnimatedId = keyof typeof FIELD_ANIMATED_ATLAS.animations;\n` +
  `export type GroundTileId = keyof typeof FIELD_GROUND_ATLAS.tiles;\n`;
await writeFile(generatedFile, ts);

console.log(`Field runtime v${manifest.version}: objects ${objectAtlasWidth}x${objectPack.height}, animated ${animatedAtlasWidth}x${animatedPack.height}, grounds ${tileWidth * groundColumns}x${tileHeight * groundRows}.`);
