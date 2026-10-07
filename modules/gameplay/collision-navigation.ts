import type { PlayerState } from '../game-core/match-types';
import type { Team } from '../world/map-data/field-types';
import type { Obstacle } from '../world/map-data/field-types';
import type { CharacterId } from '../../lib/characters';
import { clamp, distance, tieHash } from '../../lib/math.ts';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { clickRoute } from './click-navigation.ts';
import {
  contains as studioContains,
  solidAt as studioSolidAt,
  waterAt as studioWaterAt,
  type StudioMap,
} from '../../lib/map-studio-model.js';

export type ParkourProbe = {
  isWaterAt: (x: number, y: number) => boolean;
  isBlocked: (x: number, y: number) => boolean;
  worldWidth: number;
  worldHeight: number;
};

// First dry landing past water along a direction, or a nearby dry fallback.
// Returns the landing with a crossedWater flag, or null when no dry ground
// qualifies. Pure apart from the two injected predicates.
export const findParkourLanding = (
  from: { x: number; y: number },
  direction: { x: number; y: number },
  nominalDistance: number,
  probe: ParkourProbe,
): { x: number; y: number; crossedWater: boolean } | null => {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude < 0.01) return null;
  const unitX = direction.x / magnitude;
  const unitY = direction.y / magnitude;
  const maximumDistance = Math.max(nominalDistance, 132);
  let crossedWater = false;
  for (let distanceAlong = 10; distanceAlong <= maximumDistance; distanceAlong += 6) {
    const x = clamp(from.x + unitX * distanceAlong, 34, probe.worldWidth - 34);
    const y = clamp(from.y + unitY * distanceAlong, 58, probe.worldHeight - 32);
    const water = probe.isWaterAt(x, y);
    crossedWater ||= water;
    if (
      crossedWater &&
      !water &&
      distanceAlong >= nominalDistance * 0.72 &&
      !probe.isBlocked(x, y)
    )
      return { x, y, crossedWater: true };
  }
  const x = clamp(from.x + unitX * nominalDistance, 34, probe.worldWidth - 34);
  const y = clamp(from.y + unitY * nominalDistance, 58, probe.worldHeight - 32);
  if (!crossedWater && !probe.isBlocked(x, y))
    return { x, y, crossedWater: false };
  return null;
};

// Minimal player facet for movement blocking. Only these fields cross the seam.
type BlockedPlayerFacet = {
  id: string;
  team: Team;
  state: PlayerState;
  characterId: string;
  baseCharge: number;
  parkourUntil: number;
  x: number;
  y: number;
};

export type BlockedWorld = {
  kanal: boolean;
  studioSolidAt: (x: number, y: number, jumping: boolean) => boolean;
  waterBlocksAt: (x: number, y: number) => boolean;
  fortCoreAt: (x: number, y: number) => boolean;
  obstacleAt: (x: number, y: number) => boolean;
  waterAt: (x: number, y: number) => boolean;
  chargeTimeOf: (characterId: string) => number;
  bases: Record<Team, { x: number; y: number }>;
  baseRadius: number;
  occupantAt: (team: Team, exceptId: string) => boolean;
};

// True when a candidate position is blocked for a player. Pure apart from
// the injected world predicates. Order matches HEAD exactly: studio, kanal
// water ring, fort-core entry, obstacle, home-base charge gate, occupied
// enemy fort entry.
export const isBlocked = (
  x: number,
  y: number,
  p: BlockedPlayerFacet & { characterId: string },
  now: number,
  world: BlockedWorld,
): boolean => {
  if (world.studioSolidAt(x, y, now < p.parkourUntil)) return true;
  if (world.kanal && world.waterBlocksAt(x, y)) return true;
  const entersFortCore =
    world.kanal && !world.fortCoreAt(p.x, p.y) && world.fortCoreAt(x, y);
  if (now >= p.parkourUntil && (world.obstacleAt(x, y) || entersFortCore))
    return true;
  if (
    p.state === 'IN_BASE' &&
    p.baseCharge < world.chargeTimeOf(p.characterId) &&
    distance(p, world.bases[p.team]) < world.baseRadius &&
    distance({ x, y }, world.bases[p.team]) >= world.baseRadius
  )
    return true;
  for (const team of ['blue', 'red'] as Team[]) {
    const entering =
      distance({ x, y }, world.bases[team]) < world.baseRadius &&
      distance(p, world.bases[team]) >= world.baseRadius;
    if (entering && p.team !== team && world.occupantAt(team, p.id))
      return true;
  }
  return false;
};

