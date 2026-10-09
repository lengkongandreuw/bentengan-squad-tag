import assert from 'node:assert/strict';
import { clamp, distance, other } from '../lib/math.ts';

assert.equal(other('blue'), 'red');
assert.equal(other('red'), 'blue');
assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
assert.equal(distance({ x: 1, y: 1 }, { x: 1, y: 1 }), 0);
assert.equal(clamp(5, 0, 100), 5);
assert.equal(clamp(-5, 0, 100), 0);
assert.equal(clamp(150, 0, 100), 100);
assert.equal(clamp(0.5, 0, 1), 0.5);
console.log('PASS math: other, distance, clamp.');
