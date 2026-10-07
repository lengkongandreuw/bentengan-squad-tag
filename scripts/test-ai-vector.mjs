import assert from 'node:assert/strict';
import { aiVector } from '../modules/gameplay/ai-movement.ts';

const profile = {
  enemySpeed: 1,
  steerDistance: 86,
  boostThreshold: 0.5,
  prediction: 0.18,
  playerBias: 0,
  threatRadius: 165,
  rescueCutoff: 1.55,
  boostDrain: 0.66,
};
const stats = { boost: 100, tagCooldownMs: 900, tagRange: 46, rescueRange: 70, rescueShieldMs: 1500, baseChargeTime: 4000 };
const bases = { blue: { x: 100, y: 400 }, red: { x: 1900, y: 400 } };
const baseWorld = {
  players: [],
  rescueRequest: null,
  refills: [],
  bases,
  worldWidth: 2000,
  worldHeight: 800,
  aiProfile: profile,
  characterStats: { kaka: stats },
};
const player = (over = {}) => ({
  id: 'p1', team: 'blue', characterId: 'kaka', x: 500, y: 400, vx: 0, vy: 0,
  state: 'ACTIVE', exitOrder: 5, boost: 100, aiSeed: 0, prisonIndex: 0, ...over,
});

// RETURNING heads to own base.
{
  const p = player({ state: 'RETURNING', x: 500, y: 400 });
  const v = aiVector(p, 0, baseWorld);
  assert.deepEqual(v, { x: -400, y: 0 });
}
// IN_BASE wanders toward map center.
{
  const p = player({ state: 'IN_BASE', x: 100, y: 400 });
  const v = aiVector(p, 0, baseWorld);
  assert.equal(v.x, 900);
  assert.equal(v.y, 0); // worldHeight/2 - p.y + sin(0)*230
}
// Assigned rescue request wins.
{
  const captive = player({ id: 'mate', state: 'PRISONER', x: 1500, y: 300 });
  const p = player({ id: 'me' });
  const world = {
    ...baseWorld,
    players: [p, captive],
    rescueRequest: { requesterId: 'mate', team: 'blue', expiresAt: 9e9, assignedRescuerId: 'me' },
  };
  const v = aiVector(p, 0, world);
  assert.deepEqual(v, { x: 1000, y: -100 });
}
// Held teammate rescued when under cutoff but 3+ held.
{
  const me = player();
  const held1 = player({ id: 'h1', state: 'PRISONER', x: 1700, y: 400, prisonIndex: 3 });
  const held2 = player({ id: 'h2', state: 'PRISONER', x: 1710, y: 400, prisonIndex: 2 });
  const held3 = player({ id: 'h3', state: 'PRISONER', x: 1720, y: 400, prisonIndex: 1 });
  const v = aiVector(me, 0, { ...baseWorld, players: [me, held1, held2, held3] });
  assert.equal(v.x, 1200); // highest prisonIndex first
}
// Low boost chases nearby refill.
{
  const me = player({ boost: 10 });
  const v = aiVector(me, 0, { ...baseWorld, players: [me], refills: [{ id: 1, x: 700, y: 400, grade: 40, lane: 0, expiresAt: 9e9 }] });
  assert.deepEqual(v, { x: 200, y: 0 });
}
// Nearby threat repels.
{
  const me = player({ x: 500, exitOrder: 3 });
  const foe = player({ id: 'foe', team: 'red', x: 600, exitOrder: 4, state: 'ACTIVE' });
  const v = aiVector(me, 0, { ...baseWorld, players: [me, foe] });
  assert.deepEqual(v, { x: -100, y: 0 });
}
// Lower exitOrder target is intercepted with prediction.
{
  const me = player({ x: 500, exitOrder: 6, aiSeed: 9999 });
  const prey = player({ id: 'prey', team: 'red', x: 700, y: 400, vx: 10, vy: 0, exitOrder: 2 });
  const v = aiVector(me, 0, { ...baseWorld, players: [me, prey] });
  assert.equal(v.x, 700 + 10 * 0.18 - 500);
}
// Default push toward enemy base (blue → red base at x=1900).
{
  const me = player({ x: 500, y: 400, aiSeed: 0 });
  const v = aiVector(me, 0, { ...baseWorld, players: [me] });
  assert.equal(v.x, 1400);
  assert.ok(Math.abs(v.y - (Math.sin(0) * 150)) < 1e-9);
}

console.log('PASS aiVector: returning, base idle, rescue, held, refill, threat, target, default.');
