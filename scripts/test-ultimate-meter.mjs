import assert from 'node:assert/strict';
import { chargeUltimateMeter } from '../modules/gameplay/bars-score.ts';

// Bots never charge, even with an ultimate character.
assert.equal(chargeUltimateMeter(40, false, 'kaka', 20), 40);
assert.equal(chargeUltimateMeter(40, undefined, 'raja', 20), 40);
// Non-ultimate characters never charge, even when controlled.
assert.equal(chargeUltimateMeter(40, true, 'jago', 20), 40);
assert.equal(chargeUltimateMeter(40, true, 'bebe', 30), 40);
// Controlled ultimate owners accumulate verbatim.
assert.equal(chargeUltimateMeter(40, true, 'kaka', 20), 60);
assert.equal(chargeUltimateMeter(40, true, 'raja', 30), 70);
// Clamp holds both ends.
assert.equal(chargeUltimateMeter(95, true, 'kaka', 20), 100);
assert.equal(chargeUltimateMeter(5, true, 'raja', -20), 0);
// Zero and fractional amounts pass through.
assert.equal(chargeUltimateMeter(42.5, true, 'kaka', 0), 42.5);
console.log('PASS ultimate meter: bot/non-ultimate ignored, accumulate, clamp.');
