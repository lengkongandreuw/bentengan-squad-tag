import assert from 'node:assert/strict';
import { createStaticMapLayer } from '../modules/ui/static-map-layer.ts';

// ---- DOM stubs: layer canvases record every 2d op. ----
const built = [];
let contextAvailable = true;
globalThis.document = /** @type {any} */ ({
  createElement: (tag) => {
    assert.equal(tag, 'canvas');
    const ops = [];
    const layer = {
      width: 0,
      height: 0,
      ops,
      getContext: (type) => {
        assert.equal(type, '2d');
        if (!contextAvailable) return null;
        const ctx = {
          clearRect: (...a) => ops.push(['clearRect', ...a]),
          drawImage: (...a) => ops.push(['drawImage', ...a]),
          fillRect: (...a) => ops.push(['fillRect', ...a]),
          fillText: (...a) => ops.push(['fillText', ...a]),
          createPattern: () => ({ marker: 'pattern' }),
          save: () => ops.push(['save']),
          restore: () => ops.push(['restore']),
          clip: () => ops.push(['clip']),
          stroke: () => ops.push(['stroke']),
          fill: () => ops.push(['fill']),
          beginPath: () => ops.push(['beginPath']),
          moveTo: (...a) => ops.push(['moveTo', ...a]),
          lineTo: (...a) => ops.push(['lineTo', ...a]),
          setLineDash: (...a) => ops.push(['setLineDash', ...a]),
          ellipse: (...a) => ops.push(['ellipse', ...a]),
          arc: (...a) => ops.push(['arc', ...a]),
          setTransform: (...a) => ops.push(['setTransform', ...a]),
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 0,
          font: '',
          textAlign: '',
          globalAlpha: 1,
          imageSmoothingEnabled: false,
          imageSmoothingQuality: 'low',
        };
        return ctx;
      },
    };
    built.push(layer);
    return layer;
  },
});

const mainCtxOps = [];
const ctx = {
  clearRect: (...a) => mainCtxOps.push(['clearRect', ...a]),
  drawImage: (...a) => mainCtxOps.push(['drawImage', ...a]),
  fillRect: (...a) => mainCtxOps.push(['fillRect', ...a]),
  fillText: (...a) => mainCtxOps.push(['fillText', ...a]),
  fillStyle: '',
  save: () => mainCtxOps.push(['save']),
  restore: () => mainCtxOps.push(['restore']),
};

const blue = { x: 100, y: 400, w: 120, h: 110, floorAsset: 'prisonFloor' };
const red = { x: 1800, y: 400, w: 120, h: 110 };

const fieldOf = (over = {}) => ({
  id: 'kampung',
  name: 'Kampung Merdeka',
  difficulty: 'easy',
  ground: 'grass',
  background: null,
  paths: [],
  decorations: [],
  obstacles: [],
  prisons: { blue, red },
  structuresInBackground: false,
  basesInBackground: false,
  ...over,
});

const worldOf = (over = {}) => ({
  getContext: () => ctx,
  field: fieldOf(),
  fieldBackground: null,
  studioMap: null,
  kanal: false,
  worldWidth: 2000,
  worldHeight: 800,
  bases: { blue: { x: 100, y: 400 }, red: { x: 1900, y: 400 } },
  fortWidth: 168,
  fortHeight: 188,
  fortAnchorY: 130,
  groundTile: () => ({ marker: 'tile' }),
  drawFieldAsset: () => {},
  drawMapTerrain: () => {},
  ...over,
});

// Scale formula: authored 0.5, structures-in-bg 0.75, kanal 1.5.
{
  built.length = 0;
  createStaticMapLayer(worldOf());
  assert.equal(built[0].width, Math.round(2000 * 0.5));
  assert.equal(built[0].height, Math.round(800 * 0.5));
}
{
  built.length = 0;
  createStaticMapLayer(worldOf({ field: fieldOf({ structuresInBackground: true }) }));
  assert.equal(built[0].width, Math.round(2000 * 0.75));
}
{
  built.length = 0;
  createStaticMapLayer(worldOf({ kanal: true }));
  assert.equal(built[0].width, Math.round(2000 * 1.5));
}

