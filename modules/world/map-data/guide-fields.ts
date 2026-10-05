import type { FieldConfig, Obstacle } from './field-types.ts';
import type { FieldAssetId } from '../../../lib/field-assets.generated';
import {
  BASE_RADIUS,
  BASES,
  DESIGN_H,
  DESIGN_W,
  H,
  MAP_OBJECT_SCALE,
  MAP1_GUIDE_HEIGHT,
  MAP1_GUIDE_WIDTH,
  MAP1_WORLD_HEIGHT,
  MAP1_WORLD_WIDTH,
  MAP2_GUIDE_HEIGHT,
  MAP2_GUIDE_WIDTH,
  MAP2_WORLD_HEIGHT,
  MAP2_WORLD_WIDTH,
  MAP3_GUIDE_HEIGHT,
  MAP3_GUIDE_WIDTH,
  MAP3_WORLD_HEIGHT,
  MAP3_WORLD_WIDTH,
  MAP4_2_GUIDE_WIDTH,
  MAP4_2_INSERT,
  MAP4_2_LEFT_ANCHOR,
  MAP4_2_RIGHT_ANCHOR,
  MAP4_GUIDE_HEIGHT,
  MAP4_GUIDE_WIDTH,
  MAP4_OBJECT_SCALE,
  MAP4_WORLD_HEIGHT,
  MAP4_WORLD_SCALE,
  MAP4_WORLD_WIDTH,
  W,
} from './scalars.ts';

const guideObstacle = (
  asset: FieldAssetId,
  x: number,
  y: number,
  w: number,
  h: number,
  visualW: number,
  visualH: number,
  flip = false,
): Obstacle => ({
  asset,
  x,
  y,
  w,
  h,
  visualW,
  visualH,
  ...(flip ? { flip } : {}),
});
const guideCollider = (
  asset: FieldAssetId,
  x: number,
  y: number,
  w: number,
  h: number,
): Obstacle => ({
  ...guideObstacle(asset, x, y, w, h, 1, 1),
  hidden: true,
});

const map2GroupObstacle = (
  x: number,
  y: number,
  w: number,
  h: number,
): Obstacle => {
  const group = { x: 280, y: 320, w: 1115, h: 335 };
  const groupCenterX = group.x + group.w / 2;
  const groupCenterY = group.y + group.h / 2;
  const positionScaleX = MAP2_WORLD_WIDTH / MAP2_GUIDE_WIDTH;
  const positionScaleY = MAP2_WORLD_HEIGHT / MAP2_GUIDE_HEIGHT;
  const centerX =
    groupCenterX +
    ((x + w / 2 - groupCenterX) * MAP_OBJECT_SCALE) / positionScaleX;
  const centerY =
    groupCenterY +
    ((y + h / 2 - groupCenterY) * MAP_OBJECT_SCALE) / positionScaleY;
  return {
    ...guideObstacle(
      'map2Center',
      centerX - w / 2,
      centerY - h / 2,
      w,
      h,
      1,
      1,
    ),
    hidden: true,
  };
};

