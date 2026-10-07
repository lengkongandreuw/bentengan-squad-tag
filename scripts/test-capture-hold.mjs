import assert from 'node:assert/strict';
import { updateCaptureHold } from '../modules/gameplay/capture.ts';

const player = (team, state, prisonOwner) => ({ team, state, prisonOwner });

const worldOf = () => {
  const wins = [];
  return { wins, onWin: (team, reason) => wins.push({ team, reason }) };
};

// Not every opponent held → hold time resets to 0.
{
  const total = { blue: 1.4, red: 0.9 };
  const players = [
    player('blue', 'ACTIVE'),
    player('red', 'PRISONER', 'blue'),
    player('red', 'ACTIVE'), // still free
    player('blue', 'PRISONER', 'red'),
  ];
  const { wins, onWin } = worldOf();
  updateCaptureHold(total, players, 0.2, onWin);
  assert.equal(total.blue, 0); // one red still free
  assert.equal(total.red, 0); // one blue still free
  assert.equal(wins.length, 0);
}
// Full hold accumulates dt per tick.
{
  const total = { blue: 0, red: 0 };
  const players = [
    player('red', 'PRISONER', 'blue'),
    player('red', 'PRISONER', 'blue'),
    player('red', 'PRISONER', 'blue'),
    player('red', 'PRISONER', 'blue'),
    player('red', 'PRISONER', 'blue'),
    player('blue', 'PRISONER', 'red'),
    player('blue', 'PRISONER', 'red'),
    player('blue', 'PRISONER', 'red'),
    player('blue', 'PRISONER', 'red'),
    player('blue', 'PRISONER', 'red'),
  ];
  const { wins, onWin } = worldOf();
  updateCaptureHold(total, players, 0.5, onWin);
  assert.equal(total.blue, 0.5); // blue holds all reds
  assert.equal(total.red, 0.5); // red holds all blues
  updateCaptureHold(total, players, 0.5, onWin);
  assert.equal(total.blue, 1.0);
  assert.equal(wins.length, 0); // under 2s
  updateCaptureHold(total, players, 1.0, onWin);
  assert.equal(total.blue, 2.0);
  assert.equal(wins.length, 2);
  assert.deepEqual(wins[0], { team: 'blue', reason: 'SEMUA LAWAN DITANGKAP' });
  assert.deepEqual(wins[1], { team: 'red', reason: 'SEMUA LAWAN DITANGKAP' });
}
// Wrong-team prison owner does not count as held for that team.
{
  const total = { blue: 0, red: 0 };
  const players = [
    player('blue', 'ACTIVE'),
    player('red', 'PRISONER', 'red'), // held by own team → not blue's hold
    player('red', 'PRISONER', 'blue'),
    player('red', 'PRISONER', 'blue'),
    player('red', 'PRISONER', 'blue'),
    player('red', 'PRISONER', 'blue'),
  ];
  const { wins, onWin } = worldOf();
  updateCaptureHold(total, players, 0.5, onWin);
  assert.equal(total.blue, 0);
  assert.equal(wins.length, 0);
}
// Record mutates in place (owner keeps the same object across ticks).
{
  const total = { blue: 0, red: 0 };
  const ref = total;
  updateCaptureHold(total, [player('blue', 'ACTIVE'), player('red', 'ACTIVE')], 0.1, () => {});
  assert.equal(total, ref);
}

console.log('PASS updateCaptureHold: reset, accumulation, 2s win both teams, wrong owner, in-place.');
