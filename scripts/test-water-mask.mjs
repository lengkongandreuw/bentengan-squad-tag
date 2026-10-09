import assert from 'node:assert/strict';
import { extractWaterMask } from '../modules/world/water-mask.ts';

const canvas = (width, height) => ({ width, height });
const wetCanvas = (width, height) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data[i] = 200;
  return data;
};
const makeContext = (data) => {
  const calls = { cleared: 0, drawn: [] };
  return {
    calls,
    clearRect: () => { calls.cleared += 1; },
    drawImage: (img, x, y, w, h) => calls.drawn.push([x, y, w, h]),
    getImageData: () => ({ data }),
  };
};
const image = (naturalWidth = 8, naturalHeight = 8) => ({ naturalWidth, naturalHeight });

// Not-ready inputs → null, and the context untouched.
{
  const ctx = makeContext(null);
  assert.equal(extractWaterMask({ image: null, context: ctx, canvas: canvas(8, 8), worldWidth: 100, worldHeight: 100, kanal: false }), null);
  assert.equal(extractWaterMask({ image: image(0, 8), context: ctx, canvas: canvas(8, 8), worldWidth: 100, worldHeight: 100, kanal: false }), null);
  assert.equal(extractWaterMask({ image: image(), context: null, canvas: canvas(8, 8), worldWidth: 100, worldHeight: 100, kanal: false }), null);
  assert.equal(ctx.calls.cleared, 0);
}
// Ready image: clears, draws at canvas size, returns pixels; non-kanal → no glints.
{
  const data = wetCanvas(8, 8);
  const ctx = makeContext(data);
  const result = extractWaterMask({ image: image(), context: ctx, canvas: canvas(8, 8), worldWidth: 100, worldHeight: 100, kanal: false });
  assert.ok(result);
  assert.equal(result.pixels, data);
  assert.equal(ctx.calls.cleared, 1);
  assert.deepEqual(ctx.calls.drawn, [[0, 0, 8, 8]]);
  assert.deepEqual(result.glints, []);
}
// Debug overlay colorizes wet pixels: 255/69/69/78.
{
  const data = new Uint8ClampedArray(4); // 1x1 wet
  data[0] = 200;
  const ctx = makeContext(data);
  const overlays = [];
  const debug = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img) => overlays.push(img),
  };
  extractWaterMask({ image: image(1, 1), context: ctx, canvas: canvas(1, 1), debugContext: debug, worldWidth: 100, worldHeight: 100, kanal: false });
  assert.equal(overlays.length, 1);
  assert.deepEqual([...overlays[0].data], [255, 69, 69, 78]);
}
// Kanal glints: 30x30 fully wet mask samples (9,9),(9,21? no—y<21),(21,9).
{
  const size = 30;
  const data = wetCanvas(size, size);
  const ctx = makeContext(data);
  const result = extractWaterMask({ image: image(size, size), context: ctx, canvas: canvas(size, size), worldWidth: 300, worldHeight: 300, kanal: true });
  // y ∈ {9} (y=21 is not < 21); x ∈ {9, 21} (x=21 < 21 false → only 9)
  assert.equal(result.glints.length, 1);
  const [glint] = result.glints;
  assert.equal(glint.x, ((9 + 0.5) / size) * 300);
  assert.equal(glint.y, ((9 + 0.5) / size) * 300);
  assert.equal(glint.phase, (9 * 17 + 9 * 31) % 29);
}
// Dry mask → no glints even when kanal.
{
  const data = new Uint8ClampedArray(30 * 30 * 4);
  const ctx = makeContext(data);
  const result = extractWaterMask({ image: image(30, 30), context: ctx, canvas: canvas(30, 30), worldWidth: 300, worldHeight: 300, kanal: true });
  assert.deepEqual(result.glints, []);
}

console.log('PASS extractWaterMask: guards, draw/pixels, debug overlay, kanal glints, dry mask.');
