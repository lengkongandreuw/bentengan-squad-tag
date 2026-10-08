import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  validateMap,
  validateAsset,
  validateDocument,
  contains,
  solidAt,
  waterAt,
  speedAt,
  frameAt,
  mapIssues,
} from '../../lib/map-studio-model.js';
import { templates } from './templates.mjs';
import {mapVersions} from './map-versions.mjs';
import { validateCatalog } from './catalog.mjs';
import { startMapStudio } from './server.mjs';
import { waitForPagesDeployment } from './deployment.mjs';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
void test('P2 map versions distinguish active originals, inactive drafts and active replacements without mutation',()=>{
  const original={...map(),id:'studio-edit-taman',replaces:'taman',name:'Native Taman'},draft={...original,name:'Saved draft',objects:[object()]};
  const document={maps:[draft],builtinStates:{}},before=JSON.stringify(document);
  const builtins=[{id:'taman',name:'Taman Kota',editable:true}];
  assert.ok(mapVersions({maps:[]},builtins,[original])[0].active,'native with no saved draft remains selectable');
  let entries=mapVersions(document,builtins,[original]);
  const native=entries.find(e=>e.value==='builtin:taman'),edit=entries.find(e=>e.value===draft.id);
  assert.ok(native.active&&native.readOnly);assert.equal(native.map.name,'Native Taman');assert.equal(native.map.objects.length,0);
  assert.ok(!edit.active&&!edit.readOnly);assert.equal(edit.map.name,'Saved draft');assert.match(edit.label,/Draft nonaktif/);
  assert.equal(JSON.stringify(document),before);
  draft.enabled=true;entries=mapVersions(document,builtins,[original]);
  assert.ok(!entries.find(e=>e.kind==='native').active);
  assert.ok(entries.find(e=>e.value==='live:'+draft.id).readOnly);
  assert.ok(entries.find(e=>e.value===draft.id).active);assert.match(entries.find(e=>e.value===draft.id).label,/Edit versi aktif/);
  draft.archived=true;document.builtinStates.taman='archived';
  assert.equal(mapVersions(document,builtins,[original]).length,0);
  assert.ok(mapVersions(document,builtins,[original],true).every(e=>!e.active));
});
const object = (behavior = 'solid') => ({
  id: 'obj-test',
  name: 'Test',
  asset: null,
  x: 400,
  y: 400,
  w: 100,
  h: 100,
  rotation: 0,
  opacity: 1,
  layer: 'world',
  z: 0,
  behavior,
  slow: 0.5,
  shape: 'rect',
  points: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
  visible: true,
  locked: false,
  mirror: false,
});
const map = () => ({
  id: 'studio-test',
  name: 'Test map',
  description: '',
  width: 1800,
  height: 1200,
  enabled: false,
  terrain: null,
  icon: null,
  terrainMode: 'stretch',
  tileSize: 256,
  objects: [],
  bases: { blue: { x: 200, y: 600 }, red: { x: 1600, y: 600 } },
  prisons: {
    blue: { x: 80, y: 100, w: 240, h: 160 },
    red: { x: 1480, y: 100, w: 240, h: 160 },
  },
});
const toolCode = (
  await readFile(new URL('./editor-tools.js', import.meta.url), 'utf8')
).replace(
  "'./model.js'",
  JSON.stringify(
    new URL('../../lib/map-studio-model.js', import.meta.url).href,
  ),
);
const { polygonBounds, closestEdge, moveDummy } = await import(
  'data:text/javascript;base64,' + Buffer.from(toolCode).toString('base64')
);
void test('visual polygon builder normalizes arbitrary nodes;64 node safety and nearest edge', () => {
  const pts = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 350, y: 200 },
    { x: 280, y: 300 },
    { x: 150, y: 330 },
    { x: 100, y: 200 },
  ];
  const bounds = polygonBounds(pts);
  assert.equal(bounds.points.length, 6);
  assert.equal(bounds.x, 100);
  assert.equal(bounds.w, 250);
  assert.ok(
    bounds.points.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1),
  );
  const m = map();
  m.objects = [{ ...object(), ...bounds, shape: 'polygon' }];
  validateMap(m);
  assert.ok(contains(m.objects[0], 200, 200));
  assert.equal(closestEdge(object().points, { x: 0.5, y: 0.01 }, 300, 100), 0);
  assert.throws(() => polygonBounds(pts.slice(0, 2)));
  assert.throws(() => polygonBounds(Array(65).fill({ x: 0, y: 0 })));
  assert.throws(() =>
    polygonBounds([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]),
  );
  const o = {
    ...object(),
    shape: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ],
  };
  assert.ok(
    mapIssues({ ...m, objects: [o] }).some((i) =>
      i.message.includes('bersilangan'),
    ),
  );
});
void test('dummy traversal shares solid/parkour/slow/water/bridge and gameplay world margins', () => {
  const m = map();
  m.objects = [object()];
  const p = { x: 383, y: 450 };
  const stopped = moveDummy(m, p, 1, 0, 0.04, false);
  assert.ok(stopped.blocked);
  assert.ok(stopped.x < 387);
  m.objects[0].behavior = 'parkour';
  assert.ok(moveDummy(m, p, 1, 0, 0.04, false).blocked);
  assert.ok(moveDummy(m, p, 1, 0, 0.04, true).x > 387);
  m.objects[0].behavior = 'slow';
  assert.equal(
    moveDummy(m, { x: 450, y: 450 }, 1, 0, 0.04, false).multiplier,
    0.5,
  );
  m.objects[0].behavior = 'water';
  assert.ok(moveDummy(m, { x: 450, y: 450 }, 0, 0, 0.04, false).fallen);
  assert.ok(!moveDummy(m, { x: 450, y: 450 }, 0, 0, 0.04, true).fallen);
  m.objects.push({ ...object('bridge'), id: 'obj-bridge' });
  assert.ok(!moveDummy(m, { x: 450, y: 450 }, 0, 0, 0.04, false).fallen);
  assert.equal(moveDummy(m, { x: 34, y: 58 }, -1, -1, 0.04, false).x, 34);
});
void test('publish verification waits for correct commit/revision, never treats push or stale public build as success', async () => {
  const run = {
    head_sha: 'abc',
    path: '.github/workflows/pages.yml',
    status: 'completed',
    conclusion: 'success',
    html_url: 'https://github.com/run',
  };
  let polls = 0;
  const result = await waitForPagesDeployment({
    commit: 'abc',
    mapRevision: 'revision',
    readRuns: async () => [run],
    readPublic: async () =>
      ++polls === 1
        ? { commit: 'old', mapRevision: 'revision' }
        : { commit: 'abc', mapRevision: 'revision' },
    onProgress: () => {},
    sleep: async () => {},
    attempts: 3,
  });
  assert.equal(polls, 2);
  assert.match(result.url, /build=abc/);
  await assert.rejects(
    waitForPagesDeployment({
      commit: 'abc',
      mapRevision: 'revision',
      readRuns: async () => [{ ...run, conclusion: 'failure' }],
      readPublic: async () => null,
      onProgress: () => {},
      sleep: async () => {},
      attempts: 1,
    }),
    /failure/,
  );
  await assert.rejects(
    waitForPagesDeployment({
      commit: 'abc',
      mapRevision: 'revision',
      readRuns: async () => [],
      readPublic: async () => null,
      onProgress: () => {},
      sleep: async () => {},
      attempts: 1,
    }),
    /belum terkonfirmasi/,
  );
});
void test('schema rejects invalid numbers, duplicate IDs and unsafe paths', () => {
  assert.deepEqual(validateMap(map()), map());
  assert.throws(() => validateMap({ ...map(), width: NaN }));
  assert.throws(() => validateMap({ ...map(), objects: [object(), object()] }));
  assert.throws(() => validateDocument({ version: 1, maps: [map(), map()] }));
  assert.throws(() => validateAsset({ asset: '../secret.png' }));
  const o = { ...object(), shape: 'ellipse', rotation: 45, w: 200, h: 50 };
  assert.ok(contains(o, 500, 425));
  assert.ok(!contains(o, 400, 400));
});
void test('shared collision: solid, jumpable, bridge, hidden collider and slow', () => {
  const m = map();
  m.objects = [object()];
  assert.ok(solidAt(m, 450, 450, 13, true));
  m.objects[0].behavior = 'parkour';
  assert.ok(solidAt(m, 450, 450));
  assert.ok(!solidAt(m, 450, 450, 13, true));
  m.objects[0].visible = false;
  assert.ok(solidAt(m, 450, 450));
  m.objects[0].behavior = 'water';
  assert.ok(waterAt(m, 450, 450));
  m.objects.push({ ...object('bridge'), id: 'obj-bridge' });
  assert.ok(!waterAt(m, 450, 450));
  m.objects.push({ ...object('slow'), id: 'obj-slow' });
  assert.equal(speedAt(m, 450, 450), 0.5);
  assert.equal(speedAt(m, 700, 700), 1);
});
void test('polygon, animation speed and route validation', () => {
  assert.ok(contains({ ...object(), shape: 'polygon' }, 450, 450));
  const frames = [{ x: 0 }, { x: 1 }],
    asset = { frames, fps: 6 };
  assert.equal(frameAt(asset, 170), frames[1]);
  assert.equal(frameAt({ ...asset, fps: 12 }, 170), frames[0]);
  const m = map();
  assert.deepEqual(mapIssues(m), []);
  m.objects = [{ ...object('water'), x: 800, y: 0, w: 200, h: 1200 }];
  assert.ok(mapIssues(m).some((i) => i.message.includes('Jalur')));
  m.objects.push({
    ...object('bridge'),
    id: 'obj-bridge',
    x: 800,
    y: 500,
    w: 200,
    h: 200,
  });
  assert.deepEqual(mapIssues(m), []);
  m.objects.push({ ...object(), id: 'obj-block', x: 180, y: 580 });
  assert.ok(mapIssues(m).some((i) => i.message.includes('spawn')));
});
void test('Kampung template and library use normalized valid assets', async () => {
  const t = await templates(root);
  assert.equal(validateCatalog(t), t);
  assert.throws(
    () => validateCatalog({ template: t.template, library: t.library }),
    /Server Map Studio/,
  );
  assert.throws(
    () =>
      validateCatalog({
        ...t,
        builtinTemplates: t.builtinTemplates.filter(
          (m) => m.replaces !== 'pasar',
        ),
      }),
    /pasar/,
  );
  validateMap(t.template);
  assert.ok(t.library.length > 50);
  for (const name of ['fortRed', 'fortGreen', 'prisonFloor', 'prisonOverlay'])
    assert.ok(t.library.some((a) => a.name === name));
  assert.ok(t.builtins.every((b) => b.baseRadius > 0 && b.objectScale > 0));
  assert.ok(t.template.objects.length > 20);
  assert.deepEqual(mapIssues(t.template), []);
  t.library.forEach((a) => validateAsset(a.clip));
  assert.equal(t.template.enabled, false);
  assert.equal(t.builtins.length, 6);
  assert.equal(t.builtinTemplates.length, 5);
  t.builtinTemplates.forEach(validateMap);
  for (const m of t.builtinTemplates) {
    assert.equal(m.icon.asset, `ui-v2/fields/${m.replaces}.webp`);
    assert.equal(m.icon.frames.length, 1);
  }
  assert.ok(t.template.objects.some(o => o.asset && o.layer === 'background'), 'underlay artwork must not disappear');
  const taman = t.builtinTemplates.find(m => m.replaces === 'taman');
  assert.equal(taman.terrain.asset, 'field/taman-map.webp');
  assert.ok(t.builtins.find(b => b.id === 'taman').structuresInBackground);
  assert.ok(t.builtinTemplates.find((m) => m.replaces === 'kanal2').waterMask);
});