// Minimal player facet for axis movement. Only these fields cross the seam.
type MovingPlayerFacet = {
  waterEnteredAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type MoveWorld = {
  kanalSwim: boolean;
  speedAt: (x: number, y: number, speed: number) => number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  isBlocked: (x: number, y: number, now: number) => boolean;
  onWaterFall: (x: number, y: number, now: number) => boolean;
};

// Axis-separated stepper: advance x then y, each gated by the injected
// blocker with a water-fall escape. Mutates position and velocity only.
export const movePlayer = (
  p: MovingPlayerFacet,
  dx: number,
  dy: number,
  speed: number,
  dt: number,
  now: number,
  world: MoveWorld,
): void => {
  if (world.kanalSwim) {
    p.vx = 0;
    p.vy = 0;
    return;
  }
  const len = Math.hypot(dx, dy) || 1;
  const paced = world.speedAt(p.x, p.y, speed);
  p.vx = (dx / len) * paced;
  p.vy = (dy / len) * paced;
  const nx = clamp(p.x + p.vx * dt, world.bounds.minX, world.bounds.maxX),
    ny = clamp(p.y + p.vy * dt, world.bounds.minY, world.bounds.maxY);
  if (!world.isBlocked(nx, p.y, now)) p.x = nx;
  else if (world.onWaterFall(nx, p.y, now)) return;
  if (!world.isBlocked(p.x, ny, now)) p.y = ny;
  else world.onWaterFall(p.x, ny, now);
};

export type TraverseProbe = {
  isBlocked: (x: number, y: number, now: number) => boolean;
  isWaterAt: (x: number, y: number) => boolean;
};

// True when the straight ray from a player along a direction is clear for
// the probe distance. Samples at least 5 points; any blocked or wet sample
// fails. Pure apart from the two injected predicates.
export const directionIsTraversable = (
  from: { x: number; y: number },
  direction: { x: number; y: number },
  distanceToProbe: number,
  now: number,
  probe: TraverseProbe,
): boolean => {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude < 0.01) return true;
  const unitX = direction.x / magnitude;
  const unitY = direction.y / magnitude;
  const samples = Math.max(5, Math.ceil(distanceToProbe / 14));
  for (let step = 1; step <= samples; step += 1) {
    const distanceAlong = (distanceToProbe * step) / samples;
    const x = from.x + unitX * distanceAlong;
    const y = from.y + unitY * distanceAlong;
    if (probe.isBlocked(x, y, now) || probe.isWaterAt(x, y)) return false;
  }
  return true;
};

// Vector from a player to its own base. Pure geometry for RETURNING bots.
export const baseVector = (
  p: { team: Team; x: number; y: number },
  bases: Record<Team, { x: number; y: number }>,
): { x: number; y: number } => ({
  x: bases[p.team].x - p.x,
  y: bases[p.team].y - p.y,
});

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

// Minimal player facet for spawn-spacing checks. Only these fields cross the seam.
type SpacingPlayerFacet = {
  state: PlayerState;
  baseCharge: number;
  baseChargeTime: number;
  x: number;
  y: number;
};

export type SpacingWorld = {
  kanal: boolean;
  waterBlocksAt: (x: number, y: number) => boolean;
  waterAt: (x: number, y: number) => boolean;
  fortCoreAt: (x: number, y: number) => boolean;
  obstacleAt: (x: number, y: number) => boolean;
  homeBase: { x: number; y: number };
  baseRadius: number;
};

