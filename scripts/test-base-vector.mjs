import assert from 'node:assert/strict';
import { baseVector } from '../modules/gameplay/collision-navigation.ts';

const bases = { blue: { x: 100, y: 100 }, red: { x: 900, y: 100 } };
assert.deepEqual(baseVector({ team: 'blue', x: 150, y: 130 }, bases), { x: -50, y: -30 });
assert.deepEqual(baseVector({ team: 'red', x: 850, y: 100 }, bases), { x: 50, y: 0 });
assert.deepEqual(baseVector({ team: 'blue', x: 100, y: 100 }, bases), { x: 0, y: 0 });
console.log('PASS baseVector: per-team direction, zero at base.');
