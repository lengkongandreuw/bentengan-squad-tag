import { economyRules } from './economy-rules.ts';
import { scaleRoundReward } from './round-rewards.ts';
import type { MatchXPSummary } from './xp-engine';

export type MatchTokenBreakdown = { match: number; victory: number; tag: number; rescue: number };
export const zeroTokenBreakdown = (): MatchTokenBreakdown => ({ match: 0, victory: 0, tag: 0, rescue: 0 });
export function calculateMatchTokenBreakdown(summary: MatchXPSummary): MatchTokenBreakdown {
  if (!summary || typeof summary.completed !== 'boolean' || !['win','loss'].includes(summary.result) ||
    !Number.isSafeInteger(summary.tags) || summary.tags < 0 || !Number.isSafeInteger(summary.rescues) || summary.rescues < 0)
    throw new Error('Ringkasan reward DOI tidak valid.');
  if (!summary.completed) return zeroTokenBreakdown();
  const rewards = economyRules.matchRewards;
  // BigInt protects the multiplication even for safe but extremely large counts.
  const capped = (count: number, unit: number, cap: number) =>
    Number(BigInt(count) * BigInt(unit) < BigInt(cap) ? BigInt(count) * BigInt(unit) : BigInt(cap));
  const scale = (value: number) => scaleRoundReward(value, summary.roundsPlayed);
  return { match: scale(rewards.completeMatch), victory: summary.result === 'win' ? scale(rewards.win) : 0,
    tag: capped(summary.tags,rewards.tag,scale(rewards.tagPerMatchCap)),
    rescue: capped(summary.rescues,rewards.rescue,scale(rewards.rescuePerMatchCap)) };
}
