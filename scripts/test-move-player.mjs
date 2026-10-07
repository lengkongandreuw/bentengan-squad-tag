import assert from 'node:assert/strict';
import { movePlayer } from '../modules/gameplay/collision-navigation.ts';

const free = () => false;
const dry = () => false;
const base = ({ p, dx, dy, speed, dt, now, world } = {}) => ({
  p: { waterEnteredAt: 0, x: 100, y: 100, vx: 0, vy: 0, ...p },
  dx: dx ?? 1,
  dy: dy ?? 0,
  speed: speed ?? 120,
  dt: dt ?? 1 / 60,
  now: now ?? 1000,
  world: {
    kanalSwim: false,
    speedAt: (x, y, s) => s,
    bounds: { minX: 34, maxX: 1700, minY: 58, maxY: 1200 },
    isBlocked: free,
    onWaterFall: dry,
    ...world,
  },
});

// Free ground advances along the unit vector.
{
  const { p, dx, dy, speed, dt, now, world } = base();
  movePlayer(p, dx, dy, speed, dt, now, world);
  assert.equal(p.x, 102);
  assert.equal(p.y, 100);
  assert.equal(p.vx, 120);
}
// Kanal swimmer zeroes velocity and stays put.
{
  const { p, dx, dy, speed, dt, now, world } = base({ world: { kanalSwim: true } });
  p.vx = 50;
  movePlayer(p, dx, dy, speed, dt, now, world);
  assert.deepEqual([p.vx, p.vy, p.x, p.y], [0, 0, 100, 100]);
}
// Studio speed multiplier applies.
{
  const { p, dx, dy, dt, now, world } = base({ world: { speedAt: (x, y, s) => s * 2 } });
  movePlayer(p, dx, dy, 60, dt, now, world);
  assert.equal(p.x, 102);
}
// Blocked x falls through to the water escape; a wet fall stops the step.
{
  const fell = [];
  const { p, dx, dy, speed, dt, now, world } = base({
    world: { isBlocked: (x) => x !== 100, onWaterFall: (x, y) => (fell.push([x, y]), true) },
  });
  movePlayer(p, dx, dy, speed, dt, now, world);
  assert.deepEqual([p.x, p.y], [100, 100]);
  assert.equal(fell.length, 1);
}
// Dry fall-through continues to the y axis.
{
  const { p, speed, dt, now, world } = base({
    world: { isBlocked: (x) => x !== 100 },
  });
  movePlayer(p, 0, 1, speed, dt, now, world);
  assert.equal(p.y, 102);
}
console.log('PASS movePlayer: advance, swim stop, speed, water escape, axis split.');
