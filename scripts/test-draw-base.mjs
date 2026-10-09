import assert from 'node:assert/strict';
import { drawBase } from '../modules/ui/draw-base.ts';

const fakeCtx = () => {
  const calls = [];
  return {
    calls,
    set strokeStyle(value) {
      calls.push(['strokeStyle', value]);
    },
    set lineWidth(value) {
      calls.push(['lineWidth', value]);
    },
    set fillStyle(value) {
      calls.push(['fillStyle', value]);
    },
    set font(value) {
      calls.push(['font', value]);
    },
    set textAlign(value) {
      calls.push(['textAlign', value]);
    },
    setLineDash(dash) {
      calls.push(['setLineDash', [...dash]]);
    },
    beginPath() {
      calls.push(['beginPath']);
    },
    arc(x, y, radius) {
      calls.push(['arc', x, y, radius]);
    },
    stroke() {
      calls.push(['stroke']);
    },
    fillText(text, x, y) {
      calls.push(['fillText', text, x, y]);
    },
  };
};
const texts = (ctx) => ctx.calls.filter(([name]) => name === 'fillText');

// Empty blue base off-kanal: team color, thin solid ring, label below.
const plain = fakeCtx();
drawBase(plain, { x: 200, y: 500 }, 118, false, 'blue', '#0000ff');
assert.ok(plain.calls.some(([name, value]) => name === 'strokeStyle' && value === '#0000ff'));
assert.ok(plain.calls.some(([name, value]) => name === 'lineWidth' && value === 4));
assert.ok(plain.calls.some(([name, value]) => name === 'setLineDash' && value.length === 0));
assert.ok(plain.calls.some(([name, x, y, radius]) => name === 'arc' && x === 200 && y === 500 && radius === 118));
assert.deepEqual(texts(plain), [['fillText', 'BENTENG MERAH', 200, 630]]);

// Occupied red base on kanal: lock color, dashed ring, kanal label height, lock text.
const locked = fakeCtx();
drawBase(locked, { x: 900, y: 300 }, 118, true, 'red', '#00ff00', 'Jago');
assert.ok(locked.calls.some(([name, value]) => name === 'strokeStyle' && value === '#f5cf45'));
assert.ok(locked.calls.some(([name, value]) => name === 'lineWidth' && value === 7));
assert.ok(locked.calls.some(([name, value]) => name === 'setLineDash' && value.join() === '3,5'));
assert.deepEqual(texts(locked), [
  ['fillText', 'BENTENG HIJAU', 900, 434],
  ['fillText', 'TERKUNCI · Jago', 900, 448],
]);

// Empty red base off-kanal: label mapping holds per team.
const red = fakeCtx();
drawBase(red, { x: 900, y: 300 }, 118, false, 'red', '#00ff00');
assert.deepEqual(texts(red), [['fillText', 'BENTENG HIJAU', 900, 430]]);
console.log('PASS draw base: ring, labels, kanal height, lock indicator.');
