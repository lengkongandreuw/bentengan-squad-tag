import assert from 'node:assert/strict';
import { applyFallReset } from '../modules/gameplay/fall-reset.ts';
import { tieHash } from '../lib/math.ts';

const fallen = (id, over = {}) => ({
  id,
  team: 'blue',
  x: 500,
  y: 500,
  lastX: 498,
  lastY: 498,
  vx: 30,
  vy: -20,
  state: 'ACTIVE',
  exitOrder: 4,
  baseCharge: 77,
  exitDeadline: 123,
  fortCharge: 55,
  parkourUntil: 999,
  action: 'tag',
  actionUntil: 888,
  fallSafeUntil: 0,
  fallNoticeUntil: 0,
  waterEnteredAt: 42,
  waterFallUntil: 42,
  ...over,
});

const recorder = () => {
  const calls = { bursts: [], tones: [], logs: [] };
  return {
    fx: {
      onBurst: (x, y, color, count) => calls.bursts.push({ x, y, color, count }),
      onTone: (frequency, duration) => calls.tones.push({ frequency, duration }),
      onLog: (text) => calls.logs.push(text),
    },
    calls,
  };
};

// Non-controlled: full reset, single burst replay, no tone/log.
{
  const p = fallen('bot1');
  const base = { x: 100, y: 400 };
  const { fx, calls } = recorder();
  applyFallReset(p, 3, base, 5000, fx);
  const lane = (tieHash(3, 'bot1') % 5) - 2;
  assert.equal(p.x, 100 + 24); // blue side → +24
  assert.equal(p.y, 400 + lane * 17);
  assert.equal(p.lastX, p.x);
  assert.equal(p.lastY, p.y);
  assert.equal(p.vx, 0);
  assert.equal(p.vy, 0);
  assert.equal(p.state, 'IN_BASE');
  assert.equal(p.exitOrder, 0);
  assert.equal(p.baseCharge, 0);
  assert.equal(p.exitDeadline, 0);
  assert.equal(p.fortCharge, 0);
  assert.equal(p.parkourUntil, 0);
  assert.equal(p.action, undefined);
  assert.equal(p.actionUntil, 0);
  assert.equal(p.fallSafeUntil, 5000 + 1800);
  assert.equal(p.fallNoticeUntil, 5000 + 1500);
  assert.equal(p.waterEnteredAt, 0);
  assert.equal(p.waterFallUntil, 0);
  assert.deepEqual(calls.bursts, [{ x: p.x, y: p.y, color: '#60e6ff', count: 14 }]);
  assert.deepEqual(calls.tones, []);
  assert.deepEqual(calls.logs, []);
}
// Controlled: burst + beep + log replayed in order.
{
  const p = fallen('me', { team: 'red', controlled: true });
  const base = { x: 1900, y: 400 };
  const { fx, calls } = recorder();
  applyFallReset(p, 1, base, 1000, fx);
  assert.equal(p.x, 1900 - 24); // red side → −24
  assert.equal(calls.bursts.length, 1);
  assert.deepEqual(calls.tones, [{ frequency: 210, duration: 0.16 }]);
  assert.deepEqual(calls.logs, ['OOOPSS... HATI-HATI · kembali ke benteng.']);
}

console.log('PASS applyFallReset: full state reset, side/lane spawn, controlled effects replay.');
