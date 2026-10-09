import assert from 'node:assert/strict';
import { isInsideFortCore } from '../modules/gameplay/collision-navigation.ts';

const rectWorld = (overrides = {}) => ({
  kanal: true,
  fortRects: [{ x: 100, y: 100, w: 60, h: 40 }],
  bases: {},
  radius: 13,
  minCore: 48,
  fortWidth: 168,
  ...overrides,
});
const circleWorld = (overrides = {}) => ({
  kanal: false,
  fortRects: [],
  bases: { blue: { x: 200, y: 200 } },
  radius: 13,
  minCore: 48,
  fortWidth: 168,
  ...overrides,
});

// Kanal: precomputed rects with 13px expansion.
assert.equal(isInsideFortCore(130, 120, rectWorld()), true);
assert.equal(isInsideFortCore(0, 0, rectWorld()), false);
assert.equal(isInsideFortCore(100 - 12, 120, rectWorld()), true);
assert.equal(isInsideFortCore(100 - 14, 120, rectWorld()), false);

// Non-kanal: circle around each base, floor of max(48, width*0.38).
const w = circleWorld();
// 168 * 0.38 = 63.84 > 48, so threshold is 63.84.
assert.equal(isInsideFortCore(200, 200, w), true);
assert.equal(isInsideFortCore(200 + 63, 200, w), true);
assert.equal(isInsideFortCore(200 + 65, 200, w), false);
// minCore floor wins when the fort is narrow.
const narrow = circleWorld({ fortWidth: 100 });
assert.equal(isInsideFortCore(200 + 47, 200, narrow), true);
assert.equal(isInsideFortCore(200 + 49, 200, narrow), false);
console.log('PASS fort core: kanal rects, circle radius, minCore floor.');
