import assert from 'node:assert/strict';
import { freezeDuringUltimateCast } from '../modules/gameplay/bars-score.ts';
import { stepMouseStuckTimeout } from '../modules/gameplay/input-navigation.ts';

const players = () => [
  { vx: 5, vy: -3, lastX: 0, lastY: 0, x: 10, y: 20 },
  { vx: 0, vy: 0, lastX: 1, lastY: 1, x: 30, y: 40 },
];

// No cast: null, players and latches untouched.
let cleared = 0;
const roster = players();
assert.equal(freezeDuringUltimateCast(roster, new Set([' ']), false, () => cleared++), null);
assert.equal(cleared, 0);
assert.equal(roster[0].vx, 5);

// Cast: mouse cleared, all motion frozen with positions synced, keys latched.
const freeze = freezeDuringUltimateCast(roster, new Set([' ', 'shift']), true, () => cleared++);
assert.deepEqual(freeze, { boostLatch: true, parkourLatch: true });
assert.equal(cleared, 1);
assert.deepEqual(
  roster.map((p) => [p.vx, p.vy, p.lastX, p.lastY]),
  [[0, 0, 10, 20], [0, 0, 30, 40]],
);
assert.deepEqual(
  freezeDuringUltimateCast(players(), new Set(), true, () => {}),
  { boostLatch: false, parkourLatch: false },
);

// Stuck route: still time accumulates past 0.6s and drops the route.
cleared = 0;
const me = { x: 10, y: 10 };
const before = { x: 10, y: 10 };
assert.equal(stepMouseStuckTimeout(true, me, before, 0.5, 0.2, () => cleared++), 0.7);
assert.equal(cleared, 1);
// Progress resets the timer; routeless ticks leave it untouched.
assert.equal(stepMouseStuckTimeout(true, { x: 50, y: 10 }, before, 0.5, 0.2, () => cleared++), 0);
assert.equal(stepMouseStuckTimeout(false, me, before, 0.5, 0.2, () => cleared++), 0.5);
assert.equal(cleared, 1);
console.log('PASS castFreeze+stuckTimeout: motion freeze with key latch, stuck accumulation/gate.');
