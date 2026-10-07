import assert from 'node:assert/strict';
import { kanalPrisonWalls } from '../modules/gameplay/prison.ts';

const prison = (x, y, w, h, floorAsset) => ({ x, y, w, h, floorAsset });
const prisons = {
  blue: prison(100, 200, 200, 150),
  red: prison(1700, 200, 200, 150, 'brickFloor'),
};

// Non-kanal fields get no extra walls.
assert.deepEqual(kanalPrisonWalls(prisons, false), []);

// Kanal: five hidden walls per prison.
const walls = kanalPrisonWalls(prisons, true);
assert.equal(walls.length, 10);
assert.ok(walls.every((o) => o.hidden === true && o.visualW === 1 && o.visualH === 1));

// Geometry verbatim for the blue prison (w200 h150):
// thickness = max(12, round(150*0.09)) = 14
// gateWidth = max(76, round(200*0.48)) = 96
// shoulder  = round((200-96)/2) = 52
const thickness = 14;
const [top, left, right, bottomL, bottomR] = walls.slice(0, 5);
assert.deepEqual(top, {
  asset: 'prisonFloor', x: 100, y: 200, w: 200, h: thickness,
  visualW: 1, visualH: 1, hidden: true,
});
assert.deepEqual(left, {
  asset: 'prisonFloor', x: 100, y: 200 + thickness, w: thickness, h: 150 - thickness,
  visualW: 1, visualH: 1, hidden: true,
});
assert.deepEqual(right, {
  asset: 'prisonFloor', x: 100 + 200 - thickness, y: 200 + thickness, w: thickness, h: 150 - thickness,
  visualW: 1, visualH: 1, hidden: true,
});
// Bottom shoulders leave a 96px gate in the middle.
assert.equal(bottomL.w, 52);
assert.equal(bottomR.w, 52);
assert.equal(bottomL.x, 100);
assert.equal(bottomR.x, 100 + 200 - 52);
assert.equal(bottomL.y, 200 + 150 - thickness);
assert.equal(bottomR.y, 200 + 150 - thickness);

// floorAsset override wins over the default.
assert.equal(walls[5].asset, 'brickFloor');
assert.equal(walls[0].asset, 'prisonFloor');

// Small/thin prisons still get a sane thickness and gate.
const tight = kanalPrisonWalls({ blue: prison(0, 0, 80, 60), red: prison(0, 0, 80, 60) }, true);
// thickness = max(12, round(60*0.09)=5) = 12; gate = max(76, round(80*.48)=38) = 76
assert.equal(tight[0].h, 12);
assert.equal(tight[3].w, Math.round((80 - 76) / 2)); // 2px shoulders

console.log('PASS kanalPrisonWalls: gate off/on, 5 walls each, verbatim geometry, asset override, tight prison.');
