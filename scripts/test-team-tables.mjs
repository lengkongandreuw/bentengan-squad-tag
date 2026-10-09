import assert from 'node:assert/strict';
import {
  FACTION_FOR_TEAM,
  factionName,
  FIXED_ROSTERS,
  lineupFor,
  TEAM_COLOR,
  TEAM_FOR_FACTION,
  teamName,
} from '../modules/world/team-tables.ts';

// Tables mirror the game-rules config.
assert.equal(TEAM_COLOR.blue, '#ef3f43');
assert.equal(TEAM_COLOR.red, '#42d875');
assert.deepEqual(TEAM_FOR_FACTION, { red: 'blue', green: 'red' });
assert.deepEqual(FACTION_FOR_TEAM, { blue: 'red', red: 'green' });
assert.deepEqual(FIXED_ROSTERS.red.slice(0, 3), ['raja', 'robot', 'jago']);
assert.deepEqual(FIXED_ROSTERS.green.slice(0, 3), ['ciici', 'kaka', 'buto']);

// Naming follows the config labels.
assert.equal(factionName('red'), 'Tim Merah');
assert.equal(factionName('green'), 'Tim Hijau');
assert.equal(teamName('blue'), 'Tim Merah');
assert.equal(teamName('red'), 'Tim Hijau');

// Lineups: fixed order, selected-first promotion, matchSize cap.
assert.equal(lineupFor('red').length, 5);
assert.equal(lineupFor('red')[0], 'raja');
assert.deepEqual(lineupFor('red', 'bebe').slice(0, 2), ['bebe', 'raja']);
assert.equal(lineupFor('green', 'kodo')[0], 'kodo');
console.log('PASS team tables: colors, mappings, names, lineups.');
