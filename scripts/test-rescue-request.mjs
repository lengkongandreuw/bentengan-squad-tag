import assert from 'node:assert/strict';
import { requestRescue } from '../modules/gameplay/rescue.ts';

const bases = { blue: { x: 100, y: 100 }, red: { x: 900, y: 100 } };
const query = { bases, baseRadius: 118 };
const prisoner = (id, team = 'blue', x = 100, y = 100) => ({
  id, name: id, team, state: 'PRISONER', controlled: true, x, y,
});
const bot = (id, team, x, y, state = 'ACTIVE') => ({
  id, name: id, team, state, controlled: false, x, y,
});
const quiet = (result) => {
  assert.equal(result.request, null);
  assert.equal(result.event, null);
  assert.deepEqual(result.sounds, []);
  assert.deepEqual(result.bursts, []);
  assert.deepEqual(result.logs, []);
};

// Non-prisoner requester changes nothing.
const active = { ...prisoner('you'), state: 'ACTIVE' };
let result = requestRescue([active], null, 0, query, 1000);
quiet(result);
assert.equal(result.cooldownUntil, 0);

// Existing request or live cooldown blocks a new one (previous values kept).
const prev = { requesterId: 'you', team: 'blue', expiresAt: 5000 };
result = requestRescue([prisoner('you')], prev, 0, query, 1000);
assert.equal(result.request, prev);
assert.equal(result.event, null);
assert.equal(result.cooldownUntil, 0);
result = requestRescue([prisoner('you')], null, 2000, query, 1000);
quiet(result);
assert.equal(result.cooldownUntil, 2000);

// Valid request with no eligible rescuer still registers (undefined assignee).
result = requestRescue(
  [prisoner('you'), bot('e1', 'red', 120, 100)],
  null, 0, query, 1000,
);
assert.deepEqual(result.request, {
  requesterId: 'you', team: 'blue', expiresAt: 7000, assignedRescuerId: undefined,
});
assert.equal(result.cooldownUntil, 11000);
assert.deepEqual(result.event, { kind: 'rescue-request', actorName: 'you', actorTeam: 'blue' });
assert.deepEqual(result.sounds, [{ name: 'rescue', volume: 0.38 }]);
assert.deepEqual(result.bursts, [{ x: 100, y: 74, color: '#f5cf45', count: 18 }]);
assert.deepEqual(result.logs, ['you meminta bantuan rescue.']);

// Nearest eligible teammate is assigned; far/inactive ones lose.
result = requestRescue(
  [prisoner('you'), bot('far', 'blue', 800, 800), bot('near', 'blue', 200, 200), bot('idle', 'blue', 150, 150, 'PRISONER')],
  null, 0, query, 1000,
);
assert.equal(result.request.assignedRescuerId, 'near');

// Controlled teammates never rescue.
result = requestRescue(
  [prisoner('you'), { ...bot('mate', 'blue', 150, 150), controlled: true }],
  null, 0, query, 1000,
);
assert.equal(result.request.assignedRescuerId, undefined);
console.log('PASS rescue request: guards, assignment, cooldown, effect contract.');