// True when a player may occupy a candidate spawn position. Pure:
// kanal water-ring + fort core, direct water/obstacle, and undercharged
// IN_BASE players leaving their home radius are all rejected.
export const spacingPositionAllowed = (
  p: SpacingPlayerFacet,
  x: number,
  y: number,
  world: SpacingWorld,
): boolean => {
  if (world.kanal && (world.waterBlocksAt(x, y) || (!world.fortCoreAt(p.x, p.y) && world.fortCoreAt(x, y))))
    return false;
  if ((world.kanal && world.waterAt(x, y)) || world.obstacleAt(x, y)) return false;
  if (
    p.state === 'IN_BASE' &&
    p.baseCharge < p.baseChargeTime &&
    distance({ x, y }, world.homeBase) >= world.baseRadius
  )
    return false;
  return true;
};

// Player entry for overlap resolution. Player satisfies this.
type SpacedPlayerFacet = {
  id: string;
  team: Team;
  characterId: CharacterId;
  state: PlayerState;
  baseCharge: number;
  waterEnteredAt: number;
  x: number;
  y: number;
};

export type SpacingResolveWorld = {
  players: SpacedPlayerFacet[];
  kanal: boolean;
  round: number;
  worldWidth: number;
  worldHeight: number;
  waterBlocksAt: (x: number, y: number) => boolean;
  waterAt: (x: number, y: number) => boolean;
  fortCoreAt: (x: number, y: number) => boolean;
  obstacleAt: (x: number, y: number) => boolean;
  bases: Record<Team, { x: number; y: number }>;
  baseRadius: number;
  onRecover: (p: SpacedPlayerFacet, now: number) => void;
};

// Pushes overlapping visible players apart (42px when both in base, 30px
// otherwise), rejecting moves the spacing rules forbid, then runs obstacle
// recovery on every visible player. Mutates x/y only. HEAD numbers moved
// verbatim.
export const resolvePlayerSpacing = (
  now: number,
  world: SpacingResolveWorld,
): void => {
  const visible = world.players.filter(
    (p) => p.state !== 'PRISONER' && !(world.kanal && p.waterEnteredAt),
  );
  const allowedFor = (p: SpacedPlayerFacet) => ({
    player: {
      state: p.state,
      baseCharge: p.baseCharge,
      baseChargeTime: CHARACTER_BY_ID[p.characterId].baseChargeTime,
      x: p.x,
      y: p.y,
    },
    world: {
      kanal: world.kanal,
      waterBlocksAt: world.waterBlocksAt,
      waterAt: world.waterAt,
      fortCoreAt: world.fortCoreAt,
      obstacleAt: world.obstacleAt,
      homeBase: world.bases[p.team],
      baseRadius: world.baseRadius,
    },
  });
  for (let i = 0; i < visible.length; i++)
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i],
        b = visible[j];
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy);
      const minimum =
        a.state === 'IN_BASE' && b.state === 'IN_BASE' ? 42 : 30;
      if (d >= minimum) continue;
      const nx = d > 0.01 ? dx / d : tieHash(world.round, a.id) % 2 ? 1 : -1,
        ny = d > 0.01 ? dy / d : 0;
      const push = (minimum - d) * 0.52;
      const ax = clamp(a.x - nx * push, 34, world.worldWidth - 34),
        ay = clamp(a.y - ny * push, 58, world.worldHeight - 32);
      const bx = clamp(b.x + nx * push, 34, world.worldWidth - 34),
        by = clamp(b.y + ny * push, 58, world.worldHeight - 32);
      const allowedA = allowedFor(a);
      if (spacingPositionAllowed(allowedA.player, ax, ay, allowedA.world)) {
        a.x = ax;
        a.y = ay;
      }
      const allowedB = allowedFor(b);
      if (spacingPositionAllowed(allowedB.player, bx, by, allowedB.world)) {
        b.x = bx;
        b.y = by;
      }
    }
  visible.forEach((p) => world.onRecover(p, now));
};

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

