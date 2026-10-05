import assert from 'node:assert/strict';
import { hitsObstacle } from '../modules/gameplay/collision-navigation.ts';

const rect = { x: 100, y: 100, w: 50, h: 50, asset: 'hall', visualW: 50, visualH: 50 };
const base = (overrides = {}) => ({
  studioMap: null,
  rects: [rect],
  radius: 13,
  ...overrides,
});

// Inside the expanded rect hits; clear ground misses.
assert.equal(hitsObstacle(125, 125, base()), true);
assert.equal(hitsObstacle(0, 0, base()), false);
// Edge expansion: within radius of the rect still hits.
assert.equal(hitsObstacle(100 - 12, 125, base()), true);
assert.equal(hitsObstacle(100 - 14, 125, base()), false);
// Empty rects with no studio map never hits.
assert.equal(hitsObstacle(125, 125, base({ rects: [] })), false);
console.log('PASS hitsObstacle: rect hit, expansion edge, empty world.');
