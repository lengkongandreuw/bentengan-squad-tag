import assert from 'node:assert/strict';
import { stepBoost } from '../modules/gameplay/bars-score.ts';

const player = (over = {}) => ({
  state: 'ACTIVE',
  waterEnteredAt: 0,
  boost: 50,
  boostReadyAt: 0,
  ...over,
});
const world = (over = {}) => {
  const calls = [];
  return {
    calls,
    now: 1000,
    dx: 10,
    dy: 0,
    isKanal: false,
    boostKey: false,
    boostLatch: false,
    mouseBoost: false,
    boostBurstUntil: 0,
    boostDrain: 10,
    comboBoosted: false,
    dt: 0.1,
    onMissionBoost: () => calls.push(['mission']),
    ...over,
  };
};

// No key, no burst: nothing changes, nothing drains.
let w = world();
let p = player();
let result = stepBoost(p, w);
assert.deepEqual(result, { boostBurstUntil: 0, boostLatch: false, mouseBoost: false, boosting: false });
assert.equal(p.boost, 50);

// Fresh key press arms the burst (duration from game rules), latch writes back.
w = world({ boostKey: true });
result = stepBoost(player(), w);
assert.equal(result.boostBurstUntil, 1000 + 1400); // boostDurationMs = 1400
assert.equal(result.boostLatch, true);

// Held key without mouse boost does not re-arm (latched), but active burst drains.
w = world({ boostKey: true, boostLatch: true, boostBurstUntil: 5000 });
p = player();
result = stepBoost(p, w);
assert.equal(result.boostBurstUntil, 5000, 'latched key does not re-arm');
assert.equal(result.boosting, true);
assert.equal(p.boost, 49); // 50 - 10*0.1
assert.equal(p.boostReadyAt, 1000 + 20000);
assert.deepEqual(w.calls, [['mission']]);

// Mouse boost ignores the latch and re-arms.
w = world({ boostKey: true, boostLatch: true, mouseBoost: true, boostBurstUntil: 1500 });
result = stepBoost(player(), w);
assert.equal(result.boostBurstUntil, 1000 + 1400);
assert.equal(result.mouseBoost, false, 'mouse boost consumed');

// Guards: water swimmer, no axis, empty bar, and combo discount.
w = world({ boostBurstUntil: 5000 });
result = stepBoost(player({ waterEnteredAt: 5 }), { ...w, isKanal: true });
assert.equal(result.boosting, false);
result = stepBoost(player(), { ...w, dx: 0, dy: 0 });
assert.equal(result.boosting, false);
result = stepBoost(player({ boost: 0 }), w);
assert.equal(result.boosting, false);
p = player();
stepBoost(p, { ...w, comboBoosted: true });
assert.ok(Math.abs(p.boost - (50 - 10 * 0.8 * 0.1)) < 1e-9, '0.8 combo discount');
console.log('PASS stepBoost: arm/latch/mouse, drain guards, combo discount.');
