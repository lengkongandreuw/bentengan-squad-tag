import assert from 'node:assert/strict';
import { drawRescueBubble, drawPhaseOverlay } from '../modules/ui/draw-base.ts';

// Recording canvas stub.
const makeCtx = () => {
  const calls = [];
  return {
    calls,
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); },
    arc(x, y, radius) { calls.push(['arc', x, y, radius]); },
    fill() { calls.push(['fill']); },
    stroke() { calls.push(['stroke']); },
    fillRect(x, y, w, h) { calls.push(['fillRect', x, y, w, h]); },
    fillText(text, x, y) { calls.push(['fillText', text, x, y]); },
    set strokeStyle(value) { calls.push(['strokeStyle', value]); },
    set fillStyle(value) { calls.push(['fillStyle', value]); },
    set lineWidth(value) { calls.push(['lineWidth', value]); },
    set font(value) { calls.push(['font', value]); },
    set textAlign(value) { calls.push(['textAlign', value]); },
  };
};

const players = [
  { id: 'ally1', x: 100, y: 200, state: 'PRISONER' },
  { id: 'me', x: 10, y: 10, state: 'ACTIVE' },
];

// Prisoner requester draws the pulsing ring with exact pulse math.
let ctx = makeCtx();
drawRescueBubble(ctx, players, 'ally1', 0);
const arcs = ctx.calls.filter(([name]) => name === 'arc');
assert.equal(arcs.length, 1);
assert.deepEqual(arcs[0].slice(1), [100, 158, 18]);
assert.ok(ctx.calls.some(([name, text]) => name === 'fillText' && text === '!'));

// No request, unknown id, or non-prisoner requester draws nothing.
for (const requesterId of [undefined, 'ghost']) {
  ctx = makeCtx();
  drawRescueBubble(ctx, players, requesterId, 0);
  assert.deepEqual(ctx.calls, []);
}
ctx = makeCtx();
drawRescueBubble(ctx, players, 'me', 0);
assert.deepEqual(ctx.calls, []);

// PLAYING draws nothing; other phases dim fullscreen with sized announcement.
ctx = makeCtx();
drawPhaseOverlay(ctx, 800, 600, 'PLAYING', 'GO');
assert.deepEqual(ctx.calls, []);
ctx = makeCtx();
drawPhaseOverlay(ctx, 800, 600, 'COUNTDOWN', '3');
assert.deepEqual(ctx.calls.filter(([name]) => name === 'fillRect'), [['fillRect', 0, 0, 800, 600]]);
assert.ok(ctx.calls.some(([name, value]) => name === 'font' && value.startsWith('800 90px')));
assert.ok(ctx.calls.some(([name, text, x, y]) => name === 'fillText' && text === '3' && x === 400 && y === 300));
ctx = makeCtx();
drawPhaseOverlay(ctx, 800, 600, 'ROUND_OVER', 'MENANG');
assert.ok(ctx.calls.some(([name, value]) => name === 'font' && value.startsWith('800 54px')));
console.log('PASS overlays: rescue bubble lookup/pulse/guard, phase dim with sized type.');
