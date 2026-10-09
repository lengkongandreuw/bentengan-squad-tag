import assert from 'node:assert/strict';
import {
  TEAM_COMBO_WINDOW_MS,
  TEAM_SURGE_DURATION_MS,
  advanceTeamCombo,
  createTeamComboState,
  teamComboSeconds,
  teamComboSpeedMultiplier,
} from '../modules/gameplay/team-combo.ts';
const now = 100000;
const fresh = createTeamComboState();
assert.deepEqual(fresh, {
  step: 0,
  expiresAt: 0,
  lastActorId: '',
  surgeUntil: 0,
});
const first = advanceTeamCombo(fresh, 'a', now);
assert.equal(first.outcome, 'started');
assert.deepEqual(first.state, {
  step: 1,
  expiresAt: now + TEAM_COMBO_WINDOW_MS,
  lastActorId: 'a',
  surgeUntil: 0,
});
// Same actor twice in a row adds nothing.
const repeat = advanceTeamCombo(first.state, 'a', now + 100);
assert.equal(repeat.outcome, 'ignored');
assert.equal(repeat.state, first.state);
const second = advanceTeamCombo(first.state, 'b', now + 100);
assert.equal(second.outcome, 'duo');
assert.equal(second.state.step, 2);
const third = advanceTeamCombo(second.state, 'c', now + 200);
assert.equal(third.outcome, 'surge');
assert.deepEqual(third.state, {
  step: 0,
  expiresAt: 0,
  lastActorId: 'c',
  surgeUntil: now + 200 + TEAM_SURGE_DURATION_MS,
});
// Tags during surge are ignored and keep surge speed.
const during = advanceTeamCombo(third.state, 'd', now + 300);
assert.equal(during.outcome, 'ignored');
assert.equal(teamComboSpeedMultiplier(third.state, now + 300), 1.1);
assert.equal(
  teamComboSpeedMultiplier(third.state, now + 200 + TEAM_SURGE_DURATION_MS + 1),
  1,
);
// An expired chain restarts instead of continuing.
const expired = advanceTeamCombo(
  first.state,
  'b',
  now + TEAM_COMBO_WINDOW_MS + 1,
);
assert.equal(expired.outcome, 'started');
assert.equal(expired.state.step, 1);
assert.ok(teamComboSeconds(third.state, now + 300) > 0);
assert.equal(
  teamComboSeconds(third.state, now + 200 + TEAM_SURGE_DURATION_MS + 60_000),
  0,
);
console.log(
  'PASS team combo: started, repeat ignored, duo, surge, surge window, expiry restart.',
);
