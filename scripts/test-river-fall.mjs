import assert from 'node:assert/strict';
import { riverFallCheck } from '../modules/gameplay/river-fall.ts';
import { tieHash } from '../lib/math.ts';

const bases = { blue: { x: 100, y: 400 }, red: { x: 1900, y: 400 } };

const player = (id, over = {}) => ({
  id,
  team: 'blue',
  controlled: false,
  x: 500,
  y: 500,
  lastX: 500,
  lastY: 500,
  vx: 0,
  vy: 0,
  state: 'ACTIVE',
  exitOrder: 2,
  baseCharge: 0,
  exitDeadline: 0,
  fortCharge: 0,
  parkourUntil: 0,
  action: undefined,
  actionUntil: 0,
  fallSafeUntil: 0,
  fallNoticeUntil: 0,
  waterEnteredAt: 0,
  waterFallUntil: 0,
  ...over,
});

const worldOf = (players, over = {}) => {
  const calls = { waterFalls: [], bursts: [], tones: [], logs: [] };
  return {
    world: {
      players,
      waterSource: true,
      kanal: false,
      round: 2,
      bases,
      isWaterAt: () => false,
      onWaterFall: (p, now, x, y) => calls.waterFalls.push({ id: p.id, now, x, y }),
      fx: {
        onBurst: (x, y, color, count) => calls.bursts.push({ x, y, color, count }),
        onTone: (frequency, duration) => calls.tones.push({ frequency, duration }),
        onLog: (text) => calls.logs.push(text),
      },
      ...over,
    },
    calls,
  };
};

// No water source: nothing runs.
{
  const { world, calls } = worldOf([player('a')], { waterSource: false, isWaterAt: () => true });
  riverFallCheck(0, world);
  assert.equal(calls.waterFalls.length + calls.bursts.length, 0);
}
// Non-kanal: wet player resets to base; dry player untouched.
{
  const p = player('wet', { x: 300, y: 300 });
  const { world, calls } = worldOf([p, player('dry')], { isWaterAt: (x) => x === 300 });
  riverFallCheck(7000, world);
  const lane = (tieHash(2, 'wet') % 5) - 2;
  assert.equal(p.state, 'IN_BASE');
  assert.equal(p.x, 100 + 24);
  assert.equal(p.y, 400 + lane * 17);
  assert.equal(calls.bursts.length, 1);
  assert.equal(calls.waterFalls.length, 0);
}
// Non-kanal guards: PRISONER, parkour, fallSafe block the reset.
{
  const { world, calls } = worldOf(
    [
      player('pris', { state: 'PRISONER' }),
      player('park', { parkourUntil: 500 }),
      player('safe', { fallSafeUntil: 900 }),
    ],
    { isWaterAt: () => true },
  );
  riverFallCheck(100, world);
  assert.equal(calls.bursts.length + calls.waterFalls.length, 0);
}
// Kanal: dry land never drowns (isWaterAt false) and never resets.
{
  const p = player('a');
  const { world, calls } = worldOf([p], { kanal: true, isWaterAt: () => false });
  riverFallCheck(0, world);
  assert.equal(calls.waterFalls.length + calls.bursts.length, 0);
}
// Kanal: fresh water contact starts the drowning sequence, not a reset.
{
  const { world, calls } = worldOf([player('a')], { kanal: true, isWaterAt: () => true });
  riverFallCheck(1000, world);
  assert.deepEqual(calls.waterFalls, [{ id: 'a', now: 1000, x: 500, y: 500 }]);
  assert.equal(calls.bursts.length, 0);
}
// Kanal: swimmer under the 3000ms window waits; at/after it, resets.
{
  const early = player('swim', { waterEnteredAt: 5000 });
  const w1 = worldOf([early], { kanal: true, isWaterAt: () => true });
  riverFallCheck(7999, w1.world); // 2999ms in water
  assert.equal(w1.calls.bursts.length, 0);
  const late = player('swim2', { waterEnteredAt: 5000, x: 800 });
  const w2 = worldOf([late], { kanal: true, isWaterAt: () => true });
  riverFallCheck(8000, w2.world); // 3000ms in water
  assert.equal(late.state, 'IN_BASE');
  assert.equal(w2.calls.bursts.length, 1);
  assert.equal(w2.calls.waterFalls.length, 0);
}
// Kanal: PRISONER swimmer and parkour-protected contact are ignored.
{
  const { world, calls } = worldOf(
    [
      player('pris', { state: 'PRISONER', x: 10 }),
      player('park', { parkourUntil: 999999, x: 20 }),
    ],
    { kanal: true, isWaterAt: () => true },
  );
  riverFallCheck(1000, world);
  assert.equal(calls.waterFalls.length + calls.bursts.length, 0);
}

console.log('PASS riverFallCheck: water-source guard, kanal drown/wait/reset windows, non-kanal reset, guards.');
