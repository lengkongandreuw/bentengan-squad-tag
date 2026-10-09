import assert from 'node:assert/strict';
import {
  addStat,
  contributionScore,
  createStatsStore,
  emptyStats,
  ensureStats,
} from '../modules/gameplay/bars-score.ts';

const ids = ['you', 'ally2', 'enemy1'];

// Default store creation for all player IDs + emptyStats defaults.
const fresh = createStatsStore(ids);
assert.deepEqual(Object.keys(fresh).sort(), ['ally2', 'enemy1', 'you']);
assert.deepEqual(emptyStats(), { tags: 0, prisons: 0, rescues: 0 });
assert.deepEqual(fresh.you, { tags: 0, prisons: 0, rescues: 0 });

// ensureStats preserves valid entries and creates missing ones.
const kept = { tags: 3, prisons: 1, rescues: 2 };
fresh.you = kept;
assert.equal(ensureStats(fresh, { id: 'you' }), kept, 'same reference preserved');
const made = ensureStats(fresh, { id: 'ally9' });
assert.deepEqual(made, { tags: 0, prisons: 0, rescues: 0 });
assert.equal(fresh.ally9, made, 'missing entry inserted');

// addStat dual-writes to round and match stores.
const stores = { round: createStatsStore(ids), match: createStatsStore(ids) };
addStat(stores, { id: 'you' }, 'tags');
addStat(stores, { id: 'you' }, 'tags');
addStat(stores, { id: 'enemy1' }, 'prisons');
assert.equal(stores.round.you.tags, 2);
assert.equal(stores.match.you.tags, 2);
assert.equal(stores.round.enemy1.prisons, 1);
assert.equal(stores.match.enemy1.prisons, 1);

// Player A updates do not affect player B.
assert.deepEqual(stores.round.ally2, { tags: 0, prisons: 0, rescues: 0 });
assert.notEqual(stores.round.you, stores.round.ally2);

// Round and match stores remain independent objects.
assert.notEqual(stores.round, stores.match);
assert.notEqual(stores.round.you, stores.match.you);

// Reset/recreate matches HEAD: fresh round object, match preserved, ids stable.
const round2 = createStatsStore(ids);
assert.deepEqual(round2.you, { tags: 0, prisons: 0, rescues: 0 });
assert.equal(stores.match.you.tags, 2, 'match store survives round reset');
assert.deepEqual(Object.keys(round2).sort(), ['ally2', 'enemy1', 'you']);

// contributionScore matches HEAD weights (100/120/40).
assert.equal(contributionScore({ tags: 2, prisons: 1, rescues: 3 }), 2 * 100 + 3 * 120 - 1 * 40);
assert.equal(contributionScore({ tags: 0, prisons: 0, rescues: 0 }), 0);

// Board/leaderboard shape compatibility: plain records of numeric triples.
for (const entry of Object.values(stores.match)) {
  assert.deepEqual(Object.keys(entry).sort(), ['prisons', 'rescues', 'tags']);
  for (const value of Object.values(entry)) assert.equal(typeof value, 'number');
}
console.log('PASS stats store: creation, defaults, ensure, dual-write, isolation, reset, scoring, shape.');
