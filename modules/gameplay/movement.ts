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
  parkourSolidAt?: (x: number, y: number, r: number) => boolean;
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
export function movementBlocked(world: CollisionWorld, x: number, y: number, p: RuntimeActor, _now: number) {
  if (isFlying(p))
    return (
      !!(world.studioFlightSolidAt ? world.studioFlightSolidAt(x, y, 13) : world.studioSolidAt?.(x, y, 13, true)) ||
      (world.flightObstacleAt
        ? world.flightObstacleAt(x, y, 13)
        : world.obstacles.some((o) => !flightPassesObstacle(o) && pointHitsExpandedRect(x, y, o, 13))) ||
      world.fortCoreAt(x, y)
    );
  if (world.studioSolidAt?.(x, y, 13, false)) return true;
  if (world.kanal && world.waterBlocks(x, y)) return true;
  const entersCore = world.kanal && !world.fortCoreAt(p.x, p.y) && world.fortCoreAt(x, y);
  if (hitsSolid(world, x, y) || entersCore) return true;
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
export const PARKOUR_LOW_ASSETS=new Set(['bucket','bush','crates','drain','trash','plant','plantFence','flowerBedSmall','flowerFence','parkBarrier','parkFlowerFence','parkFlowerFenceLong','parkPlanterLong','map2BarrierGreen','map2BarrierRed','map2PlanterGreen','map2PlanterRed','canalBarrier','canalBarrierLong','kanalNusaBarrier','kanalNusaPlanterLong','kanalNusaPlanterOval']);
export const parkourPassesObstacle=(o:CollisionWorld['obstacles'][number])=>PARKOUR_LOW_ASSETS.has(o.asset);
// Explicit river allowance, scaled by agility. Water must start on the normal
// vault path near the actor; distant water cannot extend an unrelated vault.
export const PARKOUR_WATER_BASE_REACH=132;
export function parkourLanding(world:CollisionWorld,p:RuntimeActor,direction:Point,nominalDistance:number,now:number) {
  const magnitude=Math.hypot(direction.x,direction.y);if(magnitude<.01||nominalDistance<=0)return null;
  const ux=direction.x/magnitude,uy=direction.y/magnitude;
  const waterReach=PARKOUR_WATER_BASE_REACH*(nominalDistance/54);
  let crossedWater=false,context=false;
  const hardAt=(x:number,y:number)=>!!world.studioSolidAt?.(x,y,13,true)||
    (world.parkourSolidAt?world.parkourSolidAt(x,y,13):world.obstacles.some(o=>!parkourPassesObstacle(o)&&pointHitsExpandedRect(x,y,o,13)))||
    (world.kanal&&world.fortCoreAt(x,y));
  const max=Math.max(nominalDistance,waterReach);
  for(let d=2;d<=max+2;d+=2){
    const step=Math.min(d,crossedWater?max:nominalDistance),x=p.x+ux*step,y=p.y+uy*step;
    if(x<34||x>world.width-34||y<58||y>world.height-32||hardAt(x,y))return null;
    // Never vault out of an unprepared fort or through an occupied enemy fort.
    if(p.state==='IN_BASE'&&p.baseCharge<world.baseChargeTime(p)&&distance({x,y},world.bases[p.team])>=world.baseRadius)return null;
    for(const team of ['blue','red'] as const)if(p.team!==team&&distance({x,y},world.bases[team])<world.baseRadius&&world.fortOccupied(team,p.id))return null;
    const water=world.waterAt(x,y);
    if(step<=44&&water)context=true;
    if(water){if(!context)return null;crossedWater=true;}
    if(crossedWater&&context&&!water&&step>=nominalDistance*.72&&!world.waterBlocks(x,y)&&!movementBlocked(world,x,y,p,now))return {x,y,crossedWater:true};
    // A clear ground path is a valid free jump; no nearby collider is required.
    if(!crossedWater&&step>=nominalDistance)return !movementBlocked(world,x,y,p,now)?{x,y,crossedWater:false}:null;
  }
  return null;
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
