import assert from 'node:assert/strict';
import { tickUltimateMeter, beginUltimateCast } from '../modules/gameplay/bars-score.ts';

const world = (calls, over = {}) => ({
  isKanal: false,
  onBanner: (ms) => calls.push(['banner', ms]),
  onBurst: (x, y, color, count) => calls.push(['burst', color, count]),
  onTone: (f, d) => calls.push(['tone', f, d]),
  onLog: (t) => calls.push(['log', t]),
  ...over,
});
const me = (over = {}) => ({
  characterId: 'raja',
  state: 'ACTIVE',
  action: undefined,
  actionUntil: 0,
  parkourUntil: 0,
  waterEnteredAt: 0,
  x: 10,
  y: 20,
  vx: 3,
  vy: 4,
  ...over,
});

// Passive charge: only for ultimate characters, clamped 0..100 (45s verbatim).
assert.equal(tickUltimateMeter(0, true, 4.5, 45), 10);
assert.equal(tickUltimateMeter(95, true, 4.5, 45), 100);
assert.equal(tickUltimateMeter(50, false, 4.5, 45), 50);

// Unavailable cast: null, no effects, nothing mutated.
let calls = [];
const caster = me();
assert.equal(beginUltimateCast(caster, 99, 1000, 3200, world(calls)), null);
assert.equal(beginUltimateCast(me({ state: 'PRISONER' }), 100, 1000, 3200, world(calls)), null);
assert.equal(beginUltimateCast(me({ waterEnteredAt: 5 }), 100, 1000, 3200, world(calls, { isKanal: true })), null);
assert.deepEqual(calls, []);
assert.equal(caster.vx, 3);

// Successful cast: gate passes, timers reset, effects fire in HEAD order.
calls = [];
const result = beginUltimateCast(caster, 100, 1000, 3200, world(calls));
assert.deepEqual(result, {
  meter: 0,
  ultimateImpactAt: 4200,
  ultimateImpactApplied: false,
  boostBurstUntil: 0,
});
assert.equal(caster.action, 'ultimate');
assert.equal(caster.actionUntil, 4200);
assert.equal(caster.vx, 0);
assert.equal(caster.vy, 0);
assert.deepEqual(calls, [
  ['banner', 820],
  ['burst', '#ef233c', 14],
  ['tone', 180, 0.2],
  ['log', 'RAJA memanggil TITAH HALILINTAR.'],
]);

// Re-cast while action pending is blocked; channelled Kaka overrides defaults.
calls = [];
assert.equal(beginUltimateCast(caster, 100, 2000, 3200, world(calls)), null);
calls = [];
const kaka = beginUltimateCast(me({ characterId: 'kaka' }), 100, 1000, 3200, world(calls));
assert.equal(kaka.ultimateImpactAt, 1000 + 3600); // castMs from character data
console.log('PASS ult-cast: meter charge, availability gates, cast effects + timers.');
