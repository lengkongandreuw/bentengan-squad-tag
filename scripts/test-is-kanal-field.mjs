import assert from 'node:assert/strict';
import { isKanalField } from '../modules/world/field-flags.ts';

// Only kanal2 is a kanal field.
assert.equal(isKanalField('kanal2'), true);

// All other builtin ids — including kanal (v1) — are not.
for (const id of ['kampung', 'pasar', 'taman', 'kanal', 'kampung3d', 'studio-custom']) {
  assert.equal(isKanalField(id), false);
}
console.log('PASS isKanalField: kanal2 true, all other ids false.');
