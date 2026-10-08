// Moved verbatim from lib/flight-ultimate.js (R10); typed, no behavior change.
import { spriteDirection } from '../../lib/sprite-studio-model.js';

export type FlightConfig = {
  enabled: boolean;
  flightDuration: number;
  ignoreParkourCollider: boolean;
  tagImmuneWhileFlying: boolean;
  disableGameplayInteractions: boolean;
  visualHeight: number;
  takeoffAnimation: string;
  flyingAnimation: string;
  landingAnimation: string;
  speedMultiplier: number;
  turnMultiplier: number;
  takeoffSeconds: number;
  landingSeconds: number;
  icon: string;
};
export type Flight = {
  stage: string;
  elapsed: number;
  remaining: number;
  heading: number;
  headingSet: boolean;
  direction: string;
  lastGround: { x: number; y: number };
  warning: boolean;
  distance: number;
};
export type FlightHooks = {
  onFlightStart?: () => void;
  onFlightWarning?: () => void;
  onSafeLanding?: () => void;
  onFlightLanding?: () => void;
  onFlightEnd?: () => void;
};

const shared = {
  enabled: true,
  flightDuration: 4,
  ignoreParkourCollider: true,
  tagImmuneWhileFlying: true,
  disableGameplayInteractions: true,
  visualHeight: 24,
  takeoffAnimation: 'ultimate_takeoff',
  flyingAnimation: 'ultimate_fly',
  landingAnimation: 'ultimate_land',
};
export const FLIGHT_CONFIG = Object.freeze({
  bebe: Object.freeze({
    ...shared,
    speedMultiplier: 1.25,
    turnMultiplier: 0.85,
    takeoffSeconds: 0.7,
    landingSeconds: 0.4,
    icon: 'ui-v2/ultimate/bebe.png',
  }),
  ciici: Object.freeze({
    ...shared,
    speedMultiplier: 1.2,
    turnMultiplier: 1.15,
    takeoffSeconds: 0.65,
    landingSeconds: 0.35,
    icon: 'ui-v2/ultimate/ciici.png',
  }),
});
export const flightConfig = (id: string): FlightConfig | null =>
  FLIGHT_CONFIG[id as keyof typeof FLIGHT_CONFIG] ?? null;
export const isFlying = (p: { flight?: { stage?: string } | null }) =>
  p.flight?.stage === 'FLYING';
export const flightBusy = (p: { flight?: unknown }) => !!p.flight;
export const flightSlot = (
  f: { stage?: string } | null | undefined,
  config: Pick<FlightConfig, 'takeoffAnimation' | 'flyingAnimation' | 'landingAnimation'> = shared,
): string | null =>
  f?.stage === 'FLIGHT_TAKEOFF'
    ? config.takeoffAnimation
    : f?.stage === 'FLYING'
      ? config.flyingAnimation
      : f?.stage === 'FLIGHT_LANDING'
        ? config.landingAnimation
        : null;
export const sequenceComplete = (
  clip: { frames: Array<unknown>; fps: number } | null | undefined,
  elapsedMs: number,
  fallbackSeconds: number,
): boolean =>
  elapsedMs >=
  (clip ? (clip.frames.length / clip.fps) * 1000 : fallbackSeconds * 1000);
export function startFlight(position: {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}): Flight {
  return {
    stage: 'FLIGHT_TAKEOFF',
    elapsed: 0,
    remaining: 0,
    heading: 0,
    headingSet: false,
    direction: spriteDirection(position.vx ?? 0, position.vy ?? 1),
    lastGround: { x: position.x, y: position.y },
    warning: false,
    distance: 0,
  };
}
export function advanceFlight(
  f: Flight,
  config: { flightDuration: number },
  dt: number,
  complete: boolean,
  hooks: FlightHooks = {},
): Flight | null {
  f.elapsed += dt;
  if (f.stage === 'FLIGHT_TAKEOFF' && complete) {
    f.stage = 'FLYING';
    f.elapsed = 0;
    f.remaining = config.flightDuration;
    hooks.onFlightStart?.();
  } else if (f.stage === 'FLYING') {
    const previous = f.remaining;
    f.remaining = Math.max(0, f.remaining - dt);
    if (!f.warning && previous > 0.5 && f.remaining <= 0.5) {
      f.warning = true;
      hooks.onFlightWarning?.();
    }
    if (f.remaining === 0) {
      hooks.onSafeLanding?.();
      f.stage = 'FLIGHT_LANDING';
      f.elapsed = 0;
      hooks.onFlightLanding?.();
    }
  } else if (f.stage === 'FLIGHT_LANDING' && complete) {
    hooks.onFlightEnd?.();
    return null;
  }
  return f;
}
export function steerFlight(
  f: Flight,
  dx: number,
  dy: number,
  dt: number,
  turnMultiplier: number,
): { x: number; y: number } {
  if (!dx && !dy) return { x: 0, y: 0 };
  const desired = Math.atan2(dy, dx);
  if (!f.headingSet) {
    f.heading = desired;
    f.headingSet = true;
  }
  const difference = Math.atan2(
    Math.sin(desired - f.heading),
    Math.cos(desired - f.heading),
  );
  f.heading += Math.max(
    -10 * turnMultiplier * dt,
    Math.min(10 * turnMultiplier * dt, difference),
  );
  f.direction = spriteDirection(Math.cos(f.heading), Math.sin(f.heading));
  return { x: Math.cos(f.heading), y: Math.sin(f.heading) };
}
export function safeFlightLanding(
  position: { x: number; y: number },
  lastGround: { x: number; y: number },
  valid: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  if (valid(position.x, position.y)) return { x: position.x, y: position.y };
  for (let radius = 8; radius <= 256; radius += 8)
    for (let i = 0; i < 32; i++) {
      const x = position.x + Math.cos((i * Math.PI) / 16) * radius,
        y = position.y + Math.sin((i * Math.PI) / 16) * radius;
      if (valid(x, y)) return { x, y };
    }
  return valid(lastGround.x, lastGround.y) ? { ...lastGround } : null;
}
// Conservative explicit low-obstacle allowlist; unknown/hidden/world objects block.
export const FLIGHT_LOW_ASSETS = new Set([
  'bucket',
  'bush',
  'crates',
  'drain',
  'trash',
  'plant',
  'plantFence',
  'flowerBedSmall',
  'flowerFence',
]);
export const flightPassesObstacle = (o: {
  hidden?: boolean;
  asset: string;
}): boolean => !o.hidden && FLIGHT_LOW_ASSETS.has(o.asset);
