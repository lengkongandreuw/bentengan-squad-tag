import assert from 'node:assert/strict';
import { createWaterAt } from '../modules/gameplay/water.ts';

const fakeCanvas = (width, height) => ({ width, height });

// No studio map, no mask pixels → never water (and stays safe pre-load).
{
  const isWaterAt = createWaterAt({
    studioMap: null,
    pixels: () => null,
    canvas: fakeCanvas(4, 2),
    worldWidth: 400,
    worldHeight: 200,
  });
  assert.equal(isWaterAt(10, 10), false);
}
// Mask sampling: half-res mask, >127 threshold, clamped edges.
{
  const width = 4, height = 2;
  const pixels = new Uint8ClampedArray(width * height * 4);
  // world (100, 100) → maskX = round(100/400 * 3) = 1, maskY = round(100/200 * 1) = 1
  const index = (1 * width + 1) * 4;
  pixels[index] = 200;
  const source = { studioMap: null, pixels: () => pixels, canvas: fakeCanvas(width, height), worldWidth: 400, worldHeight: 200 };
  const isWaterAt = createWaterAt(source);
  assert.equal(isWaterAt(100, 100), true);
  pixels[index] = 100;
  assert.equal(isWaterAt(100, 100), false); // threshold is >127
  pixels[index] = 200;
  // Out-of-world coordinates clamp to the edge pixel instead of throwing.
  assert.equal(isWaterAt(-50, -50), false); // clamps to mask(0,0) which is 0
}
// Lazy pixels: mask arriving after creation is visible (async load).
{
  let loaded = null;
  const isWaterAt = createWaterAt({
    studioMap: null,
    pixels: () => loaded,
    canvas: fakeCanvas(1, 1),
    worldWidth: 100,
    worldHeight: 100,
  });
  assert.equal(isWaterAt(50, 50), false);
  loaded = new Uint8ClampedArray(4);
  loaded[3] = 0; // alpha-channel slot at index 0, threshold check on [0]… set below
  loaded[0] = 255;
  assert.equal(isWaterAt(50, 50), true);
}
// Studio map branch: water object → true; bridge over it → false; dry → mask fallback.
{
  const waterObject = { behavior: 'water', shape: 'rect', rotation: 0, x: 0, y: 0, w: 50, h: 50 };
  const bridgeObject = { behavior: 'bridge', shape: 'rect', rotation: 0, x: 0, y: 0, w: 50, h: 50 };
  const map = { objects: [waterObject], width: 100, height: 100 };
  const isWaterAt = createWaterAt({
    studioMap: map,
    pixels: () => new Uint8ClampedArray(4), // must be ignored when studioMap is set
    canvas: fakeCanvas(1, 1),
    worldWidth: 100,
    worldHeight: 100,
  });
  assert.equal(isWaterAt(25, 25), true);
  assert.equal(isWaterAt(90, 90), false);
  const bridged = createWaterAt({
    studioMap: { objects: [waterObject, bridgeObject], width: 100, height: 100 },
    pixels: () => null,
    canvas: fakeCanvas(1, 1),
    worldWidth: 100,
    worldHeight: 100,
  });
  assert.equal(bridged(25, 25), false);
}
// Studio mask fallback: RLE rows.
{
  const map = {
    objects: [],
    width: 100,
    height: 100,
    waterMask: { width: 10, height: 10, rows: Array.from({ length: 10 }, () => [2, 6]) },
  };
  const isWaterAt = createWaterAt({ studioMap: map, pixels: () => null, canvas: fakeCanvas(1, 1), worldWidth: 100, worldHeight: 100 });
  assert.equal(isWaterAt(30, 50), true); // xx = 3 inside [2,6)
  assert.equal(isWaterAt(80, 50), false);
  assert.equal(isWaterAt(-1, 50), false); // outside map
}

console.log('PASS createWaterAt: null-safe, mask threshold+clamp, lazy load, studio objects/bridge/mask.');
