import assert from 'node:assert/strict';
import { createDrawRefill } from '../modules/ui/draw-refill.ts';

const recorder = () => {
  const calls = [];
  const animated = [];
  const ctx = {
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    translate: (x, y) => calls.push(['translate', x, y]),
    scale: (x, y) => calls.push(['scale', x, y]),
  };
  return { calls, ctx, drawAnimated: (...args) => animated.push(args), animated };
};

const item = (id, grade) => ({ id, x: 100, y: 200, grade, lane: 0, expiresAt: 9e9 });

// Grade → animation id mapping.
for (const [grade, anim] of [[100, 'boost100'], [75, 'boost75'], [40, 'boost40'], [25, 'boost25']]) {
  const r = recorder();
  const draw = createDrawRefill(r.ctx, r.drawAnimated);
  draw(item(1, grade), 0);
  assert.equal(r.animated[0][1], anim, `grade ${grade} → ${anim}`);
}

// Order: save → translate(item) → scale(pulse) → restore; frame time = now + id*37.
{
  const r = recorder();
  const draw = createDrawRefill(r.ctx, r.drawAnimated);
  draw(item(7, 40), 500);
  assert.deepEqual(r.calls.map((c) => c[0]), ['save', 'translate', 'scale', 'restore']);
  assert.deepEqual(r.calls[1], ['translate', 100, 200]);
  const expectedPulse = 1 + Math.sin(500 / 220 + 7) * 0.08;
  assert.ok(Math.abs(r.calls[2][1] - expectedPulse) < 1e-12);
  assert.ok(Math.abs(r.calls[2][2] - expectedPulse) < 1e-12);
  assert.deepEqual(r.animated[0], [r.ctx, 'boost40', -27, -30, 54, 58, 500 + 7 * 37]);
}

// Returns a reusable closure (stable identity for the prototype binding).
{
  const r = recorder();
  const draw = createDrawRefill(r.ctx, r.drawAnimated);
  assert.equal(typeof draw, 'function');
  draw(item(0, 100), 0);
  draw(item(1, 25), 10);
  assert.equal(r.animated.length, 2);
}

console.log('PASS createDrawRefill: grade mapping, draw order, pulse math, frame offset, reuse.');
