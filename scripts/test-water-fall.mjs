import assert from 'node:assert/strict';
import { beginKanal2WaterFall } from '../modules/gameplay/water.ts';

const player = (id, over = {}) => ({
  id,
  controlled: false,
  state: 'ACTIVE',
  x: 100,
  y: 200,
  lastX: 99,
  lastY: 199,
  vx: 12,
  vy: -4,
  action: 'tag',
  actionUntil: 555,
  waterEnteredAt: 0,
  waterFallUntil: 0,
  fallSafeUntil: 0,
  parkourUntil: 0,
  ...over,
});

const worldOf = (over = {}) => {
  const calls = { bursts: [], clears: 0, audios: [], logs: [] };
  return {
    world: {
      kanal: true,
      radius: 13,
      isWaterAt: () => false,
      onBurst: (x, y, color, count) => calls.bursts.push({ x, y, color, count }),
      onClearMouse: () => { calls.clears += 1; },
      onAudio: (name, volume) => calls.audios.push({ name, volume }),
      onLog: (text) => calls.logs.push(text),
      ...over,
    },
    calls,
  };
};
const touched = (p, now) =>
  p.x === 100 && p.y === 200 && p.waterEnteredAt === now && p.vx === 12;

// Guards: non-kanal, probe id, active drowning, prisoner, safety windows.
{
  const { world, calls } = worldOf({ kanal: false, isWaterAt: () => true });
  assert.equal(beginKanal2WaterFall(player('a'), 1000, 0, 0, world), false);
  assert.equal(calls.bursts.length, 0);
}
{
  const { world } = worldOf({ isWaterAt: () => true });
  assert.equal(beginKanal2WaterFall(player('__collision_probe__'), 1000, 0, 0, world), false);
}
{
  const { world } = worldOf({ isWaterAt: () => true });
  const p = player('a', { waterEnteredAt: 500 });
  assert.equal(beginKanal2WaterFall(p, 1000, 0, 0, world), false);
}
{
  const { world } = worldOf({ isWaterAt: () => true });
  assert.equal(beginKanal2WaterFall(player('a', { state: 'PRISONER' }), 1000, 0, 0, world), false);
  assert.equal(beginKanal2WaterFall(player('b', { fallSafeUntil: 1500 }), 1000, 0, 0, world), false);
  assert.equal(beginKanal2WaterFall(player('c', { parkourUntil: 1500 }), 1000, 0, 0, world), false);
}
// Direct hit: snaps in place, full drowning state, burst at y+7.
{
  const p = player('a');
  const { world, calls } = worldOf({ isWaterAt: () => true });
  assert.equal(beginKanal2WaterFall(p, 1000, 100, 200, world), true);
  assert.equal(p.x, 100);
  assert.equal(p.y, 200);
  assert.equal(p.lastX, 100);
  assert.equal(p.lastY, 200);
  assert.equal(p.vx, 0);
  assert.equal(p.vy, 0);
  assert.equal(p.action, undefined);
  assert.equal(p.actionUntil, 0);
  assert.equal(p.waterEnteredAt, 1000);
  assert.equal(p.waterFallUntil, 1720);
  assert.deepEqual(calls.bursts, [{ x: 100, y: 207, color: '#65e9ff', count: 12 }]);
  assert.equal(calls.clears + calls.audios.length + calls.logs.length, 0); // bot
}
// Ring hit: dry center, wet at side 0 (radius to the right).
{
  const p = player('a');
  const { world } = worldOf({
    isWaterAt: (x, y) => x === 100 + 13 && y === 200,
  });
  assert.equal(beginKanal2WaterFall(p, 2000, 100, 200, world), true);
  assert.equal(p.x, 113);
  assert.equal(p.y, 200);
}
// Dry everywhere → no start.
{
  const p = player('a');
  const { world, calls } = worldOf({ isWaterAt: () => false });
  assert.equal(beginKanal2WaterFall(p, 1000, 100, 200, world), false);
  assert.ok(touched(p, 0));
  assert.equal(calls.bursts.length, 0);
}
// Controlled player also clears input, plays dash, and logs.
{
  const p = player('me', { controlled: true });
  const { world, calls } = worldOf({ isWaterAt: () => true });
  assert.equal(beginKanal2WaterFall(p, 3000, 100, 200, world), true);
  assert.equal(calls.clears, 1);
  assert.deepEqual(calls.audios, [{ name: 'dash', volume: 0.38 }]);
  assert.equal(calls.logs[0], 'TERJATUH KE AIR · kembali ke benteng sebentar lagi.');
}

console.log('PASS beginKanal2WaterFall: guards, direct/ring/dry, drowning state, controlled branch.');
