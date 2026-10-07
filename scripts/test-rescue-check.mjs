import assert from 'node:assert/strict';
import { rescueCheck } from '../modules/gameplay/rescue-check.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';

const player = (id, team, over = {}) => ({
  id,
  name: id.toUpperCase(),
  team,
  characterId: 'kaka',
  state: 'ACTIVE',
  x: 100,
  y: 100,
  actionUntil: 0,
  prisonIndex: 0,
  rescueShieldUntil: 0,
  waterEnteredAt: 0,
  ...over,
});

const worldOf = (players, over = {}) => {
  const calls = {
    stats: [], profiles: [], clears: 0, events: [], bursts: [], audios: [],
    logs: [], teamActions: [], charges: [], missions: 0,
  };
  return {
    world: {
      players,
      kanal: false,
      rescueRequest: null,
      audible: () => true,
      onStat: (p, key) => calls.stats.push({ id: p.id, key }),
      onProfileStat: (key) => calls.profiles.push(key),
      onClearRescueRequest: () => { calls.clears += 1; },
      onMatchEvent: (e) => calls.events.push(e),
      onBurst: (x, y, color, count) => calls.bursts.push({ x, y, color, count }),
      onAudio: (name, volume) => calls.audios.push({ name, volume }),
      onLog: (text) => calls.logs.push(text),
      onTeamAction: (rescuer, x, y) => calls.teamActions.push({ rescuer: rescuer.id, x, y }),
      onChargeUltimate: (controlled, characterId, amount) => calls.charges.push({ controlled, characterId, amount }),
      onMissionRescue: () => { calls.missions += 1; },
      ...over,
    },
    calls,
  };
};
const effects = (c) =>
  c.stats.length + c.profiles.length + c.clears + c.events.length + c.bursts.length +
  c.audios.length + c.logs.length + c.teamActions.length + c.charges.length + c.missions;

const kaka = CHARACTER_BY_ID.kaka;

// No prisoner nearby → nothing happens.
{
  const { world, calls } = worldOf([player('r', 'blue')]);
  rescueCheck(0, world);
  assert.equal(effects(calls), 0);
}
// Out of rescue range → nothing.
{
  const { world, calls } = worldOf([
    player('r', 'blue', { x: 0 }),
    player('h', 'blue', { state: 'PRISONER', x: 9000, y: 0 }),
  ]);
  rescueCheck(0, world);
  assert.equal(effects(calls), 0);
}
// Successful rescue: releases (sorted by prisonIndex), shield, shift, rescuer action.
{
  const rescuer = player('r', 'blue', { x: 100, controlled: true });
  const h1 = player('h1', 'blue', { state: 'PRISONER', prisonIndex: 2, x: 120, prisonOwner: 'red', rescueShieldUntil: 7, controlled: true });
  const h2 = player('h2', 'blue', { state: 'PRISONER', prisonIndex: 1, x: 130, prisonOwner: 'red' });
  const { world, calls } = worldOf([rescuer, h1, h2]);
  rescueCheck(500, world);
  for (const h of [h1, h2]) {
    assert.equal(h.state, 'RETURNING');
    assert.equal(h.prisonOwner, undefined);
    assert.equal(h.rescueShieldUntil, 500 + kaka.rescueShieldMs);
    assert.equal(h.x, (h === h1 ? 120 : 130) - 22); // blue shift
  }
  assert.equal(rescuer.action, 'rescue');
  assert.equal(rescuer.actionUntil, 960);
  assert.deepEqual(calls.stats, [{ id: 'r', key: 'rescues' }]);
  assert.deepEqual(calls.profiles, ['rescueTeam']);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].kind, 'rescue');
  assert.equal(calls.events[0].rescuedCount, 2);
  assert.equal(calls.events[0].targetName, undefined); // 2 held → no single target
  assert.deepEqual(calls.bursts, [{ x: 98, y: 100, color: '#b9ee3d', count: 26 }]); // post-shift x
  assert.deepEqual(calls.audios, [{ name: 'rescued', volume: undefined }]); // held controlled wins
  assert.equal(calls.logs[0], 'R membebaskan 2 rekan.');
  assert.deepEqual(calls.teamActions, [{ rescuer: 'r', x: 98, y: 100 }]); // post-shift x
  assert.deepEqual(calls.charges, [{ controlled: true, characterId: 'kaka', amount: 30 }]);
  assert.equal(calls.missions, 1);
}
// Single held → target name/team on event; red rescuer shifts +22.
{
  const rescuer = player('r', 'red', { x: 0 });
  const h = player('h', 'red', { state: 'PRISONER', x: 0, prisonOwner: 'blue', name: 'MATE' });
  const { world, calls } = worldOf([rescuer, h]);
  rescueCheck(0, world);
  assert.equal(h.x, 22);
  assert.equal(calls.events[0].targetName, 'MATE');
  assert.equal(calls.events[0].targetTeam, 'red');
  assert.equal(calls.events[0].rescuedCount, 1);
}
// Rescue request cleared only when requester is among held.
{
  const req = { requesterId: 'h1', team: 'blue', expiresAt: 9999 };
  const rescuer = player('r', 'blue', { x: 0 });
  const h1 = player('h1', 'blue', { state: 'PRISONER', x: 0 });
  const w1 = worldOf([rescuer, h1], { rescueRequest: req });
  rescueCheck(0, w1.world);
  assert.equal(w1.calls.clears, 1);
  const other = player('h2', 'blue', { state: 'PRISONER', x: 0 });
  const w2 = worldOf([player('r2', 'blue', { x: 0 }), other], { rescueRequest: { ...req, requesterId: 'zzz' } });
  rescueCheck(0, w2.world);
  assert.equal(w2.calls.clears, 0);
}
// Audio branches: rescuer controlled → 'rescue'; bot + audible → 'rescue' .25; inaudible → silence.
{
  const r1 = player('r', 'blue', { x: 0, controlled: true });
  const w1 = worldOf([r1, player('h', 'blue', { state: 'PRISONER', x: 0 })]);
  rescueCheck(0, w1.world);
  assert.deepEqual(w1.calls.audios, [{ name: 'rescue', volume: undefined }]);
}
{
  const w2 = worldOf(
    [player('r', 'blue', { x: 0 }), player('h', 'blue', { state: 'PRISONER', x: 0 })],
    { audible: () => true },
  );
  rescueCheck(0, w2.world);
  assert.deepEqual(w2.calls.audios, [{ name: 'rescue', volume: 0.25 }]);
}
{
  const w3 = worldOf(
    [player('r', 'blue', { x: 0 }), player('h', 'blue', { state: 'PRISONER', x: 0 })],
    { audible: () => false },
  );
  rescueCheck(0, w3.world);
  assert.equal(w3.calls.audios.length, 0);
}
// Kanal water rescuers skipped; non-ACTIVE rescuers skipped.
{
  const { world, calls } = worldOf([
    player('r', 'blue', { x: 0, waterEnteredAt: 5 }),
    player('h', 'blue', { state: 'PRISONER', x: 0 }),
  ], { kanal: true });
  rescueCheck(0, world);
  assert.equal(effects(calls), 0);
}

console.log('PASS rescueCheck: no-held/range blocks, release chain, request clear, audio branches, kanal skip.');
