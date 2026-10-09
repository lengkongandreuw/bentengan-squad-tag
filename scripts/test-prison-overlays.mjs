import assert from 'node:assert/strict';
import { drawPrisonOverlays } from '../modules/ui/draw-base.ts';

const prisons = {
  blue: { x: 10, y: 20, w: 100, h: 80 },
  red: { x: 300, y: 20, w: 100, h: 80, flip: true },
};
const paints = [];
const paintAsset = (target, asset, x, y, w, h, flip, opacity) => {
  paints.push([asset, x, y, w, h, flip, opacity]);
};

// Both teams painted with overlay defaults.
drawPrisonOverlays({}, prisons, paintAsset, false);
assert.deepEqual(paints, [
  ['prisonOverlay', 10, 20, 100, 80, false, 0.98],
  ['prisonOverlay', 300, 20, 100, 80, true, 0.98],
]);

// Background-baked fields skip entirely.
paints.length = 0;
drawPrisonOverlays({}, prisons, paintAsset, true);
assert.equal(paints.length, 0);

// Per-prison overrides respected.
paints.length = 0;
const custom = {
  blue: { x: 0, y: 0, w: 10, h: 10, overlayAsset: 'customA', flip: true },
  red: { x: 0, y: 0, w: 10, h: 10 },
};
drawPrisonOverlays({}, custom, paintAsset, undefined);
assert.deepEqual(paints[0][0], 'customA');
assert.equal(paints[0][5], true);
assert.equal(paints[1][5], true);
console.log('PASS prison overlays: both teams, baked skip, overrides.');
