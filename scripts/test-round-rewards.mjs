// Rewards follow rounds played: best-of-3 baseline, 5-round and 7-round tournament scale up,
// capped at 7 rounds, never below the baseline. Run: node --experimental-strip-types --test scripts/test-round-rewards.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roundRewardFactor, scaleRoundReward } from '../lib/player-profile/round-rewards.ts';
import { calculateMatchXPBreakdown } from '../lib/player-profile/xp-engine.ts';
import { calculateMatchTokenBreakdown } from '../lib/player-profile/match-token-rewards.ts';

const summary = (roundsPlayed, extra = {}) => ({ completed: true, result: 'win', tags: 0, rescues: 0, roundsPlayed, ...extra });

void test('factor: 3-round baseline, scales to 7, clamped both ways', () => {
  assert.equal(roundRewardFactor(undefined), 1);
  for (const r of [1, 2, 3]) assert.equal(roundRewardFactor(r), 1);
  assert.ok(Math.abs(roundRewardFactor(5) - 5 / 3) < 1e-12);
  assert.ok(Math.abs(roundRewardFactor(7) - 7 / 3) < 1e-12);
  assert.equal(roundRewardFactor(9), roundRewardFactor(7));
  assert.throws(() => roundRewardFactor(0));
  assert.throws(() => roundRewardFactor(2.5));
  assert.equal(scaleRoundReward(100, 5), 167);
});

void test('XP: completion and win scale with rounds; longer modes pay more', () => {
  const base = calculateMatchXPBreakdown(summary(undefined));
  const bo3 = calculateMatchXPBreakdown(summary(3));
  const five = calculateMatchXPBreakdown(summary(5));
  const seven = calculateMatchXPBreakdown(summary(7));
  assert.deepEqual(bo3, base, 'best-of-3 / multiplayer unchanged');
  assert.equal(base.match, 100); assert.equal(base.victory, 60);
  assert.equal(five.match, 167); assert.equal(five.victory, 100);
  assert.equal(seven.match, 233); assert.equal(seven.victory, 140);
  const total = (b) => b.match + b.victory + b.tag + b.rescue;
  assert.ok(total(seven) > total(five) && total(five) > total(base));
});

void test('XP: per-action values stay, caps scale with rounds', () => {
  const many = { tags: 30, rescues: 30 };
  const base = calculateMatchXPBreakdown(summary(undefined, many));
  const seven = calculateMatchXPBreakdown(summary(7, many));
  assert.equal(base.tag, 64); assert.equal(base.rescue, 60);
  assert.equal(seven.tag, 149); assert.equal(seven.rescue, 140);
  const few = calculateMatchXPBreakdown(summary(7, { tags: 2, rescues: 1 }));
  assert.equal(few.tag, 16); assert.equal(few.rescue, 15);
});

void test('DOI follows the same rule and losses still pay completion', () => {
  const base = calculateMatchTokenBreakdown(summary(undefined));
  const five = calculateMatchTokenBreakdown(summary(5));
  const lostSeven = calculateMatchTokenBreakdown(summary(7, { result: 'loss' }));
  assert.deepEqual(base, { match: 10, victory: 5, tag: 0, rescue: 0 });
  assert.deepEqual(five, { match: 17, victory: 8, tag: 0, rescue: 0 });
  assert.deepEqual(lostSeven, { match: 23, victory: 0, tag: 0, rescue: 0 });
  const capped = calculateMatchTokenBreakdown(summary(7, { tags: 50, rescues: 50 }));
  assert.equal(capped.tag, 12); assert.equal(capped.rescue, 14);
  assert.deepEqual(calculateMatchTokenBreakdown({ ...summary(7), completed: false }), { match: 0, victory: 0, tag: 0, rescue: 0 });
});
