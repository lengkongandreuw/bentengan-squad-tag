import assert from 'node:assert/strict';
import { createDrawFieldAnimations } from '../modules/ui/field-assets.ts';

const decorations = [
  { animation: 'fountain', x: 10, y: 20, w: 92, h: 90 },
  { animation: 'windmill', x: 100, y: 50, w: 60, h: 60, flip: true, opacity: 0.4 },
];
const ctx = { marker: 'ctx' };

// Forwards every decoration with tick time; optional flags pass through.
{
  const calls = [];
  const draw = createDrawFieldAnimations(ctx, (...args) => calls.push(args), decorations);
  draw(1000);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], [ctx, 'fountain', 10, 20, 92, 90, 1000, undefined, undefined]);
  assert.deepEqual(calls[1], [ctx, 'windmill', 100, 50, 60, 60, 1000, true, 0.4]);
}

// Each tick reuses the same list (time is the only input).
{
  const calls = [];
  const draw = createDrawFieldAnimations(ctx, (...args) => calls.push(args), decorations);
  draw(0);
  draw(250);
  assert.deepEqual(calls.map((c) => c[6]), [0, 0, 250, 250]); // both per tick
}

// Empty config draws nothing.
{
  let called = 0;
  const draw = createDrawFieldAnimations(ctx, () => { called += 1; }, []);
  draw(500);
  assert.equal(called, 0);
}

console.log('PASS createDrawFieldAnimations: forwarding, flags, tick time, empty config.');