export const GUIDE_FIELD_CONFIGS: FieldConfig[] = [
  {
    id: 'kampung',
    name: 'Kampung Merdeka',
    kicker: 'Lapangan terbuka · ramah pemula',
    difficulty: 'easy',
    aiIntensity: 1,
    ground: 'kampungGround',
    background: 'kampung-map.webp',
    designWidth: MAP1_GUIDE_WIDTH,
    designHeight: MAP1_GUIDE_HEIGHT,
    width: MAP1_WORLD_WIDTH,
    height: MAP1_WORLD_HEIGHT,
    objectScale: 0.9,
    bases: {
      blue: { x: 166, y: 505 },
      red: { x: 1286, y: 505 },
    },
    prisons: {
      blue: {
        x: 150,
        y: 752,
        w: 270,
        h: 205,
        floorAsset: 'industrialPrisonBlueFloor',
        overlayAsset: 'industrialPrisonBlueOverlay',
      },
      red: {
        x: 1148,
        y: 48,
        w: 270,
        h: 205,
        floorAsset: 'industrialPrisonRedFloor',
        overlayAsset: 'industrialPrisonRedOverlay',
      },
    },
    paths: [],
    obstacles: [
      {
        ...guideObstacle('warung', 238, 142, 170, 42, 205, 154),
        underlay: true,
      },
      {
        ...guideObstacle('hall', 916, 152, 184, 46, 230, 174),
        underlay: true,
      },
      {
        ...guideObstacle('guardPost', 964, 888, 188, 46, 230, 190),
        underlay: true,
      },
      {
        ...guideObstacle('marketStallB', 654, 910, 168, 42, 214, 166),
        underlay: true,
      },
      ...[
        [500, 228],
        [878, 228],
        [380, 308],
        [582, 332],
        [792, 332],
        [1000, 308],
        [500, 430],
        [878, 430],
        [664, 494],
        [380, 568],
        [500, 568],
        [878, 568],
        [1000, 568],
        [500, 682],
        [582, 682],
        [792, 682],
        [878, 682],
      ].map(([x, y], i) =>
        guideObstacle(
          i % 3 === 1 ? 'drain' : 'parkBarrier',
          x,
          y,
          108,
          20,
          132,
          54,
          i % 4 === 0,
        ),
      ),
      guideObstacle('parkTree', 484, 116, 46, 40, 105, 126),
      guideObstacle('parkTree', 174, 290, 48, 42, 108, 130),
      guideObstacle('parkTree', 1228, 290, 48, 42, 108, 130, true),
      guideObstacle('parkTree', 74, 904, 46, 40, 105, 126),
      guideObstacle('parkTree', 1330, 904, 46, 40, 105, 126, true),
      { ...guideObstacle('snackCart', 76, 126, 62, 34, 98, 112), underlay: true },
      { ...guideObstacle('foodCart', 490, 888, 66, 36, 102, 116), underlay: true },
      { ...guideObstacle('snackCart', 930, 950, 62, 34, 98, 112, true), underlay: true },
    ],
    decorations: [
      { asset: 'bunting', x: 590, y: 18, w: 280, h: 102, opacity: 0.92, underlay: true },
      { asset: 'plant', x: 108, y: 964, w: 58, h: 72, underlay: true },
      { asset: 'plant', x: 1282, y: 964, w: 58, h: 72, flip: true, underlay: true },
    ],
    animated: [],
  },
  {
    id: 'pasar',
    name: 'Pasar Senggol',
    kicker: 'Lorong pasar · jalur rapat',
    difficulty: 'normal',
    aiIntensity: 1,
    ground: 'kampungGround',
    background: 'pasar-map.webp',
    designWidth: MAP2_GUIDE_WIDTH,
    designHeight: MAP2_GUIDE_HEIGHT,
    width: MAP2_WORLD_WIDTH,
    height: MAP2_WORLD_HEIGHT,
    objectScale: MAP_OBJECT_SCALE,
    bases: {
      blue: { x: 170, y: 455 },
      red: { x: 1502, y: 455 },
    },
    prisons: {
      blue: {
        x: 205,
        y: 100,
        w: 305,
        h: 220,
        floorAsset: 'map2PrisonRedFloor',
        overlayAsset: 'map2PrisonRedOverlay',
      },
      red: {
        x: 1155,
        y: 96,
        w: 310,
        h: 225,
        floorAsset: 'map2PrisonGreenFloor',
        overlayAsset: 'map2PrisonGreenOverlay',
      },
    },
    paths: [],
    obstacles: [
      guideObstacle('map2BarrierRed', 640, 251, 159, 56, 186, 82),
      guideObstacle('map2BarrierGreen', 875, 251, 147, 56, 180, 82),
      guideObstacle('map2PlanterRed', 647, 665, 164, 78, 190, 105),
      guideObstacle('map2PlanterGreen', 865, 672, 155, 71, 190, 101),
      guideObstacle('map2Trash', 554, 210, 34, 52, 52, 72),
      guideObstacle('map2Cart', 1050, 167, 84, 84, 105, 105),
      ...[
        [400, 339, 140, 50],
        [570, 355, 100, 28],
        [980, 355, 105, 28],
        [1125, 339, 140, 50],
        [300, 430, 160, 62],
        [460, 430, 150, 62],
        [610, 440, 85, 52],
        [700, 382, 270, 150],
        [980, 440, 85, 52],
        [1065, 430, 150, 62],
        [1215, 430, 160, 62],
        [400, 565, 150, 60],
        [575, 600, 110, 30],
        [980, 600, 110, 30],
        [1120, 565, 150, 60],
      ].map(([x, y, w, h]) => map2GroupObstacle(x, y, w, h)),
      {
        ...guideObstacle('marketStallA', 250, 760, 180, 40, 230, 175),
        underlay: true,
      },
      {
        ...guideObstacle('marketStallB', 752, 830, 176, 40, 220, 172),
        underlay: true,
      },
      {
        ...guideObstacle('marketStallC', 1218, 760, 180, 40, 230, 175, true),
        underlay: true,
      },
      {
        ...guideObstacle('snackCart', 548, 790, 66, 36, 104, 118),
        underlay: true,
      },
      {
        ...guideObstacle('foodCart', 1058, 790, 66, 36, 106, 118, true),
        underlay: true,
      },
    ],
    decorations: [
      { asset: 'map2Center', x: 280, y: 320, w: 1115, h: 335, opacity: 0.99 },
    ],
    animated: [],
  },
  {
    id: 'taman',
    name: 'Taman Kota',
    kicker: 'Taman simetris · parkour teknis',
    difficulty: 'hard',
    aiIntensity: 1,
    ground: 'parkGrass',
    background: 'taman-map.webp',
    designWidth: MAP3_GUIDE_WIDTH,
    designHeight: MAP3_GUIDE_HEIGHT,
    width: MAP3_WORLD_WIDTH,
    height: MAP3_WORLD_HEIGHT,
    objectScale: 1,
    structuresInBackground: true,
    bases: {
      blue: { x: 150, y: 452 },
      red: { x: 1518, y: 452 },
    },
    prisons: {
      blue: {
        x: 399,
        y: 645,
        w: 206,
        h: 186,
        floorAsset: 'parkPrisonBlueFloor',
        overlayAsset: 'parkPrisonBlueOverlay',
      },
      red: {
        x: 1046,
        y: 93,
        w: 195,
        h: 159,
        floorAsset: 'parkPrisonRedFloor',
        overlayAsset: 'parkPrisonRedOverlay',
      },
    },
    paths: [],
    obstacles: [
      // Perimeter collision follows the authored water/hedge margin while
      // leaving the north and south entrances open.
      guideCollider('parkCornerNW', 24, 72, 250, 60),
      guideCollider('parkCornerNE', 1398, 72, 250, 60),
      guideCollider('parkCornerNW', 24, 190, 80, 130),
      guideCollider('parkCornerSW', 24, 620, 90, 130),
      guideCollider('parkCornerNE', 1568, 190, 80, 130),
      guideCollider('parkCornerSE', 1558, 620, 90, 130),
      guideCollider('parkCornerSW', 24, 780, 210, 80),
      guideCollider('parkCornerSE', 1438, 780, 210, 80),

      // Four authored parkour barriers and the central fountain footprint.
      guideCollider('parkBarrier', 602, 368, 76, 16),
      guideCollider('parkBarrier', 992, 368, 76, 16),
      guideCollider('parkBarrier', 594, 520, 80, 18),
      guideCollider('parkBarrier', 998, 520, 78, 18),
      guideCollider('flowerBedSmall', 792, 405, 90, 34),

      // Trees, flower beds and benches use only their solid lower footprint.
      guideCollider('parkTree', 398, 190, 76, 28),
      guideCollider('parkFlowerFenceLong', 594, 142, 164, 30),
      guideCollider('parkFlowerFence', 320, 304, 140, 28),
      guideCollider('parkPlanterLong', 642, 265, 112, 26),
      guideCollider('gardenMedium', 885, 248, 94, 24),
      guideCollider('parkTree', 1294, 108, 74, 26),
      guideCollider('parkFlowerFence', 1208, 307, 142, 26),
      guideCollider('parkFlowerFence', 318, 592, 140, 26),
      guideCollider('gardenMedium', 662, 642, 112, 28),
      guideCollider('parkPlanterLong', 916, 633, 116, 28),
      guideCollider('parkFlowerFenceLong', 1215, 624, 142, 28),
      guideCollider('parkTree', 1172, 752, 92, 28),
      guideCollider('parkFlowerFenceLong', 894, 798, 164, 28),

      // Lamps, bollards and bins remain small tactical blockers.
      guideCollider('parkLamp', 506, 110, 16, 14),
      guideCollider('parkLamp', 950, 140, 18, 14),
      guideCollider('parkLamp', 1008, 214, 14, 14),
      guideCollider('parkLamp', 1264, 244, 15, 14),
      guideCollider('parkLamp', 326, 452, 34, 16),
      guideCollider('parkLamp', 1312, 452, 34, 16),
      guideCollider('parkLamp', 364, 674, 14, 14),
      guideCollider('parkLamp', 631, 715, 14, 14),
      guideCollider('parkLamp', 695, 818, 28, 14),
      guideCollider('parkLamp', 1143, 840, 14, 14),
    ],
    decorations: [],
    animated: [],
  },
  {
    id: 'kanal',
    name: 'Alun Kanal Nusantara',
    kicker: 'Kanal cincin · jembatan dan parkour',
    difficulty: 'hard',
    aiIntensity: 1.03,
    ground: 'canalGrass',
    background: 'kanal-map.webp',
    waterMask: 'kanal1-water-mask.png',
    waterMaskWidth: 850,
    waterMaskHeight: 463,
    designWidth: MAP4_GUIDE_WIDTH,
    designHeight: MAP4_GUIDE_HEIGHT,
    width: MAP4_WORLD_WIDTH,
    height: MAP4_WORLD_HEIGHT,
    objectScale: MAP4_WORLD_SCALE,
    structuresInBackground: true,
    bases: {
      blue: { x: 180, y: 446 },
      red: { x: 1518, y: 446 },
    },
    prisons: {
      blue: {
        x: 177,
        y: 535,
        w: 153,
        h: 132,
        floorAsset: 'industrialPrisonBlueFloor',
        overlayAsset: 'industrialPrisonBlueOverlay',
      },
      red: {
        x: 1328,
        y: 244,
        w: 150,
        h: 130,
        floorAsset: 'industrialPrisonRedFloor',
        overlayAsset: 'industrialPrisonRedOverlay',
      },
    },
    paths: [],
    obstacles: [
      // Margin/pagar mengikuti footprint padat pada panduan final. Gambar
      // margin sendiri sudah berada di background sehingga tidak menutup
      // benteng atau penjara dengan lapisan visual tambahan.
      guideCollider('jungleNW', 24, 72, 570, 50),
      guideCollider('jungleNE', 1105, 72, 570, 50),
      guideCollider('jungleNW', 594, 72, 210, 45),
      guideCollider('jungleNE', 895, 72, 210, 45),
      guideCollider('jungleNW', 24, 122, 460, 38),
      guideCollider('jungleNE', 1215, 122, 460, 38),
      guideCollider('jungleSW', 24, 820, 570, 66),
      guideCollider('jungleSE', 1105, 820, 570, 66),
      guideCollider('jungleSW', 594, 840, 210, 46),
      guideCollider('jungleSE', 895, 840, 210, 46),
      guideCollider('jungleSW', 24, 770, 300, 50),
      guideCollider('jungleSE', 1375, 770, 300, 50),
      guideCollider('jungleNW', 24, 160, 54, 170),
      guideCollider('jungleSW', 24, 610, 54, 160),
      guideCollider('jungleNE', 1621, 160, 54, 170),
      guideCollider('jungleSE', 1621, 610, 54, 160),

      // Barrier pusat: collider hanya menutupi pot/struktur padat dan
      // menyisakan jalur lari serta semua jembatan tetap terbuka.
      guideCollider('canalBarrierLong', 442, 183, 150, 38),
      guideCollider('canalBarrier', 796, 184, 107, 40),
      guideCollider('canalBarrierLong', 1107, 183, 150, 38),
      guideCollider('flowerBedSmall', 690, 282, 91, 54),
      guideCollider('flowerBedSmall', 918, 282, 91, 54),
      guideCollider('canalBarrierLong', 594, 408, 150, 54),
      guideCollider('canalBarrier', 812, 404, 75, 70),
      guideCollider('canalBarrierLong', 955, 408, 150, 54),
      guideCollider('flowerBedSmall', 690, 535, 91, 54),
      guideCollider('flowerBedSmall', 918, 535, 91, 54),
      guideCollider('canalBarrierLong', 442, 662, 150, 40),
      guideCollider('canalBarrier', 796, 660, 107, 42),
      guideCollider('canalBarrierLong', 1107, 662, 150, 40),

      // Objek taktis sisi luar dan pepohonan rendah.
      guideCollider('canalBarrier', 206, 244, 126, 34),
      guideCollider('canalBarrier', 1367, 590, 126, 34),
      guideCollider('canalBarrier', 258, 684, 116, 34),
      guideCollider('canalBarrier', 1325, 188, 116, 34),
      guideCollider('flowerBedSmall', 448, 639, 105, 32),
      guideCollider('flowerBedSmall', 1146, 214, 105, 32),
    ],
    decorations: [],
    animated: [],
  },
];

