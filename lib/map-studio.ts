import config from '../config/map-studio.json';
import {
  validateDocument,
  frameAt,
  type StudioMap,
  type MapObject,
  type MapAsset,
} from './map-studio-model.js';
import { publicAsset } from './characters';
export const mapDocument = validateDocument(config);
export const studioBuiltinStates = mapDocument.builtinStates ?? {};
export const studioMaps = mapDocument.maps.filter(
  (m) => m.enabled && !m.archived && !m.deleted,
);
export const studioMapById = Object.fromEntries(
  studioMaps.map((m) => [m.id, m]),
);
const cache = new Map<string, HTMLImageElement>();
export function mapImage(a: MapAsset) {
  if (!cache.has(a.asset)) {
    const image = new Image();
    image.src = publicAsset(a.asset);
    cache.set(a.asset, image);
  }
  return cache.get(a.asset)!;
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
let terrainTile: { key: string; canvas: HTMLCanvasElement; patterns:WeakMap<CanvasRenderingContext2D,CanvasPattern> } | null = null;
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
      key = [m.terrain.asset, f.x, f.y, f.width, f.height, m.tileSize].join('/');
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
      // Never cache a blank tile while its source image is still loading.
      const source=mapImage(m.terrain);
      if(!source.complete||!source.naturalWidth)return;
      terrainTile = { key, canvas: tile, patterns:new WeakMap() };
    }
    let pattern=terrainTile.patterns.get(ctx);
    if(!pattern){pattern=ctx.createPattern(terrainTile.canvas,'repeat')??undefined;if(pattern)terrainTile.patterns.set(ctx,pattern);}
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
