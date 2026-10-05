import assert from 'node:assert/strict';
import { kanalWaterBlocks } from '../modules/gameplay/collision-navigation.ts';

const wetAt = (wet) => (x, y) => wet.some(([wx, wy]) => x === wx && y === wy);
const dry = () => false;

// Center wet blocks.
assert.equal(kanalWaterBlocks(100, 100, wetAt([[100, 100]]), 13), true);
// Ring neighbor wet blocks (13px ring).
assert.equal(kanalWaterBlocks(87, 100, wetAt([[100, 100]]), 13), true);
// All dry passes.
assert.equal(kanalWaterBlocks(0, 0, dry, 13), false);
assert.equal(kanalWaterBlocks(100, 100, dry, 13), false);
// Radius matters: the same point is reached by a 13px ring, not a 5px one.
assert.equal(kanalWaterBlocks(87, 100, wetAt([[100, 100]]), 13), true);
assert.equal(kanalWaterBlocks(87, 100, wetAt([[100, 100]]), 5), false);
assert.equal(kanalWaterBlocks(100, 100, wetAt([[100, 100]]), 0), true);
console.log('PASS kanal water blocks: center, ring, dry, radius.');
