import assert from 'node:assert/strict';
import { startMatchLoop } from '../modules/game-core/match-runtime.ts';

// Scoped browser-API stubs, restored after each case.
const frames = [];
let now = 1000;
const realRaf = globalThis.requestAnimationFrame;
const realCancel = globalThis.cancelAnimationFrame;
const realNow = performance.now.bind(performance);

function stub() {
  frames.length = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames.push(callback);
    return frames.length;
  };
  globalThis.cancelAnimationFrame = (id) => {
    frames[id - 1] = null;
  };
  performance.now = () => now;
}

function restore() {
  globalThis.requestAnimationFrame = realRaf;
  globalThis.cancelAnimationFrame = realCancel;
  performance.now = realNow;
}

function runFrame(time) {
  now = time;
  const index = frames.length - 1;
  const callback = frames[index];
  assert.ok(callback, 'a frame is scheduled');
  frames[index] = null;
  callback(time);
}

const calls = [];
const callbacks = {
  tick: (dt, at) => calls.push(['tick', dt, at]),
  render: (at) => calls.push(['render', at]),
  commit: (at) => calls.push(['commit', at]),
};

// Initial frame scheduling.
stub();
const stop = startMatchLoop(callbacks);
assert.equal(frames.filter(Boolean).length, 1, 'one frame scheduled on start');

// Exact HEAD order: tick, render, commit, then re-arm.
calls.length = 0;
runFrame(1016);
assert.deepEqual(calls.map(([name]) => name), ['tick', 'render', 'commit']);
assert.deepEqual(calls[0], ['tick', 0.016, 1016]);
assert.equal(frames.filter(Boolean).length, 1, 're-armed after work');

// dt clamp: a 500ms gap still yields 0.033.
calls.length = 0;
runFrame(2000);
assert.equal(calls[0][1], 0.033, 'dt clamps at 0.033');

// Stop cancels the owned handle; twice is harmless.
stop();
stop();
assert.equal(frames.filter(Boolean).length, 0, 'no frame scheduled after stop');
restore();

// Stop during tick prevents render, commit, and a new schedule.
stub();
calls.length = 0;
const stopTick = startMatchLoop({
  ...callbacks,
  tick: () => {
    calls.push(['tick']);
    stopTick();
  },
});
runFrame(1016);
assert.deepEqual(calls.map(([name]) => name), ['tick']);
assert.equal(frames.filter(Boolean).length, 0);
restore();

// Stop during render prevents commit and a new schedule.
stub();
calls.length = 0;
const stopRender = startMatchLoop({
  ...callbacks,
  render: () => {
    calls.push(['render']);
    stopRender();
  },
});
runFrame(1016);
assert.deepEqual(calls.map(([name]) => name), ['tick', 'render']);
assert.equal(frames.filter(Boolean).length, 0);
restore();

// Stop during commit prevents a new schedule.
stub();
calls.length = 0;
const stopCommit = startMatchLoop({
  ...callbacks,
  commit: () => {
    calls.push(['commit']);
    stopCommit();
  },
});
runFrame(1016);
assert.deepEqual(calls.map(([name]) => name), ['tick', 'render', 'commit']);
assert.equal(frames.filter(Boolean).length, 0, 'no frame remains scheduled after cleanup');
restore();

console.log('PASS match loop: scheduling, HEAD order, dt clamp, re-arm, stop semantics.');
