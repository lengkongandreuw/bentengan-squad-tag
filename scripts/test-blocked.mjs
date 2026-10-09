import assert from 'node:assert/strict';
import { isBlocked } from '../modules/gameplay/collision-navigation.ts';

const free = () => false;
const blockedAt = () => true;
const base = ({ p, now, world } = {}) => ({
  p: {
    id: 'p1', team: 'blue', state: 'ACTIVE', characterId: 'raja',
    baseCharge: 99, parkourUntil: 0, x: 500, y: 500,
    ...p,
  },
  now: now ?? 1000,
  world: {
    kanal: false,
    studioSolidAt: free,
    waterBlocksAt: free,
    fortCoreAt: free,
    obstacleAt: free,
    waterAt: free,
    chargeTimeOf: () => 0.55,
    bases: { blue: { x: 100, y: 100 }, red: { x: 900, y: 100 } },
    baseRadius: 118,
    occupantAt: free,
    ...world,
  },
});

// Clear ground passes.
{
  const { p, now, world } = base();
  assert.equal(isBlocked(500, 500, p, now, world), false);
}
// Each guard blocks in HEAD order.
{
  const { p, now, world } = base({ world: { studioSolidAt: blockedAt } });
  assert.equal(isBlocked(1, 1, p, now, world), true, 'studio');
}
{
  const { p, now, world } = base({ world: { kanal: true, waterBlocksAt: blockedAt } });
  assert.equal(isBlocked(1, 1, p, now, world), true, 'kanal ring');
}
{
  const { p, now, world } = base({ world: { fortCoreAt: (x, y) => x === 10 && y === 10, kanal: true } });
  assert.equal(isBlocked(10, 10, { ...p, x: 0, y: 0 }, now, world), true, 'fort entry');
}
{
  const { p, now, world } = base({ world: { obstacleAt: blockedAt } });
  assert.equal(isBlocked(1, 1, p, now, world), true, 'obstacle');
}
{
  const p = { id: 'p1', team: 'blue', state: 'IN_BASE', characterId: 'raja', baseCharge: 0, parkourUntil: 0, x: 100, y: 100 };
  const { world } = base();
  assert.equal(isBlocked(400, 400, p, 1000, world), true, 'home charge gate');
}
{
  const { p, now, world } = base({ world: { occupantAt: () => true } });
  assert.equal(isBlocked(900 - 50, 100, p, now, world), true, 'occupied fort');
}
// Parkouring player skips the obstacle/fort branch.
{
  const { now, world } = base();
  const p = { id: 'p1', team: 'blue', state: 'ACTIVE', characterId: 'raja', baseCharge: 99, parkourUntil: 2000, x: 500, y: 500 };
  assert.equal(isBlocked(1, 1, { ...p, x: 1, y: 1 }, now, { ...world, obstacleAt: blockedAt }), false, 'parkour skips');
}
console.log('PASS isBlocked: studio, kanal ring, fort entry, obstacle, charge gate, occupied fort, parkour skip.');
