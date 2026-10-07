import assert from 'node:assert/strict';
import { tagCheck } from '../modules/gameplay/tag-check.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';

const player = (id, team, over = {}) => ({
  id,
  team,
  characterId: 'kaka',
  state: 'ACTIVE',
  exitOrder: 1,
  parkourUntil: 0,
  ultimateShieldUntil: 0,
  rescueShieldUntil: 0,
  waterEnteredAt: 0,
  x: 0,
  y: 0,
  lastX: 0,
  lastY: 0,
  ...over,
});

const worldOf = (players, over = {}) => {
  const captures = [];
  return {
    world: {
      players,
      kanal: false,
      lineOfSight: () => true,
      onCapture: (attacker, target) => {
        captures.push({ attacker: attacker.id, target: target.id });
        target.state = 'PRISONER';
      },
      ...over,
    },
    captures,
  };
};

// Same team ignored; line-of-sight blocked; parkour active; kanal water.
{
  const a = player('a', 'blue', { exitOrder: 5 });
  const b = player('b', 'blue', { exitOrder: 1 });
  const { world, captures } = worldOf([a, b]);
  tagCheck(0, world);
  assert.equal(captures.length, 0);
}
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5 }), player('b', 'red', { exitOrder: 1 })],
    { lineOfSight: () => false },
  );
  tagCheck(0, world);
  assert.equal(captures.length, 0);
}
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5, parkourUntil: 500 }), player('b', 'red', { exitOrder: 1 })],
  );
  tagCheck(100, world);
  assert.equal(captures.length, 0);
}
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5 }), player('b', 'red', { exitOrder: 1, waterEnteredAt: 10 })],
    { kanal: true },
  );
  tagCheck(0, world);
  assert.equal(captures.length, 0);
}
// Legal contact in range: higher exitOrder tags lower.
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5 }), player('b', 'red', { exitOrder: 2 })],
  );
  tagCheck(0, world);
  assert.deepEqual(captures, [{ attacker: 'a', target: 'b' }]);
}
// Out of range: no contact.
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5, x: 0, lastX: 0 }), player('b', 'red', { exitOrder: 2, x: 4000, lastX: 4000 })],
  );
  tagCheck(0, world);
  assert.equal(captures.length, 0);
}
// Equal exitOrder: no contact. Target PRISONER: no contact.
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 3 }), player('b', 'red', { exitOrder: 3 })],
  );
  tagCheck(0, world);
  assert.equal(captures.length, 0);
}
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5 }), player('b', 'red', { exitOrder: 2, state: 'PRISONER' })],
  );
  tagCheck(0, world);
  assert.equal(captures.length, 0);
}
// RETURNING target needs expired rescue shield; ultimate shield blocks.
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5 }), player('b', 'red', { exitOrder: 2, state: 'RETURNING', rescueShieldUntil: 500 })],
  );
  tagCheck(100, world);
  assert.equal(captures.length, 0);
}
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5 }), player('b', 'red', { exitOrder: 2, state: 'RETURNING', rescueShieldUntil: 0 })],
  );
  tagCheck(100, world);
  assert.deepEqual(captures, [{ attacker: 'a', target: 'b' }]);
}
{
  const { world, captures } = worldOf(
    [player('a', 'blue', { exitOrder: 5 }), player('b', 'red', { exitOrder: 2, ultimateShieldUntil: 500 })],
  );
  tagCheck(100, world);
  assert.equal(captures.length, 0);
}
// Range is tagRange + 4: exactly at edge hits, one past misses.
{
  const range = CHARACTER_BY_ID.kaka.tagRange + 4;
  const hit = worldOf(
    [player('a', 'blue', { exitOrder: 5, x: 0, lastX: 0 }), player('b', 'red', { exitOrder: 2, x: range, lastX: range })],
  );
  tagCheck(0, hit.world);
  assert.equal(hit.captures.length, 1);
  const miss = worldOf(
    [player('a', 'blue', { exitOrder: 5, x: 0, lastX: 0 }), player('b', 'red', { exitOrder: 2, x: range + 1, lastX: range + 1 })],
  );
  tagCheck(0, miss.world);
  assert.equal(miss.captures.length, 0);
}
// Priority: highest attacker exitOrder resolves first; a resolved player
// is not captured again in the same tick.
{
  const shared = player('t', 'red', { exitOrder: 1 });
  const a1 = player('a1', 'blue', { exitOrder: 9 });
  const a2 = player('a2', 'blue', { exitOrder: 7 });
  const { world, captures } = worldOf([a2, shared, a1]);
  tagCheck(0, world);
  assert.deepEqual(captures, [{ attacker: 'a1', target: 't' }]);
}

console.log('PASS tagCheck: team/LOS/parkour/water blocks, range edge, shields, priority resolution.');
