import assert from 'node:assert/strict';
import { getSprintDustImage, getKakaUltimateImage, getFieldImage } from '../modules/ui/image-cache.ts';

// Minimal DOM Image stub: getters only touch constructor/decoding/src.
globalThis.Image = class {
  constructor() {
    this.decoding = '';
    this.src = '';
  }
};

// Singleton getters build once and return the cached instance.
const dust = getSprintDustImage();
assert.equal(dust.decoding, 'async');
assert.ok(dust.src.includes('vfx/sprint-dust.webp?v=7'));
assert.equal(getSprintDustImage(), dust);

const kaka = getKakaUltimateImage();
assert.equal(kaka.decoding, 'async');
assert.ok(kaka.src.length > 0);
assert.equal(getKakaUltimateImage(), kaka);
assert.notEqual(kaka, dust);

// Field atlas URLs are versioned and cached per asset.
const objects = getFieldImage('objects.webp');
assert.ok(objects.src.includes('field/objects.webp?v='));
assert.equal(getFieldImage('objects.webp'), objects);
assert.notEqual(getFieldImage('animated.webp'), objects);
console.log('PASS imageCache: singleton getters, versioned field URLs, per-asset cache.');
