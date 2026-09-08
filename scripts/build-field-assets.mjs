import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourceDir = path.join(root, 'field-sources');
const mapSourceDir = path.join(root, 'Assets', 'map');
const map2SourceDir = path.join(mapSourceDir, 'map2');
const map3SourceDir = path.join(mapSourceDir, 'map3');
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
  // Map 2: cropped visual groups from the supplied 1672×941 placement sheet.
  { id: 'map2Center', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 280, top: 320, width: 1115, height: 335 }, width: 1115, height: 335 },
  { id: 'map2PrisonRedFloor', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 205, top: 100, width: 305, height: 220 }, width: 305, height: 220 },
  { id: 'map2PrisonRedOverlay', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 205, top: 100, width: 305, height: 220 }, width: 305, height: 220, overlayBottom: .38 },
  { id: 'map2PrisonGreenFloor', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 1155, top: 96, width: 310, height: 225 }, width: 310, height: 225 },
  { id: 'map2PrisonGreenOverlay', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 1155, top: 96, width: 310, height: 225 }, width: 310, height: 225, overlayBottom: .38 },
  { id: 'map2Trash', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 542, top: 198, width: 52, height: 72 }, width: 52, height: 72 },
  { id: 'map2Cart', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 1038, top: 154, width: 105, height: 105 }, width: 105, height: 105 },
  { id: 'map2BarrierRed', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 626, top: 240, width: 186, height: 82 }, width: 186, height: 82 },
  { id: 'map2BarrierGreen', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 856, top: 240, width: 180, height: 82 }, width: 180, height: 82 },
  { id: 'map2PlanterRed', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 636, top: 652, width: 190, height: 105 }, width: 190, height: 105 },
  { id: 'map2PlanterGreen', source: path.join(map2SourceDir, 'objects-layout.png'), crop: { left: 850, top: 656, width: 190, height: 101 }, width: 190, height: 101 },
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

// Map 1 is authored as one top-left quadrant. The remaining quadrants are
// deterministic mirrors so the outer flower fence joins without a center seam.
const map1Columns = [
  ['1x3_map1.png', '1x2_map1.png', '1x1_map1.png'],
  ['2x3_map1.png', '2x2_map1.png', '2x1_map1.png'],
  ['3x3_map1.png', '3x2_map1.png', '3x1 map1.png'],
];
const map1ColumnWidths = [55, 356, 358];
const map1RowHeights = [69, 238, 241];
const map1QuadrantWidth = map1ColumnWidths.reduce((sum, value) => sum + value, 0);
const map1QuadrantHeight = map1RowHeights.reduce((sum, value) => sum + value, 0);
const map1WorldWidth = Math.round(map1QuadrantWidth * 2 * 1.15);
const map1WorldHeight = Math.round(map1QuadrantHeight * 2 * 1.15);
const map1QuadrantParts = [];
let map1Left = 0;
for (let column = 0; column < map1Columns.length; column++) {
  let map1Top = 0;
  for (let row = 0; row < map1Columns[column].length; row++) {
    map1QuadrantParts.push({
      input: path.join(mapSourceDir, map1Columns[column][row]),
      left: map1Left,
      top: map1Top,
    });
    map1Top += map1RowHeights[row];
  }
  map1Left += map1ColumnWidths[column];
}
const map1Quadrant = await sharp({
  create: {
    width: map1QuadrantWidth,
    height: map1QuadrantHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  },
})
  .composite(map1QuadrantParts)
  .png()
  .toBuffer();
const map1TopRight = await sharp(map1Quadrant).flop().png().toBuffer();
const map1BottomLeft = await sharp(map1Quadrant).flip().png().toBuffer();
const map1BottomRight = await sharp(map1Quadrant).flip().flop().png().toBuffer();
const map1Complete = await sharp({
  create: {
    width: map1QuadrantWidth * 2,
    height: map1QuadrantHeight * 2,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  },
})
  .composite([
    { input: map1Quadrant, left: 0, top: 0 },
    { input: map1TopRight, left: map1QuadrantWidth, top: 0 },
    { input: map1BottomLeft, left: 0, top: map1QuadrantHeight },
    {
      input: map1BottomRight,
      left: map1QuadrantWidth,
      top: map1QuadrantHeight,
    },
  ])
  .png()
  .toBuffer();
await sharp(map1Complete)
  .resize(map1WorldWidth, map1WorldHeight, { fit: 'fill' })
  .webp({ quality: 86, effort: 6, smartSubsample: true })
  .toFile(path.join(outputDir, 'kampung-map.webp'));

