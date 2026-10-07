import assert from 'node:assert/strict';
import { resolvePlayerSpacing } from '../modules/gameplay/collision-navigation.ts';

const bases = { blue: { x: 100, y: 400 }, red: { x: 1900, y: 400 } };

const player = (id, team, x, y, over = {}) => ({
  id,
  team,
  characterId: 'kaka',
  state: 'ACTIVE',
  baseCharge: 1, // fully charged → IN_BASE radius guard never blocks
  waterEnteredAt: 0,
  x,
  y,
  ...over,
});

const worldOf = (players, over = {}) => {
  const recovered = [];
  return {
    world: {
      players,
      kanal: false,
      round: 1,
      worldWidth: 2000,
      worldHeight: 800,
      waterBlocksAt: () => false,
      waterAt: () => false,
      fortCoreAt: () => false,
      obstacleAt: () => false,
      bases,
      baseRadius: 100,
      onRecover: (p) => recovered.push(p.id),
      ...over,
    },
    recovered,
  };
};

// Overlapping ACTIVE pair pushes apart to roughly the 30px minimum.
{
  const a = player('a', 'blue', 500, 400);
  const b = player('b', 'red', 510, 400);
  const { world, recovered } = worldOf([a, b]);
  resolvePlayerSpacing(0, world);
  const separation = Math.hypot(b.x - a.x, b.y - a.y);
  assert.ok(separation >= 30, `separation ${separation} < 30`);
  assert.equal(a.y, 400); // pure x-axis push
  assert.deepEqual(recovered, ['a', 'b']);
}
// Both IN_BASE use the 42px minimum.
{
  const a = player('a', 'blue', 100, 400, { state: 'IN_BASE' });
  const b = player('b', 'blue', 120, 400, { state: 'IN_BASE' });
  const { world } = worldOf([a, b]);
  resolvePlayerSpacing(0, world);
  const separation = Math.hypot(b.x - a.x, b.y - a.y);
  assert.ok(separation >= 42, `separation ${separation} < 42`);
}
// Already separated: untouched.
{
  const a = player('a', 'blue', 500, 400);
  const b = player('b', 'red', 600, 400);
  const { world, recovered } = worldOf([a, b]);
  resolvePlayerSpacing(0, world);
  assert.equal(a.x, 500);
  assert.equal(b.x, 600);
  assert.deepEqual(recovered, ['a', 'b']); // recovery still runs
}
// Forbidden target (obstacle everywhere): no move.
{
  const a = player('a', 'blue', 500, 400);
  const b = player('b', 'red', 510, 400);
  const { world } = worldOf([a, b], { obstacleAt: () => true });
  resolvePlayerSpacing(0, world);
  assert.equal(a.x, 500);
  assert.equal(b.x, 510);
}
// Prisoners and kanal swimmers are excluded from pairing.
{
  const a = player('a', 'blue', 500, 400);
  const pris = player('p', 'blue', 505, 400, { state: 'PRISONER' });
  const { world, recovered } = worldOf([a, pris]);
  resolvePlayerSpacing(0, world);
  assert.equal(a.x, 500);
  assert.equal(pris.x, 505);
  assert.deepEqual(recovered, ['a']); // prisoner not recovered either
}
{
  const a = player('a', 'blue', 500, 400);
  const wet = player('w', 'red', 505, 400, { waterEnteredAt: 9 });
  const { world, recovered } = worldOf([a, wet], { kanal: true });
  resolvePlayerSpacing(0, world);
  assert.equal(a.x, 500);
  assert.equal(wet.x, 505);
  assert.deepEqual(recovered, ['a']);
}
// Coincident players separate on the tieHash axis without NaN.
{
  const a = player('a', 'blue', 400, 400);
  const b = player('b', 'red', 400, 400);
  const { world } = worldOf([a, b]);
  resolvePlayerSpacing(0, world);
  assert.ok(Number.isFinite(a.x) && Number.isFinite(b.x));
  const separation = Math.hypot(b.x - a.x, b.y - a.y);
  assert.ok(separation >= 30, `coincident separation ${separation}`);
}
// Bound clamp: pair near the left edge cannot pass x=34.
{
  const a = player('a', 'blue', 40, 400);
  const b = player('b', 'red', 50, 400);
  const { world } = worldOf([a, b]);
  resolvePlayerSpacing(0, world);
  assert.ok(a.x >= 34, `a.x ${a.x} < 34`);
  assert.ok(b.x >= 34, `b.x ${b.x} < 34`);
}

console.log('PASS resolvePlayerSpacing: push apart, in-base 42, no-op, blocked, exclusions, coincidence, clamp.');
