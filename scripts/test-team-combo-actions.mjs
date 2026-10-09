import assert from 'node:assert/strict';
import { registerTeamAction } from '../modules/gameplay/team-combo-actions.ts';
import { createTeamComboState } from '../modules/gameplay/team-combo.ts';
import { TEAM_COLOR } from '../modules/world/team-tables.ts';

const teammate = (id, team, state = 'ACTIVE') => ({
  id, team, state, characterId: 'kaka', boost: 50,
});

const recorder = (playerTeam = 'blue', players = []) => {
  const calls = { callouts: [], boosts: [], bursts: [], tones: [], logs: [], mission: 0 };
  const world = {
    comboState: createTeamComboState(),
    playerTeam,
    players,
    onComboCallout: (text, until) => calls.callouts.push({ text, until }),
    onPlayerBoost: (list, fraction) => calls.boosts.push({ list, fraction }),
    onBurst: (x, y, color, count) => calls.bursts.push({ x, y, color, count }),
    onTone: (frequency, duration) => calls.tones.push({ frequency, duration }),
    onLog: (text) => calls.logs.push(text),
    onMissionCombo: () => { calls.mission += 1; },
  };
  return { world, calls };
};

// Ignored (active surge): same state out, no callbacks.
{
  const { world, calls } = recorder();
  world.comboState = { step: 0, expiresAt: 0, lastActorId: 'x', surgeUntil: 5000 };
  const next = registerTeamAction({ id: 'a1', team: 'blue', name: 'Alice' }, 'TAG', 10, 20, 1000, world);
  assert.equal(next.surgeUntil, 5000);
  assert.equal(calls.callouts.length + calls.boosts.length + calls.bursts.length + calls.tones.length + calls.logs.length + calls.mission, 0);
}
// Started on player team: one callout, no boost/burst/tone.
{
  const { world, calls } = recorder('blue', [teammate('m1', 'blue')]);
  const next = registerTeamAction({ id: 'a1', team: 'blue', name: 'Alice' }, 'TAG', 10, 20, 0, world);
  assert.equal(next.step, 1);
  assert.deepEqual(calls.callouts, [{ text: 'LINK 1/3 · Alice TAG', until: 1400 }]);
  assert.equal(calls.boosts.length + calls.bursts.length + calls.tones.length + calls.logs.length + calls.mission, 0);
}
// Started on enemy team: no callout.
{
  const { world, calls } = recorder('blue', [teammate('m1', 'red')]);
  registerTeamAction({ id: 'a9', team: 'red', name: 'Bob' }, 'RESCUE', 0, 0, 0, world);
  assert.equal(calls.callouts.length, 0);
}
// Duo: boost 0.12, gold burst 20, player-tone 680/0.14, log + callout, teammates filtered.
{
  const active = teammate('m1', 'blue');
  const prisoner = teammate('m2', 'blue', 'PRISONER');
  const enemy = teammate('m3', 'red');
  const { world, calls } = recorder('blue', [active, prisoner, enemy]);
  world.comboState = { step: 1, expiresAt: 6500, lastActorId: 'a1', surgeUntil: 0 };
  const next = registerTeamAction({ id: 'a2', team: 'blue', name: 'Bob' }, 'TAG', 40, 50, 100, world);
  assert.equal(next.step, 2);
  assert.equal(calls.boosts.length, 1);
  assert.equal(calls.boosts[0].fraction, 0.12);
  assert.deepEqual(calls.boosts[0].list.map((p) => p.id), ['m1']);
  assert.deepEqual(calls.bursts, [{ x: 40, y: 50, color: '#f5cf45', count: 20 }]);
  assert.deepEqual(calls.tones, [{ frequency: 680, duration: 0.14 }]);
  assert.equal(calls.logs[0].includes('DUO LINK'), true);
  assert.deepEqual(calls.callouts, [{ text: 'DUO LINK · BOOST TIM +12%', until: 2000 }]); // now 100 + 1900
}
// Duo on enemy team: tone 390, no callout, burst uses that team color.
{
  const { world, calls } = recorder('blue', [teammate('m1', 'red')]);
  world.comboState = { step: 1, expiresAt: 6500, lastActorId: 'a1', surgeUntil: 0 };
  registerTeamAction({ id: 'a2', team: 'red', name: 'Eve' }, 'RESCUE', 1, 2, 0, world);
  assert.deepEqual(calls.tones, [{ frequency: 390, duration: 0.14 }]);
  assert.equal(calls.callouts.length, 0);
  assert.equal(calls.bursts[0].color, '#f5cf45'); // duo burst is always gold
}
// Surge: boost 0.16, team-color burst 32, tone 880/0.22, mission + callout.
{
  const { world, calls } = recorder('blue', [teammate('m1', 'blue')]);
  world.comboState = { step: 2, expiresAt: 7000, lastActorId: 'a2', surgeUntil: 0 };
  const next = registerTeamAction({ id: 'a3', team: 'blue', name: 'Cid' }, 'TAG', 5, 6, 200, world);
  assert.equal(next.step, 0);
  assert.ok(next.surgeUntil > 200);
  assert.equal(calls.boosts[0].fraction, 0.16);
  assert.deepEqual(calls.bursts, [{ x: 5, y: 6, color: TEAM_COLOR.blue, count: 32 }]);
  assert.deepEqual(calls.tones, [{ frequency: 880, duration: 0.22 }]);
  assert.equal(calls.mission, 1);
  assert.deepEqual(calls.callouts, [{ text: 'SQUAD SURGE · SPEED +10%', until: 2700 }]);
  assert.equal(calls.logs[0].includes('SQUAD SURGE'), true);
}
// Surge on enemy team: no mission, no callout, tone 440.
{
  const { world, calls } = recorder('blue', [teammate('m1', 'red')]);
  world.comboState = { step: 2, expiresAt: 7000, lastActorId: 'a2', surgeUntil: 0 };
  registerTeamAction({ id: 'a3', team: 'red', name: 'Zed' }, 'RESCUE', 0, 0, 300, world);
  assert.equal(calls.mission, 0);
  assert.equal(calls.callouts.length, 0);
  assert.deepEqual(calls.tones, [{ frequency: 440, duration: 0.22 }]);
}

console.log('PASS registerTeamAction: ignored, started, enemy-started, duo, enemy-duo, surge, enemy-surge.');
