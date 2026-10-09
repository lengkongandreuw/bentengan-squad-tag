import { clamp } from '../../lib/math.ts';
import {
  waterAt as studioWaterAt,
  type StudioMap,
} from '../../lib/map-studio-model.js';
import type { PlayerAction, PlayerState } from '../game-core/match-types';
import type { GameplaySound } from '../audio/audio-port';

// Water sampling for gameplay. Studio maps answer from their own mask;
// otherwise the field's water-mask ImageData is sampled at logical world
// coordinates (half-resolution masks included, HEAD math verbatim).
// `pixels` is a getter because the mask is loaded asynchronously after
// this sampler is created.
export type WaterSource = {
  studioMap: StudioMap | null;
  pixels: () => Uint8ClampedArray | null;
  canvas: { width: number; height: number };
  worldWidth: number;
  worldHeight: number;
};

export const createWaterAt = (
  source: WaterSource,
): ((x: number, y: number) => boolean) => {
  return (x: number, y: number): boolean => {
    if (source.studioMap) return studioWaterAt(source.studioMap, x, y);
    const pixels = source.pixels();
    if (!pixels) return false;
    const maskX = clamp(
      Math.round((x / source.worldWidth) * (source.canvas.width - 1)),
      0,
      source.canvas.width - 1,
    );
    const maskY = clamp(
      Math.round((y / source.worldHeight) * (source.canvas.height - 1)),
      0,
      source.canvas.height - 1,
    );
    return pixels[(maskY * source.canvas.width + maskX) * 4] > 127;
  };
};

// Drowning-sequence facet for kanal2. Player satisfies this.
type WaterFallFacet = {
  id: string;
  controlled?: boolean;
  state: PlayerState;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  vx: number;
  vy: number;
  action?: PlayerAction;
  actionUntil: number;
  waterEnteredAt: number;
  waterFallUntil: number;
  fallSafeUntil: number;
  parkourUntil: number;
};

export type WaterFallWorld = {
  kanal: boolean;
  radius: number;
  isWaterAt: (x: number, y: number) => boolean;
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onClearMouse: () => void;
  onAudio: (name: GameplaySound, volume?: number) => void;
  onLog: (text: string) => void;
};

// Snaps the player to the nearest water point (16-side ring at the
// collision radius) and starts the kanal2 drowning sequence. Head numbers
// (720ms fall window, ring size, dash cue) moved verbatim.
export const beginKanal2WaterFall = (
  p: WaterFallFacet,
  now: number,
  x: number,
  y: number,
  world: WaterFallWorld,
): boolean => {
  if (
    !world.kanal || p.id === '__collision_probe__' ||
    p.waterEnteredAt || p.state === 'PRISONER' ||
    now < p.fallSafeUntil || now < p.parkourUntil
  ) return false;
  let waterPoint = world.isWaterAt(x, y) ? { x, y } : null;
  for (let side = 0; !waterPoint && side < 16; side++) {
    const angle = side * Math.PI / 8;
    const sample = {
      x: x + Math.cos(angle) * world.radius,
      y: y + Math.sin(angle) * world.radius,
    };
    if (world.isWaterAt(sample.x, sample.y)) waterPoint = sample;
  }
  if (!waterPoint) return false;
  p.x = waterPoint.x;
  p.y = waterPoint.y;
  p.lastX = p.x;
  p.lastY = p.y;
  p.vx = 0;
  p.vy = 0;
  p.action = undefined;
  p.actionUntil = 0;
  p.waterEnteredAt = now;
  p.waterFallUntil = now + 720;
  world.onBurst(p.x, p.y + 7, '#65e9ff', 12);
  if (p.controlled) {
    world.onClearMouse();
    world.onAudio('dash', 0.38);
    world.onLog('TERJATUH KE AIR · kembali ke benteng sebentar lagi.');
  }
  return true;
};
