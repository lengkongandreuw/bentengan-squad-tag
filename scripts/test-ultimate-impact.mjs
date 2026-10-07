import assert from 'node:assert/strict';
import { applyUltimateImpact } from '../modules/gameplay/bars-score.ts';

const world = (calls) => ({
  shieldMs: 5000,
  buffMs: 5000,
  onBurst: (x, y, color, count) => calls.push(['burst', x, y, color, count]),
  onTone: (frequency, duration) => calls.push(['tone', frequency, duration]),
  onLog: (text) => calls.push(['log', text]),
});
const state = (over = {}) => ({
  ultimateImpactAt: 1000,
  ultimateImpactApplied: false,
  ultimateShieldUntil: 0,
  ultimateBuffUntil: 0,
  ...over,
});
const players = () => [
  { team: 'red', ultimateShieldUntil: 0 },
  { team: 'red', ultimateShieldUntil: 0 },
  { team: 'blue', ultimateShieldUntil: 0 },
];

// Not yet due (or already applied): state untouched, no effects.
let calls = [];
let next = applyUltimateImpact(
  { characterId: 'kaka', team: 'red', x: 1, y: 2 },
  players(),
  state(),
  999,
  world(calls),
);
assert.deepEqual(calls, []);
assert.equal(next.ultimateImpactApplied, false);
next = applyUltimateImpact(
  { characterId: 'kaka', team: 'red', x: 1, y: 2 },
  players(),
  state({ ultimateImpactApplied: true }),
  1000,
  world(calls),
);
assert.deepEqual(calls, []);

// Kaka shields only her own team with both bursts, tone, and log.
calls = [];
const roster = players();
next = applyUltimateImpact(
  { characterId: 'kaka', team: 'red', x: 1, y: 2 },
  roster,
  state(),
  1000,
  world(calls),
);
assert.deepEqual(next, {
  ultimateImpactAt: 0,
  ultimateImpactApplied: true,
  ultimateShieldUntil: 6000,
  ultimateBuffUntil: 0,
});
assert.deepEqual(roster.map((p) => p.ultimateShieldUntil), [6000, 6000, 0]);
assert.deepEqual(calls, [
  ['burst', 1, 2, '#35f477', 34],
  ['burst', 1, 2, '#baffc9', 18],
  ['tone', 540, 0.32],
  ['log', 'PERISAI HIJAU · seluruh rekan kebal TAG selama 5 detik.'],
]);

// Raja buffs the timer without touching shields.
calls = [];
const roster2 = players();
next = applyUltimateImpact(
  { characterId: 'raja', team: 'blue', x: 3, y: 4 },
  roster2,
  state(),
  1000,
  world(calls),
);
assert.deepEqual(next, {
  ultimateImpactAt: 0,
  ultimateImpactApplied: true,
  ultimateShieldUntil: 0,
  ultimateBuffUntil: 6000,
});
assert.deepEqual(roster2.map((p) => p.ultimateShieldUntil), [0, 0, 0]);
assert.deepEqual(calls, [
  ['burst', 3, 4, '#ef233c', 28],
  ['burst', 3, 4, '#b54a32', 18],
  ['tone', 118, 0.32],
  ['log', 'TITAH HALILINTAR · seluruh rekan ACTIVE bergerak +40% selama 5 detik.'],
]);
console.log('PASS applyUltimateImpact: due guard, shield team isolation, buff timer, effect order.');
