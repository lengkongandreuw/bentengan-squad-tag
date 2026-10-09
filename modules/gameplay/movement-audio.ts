import { distance } from '../../lib/math.ts';
import type { PlayerState } from '../game-core/match-types';

export type MovementAudioPlayer = {
  x: number;
  y: number;
  parkourUntil: number;
  state: PlayerState;
};

export type MovementAudioState = {
  previousSoundPosition: { x: number; y: number } | null;
  lastFootstep: number;
  wasDashing: boolean;
  wasInEnemyFort: boolean;
};

export type MovementAudioWorld = {
  enemyBase: { x: number; y: number };
  baseRadius: number;
  onStep: (volume: number) => void;
  onDash: () => void;
  onPrison: () => void;
  onFortEnter: () => void;
};

// Footstep/dash/prison/fort-enter triggers for the controlled player.
// Only actual grounded movement produces footsteps (not pressing into a wall).
// Pure: returns the next loop-local state; all audio leaves via callbacks.
export const stepMovementAudio = (
  me: MovementAudioPlayer,
  state: MovementAudioState,
  now: number,
  boosting: boolean | number,
  world: MovementAudioWorld,
): MovementAudioState => {
  const travelled = state.previousSoundPosition ? distance(me, state.previousSoundPosition) : 0;
  const previousSoundPosition = { x: me.x, y: me.y };
  const grounded = now >= me.parkourUntil && me.state !== 'PRISONER';
  const movingForSound = grounded && travelled > .15 && travelled < 35;
  let lastFootstep = state.lastFootstep;
  if (movingForSound && now - lastFootstep > (boosting ? 170 : 270)) {
    world.onStep(boosting ? .8 : .6);
    lastFootstep = now;
  }
  if (boosting && !state.wasDashing && movingForSound) world.onDash();
  const wasDashing = Boolean(boosting && movingForSound);
  if (me.state === 'PRISONER') world.onPrison();
  const inEnemyFort = me.state === 'ACTIVE' && distance(me, world.enemyBase) < world.baseRadius;
  if (inEnemyFort && !state.wasInEnemyFort) world.onFortEnter();
  return { previousSoundPosition, lastFootstep, wasDashing, wasInEnemyFort: inEnemyFort };
};
