import assert from 'node:assert/strict';
import { createDrawNearbyFieldDetails } from '../modules/ui/draw-nearby-details.ts';

const recorder = () => {
  const ctx = { marker: 'ctx' };
  const assets = [];
  const objects = [];
  return {
    ctx,
    assets,
    objects,
    drawFieldAsset: (...args) => assets.push(args),
    drawMapObject: (...args) => objects.push(args),
  };
};

const fieldOf = (over = {}) => ({
  id: 'kampung',
  name: 'Kampung',
  difficulty: 'easy',
  structuresInBackground: false,
  basesInBackground: false,
  decorations: [],
  obstacles: [],
  prisons: {
    blue: { x: 100, y: 300, w: 100, h: 90 },
    red: { x: 1800, y: 300, w: 100, h: 90, flip: false },
  },
  ...over,
});

const worldOf = (rec, over = {}) => ({
  ctx: rec.ctx,
  field: fieldOf(),
  studioMap: null,
  drawMapObject: rec.drawMapObject,
  isPlaying: () => true,
  kanal: false,
  bases: { blue: { x: 100, y: 400 }, red: { x: 1900, y: 400 } },
  fortWidth: 168,
  fortHeight: 188,
  fortAnchorY: 130,
  drawFieldAsset: rec.drawFieldAsset,
  ...over,
});

// Studio background objects draw (z-sorted) even outside play mode.
{
  const rec = recorder();
  const studioMap = {
    objects: [
      { layer: 'background', z: 5, x: 0 },
      { layer: 'background', z: 1, x: 10 },
      { layer: 'world', z: 0, x: 20 },
    ],
  };
  const draw = createDrawNearbyFieldDetails(worldOf(rec, {
    studioMap,
    isPlaying: () => false,
  }));
  draw({ x: 500, y: 400 }, 'follow');
  assert.equal(rec.objects.length, 2, 'only background layer');
  assert.equal(rec.objects[0][1].z, 1, 'sorted by z');
  assert.equal(rec.objects[1][1].z, 5);
  assert.equal(rec.assets.length, 0, 'menu non-kanal draws no props');
}

// Follow camera: nearby decorations/obstacles draw; far ones skip.
{
  const rec = recorder();
  const field = fieldOf({
    decorations: [
      { asset: 'near', x: 490, y: 390, w: 20, h: 20 },
      { asset: 'far', x: 4900, y: 3900, w: 20, h: 20 },
      { asset: 'under', x: 500, y: 400, w: 20, h: 20, underlay: true },
    ],
    obstacles: [
      { asset: 'prop', x: 520, y: 400, w: 30, h: 30, visualW: 30, visualH: 40 },
      { asset: 'hidden', x: 520, y: 400, w: 30, h: 30, visualW: 1, visualH: 1, hidden: true },
    ],
  });
  const draw = createDrawNearbyFieldDetails(worldOf(rec, { field }));
  draw({ x: 500, y: 400 }, 'follow');
  const drawn = rec.assets.map((a) => a[1]);
  assert.ok(drawn.includes('near'), 'near decoration drawn');
  assert.ok(!drawn.includes('far'), 'far decoration skipped');
  assert.ok(!drawn.includes('under'), 'underlay decoration skipped');
  assert.ok(!drawn.includes('hidden'), 'hidden obstacle skipped');
  assert.ok(drawn.includes('prop'), 'visible obstacle drawn');
  // Near blue fort draws; far red fort is outside the detail radius.
  assert.ok(drawn.includes('fortRed'), 'near fort drawn');
  assert.ok(!drawn.includes('fortGreen'), 'far fort skipped');
  assert.ok(drawn.includes('prisonFloor'), 'near prison floor drawn');
}

// Overview (non-kanal): overlay decorations and obstacles skip; forts/prisons still draw.
{
  const rec = recorder();
  const field = fieldOf({
    decorations: [{ asset: 'd', x: 500, y: 400, w: 10, h: 10 }],
    obstacles: [{ asset: 'o', x: 500, y: 400, w: 10, h: 10, visualW: 10, visualH: 10 }],
  });
  const draw = createDrawNearbyFieldDetails(worldOf(rec, { field }));
  draw({ x: 500, y: 400 }, 'overview');
  const drawn = rec.assets.map((a) => a[1]);
  assert.ok(!drawn.includes('d') && !drawn.includes('o'), 'overview skips overlays (HEAD verbatim)');
  assert.ok(drawn.includes('fortRed'), 'forts still draw');
}

// Kanal: everything draws in both cameras (native resolution rule).
{
  const rec = recorder();
  const field = fieldOf({
    decorations: [{ asset: 'k', x: 4900, y: 3900, w: 10, h: 10 }],
    obstacles: [{ asset: 'ko', x: 4900, y: 3900, w: 10, h: 10, visualW: 10, visualH: 10 }],
  });
  const draw = createDrawNearbyFieldDetails(worldOf(rec, { field, kanal: true }));
  draw({ x: 500, y: 400 }, 'follow');
  const drawn = rec.assets.map((a) => a[1]);
  assert.ok(drawn.includes('k') && drawn.includes('ko'));
}

// structuresInBackground hides fort/prison live layers.
{
  const rec = recorder();
  const draw = createDrawNearbyFieldDetails(worldOf(rec, {
    field: fieldOf({ structuresInBackground: true, basesInBackground: true }),
  }));
  draw({ x: 500, y: 400 }, 'follow');
  const drawn = rec.assets.map((a) => a[1]);
  assert.ok(!drawn.includes('fortRed') && !drawn.includes('prisonFloor'));
}

console.log('PASS createDrawNearbyFieldDetails: studio sort, radius filter, overview/kanal rules, background flags.');
