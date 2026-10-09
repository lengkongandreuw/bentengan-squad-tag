import assert from 'node:assert/strict';
import { capture } from '../modules/gameplay/capture.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';

const facet = (id, over = {}) => ({
  id,
  name: id.toUpperCase(),
  team: 'blue',
  characterId: 'kaka',
  x: 100,
  y: 200,
  state: 'ACTIVE',
  exitOrder: 3,
  parkourUntil: 0,
  tagCooldown: 0,
  ultimateShieldUntil: 0,
  rescueShieldUntil: 0,
  captures: 0,
  capturedIds: [],
  actionUntil: 0,
  fortCharge: 50,
  prisonIndex: 0,
  ...over,
});

const recorder = (world = {}) => {
  const calls = { stats: [], profiles: [], events: [], bursts: [], audios: [], logs: [], teamActions: [], charges: [], missions: 0, layouts: 0, wins: [] };
  const full = {
    suddenDeath: false,
    loserAudible: true,
    onStat: (p, key) => calls.stats.push({ id: p.id, key }),
    onProfileStat: (key) => calls.profiles.push(key),
    onMatchEvent: (e) => calls.events.push(e),
    onBurst: (x, y, color) => calls.bursts.push({ x, y, color }),
    onAudio: (name, volume) => calls.audios.push({ name, volume }),
    onLog: (text) => calls.logs.push(text),
    onTeamAction: (x, y) => calls.teamActions.push({ x, y }),
    onChargeUltimate: (controlled, characterId, amount) => calls.charges.push({ controlled, characterId, amount }),
    onMissionTag: () => { calls.missions += 1; },
    onLayoutPrisons: () => { calls.layouts += 1; },
    onWinRound: (team, reason) => calls.wins.push({ team, reason }),
    ...world,
  };
  return { world: full, calls };
};
const effects = (calls) =>
  calls.stats.length + calls.profiles.length + calls.events.length + calls.bursts.length +
  calls.audios.length + calls.logs.length + calls.teamActions.length + calls.charges.length +
  calls.missions + calls.layouts + calls.wins.length;

// Blocked: loser ultimate shield.
{
  const { world, calls } = recorder();
  const w = facet('w', { exitOrder: 5 });
  const l = facet('l', { ultimateShieldUntil: 500 });
  capture(w, l, 100, world);
  assert.equal(effects(calls), 0);
  assert.equal(w.captures, 0);
}
// Blocked: winner tag cooldown and winner exit order <= loser.
{
  const { world, calls } = recorder();
  capture(facet('w', { exitOrder: 5, tagCooldown: 200 }), facet('l'), 100, world);
  assert.equal(effects(calls), 0);
  capture(facet('w', { exitOrder: 3 }), facet('l', { exitOrder: 3 }), 100, world);
  assert.equal(effects(calls), 0);
}
// Blocked: loser not targetable (PRISONER).
{
  const { world, calls } = recorder();
  capture(facet('w', { exitOrder: 5 }), facet('l', { state: 'PRISONER' }), 100, world);
  assert.equal(effects(calls), 0);
}
// Successful capture: transitions, stats, event, audio, meter, log, order of side effects.
{
  const { world, calls } = recorder();
  const w = facet('w', { exitOrder: 5, x: 90, y: 190, controlled: true });
  const l = facet('l', { exitOrder: 2, x: 110, y: 210 });
  capture(w, l, 1000, world);
  assert.equal(w.tagCooldown, 1000 + CHARACTER_BY_ID.kaka.tagCooldownMs);
  assert.equal(w.captures, 1);
  assert.deepEqual(w.capturedIds, ['l']);
  assert.equal(w.action, 'tag');
  assert.deepEqual(w.visualTagVector, { x: 20, y: 20 });
  assert.equal(w.actionUntil, 1420);
  assert.equal(l.state, 'PRISONER');
  assert.equal(l.prisonOwner, 'blue');
  assert.equal(l.fortCharge, 0);
  assert.equal(l.rescueShieldUntil, 0);
  assert.deepEqual(calls.stats, [{ id: 'w', key: 'tags' }, { id: 'l', key: 'prisons' }]);
  assert.deepEqual(calls.profiles, ['tagMusuh']);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].kind, 'tag');
  assert.equal(calls.events[0].actorName, 'W');
  assert.equal(calls.bursts[0].x, 110);
  assert.deepEqual(calls.audios, [{ name: 'tag', volume: undefined }]); // winner controlled
  assert.equal(calls.logs[0], 'W #5 menangkap L #2.');
  assert.deepEqual(calls.teamActions, [{ x: 110, y: 210 }]);
  assert.deepEqual(calls.charges, [{ controlled: true, characterId: 'kaka', amount: 20 }]);
  assert.equal(calls.missions, 1);
  assert.equal(calls.layouts, 1);
  assert.equal(calls.wins.length, 0);
}
// Audio: loser controlled wins the branch.
{
  const { world, calls } = recorder();
  capture(facet('w', { exitOrder: 5 }), facet('l', { exitOrder: 2, controlled: true }), 0, world);
  assert.deepEqual(calls.audios, [{ name: 'caught', volume: undefined }]);
}
// Audio: both bots, audible → tag at 0.22; not audible → silence.
{
  const a = recorder();
  capture(facet('w', { exitOrder: 5 }), facet('l', { exitOrder: 2 }), 0, a.world);
  assert.deepEqual(a.calls.audios, [{ name: 'tag', volume: 0.22 }]);
  const b = recorder({ loserAudible: false });
  capture(facet('w', { exitOrder: 5 }), facet('l', { exitOrder: 2 }), 0, b.world);
  assert.equal(b.calls.audios.length, 0);
}
// Returning loser targetable once rescue shield expired; sudden death win fires.
{
  const { world, calls } = recorder({ suddenDeath: true });
  const l = facet('l', { exitOrder: 2, state: 'RETURNING', rescueShieldUntil: 500 });
  capture(facet('w', { exitOrder: 5 }), l, 600, world);
  assert.equal(l.state, 'PRISONER');
  assert.deepEqual(calls.wins, [{ team: 'blue', reason: 'SUDDEN DEATH TAG' }]);
}
// Returning loser still shielded → blocked.
{
  const { world, calls } = recorder();
  capture(facet('w', { exitOrder: 5 }), facet('l', { exitOrder: 2, state: 'RETURNING', rescueShieldUntil: 900 }), 600, world);
  assert.equal(effects(calls), 0);
}

console.log('PASS capture: shields/cooldown/order blocks, full transition chain, audio branches, sudden death.');
