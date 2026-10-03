import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Load these small TS modules using the existing TypeScript dependency;
// no browser, production build, extra packages, or user storage is needed.
const modules = new Map();
async function moduleUrl(file) {
  const key = file.href;
  if (modules.has(key)) return modules.get(key);
  let code = ts.transpileModule(await readFile(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const imports = [...code.matchAll(/from ['"](\.[^'"]+)['"]/g)];
  for (const match of imports) {
    const dependency = new URL(match[1] + '.ts', file);
    code = code.replace(match[0], `from '${await moduleUrl(dependency)}'`);
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  modules.set(key, url);
  return url;
}
const load = async name => import(await moduleUrl(new URL(`../lib/player-profile/${name}.ts`, import.meta.url)));
const { createDefaultProgression, parsePlayerProgression } = await load('progression');
const { parsePlayerProfile } = await load('migrations');
const service = await load('profile-service');
const storage = await load('storage');
const { PLAYER_PROFILE_STORAGE_KEY } = await load('defaults');

test('new profile default and independently mutable progression collections', () => {
  const profile = service.createPlayerProfile('Tester');
  assert.deepEqual(profile.progression, {
    version: 1, xp: 0, unlockedCharacters: ['raja', 'kaka'],
    unlockedArenaIds: ['kampung'], arenaStats: {}, processedMatchIds: [],
  });
  assert.equal(profile.menang, 0);
  assert.equal(profile.featuredCharacterId, 'raja');
  const first = createDefaultProgression();
  first.unlockedCharacters.push('jago');
  first.arenaStats.kampung = { played: 1, wins: 1 };
  first.processedMatchIds.push('match-1');
  assert.deepEqual(createDefaultProgression(), profile.progression);
});

test('legacy profile remains readable without migration or storage rewrite', () => {
  const legacy = service.createPlayerProfile('Veteran');
  delete legacy.progression;
  legacy.menang = 12;
  legacy.kalah = 3;
  legacy.kda = { tagMusuh: 24, masukPenjara: 6, rescueTeam: 9 };
  assert.deepEqual(parsePlayerProfile(legacy), legacy);
  const data = new Map([[PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(legacy)]]);
  let writes = 0;
  globalThis.window = {
    localStorage: { getItem: key => data.get(key), setItem: () => { writes++; } },
  };
  try {
    assert.deepEqual(storage.loadPlayerProfile(), legacy);
    assert.equal(writes, 0);
  } finally { delete globalThis.window; }
});

test('persisted progression survives profile updates without awarding XP/unlocks', () => {
  const profile = service.createPlayerProfile('Persisted');
  profile.progression.xp = 120;
  profile.progression.arenaStats['studio-custom'] = { played: 3, wins: 1 };
  profile.progression.processedMatchIds.push('existing-match');
  const expected = structuredClone(profile.progression);
  const data = new Map();
  globalThis.window = {
    localStorage: { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) },
    dispatchEvent: () => {},
  };
  try {
    storage.savePlayerProfile(profile);
    assert.deepEqual(storage.loadPlayerProfile(), profile);
    service.setFeaturedCharacter('kaka');
    const updated = service.recordCompletedMatch('win', { tagMusuh: 1, masukPenjara: 0, rescueTeam: 1 });
    assert.deepEqual(updated.progression, expected);
    assert.equal(updated.menang, 1);
    assert.equal(updated.featuredCharacterId, 'kaka');
  } finally { delete globalThis.window; }
});

test('invalid optional progression never invalidates a valid old profile', () => {
  const profile = service.createPlayerProfile('SafeUser');
  assert.equal(parsePlayerProgression({ ...profile.progression, xp: -1 }), undefined);
  assert.equal(parsePlayerProgression({ ...profile.progression, unlockedCharacters: ['missing'] }), undefined);
  const parsed = parsePlayerProfile({ ...profile, progression: null });
  assert.equal(parsed.id, profile.id);
  assert.equal(parsed.progression, undefined);
});
