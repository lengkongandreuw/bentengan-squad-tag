import assert from 'node:assert/strict';
import {
  depenetrateFromRects,
  pointHitsExpandedRect,
  steerAroundRects,
} from '../modules/gameplay/collision-navigation.ts';
const box = { x: 0, y: 0, w: 10, h: 10 };
assert.equal(pointHitsExpandedRect(5, 5, box), true);
assert.equal(pointHitsExpandedRect(100, 100, box), false);
// Default radius 13 expands the rect; the edge itself stays outside (strict).
assert.equal(pointHitsExpandedRect(-12.9, 5, box), true);
assert.equal(pointHitsExpandedRect(-13, 5, box), false);
assert.equal(pointHitsExpandedRect(23, 5, box), false);
assert.equal(pointHitsExpandedRect(5, 5, box, 0), true);
assert.equal(pointHitsExpandedRect(11, 5, box, 0), false);
// A point inside the rect leaves through the nearest face (left wins the tie).
const out = depenetrateFromRects({ x: 5, y: 5 }, [box]);
assert.deepEqual(out, { x: -13.25, y: 5 });
assert.equal(pointHitsExpandedRect(out.x, out.y, box), false);
// A clear point is untouched, even with bounds clamping available.
assert.deepEqual(depenetrateFromRects({ x: 100, y: 100 }, [box]), {
  x: 100,
  y: 100,
});
// A clear run keeps its vector; zero vector passes through.
assert.deepEqual(steerAroundRects({ x: 0, y: 0 }, { x: 10, y: 0 }, []), {
  x: 10,
  y: 0,
});
assert.deepEqual(steerAroundRects({ x: 0, y: 0 }, { x: 0, y: 0 }, [box]), {
  x: 0,
  y: 0,
});
// A wall straight ahead deflects but preserves speed.
const wall = [{ x: 20, y: -50, w: 10, h: 100 }];
const deflected = steerAroundRects({ x: 0, y: 0 }, { x: 10, y: 0 }, wall);
assert.ok(
  Math.abs(Math.hypot(deflected.x, deflected.y) - 10) < 1e-9,
  'deflection preserves magnitude',
);
assert.notDeepEqual(deflected, { x: 10, y: 0 });
console.log(
  'PASS collision navigation: expanded hit, strict edge, depenetrate exit, clear passthrough, deflection.',
);
