import assert from 'node:assert/strict';
import { stepSuddenDeath } from '../modules/game-core/match-control.ts';

const world = (calls) => ({
  onWinRound: (team, reason) => calls.push(['win', team, reason]),
  onLog: (text) => calls.push(['log', text]),
  onTone: (frequency, duration) => calls.push(['tone', frequency, duration]),
});
const player = (team, state, capturedIds = []) => ({ team, state, capturedIds });
const live = () => ({ timer: 30, suddenDeath: false, announcement: '' });

// Running clock ticks down without decisions.
let calls = [];
let state = stepSuddenDeath([player('blue', 'ACTIVE')], live(), 0.5, world(calls));
assert.deepEqual(calls, []);
assert.equal(state.timer, 29.5);
assert.equal(state.suddenDeath, false);

// Sudden-death clock never ticks.
state = stepSuddenDeath([player('blue', 'ACTIVE')], { ...live(), timer: 0, suddenDeath: true }, 0.5, world(calls));
assert.equal(state.timer, 0);
assert.deepEqual(calls, []);

// Prisoner-count tiebreak favors the team holding more enemies.
calls = [];
stepSuddenDeath(
  [player('red', 'PRISONER'), player('blue', 'ACTIVE'), player('red', 'ACTIVE')],
  { ...live(), timer: 0 },
  0.5,
  world(calls),
);
assert.deepEqual(calls, [['win', 'blue', 'WAKTU HABIS']]);

// Equal prisoners fall through to unique-capture tiebreak.
calls = [];
stepSuddenDeath(
  [player('blue', 'ACTIVE', ['x']), player('red', 'ACTIVE')],
  { ...live(), timer: 0 },
  0.5,
  world(calls),
);
assert.deepEqual(calls, [['win', 'blue', 'TANGKAPAN UNIK']]);

// Full tie starts sudden death with the banner, log, and tone.
calls = [];
state = stepSuddenDeath(
  [player('blue', 'ACTIVE'), player('red', 'ACTIVE')],
  { ...live(), timer: 0 },
  0.5,
  world(calls),
);
assert.deepEqual(state, { timer: 0, suddenDeath: true, announcement: 'SUDDEN DEATH' });
assert.deepEqual(calls, [
  ['log', 'Skor seri—tag atau rebut benteng berikutnya menang.'],
  ['tone', 760, 0.22],
]);
console.log('PASS stepSuddenDeath: clock tick, prisoner/unique tiebreaks, sudden-death start.');
