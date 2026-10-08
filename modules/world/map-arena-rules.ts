// Moved verbatim from lib/map-arena-rules.js (R10).
import type { MapObject, StudioMap } from '../../lib/map-studio-model.js';
import type { FieldAssetId } from '../../lib/field-assets.generated.ts';

export type ColliderReference = Pick<
  MapObject,
  'id' | 'name' | 'x' | 'y' | 'w' | 'h' | 'shape' | 'points' | 'behavior' | 'nativeCollision'
>;

// Content IDs may change on edit/copy; simulation rules must not.
export function arenaRulesFor(map?: Pick<StudioMap, 'arenaRules' | 'replaces'>): 'kanal2' | 'standard' {
  return map?.arenaRules ?? (map?.replaces === 'kanal2' ? 'kanal2' : 'standard');
}

// Upgrade only pristine, generated legacy footprints. A user's moved/reshaped
// collider is intentionally left alone. No source document is mutated/written.
export function prepareArenaMap<T extends StudioMap>(map: T, referenceObjects: ColliderReference[]): T {
  if (arenaRulesFor(map) !== 'kanal2' || map.rulesVersion === 1) return map;
  const reference = new Map(referenceObjects.map((o) => [o.id, o]));
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-7;
  const upgraded = {
    ...map,
    arenaRules: 'kanal2' as const,
    rulesVersion: 1 as const,
    objects: map.objects.map((o) => {
      const original = reference.get(o.id);
      if (
        !original ||
        o.asset ||
        o.name !== original.name ||
        o.behavior !== 'solid' ||
        o.shape !== original.shape ||
        o.rotation !== 0 ||
        !(['x', 'y', 'w', 'h'] as const).every((k) => same(o[k], original[k])) ||
        o.points.length !== original.points.length ||
        !o.points.every((p, i) => same(p.x, original.points[i].x) && same(p.y, original.points[i].y))
      )
        return o;
      return { ...o, behavior: 'parkour', nativeCollision: original.nativeCollision };
    }),
  };
  // Spread of generic T is structurally identical to T; inference cannot unify it.
  const out: T = upgraded as T;
  return out;
}

export function kanalColliderObjects<T>(
  obstacles: T[],
  polygons: (o: T) => number[][][],
): ColliderReference[] {
  return obstacles.flatMap((o, i) =>
    polygons(o).map((poly, j) => {
      const x = Math.min(...poly.map((p) => p[0])),
        y = Math.min(...poly.map((p) => p[1]));
      const w = Math.max(...poly.map((p) => p[0])) - x,
        h = Math.max(...poly.map((p) => p[1])) - y;
      // Generic obstacle carries the same asset/hidden fields the JS read.
      const src: { asset: string; hidden?: boolean } = o as { asset: string; hidden?: boolean };
      return {
        id: `obj-collider-${i}-${j}`,
        name: 'Batas ' + src.asset,
        x,
        y,
        w,
        h,
        shape: 'polygon',
        points: poly.map((p) => ({ x: (p[0] - x) / w, y: (p[1] - y) / h })),
        behavior: 'parkour',
        nativeCollision: src.hidden ? 'rect' : 'bands',
      };
    }),
  );
}

export function kanalPrisonWalls(
  prisons: Record<string, { x: number; y: number; w: number; h: number; floorAsset?: FieldAssetId }>,
): {
  asset: FieldAssetId;
  x: number;
  y: number;
  w: number;
  h: number;
  visualW: number;
  visualH: number;
  hidden: boolean;
}[] {
  return Object.values(prisons).flatMap((p) => {
    const thickness = Math.max(12, Math.round(Math.min(p.w, p.h) * 0.09));
    const gateWidth = Math.max(76, Math.round(p.w * 0.48)),
      shoulder = Math.round((p.w - gateWidth) / 2);
    const wall = (x: number, y: number, w: number, h: number) => ({
      asset: p.floorAsset ?? 'prisonFloor',
      x,
      y,
      w,
      h,
      visualW: 1,
      visualH: 1,
      hidden: true,
    });
    return [
      wall(p.x, p.y, p.w, thickness),
      wall(p.x, p.y + thickness, thickness, p.h - thickness),
      wall(p.x + p.w - thickness, p.y + thickness, thickness, p.h - thickness),
      wall(p.x, p.y + p.h - thickness, shoulder, thickness),
      wall(p.x + p.w - shoulder, p.y + p.h - thickness, shoulder, thickness),
    ];
  });
}
