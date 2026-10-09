import assert from 'node:assert/strict';
import { pushLog, LOG_LIMIT } from '../modules/ui/effects-log.ts';

// Newest first, single line.
assert.deepEqual(pushLog([], 'first'), ['first']);
// Prepends.
assert.deepEqual(pushLog(['a'], 'b'), ['b', 'a']);
// Caps at LOG_LIMIT (5), dropping oldest.
const full = pushLog(pushLog(pushLog(pushLog(pushLog([], '1'), '2'), '3'), '4'), '5');
assert.equal(full.length, LOG_LIMIT);
assert.deepEqual(full, ['5', '4', '3', '2', '1']);
assert.deepEqual(pushLog(full, '6'), ['6', '5', '4', '3', '2']);
// Does not mutate the input array.
const input = ['x'];
pushLog(input, 'y');
assert.deepEqual(input, ['x']);
assert.equal(LOG_LIMIT, 5);

console.log('PASS pushLog: prepend, cap 5, immutability.');
