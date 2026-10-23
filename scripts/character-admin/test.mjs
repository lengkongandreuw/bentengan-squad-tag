import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import ts from 'typescript';
import path from 'node:path';
import sharp from 'sharp';
import { startAdmin, inspectImage, inspectVoice } from './server.mjs';
import { previewDefaults, previewStyle, validatePreviewDocument } from '../../lib/selection-preview-model.js';

void test('selection readiness cache deduplicates loads, gates readiness and permits retry', async () => {
  const source = await readFile(new URL('../../lib/selection-preview-assets.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  let finish, rejectLoad, calls = 0;
  const exports = {};
  vm.runInNewContext(compiled, { exports, Image: class { src = ''; }, require: name => {
    if (name.includes('selection-previews.json')) return { characters: {} };
    if (name.includes('selection-preview-model')) return { previewEntry: () => ({ static: null, animated: null }) };
    if (name === './characters.ts' || name === './characters') return { publicAsset: file => `/base/${file}` };
    if (name === './asset-ready.ts' || name === './asset-ready') return { imageReady: () => { calls++; return new Promise((resolve, reject) => { finish = resolve; rejectLoad = reject; }); } };
    throw new Error(name);
  } });
  const first = exports.loadSelectionPreview('/test.gif');
  assert.equal(exports.loadSelectionPreview('/test.gif'), first);
  assert.equal(exports.selectionPreviewReady('/test.gif'), false);
  finish(); await first;
  assert.equal(exports.selectionPreviewReady('/test.gif'), true);
  await exports.loadSelectionPreview('/test.gif'); assert.equal(calls, 1);
  const broken = exports.loadSelectionPreview('/retry.gif');
  rejectLoad(new Error('offline')); await assert.rejects(() => broken);
  assert.equal(exports.selectionPreviewReady('/retry.gif'), false);
  const retry = exports.loadSelectionPreview('/retry.gif'); finish(); await retry;
  assert.equal(exports.selectionPreviewReady('/retry.gif'), true);
});

void test('presentation contract retains proportions and rejects untrusted paths / values', () => {
  assert.equal(previewDefaults('kodo').scale, 1.17);
  assert.equal(previewStyle({ x: 4, y: -5, scale: 1.2 }).transform, 'translate(4%, -5%) scale(1.2)');
  for (const invalid of [{ x: 99 }, { scale: '2' }, { animated: '../secret.png' }, { static: 'https://evil/image.png' }, { voice: '../secret.mp3' }, { voice: `selection-previews/raja/${'a'.repeat(64)}.mp3` }])
    assert.throws(() => validatePreviewDocument({ version: 1, characters: { ciici: invalid } }, ['ciici']));
  assert.throws(() => validatePreviewDocument({ version: 2, characters: {} }, ['ciici']));
});

void test('voice replacement persists independently, rejects fake audio and restores defaults without deleting assets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'benteng-preview-test-'));
  await mkdir(path.join(root, 'config'));
  await writeFile(path.join(root, 'config/game-rules.json'), JSON.stringify({ teams: { green: { roster: ['ciici', 'bebe'] } } }));
  const original = { version: 1, characters: { ciici: { ...previewDefaults('ciici'), x: 7 }, bebe: previewDefaults('bebe') } };
  await writeFile(path.join(root, 'config/selection-previews.json'), JSON.stringify(original));
  const bytes = await readFile(new URL('../../public/ui-v2/audio/characters/ciici.mp3', import.meta.url));
  assert.equal(inspectVoice(bytes), 'mp3');
  assert.throws(() => inspectVoice(Buffer.from('ID3not actually MP3')));
  assert.throws(() => inspectVoice(Buffer.alloc(11 * 1024 * 1024)));
  const { server, origin } = await startAdmin(0, root);
  try {
    const initial = await (await fetch(`${origin}/api/state`)).json();
    assert.equal(initial.capabilities.voiceUploads, 1);
    const post = data => fetch(`${origin}/api/save`, { method: 'POST', headers: {
      Origin: origin, 'Content-Type': 'application/json', 'X-Admin-Token': initial.token }, body: JSON.stringify(data) });
    const data = { revision: initial.revision, id: 'ciici', entry: original.characters.ciici };
    assert.equal((await post({ ...data, uploads: { voice: Buffer.from('<svg/>').toString('base64') } })).status, 400);
    const response = await post({ ...data, uploads: { voice: bytes.toString('base64') } });
    assert.equal(response.status, 200, await response.clone().text());
    const saved = await response.json(), voice = saved.document.characters.ciici.voice;
    assert.match(voice, /^selection-previews\/ciici\/[a-f0-9]{64}\.mp3$/);
    assert.equal(saved.document.characters.ciici.x, 7);
    assert.deepEqual(saved.document.characters.bebe, original.characters.bebe);
    const audio = await fetch(`${origin}/${voice}`);
    assert.equal(audio.headers.get('content-type'), 'audio/mpeg');
    assert.deepEqual(Buffer.from(await audio.arrayBuffer()), bytes);
    assert.equal((await post(data)).status, 409);
    // A pre-feature image-only client must not silently erase the voice.
    const legacyEntry = { ...saved.document.characters.ciici }; delete legacyEntry.voice;
    const legacy = await post({ ...data, revision: saved.revision, entry: legacyEntry });
    assert.equal(legacy.status, 200);
    const preserved = await legacy.json(); assert.equal(preserved.document.characters.ciici.voice, voice);
    const layer = { file: null, volume: .3, loop: false, enabled: true };
    const withLayers = await post({ ...data, revision: preserved.revision,
      entry: { ...preserved.document.characters.ciici, voiceLayers: [layer, { ...layer, volume: .1, loop: true }] }, uploads: { voiceLayers: [bytes.toString('base64'), bytes.toString('base64')] } });
    assert.equal(withLayers.status, 200);
    const layered = await withLayers.json();
    assert.deepEqual(layered.document.characters.ciici.voiceLayers, [{ ...layer, file: voice }, { ...layer, file: voice, volume: .1, loop: true }]);
    for (const badLayers of [[{ ...layer, volume: 2 }], Array(5).fill({ ...layer, file: voice }), [layer]]) {
      assert.equal((await post({ ...data, revision: layered.revision, entry: { ...legacyEntry, voiceLayers: badLayers } })).status, 400);
    }
    const oldSingleVoiceEntry = { ...legacyEntry }; delete oldSingleVoiceEntry.voiceLayers;
    const preservedLayers = await post({ ...data, revision: layered.revision, entry: oldSingleVoiceEntry });
    assert.equal(preservedLayers.status, 200);
    const afterLegacy = await preservedLayers.json();
    assert.deepEqual(afterLegacy.document.characters.ciici.voiceLayers, layered.document.characters.ciici.voiceLayers);
    const restored = await post({ ...data, revision: afterLegacy.revision, entry: { ...legacyEntry, voice: null, voiceLayers: [] } });
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).document.characters.ciici.voice, null);
    assert.deepEqual(await readFile(path.join(root, 'public', voice)), bytes);
  } finally {
    await new Promise(resolve => server.close(resolve));
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'benteng-preview-test-')));
    await rm(root, { recursive: true });
  }
});

