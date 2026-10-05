import assert from 'node:assert/strict';
import { randomGrade, seedRefills, spawnRefill } from '../modules/gameplay/spawn.ts';

const realRandom = Math.random;
const stub = (values) => {
  let i = 0;
  Math.random = () => values[i++ % values.length];
};
const restore = () => {
  Math.random = realRandom;
};
const geo = (overrides = {}) => ({
  worldWidth: 1769,
  obstacles: [],
  studioMap: null,
  ...overrides,
});

// Grade distribution across stubbed quartiles.
stub([0.0, 0.6, 0.9, 0.99]);
assert.equal(randomGrade(), 25);
assert.equal(randomGrade(), 40);
assert.equal(randomGrade(), 75);
assert.equal(randomGrade(), 100);
restore();

// Spawn lands on the least-populated lane with sequential ids and +25s expiry.
stub([0.5, 0.5]);
const refills = [];
let nextId = spawnRefill(refills, 0, geo(), 10000);
assert.equal(nextId, 1);
assert.equal(refills.length, 1);
assert.deepEqual(
  { id: refills[0].id, lane: refills[0].lane, expiresAt: refills[0].expiresAt },
  { id: 1, lane: 0, expiresAt: 35000 },
);
assert.ok(refills[0].x >= 0 && refills[0].x <= 1769, 'x inside world');
nextId = spawnRefill(refills, nextId, geo(), 10000);
assert.equal(refills[1].id, 2, 'ids sequence across spawns');
restore();

// Blocked geometry yields no spawn and an unchanged id.
const wall = [{ x: 0, y: 0, w: 2000, h: 2000, asset: 'hall', visualW: 1, visualH: 1 }];
stub([0.5, 0.5]);
const before = refills.length;
assert.equal(spawnRefill(refills, nextId, geo({ obstacles: wall }), 10000), nextId);
assert.equal(refills.length, before, 'no spawn inside obstacles');
restore();

// Seed always deals six with sequential ids.
stub([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
const seeded = seedRefills(geo(), 5000);
assert.equal(seeded.refills.length, 6);
assert.equal(seeded.nextId, 6);
assert.deepEqual(seeded.refills.map((item) => item.id), [1, 2, 3, 4, 5, 6]);
for (const item of seeded.refills) {
  assert.ok([25, 40, 75, 100].includes(item.grade), 'valid grade');
  assert.ok(item.lane >= 0 && item.lane <= 2, 'valid lane');
  assert.equal(item.expiresAt, 30000);
}
restore();
console.log('PASS refill spawn: grades, placement, ids, blocked, seed of six.');
