import assert from 'node:assert/strict';
import { baseCheck } from '../modules/gameplay/base-check.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';

const kaka = CHARACTER_BY_ID.kaka;
const bases = { blue: { x: 100, y: 400 }, red: { x: 1900, y: 400 } };
const baseRadius = 100;

const player = (id, team, x, y, over = {}) => ({
  id,
  name: id.toUpperCase(),
  team,
  characterId: 'kaka',
  state: 'ACTIVE',
  x,
  y,
  boost: 50,
  boostReadyAt: 0,
  baseCharge: 0,
  exitDeadline: 0,
  fortCharge: 0,
  lastExitAt: 0,
  waterEnteredAt: 0,
  ...over,
});

const worldOf = (players, over = {}) => {
  const calls = { exits: [], logs: [], tones: [], wins: [] };
  return {
    world: {
      players,
      bases,
      baseRadius,
      kanal: false,
      round: 1,
      onExitCandidate: (p) => calls.exits.push(p.id),
      onLog: (text) => calls.logs.push(text),
      onTone: (frequency, duration) => calls.tones.push({ frequency, duration }),
      onWinRound: (team, reason) => calls.wins.push({ team, reason }),
      ...over,
    },
    calls,
  };
};

// PRISONER and kanal-water players are skipped entirely.
{
  const p = player('pris', 'blue', 100, 400, { state: 'PRISONER' });
  const { world, calls } = worldOf([p]);
  baseCheck(p, 0.016, 0, world);
  assert.equal(calls.exits.length + calls.wins.length, 0);
  assert.equal(p.fortCharge, 0);
}
{
  const p = player('wet', 'blue', 100, 400, { waterEnteredAt: 5 });
  const { world, calls } = worldOf([p], { kanal: true });
  baseCheck(p, 0.016, 0, world);
  assert.equal(calls.exits.length, 0);
}
// Re-entry jitter: ACTIVE inside own fort within 1500ms only zeroes fortCharge.
{
  const p = player('edge', 'blue', 100, 400, { lastExitAt: 1000, fortCharge: 0.9 });
  const { world, calls } = worldOf([p]);
  baseCheck(p, 0.016, 1500, world); // exactly 500ms after exit
  assert.equal(p.fortCharge, 0);
  assert.equal(p.state, 'ACTIVE');
  assert.equal(calls.exits.length, 0);
}
// Non-IN_BASE arrival inside uncontested fort → enters IN_BASE and charges.
{
  const p = player('arr', 'blue', 100, 400, { state: 'ACTIVE', lastExitAt: 0 });
  const { world } = worldOf([p]);
  baseCheck(p, 0.5, 9999, world);
  assert.equal(p.state, 'IN_BASE');
  assert.equal(p.baseCharge, 0.5);
  assert.equal(p.boost, kaka.boost);
  assert.equal(p.boostReadyAt, 0);
}
// Charging queue: only the top-3 by baseCharge charge; a 4th waits.
{
  const mk = (id, charge, state) =>
    player(id, 'blue', 100, 400, { state, baseCharge: charge });
  const queue = [mk('a', 0.5, 'IN_BASE'), mk('b', 0.4, 'IN_BASE'), mk('c', 0.3, 'IN_BASE'), mk('d', 0.2, 'IN_BASE')];
  const { world } = worldOf(queue);
  const before = queue.map((q) => q.baseCharge);
  for (const q of queue) baseCheck(q, 0.1, 0, world);
  // top-3 advanced, 4th did not
  assert.ok(queue[0].baseCharge > before[0]);
  assert.ok(queue[1].baseCharge > before[1]);
  assert.ok(queue[2].baseCharge > before[2]);
  assert.equal(queue[3].baseCharge, 0.2);
}
// Full charge arms the 5s exit deadline exactly once.
{
  const p = player('full', 'blue', 100, 400, { state: 'IN_BASE', baseCharge: kaka.baseChargeTime - 0.5 });
  const { world } = worldOf([p]);
  baseCheck(p, 1, 5000, world);
  assert.equal(p.baseCharge, kaka.baseChargeTime);
  assert.equal(p.exitDeadline, 5000 + 5000);
  baseCheck(p, 1, 8000, world); // deadline already set, not re-armed
  assert.equal(p.exitDeadline, 10000);
}
// Forced exit after the grace: pushed to the fort edge with a log.
{
  const p = player('late', 'blue', 100, 400, {
    state: 'IN_BASE',
    baseCharge: kaka.baseChargeTime,
    exitDeadline: 4000,
  });
  const { world, calls } = worldOf([p]);
  baseCheck(p, 1, 4000, world);
  assert.equal(p.x, 100 + baseRadius + 5);
  assert.deepEqual(calls.exits, ['late']);
  assert.equal(calls.logs[0], 'LATE dipaksa keluar—grace 5 detik habis.');
}
// Full-charge IN_BASE outside the fort becomes an exit candidate.
{
  const p = player('out', 'blue', 500, 400, { state: 'IN_BASE', baseCharge: kaka.baseChargeTime });
  const { world, calls } = worldOf([p]);
  baseCheck(p, 1, 0, world);
  assert.deepEqual(calls.exits, ['out']);
}
// Contested own fort: IN_BASE occupant becomes an exit candidate.
{
  const me = player('home', 'blue', 100, 400, { state: 'IN_BASE' });
  const enemy = player('invader', 'red', 150, 400, { state: 'ACTIVE' });
  const { world, calls } = worldOf([me, enemy]);
  baseCheck(me, 0.016, 0, world);
  assert.deepEqual(calls.exits, ['home']);
}
// Enemy fort capture: uncontested charge then win at 1.5s; defended → no charge.
{
  const raid = player('raider', 'blue', 1900, 400, { state: 'ACTIVE', fortCharge: 1.4 });
  const { world, calls } = worldOf([raid]);
  baseCheck(raid, 0.2, 0, world);
  assert.ok(Math.abs(raid.fortCharge - 1.6) < 1e-9);
  assert.deepEqual(calls.wins, [{ team: 'blue', reason: 'BENTENG DIREBUT' }]);
}
{
  const raid = player('raider', 'blue', 1900, 400, { state: 'ACTIVE', fortCharge: 0.9 });
  const guard = player('guard', 'red', 1900, 420, { state: 'ACTIVE' });
  const { world, calls } = worldOf([raid, guard]);
  baseCheck(raid, 0.2, 0, world);
  assert.equal(raid.fortCharge, 0);
  assert.equal(calls.wins.length, 0);
}
// Outside enemy fort: fortCharge resets.
{
  const p = player('far', 'blue', 900, 400, { fortCharge: 0.7 });
  const { world } = worldOf([p]);
  baseCheck(p, 0.1, 0, world);
  assert.equal(p.fortCharge, 0);
}
// Boost-ready refill fires once with controlled log + tone.
{
  const p = player('me', 'blue', 900, 400, { controlled: true, boost: 10, boostReadyAt: 7000 });
  const { world, calls } = worldOf([p]);
  baseCheck(p, 1, 7001, world);
  assert.equal(p.boost, kaka.boost);
  assert.equal(p.boostReadyAt, 0);
  assert.equal(calls.logs[0], 'Boost ME pulih penuh setelah 20 detik.');
  assert.deepEqual(calls.tones, [{ frequency: 690, duration: 0.13 }]);
}

console.log('PASS baseCheck: skips, jitter, entry, queue top-3, deadline, forced exit, contested, capture, boost-ready.');
