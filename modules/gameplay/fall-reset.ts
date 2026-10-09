import { resetFallenPlayer } from './spawn.ts';
import type { FallenPlayerFacet } from './spawn.ts';

// Replay surface for fall-reset effects. Bound by the composition root.
export type FallResetFx = {
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onTone: (frequency: number, duration: number) => void;
  onLog: (text: string) => void;
};

// Returns a fallen player to base and replays its effects. The state
// transition lives in spawn.resetFallenPlayer; this owns only the replay.
export const applyFallReset = (
  p: FallenPlayerFacet,
  round: number,
  base: { x: number; y: number },
  now: number,
  fx: FallResetFx,
): void => {
  const effects = resetFallenPlayer(p, round, base, now);
  for (const burstEffect of effects.bursts)
    fx.onBurst(burstEffect.x, burstEffect.y, burstEffect.color, burstEffect.count);
  for (const sound of effects.beeps) fx.onTone(sound.frequency, sound.duration);
  for (const line of effects.logs) fx.onLog(line);
};
