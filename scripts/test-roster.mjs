import assert from 'node:assert/strict';
import { makePlayers } from '../modules/gameplay/roster.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';
import { FIXED_ROSTERS, TEAM_FOR_FACTION, lineupFor } from '../modules/world/team-tables.ts';
import GAME_RULES from '../config/game-rules.json' with { type: 'json' };

const bases = { blue: { x: 100, y: 400 }, red: { x: 1900, y: 400 } };

// Default faction (null → 'red'): 10 players, ids, control flags.
{
  const roster = makePlayers({ faction: null, selectedId: 'raja', bases });
  assert.equal(roster.length, GAME_RULES.matchSize * 2);
  assert.deepEqual(
    roster.slice(0, GAME_RULES.matchSize).map((p) => p.id),
    ['you', 'ally2', 'ally3', 'ally4', 'ally5'],
  );
  assert.deepEqual(
    roster.slice(GAME_RULES.matchSize).map((p) => p.id),
    ['enemy1', 'enemy2', 'enemy3', 'enemy4', 'enemy5'],
  );
  assert.equal(roster[0].controlled, true);
  assert.ok(roster.slice(1).every((p) => p.controlled === false));
  // Unique ids.
  assert.equal(new Set(roster.map((p) => p.id)).size, 10);
}
// Teams follow faction tables; user faction 'red' → user team 'blue'.
{
  const roster = makePlayers({ faction: 'red', selectedId: 'raja', bases });
  const userTeam = TEAM_FOR_FACTION.red;
  assert.ok(roster.slice(0, 5).every((p) => p.team === userTeam));
  assert.ok(roster.slice(5).every((p) => p.team !== userTeam));
}
// selectedId leads the user lineup when it belongs to the faction roster.
{
  const roster = makePlayers({ faction: 'red', selectedId: 'jago', bases });
  assert.equal(roster[0].characterId, 'jago');
  assert.equal(roster[0].name, CHARACTER_BY_ID.jago.name.toUpperCase());
}
// Opponent lineup uses the default order without a selection.
{
  const roster = makePlayers({ faction: 'red', selectedId: 'jago', bases });
  const expected = lineupFor('green');
  assert.deepEqual(
    roster.slice(5).map((p) => p.characterId),
    expected,
  );
}
// Spawn offsets with team direction; state and stat defaults verbatim.
{
  const roster = makePlayers({ faction: null, selectedId: 'raja', bases });
  const offset = GAME_RULES.spawnOffsets[0];
  const you = roster[0];
  assert.equal(you.state, 'IN_BASE');
  assert.equal(you.boost, CHARACTER_BY_ID[you.characterId].boost);
  assert.equal(you.x, bases.blue.x + offset.x); // blue direction +1
  assert.equal(you.y, bases.blue.y + offset.y);
  assert.equal(you.lastX, you.x);
  assert.equal(you.lastY, you.y);
  assert.equal(you.vx, 0);
  assert.equal(you.captures, 0);
  const enemy = roster[5];
  assert.equal(enemy.x, bases.red.x - offset.x); // red direction −1
}
// aiSeed: slot formula with the red-team offset.
{
  const roster = makePlayers({ faction: null, selectedId: 'raja', bases });
  assert.equal(roster[0].aiSeed, 0.35); // blue slot 0: 0.35 + 0*1.17
  assert.equal(roster[5].aiSeed, 0.35 + 5.3); // red slot 0
}
// Roster contents come from the fixed lineups.
{
  const roster = makePlayers({ faction: 'green', selectedId: 'kaka', bases });
  const userIds = lineupFor('green', 'kaka');
  assert.deepEqual(roster.slice(0, 5).map((p) => p.characterId), userIds);
  assert.deepEqual(
    roster.slice(5).map((p) => p.characterId),
    FIXED_ROSTERS.red.slice(0, GAME_RULES.matchSize),
  );
}
// Pure: identical options → identical output.
{
  const a = makePlayers({ faction: 'red', selectedId: 'raja', bases });
  const b = makePlayers({ faction: 'red', selectedId: 'raja', bases });
  assert.deepEqual(a, b);
}

console.log('PASS makePlayers: ids/control, teams, lineup order, spawn offsets, aiSeed, purity.');
