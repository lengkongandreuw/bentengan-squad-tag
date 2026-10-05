import assert from 'node:assert/strict';
import {
  boardRows,
  createStatsStore,
  addStat,
} from '../modules/gameplay/bars-score.ts';

const players = [
  { id: 'r1', name: 'Raja', team: 'red', characterId: 'raja', controlled: true },
  { id: 'k1', name: 'Kaka', team: 'red', characterId: 'kaka' },
  { id: 'c1', name: 'Ciici', team: 'green', characterId: 'ciici', controlled: true },
];
const stores = {
  round: createStatsStore(players.map((p) => p.id)),
  match: createStatsStore(players.map((p) => p.id)),
};
const store = stores.round;
addStat(stores, { id: 'r1' }, 'tags');
addStat(stores, { id: 'r1' }, 'tags');
addStat(stores, { id: 'k1' }, 'rescues');

// Red rows preserve input order, carry stats + contribution + mvp flag.
const red = boardRows(store, players, 'red', 'r1');
assert.equal(red.length, 2);
assert.deepEqual(red[0], {
  id: 'r1',
  name: 'Raja',
  characterId: 'raja',
  controlled: true,
  tags: 2,
  prisons: 0,
  rescues: 0,
  contribution: 200,
  mvp: true,
});
assert.deepEqual(red[1].contribution, 120);
assert.equal(red[1].mvp, false);

// Green team isolates; unknown store ids default to zeros.
const green = boardRows(store, players, 'green', 'nobody');
assert.equal(green.length, 1);
assert.equal(green[0].name, 'Ciici');
assert.equal(green[0].mvp, false);
const fresh = boardRows(createStatsStore([]), players, 'red', 'r1');
assert.deepEqual(
  fresh.map((r) => [r.tags, r.prisons, r.rescues, r.contribution]),
  [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
);

// Input store and players are never mutated.
const before = JSON.stringify(store);
boardRows(store, players, 'red', 'r1');
assert.equal(JSON.stringify(store), before);
console.log('PASS boardRows: order, stats+contribution, mvp, team isolation, defaults, purity.');
