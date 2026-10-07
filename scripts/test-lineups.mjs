import assert from 'node:assert/strict';
import { nextLandingArenaId, stepFieldId } from '../modules/game-core/match-control.ts';
import { rosterCharacters, squadLineup, opponentLineup } from '../modules/gameplay/roster.ts';

// Landing rotation never repeats the current arena (picker stubbed).
const ids = ['kampung', 'pasar', 'taman'];
assert.equal(nextLandingArenaId('kampung', ids, () => 0), 'pasar');
assert.equal(nextLandingArenaId('kampung', ids, (count) => count - 1), 'taman');
assert.equal(nextLandingArenaId('taman', ids, () => 0), 'kampung');

// Null faction yields empty selections.
assert.deepEqual(rosterCharacters(null), []);
assert.deepEqual(squadLineup(null, 'raja'), []);
assert.deepEqual(opponentLineup(null), []);

// Red selection promotes the selected id first, capped at match size.
const squad = squadLineup('red', 'jago');
assert.deepEqual(squad, ['jago', 'raja', 'robot', 'lala', 'kumis']);
assert.deepEqual(squadLineup('green', 'nope'), ['ciici', 'kaka', 'buto', 'maria', 'boke']);

// Green opponent mirrors without promotion.
assert.deepEqual(opponentLineup('red'), ['ciici', 'kaka', 'buto', 'maria', 'boke']);
assert.deepEqual(opponentLineup('green'), ['raja', 'robot', 'jago', 'lala', 'kumis']);
assert.ok(rosterCharacters('red').length === 7);
assert.ok(rosterCharacters('red').every((character) => character && character.id));

// Field cards step with wrap-around in both directions (keyboard + buttons share it).
assert.equal(stepFieldId('kampung', 1, ids), 'pasar');
assert.equal(stepFieldId('kampung', -1, ids), 'taman');
assert.equal(stepFieldId('bogus', 1, ids), 'kampung');
console.log('PASS lineups: landing rotation exclusion, null-faction empties, squad promotion.');
