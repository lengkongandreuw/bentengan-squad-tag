import assert from 'node:assert/strict';
import { createFieldAssetDraw } from '../modules/ui/field-assets.ts';

const atlas = (complete = true, naturalWidth = 64) => ({
  complete,
  naturalWidth,
});

const recorder = () => {
  const calls = [];
  const target = {
    fillStyle: '',
    globalAlpha: 1,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    translate: (x, y) => calls.push(['translate', x, y]),
    scale: (x, y) => calls.push(['scale', x, y]),
    beginPath: () => calls.push(['beginPath']),
    roundRect: (x, y, w, h, r) => calls.push(['roundRect', x, y, w, h, r]),
    fill: () => calls.push(['fill']),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    drawImage: (...args) => calls.push(['drawImage', ...args]),
  };
  return { calls, target };
};

const objectAssets = { tree: { x: 10, y: 20, width: 30, height: 40 } };
const animations = {
  spin: { fps: 8, frames: [{ x: 0, y: 0, width: 16, height: 16 }, { x: 16, y: 0, width: 16, height: 16 }] },
};

// Atlas not ready → placeholder rounded rect, no drawImage.
{
  const { calls, target } = recorder();
  const { drawFieldAsset } = createFieldAssetDraw({
    kanal: false,
    objectAssets,
    animations,
    baseAtlas: atlas(false),
    kanalAtlas: null,
    animatedAtlas: atlas(false),
  });
  drawFieldAsset(target, 'tree', 100, 200, 30, 40);
  assert.equal(target.fillStyle, 'rgba(28,43,31,.34)');
  const kinds = calls.map((c) => c[0]);
  assert.ok(kinds.includes('beginPath'));
  assert.ok(kinds.includes('roundRect'));
  assert.ok(kinds.includes('fill'));
  assert.ok(!kinds.includes('drawImage'));
  assert.ok(!kinds.includes('save')); // placeholder does not save
}
// Ready atlas → drawImage with atlas source and screen dest, no shadow off-kanal.
{
  const { calls, target } = recorder();
  const { drawFieldAsset } = createFieldAssetDraw({
    kanal: false,
    objectAssets,
    animations,
    baseAtlas: atlas(true),
    kanalAtlas: null,
    animatedAtlas: atlas(true),
  });
  drawFieldAsset(target, 'tree', 100, 200, 30, 40);
  const draw = calls.find((c) => c[0] === 'drawImage');
  assert.deepEqual(draw, ['drawImage', atlas(true), 10, 20, 30, 40, 100, 200, 30, 40]);
  assert.ok(calls.some((c) => c[0] === 'save'));
  assert.ok(calls.some((c) => c[0] === 'restore'));
  assert.equal(target.shadowColor, ''); // no shadow off-kanal
}
// Kanal shadow settings applied.
{
  const { target } = recorder();
  const { drawFieldAsset } = createFieldAssetDraw({
    kanal: true,
    objectAssets,
    animations,
    baseAtlas: atlas(true),
    kanalAtlas: null,
    animatedAtlas: atlas(true),
  });
  drawFieldAsset(target, 'tree', 0, 0, 30, 40);
  assert.equal(target.shadowColor, 'rgba(5, 16, 12, .46)');
  assert.equal(target.shadowBlur, 4);
  assert.equal(target.shadowOffsetY, 5);
}
// Flip mirrors via translate+scale.
{
  const { calls, target } = recorder();
  const { drawFieldAsset } = createFieldAssetDraw({
    kanal: false,
    objectAssets,
    animations,
    baseAtlas: atlas(true),
    kanalAtlas: null,
    animatedAtlas: atlas(true),
  });
  drawFieldAsset(target, 'tree', 100, 200, 30, 40, true);
  const translate = calls.find((c) => c[0] === 'translate');
  const scale = calls.find((c) => c[0] === 'scale');
  assert.deepEqual(translate, ['translate', 100 * 2 + 30, 0]);
  assert.deepEqual(scale, ['scale', -1, 1]);
}
// kanalNusa prefix uses kanalAtlas.
{
  const { calls, target } = recorder();
  const kanalAtlasImg = atlas(true);
  const { drawFieldAsset } = createFieldAssetDraw({
    kanal: false,
    objectAssets: { kanalNusaTree: { x: 1, y: 2, width: 3, height: 4 } },
    animations,
    baseAtlas: atlas(true),
    kanalAtlas: kanalAtlasImg,
    animatedAtlas: atlas(true),
  });
  drawFieldAsset(target, 'kanalNusaTree', 0, 0, 3, 4);
  const draw = calls.find((c) => c[0] === 'drawImage');
  assert.equal(draw[1], kanalAtlasImg);
}
// Animated: frame index follows fps, draws atlas frame, restores.
{
  const { calls, target } = recorder();
  const animAtlas = atlas(true);
  const { drawAnimatedAsset } = createFieldAssetDraw({
    kanal: false,
    objectAssets,
    animations,
    baseAtlas: atlas(true),
    kanalAtlas: null,
    animatedAtlas: animAtlas,
  });
  drawAnimatedAsset(target, 'spin', 50, 60, 16, 16, 125);
  const draw = calls.find((c) => c[0] === 'drawImage');
  // frame = floor(125 * 8 / 1000) % 2 = floor(1) % 2 = 1
  assert.deepEqual(draw, ['drawImage', animAtlas, 16, 0, 16, 16, 50, 60, 16, 16]);
  assert.ok(calls.some((c) => c[0] === 'save'));
  assert.ok(calls.some((c) => c[0] === 'restore'));
}
// Animated incomplete atlas → no save, no drawImage.
{
  const { calls, target } = recorder();
  const { drawAnimatedAsset } = createFieldAssetDraw({
    kanal: false,
    objectAssets,
    animations,
    baseAtlas: atlas(true),
    kanalAtlas: null,
    animatedAtlas: atlas(false),
  });
  drawAnimatedAsset(target, 'spin', 0, 0, 16, 16, 1000);
  assert.ok(!calls.some((c) => c[0] === 'save'));
  assert.ok(!calls.some((c) => c[0] === 'drawImage'));
}
// Animated opacity scales globalAlpha after save.
{
  const { target } = recorder();
  const { drawAnimatedAsset } = createFieldAssetDraw({
    kanal: false,
    objectAssets,
    animations,
    baseAtlas: atlas(true),
    kanalAtlas: null,
    animatedAtlas: atlas(true),
  });
  drawAnimatedAsset(target, 'spin', 0, 0, 16, 16, 250, false, 0.5);
  assert.equal(target.globalAlpha, 0.5);
}

console.log('PASS createFieldAssetDraw: placeholder, atlas blit, kanal shadow, flip, atlas pick, animated frame/no-op/opacity.');
