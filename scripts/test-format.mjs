import assert from 'node:assert/strict';
import { formatTime, statPercent } from '../modules/ui/format.ts';

// mm:ss clock.
assert.equal(formatTime(0), '00:00');
assert.equal(formatTime(65), '01:05');
assert.equal(formatTime(240), '04:00');
assert.equal(formatTime(59.2), '01:00');
assert.equal(formatTime(-5), '00:00');

// Normalized percent with clamping.
assert.equal(statPercent(214, 188, 240), '50%');
assert.equal(statPercent(188, 188, 240), '0%');
assert.equal(statPercent(240, 188, 240), '100%');
assert.equal(statPercent(0, 188, 240), '0%');
assert.equal(statPercent(999, 188, 240), '100%');
assert.equal(statPercent(1.035, 0.82, 1.25), '50%');
console.log('PASS format: clock and stat percent with clamping.');