// Nusantara 2 keeps every current sprite at its original size. Only the
// horizontal coordinate space between the bridge approaches is lengthened.
// Keep Nusantara 2's approved sprite layout self-contained. Its published
// config must not depend on any uncommitted changes to Nusantara 1.
const kanalGuide: FieldConfig = {
  ...structuredClone(GUIDE_FIELD_CONFIGS.find(field => field.id === 'kanal')!),
  background: 'kanal-ground.webp',
  baseRadius: Math.round(BASE_RADIUS * MAP4_OBJECT_SCALE),
  objectScale: MAP4_OBJECT_SCALE,
  structuresInBackground: false,
  basesInBackground: false,
  bases: {
    blue: { x: 212, y: 408 },
    red: { x: 1485, y: 408 },
  },
  prisons: {
    blue: { x: 325, y: 246, w: 118, h: 102, floorAsset: 'industrialPrisonBlueFloor', overlayAsset: 'industrialPrisonBlueOverlay' },
    red: { x: 1256, y: 246, w: 118, h: 102, floorAsset: 'industrialPrisonRedFloor', overlayAsset: 'industrialPrisonRedOverlay' },
  },
  obstacles: [
    guideObstacle('kanalNusaFountain', 782, 452, 136, 48, 136, 120),
    guideObstacle('kanalNusaPlanterOval', 672, 326, 146, 34, 146, 90),
    guideObstacle('kanalNusaPlanterOval', 881, 326, 146, 34, 146, 90),
    guideObstacle('kanalNusaPlanterOval', 672, 572, 146, 34, 146, 90),
    guideObstacle('kanalNusaPlanterOval', 881, 572, 146, 34, 146, 90),
    guideObstacle('kanalNusaPlanterLong', 764, 207, 172, 35, 172, 86),
    guideObstacle('kanalNusaPlanterLong', 764, 676, 172, 35, 172, 86),
    guideObstacle('kanalNusaBarrier', 172, 238, 118, 29, 128, 73),
    guideObstacle('kanalNusaBarrier', 1409, 238, 118, 29, 128, 73, true),
    guideObstacle('kanalNusaBarrier', 415, 710, 144, 38, 152, 84),
    guideObstacle('kanalNusaBarrier', 1140, 710, 144, 38, 152, 84, true),
    guideObstacle('kanalNusaPosRonda', 90, 146, 158, 42, 175, 132),
    guideObstacle('kanalNusaWarung', 1451, 146, 158, 42, 175, 132),
    guideObstacle('kanalNusaSembako', 140, 820, 170, 44, 190, 154),
    guideObstacle('kanalNusaGazebo', 1389, 820, 170, 44, 190, 154),
    guideObstacle('kanalNusaForest', 24, 215, 116, 38, 136, 142),
    guideObstacle('kanalNusaForest', 1559, 215, 116, 38, 136, 142, true),
    guideObstacle('kanalNusaForest', 26, 725, 118, 38, 140, 145),
    guideObstacle('kanalNusaForest', 1555, 725, 118, 38, 140, 145, true),
    guideObstacle('kanalNusaBarrier', 270, 608, 124, 30, 130, 74),
    guideObstacle('kanalNusaBarrier', 1305, 608, 124, 30, 130, 74, true),
    guideObstacle('kanalNusaLantern', 45, 322, 30, 24, 37, 86),
    guideObstacle('kanalNusaLantern', 1624, 322, 30, 24, 37, 86),
    guideObstacle('kanalNusaLantern', 104, 626, 30, 24, 37, 86),
    guideObstacle('kanalNusaLantern', 1565, 626, 30, 24, 37, 86),
    guideCollider('kanalNusaBridgeH', 420, 431, 21, 9),
    guideCollider('kanalNusaBridgeH', 539, 431, 21, 9),
    guideCollider('kanalNusaBridgeH', 420, 480, 21, 9),
    guideCollider('kanalNusaBridgeH', 539, 480, 21, 9),
    guideCollider('kanalNusaBridgeH', 1139, 431, 21, 9),
    guideCollider('kanalNusaBridgeH', 1258, 431, 21, 9),
    guideCollider('kanalNusaBridgeH', 1139, 480, 21, 9),
    guideCollider('kanalNusaBridgeH', 1258, 480, 21, 9),
  ],
  decorations: [
    { asset: 'kanalNusaBridgeH', x: 417, y: 416, w: 146, h: 74 },
    { asset: 'kanalNusaBridgeH', x: 1136, y: 416, w: 146, h: 74, flip: true },
  ],
};
export const kanal2X = (x: number) => {
  if (x <= MAP4_2_LEFT_ANCHOR) return x;
  if (x >= MAP4_2_RIGHT_ANCHOR) return x + MAP4_2_INSERT;
  return x + Math.floor(MAP4_2_INSERT / 2);
};
const kanal2Item = <T extends { x: number; w: number }>(item: T): T => ({
  ...item,
  x: Math.round(kanal2X(item.x + item.w / 2) - item.w / 2),
});
// Two low, mirrored planters use the same grounded silhouette/collision as
// the approved Nusantara planters; the rest of the new center stays open.
const kanal2SmallPlanters = [
  guideObstacle('kanalNusaPlanterOval', 802, 245, 82, 20, 82, 51),
  guideObstacle('kanalNusaPlanterOval', MAP4_2_GUIDE_WIDTH - 802 - 82, 245, 82, 20, 82, 51),
];
GUIDE_FIELD_CONFIGS.push({
  ...structuredClone(kanalGuide),
  id: 'kanal2',
  name: 'Alun Kanal Nusantara 2',
  kicker: 'Kanal panjang · ruang tengah 2×',
  background: 'kanal2-ground.webp',
  waterMask: 'kanal2-water-mask.png',
  waterMaskWidth: Math.round(MAP4_2_GUIDE_WIDTH / 2),
  designWidth: MAP4_2_GUIDE_WIDTH,
  width: Math.round(MAP4_2_GUIDE_WIDTH * MAP4_OBJECT_SCALE),
  height: Math.round(MAP4_GUIDE_HEIGHT * MAP4_OBJECT_SCALE),
  bases: {
    blue: { ...kanalGuide.bases!.blue, x: Math.round(kanal2X(kanalGuide.bases!.blue.x)) },
    red: { ...kanalGuide.bases!.red, x: Math.round(kanal2X(kanalGuide.bases!.red.x)) },
  },
  prisons: {
    blue: kanal2Item(kanalGuide.prisons.blue),
    red: kanal2Item(kanalGuide.prisons.red),
  },
  obstacles: [...kanalGuide.obstacles.map(kanal2Item), ...kanal2SmallPlanters],
  decorations: kanalGuide.decorations.map(kanal2Item),
});

