import config from '../config/map-studio.json';
import {
  validateDocument,
  frameAt,
  type StudioMap,
  type MapObject,
  type MapAsset,
} from './map-studio-model.js';
import { publicAsset } from './characters';
export const studioMaps = validateDocument(config).maps.filter(
  (m) => m.enabled,
);
export const studioMapById = Object.fromEntries(
  studioMaps.map((m) => [m.id, m]),
);
const cache = new Map<string, HTMLImageElement>();
export function mapImage(a: MapAsset) {
  const src = publicAsset(a.asset);
  if (!cache.has(src)) {
    const image = new Image();
    image.src = src;
    cache.set(src, image);
  }
  return cache.get(src)!;
}
export function mapImages(m: StudioMap) {
  return [
    ...new Set(
      [m.terrain, m.icon, ...m.objects.map((o) => o.asset)]
        .filter((a): a is MapAsset => !!a)
        .map(mapImage),
    ),
  ];
}
function drawAsset(
  ctx: CanvasRenderingContext2D,
  a: MapAsset,
  x: number,
  y: number,
  w: number,
  h: number,
  now: number,
) {
  const image = mapImage(a);
  if (!image.complete || !image.naturalWidth) return;
  const f = frameAt(a, now);
  ctx.drawImage(image, f.x, f.y, f.width, f.height, x, y, w, h);
}
let terrainTile: { key: string; canvas: HTMLCanvasElement } | null = null;
export function drawMapTerrain(
  ctx: CanvasRenderingContext2D,
  m: StudioMap,
  now: number,
) {
  ctx.fillStyle = '#425a3d';
  ctx.fillRect(0, 0, m.width, m.height);
  if (!m.terrain) return;
  if (m.terrainMode === 'tile') {
    const f = frameAt(m.terrain, now),
      key = [m.terrain.asset, f.x, f.y, m.tileSize].join('/');
    if (terrainTile?.key !== key) {
      const tile = document.createElement('canvas');
      tile.width = tile.height = m.tileSize;
      drawAsset(
        tile.getContext('2d')!,
        m.terrain,
        0,
        0,
        m.tileSize,
        m.tileSize,
        now,
      );
      terrainTile = { key, canvas: tile };
    }
    const pattern = ctx.createPattern(terrainTile.canvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, m.width, m.height);
    }
  } else drawAsset(ctx, m.terrain, 0, 0, m.width, m.height, now);
}
export function drawMapObject(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  now: number,
) {
  if (!o.visible || !o.asset) return;
  ctx.save();
  ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.globalAlpha = o.opacity;
  if (o.mirror) ctx.scale(-1, 1);
  drawAsset(ctx, o.asset, -o.w / 2, -o.h / 2, o.w, o.h, now);
  ctx.restore();
}
export function mapArtwork(id: string) {
  const m = studioMapById[id],
    a = m?.icon ?? (m?.terrain?.frames.length === 1 ? m.terrain : null);
  return m ? publicAsset(a?.asset ?? 'arena-ui/kampung.webp') : null;
}
