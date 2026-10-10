import type { RuntimeActor, Point } from '../../lib/game-core/types.ts';
export const PARKOUR_INPUT_BUFFER_MS = 180;
export const PARKOUR_ANIMATION_MS = 360;
export const PARKOUR_COOLDOWN_MS = 3000;
// Reuse the authoritative, already-synchronized jump timestamp. Cooldown must
// not extend the animation or tag protection, and does not need another timer.
export function parkourCooldownRemaining(
  p: Pick<RuntimeActor, 'parkourUntil'>,
  now: number,
) {
  return p.parkourUntil > 0
    ? Math.max(
        0,
        p.parkourUntil - PARKOUR_ANIMATION_MS + PARKOUR_COOLDOWN_MS - now,
      )
    : 0;
}
export type ParkourReason = 'ready' | 'locked' | 'cooldown' | 'boost' | 'route';
export type ParkourLanding = { x: number; y: number; crossedWater: boolean };
type FindLanding = (
  p: RuntimeActor,
  direction: Point,
  distance: number,
  now: number,
) => ParkourLanding | null;
export const parkourReasonText: Record<ParkourReason, string> = {
  ready: 'Parkour siap',
  locked: 'Parkour belum tersedia saat ini',
  cooldown: 'Parkour dalam cooldown',
  boost: 'Boost belum cukup untuk parkour',
  route: 'Tidak ada tempat mendarat yang aman',
};
export function evaluateParkour(
  p: RuntimeActor,
  direction: Point,
  agility: number,
  now: number,
  find: FindLanding,
) {
  const cost = 8 / agility;
  if (
    !['ACTIVE', 'IN_BASE'].includes(p.state) ||
    p.flight ||
    p.waterEnteredAt ||
    (p.action === 'ultimate' && now < p.actionUntil)
  )
    return { reason: 'locked' as const, cost, landing: null };
  if (parkourCooldownRemaining(p, now) > 0)
    return { reason: 'cooldown' as const, cost, landing: null };
  if (p.boost < cost) return { reason: 'boost' as const, cost, landing: null };
  const landing = find(p, direction, 54 * agility, now);
  return {
    reason: landing ? ('ready' as const) : ('route' as const),
    cost,
    landing,
  };
}
export function createParkourController() {
  const actors = new Map<
    string,
    { held: boolean; pending: number; direction: Point }
  >();
  const entry = (id: string) => {
    let state = actors.get(id);
    if (!state) {
      state = { held: false, pending: -Infinity, direction: { x: 0, y: 1 } };
      actors.set(id, state);
    }
    return state;
  };
  return {
    direction: (id: string) => entry(id).direction,
    remember(id: string, direction: Point) {
      if (Math.hypot(direction.x, direction.y) > 0.01)
        entry(id).direction = { ...direction };
    },
    reset() {
      actors.clear();
    },
    step(
      p: RuntimeActor,
      held: boolean,
      pulse: boolean | undefined,
      direction: Point,
      agility: number,
      now: number,
      find: FindLanding,
    ) {
      const state = entry(p.entityId);
      if (Math.hypot(direction.x, direction.y) > 0.01)
        state.direction = { ...direction };
      if (pulse || (held && !state.held))
        state.pending = now + PARKOUR_INPUT_BUFFER_MS;
      state.held = held;
      const requested = state.pending >= now;
      // Do not sweep collider geometry on every idle simulation tick.
      const result = requested
        ? evaluateParkour(p, state.direction, agility, now, find)
        : { reason: 'route' as const, cost: 8 / agility, landing: null };
      if (requested && result.reason === 'ready' && result.landing) {
        const landing = result.landing;
        state.pending = -Infinity;
        p.x = landing.x;
        p.y = landing.y;
        p.parkourUntil = now + PARKOUR_ANIMATION_MS;
        p.fallSafeUntil = now + (landing.crossedWater ? 620 : 430);
        p.boost = Math.max(0, p.boost - result.cost);
        p.boostReadyAt = now + 20000;
        return { ...result, performed: true, requested: true };
      }
      if (result.reason === 'locked' || result.reason === 'cooldown')
        state.pending = -Infinity;
      return { ...result, performed: false, requested };
    },
  };
}