export function buildFieldConfigs(guide: FieldConfig[]): FieldConfig[] {
  return guide.map((field) => {
  const width = field.width ?? W;
  const height = field.height ?? H;
  const scaleX = width / (field.designWidth ?? DESIGN_W);
  const scaleY = height / (field.designHeight ?? DESIGN_H);
  const mapX = (value: number) => Math.round(value * scaleX);
  const mapY = (value: number) => Math.round(value * scaleY);
  const objectScale = field.objectScale ?? 1;
  const mapW = (value: number) => Math.round(value * objectScale);
  const mapH = (value: number) => Math.round(value * objectScale);
  const mapObjectX = (x: number, w: number) =>
    field.objectScale
      ? Math.round((x + w / 2) * scaleX - mapW(w) / 2)
      : mapX(x);
  const mapObjectY = (y: number, h: number) =>
    field.objectScale
      ? Math.round((y + h / 2) * scaleY - mapH(h) / 2)
      : mapY(y);
  return {
    ...field,
    width,
    height,
    bases: field.bases
      ? {
          blue: { x: mapX(field.bases.blue.x), y: mapY(field.bases.blue.y) },
          red: { x: mapX(field.bases.red.x), y: mapY(field.bases.red.y) },
        }
      : BASES,
    prisons: {
      blue: {
        ...field.prisons.blue,
        x: mapObjectX(field.prisons.blue.x, field.prisons.blue.w),
        y: mapObjectY(field.prisons.blue.y, field.prisons.blue.h),
        w: mapW(field.prisons.blue.w),
        h: mapH(field.prisons.blue.h),
      },
      red: {
        ...field.prisons.red,
        x: mapObjectX(field.prisons.red.x, field.prisons.red.w),
        y: mapObjectY(field.prisons.red.y, field.prisons.red.h),
        w: mapW(field.prisons.red.w),
        h: mapH(field.prisons.red.h),
      },
    },
    paths: field.paths.map((path) => ({
      ...path,
      x: mapX(path.x),
      y: mapY(path.y),
      w: mapX(path.w),
      h: mapY(path.h),
      radius: Math.round(path.radius * Math.min(scaleX, scaleY)),
    })),
    obstacles: field.obstacles.map((item) => ({
      ...item,
      x: mapObjectX(item.x, item.w),
      y: mapObjectY(item.y, item.h),
      w: mapW(item.w),
      h: mapH(item.h),
      visualW: mapW(item.visualW),
      visualH: mapH(item.visualH),
    })),
    decorations: field.decorations.map((item) => ({
      ...item,
      x: mapObjectX(item.x, item.w),
      y: mapObjectY(item.y, item.h),
      w: mapW(item.w),
      h: mapH(item.h),
    })),
    animated: field.animated.map((item) => ({
      ...item,
      x: mapObjectX(item.x, item.w),
      y: mapObjectY(item.y, item.h),
      w: mapW(item.w),
      h: mapH(item.h),
    })),
  };
});
}
