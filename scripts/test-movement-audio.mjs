import assert from 'node:assert/strict';
import { stepMovementAudio } from '../modules/gameplay/movement-audio.ts';

const world = (calls) => ({
  enemyBase: { x: 100, y: 0 },
  baseRadius: 10,
  onStep: (volume) => calls.push(['step', volume]),
  onDash: () => calls.push(['dash']),
  onPrison: () => calls.push(['prison']),
  onFortEnter: () => calls.push(['fort-enter']),
});
const fresh = () => ({ previousSoundPosition: null, lastFootstep: 0, wasDashing: false, wasInEnemyFort: false });
const me = (over) => ({ x: 10, y: 0, parkourUntil: 0, state: 'ACTIVE', ...over });

// First tick seeds position without sound (no travel history).
let calls = [];
let state = stepMovementAudio(me({}), fresh(), 1000, false, world(calls));
assert.deepEqual(calls, []);
assert.deepEqual(state.previousSoundPosition, { x: 10, y: 0 });

// Grounded travel inside the window fires step at walk tempo; state writes back.
calls = [];
state = stepMovementAudio(me({ x: 20 }), state, 1300, false, world(calls));
assert.deepEqual(calls, [['step', 0.6]]);
assert.equal(state.lastFootstep, 1300);

// Tempo gate: too soon after the last step stays silent.
calls = [];
state = stepMovementAudio(me({ x: 30 }), state, 1400, false, world(calls));
assert.deepEqual(calls, []);

// Boosting quickens tempo, raises volume, and fires dash once on the rising edge.
calls = [];
state = stepMovementAudio(me({ x: 40 }), state, 1600, true, world(calls));
assert.deepEqual(calls, [['step', 0.8], ['dash']]);
assert.equal(state.wasDashing, true);
calls = [];
state = stepMovementAudio(me({ x: 50 }), state, 1900, true, world(calls));
assert.ok(!calls.some(([name]) => name === 'dash'));

// Pressing into a wall (no travel) and parkour airtime stay silent.
calls = [];
state = stepMovementAudio(me({ x: 50 }), state, 2200, false, world(calls));
assert.deepEqual(calls, []);
calls = [];
stepMovementAudio(me({ x: 60, parkourUntil: 5000 }), state, 2500, false, world(calls));
assert.deepEqual(calls, []);

// Prisoner and enemy-fort entry fire their cues on the rising edge only.
calls = [];
state = stepMovementAudio(me({ x: 60, state: 'PRISONER' }), fresh(), 3000, false, world(calls));
assert.deepEqual(calls, [['prison']]);
calls = [];
state = stepMovementAudio(me({ x: 105 }), fresh(), 3000, false, world(calls));
assert.deepEqual(calls, [['fort-enter']]);
assert.equal(state.wasInEnemyFort, true);
calls = [];
stepMovementAudio(me({ x: 105 }), state, 3300, false, world(calls));
assert.deepEqual(calls, []);
console.log('PASS stepMovementAudio: tempo/volume, dash/prison/fort-enter edges, wall-press silence.');
