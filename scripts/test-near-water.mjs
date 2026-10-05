import assert from 'node:assert/strict';
import { isNearWater } from '../modules/gameplay/collision-navigation.ts';

const wetAt = (wet) => ({
  hasWater: true,
  waterAt: (x, y) => wet.some(([wx, wy]) => x === wx && y === wy),
});
const dry = { hasWater: false, waterAt: () => true };

// No water anywhere: always false, predicate never consulted.
let probed = 0;
assert.equal(
  isNearWater(10, 10, { hasWater: false, waterAt: () => { probed++; return true; } }),
  false,
);
assert.equal(probed, 0);

// Direct hit and 30px cross-neighbors.
const query = wetAt([[100, 100]]);
assert.equal(isNearWater(100, 100, query), true);
assert.equal(isNearWater(70, 100, query), true);
assert.equal(isNearWater(130, 100, query), true);
assert.equal(isNearWater(100, 70, query), true);
assert.equal(isNearWater(100, 130, query), true);

// Outside the cross stays dry.
assert.equal(isNearWater(0, 0, query), false);
assert.equal(isNearWater(69, 100, query), false);
assert.equal(isNearWater(100, 131, query), false);
assert.equal(isNearWater(0, 0, dry), false);
console.log('PASS near water: direct hit, cross neighbors, dry map, miss.');
