import assert from 'node:assert/strict';
import { fortGeometry } from '../modules/world/map-data/scalars.ts';
import { stepPauseGate } from '../modules/gameplay/input-navigation.ts';

// Fort footprint scales with HEAD factors, rounded.
assert.deepEqual(fortGeometry(1), { fortWidth: 168, fortHeight: 188, fortAnchorY: 130 });
assert.deepEqual(fortGeometry(0.9), {
  fortWidth: Math.round(168 * 0.9),
  fortHeight: Math.round(188 * 0.9),
  fortAnchorY: Math.round(130 * 0.9),
});

// 'p' toggles pause and is consumed; the tick halts while paused.
let cleared = 0;
let keys = new Set(['p']);
let gate = stepPauseGate(keys, false, 'playing', () => cleared++);
assert.deepEqual(gate, { paused: true, halted: true });
assert.deepEqual([...keys], []);
assert.equal(cleared, 1);

// Without input the running game flows through untouched.
cleared = 0;
keys = new Set();
gate = stepPauseGate(keys, false, 'playing', () => cleared++);
assert.deepEqual(gate, { paused: false, halted: false });
assert.equal(cleared, 0);

// Menus and pause halt the tick with the mouse cleared.
gate = stepPauseGate(new Set(), false, 'menu', () => cleared++);
assert.deepEqual(gate, { paused: false, halted: true });
assert.equal(cleared, 1);
console.log('PASS gates: fort geometry factors, pause toggle/gating.');
