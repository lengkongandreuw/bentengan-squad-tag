import assert from 'node:assert/strict';
import { drawParticles } from '../modules/ui/effects-particles.ts';
import { drawRouteTarget } from '../modules/ui/draw-base.ts';
import { pendingFieldRotation } from '../modules/game-core/match-control.ts';

const makeCtx = () => {
  const calls = [];
  return {
    calls,
    beginPath() { calls.push(['beginPath']); },
    arc(x, y, radius) { calls.push(['arc', x, y, radius]); },
    fill() { calls.push(['fill']); },
    stroke() { calls.push(['stroke']); },
    set globalAlpha(value) { calls.push(['globalAlpha', value]); },
    set fillStyle(value) { calls.push(['fillStyle', value]); },
    set strokeStyle(value) { calls.push(['strokeStyle', value]); },
    set lineWidth(value) { calls.push(['lineWidth', value]); },
  };
};

// Particles fade by remaining life fraction and alpha always resets.
let ctx = makeCtx();
drawParticles(ctx, [
  { x: 1, y: 2, life: 0.65, color: 'red' },
  { x: 3, y: 4, life: 0.325, color: 'blue' },
  { x: 5, y: 6, life: -0.1, color: 'green' },
]);
assert.deepEqual(
  ctx.calls.filter(([name]) => name === 'globalAlpha'),
  [['globalAlpha', 1], ['globalAlpha', 0.5], ['globalAlpha', 0], ['globalAlpha', 1]],
);
assert.equal(ctx.calls.filter(([name]) => name === 'arc').length, 3);

// Empty list still resets alpha (verbatim trailing reset).
ctx = makeCtx();
drawParticles(ctx, []);
assert.deepEqual(ctx.calls, [['globalAlpha', 1]]);

// Route ring targets the last waypoint with zoom-scaled stroke.
ctx = makeCtx();
drawRouteTarget(ctx, [{ x: 1, y: 1 }, { x: 50, y: 60 }], 2);
assert.deepEqual(ctx.calls, [
  ['strokeStyle', '#caff73'],
  ['lineWidth', 1],
  ['beginPath'],
  ['arc', 50, 60, 9],
  ['stroke'],
]);
ctx = makeCtx();
drawRouteTarget(ctx, [], 2);
assert.deepEqual(ctx.calls, []);

// Rotation waits for three completed matches, then cycles and zeroes wins.
assert.equal(pendingFieldRotation(2, 'kampung', ['kampung', 'pasar']), null);
assert.deepEqual(pendingFieldRotation(3, 'kampung', ['kampung', 'pasar', 'taman']), { wins: 0, fieldId: 'pasar' });
assert.deepEqual(pendingFieldRotation(4, 'taman', ['kampung', 'pasar', 'taman']), { wins: 0, fieldId: 'kampung' });
console.log('PASS roundouts: particle fade/reset, route ring, field rotation gate/cycle.');