// Map 2 uses four supplied tiles as one top-left quadrant. The terrain is
// mirrored into four quadrants, then expanded by 15% while the five authored
// market-border fragments stay aligned to the 1672×941 guide composition.
const map2QuadrantWidth = 416 + 421;
const map2QuadrantHeight = 231 + 238;
const map2Quadrant = await sharp({
  create: {
    width: map2QuadrantWidth,
    height: map2QuadrantHeight,
    channels: 3,
    background: '#a7794f',
  },
})
  .composite([
    { input: path.join(map2SourceDir, 'terrain-1x1.png'), left: 0, top: 0 },
    { input: path.join(map2SourceDir, 'terrain-2x1.png'), left: 416, top: 0 },
    { input: path.join(map2SourceDir, 'terrain-1x2.png'), left: 0, top: 231 },
    { input: path.join(map2SourceDir, 'terrain-2x2.png'), left: 416, top: 231 },
  ])
  .png()
  .toBuffer();
const map2TopRight = await sharp(map2Quadrant).flop().png().toBuffer();
const map2BottomLeft = await sharp(map2Quadrant).flip().png().toBuffer();
const map2BottomRight = await sharp(map2Quadrant).flip().flop().png().toBuffer();
const map2GuideWidth = 1672;
const map2GuideHeight = 941;
const map2WorldWidth = Math.round(map2GuideWidth * 1.15);
const map2WorldHeight = Math.round(map2GuideHeight * 1.15);
const map2Terrain = await sharp({
  create: {
    width: map2QuadrantWidth * 2,
    height: map2QuadrantHeight * 2,
    channels: 3,
    background: '#a7794f',
  },
})
  .composite([
    { input: map2Quadrant, left: 0, top: 0 },
    { input: map2TopRight, left: map2QuadrantWidth, top: 0 },
    { input: map2BottomLeft, left: 0, top: map2QuadrantHeight },
    { input: map2BottomRight, left: map2QuadrantWidth, top: map2QuadrantHeight },
  ])
  .resize(map2GuideWidth, map2GuideHeight, { fit: 'fill' })
  .png()
  .toBuffer();
const map2GuideComposite = await sharp(map2Terrain)
  .composite([
    { input: path.join(map2SourceDir, 'border-top-left.png'), left: 0, top: 0 },
    { input: path.join(map2SourceDir, 'border-top-center.png'), left: 691, top: 0 },
    { input: path.join(map2SourceDir, 'border-top-right.png'), left: 971, top: 0 },
    { input: path.join(map2SourceDir, 'border-bottom-left.png'), left: 0, top: 566 },
    { input: path.join(map2SourceDir, 'border-bottom-right.png'), left: 836, top: 549 },
  ])
  .png()
  .toBuffer();
await sharp(map2GuideComposite)
  .resize(map2WorldWidth, map2WorldHeight, { fit: 'fill' })
  .removeAlpha()
  .webp({ quality: 86, effort: 6, smartSubsample: true })
  .toFile(path.join(outputDir, 'pasar-map.webp'));

// Map 3 is authored as two aligned 1672x941 layers supplied by the user:
// terrain below and the complete object placement above it. Keeping the
// authored layout intact prevents the runtime from substituting old objects.
const map3GuideWidth = 1672;
const map3GuideHeight = 941;
const map3WorldWidth = Math.round(map3GuideWidth * 1.15);
const map3WorldHeight = Math.round(map3GuideHeight * 1.15);
const map3Terrain = await sharp(path.join(map3SourceDir, 'terrain.png'))
  .resize(map3GuideWidth, map3GuideHeight, { fit: 'fill' })
  .png()
  .toBuffer();
const map3Objects = await sharp(path.join(map3SourceDir, 'objects-layout.png'))
  .resize(map3GuideWidth, map3GuideHeight, { fit: 'fill' })
  .png()
  .toBuffer();
const map3GuideComposite = await sharp(map3Terrain)
  .composite([{ input: map3Objects, left: 0, top: 0 }])
  .png()
  .toBuffer();
await sharp(map3GuideComposite)
  .resize(map3WorldWidth, map3WorldHeight, { fit: 'fill' })
  .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(path.join(outputDir, 'taman-map.webp'));

const preparedObjects = [];
for (const object of objects) {
  const sourcePath = object.source ?? path.join(sourceDir, object.file);
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
  version: 7,
  maps: {
    kampung: {
      file: 'kampung-map.webp',
      width: map1WorldWidth,
      height: map1WorldHeight,
    },
    pasar: {
      file: 'pasar-map.webp',
      width: map2WorldWidth,
      height: map2WorldHeight,
    },
    taman: {
      file: 'taman-map.webp',
      width: map3WorldWidth,
      height: map3WorldHeight,
    },
  },
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
