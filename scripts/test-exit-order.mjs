import assert from 'node:assert/strict';
import { applyExitOrder } from '../modules/gameplay/base-check.ts';
import { tieHash } from '../lib/math.ts';

const candidate = (id, over = {}) => ({
  id,
  name: id.toUpperCase(),
  controlled: false,
  state: 'IN_BASE',
  exitOrder: 7,
  baseCharge: 0.4,
  exitDeadline: 999,
  lastExitAt: 111,
  rescueShieldUntil: 555,
  ...over,
});

const recorder = (start = 0) => {
  const state = { counter: start };
  const calls = { missions: 0, logs: [], tones: [] };
  return {
    world: {
      round: 2,
      nextExitOrder: () => ++state.counter,
      onMissionRefresh: () => { calls.missions += 1; },
      onLog: (text) => calls.logs.push(text),
      onTone: (frequency) => calls.tones.push(frequency),
    },
    calls,
    state,
  };
};

// Dedupe by id: a repeated candidate activates once (Map keeps last, as in HEAD).
{
  const a = candidate('a');
  const dup = candidate('a');
  const { world, calls, state } = recorder(0);
  applyExitOrder([a, dup], 5000, world);
  assert.equal(state.counter, 1);
  assert.equal(dup.exitOrder, 1);
  assert.equal(dup.state, 'ACTIVE');
  assert.equal(a.exitOrder, 7); // first duplicate never activated
  assert.equal(calls.logs.length, 1);
}
// Ordering follows the round tie-hash, not input order.
{
  const ids = ['z', 'm', 'q'];
  const list = ids.map((id) => candidate(id));
  const { world, calls, state } = recorder(0);
  applyExitOrder(list, 1000, world);
  const expected = [...ids].sort((x, y) => tieHash(2, x) - tieHash(2, y));
  const emitted = calls.logs.map((line) => line.split(' ')[0]);
  assert.deepEqual(emitted, expected.map((id) => id.toUpperCase()));
  for (const p of list) {
    assert.equal(p.state, 'ACTIVE');
    assert.equal(p.baseCharge, 0);
    assert.equal(p.exitDeadline, 0);
    assert.equal(p.rescueShieldUntil, 0);
    assert.equal(p.lastExitAt, 1000);
  }
  assert.deepEqual(list.map((p) => p.exitOrder).sort((a, b) => a - b), [1, 2, 3]);
  assert.equal(state.counter, 3);
}
// Controlled exit order > 5 fires the mission refresh exactly once per such exit.
{
  const list = [candidate('a', { controlled: true }), candidate('b', { controlled: true })];
  const { world, calls, state } = recorder(4); // orders 5 and 6 → only 6 > 5
  applyExitOrder(list, 0, world);
  assert.equal(calls.missions, 1);
  assert.equal(state.counter, 6);
  assert.ok(calls.missions === 1);
}
// Tones: controlled 520, bots 380.
{
  const list = [candidate('a', { controlled: true }), candidate('b')];
  const { world, calls } = recorder(0);
  applyExitOrder(list, 0, world);
  assert.deepEqual([...calls.tones].sort((a, b) => a - b), [380, 520]);
}
// Empty input: nothing runs.
{
  const { world, state, calls } = recorder(0);
  applyExitOrder([], 0, world);
  assert.equal(state.counter, 0);
  assert.equal(calls.logs.length, 0);
}

console.log('PASS applyExitOrder: dedupe, tie-hash order, state resets, mission gate, tones.');
