import assert from 'node:assert/strict';
import { recoverFromObstacle } from '../modules/gameplay/collision-navigation.ts';

const free = () => false;
const solid = () => true;
const shift = () => ({ x: 10, y: 10 });
const world = (overrides = {}) => ({
  kanal: false,
  collides: solid,
  pushOut: shift,
  ...overrides,
});
const stuck = () => ({ state: 'ACTIVE', waterEnteredAt: 0, parkourUntil: 0, x: 5, y: 5 });

// Guards: prisoner, kanal swimmer, parkouring, and free ground all skip.
const prisoner = { ...stuck(), state: 'PRISONER' };
recoverFromObstacle(prisoner, 1000, world());
assert.deepEqual([prisoner.x, prisoner.y], [5, 5]);
const swimmer = { ...stuck(), waterEnteredAt: 50 };
recoverFromObstacle(swimmer, 1000, world({ kanal: true }));
assert.deepEqual([swimmer.x, swimmer.y], [5, 5]);
// Same swimmer off-kanal still recovers.
const offKanal = { ...stuck(), waterEnteredAt: 50 };
recoverFromObstacle(offKanal, 1000, world({ kanal: false }));
assert.deepEqual([offKanal.x, offKanal.y], [10, 10]);
const parkour = { ...stuck(), parkourUntil: 2000 };
recoverFromObstacle(parkour, 1000, world());
assert.deepEqual([parkour.x, parkour.y], [5, 5]);
const clear = stuck();
recoverFromObstacle(clear, 1000, world({ collides: free }));
assert.deepEqual([clear.x, clear.y], [5, 5]);

// Happy path applies the pushed position.
const pushed = stuck();
recoverFromObstacle(pushed, 1000, world());
assert.deepEqual([pushed.x, pushed.y], [10, 10]);
console.log('PASS obstacle recovery: guards, push-out, kanal variant.');
