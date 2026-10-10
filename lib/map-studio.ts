import config from '../config/map-studio.json';
import runtime from '../config/map-runtime.json';
import {runtimeResource, runtimeFrameKey, type RuntimeManifest} from './studio-runtime-resource.ts';
import {
  validateDocument,
  mapAssets,
  frameAt,
  type StudioMap,
  type MapObject,
  type MapAsset,
} from './map-studio-model.js';
import { publicAsset } from './characters.ts';
export const mapDocument = validateDocument(config);
export const studioBuiltinStates = mapDocument.builtinStates ?? {};
export const studioMaps = mapDocument.maps.filter(
  (m) => m.enabled && !m.archived && !m.deleted,
);
export const studioMapById = Object.fromEntries(
  studioMaps.map((m) => [m.id, m]),
);
const cache = new Map<string, HTMLImageElement>();
export function retainMapImages(maps: readonly StudioMap[]) {
  const used=new Set(maps.flatMap(m=>mapAssets(m).map(a=>resource(a).asset)));
  for(const [asset,image]of cache)if(!used.has(asset)){image.removeAttribute('src');cache.delete(asset);}
}
const resources=new WeakMap<MapAsset,ReturnType<typeof runtimeResource>>();
function resource(a:MapAsset) {
  let entry=resources.get(a);
  if(!entry){entry=runtimeResource(runtime as RuntimeManifest,a);resources.set(a,entry);}
  return entry;
}
export function mapImage(a: MapAsset) {
  const asset=resource(a).asset;
  if (!cache.has(asset)) {
    const image = new Image();
    image.decoding='async';
    image.src = publicAsset(asset);
    cache.set(asset, image);
  }
  return cache.get(asset)!;
}
export function mapImages(m: StudioMap) {
  return [
    ...new Set(
      mapAssets(m)
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
  const packed=resource(a).packed?.[runtimeFrameKey(f)];
  if(packed)ctx.drawImage(image,packed.x,packed.y,packed.width,packed.height,
    x+packed.left/f.width*w,y+packed.top/f.height*h,packed.width/f.width*w,packed.height/f.height*h);
  else ctx.drawImage(image, f.x, f.y, f.width, f.height, x, y, w, h);
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
  ctx.scale(o.mirror ? -1 : 1, o.mirrorY ? -1 : 1);
  drawAsset(ctx, o.asset, -o.w / 2, -o.h / 2, o.w, o.h, now);
  ctx.restore();
}
export function drawStructureVisual(ctx: CanvasRenderingContext2D,
  v: import('./map-studio-model.js').StructureVisual & {x: number; y: number}, now: number) {
  if (!v.visible || !v.asset) return;
  ctx.save();
  ctx.translate(v.x + v.w / 2, v.y + v.h / 2);
  ctx.rotate(v.rotation * Math.PI / 180);
  ctx.globalAlpha = v.opacity;
  ctx.scale(v.mirror ? -1 : 1, v.mirrorY ? -1 : 1);
  drawAsset(ctx, v.asset, -v.w / 2, -v.h / 2, v.w, v.h, now);
  ctx.restore();
}
export function mapArtwork(id: string) {
  const m = studioMapById[id],
    a = m?.icon ?? (!m?.replaces && m?.terrain?.frames.length === 1 ? m.terrain : null);
  return m ? publicAsset(a?.asset ?? `ui-v2/fields/${m.replaces ?? 'kampung'}.webp`) : null;
}
