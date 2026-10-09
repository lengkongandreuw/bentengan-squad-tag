import assert from 'node:assert/strict';
import { pushMatchEvent } from '../modules/game-core/match-state.ts';

const tag = {
  kind: 'tag',
  actorName: 'Raja',
  actorTeam: 'red',
  targetName: 'Kaka',
  targetTeam: 'green',
};
const rescue = {
  kind: 'rescue',
  actorName: 'Ciici',
  actorTeam: 'green',
  rescuedCount: 2,
};

// 1. Empty queue: event lands with priority 1, 2100ms expiry, id 1.
let q = pushMatchEvent({ events: [], nextId: 0 }, tag, 1000);
assert.equal(q.events.length, 1);
assert.deepEqual(
  [q.events[0].id, q.events[0].priority, q.events[0].expiresAt, q.nextId],
  [1, 1, 3100, 1],
);

// 2. Priorities: rescue beats tag (2 > 1).
q = pushMatchEvent({ events: [], nextId: 0 }, rescue, 1000);
assert.equal(q.events[0].priority, 2);
assert.equal(q.events[0].expiresAt, 3500);

// 3. Expired events are filtered before push.
const stale = { ...q.events[0], expiresAt: 500 };
q = pushMatchEvent({ events: [stale], nextId: 9 }, tag, 1000);
assert.equal(q.events.length, 1);
assert.equal(q.events[0].id, 10);

// 4. Lower-priority incoming is dropped WITHOUT consuming an id.
// (held already consumed id 5 on its own push, so nextId sits at 5.)
const held = pushMatchEvent({ events: [], nextId: 4 }, rescue, 1000);
assert.equal(held.nextId, 5);
const dropped = pushMatchEvent(held, tag, 1100);
assert.equal(dropped.events.length, 1);
assert.equal(dropped.events[0].kind, 'rescue');
assert.equal(dropped.nextId, 5);
assert.deepEqual(dropped.events, held.events);

// 5. Higher-or-equal priority replaces the whole queue.
const taken = pushMatchEvent(held, rescue, 1200);
assert.equal(taken.events.length, 1);
assert.equal(taken.events[0].id, 6);
assert.equal(taken.nextId, 6);

// 6. rescue-request kind: priority 1, 1800ms expiry.
const req = pushMatchEvent(
  { events: [], nextId: 0 },
  { kind: 'rescue-request', actorName: 'Bebe', actorTeam: 'red' },
  1000,
);
assert.deepEqual(
  [req.events[0].priority, req.events[0].expiresAt, req.nextId],
  [1, 2800, 1],
);

// 7. Input objects are never mutated.
const input = { ...tag };
const before = { ...input };
pushMatchEvent({ events: [], nextId: 0 }, input, 1000);
assert.deepEqual(input, before);

// 8. Returned array is fresh on replace; drop path returns shared refs.
assert.notEqual(taken.events, held.events);
console.log('PASS pushMatchEvent: priority, expiry, drop w/o id, replace, input intact.');
