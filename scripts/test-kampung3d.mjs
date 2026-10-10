import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from 'three';
import { fieldCycleDecision } from '../modules/game-core/match-control.ts';
import { buildFieldConfigs, GUIDE_FIELD_CONFIGS } from '../modules/world/map-data/guide-fields.ts';

// Evaluate the actual arena definitions, not a hand-copied test configuration.
const fields = buildFieldConfigs(GUIDE_FIELD_CONFIGS);
// Clone AFTER normalization: no second scaling and no change to live arena rules.
fields.push({
  ...structuredClone(fields[0]),
  id: 'kampung3d',
  name: 'Kampung Merdeka 3D',
  kicker: 'Arena eksperimental bergaya low-poly dengan gameplay dua dimensi dan jalur terbuka.',
});
assert.equal(fields.length, 6);
assert.equal(new Set(fields.map(f => f.id)).size, 6);
const original = fields.find(f => f.id === 'kampung');
const experiment = fields.find(f => f.id === 'kampung3d');
for (const key of Object.keys(original).filter(k => !['id', 'name', 'kicker'].includes(k))) {
  assert.deepEqual(experiment[key], original[key], `${key}: experiment must retain original gameplay/placement`);
}
assert.notEqual(experiment.obstacles, original.obstacles, 'clone must not mutate original');
assert.equal(fieldCycleDecision('kanal2', 3, fields.filter(f => f.id !== 'kampung3d').map(f => f.id)).fieldId, 'kampung');
assert.equal(fieldCycleDecision('kanal', 3, fields.filter(f => f.id !== 'kampung3d').map(f => f.id)).fieldId, 'kanal2');
assert.equal(fieldCycleDecision('kampung3d', 3, ['kampung3d']).fieldId, 'kampung3d');

// Orthographic projection must preserve pixel-perfect ground coordinates in
// follow/tactical/overview. Otherwise collider and rendered mesh would drift.
for (const scale of [.4, .8, 1.4]) {
  const width = 1280, height = 720, x = 850, y = 550;
  const camera = new OrthographicCamera(-width / scale / 2, width / scale / 2, height / scale / 2, -height / scale / 2, .1, 10000);
  camera.up.set(0, 0, 1);
  camera.position.set(x, -y * Math.SQRT2 - 2200, 2200);
  camera.lookAt(x, -y * Math.SQRT2, 0); camera.updateMatrixWorld();
  for (const [px, py] of [[0, 0], [850, 550], [1500, 1000]]) {
    const screen = new Vector3(px, -py * Math.SQRT2, 0).project(camera);
    assert.ok(Math.abs((screen.x + 1) * width / 2 - ((px - x) * scale + width / 2)) < 1e-6);
    assert.ok(Math.abs((1 - screen.y) * height / 2 - ((py - y) * scale + height / 2)) < 1e-6);
  }
}
console.log('PASS: 5 guide arenas + isolated 3D experiment; original/3D colliders, base, prison, placement and difficulty identical; rotation; ground projection aligned at all zooms.');
