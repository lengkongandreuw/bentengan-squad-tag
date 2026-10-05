import type { PlayerState } from '../game-core/match-types';
import { pointHitsExpandedRect } from '../../lib/collision-navigation.js';
import {
  solidAt as studioSolidAt,
  type StudioMap,
} from '../../lib/map-studio-model.js';
import type { Obstacle } from '../world/map-data/field-types';

// Minimal player facet for obstacle recovery. Only these fields cross the seam.
type StuckPlayerFacet = {
  state: PlayerState;
  waterEnteredAt: number;
  parkourUntil: number;
  x: number;
  y: number;
};

export type ObstacleWorld = {
  studioMap: StudioMap | null;
  rects: Obstacle[];
  radius: number;
};

// True when a point hits studio solids or any expanded obstacle rect. Pure.
export const hitsObstacle = (
  x: number,
  y: number,
  world: ObstacleWorld,
): boolean =>
  (world.studioMap ? studioSolidAt(world.studioMap, x, y, world.radius) : false) ||
  world.rects.some((o) => pointHitsExpandedRect(x, y, o, world.radius));

export type FortCoreWorld = {
  kanal: boolean;
  fortRects: { x: number; y: number; w: number; h: number }[];
  bases: Record<string, { x: number; y: number }>;
  radius: number;
  minCore: number;
  fortWidth: number;
};

// True when a point sits inside a fort's solid core, whose capture circle
// stays walkable. Kanal maps test precomputed rects; others test a radius
// around each base. Pure.
export const isInsideFortCore = (
  x: number,
  y: number,
  world: FortCoreWorld,
): boolean =>
  world.kanal
    ? world.fortRects.some((rect) => pointHitsExpandedRect(x, y, rect, world.radius))
    : Object.values(world.bases).some(
        (base) =>
          Math.hypot(x - base.x, y - base.y) <
          Math.max(world.minCore, world.fortWidth * (world.kanal ? 0.48 : 0.38)),
      );

export type CollisionWorld = {
  kanal: boolean;
  collides: (x: number, y: number) => boolean;
  pushOut: (x: number, y: number) => { x: number; y: number };
};

// Pushes a stuck player out of solid geometry. Prisoners, kanal swimmers,
// and parkouring players are left alone. Mutates only x and y.
export const recoverFromObstacle = (
  p: StuckPlayerFacet,
  now: number,
  world: CollisionWorld,
): void => {
  if (
    p.state === 'PRISONER' ||
    (world.kanal && p.waterEnteredAt) ||
    now < p.parkourUntil ||
    !world.collides(p.x, p.y)
  )
    return;
  const recovered = world.pushOut(p.x, p.y);
  p.x = recovered.x;
  p.y = recovered.y;
};

export type WaterQuery = {
  hasWater: boolean;
  waterAt: (x: number, y: number) => boolean;
};

// True when water touches the point or its 30px cross-neighbors. Pure.
export const isNearWater = (x: number, y: number, query: WaterQuery): boolean =>
  query.hasWater
    ? [
        [0, 0],
        [-30, 0],
        [30, 0],
        [0, -30],
        [0, 30],
      ].some(([offsetX, offsetY]) =>
        query.waterAt(x + offsetX, y + offsetY),
      )
    : false;

// True when water touches the point or its collision-radius ring. Pure.
export const kanalWaterBlocks = (
  x: number,
  y: number,
  waterAt: (x: number, y: number) => boolean,
  radius: number,
): boolean => {
  if (waterAt(x, y)) return true;
  for (let side = 0; side < 16; side++) {
    const angle = side * Math.PI / 8;
    if (waterAt(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)) return true;
  }
  return false;
};
