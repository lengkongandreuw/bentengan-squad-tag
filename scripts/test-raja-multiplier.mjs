import assert from 'node:assert/strict';
import { RAJA_ULTIMATE_SPEED_MULTIPLIER, rajaUltimateMultiplier } from '../modules/gameplay/bars-score.ts';

// Q2: multiplier value moved verbatim, no tuning.
assert.equal(RAJA_ULTIMATE_SPEED_MULTIPLIER, 1.4);

// ACTIVE teammate inside the buff window gets +40%.
assert.equal(rajaUltimateMultiplier('red', 'ACTIVE', 'red', 1000, 2000), 1.4);
// Enemy, prisoner, and expired buff all move at base speed.
assert.equal(rajaUltimateMultiplier('blue', 'ACTIVE', 'red', 1000, 2000), 1);
assert.equal(rajaUltimateMultiplier('red', 'PRISONER', 'red', 1000, 2000), 1);
assert.equal(rajaUltimateMultiplier('red', 'ACTIVE', 'red', 2000, 2000), 1);
assert.equal(rajaUltimateMultiplier('red', 'ACTIVE', 'red', 3000, 2000), 1);
console.log('PASS rajaUltimateMultiplier: buff window math, team/state gates, verbatim value.');
