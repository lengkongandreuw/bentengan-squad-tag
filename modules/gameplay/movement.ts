import type { Point, RuntimeActor, LegacyTeam } from '../../lib/game-core/types.ts';
import { clamp, distance } from '../../lib/math.ts';
import { isFlying, flightPassesObstacle } from './flight-ultimate.ts';
import { pointHitsExpandedRect } from './collision-navigation.ts';
import type { PlayerInputFrame } from '../../lib/game-core/input.ts';

export type CollisionWorld = {
  width: number;
  height: number;
  bases: Record<LegacyTeam, Point>;
  baseRadius: number;
  kanal: boolean;
  kanal2: boolean;
  obstacles: { x: number; y: number; w: number; h: number; asset: string; hidden?: boolean }[];
  studioSolidAt?: (x: number, y: number, r: number, jumping?: boolean) => boolean;
  studioFlightSolidAt?: (x: number, y: number, r: number) => boolean;
  obstacleAt?: (x: number, y: number, r: number) => boolean;
  flightObstacleAt?: (x: number, y: number, r: number) => boolean;
  waterAt: (x: number, y: number) => boolean;
  waterBlocks: (x: number, y: number) => boolean;
  fortCoreAt: (x: number, y: number) => boolean;
  fortOccupied: (team: LegacyTeam, exceptId?: string) => boolean;
  baseChargeTime: (p: RuntimeActor) => number;
  speedAt: (x: number, y: number) => number;
};
export function hitsSolid(world: CollisionWorld, x: number, y: number) {
  return (
    !!world.studioSolidAt?.(x, y, 13) ||
    (world.obstacleAt
      ? world.obstacleAt(x, y, 13)
      : world.obstacles.some((o) => pointHitsExpandedRect(x, y, o, 13)))
  );
}
export function movementBlocked(world: CollisionWorld, x: number, y: number, p: RuntimeActor, now: number) {
  if (isFlying(p))
    return (
      !!(world.studioFlightSolidAt ? world.studioFlightSolidAt(x, y, 13) : world.studioSolidAt?.(x, y, 13, true)) ||
      (world.flightObstacleAt
        ? world.flightObstacleAt(x, y, 13)
        : world.obstacles.some((o) => !flightPassesObstacle(o) && pointHitsExpandedRect(x, y, o, 13))) ||
      world.fortCoreAt(x, y)
    );
  if (world.studioSolidAt?.(x, y, 13, now < p.parkourUntil)) return true;
  if (world.kanal && world.waterBlocks(x, y)) return true;
  const entersCore = world.kanal && !world.fortCoreAt(p.x, p.y) && world.fortCoreAt(x, y);
  if (now >= p.parkourUntil && (hitsSolid(world, x, y) || entersCore)) return true;
  if (
    p.state === 'IN_BASE' &&
    p.baseCharge < world.baseChargeTime(p) &&
    distance(p, world.bases[p.team]) < world.baseRadius &&
    distance({ x, y }, world.bases[p.team]) >= world.baseRadius
  )
    return true;
  for (const team of ['blue', 'red'] as const)
    if (
      p.team !== team &&
      distance({ x, y }, world.bases[team]) < world.baseRadius &&
      distance(p, world.bases[team]) >= world.baseRadius &&
      world.fortOccupied(team, p.id)
    )
      return true;
  return false;
}
export type MovementEvent = { type: 'water-fall'; entityId: string };
export function enterWaterFall(
  world: CollisionWorld,
  p: RuntimeActor,
  now: number,
  x: number,
  y: number,
): boolean {
  if (
    !world.kanal2 ||
    p.id === '__collision_probe__' ||
    isFlying(p) ||
    p.waterEnteredAt ||
    p.state === 'PRISONER' ||
    now < p.fallSafeUntil ||
    now < p.parkourUntil
  )
    return false;
  let water = world.waterAt(x, y) ? { x, y } : null;
  for (let side = 0; !water && side < 16; side++) {
    const angle = (side * Math.PI) / 8,
      sample = { x: x + Math.cos(angle) * 13, y: y + Math.sin(angle) * 13 };
    if (world.waterAt(sample.x, sample.y)) water = sample;
  }
  if (!water) return false;
  p.x = water.x;
  p.y = water.y;
  p.lastX = p.x;
  p.lastY = p.y;
  p.vx = 0;
  p.vy = 0;
  p.action = undefined;
  p.actionUntil = 0;
  p.waterEnteredAt = now;
  p.waterFallUntil = now + 720;
  return true;
}
/** Same axis order/substeps as legacy movement; returns facts, never plays FX. */
export function moveActor(
  world: CollisionWorld,
  p: RuntimeActor,
  dx: number,
  dy: number,
  speed: number,
  dt: number,
  now: number,
): MovementEvent | null {
  if (world.kanal2 && p.waterEnteredAt) {
    p.vx = 0;
    p.vy = 0;
    return null;
  }
  const len = Math.hypot(dx, dy) || 1;
  if (!isFlying(p)) speed *= world.speedAt(p.x, p.y);
  p.vx = (dx / len) * speed;
  p.vy = (dy / len) * speed;
  if (isFlying(p)) {
    const steps = Math.max(1, Math.ceil((speed * dt) / 4));
    for (let i = 0; i < steps; i++) {
      const x = clamp(p.x + (p.vx * dt) / steps, 34, world.width - 34),
        y = clamp(p.y + (p.vy * dt) / steps, 58, world.height - 32);
      if (!movementBlocked(world, x, p.y, p, now)) p.x = x;
      if (!movementBlocked(world, p.x, y, p, now)) p.y = y;
    }
    return null;
  }
  const x = clamp(p.x + p.vx * dt, 34, world.width - 34),
    y = clamp(p.y + p.vy * dt, 58, world.height - 32);
  if (!movementBlocked(world, x, p.y, p, now)) p.x = x;
  else if (enterWaterFall(world, p, now, x, p.y)) return { type: 'water-fall', entityId: p.entityId };
  if (!movementBlocked(world, p.x, y, p, now)) p.y = y;
  else if (enterWaterFall(world, p, now, p.x, y)) return { type: 'water-fall', entityId: p.entityId };
  return null;
}
export function parkourLanding(
  world: CollisionWorld,
  p: RuntimeActor,
  direction: Point,
  nominalDistance: number,
  now: number,
) {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude < 0.01) return null;
  const ux = direction.x / magnitude,
    uy = direction.y / magnitude;
  let crossedWater = false;
  for (let d = 10; d <= Math.max(nominalDistance, 132); d += 6) {
    const x = clamp(p.x + ux * d, 34, world.width - 34),
      y = clamp(p.y + uy * d, 58, world.height - 32),
      water = world.waterAt(x, y);
    crossedWater ||= water;
    if (crossedWater && !water && d >= nominalDistance * 0.72 && !movementBlocked(world, x, y, p, now))
      return { x, y, crossedWater: true };
  }
  const x = clamp(p.x + ux * nominalDistance, 34, world.width - 34),
    y = clamp(p.y + uy * nominalDistance, 58, world.height - 32);
  return !crossedWater && !movementBlocked(world, x, y, p, now) ? { x, y, crossedWater: false } : null;
}
export function drainBoost(p: RuntimeActor, rate: number, dt: number, now: number) {
  p.boost = Math.max(0, p.boost - rate * dt);
  p.boostReadyAt = now + 20000;
}
/** Resolved vector may be a click waypoint, return route or flight steering. */
export function moveInputActor(
  world: CollisionWorld,
  p: RuntimeActor,
  input: PlayerInputFrame,
  vector: Point,
  speed: number,
  dt: number,
  now: number,
) {
  if (input.entityId !== p.entityId) throw Error('Input belongs to another entity');
  return moveActor(world, p, vector.x, vector.y, speed, dt, now);
}
