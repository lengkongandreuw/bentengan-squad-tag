// Match rewards follow how many rounds were played (FEATURE: 5-round / 7-round tournament).
// A best-of-3 match is the baseline: completion, win bonus and the tag/rescue caps scale
// with roundsPlayed / 3, clamped to [3, 7] rounds. Per-action values never change, short
// or locked matches never earn less than before, and a 7-round tournament is the ceiling.

export const REWARD_BASELINE_ROUNDS = 3;
export const REWARD_MAX_ROUNDS = 7;

/** Reward multiplier for a finished match; undefined (multiplayer best-of-3) → 1. */
export function roundRewardFactor(roundsPlayed: number | undefined): number {
  if (roundsPlayed === undefined) return 1;
  if (!Number.isSafeInteger(roundsPlayed) || roundsPlayed < 1) throw new Error('Jumlah ronde reward tidak valid.');
  return Math.min(REWARD_MAX_ROUNDS, Math.max(REWARD_BASELINE_ROUNDS, roundsPlayed)) / REWARD_BASELINE_ROUNDS;
}
export const scaleRoundReward = (value: number, roundsPlayed: number | undefined) =>
  Math.round(value * roundRewardFactor(roundsPlayed));
