import assert from 'node:assert/strict';
import { directionIsTraversable } from '../modules/gameplay/collision-navigation.ts';

const free = () => false;
const blockedAt = () => true;
const dry = () => false;
const probe = (overrides = {}) => ({
  isBlocked: free,
  isWaterAt: dry,
  ...overrides,
});

// Degenerate direction passes.
assert.equal(directionIsTraversable({ x: 0, y: 0 }, { x: 0, y: 0 }, 100, 0, probe()), true);
// Clear ray passes.
assert.equal(directionIsTraversable({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 0, probe()), true);
// Blocked sample fails.
assert.equal(
  directionIsTraversable({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 0, probe({ isBlocked: blockedAt })),
  false,
);
// Wet sample fails.
assert.equal(
  directionIsTraversable({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 0, probe({ isWaterAt: blockedAt })),
  false,
);
// Short probe still samples at least 5 points.
let calls = 0;
directionIsTraversable({ x: 0, y: 0 }, { x: 1, y: 0 }, 1, 0, {
  isBlocked: () => (calls++, false),
  isWaterAt: dry,
});
assert.ok(calls >= 5, `min 5 samples, got ${calls}`);
console.log('PASS directionIsTraversable: degenerate, clear, blocked, wet, min samples.');
