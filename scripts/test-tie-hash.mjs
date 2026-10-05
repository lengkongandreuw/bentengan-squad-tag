import assert from 'node:assert/strict';
import { tieHash } from '../lib/math.ts';

// Pinned HEAD values: exit order must stay identical for the same round+id.
assert.equal(tieHash(1, 'you'), 3289962270);
assert.equal(tieHash(1, 'ally2'), 1828280635);
assert.equal(tieHash(1, 'enemy1'), 3895766008);
// Round seeds the hash.
assert.equal(tieHash(2, 'you'), 1407476320);
assert.notEqual(tieHash(1, 'you'), tieHash(2, 'you'));
// Deterministic across calls.
assert.equal(tieHash(3, 'ally2'), tieHash(3, 'ally2'));
// Always an unsigned 32-bit integer, including empty input.
for (const id of ['', 'you', 'enemy10']) {
  const value = tieHash(1, id);
  assert.ok(Number.isInteger(value) && value >= 0 && value <= 0xffffffff, `uint32 for ${id}`);
}
console.log('PASS tie hash: pinned values, round sensitivity, determinism, uint32 range.');
