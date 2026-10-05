import assert from 'node:assert/strict';
import { resetFallenPlayer } from '../modules/gameplay/spawn.ts';
import { tieHash } from '../lib/math.ts';

const base = { x: 200, y: 500 };
const fallen = (overrides = {}) => ({
  id: 'you', team: 'blue', controlled: true,
  x: 999, y: 999, lastX: 1, lastY: 2, vx: 50, vy: -30, state: 'ACTIVE',
  exitOrder: 3, baseCharge: 1, exitDeadline: 9, fortCharge: 2, parkourUntil: 9,
  action: 'tag', actionUntil: 9, fallSafeUntil: 9, fallNoticeUntil: 9,
  waterEnteredAt: 9, waterFallUntil: 9,
  ...overrides,
});

// Blue base spawn: x offset +24, lane from round-seeded hash.
const p = fallen();
const effects = resetFallenPlayer(p, 1, base, 1000);
const lane = (tieHash(1, 'you') % 5) - 2;
assert.equal(p.x, 224);
assert.equal(p.y, 500 + lane * 17);
assert.equal(p.lastX, p.x);
assert.equal(p.lastY, p.y);
// Red side mirrors.
const red = fallen({ id: 'e1', team: 'red' });
resetFallenPlayer(red, 1, { x: 900, y: 500 }, 1000);
assert.equal(red.x, 900 - 24);
// Motion, match, and fall fields reset; timers set.
assert.deepEqual(
  [p.vx, p.vy, p.state, p.exitOrder, p.baseCharge, p.exitDeadline, p.fortCharge,
    p.parkourUntil, p.action, p.actionUntil, p.waterEnteredAt, p.waterFallUntil],
  [0, 0, 'IN_BASE', 0, 0, 0, 0, 0, undefined, 0, 0, 0],
);
assert.equal(p.fallSafeUntil, 2800);
assert.equal(p.fallNoticeUntil, 2500);
// Effects: burst always; beep+log only when controlled.
assert.deepEqual(effects.bursts, [{ x: p.x, y: p.y, color: '#60e6ff', count: 14 }]);
assert.deepEqual(effects.beeps, [{ frequency: 210, duration: 0.16 }]);
assert.deepEqual(effects.logs, ['OOOPSS... HATI-HATI · kembali ke benteng.']);
const bot = fallen({ controlled: false });
const quiet = resetFallenPlayer(bot, 1, base, 1000);
assert.equal(quiet.bursts.length, 1);
assert.deepEqual(quiet.beeps, []);
assert.deepEqual(quiet.logs, []);
console.log('PASS fall reset: placement, field resets, timers, controlled effects.');
