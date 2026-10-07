import type { Obstacle, Team } from '../world/map-data/field-types.ts';
import type { PlayerAction, PlayerState } from '../game-core/match-types';
import { tieHash } from '../../lib/math.ts';
import { worldX, worldY } from '../world/map-data/scalars.ts';
import {
  solidAt as studioSolidAt,
  waterAt as studioWaterAt,
  type StudioMap,
} from '../../lib/map-studio-model.js';

export type Grade = 25 | 40 | 75 | 100;

export type Refill = {
  id: number;
  x: number;
  y: number;
  grade: Grade;
  lane: 0 | 1 | 2;
  expiresAt: number;
};

export type SpawnGeometry = {
  worldWidth: number;
  obstacles: Obstacle[];
  studioMap: StudioMap | null;
};

export const spawnGeo = (
  worldWidth: number,
  obstacles: Obstacle[],
  studioMap: StudioMap | null,
): SpawnGeometry => ({ worldWidth, obstacles, studioMap });

export const randomGrade = (): Grade => {
  const roll = Math.random();
  return roll < 0.52 ? 25 : roll < 0.78 ? 40 : roll < 0.95 ? 75 : 100;
};

// Tries up to 30 placements on the least-populated lane. Pushes into refills
// on success and returns the next id; returns nextId unchanged when no free
// spot is found. Randomness comes from Math.random (stubbed in tests).
export const spawnRefill = (
  refills: Refill[],
  nextId: number,
  geo: SpawnGeometry,
  now = performance.now(),
): number => {
  const laneCounts = ([0, 1, 2] as const).map(
    (lane) => refills.filter((item) => item.lane === lane).length,
  );
  const minimum = Math.min(...laneCounts);
  const lane = laneCounts.indexOf(minimum) as 0 | 1 | 2;
  const laneBounds = [
    [worldY(92), worldY(292)],
    [worldY(300), worldY(516)],
    [worldY(524), worldY(712)],
  ] as const;
  for (let tries = 0; tries < 30; tries++) {
    const x = worldX(236) + Math.random() * (geo.worldWidth - worldX(472)),
      y =
        laneBounds[lane][0] +
        Math.random() * (laneBounds[lane][1] - laneBounds[lane][0]);
    if (
      (!geo.studioMap || (!studioSolidAt(geo.studioMap, x, y, 28) && !studioWaterAt(geo.studioMap, x, y))) &&
      geo.obstacles.every(
        (o) =>
          x < o.x - 28 ||
          x > o.x + o.w + 28 ||
          y < o.y - 28 ||
          y > o.y + o.h + 28,
      )
    ) {
      refills.push({
        id: nextId + 1,
        x,
        y,
        grade: randomGrade(),
        lane,
        expiresAt: now + 25000,
      });
      return nextId + 1;
    }
  }
  return nextId;
};

export const tickRefills = (
  refills: Refill[],
  nextId: number,
  nextSpawn: number,
  geo: SpawnGeometry,
  now: number,
): { refills: Refill[]; nextId: number; nextSpawn: number } => {
  const kept = refills.filter((item) => item.expiresAt > now);
  if (now >= nextSpawn && kept.length < 9) {
    const spawned = spawnRefill(kept, nextId, geo, now);
    return { refills: kept, nextId: spawned, nextSpawn: now + 8000 + Math.random() * 4000 };
  }
  return { refills: kept, nextId, nextSpawn };
};

// Fresh six-pack for match setup and round reset.
export const seedRefills = (
  geo: SpawnGeometry,
  now: number = performance.now(),
): { refills: Refill[]; nextId: number } => {
  const refills: Refill[] = [];
  let nextId = 0;
  for (let i = 0; i < 6; i++) nextId = spawnRefill(refills, nextId, geo, now);
  return { refills, nextId };
};

// Minimal player facet for fall resets. Mutated fields are exactly the ones
// reset below; read fields drive placement and effect gating.
export type FallenPlayerFacet = {
  id: string;
  team: Team;
  controlled?: boolean;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  vx: number;
  vy: number;
  state: PlayerState;
  exitOrder: number;
  baseCharge: number;
  exitDeadline: number;
  fortCharge: number;
  parkourUntil: number;
  action?: PlayerAction;
  actionUntil: number;
  fallSafeUntil: number;
  fallNoticeUntil: number;
  waterEnteredAt: number;
  waterFallUntil: number;
};

export type FallResetEffects = {
  bursts: Array<{ x: number; y: number; color: string; count: number }>;
  beeps: Array<{ frequency: number; duration: number }>;
  logs: string[];
};

// Returns a fallen player to its base spawn. Mutates position, motion,
// match, and fall-timer fields; returns bursts, beeps, and log lines
// (controlled players only) for the orchestrator to apply.
export const resetFallenPlayer = (
  p: FallenPlayerFacet,
  round: number,
  base: { x: number; y: number },
  now: number,
): FallResetEffects => {
  const side = p.team === 'blue' ? 1 : -1;
  const lane = (tieHash(round, p.id) % 5) - 2;
  p.x = base.x + side * 24;
  p.y = base.y + lane * 17;
  p.lastX = p.x;
  p.lastY = p.y;
  p.vx = 0;
  p.vy = 0;
  p.state = 'IN_BASE';
  p.exitOrder = 0;
  p.baseCharge = 0;
  p.exitDeadline = 0;
  p.fortCharge = 0;
  p.parkourUntil = 0;
  p.action = undefined;
  p.actionUntil = 0;
  p.fallSafeUntil = now + 1800;
  p.fallNoticeUntil = now + 1500;
  p.waterEnteredAt = 0;
  p.waterFallUntil = 0;
  const effects: FallResetEffects = {
    bursts: [{ x: p.x, y: p.y, color: '#60e6ff', count: 14 }],
    beeps: [],
    logs: [],
  };
  if (p.controlled) {
    effects.beeps.push({ frequency: 210, duration: 0.16 });
    effects.logs.push('OOOPSS... HATI-HATI · kembali ke benteng.');
  }
  return effects;
};
