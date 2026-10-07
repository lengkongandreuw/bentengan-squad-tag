import assert from 'node:assert/strict';
import { createGroundTileCanvas } from '../modules/ui/ground-tiles.ts';

// Minimal DOM: fresh canvas per call with a recording 2d context.
// (any-cast: avoids contextual typing against the deprecated Document
// overload in Node's types; the module only needs createElement('canvas').)
const created = [];
globalThis.document = /** @type {any} */ ({
  createElement: (tag) => {
    assert.equal(tag, 'canvas');
    const draws = [];
    const surface = {
      width: 0,
      height: 0,
      draws,
      getContext: (type) => {
        assert.equal(type, '2d');
        return { drawImage: (...args) => draws.push(args) };
      },
    };
    created.push(surface);
    return surface;
  },
});

const tiles = {
  grass: { x: 8, y: 16, width: 64, height: 32 },
  path: { x: 72, y: 0, width: 32, height: 32 },
};
const atlasImage = (complete, naturalWidth) => ({ complete, naturalWidth });

// Ready atlas → canvas sized to the tile and cut from the atlas rect.
{
  const img = atlasImage(true, 512);
  const make = createGroundTileCanvas(img, tiles);
  const surface = make('grass');
  assert.equal(surface.width, 64);
  assert.equal(surface.height, 32);
  assert.equal(surface.draws.length, 1);
  assert.deepEqual(surface.draws[0], [img, 8, 16, 64, 32, 0, 0, 64, 32]);
}
// Incomplete atlas → blank surface, no draw.
{
  const make = createGroundTileCanvas(atlasImage(false, 0), tiles);
  const surface = make('path');
  assert.equal(surface.width, 32);
  assert.equal(surface.draws.length, 0);
}
// Loaded but zero natural width → also blank.
{
  const make = createGroundTileCanvas(atlasImage(true, 0), tiles);
  const surface = make('path');
  assert.equal(surface.draws.length, 0);
}
// Each call returns a fresh canvas.
{
  created.length = 0;
  const make = createGroundTileCanvas(atlasImage(true, 512), tiles);
  const a = make('grass');
  const b = make('grass');
  assert.notEqual(a, b);
  assert.equal(created.length, 2);
}

console.log('PASS createGroundTileCanvas: atlas cut, blank guards, fresh canvases.');
