import assert from 'node:assert/strict';
import { fortOccupant } from '../modules/gameplay/base.ts';

const bases = { blue: { x: 100, y: 100 }, red: { x: 900, y: 100 } };
const radius = 118;
const at = (x, y) => ({ id: 'x', team: 'red', state: 'ACTIVE', waterEnteredAt: 0, x, y, lastX: x, lastY: y });

// Occupant found: active enemy inside radius.
const enemy = { ...at(150, 100), id: 'e1', team: 'red' };
assert.equal(fortOccupant([at(0, 0), enemy], bases, radius, false, 'blue'), enemy);

// Own team ignored; wrong state ignored.
const mate = { ...at(150, 100), id: 'm1', team: 'blue' };
assert.equal(fortOccupant([mate], bases, radius, false, 'blue'), undefined);
const prisoner = { ...enemy, id: 'e2', state: 'PRISONER' };
assert.equal(fortOccupant([prisoner], bases, radius, false, 'blue'), undefined);

// exceptId skips that player.
assert.equal(fortOccupant([enemy], bases, radius, false, 'blue', 'e1'), undefined);

// Outside radius ignored; edge is strict.
const far = { ...at(100 + 118, 100), id: 'e3', team: 'red' };
assert.equal(fortOccupant([far], bases, radius, false, 'blue'), undefined);
const near = { ...at(100 + 117.9, 100), id: 'e4', team: 'red' };
assert.equal(fortOccupant([near], bases, radius, false, 'blue'), near);

// Water blocks only on kanal maps.
const wet = { ...at(150, 100), id: 'e5', team: 'red', waterEnteredAt: 123 };
assert.equal(fortOccupant([wet], bases, radius, true, 'blue'), undefined);
assert.equal(fortOccupant([wet], bases, radius, false, 'blue'), wet);

// Empty roster and no match.
assert.equal(fortOccupant([], bases, radius, false, 'blue'), undefined);
assert.equal(fortOccupant([mate], bases, radius, false, 'red'), undefined);
console.log('PASS fort occupant: found, filtered, exceptId, radius, kanal water, empty.');