// First draw bakes (setTransform + clearRect), then blits; second draw only blits.
{
  built.length = 0; mainCtxOps.length = 0;
  const layer = createStaticMapLayer(worldOf());
  layer.drawMap();
  const ops = built[0].ops;
  const transforms = ops.filter((o) => o[0] === 'setTransform');
  const clears = ops.filter((o) => o[0] === 'clearRect');
  assert.equal(transforms.length, 1);
  assert.equal(clears.length, 1);
  assert.deepEqual(transforms[0], ['setTransform', 0.5, 0, 0, 0.5, 0, 0]);
  assert.equal(mainCtxOps.filter((o) => o[0] === 'drawImage').length, 1);
  const blit = mainCtxOps.find((o) => o[0] === 'drawImage');
  assert.deepEqual(blit.slice(1), [built[0], 0, 0, 1000, 400, 0, 0, 2000, 800]);
  layer.drawMap();
  assert.equal(built[0].ops.filter((o) => o[0] === 'clearRect').length, 1, 'cached: no re-bake');
  assert.equal(mainCtxOps.filter((o) => o[0] === 'drawImage').length, 2, 'still blits');
}

// invalidate() re-bakes on next draw.
{
  built.length = 0; mainCtxOps.length = 0;
  const layer = createStaticMapLayer(worldOf());
  layer.drawMap();
  layer.invalidate();
  layer.drawMap();
  assert.equal(built[0].ops.filter((o) => o[0] === 'clearRect').length, 2, 'rebuilt after invalidate');
}

// No layer context → solid-color fallback fill, no blit.
{
  built.length = 0; mainCtxOps.length = 0;
  contextAvailable = false;
  const layer = createStaticMapLayer(worldOf());
  layer.drawMap();
  contextAvailable = true;
  assert.equal(mainCtxOps.filter((o) => o[0] === 'drawImage').length, 0);
  const fill = mainCtxOps.find((o) => o[0] === 'fillRect');
  assert.ok(fill, 'fallback fill ran');
  assert.equal(ctx.fillStyle, '#667556');
}

// Title bar drawn on the static layer when field has no background.
{
  built.length = 0;
  const layer = createStaticMapLayer(worldOf());
  layer.drawMap();
  const title = built[0].ops.find((o) => o[0] === 'fillText');
  assert.ok(title, 'title drawn');
  assert.match(title[1], /KAMPUNG MERDEKA · EASY · ARENA 5v5/);
}
// With a background image ready on the layer… title skipped (field.background set).
{
  built.length = 0;
  const layer = createStaticMapLayer(worldOf({ field: fieldOf({ background: 'kampung-map.webp' }) }));
  layer.drawMap();
  const title = built[0].ops.find((o) => o[0] === 'fillText');
  assert.equal(title, undefined, 'no title when background exists');
  // background image blitted to layer (fieldBackground given)
  built.length = 0;
  const withImg = createStaticMapLayer(worldOf({
    field: fieldOf({ background: 'kampung-map.webp' }),
    fieldBackground: { complete: true, naturalWidth: 10, naturalHeight: 10 },
  }));
  withImg.drawMap();
  const blits = built[0].ops.filter((o) => o[0] === 'drawImage');
  assert.equal(blits.length, 1, 'background drawn onto static layer');
}

// Studio maps delegate to drawMapTerrain per frame — no static-layer bake.
{
  built.length = 0; mainCtxOps.length = 0;
  const terrainCalls = [];
  const studio = { marker: 'studio' };
  const layer = createStaticMapLayer(worldOf({
    studioMap: studio,
    drawMapTerrain: (...args) => terrainCalls.push(args),
  }));
  layer.drawMap();
  assert.equal(terrainCalls.length, 1);
  assert.equal(terrainCalls[0][1], studio);
  assert.equal(mainCtxOps.filter((o) => o[0] === 'drawImage').length, 0);
  assert.equal(built[0].ops.filter((o) => o[0] === 'clearRect').length, 0, 'no bake for studio');
}

console.log('PASS createStaticMapLayer: scale formula, bake-once cache, invalidate, fallback, title/background, studio delegation.');
