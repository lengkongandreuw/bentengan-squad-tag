import assert from 'node:assert/strict';
import { layoutPrisons } from '../modules/gameplay/prison.ts';

const prisons = {
  blue: { x: 200, y: 400, w: 254, h: 190 },
  red: { x: 900, y: 100, w: 254, h: 190 },
};
const prisoner = (team, index) => ({
  team, state: 'PRISONER', prisonOwner: team, prisonIndex: -1,
  x: 0, y: 0, lastX: -1, lastY: -1, id: `${team}${index}`,
});
const active = (team, index) => ({
  team, state: 'ACTIVE', prisonOwner: undefined, prisonIndex: 7,
  x: 11, y: 22, lastX: 11, lastY: 22, id: `${team}a${index}`,
});

// Blue non-kanal layout: line formation with per-index offsets.
const blue = [prisoner('blue', 0), prisoner('blue', 1)];
layoutPrisons(structuredClone(prisons), blue, false);
assert.deepEqual([blue[0].x, blue[0].y], [200 + 62, 400 + 116]);
assert.deepEqual([blue[1].x, blue[1].y], [200 + 62 + 31, 400 + 116 + 6]);

// Red non-kanal layout: mirrored formation.
const red = [prisoner('red', 0), prisoner('red', 1)];
layoutPrisons(structuredClone(prisons), red, false);
assert.deepEqual([red[0].x, red[0].y], [900 + 254 - 62, 100 + 82]);
assert.deepEqual([red[1].x, red[1].y], [900 + 254 - 62 - 31, 100 + 82 - 6]);

// Kanal layout: 3-column grid, mirrored per side.
const kanal = [prisoner('blue', 0), prisoner('blue', 1), prisoner('blue', 2), prisoner('blue', 3)];
layoutPrisons(structuredClone(prisons), kanal, true);
assert.deepEqual([kanal[0].x, kanal[0].y], [200 + 34, 400 + 76]);
assert.deepEqual([kanal[1].x, kanal[1].y], [200 + 34 + (254 - 68) / 2, 400 + 76]);
assert.deepEqual([kanal[3].x, kanal[3].y], [200 + 34, 400 + 76 + 30]);

// prisonIndex assignment follows layout order; lastX/lastY sync with x/y.
for (const p of [...blue, ...red, ...kanal]) {
  assert.ok(p.prisonIndex >= 0, 'index assigned');
  assert.equal(p.lastX, p.x, 'lastX synced');
  assert.equal(p.lastY, p.y, 'lastY synced');
}
assert.deepEqual(blue.map((p) => p.prisonIndex), [0, 1]);

// Non-prisoners are untouched, including RETURNING teammates.
const mixed = [prisoner('blue', 0), active('blue', 0), { ...active('red', 0), state: 'RETURNING' }];
layoutPrisons(structuredClone(prisons), mixed, false);
assert.deepEqual([mixed[1].x, mixed[1].y, mixed[1].prisonIndex], [11, 22, 7]);
assert.deepEqual([mixed[2].x, mixed[2].y, mixed[2].prisonIndex], [11, 22, 7]);
assert.deepEqual([mixed[0].prisonIndex, mixed[0].x], [0, 262]);

// Rescue re-layout: a freed prisoner leaves, indices compact on rerun.
const held = [prisoner('blue', 0), prisoner('blue', 1), prisoner('blue', 2)];
layoutPrisons(structuredClone(prisons), held, false);
held[0].state = 'RETURNING';
held[0].prisonOwner = undefined;
layoutPrisons(structuredClone(prisons), held, false);
assert.deepEqual(held.map((p) => p.prisonIndex), [0, 0, 1], 'freed keeper keeps stale index, rest compact');
assert.deepEqual([held[1].x, held[1].y], [200 + 62, 400 + 116]);

// Prison geometry input is never mutated.
const frozen = structuredClone(prisons);
layoutPrisons(frozen, [prisoner('blue', 0), prisoner('red', 0)], true);
assert.deepEqual(frozen, prisons, 'no prison-data mutation');
console.log('PASS prison layout: blue/red/kanal, indices, sync, non-prisoners, re-layout, input intact.');
