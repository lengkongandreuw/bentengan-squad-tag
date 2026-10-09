import assert from 'node:assert/strict';
import { tryParkourJump } from '../modules/gameplay/collision-navigation.ts';

const player = (over = {}) => ({
  state: 'ACTIVE',
  waterEnteredAt: 0,
  x: 100,
  y: 100,
  boost: 50,
  parkourUntil: 0,
  fallSafeUntil: 0,
  boostReadyAt: 0,
  ...over,
});
const world = (over = {}) => {
  const calls = [];
  return {
    calls,
    parkourKey: true,
    parkourLatch: false,
    agility: 1,
    isKanal: false,
    obstacles: [{ x: 130, y: 90, w: 40, h: 40 }],
    hasWater: false,
    waterAt: () => false,
    studioMap: null,
    findLanding: () => ({ x: 150, y: 110, crossedWater: false }),
    onMissionParkour: () => calls.push(['mission']),
    onBurst: (x, y, color, count) => calls.push(['burst', color, count]),
    onTone: (frequency) => calls.push(['tone', frequency]),
    ...over,
  };
};

// Gate matrix: no key, latched, unaffordable, cooldown, water, idle, no axis.
for (const over of [
  { parkourKey: false },
  { parkourLatch: true },
]) {
  const p = player();
  const w = world(over);
  tryParkourJump(p, 1, 0, 1000, w);
  assert.deepEqual(w.calls, []);
  assert.equal(p.parkourUntil, 0);
}
{
  const p = player({ boost: 1 }); // cost = 8/1
  const w = world();
  tryParkourJump(p, 1, 0, 1000, w);
  assert.equal(p.parkourUntil, 0);
}
{
  const p = player({ parkourUntil: 1500 });
  const w = world();
  tryParkourJump(p, 1, 0, 1000, w);
  assert.equal(p.parkourUntil, 1500);
}
{
  const p = player({ state: 'PRISONER' });
  const w = world();
  tryParkourJump(p, 1, 0, 1000, w);
  assert.equal(p.parkourUntil, 0);
}
{
  const p = player({ waterEnteredAt: 5 });
  const w = world({ isKanal: true });
  tryParkourJump(p, 1, 0, 1000, w);
  assert.deepEqual(w.calls, []);
  assert.equal(p.parkourUntil, 0);
}
{
  const p = player();
  const w = world();
  tryParkourJump(p, 0, 0, 1000, w); // no movement axis
  assert.deepEqual(w.calls, []);
}

// Dry proximity miss (no obstacle/water/studio near) skips silently.
{
  const p = player({ x: 900, y: 900 });
  const w = world({ findLanding: () => { throw new Error('must not probe landing'); } });
  tryParkourJump(p, 1, 0, 1000, w);
  assert.deepEqual(w.calls, []);
}

// Successful jump: full mutation chain + effects, dry landing colors.
{
  const p = player();
  const w = world();
  tryParkourJump(p, 1, 0.5, 1000, w);
  assert.equal(p.parkourUntil, 1360);
  assert.equal(p.fallSafeUntil, 1430); // dry = 430
  assert.equal(p.boost, 42); // 50 - 8
  assert.equal(p.boostReadyAt, 21000);
  assert.deepEqual([p.x, p.y], [150, 110]);
  assert.deepEqual(w.calls, [
    ['mission'],
    ['burst', '#f4df9a', 9],
    ['tone', 460],
  ]);
}
// Water crossing uses the wet fall-safe window and cyan burst.
{
  const p = player();
  const w = world({ findLanding: () => ({ x: 120, y: 130, crossedWater: true }) });
  tryParkourJump(p, 1, 0, 1000, w);
  assert.equal(p.fallSafeUntil, 1620); // 1000 + 620
  assert.deepEqual(w.calls[1], ['burst', '#65e9ff', 9]);
}
console.log('PASS tryParkourJump: gate matrix, proximity miss, dry/wet landings.');
