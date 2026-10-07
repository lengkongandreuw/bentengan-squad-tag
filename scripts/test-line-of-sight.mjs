import assert from 'node:assert/strict';
import { hasLineOfSight, segmentHitsRect } from '../modules/gameplay/collision-navigation.ts';

const wall = { x: 100, y: 0, w: 20, h: 200 };

// Segment crossing the rect hits; clear segments miss. Only interior
// samples count (endpoints excluded), matching HEAD behavior.
assert.equal(segmentHitsRect({ x: 0, y: 100 }, { x: 200, y: 100 }, wall), true);
assert.equal(segmentHitsRect({ x: 0, y: 100 }, { x: 50, y: 100 }, wall), false);
assert.equal(segmentHitsRect({ x: 0, y: 300 }, { x: 200, y: 300 }, wall), false);
// Entering the wall counts as a hit (7/8 sample lands inside).
assert.equal(segmentHitsRect({ x: 0, y: 100 }, { x: 120, y: 100 }, wall), true);

// Clear sight with no rects and no studio map.
assert.equal(hasLineOfSight({ x: 0, y: 100 }, { x: 200, y: 100 }, [], null), true);
// A wall between the points blocks sight.
assert.equal(hasLineOfSight({ x: 0, y: 100 }, { x: 200, y: 100 }, [wall], null), false);
// A rect off the segment does not block.
assert.equal(
  hasLineOfSight({ x: 0, y: 100 }, { x: 200, y: 100 }, [{ x: 0, y: 300, w: 20, h: 20 }], null),
  true,
);
console.log('PASS line of sight: segment hits, clear sight, wall blocks, off-path clear.');