export type HazardsWorld = {
  studioMap: StudioMap | null;
  worldWidth: number;
  worldHeight: number;
  radius: number;
  traversableAt: (from: { x: number; y: number }, direction: { x: number; y: number }, probe: number, now: number) => boolean;
  studioSolidAt: (x: number, y: number) => boolean;
  studioWaterAt: (x: number, y: number) => boolean;
  rects: { x: number; y: number; w: number; h: number }[];
  cache: Map<string, { target: { x: number; y: number }; route: Array<{ x: number; y: number }>; until: number }>;
};

// Steer a desired velocity around hazards. Studio maps use a cached A*
// route; otherwise probe the desired heading, eight angled candidates, then
// a rect-steering fallback. Pure apart from the injected world predicates
// and the route cache it threads through.
export const navigateAroundHazards = (
  from: { x: number; y: number; id: string },
  desired: { x: number; y: number },
  now: number,
  probeDistance: number,
  turnBias: number,
  world: HazardsWorld,
): { x: number; y: number } => {
  if (world.studioMap) {
    const target = { x: clamp(from.x + desired.x, 34, world.worldWidth - 34), y: clamp(from.y + desired.y, 58, world.worldHeight - 32) };
    const passable = (x: number, y: number) =>
      x >= 34 && y >= 58 && x <= world.worldWidth - 34 && y <= world.worldHeight - 32 &&
      !world.studioSolidAt(x, y) && !world.studioWaterAt(x, y);
    const cached = world.cache.get(from.id);
    if (!cached || now > cached.until || distance(target, cached.target) > 100) {
      const route = clickRoute(from, target, world.worldWidth, world.worldHeight, passable, 40);
      world.cache.set(from.id, { target, route, until: now + 1800 });
    }
    const route = world.cache.get(from.id)!.route;
    while (route.length && distance(from, route[0]) < 18) route.shift();
    if (route[0]) return { x: route[0].x - from.x, y: route[0].y - from.y };
  }
  const magnitude = Math.hypot(desired.x, desired.y);
  if (magnitude < 0.01) return desired;
  const distanceToProbe = Math.min(probeDistance, Math.max(48, magnitude));
  const traversable = (direction: { x: number; y: number }) =>
    world.traversableAt(from, direction, distanceToProbe, now);
  if (traversable(desired)) return desired;
  const baseAngle = Math.atan2(desired.y, desired.x);
  const side = turnBias >= 0 ? 1 : -1;
  for (const offset of [0.38, -0.38, 0.7, -0.7, 1.02, -1.02, 1.42, -1.42]) {
    const angle = baseAngle + offset * side;
    const candidate = {
      x: Math.cos(angle) * magnitude,
      y: Math.sin(angle) * magnitude,
    };
    if (traversable(candidate)) return candidate;
  }
  const fallback = steerAroundRects(
    from,
    desired,
    world.rects,
    world.radius,
    probeDistance,
    turnBias,
  );
  return traversable(fallback) ? fallback : { x: 0, y: 0 };
};

export type NavigationWorld = {
  studioMap: StudioMap | null;
  worldWidth: number;
  worldHeight: number;
  radius: number;
  isBlocked: (x: number, y: number, p: BlockedPlayerFacet, now: number) => boolean;
  isWaterAt: (x: number, y: number) => boolean;
  rects: { x: number; y: number; w: number; h: number }[];
  cache: Map<string, { target: { x: number; y: number }; route: Array<{ x: number; y: number }>; until: number }>;
};

