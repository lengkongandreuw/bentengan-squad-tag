import assert from 'node:assert/strict';
import { createColliderDebugDraw } from '../modules/ui/collider-debug.ts';

const solidPixels = (w, h) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data[i] = 200; // all R>127 → solid
  return data;
};

// DOM + canvas stub: each built layer serves fully-solid pixels.
let built = [];
globalThis.document = /** @type {any} */ ({
  createElement: (tag) => {
    assert.equal(tag, 'canvas');
    const surface = {
      width: 0,
      height: 0,
      fillStyle: '',
      rects: [],
      images: [],
      put: null,
      getContext: (type) => {
        assert.equal(type, '2d');
        return {
          set fillStyle(v) { surface.fillStyle = v; },
          get fillStyle() { return surface.fillStyle; },
          fillRect: (...args) => surface.rects.push(args),
          drawImage: (...args) => surface.images.push(args),
          getImageData: () => ({ data: solidPixels(surface.width, surface.height) }),
          putImageData: (img) => { surface.put = img; },
        };
      },
    };
    built.push(surface);
    return surface;
  },
});

const worldOf = (over = {}) => {
  const ctxCalls = [];
  const ctx = {
    save: () => ctxCalls.push(['save']),
    restore: () => ctxCalls.push(['restore']),
    drawImage: (...args) => ctxCalls.push(['drawImage', ...args]),
  };
  const world = {
    enabled: () => true,
    kanal: true,
    waterMaskPixels: () => null,
    waterMaskCanvas: { marker: 'mask' },
    worldWidth: 4,
    worldHeight: 4,
    obstacles: [{ x: 0, y: 0, w: 2, h: 2 }],
    fortRects: [{ x: 2, y: 2, w: 1, h: 1 }],
    ctx,
    ...over,
  };
  return { world, ctxCalls };
};

// Disabled or non-kanal → nothing drawn, no layer built.
{
  built = [];
  const { world, ctxCalls } = worldOf({ enabled: () => false });
  createColliderDebugDraw(world)();
  assert.equal(built.length, 0);
  assert.equal(ctxCalls.length, 0);
}
{
  built = [];
  const { world, ctxCalls } = worldOf({ kanal: false });
  createColliderDebugDraw(world)();
  assert.equal(built.length, 0);
  assert.equal(ctxCalls.length, 0);
}
// Enabled kanal → builds layer (bounds + obstacle + fort fills, edge colors) then blits.
{
  built = [];
  const { world, ctxCalls } = worldOf();
  createColliderDebugDraw(world)();
  assert.equal(built.length, 1);
  const surface = built[0];
  assert.equal(surface.width, 4);
  assert.equal(surface.height, 4);
  // 1 obstacle + 1 fort + 4 bounds = 6 fillRects
  assert.equal(surface.rects.length, 6);
  assert.ok(surface.put, 'pixels processed');
  // Corner pixel is an edge (x===0): 255,242,130,255
  assert.deepEqual(Array.from(surface.put.data.slice(0, 4)), [255, 242, 130, 255]);
  // Interior pixel (1,1) solid non-edge: 255,55,60,105
  const i = (1 * 4 + 1) * 4;
  assert.deepEqual(Array.from(surface.put.data.slice(i, i + 4)), [255, 55, 60, 105]);
  const kinds = ctxCalls.map((c) => c[0]);
  assert.deepEqual(kinds, ['save', 'drawImage', 'restore']);
}
// Same mask → layer cached (no second build); ctx still blits each call.
{
  built = [];
  const { world, ctxCalls } = worldOf();
  const draw = createColliderDebugDraw(world);
  draw();
  draw();
  assert.equal(built.length, 1, 'cached across calls');
  assert.equal(ctxCalls.filter((c) => c[0] === 'drawImage').length, 2);
}
// Mask change → rebuild.
{
  built = [];
  let mask = null;
  const { world } = worldOf({ waterMaskPixels: () => mask });
  const draw = createColliderDebugDraw(world);
  draw();
  mask = new Uint8ClampedArray(4);
  draw();
  assert.equal(built.length, 2, 'rebuilt when mask changes');
}

console.log('PASS createColliderDebugDraw: guards, build fills+edge colors, cache, mask rebuild, blit.');
