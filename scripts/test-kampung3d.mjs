import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { OrthographicCamera, Vector3 } from 'three';
import { fieldCycleDecision } from '../lib/field-cycle.js';

// Evaluate the actual arena definitions, not a hand-copied test configuration.
const source = await readFile(new URL('../app/prototype.tsx', import.meta.url), 'utf8');
const rules = JSON.parse(await readFile(new URL('../config/game-rules.json', import.meta.url), 'utf8'));
const configSource = source.slice(source.indexOf('const DESIGN_W ='), source.indexOf('const CAMERA_OPTIONS:'));
const js = ts.transpileModule(configSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const fields = new Function('GAME_RULES', 'structuredClone', js + '\nreturn FIELD_CONFIGS;')(rules, structuredClone);
assert.equal(fields.length, 5);
assert.equal(new Set(fields.map(f => f.id)).size, 5);
const original = fields.find(f => f.id === 'kampung');
const experiment = fields.find(f => f.id === 'kampung3d');
for (const key of Object.keys(original).filter(k => !['id', 'name', 'kicker'].includes(k))) {
  assert.deepEqual(experiment[key], original[key], `${key}: experiment must retain original gameplay/placement`);
}
assert.notEqual(experiment.obstacles, original.obstacles, 'clone must not mutate original');
assert.equal(fieldCycleDecision('kanal', 3, fields.filter(f => f.id !== 'kampung3d').map(f => f.id)).fieldId, 'kampung');
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
console.log('PASS: 5 unique maps; original/3D colliders, base, prison, placement and difficulty identical; isolated rotation; ground projection aligned at all zooms.');
