import assert from 'node:assert/strict';
import { findParkourLanding } from '../modules/gameplay/collision-navigation.ts';

const dry = () => false;
const probe = (overrides = {}) => ({
  isWaterAt: dry,
  isBlocked: dry,
  worldWidth: 1769,
  worldHeight: 1296,
  ...overrides,
});

// Degenerate direction yields null.
assert.equal(findParkourLanding({ x: 500, y: 500 }, { x: 0, y: 0 }, 54, probe()), null);
// Dry fallback lands at nominal distance when nothing blocks.
assert.deepEqual(
  findParkourLanding({ x: 500, y: 500 }, { x: 1, y: 0 }, 54, probe()),
  { x: 554, y: 500, crossedWater: false },
);
// Blocked fallback yields null.
assert.equal(
  findParkourLanding({ x: 500, y: 500 }, { x: 1, y: 0 }, 54, probe({ isBlocked: () => true })),
  null,
);
// Water crossing: wet band then dry ground past the 0.72 threshold.
const band = { x0: 520, x1: 560 };
const wetBand = {
  ...probe(),
  isWaterAt: (x) => x >= band.x0 && x <= band.x1,
};
const landing = findParkourLanding({ x: 500, y: 500 }, { x: 1, y: 0 }, 100, wetBand);
assert.ok(landing && landing.crossedWater === true && landing.x > band.x1);
// All-wet run yields null.
assert.equal(
  findParkourLanding({ x: 500, y: 500 }, { x: 1, y: 0 }, 54, probe({ isWaterAt: () => true })),
  null,
);
console.log('PASS parkour landing: degenerate, dry fallback, blocked, water crossing, all-wet.');
