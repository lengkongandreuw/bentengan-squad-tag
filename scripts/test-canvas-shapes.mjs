import assert from 'node:assert/strict';
import { roundedOn } from '../modules/ui/canvas-shapes.ts';

// Recording stub: captures method name + args in call order.
const stub = () => {
  const calls = [];
  return {
    calls,
    beginPath(...args) {
      calls.push(['beginPath', ...args]);
    },
    roundRect(...args) {
      calls.push(['roundRect', ...args]);
    },
  };
};

// Emits exactly beginPath then roundRect with the passed geometry.
const target = stub();
roundedOn(target, 10, 20, 100, 50, 8);
assert.deepEqual(target.calls, [
  ['beginPath'],
  ['roundRect', 10, 20, 100, 50, 8],
]);

// Zero radius passes through untouched.
const flat = stub();
roundedOn(flat, 0, 0, 5, 5, 0);
assert.deepEqual(flat.calls[1], ['roundRect', 0, 0, 5, 5, 0]);
console.log('PASS roundedOn: beginPath then roundRect with exact args.');
