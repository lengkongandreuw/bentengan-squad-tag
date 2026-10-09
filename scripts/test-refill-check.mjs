import assert from 'node:assert/strict';
import { refillCheck } from '../modules/gameplay/refill-check.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';

const kakaMax = CHARACTER_BY_ID.kaka.boost;

const player = (id, over = {}) => ({
  id,
  name: id.toUpperCase(),
  characterId: 'kaka',
  state: 'ACTIVE',
  boost: 10,
  x: 0,
  y: 0,
  waterEnteredAt: 0,
  ...over,
});

const item = (id, x, y, grade) => ({ id, x, y, grade, lane: 0, expiresAt: 9e9 });

const worldOf = (players, refills, over = {}) => {
  const calls = { refills: [], bursts: [], tones: [], logs: [], missions: 0 };
  return {
    world: {
      players,
      refills,
      kanal: false,
      onRefills: (next) => calls.refills.push(next),
      onBurst: (x, y, color, count) => calls.bursts.push({ x, y, color, count }),
      onTone: (frequency, duration) => calls.tones.push({ frequency, duration }),
      onLog: (text) => calls.logs.push(text),
      onMissionBoost: () => { calls.missions += 1; },
      ...over,
    },
    calls,
  };
};

// Full-boost / inactive / kanal-water players never pick up.
{
  const { world, calls } = worldOf([player('a', { boost: kakaMax })], [item(1, 0, 0, 40)]);
  refillCheck(world);
  assert.equal(calls.bursts.length, 0);
}
{
  const { world, calls } = worldOf([player('a', { state: 'PRISONER' })], [item(1, 0, 0, 40)]);
  refillCheck(world);
  assert.equal(calls.bursts.length, 0);
}
{
  const { world, calls } = worldOf(
    [player('a', { waterEnteredAt: 5 })],
    [item(1, 0, 0, 40)],
    { kanal: true },
  );
  refillCheck(world);
  assert.equal(calls.bursts.length, 0);
}
// Pickup: boost gain, item removed, color/tone/log wiring.
{
  const p = player('a', { controlled: true });
  const { world, calls } = worldOf([p], [item(7, 0, 0, 40)]);
  refillCheck(world);
  assert.equal(p.boost, 10 + (kakaMax * 40) / 100);
  assert.deepEqual(calls.refills, [[]]);
  assert.deepEqual(calls.bursts, [{ x: 0, y: 0, color: '#f5cf45', count: 18 }]);
  assert.deepEqual(calls.tones, [{ frequency: 640, duration: 0.12 }]); // 560 + 40*2
  assert.equal(calls.missions, 1);
  assert.equal(calls.logs[0], 'A mengambil refill boost 40%.');
}
// Grade colors and tone follow grade.
{
  for (const [grade, color, tone] of [[100, '#60e6ff', 760], [75, '#ef75ff', 710], [25, '#b9ee3d', 610]]) {
    const { world, calls } = worldOf([player('a')], [item(1, 0, 0, grade)]);
    refillCheck(world);
    assert.equal(calls.bursts[0].color, color);
    assert.equal(calls.tones[0].frequency, tone);
  }
}
// Boost capped at max.
{
  const p = player('a', { boost: kakaMax - 1 });
  const { world } = worldOf([p], [item(1, 0, 0, 100)]);
  refillCheck(world);
  assert.equal(p.boost, kakaMax);
}
// Out of range: no pickup.
{
  const p = player('a', { x: 0 });
  const { world, calls } = worldOf([p], [item(1, 100, 0, 40)]);
  refillCheck(world);
  assert.equal(calls.bursts.length, 0);
}
// Shared item: only the first player consumes it (filtered list visible in-pass).
{
  const first = player('a1', { x: 0 });
  const second = player('a2', { x: 5 });
  const { world, calls } = worldOf([first, second], [item(9, 2, 0, 40)]);
  refillCheck(world);
  assert.deepEqual(calls.refills, [[]]);
  assert.equal(calls.bursts.length, 1);
  assert.ok(first.boost > 10 && second.boost === 10);
}
// No pickup at all still reports the list unchanged.
{
  const { world, calls } = worldOf([player('a', { boost: kakaMax })], [item(1, 0, 0, 40)]);
  refillCheck(world);
  assert.equal(calls.refills.length, 1);
  assert.equal(calls.refills[0][0].id, 1);
}

console.log('PASS refillCheck: eligibility blocks, gain/color/tone, cap, range, single-consumption.');