void test('HTTP harness exposes built-in catalog and browser guard from running server', async () => {
  const { server, origin } = await startMapStudio(0, root);
  try {
    const response = await fetch(origin + '/api/templates');
    assert.equal(response.status, 200);
    const catalog = validateCatalog(await response.json());
    assert.equal(catalog.builtinTemplates.length, 5);
    const guard = await fetch(origin + '/catalog.mjs');
    assert.equal(guard.status, 200);
    assert.match(guard.headers.get('content-type'), /javascript/);
    const editor = await (await fetch(origin + '/editor.js')).text();
    assert.match(editor, /validateCatalog\(await api\('\/api\/templates'\)\)/);
    assert.ok((await fetch(origin + '/editor-tools.js')).ok);
    assert.match(editor, /drawGameplayAssets\(now, true\)/);
    const html = await (await fetch(origin + '/')).text();
    for (const id of [
      'polygon',
      'solidArea',
      'nodes',
      'addNode',
      'deleteNode',
      'testingTools',
      'dummyStatus',
      'activationState',
      'structures',
      'chooseMapPreview',
      'mapPreviewFile',
      'iconPreview',
      'unlockIdentity',
      'cleanPreview',
    ])
      assert.ok(html.includes(`id="${id}"`));
    const nativePreview = await fetch(origin + '/ui-v2/fields/taman.webp');
    assert.equal(nativePreview.status, 200);
    assert.match(nativePreview.headers.get('content-type'), /image\/webp/);
    assert.equal((await fetch(origin + '/ui-v2/fields/not-a-map.webp')).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
void test('archive metadata and inherited water mask remain backwards compatible', () => {
  const m = {
    ...map(),
    replaces: 'kampung',
    archived: true,
    waterMask: { width: 2, height: 2, rows: [[0, 1], []] },
  };
  const doc = validateDocument({
    version: 1,
    maps: [m],
    builtinStates: { pasar: 'deleted' },
  });
  assert.equal(doc.maps[0].archived, true);
  assert.equal(doc.builtinStates.pasar, 'deleted');
  assert.ok(waterAt(m, 100, 100));
  assert.ok(!waterAt(m, 1200, 100));
  assert.throws(() =>
    validateDocument({ version: 1, maps: [m, { ...m, id: 'studio-second' }] }),
  );
  assert.throws(() =>
    validateDocument({
      version: 1,
      maps: [],
      builtinStates: Object.fromEntries(
        ['kampung', 'pasar', 'taman', 'kanal', 'kanal2', 'kampung3d'].map(
          (id) => [id, 'archived'],
        ),
      ),
    }),
  );
  assert.throws(() =>
    validateMap({
      ...m,
      waterMask: { width: 2, height: 2, rows: [[1, 0], []] },
    }),
  );
});
void test('local API upload, session guard, revision conflict and safe map merge', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'benteng-map-test-'));
  let server;
  try {
    await mkdir(path.join(dir, 'config'));
    await mkdir(path.join(dir, 'public'));
    await writeFile(
      path.join(dir, 'config/map-studio.json'),
      JSON.stringify({ version: 1, maps: [] }),
    );
    const started = await startMapStudio(0, dir);
    server = started.server;
    const origin = started.origin;
    let state = await (await fetch(origin + '/api/state')).json();
    const post = (route, data, token = state.token) =>
      fetch(origin + route, {
        method: 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify({ revision: state.revision, ...data }),
      });
    assert.equal(
      (await post('/api/save', { map: map() }, 'wrong')).status,
      403,
    );
    assert.equal(
      (await post('/api/upload', { file: { data: 'invalid!' } })).status,
      400,
    );
    const png = await sharp({
      create: { width: 64, height: 32, channels: 4, background: '#33cc55' },
    })
      .png()
      .toBuffer();
    const response = await post('/api/upload', {
      file: { data: png.toString('base64') },
    });
    assert.equal(response.status, 200);
    const { asset } = await response.json();
    validateAsset(asset);
    const m = map();
    m.objects = [{ ...object('decoration'), asset }];
    const saved = await post('/api/save', { map: m });
    assert.equal(saved.status, 200);
    const next = await saved.json();
    assert.equal((await post('/api/save', { map: m })).status, 409);
    state = { ...state, ...next };
    const second = { ...map(), id: 'studio-second', name: 'Second' };
    assert.equal((await post('/api/save', { map: second })).status, 200);
    const disk = JSON.parse(
      await readFile(path.join(dir, 'config/map-studio.json'), 'utf8'),
    );
    assert.equal(disk.maps.length, 2);
    assert.deepEqual(disk.maps[0], m);
    const backups = await readdir(path.join(dir, '.preview-admin'));
    assert.equal(backups.length, 2);
    state = {
      ...state,
      ...(await (await fetch(origin + '/api/state')).json()),
    };
    const managed = await post('/api/manage', { id: m.id, action: 'archive' });
    assert.equal(managed.status, 200);
    const archived = await managed.json();
    assert.ok(archived.document.maps[0].archived);
    assert.deepEqual(archived.document.maps[1], second);
    assert.equal(
      (await post('/api/manage', { id: m.id, action: 'delete' })).status,
      409,
    );
    state = { ...state, ...archived };
    const trash = await post('/api/manage', { id: m.id, action: 'delete' });
    state = { ...state, ...(await trash.json()) };
    assert.ok(state.document.maps[0].deleted);
    const restored = await post('/api/manage', { id: m.id, action: 'restore' });
    state = { ...state, ...(await restored.json()) };
    assert.ok(!state.document.maps[0].deleted);
    assert.equal(state.document.maps[0].enabled, false);
    const native = await post('/api/manage', {
      id: 'pasar',
      action: 'archive',
    });
    assert.equal(native.status, 200);
    state = { ...state, ...(await native.json()) };
    assert.equal(state.document.builtinStates.pasar, 'archived');
    assert.equal(
      (await post('/api/manage', { id: 'invalid', action: 'delete' })).status,
      400,
    );
    assert.ok(await readFile(path.join(dir, 'public', asset.asset)));
    state = { ...state, ...(await (await fetch(origin + '/api/state')).json()) };
    const iconUpload = await post('/api/upload', {kind: 'icon', file: {data: png.toString('base64')}});
    assert.equal(iconUpload.status, 200);
    const icon = (await iconUpload.json()).asset;
    assert.equal(icon.frames[0].width, 640); assert.equal(icon.frames[0].height, 360); assert.equal(icon.frames.length, 1);
    const original = structuredClone(state.document.maps[1]);
    const iconSave = await post('/api/save', {map: {...original, icon}});
    assert.equal(iconSave.status, 200);
    const savedIconState = await iconSave.json();
    assert.deepEqual(savedIconState.document.maps[1], {...original, icon});
    assert.deepEqual(savedIconState.document.maps[0], state.document.maps[0]);
    assert.ok((await fetch(origin + '/')).ok);
    assert.ok((await fetch(origin + '/editor.js')).ok);
  } finally {
    if (server) await new Promise((r) => server.close(r));
    assert.ok(dir.startsWith(path.join(os.tmpdir(), 'benteng-map-test-')));
    await rm(dir, { recursive: true, force: true });
  }
});
