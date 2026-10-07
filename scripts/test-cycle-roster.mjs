import assert from 'node:assert/strict';
import { cycleRosterId } from '../modules/gameplay/roster.ts';

const roster = ['bebe', 'kodo', 'maria'];

// Forward and backward stepping with wrap-around.
assert.equal(cycleRosterId(roster, 'bebe', 1), 'kodo');
assert.equal(cycleRosterId(roster, 'maria', 1), 'bebe');
assert.equal(cycleRosterId(roster, 'bebe', -1), 'maria');
assert.equal(cycleRosterId(roster, 'kodo', -1), 'bebe');

// Unknown id falls back to HEAD's indexOf(-1) arithmetic, verbatim.
assert.equal(cycleRosterId(roster, 'nope', 1), 'bebe');
assert.equal(cycleRosterId(roster, 'nope', -1), 'kodo');

// Single-entry roster always returns itself.
assert.equal(cycleRosterId(['raja'], 'raja', 1), 'raja');
assert.equal(cycleRosterId(['raja'], 'raja', -1), 'raja');
console.log('PASS cycleRosterId: wrap-around both directions, unknown-id arithmetic, singleton.');
