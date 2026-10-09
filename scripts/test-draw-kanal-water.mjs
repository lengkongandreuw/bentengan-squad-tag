import assert from 'node:assert/strict';
import { createDrawKanalWater } from '../modules/ui/draw-kanal-water.ts';
import { MAP4_GUIDE_HEIGHT, MAP4_GUIDE_WIDTH } from '../modules/world/map-data/scalars.ts';
import { kanal2X } from '../modules/world/map-data/guide-fields.ts';

const recorder = () => {
  const ops = [];
  const ctx = {
    lineCap: '',
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    globalAlpha: 1,
    save: () => ops.push(['save']),
    restore: () => ops.push(['restore']),
    beginPath: () => ops.push(['beginPath']),
    closePath: () => ops.push(['closePath']),
    moveTo: (...a) => ops.push(['moveTo', ...a]),
    lineTo: (...a) => ops.push(['lineTo', ...a]),
    stroke: () => ops.push(['stroke']),
    fill: () => ops.push(['fill']),
    ellipse: (...a) => ops.push(['ellipse', ...a]),
    arc: (...a) => ops.push(['arc', ...a]),
    createLinearGradient: (...a) => {
      ops.push(['createLinearGradient', ...a]);
      return { stops: [], addColorStop(off, color) { this.stops.push([off, color]); } };
    },
  };
  return { ops, ctx };
};

const field = {
  id: 'kanal2',
  name: 'Alun Kanal Nusantara 2',
  difficulty: 'hard',
  designWidth: MAP4_GUIDE_WIDTH,
  designHeight: MAP4_GUIDE_HEIGHT,
};

const worldOf = (ctx, over = {}) => ({
  ctx,
  kanal: true,
  waterMaskPixels: () => new Uint8ClampedArray(4),
  glints: [
    { x: 100, y: 100, phase: 3 },
    { x: 1900, y: 700, phase: 9 },
  ],
  worldWidth: MAP4_GUIDE_WIDTH,
  worldHeight: MAP4_GUIDE_HEIGHT,
  field,
  isWaterAt: () => true,
  ...over,
});

// Non-kanal or missing mask → no drawing at all.
{
  const { ops, ctx } = recorder();
  createDrawKanalWater(worldOf(ctx, { kanal: false }))(1000);
  assert.equal(ops.length, 0);
}
{
  const { ops, ctx } = recorder();
  createDrawKanalWater(worldOf(ctx, { waterMaskPixels: () => null }))(1000);
  assert.equal(ops.length, 0);
}
// Wet kanal: glints stroke + both drops build gradients/fills/crest/ribbons/foam.
{
  const { ops, ctx } = recorder();
  const draw = createDrawKanalWater(worldOf(ctx));
  draw(1000);
  const kinds = ops.map((o) => o[0]);
  assert.equal(kinds[0], 'save');
  assert.equal(kinds[kinds.length - 1], 'restore');
  assert.equal(ops.filter((o) => o[0] === 'createLinearGradient').length, 2, 'two canal drops');
  // 2 glints + per drop: crest ellipse + 7 ribbons + foam ellipse = 9 strokes each
  assert.equal(ops.filter((o) => o[0] === 'stroke').length, 2 + 2 * 9);
  assert.equal(ops.filter((o) => o[0] === 'fill').length, 12, '2 falling sheets + 10 foam bubbles');
  assert.equal(ops.filter((o) => o[0] === 'arc').length, 2 * 5, 'foam bubbles');
}
// Drop x follows kanal2X(849) with sx=1.
{
  const { ops, ctx } = recorder();
  createDrawKanalWater(worldOf(ctx))(0);
  const grad = ops.find((o) => o[0] === 'createLinearGradient');
  const expectedX = kanal2X(849);
  assert.equal(grad[1], expectedX);
  assert.equal(grad[2], 94); // first drop y with sy=1
}
// Dry water → only save/restore, nothing drawn.
{
  const { ops, ctx } = recorder();
  createDrawKanalWater(worldOf(ctx, { isWaterAt: () => false }))(500);
  assert.equal(ops.filter((o) => o[0] === 'stroke').length, 0);
  assert.equal(ops.filter((o) => o[0] === 'createLinearGradient').length, 0);
  assert.deepEqual(ops.map((o) => o[0]), ['save', 'restore']);
}
// Live mask getter: a call that sees null does nothing; later pixels enable drawing.
{
  const { ops, ctx } = recorder();
  let mask = null;
  const draw = createDrawKanalWater(worldOf(ctx, { waterMaskPixels: () => mask }));
  draw(0);
  assert.equal(ops.length, 0);
  mask = new Uint8ClampedArray(4);
  draw(0);
  assert.ok(ops.length > 0, 'draws once mask loads');
}

console.log('PASS createDrawKanalWater: guards, glint+drop strokes, kanal2X placement, dry skip, live mask.');
