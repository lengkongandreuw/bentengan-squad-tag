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
  if (file.pathname.endsWith('.json')) {
    const code = 'export default ' + JSON.stringify(JSON.parse(await readFile(file, 'utf8'))) + ';';
    const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
    modules.set(key, url);
    return url;
  }
  let code = ts.transpileModule(await readFile(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const imports = [...code.matchAll(/from ['"](\.[^'"]+)['"]/g)];
  for (const match of imports) {
    const dependency = new URL(match[1] + (match[1].endsWith('.json') ? '' : '.ts'), file);
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
const { progressionRules, parseProgressionRules } = await load('progression-rules');
const { getLevelFromXP, getCurrentLevelProgress, getXPRequiredForLevel,
  getXPToNextLevel, calculateMatchXP } = await load('xp-engine');

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

test('module02 loads exact specified rewards, caps, levels and complete unlock roster', () => {
  assert.deepEqual(progressionRules.xpRewards, { completeMatch: 100, win: 60, tag: 8, rescue: 15 });
  assert.deepEqual(progressionRules.xpCaps, { tagPerMatch: 64, rescuePerMatch: 60 });
  assert.deepEqual(progressionRules.playerLevelThresholds,
    [0, 200, 450, 750, 1100, 1500, 1950, 2450, 3000, 3600, 4300, 5100, 6000]);
  assert.deepEqual(progressionRules.characterUnlockRequirements.map(r => [r.characterId, r.minLevel]),
    [['raja',1],['kaka',1],['bebe',2],['ciici',3],['jago',4],['maria',5],['lala',6],
     ['lui',7],['robot',8],['buto',9],['tui',10],['boke',11],['kumis',12],['kodo',13]]);
  assert.deepEqual(progressionRules.arenaProgression, { tiers: [], unlockRequirements: [] });
});

test('module02 malformed rules fail explicitly without changing input or player data', () => {
  for (const mutate of [
    r => { r.version = 2; },
    r => { r.xpRewards.tag = -1; },
    r => { r.xpCaps.rescuePerMatch = Infinity; },
    r => { r.playerLevelThresholds[1] = 0; },
    r => { r.characterUnlockRequirements[2].characterId = 'missing'; },
    r => { r.characterUnlockRequirements[2].minLevel = 99; },
    r => { r.characterUnlockRequirements.push(r.characterUnlockRequirements[0]); },
    r => { r.initialUnlocks.characters = ['jago']; },
    r => { r.arenaProgression.tiers = null; },
  ]) {
    const input = structuredClone(progressionRules);
    mutate(input);
    const before = structuredClone(input);
    assert.throws(() => parseProgressionRules(input), /Konfigurasi progression tidak valid/);
    assert.deepEqual(input, before);
  }
});

test('module02 arena schema validates tier membership and stat prerequisites only', () => {
  const input = structuredClone(progressionRules);
  input.arenaProgression = {
    tiers: [{ id: 'test-tier', arenaIds: ['studio-test'] }],
    unlockRequirements: [{ arenaId: 'studio-test', tierId: 'test-tier', minLevel: 2,
      requiredArenaStats: [{ arenaId: 'kampung', minPlayed: 4, minWins: 2 }] }],
  };
  assert.deepEqual(parseProgressionRules(input), input);
  input.arenaProgression.unlockRequirements[0].tierId = 'missing';
  assert.throws(() => parseProgressionRules(input), /tierId/);
  input.arenaProgression.unlockRequirements[0].tierId = 'test-tier';
  input.arenaProgression.unlockRequirements[0].requiredArenaStats[0].minWins = 5;
  assert.throws(() => parseProgressionRules(input), /minWins/);
});

test('module03 specified boundaries and every configured level threshold', () => {
  for (const [xp, level] of [[0,1], [199,1], [200,2], [449,2], [450,3], [5999,12], [6000,13]])
    assert.equal(getLevelFromXP(xp), level);
  progressionRules.playerLevelThresholds.forEach((xp, i) => {
    assert.equal(getLevelFromXP(xp), i + 1);
    assert.equal(getXPRequiredForLevel(i + 1), xp);
    if (i > 0) assert.equal(getLevelFromXP(xp - 1), i);
  });
});

test('module03 progress resets at boundary, max level has no phantom next level', () => {
  assert.deepEqual(getCurrentLevelProgress(325), {
    level: 2, xp: 325, levelStartXP: 200, nextLevelXP: 450,
    xpIntoLevel: 125, xpForNextLevel: 250, xpToNextLevel: 125,
    progress: 0.5, isMaxLevel: false,
  });
  assert.equal(getCurrentLevelProgress(200).progress, 0);
  assert.equal(getXPToNextLevel(5999), 1);
  for (const xp of [6000, 7000, Number.MAX_SAFE_INTEGER]) {
    const p = getCurrentLevelProgress(xp);
    assert.equal(p.level, 13);
    assert.equal(p.xp, xp);
    assert.equal(p.nextLevelXP, null);
    assert.equal(p.xpForNextLevel, null);
    assert.equal(p.progress, 1);
    assert.equal(p.isMaxLevel, true);
    assert.equal(getXPToNextLevel(xp), 0);
  }
});

test('module03 completion/win/action rewards and independent caps', () => {
  const summary = { completed: true, result: 'loss', tags: 0, rescues: 0 };
  assert.equal(calculateMatchXP(summary), 100);
  assert.equal(calculateMatchXP({ ...summary, result: 'win' }), 160);
  assert.equal(calculateMatchXP({ ...summary, tags: 2, rescues: 1 }), 131);
  assert.equal(calculateMatchXP({ ...summary, tags: 7 }), 156);
  assert.equal(calculateMatchXP({ ...summary, tags: 8 }), 164);
  assert.equal(calculateMatchXP({ ...summary, tags: 9 }), 164);
  assert.equal(calculateMatchXP({ ...summary, rescues: 3 }), 145);
  assert.equal(calculateMatchXP({ ...summary, rescues: 4 }), 160);
  assert.equal(calculateMatchXP({ ...summary, rescues: 5 }), 160);
  assert.equal(calculateMatchXP({ ...summary, tags: 999, rescues: 999 }), 224);
  assert.equal(calculateMatchXP({ ...summary, result: 'win', tags: 999, rescues: 999 }), 284);
  assert.equal(calculateMatchXP({ ...summary, completed: false, result: 'win', tags: 999, rescues: 999 }), 0);
});

test('module03 invalid input rejected and pure helpers do not mutate data or use storage', () => {
  for (const invalid of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => getLevelFromXP(invalid));
    assert.throws(() => getCurrentLevelProgress(invalid));
    assert.throws(() => getXPToNextLevel(invalid));
    assert.throws(() => calculateMatchXP({ completed: true, result: 'win', tags: invalid, rescues: 0 }));
    assert.throws(() => calculateMatchXP({ completed: true, result: 'win', tags: 0, rescues: invalid }));
  }
  for (const level of [0, 14, -1, NaN, 2.5]) assert.throws(() => getXPRequiredForLevel(level));
  assert.throws(() => calculateMatchXP({ completed: true, result: 'draw', tags: 0, rescues: 0 }));
  const summary = Object.freeze({ completed: true, result: 'win', tags: 4, rescues: 2 });
  const before = structuredClone(progressionRules);
  globalThis.window = { get localStorage() { throw new Error('Engine must not access storage'); } };
  try {
    assert.equal(calculateMatchXP(summary), 222);
    assert.equal(calculateMatchXP(summary), 222);
    assert.equal(getLevelFromXP(450), 3);
    assert.deepEqual(progressionRules, before);
  } finally { delete globalThis.window; }
});