export const navigateAroundHazardsForPlayer = (
  p: BlockedPlayerFacet,
  desired: { x: number; y: number },
  now: number,
  probeDistance: number,
  turnBias: number,
  world: NavigationWorld,
): { x: number; y: number } => {
  const studioRoutes = world.cache;
  const traversableAt = (
    from: { x: number; y: number },
    direction: { x: number; y: number },
    probe: number,
    t: number,
  ) =>
    directionIsTraversable(from, direction, probe, t, {
      isBlocked: (x, y, u) => world.isBlocked(x, y, p, u),
      isWaterAt: (x, y) => world.isWaterAt(x, y),
    });
  return navigateAroundHazards(
    { x: p.x, y: p.y, id: p.id },
    desired,
    now,
    probeDistance,
    turnBias,
    {
      studioMap: world.studioMap,
      worldWidth: world.worldWidth,
      worldHeight: world.worldHeight,
      radius: world.radius,
      traversableAt,
      studioSolidAt: (x, y) =>
        world.studioMap ? studioSolidAt(world.studioMap, x, y, world.radius) : false,
      studioWaterAt: (x, y) =>
        world.studioMap ? studioWaterAt(world.studioMap, x, y) : false,
      rects: world.rects,
      cache: studioRoutes,
    },
  );
};

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

export type ParkourJumpPlayer = {
  state: PlayerState;
  waterEnteredAt: number;
  x: number;
  y: number;
  boost: number;
  parkourUntil: number;
  fallSafeUntil: number;
  boostReadyAt: number;
};

export type ParkourJumpWorld = {
  parkourKey: boolean;
  parkourLatch: boolean;
  agility: number;
  isKanal: boolean;
  obstacles: Obstacle[];
  hasWater: boolean;
  waterAt: (x: number, y: number) => boolean;
  studioMap: StudioMap | null;
  findLanding: (
    direction: { x: number; y: number },
    nominalDistance: number,
  ) => { x: number; y: number; crossedWater: boolean } | null;
  onMissionParkour: () => void;
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onTone: (frequency: number) => void;
};

// Shift-parkour jump: key/latch/budget gates, proximity probe (obstacles,
// water edge, studio parkour objects), then the adaptive landing snap.
// Head thresholds verbatim (44px probe ring, 54·agility reach, 360ms
// cooldown, 620/430ms fall-safe, 20s boost-ready). Mutates position,
// timers, and boost on success.
export const tryParkourJump = (
  me: ParkourJumpPlayer,
  dx: number,
  dy: number,
  now: number,
  world: ParkourJumpWorld,
): void => {
  const parkourCost = 8 / world.agility;
  if (
    !world.parkourKey ||
    world.parkourLatch ||
    me.boost < parkourCost ||
    now <= me.parkourUntil ||
    (world.isKanal && me.waterEnteredAt) ||
    (!dx && !dy) ||
    (me.state !== 'ACTIVE' && me.state !== 'IN_BASE')
  )
    return;
  const near =
    world.obstacles.some(
      (o) =>
        me.x + 44 > o.x &&
        me.x - 44 < o.x + o.w &&
        me.y + 44 > o.y &&
        me.y - 44 < o.y + o.h,
    ) ||
    isNearWater(me.x, me.y, {
      hasWater: world.hasWater,
      waterAt: world.waterAt,
    }) ||
    !!world.studioMap?.objects.some(
      (o) =>
        o.behavior === 'parkour' &&
        studioContains(
          { ...o, x: o.x - 40, y: o.y - 40, w: o.w + 80, h: o.h + 80 },
          me.x,
          me.y,
        ),
    );
  if (!near) return;
  const parkourDistance = 54 * world.agility;
  const landing = world.findLanding({ x: dx, y: dy }, parkourDistance);
  if (!landing) return;
  me.parkourUntil = now + 360;
  me.fallSafeUntil = now + (landing.crossedWater ? 620 : 430);
  me.boost = Math.max(0, me.boost - parkourCost);
  me.boostReadyAt = now + 20000;
  me.x = landing.x;
  me.y = landing.y;
  world.onMissionParkour();
  world.onBurst(me.x, me.y, landing.crossedWater ? '#65e9ff' : '#f4df9a', 9);
  world.onTone(460);
};

