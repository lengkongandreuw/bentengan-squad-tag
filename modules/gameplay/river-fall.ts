import type { Team } from '../world/map-data/field-types';
import { applyFallReset } from './fall-reset.ts';
import type { FallResetFx } from './fall-reset.ts';
import type { FallenPlayerFacet } from './spawn.ts';

// Q2-adjacent but not a Q2 ultimate value: verbatim move from HEAD.
// Kanal2 swimmers are reset after this long in the water.
const KANAL2_FALL_RESET_MS = 3000;

// Water-fall hazard check. `waterSource` is the owner's guard value
// (studio map OR water mask present); `onWaterFall` starts the kanal2
// drowning sequence owned by the composition root.
export type RiverFallWorld = {
  players: FallenPlayerFacet[];
  waterSource: boolean;
  kanal: boolean;
  round: number;
  bases: Record<Team, { x: number; y: number }>;
  isWaterAt: (x: number, y: number) => boolean;
  onWaterFall: (p: FallenPlayerFacet, now: number, x: number, y: number) => void;
  fx: FallResetFx;
};

export const riverFallCheck = (now: number, world: RiverFallWorld): void => {
  if (!world.waterSource) return;
  const reset = (p: FallenPlayerFacet) =>
    applyFallReset(p, world.round, world.bases[p.team], now, world.fx);
  if (world.kanal) {
    world.players.forEach((p) => {
      if (p.waterEnteredAt) {
        if (now - p.waterEnteredAt >= KANAL2_FALL_RESET_MS) reset(p);
        return;
      }
      if (
        p.state === 'PRISONER' ||
        now < p.parkourUntil ||
        now < p.fallSafeUntil ||
        !world.isWaterAt(p.x, p.y)
      )
        return;
      world.onWaterFall(p, now, p.x, p.y);
    });
    return;
  }
  world.players.forEach((p) => {
    if (
      p.state === 'PRISONER' ||
      now < p.parkourUntil ||
      now < p.fallSafeUntil ||
      !world.isWaterAt(p.x, p.y)
    )
      return;
    reset(p);
  });
};
