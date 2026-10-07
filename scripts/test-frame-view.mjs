import assert from 'node:assert/strict';
import { computeFrameView } from '../modules/ui/frame-view.ts';

globalThis.window = /** @type {any} */ ({ devicePixelRatio: 2 });

const recorder = () => {
  const ops = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    setTransform: (...a) => ops.push(['setTransform', ...a]),
    clearRect: (...a) => ops.push(['clearRect', ...a]),
    fillRect: (...a) => ops.push(['fillRect', ...a]),
    strokeRect: (...a) => ops.push(['strokeRect', ...a]),
  };
  return { ops, ctx };
};

const inputOf = (ctx, over = {}) => ({
  canvas: { clientWidth: 1280, clientHeight: 720, width: 0, height: 0 },
  ctx,
  mode: 'playing',
  activeCamera: 'follow',
  me: { x: 1500, y: 700 },
  worldWidth: 2000,
  worldHeight: 800,
  kanal: false,
  setView: () => {},
  ...over,
});

// DPR clamp: canvas resized to css×2, transform set, full clear.
{
  const { ops, ctx } = recorder();
  const input = inputOf(ctx);
  const views = [];
  input.setView = (v) => views.push(v);
  const out = computeFrameView(input);
  assert.equal(input.canvas.width, 2560);
  assert.equal(input.canvas.height, 1440);
  assert.deepEqual(ops[0], ['setTransform', 2, 0, 0, 2, 0, 0]);
  assert.deepEqual(ops[1], ['clearRect', 0, 0, 1280, 720]);
  assert.equal(views.length, 1);
  assert.deepEqual(views[0], { x: out.camX, y: out.camY, width: 1280, height: 720, scale: out.scale });
  assert.equal(ops.filter((o) => o[0] === 'strokeRect').length, 0, 'no letterbox off-kanal');
}
// Follow camera: gameplay scale, camera clamps to player inside half-viewport.
{
  const { ctx } = recorder();
  const out = computeFrameView(inputOf(ctx));
  const expectedScale = Math.max(1280 / 980, 720 / 620);
  assert.ok(Math.abs(out.scale - expectedScale) < 1e-9);
  assert.equal(out.followsPlayer, true);
  const halfW = 1280 / (2 * out.scale);
  const halfH = 720 / (2 * out.scale);
  assert.equal(out.camX, Math.min(Math.max(1500, halfW), 2000 - halfW));
  assert.equal(out.camY, Math.min(Math.max(700, halfH), 800 - halfH));
}
// Overview: contain-fit scale, centered camera, not following.
{
  const { ctx } = recorder();
  const out = computeFrameView(inputOf(ctx, { activeCamera: 'overview' }));
  assert.ok(Math.abs(out.scale - Math.min(1280 / 2000, 720 / 800)) < 1e-9);
  assert.equal(out.followsPlayer, false);
  assert.equal(out.camX, 1000);
  assert.equal(out.camY, 400);
}
// Tactical scale tier.
{
  const { ctx } = recorder();
  const out = computeFrameView(inputOf(ctx, { activeCamera: 'tactical' }));
  assert.ok(Math.abs(out.scale - Math.max(1280 / 1220, 720 / 720)) < 1e-9);
}
// Menu mode uses contain-fit even with follow camera string.
{
  const { ctx } = recorder();
  const out = computeFrameView(inputOf(ctx, { mode: 'menu' }));
  assert.ok(Math.abs(out.scale - Math.min(1280 / 2000, 720 / 800)) < 1e-9);
  assert.equal(out.followsPlayer, false);
}
// Kanal + not following → matte fill + map outline stroke.
{
  const { ops, ctx } = recorder();
  const out = computeFrameView(inputOf(ctx, { kanal: true, activeCamera: 'overview' }));
  const fill = ops.find((o) => o[0] === 'fillRect');
  assert.ok(fill, 'matte fill');
  assert.equal(ctx.fillStyle, '#14211c');
  const stroke = ops.find((o) => o[0] === 'strokeRect');
  const mapLeft = (1280 - 2000 * out.scale) / 2;
  const mapTop = (720 - 800 * out.scale) / 2;
  assert.deepEqual(stroke.slice(1), [mapLeft - 1.5, mapTop - 1.5, 2000 * out.scale + 3, 800 * out.scale + 3]);
  assert.equal(ctx.strokeStyle, 'rgba(210,195,143,.32)');
  assert.equal(ctx.lineWidth, 1);
}
// Kanal but following → no matte.
{
  const { ops, ctx } = recorder();
  computeFrameView(inputOf(ctx, { kanal: true, activeCamera: 'follow' }));
  assert.equal(ops.filter((o) => o[0] === 'strokeRect').length, 0);
}
// Matched canvas size → no resize writes.
{
  const { ctx } = recorder();
  const input = inputOf(ctx);
  input.canvas.width = 2560;
  input.canvas.height = 1440;
  computeFrameView(input);
  assert.equal(input.canvas.width, 2560, 'untouched');
}

console.log('PASS computeFrameView: dpr+clear+view, follow clamp, overview, tactical, menu, kanal matte, resize guard.');
