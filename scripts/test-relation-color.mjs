import assert from 'node:assert/strict';
import { relationColor } from '../modules/ui/relation-color.ts';

const base = { team: 'red', state: 'ACTIVE', rescueShieldUntil: 0, exitOrder: 3 };
const me = { team: 'blue', state: 'ACTIVE', rescueShieldUntil: 0, exitOrder: 5 };

// Teammate.
assert.equal(relationColor({ ...base, team: 'blue' }, me, 1000), '#9fd0ff');
// Prisoner.
assert.equal(relationColor({ ...base, state: 'PRISONER' }, me, 1000), '#8f8d84');
// Shielded returning rescuee.
assert.equal(
  relationColor({ ...base, state: 'RETURNING', rescueShieldUntil: 2000 }, me, 1000),
  '#60e6ff',
);
// Expired shield on a returner falls through to exit-order rules.
assert.equal(
  relationColor({ ...base, state: 'RETURNING', rescueShieldUntil: 500 }, me, 1000),
  '#b9ee3d',
);
// Observer not active.
assert.equal(relationColor(base, { ...me, state: 'PRISONER' }, 1000), '#f1d46c');
// Earlier exit order than me.
assert.equal(relationColor(base, me, 1000), '#b9ee3d');
// Later exit order than me while active.
assert.equal(
  relationColor({ ...base, exitOrder: 9 }, { ...me, exitOrder: 5 }, 1000),
  '#ff544b',
);
// Later exit order but not active.
assert.equal(
  relationColor({ ...base, exitOrder: 9, state: 'PRISONER' }, me, 1000),
  '#8f8d84',
);
console.log('PASS relation color: teammate, prisoner, shield, inactive, order, fallback.');