// --- Low-level navigation primitives (moved verbatim from
// lib/collision-navigation.js as part of R10 lib purity). ---

type NavVec = { x: number; y: number };
type NavRect = { x: number; y: number; w: number; h: number };
type NavBounds = { minX: number; maxX: number; minY: number; maxY: number };

const DEFAULT_BOUNDS: NavBounds = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };

export const pointHitsExpandedRect = (
  x: number,
  y: number,
  rect: NavRect,
  radius = 13,
): boolean =>
  x > rect.x - radius && x < rect.x + rect.w + radius &&
  y > rect.y - radius && y < rect.y + rect.h + radius;

export const depenetrateFromRects = (
  position: NavVec,
  rects: NavRect[],
  radius = 13,
  bounds: NavBounds = DEFAULT_BOUNDS,
): { x: number; y: number } => {
  let x = position.x;
  let y = position.y;
  const epsilon = .25;
  const maxPasses = Math.max(4, rects.length * 2);

  for (let pass = 0; pass < maxPasses; pass++) {
    const rect = rects.find(item => pointHitsExpandedRect(x, y, item, radius));
    if (!rect) break;

    const left = rect.x - radius;
    const right = rect.x + rect.w + radius;
    const top = rect.y - radius;
    const bottom = rect.y + rect.h + radius;
    const exits = [
      { distance: Math.abs(x - left), x: left - epsilon, y },
      { distance: Math.abs(right - x), x: right + epsilon, y },
      { distance: Math.abs(y - top), x, y: top - epsilon },
      { distance: Math.abs(bottom - y), x, y: bottom + epsilon },
    ].sort((a, b) => a.distance - b.distance);
    x = Math.max(bounds.minX, Math.min(bounds.maxX, exits[0].x));
    y = Math.max(bounds.minY, Math.min(bounds.maxY, exits[0].y));
  }

  return { x, y };
};

const pathIsClear = (
  position: NavVec,
  direction: NavVec,
  distance: number,
  rects: NavRect[],
  radius: number,
): boolean => {
  for (let step = 1; step <= 4; step++) {
    const t = step / 4;
    if (rects.some(rect => pointHitsExpandedRect(
      position.x + direction.x * distance * t,
      position.y + direction.y * distance * t,
      rect,
      radius,
    ))) return false;
  }
  return true;
};

export const steerAroundRects = (
  position: NavVec,
  vector: NavVec,
  rects: NavRect[],
  radius = 13,
  probeDistance = 82,
  turnBias = 1,
): NavVec => {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < .001) return vector;
  const direction = { x: vector.x / magnitude, y: vector.y / magnitude };
  if (pathIsClear(position, direction, probeDistance, rects, radius)) return vector;

  const bias = turnBias < 0 ? -1 : 1;
  const angles = [bias * .5, -bias * .5, bias * .9, -bias * .9, bias * 1.3, -bias * 1.3];
  for (const angle of angles) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const candidate = {
      x: direction.x * cos - direction.y * sin,
      y: direction.x * sin + direction.y * cos,
    };
    if (pathIsClear(position, candidate, probeDistance, rects, radius)) {
      return { x: candidate.x * magnitude, y: candidate.y * magnitude };
    }
  }

  return { x: -direction.y * magnitude * bias, y: direction.x * magnitude * bias };
};

export const segmentHitsRect = (a: NavVec, b: NavVec, o: NavRect): boolean => {
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps,
      x = a.x + (b.x - a.x) * t,
      y = a.y + (b.y - a.y) * t;
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h)
      return true;
  }
  return false;
};

export const hasLineOfSight = (
  a: NavVec,
  b: NavVec,
  rects: NavRect[],
  studio: StudioMap | null,
): boolean => {
  if (rects.some((o) => segmentHitsRect(a, b, o))) return false;
  if (studio) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    for (let i = 0; i <= steps; i++) {
      if (studioSolidAt(studio, a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, 2)) return false;
    }
  }
  return true;
};
