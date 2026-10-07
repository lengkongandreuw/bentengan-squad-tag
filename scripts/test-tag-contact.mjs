import assert from 'node:assert/strict';
import { sweptContactDistance } from '../modules/gameplay/tag-check.ts';
// Static pair 3-4-5 apart stays 5.
assert.equal(
  sweptContactDistance(
    { x: 0, y: 0, lastX: 0, lastY: 0 },
    { x: 3, y: 4, lastX: 3, lastY: 4 },
  ),
  5,
);
// Same spot is contact.
assert.equal(
  sweptContactDistance(
    { x: 7, y: 7, lastX: 7, lastY: 7 },
    { x: 7, y: 7, lastX: 7, lastY: 7 },
  ),
  0,
);
// Runner passes 3px beside a static target mid-sweep.
assert.equal(
  sweptContactDistance(
    { x: 10, y: 0, lastX: 0, lastY: 0 },
    { x: 5, y: 3, lastX: 5, lastY: 3 },
  ),
  3,
);
// Head-on swap crosses through contact.
assert.equal(
  sweptContactDistance(
    { x: 10, y: 0, lastX: 0, lastY: 0 },
    { x: 0, y: 0, lastX: 10, lastY: 0 },
  ),
  0,
);
// Parallel runners keep their lane offset.
assert.equal(
  sweptContactDistance(
    { x: 10, y: 0, lastX: 0, lastY: 0 },
    { x: 10, y: 4, lastX: 0, lastY: 4 },
  ),
  4,
);
console.log(
  'PASS tag contact: static distance, contact, swept pass, head-on cross, parallel lanes.',
);