void test('local server isolates assets, checks session, validates upload and protects concurrent edits', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'benteng-preview-test-'));
  await mkdir(path.join(root, 'config'));
  await writeFile(path.join(root, 'config/game-rules.json'), JSON.stringify({ teams: { green: { roster: ['ciici'] } } }));
  await writeFile(path.join(root, 'config/selection-previews.json'), JSON.stringify({ version: 1, characters: {} }));
  const { server, origin } = await startAdmin(0, root);
  try {
    const initial = await (await fetch(`${origin}/api/state`)).json();
    const post = (data, headers = {}) => fetch(`${origin}/api/save`, { method: 'POST', headers: {
      Origin: origin, 'Content-Type': 'application/json', 'X-Admin-Token': initial.token, ...headers }, body: JSON.stringify(data) });
    assert.equal((await fetch(`${origin}/api/state`, { headers: { Origin: 'https://evil.test' } })).status, 403);
    const hostStatus = await new Promise((resolve, reject) => {
      http.get(`${origin}/api/state`, { headers: { Host: 'evil.test' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    });
    assert.equal(hostStatus, 403);
    assert.equal((await fetch(`${origin}/.git/config`)).status, 404);
    assert.equal((await post({}, { 'X-Admin-Token': 'bad' })).status, 403);
    const data = { revision: initial.revision, id: 'ciici', entry: { ...previewDefaults('ciici'), x: 5, y: -4, scale: 1.1 } };
    assert.equal((await post({ ...data, entry: { ...data.entry, scale: 9 } })).status, 400);
    assert.equal((await post({ ...data, uploads: { animated: Buffer.from('<svg/>').toString('base64') } })).status, 400);
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff0000' } }).png().toBuffer();
    const result = await post({ ...data, uploads: { static: bytes.toString('base64') } });
    assert.equal(result.status, 200, await result.clone().text());
    const saved = await result.json();
    assert.equal(saved.document.characters.ciici.x, 5);
    assert.match(saved.document.characters.ciici.static, /^selection-previews\/ciici\/[a-f0-9]{64}\.png$/);
    const asset = await fetch(`${origin}/${saved.document.characters.ciici.static}`);
    assert.equal(asset.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await asset.arrayBuffer()), bytes);
    assert.equal((await post(data)).status, 409);
    assert.equal((await readdir(path.join(root, '.preview-admin'))).length, 1);
    assert.equal(JSON.parse(await readFile(path.join(root, 'config/selection-previews.json'))).characters.ciici.scale, 1.1);
    const logoResponse = await fetch(`${origin}/api/logo`, { method: 'POST', headers: {
      Origin: origin, 'Content-Type': 'application/json', 'X-Admin-Token': initial.token },
      body: JSON.stringify({ revision: saved.revision, upload: bytes.toString('base64') }) });
    assert.equal(logoResponse.status, 200);
    const logoSaved = await logoResponse.json();
    assert.match(logoSaved.document.branding.logo, /^selection-previews\/brand\/[a-f0-9]{64}\.png$/);
    assert.deepEqual(logoSaved.document.characters, saved.document.characters);
    // Character edits must not discard branding, and old tabs cannot overwrite it.
    const afterLogo = await post({ ...data, revision: logoSaved.revision });
    assert.equal(afterLogo.status, 200);
    assert.deepEqual((await afterLogo.json()).document.branding, logoSaved.document.branding);
    await assert.rejects(() => inspectImage(Buffer.from('bad'), 'animated'));
    await assert.rejects(() => inspectImage(Buffer.alloc(21 * 1024 * 1024), 'animated'));
  } finally {
    await new Promise(resolve => server.close(resolve));
    // Only remove the exact fresh temporary test directory owned by this test.
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'benteng-preview-test-')));
    await rm(root, { recursive: true });
  }
});
