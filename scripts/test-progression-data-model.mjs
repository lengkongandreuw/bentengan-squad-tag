import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const imports = [...code.matchAll(/from ['"]([^'"]+)['"]/g)];
  for (const match of imports) {
    const dependency = match[1].startsWith('.')
      ? await moduleUrl([new URL(match[1] + '.ts', file), new URL(match[1] + '.tsx', file), new URL(match[1], file)]
        .find(candidate => existsSync(candidate)))
      : import.meta.resolve(match[1]);
    code = code.replace(match[0], `from '${dependency}'`);
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  modules.set(key, url);
  return url;
}
const load = async name => import(await moduleUrl(new URL(`../lib/player-profile/${name}.ts`, import.meta.url)));
const { fieldCycleDecision } = await import(await moduleUrl(new URL('../modules/game-core/match-control.ts', import.meta.url)));
const { getArenaSelectionProgress } = await load('arena-selection-progress');
const { MatchProgressionSummary } = await import(await moduleUrl(new URL('../modules/ui/match-progression-summary.tsx', import.meta.url)));
const { UnlockNotificationPanel } = await import(await moduleUrl(new URL('../modules/ui/unlock-notification-panel.tsx', import.meta.url)));
const { getNewUnlockNotices } = await load('unlock-notifications');
const { createDefaultProgression, parsePlayerProgression } = await load('progression');
const { parsePlayerProfile } = await load('migrations');
const service = await load('profile-service');
const storage = await load('storage');
const { PLAYER_PROFILE_STORAGE_KEY } = await load('defaults');
const { progressionRules, parseProgressionRules } = await load('progression-rules');
const { getLevelFromXP, getCurrentLevelProgress, getXPRequiredForLevel,
  getXPToNextLevel, calculateMatchXP } = await load('xp-engine');
const { isCharacterUnlocked, getCharacterUnlockRequirement,
  getCharacterUnlockProgress, resolveCharacterUnlocks } = await load('character-unlocks');
const { getArenaStats, applyArenaMatchStat } = await load('arena-stats');
const { isArenaUnlocked, getArenaUnlockProgress, resolveArenaUnlocks } = await load('arena-unlocks');
const { getProgressionArenaId } = await load('arena-identity');
const { applyMatchProgression } = await load('match-progression');
const { MAX_PROCESSED_MATCH_IDS, createMatchId } = await load('match-identity');
const { migratePlayerProgression, estimateHistoricalXP } = await load('progression-migration');
const { getPlayableCharacterIds, getPlayableArenaIds, pickUnlockedCharacter,
  validatePlayableContent, resolvePlayableContent, getCharacterSelectionState } = await load('content-gates');

void test('edited built-in arenas inherit original unlock requirements and runtime gates', async () => {
  const maps = JSON.parse(await readFile(new URL('../config/map-studio.json', import.meta.url))).maps;
  const replacements = maps.filter(map => map.replaces);
  assert.ok(replacements.length >= 5);
  const profile = service.createPlayerProfile('MapUnlock');
  for (const map of replacements) {
    assert.equal(getProgressionArenaId(map.id), map.replaces);
    const original = getArenaUnlockProgress(profile, map.replaces);
    const edited = getArenaUnlockProgress(profile, map.id);
    assert.deepEqual(edited.requirement, original.requirement);
    assert.deepEqual(edited.checks, original.checks);
    assert.equal(edited.unlocked, original.unlocked);
    profile.progression.unlockedArenaIds.push(map.replaces);
    assert.equal(isArenaUnlocked(profile, map.id), true);
    assert.equal(validatePlayableContent(profile, 'raja', map.id, ['raja'], [map.id]), null);
    assert.ok(getPlayableArenaIds(profile, [map.id]).includes(map.id));
  }
  assert.equal(isArenaUnlocked(profile, 'studio-unconfigured-new'), false);
});

void test('edited arena wins count toward original tiers; historical alias stats merge once without mutation', () => {
  const profile = service.createPlayerProfile('MapStats');
  profile.progression.arenaStats.kampung = {played: 2, wins: 1};
  profile.progression.arenaStats['studio-edit-kampung'] = {played: 3, wins: 2};
  const before = structuredClone(profile);
  assert.deepEqual(getArenaStats(profile, 'kampung'), {played: 5, wins: 3});
  assert.deepEqual(getArenaStats(profile, 'studio-edit-kampung'), {played: 5, wins: 3});
  assert.deepEqual(profile, before);
  const result = applyMatchProgression(profile, {matchId: 'edited-arena-match', arenaId: 'studio-edit-kampung',
    won: true, completed: true, tags: 0, rescues: 0});
  assert.deepEqual(getArenaStats(result.profile, 'kampung'), {played: 6, wins: 4});
  assert.deepEqual(getArenaStats(result.profile, 'studio-edit-kampung'), {played: 6, wins: 4});
  assert.equal(Object.hasOwn(result.profile.progression.arenaStats, 'studio-edit-kampung'), false);
  assert.deepEqual(profile, before);
  const duplicate = applyMatchProgression(result.profile, {matchId: 'edited-arena-match', arenaId: 'studio-edit-kampung',
    won: true, completed: true, tags: 0, rescues: 0});
  assert.equal(duplicate.reason, 'duplicate');
  assert.deepEqual(getArenaStats(duplicate.profile, 'kampung'), {played: 6, wins: 4});
  result.profile.progression.xp = 200;
  assert.equal(isArenaUnlocked(result.profile, 'pasar'), true);
});

void test('module15 full persisted player journey reaches all characters/arenas with exactly-once rewards', () => {
  const data = new Map(); let writes = 0;
  globalThis.window = { localStorage: { getItem: key => data.get(key), setItem: (key, value) => {
    writes++; data.set(key, value);
  } }, dispatchEvent: () => {} };
  try {
    let p = service.createPlayerProfile('Journey15');
    assert.equal(p.progression.xp, 0); assert.equal(getLevelFromXP(p.progression.xp), 1);
    assert.deepEqual(p.progression.unlockedCharacters, ['raja', 'kaka']);
    assert.deepEqual(p.progression.unlockedArenaIds, ['kampung']);
    const catalog = progressionRules.arenaProgression.tiers.flatMap(t => t.arenaIds);
    const allCharacters = progressionRules.characterUnlockRequirements.map(r => r.characterId);
    let matches = 0; const counts = new Map();
    const play = arenaId => {
      assert.equal(isArenaUnlocked(p, arenaId), true);
      const summary = { matchId: `journey-${++matches}`, arenaId, completed: true, won: true,
        tags: 4, rescues: 1, timesCaptured: 2 };
      const result = service.recordMatchProgression(summary);
      assert.equal(result.applied, true); assert.equal(result.xpEarned, 207);
      assert.equal(result.currentXP, matches * 207);
      assert.equal(result.currentLevel, getLevelFromXP(result.currentXP));
      assert.equal(result.xpEarned, Object.values(result.xpBreakdown).reduce((a,b) => a+b, 0));
      p = storage.loadPlayerProfile(); // Simulate reload after each saved reward.
      assert.deepEqual(p, result.profile);
      counts.set(arenaId, (counts.get(arenaId) ?? 0) + 1);
      assert.equal(p.menang, matches); assert.equal(p.kalah, 0);
      assert.deepEqual(p.kda, { tagMusuh: matches * 4, rescueTeam: matches, masukPenjara: matches * 2 });
      for (const [id, count] of counts) assert.deepEqual(getArenaStats(p, id), { played: count, wins: count });
      const before = writes;
      const duplicate = service.recordMatchProgression(summary);
      assert.equal(duplicate.reason, 'duplicate'); assert.equal(duplicate.xpEarned, 0);
      assert.deepEqual(getNewUnlockNotices(duplicate, []), []); assert.equal(writes, before);
      // Opening/rerendering the result and notices cannot persist another reward.
      renderToStaticMarkup(createElement(MatchProgressionSummary, { result }));
      renderToStaticMarkup(createElement(UnlockNotificationPanel, { result, arenas: [], dismissed: false, onDismiss: () => {} }));
      assert.equal(writes, before);
      return result;
    };
    const first = play('kampung');
    assert.deepEqual(first.newlyUnlockedCharacters, ['bebe']);
    assert.deepEqual(first.newlyUnlockedArenaIds, ['pasar']);
    for (const [arenaId, wins, next] of [
      ['pasar', 3, 'taman'], ['taman', 4, 'kanal'], ['kanal', 5, 'kanal2'],
      ['kanal2', 7, 'studio-kampung-2420b8cf'],
    ]) {
      assert.equal(isArenaUnlocked(p, next), false);
      for (let i = 0; i < wins; i++) {
        const result = play(arenaId);
        assert.equal(result.newlyUnlockedArenaIds.includes(next), i === wins - 1);
      }
      assert.ok(p.progression.unlockedArenaIds.includes(next));
    }
    while (getLevelFromXP(p.progression.xp) < 13) play('studio-kampung-2420b8cf');
    assert.deepEqual(new Set(p.progression.unlockedCharacters), new Set(allCharacters));
    assert.deepEqual(new Set(p.progression.unlockedArenaIds), new Set(catalog));
    assert.equal(writes, matches + 1);
    const before = writes;
    const incomplete = service.recordMatchProgression({ matchId: 'abandoned', arenaId: 'kampung',
      completed: false, won: false, tags: 2, rescues: 1 });
    assert.equal(incomplete.applied, false); assert.equal(writes, before);
    assert.deepEqual(storage.loadPlayerProfile(), p);
    // Reload alone has no event/result to notify; unlocks are durable.
    assert.deepEqual(getNewUnlockNotices(null, []), []);
    assert.equal(migratePlayerProgression(p).migrated, false);
  } finally { delete globalThis.window; }
});

void test('module15 rotation uses only unlocked catalog entries and preserves three-match/rematch cycle', () => {
  const p = service.createPlayerProfile('Rotate15');
  const catalog = ['kampung', 'pasar', 'taman'];
  const available = getPlayableArenaIds(p, catalog);
  assert.deepEqual(fieldCycleDecision('kampung', 2, available), { fieldId: 'kampung', wins: 2, rotated: false });
  assert.deepEqual(fieldCycleDecision('kampung', 3, available), { fieldId: 'kampung', wins: 0, rotated: true });
  const earned = applyMatchProgression(p, { matchId: 'rotation-win', arenaId: 'kampung', completed: true,
    won: true, tags: 8, rescues: 4 }).profile;
  const unlocked = getPlayableArenaIds(earned, catalog);
  assert.deepEqual(unlocked, ['kampung', 'pasar']);
  assert.deepEqual(fieldCycleDecision('kampung', 3, unlocked), { fieldId: 'pasar', wins: 0, rotated: true });
  assert.equal(fieldCycleDecision('pasar', 3, unlocked).fieldId, 'kampung');
  assert.equal(validatePlayableContent(earned, 'bebe', 'pasar', ['raja', 'bebe'], catalog), null);
  assert.ok(validatePlayableContent(earned, 'jago', 'pasar', ['raja', 'jago'], catalog));
  assert.ok(validatePlayableContent(earned, 'raja', 'taman', ['raja'], catalog));
  for (const value of [0, 0.2, 0.5, 0.99])
    assert.ok(['raja', 'bebe'].includes(pickUnlockedCharacter(earned, ['raja', 'jago', 'bebe'], () => value)));
});

void test('module15 runtime wiring uses one writer, stable match identity and unrestricted bot lineup', async () => {
  const code = await readFile(new URL('../app/prototype.tsx', import.meta.url), 'utf8');
  assert.equal((code.match(/recordMatchProgression\(\{/g) ?? []).length, 1);
  assert.doesNotMatch(code, /recordCompletedMatch/);
  assert.match(code, /const matchId = mode === 'playing' \? network\?`\$\{network\.read\(\)\.roomCode\}:match`:createMatchId\(\) : null/);
  assert.ok(code.includes('matchId && !network'), 'online MVP cannot award solo progression');
  assert.match(code, /\[mode, run, selected, selectedFaction, selectedFieldId, selectedId,networkSession\]/);
  const lineup = code.slice(code.indexOf('const lineupFor ='), code.indexOf('const RAW_FIELD_CONFIGS'));
  assert.doesNotMatch(lineup, /getPlayable|isCharacterUnlocked|playerProfile/);
  assert.match(lineup, /roster\.slice\(0, GAME_RULES.matchSize\)/);
  assert.match(code, /const userRoster = lineupFor\(faction, selectedId\)/);
  assert.match(code, /const opponentRoster = lineupFor\(opponentFaction\)/);
  assert.match(code, /setMatchProgressionResult\(null\)/);
  assert.match(code, /setUnlockNoticeDismissed\(false\)/);
  assert.match(code, /onDismiss=\{\(\) => setUnlockNoticeDismissed\(true\)\}/);
});

void test('module14 one nonblocking panel renders multiple unlocks and dismissal/duplicates never award or replay', () => {
  const p = service.createPlayerProfile('UnlockNotice'); p.progression.xp = 180;
  const summary = { matchId: 'unlock-event', arenaId: 'kampung', completed: true, won: true, tags: 0, rescues: 0 };
  const result = applyMatchProgression(p, summary);
  const arenas = [{ id: 'pasar', name: 'Pasar Senggol' }];
  assert.deepEqual(getNewUnlockNotices(result, arenas), [
    { kind: 'character', id: 'bebe', name: 'Bebe' },
    { kind: 'arena', id: 'pasar', name: 'Pasar Senggol' },
  ]);
  const before = JSON.stringify(result);
  const props = { result, arenas, dismissed: false, onDismiss: () => {} };
  const markup = renderToStaticMarkup(createElement(UnlockNotificationPanel, props));
  assert.match(markup, /NEW CHARACTER/); assert.match(markup, /Bebe/);
  assert.match(markup, /NEW ARENA/); assert.match(markup, /Pasar Senggol/);
  assert.equal((markup.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.doesNotMatch(markup, /role="dialog"|aria-modal/);
  assert.equal(renderToStaticMarkup(createElement(UnlockNotificationPanel, { ...props, dismissed: true })), '');
  assert.equal(JSON.stringify(result), before);
  assert.deepEqual(getNewUnlockNotices(null, arenas), []);
  const duplicate = applyMatchProgression(result.profile, summary);
  assert.deepEqual(getNewUnlockNotices(duplicate, arenas), []);
  assert.equal(renderToStaticMarkup(createElement(UnlockNotificationPanel, { ...props, result: duplicate })), '');
  const replayed = { ...result, applied: false }; // Never trust unlock arrays on unapplied results.
  assert.deepEqual(getNewUnlockNotices(replayed, arenas), []);
  const repeated = { ...result, newlyUnlockedCharacters: ['bebe', 'bebe'], newlyUnlockedArenaIds: ['pasar', 'pasar', 'custom'] };
  assert.equal(getNewUnlockNotices(repeated, arenas).length, 3);
  assert.equal(getNewUnlockNotices(repeated, arenas).at(-1).name, 'custom');
  const many = { ...result,
    newlyUnlockedCharacters: progressionRules.characterUnlockRequirements.map(entry => entry.characterId),
    newlyUnlockedArenaIds: progressionRules.arenaProgression.tiers.flatMap(entry => entry.arenaIds) };
  const manyMarkup = renderToStaticMarkup(createElement(UnlockNotificationPanel, { ...props, result: many }));
  assert.equal((manyMarkup.match(/<li>/g) ?? []).length, 20);
  assert.equal((manyMarkup.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.doesNotMatch(manyMarkup, /role="dialog"|aria-modal/);
});

void test('module13 resolver snapshots capped breakdown, level, next goal and no-op rewards', () => {
  const p = service.createPlayerProfile('ResultUI'); p.progression.xp = 398;
  const summary = { matchId: 'result-ui', arenaId: 'kampung', completed: true, won: true, tags: 4, rescues: 2 };
  const result = applyMatchProgression(p, summary);
  assert.deepEqual(result.xpBreakdown, { match: 100, victory: 60, tag: 32, rescue: 30 });
  assert.equal(result.xpEarned, 222); assert.equal(result.currentXP, 620);
  assert.equal(result.currentLevel, 3); assert.equal(result.levelProgress.nextLevelXP, 750);
  assert.equal(result.nextCharacter.characterId, 'jago'); assert.equal(result.nextCharacter.xpRemaining, 130);
  const snapshot = JSON.stringify(result);
  const markup = renderToStaticMarkup(createElement(MatchProgressionSummary, { result }));
  assert.match(markup, /222 TOTAL XP/); assert.match(markup, /LEVEL 3/);
  assert.match(markup, /620.*750/); assert.match(markup, /Jago/); assert.match(markup, /130 XP to go/);
  assert.equal(renderToStaticMarkup(createElement(MatchProgressionSummary, { result })), markup);
  assert.equal(JSON.stringify(result), snapshot);
  const duplicate = applyMatchProgression(result.profile, summary);
  assert.equal(duplicate.xpEarned, 0); assert.deepEqual(Object.values(duplicate.xpBreakdown), [0, 0, 0, 0]);
  const capped = applyMatchProgression(p, { ...summary, tags: 100, rescues: 100 });
  assert.deepEqual(capped.xpBreakdown, { match: 100, victory: 60, tag: 64, rescue: 60 });
  p.progression.xp = 6000;
  const max = applyMatchProgression(p, { ...summary, won: false });
  assert.equal(max.levelProgress.isMaxLevel, true); assert.equal(max.nextCharacter, null);
  assert.equal(max.xpBreakdown.victory, 0);
  const incomplete = applyMatchProgression(p, { ...summary, completed: false });
  assert.equal(incomplete.xpEarned, 0); assert.equal(p.progression.xp, 6000);
});

void test('module12 arena requirements show accurate counters and metadata without changing profile', () => {
  const p = service.createPlayerProfile('ArenaUI');
  p.progression.xp = 450;
  p.progression.arenaStats.pasar = { played: 3, wins: 2 };
  p.kda.tagMusuh = 8; p.kda.rescueTeam = 1;
  const before = JSON.stringify(p);
  const result = getArenaSelectionProgress(p, 'taman', [{ id: 'pasar', name: 'Pasar Senggol' }]);
  assert.equal(result.unlocked, false);
  assert.deepEqual(result.checks.map(c => [c.current, c.required, c.met]),
    [[3, 3, true], [8, 8, true], [1, 2, false], [2, 3, false]]);
  assert.equal(result.checks.at(-1).label, 'Menang di Pasar Senggol');
  assert.equal(JSON.stringify(p), before);
  p.progression.unlockedArenaIds.push('taman');
  assert.equal(getArenaSelectionProgress(p, 'taman', []).unlocked, true);
  assert.equal(getArenaSelectionProgress(p, 'unknown', []).configured, false);
});

void test('module11 character selection selector exposes required level and preserves historical unlocked state', () => {
  const p = service.createPlayerProfile('LockUI');
  assert.deepEqual(getCharacterSelectionState(p, 'jago'), { locked: true, requiredLevel: 4, xpRemaining: 750 });
  assert.deepEqual(getCharacterSelectionState(p, 'raja'), { locked: false, requiredLevel: 1, xpRemaining: 0 });
  p.progression.xp = 620;
  assert.equal(getCharacterSelectionState(p, 'jago').xpRemaining, 130);
  assert.equal(getCharacterSelectionState(p, 'jago').locked, true);
  p.progression.xp = 750;
  assert.equal(getCharacterSelectionState(p, 'jago').locked, false);
  p.progression.xp = 0; p.progression.unlockedCharacters.push('jago');
  assert.equal(getCharacterSelectionState(p, 'jago').locked, false);
  assert.equal(getCharacterSelectionState(null, 'jago').locked, true);
});

void test('module10 runtime gates reject locked/unknown/faction mismatch and absent profiles', () => {
  const p = service.createPlayerProfile('RuntimeGate');
  const red = ['raja', 'robot', 'jago', 'lala', 'kumis', 'tui', 'bebe'];
  const green = ['ciici', 'kaka', 'buto', 'maria', 'boke', 'lui', 'kodo'];
  const arenas = ['kampung', 'pasar', 'taman', 'kanal', 'kanal2', 'studio-kampung-2420b8cf'];
  assert.equal(validatePlayableContent(p, 'raja', 'kampung', red, arenas), null);
  assert.equal(validatePlayableContent(p, 'kaka', 'kampung', green, arenas), null);
  for (const [id, arena, roster, profile] of [
    ['jago','kampung',red,p], ['kaka','kampung',red,p], ['raja','pasar',red,p],
    ['unknown','kampung',red,p], ['raja','unknown',red,p], ['raja','kampung',red,null],
  ]) assert.ok(validatePlayableContent(profile, id, arena, roster, arenas));
  assert.deepEqual(resolvePlayableContent(p, 'jago', 'pasar', red, arenas), { characterId: 'raja', arenaId: 'kampung' });
  assert.equal(resolvePlayableContent(p, 'raja', 'kampung', red, ['pasar']), null);
  assert.equal(resolvePlayableContent(null, 'raja', 'kampung', red, arenas), null);
  assert.equal(pickUnlockedCharacter(p, red, () => 0.99), 'raja');
  assert.deepEqual(getPlayableCharacterIds(p, green), ['kaka']);
  assert.deepEqual(getPlayableArenaIds(p, arenas), ['kampung']);
  assert.equal(green.length, 7); assert.equal(red.length, 7); // No bot roster mutation.
  p.progression.xp = 200;
  p.progression.arenaStats.kampung = { played: 1, wins: 1 };
  assert.deepEqual(getPlayableArenaIds(p, arenas), ['kampung', 'pasar']);
  assert.deepEqual(getPlayableCharacterIds(p, red), ['raja', 'bebe']);
  assert.equal(pickUnlockedCharacter(p, red, () => 0.99), 'bebe');
});

void test('module09 new profile does not migrate; zero/active legacy retain identity and historical progress', () => {
  const fresh = service.createPlayerProfile('Migration');
  assert.equal(migratePlayerProgression(fresh).migrated, false);
  const zero = { ...fresh }; delete zero.progression;
  const before = structuredClone(zero);
  const migrated = migratePlayerProgression(zero, undefined, '2026-10-03T00:00:00.000Z');
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.profile.progression.xp, 0);
  assert.deepEqual(migrated.profile.progression.unlockedCharacters, ['raja', 'kaka']);
  assert.deepEqual(migrated.profile.progression.unlockedArenaIds, ['kampung']);
  assert.deepEqual(zero, before);
  assert.equal(migratePlayerProgression(migrated.profile).migrated, false);
  const active = { ...zero, menang: 10, kalah: 5, kda: { tagMusuh: 20, masukPenjara: 9, rescueTeam: 8 }, legacyExtra: 'preserve-me' };
  const result = migratePlayerProgression(active).profile;
  assert.equal(result.progression.xp, 2380);
  assert.equal(getLevelFromXP(result.progression.xp), 7);
  assert.ok(result.progression.unlockedCharacters.includes('lui'));
  assert.deepEqual(result.progression.unlockedArenaIds, ['kampung']); // Cannot infer per-arena wins.
  const { progression: _progression, ...oldFields } = result;
  assert.deepEqual(oldFields, active);
  assert.deepEqual(parsePlayerProfile(result), result);
});

void test('module09 high history saturates safely; outdated/partial optional data salvaged per field', () => {
  const p = service.createPlayerProfile('HighHistory');
  delete p.progression;
  const high = { ...p, menang: Number.MAX_SAFE_INTEGER, kalah: Number.MAX_SAFE_INTEGER };
  assert.equal(estimateHistoricalXP(high), Number.MAX_SAFE_INTEGER);
  assert.equal(getLevelFromXP(migratePlayerProgression(high).profile.progression.xp), 13);
  const old = { version: 0, xp: 6000, unlockedCharacters: ['kodo', 'unknown'],
    unlockedArenaIds: ['studio-old-unlock'], arenaStats: {
      kampung: { played: 5, wins: 2 }, pasar: { played: 3, wins: 3 }, bad: { played: 1, wins: 9 },
    }, processedMatchIds: ['old-match'], migrationCompletedAt: 'broken' };
  const before = structuredClone(old);
  const migrated = migratePlayerProgression({ ...p, kda: { tagMusuh: 8, masukPenjara: 0, rescueTeam: 2 } }, old).profile;
  assert.equal(migrated.progression.version, 1);
  assert.ok(migrated.progression.unlockedCharacters.includes('kodo'));
  assert.ok(!migrated.progression.unlockedCharacters.includes('unknown'));
  assert.ok(migrated.progression.unlockedArenaIds.includes('studio-old-unlock'));
  assert.ok(migrated.progression.unlockedArenaIds.includes('pasar'));
  assert.ok(migrated.progression.unlockedArenaIds.includes('taman'));
  assert.equal(Object.hasOwn(migrated.progression.arenaStats, 'bad'), false);
  assert.deepEqual(migrated.progression.processedMatchIds, ['old-match']);
  assert.deepEqual(old, before);
  assert.deepEqual(parsePlayerProfile(migrated), migrated);
  const malformedCurrent = { ...old, version: 1, xp: -10 };
  assert.equal(migratePlayerProgression(p, malformedCurrent).migrated, true);
  const future = { ...migrated, progression: { ...migrated.progression, version: 2 } };
  assert.equal(migratePlayerProgression(future).profile, future);
});

void test('module09 storage migration saves once, reload retains all fields and failed writes never erase legacy', () => {
  const legacy = service.createPlayerProfile('LegacyLoad');
  delete legacy.progression;
  legacy.menang = 4;
  legacy.extraLegacyField = 'untouched';
  const data = new Map([[PLAYER_PROFILE_STORAGE_KEY, JSON.stringify({ ...legacy, progression: { unlockedArenaIds: ['custom-historical'], xp: -1 } })]]);
  let writes = 0;
  globalThis.window = { localStorage: { getItem: k => data.get(k), setItem: (k,v) => { writes++; data.set(k,v); } } };
  try {
    const first = storage.loadPlayerProfile();
    assert.equal(first.progression.xp, 640);
    assert.ok(first.progression.unlockedArenaIds.includes('custom-historical'));
    assert.equal(first.extraLegacyField, 'untouched');
    assert.equal(writes, 1);
    assert.deepEqual(storage.loadPlayerProfile(), first);
    assert.equal(writes, 1);
    data.set(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(legacy));
    const original = data.get(PLAYER_PROFILE_STORAGE_KEY);
    globalThis.window.localStorage.setItem = () => { throw new Error('quota'); };
    const inMemory = storage.loadPlayerProfile();
    assert.equal(inMemory.id, legacy.id);
    assert.equal(inMemory.progression.xp, 640);
    assert.equal(data.get(PLAYER_PROFILE_STORAGE_KEY), original);
  } finally { delete globalThis.window; }
});

void test('module09 incomplete aggregate stats preserve valid counters and identity without whole profile reset', () => {
  const p = service.createPlayerProfile('PartialOld');
  const raw = { ...p, progression: undefined, menang: 3, kalah: undefined,
    kda: { tagMusuh: 7, rescueTeam: 'broken' }, extraField: 99 };
  const parsed = parsePlayerProfile(raw);
  assert.equal(parsed.id, p.id);
  assert.equal(parsed.menang, 3);
  assert.equal(parsed.kalah, 0);
  assert.equal(parsed.kda.tagMusuh, 7);
  assert.equal(parsed.kda.rescueTeam, 0);
  assert.equal(parsed.extraField, 99);
  assert.equal(migratePlayerProgression(parsed).profile.progression.xp, 536);
});

void test('module08 duplicate callback/re-entry is a deterministic no-op, history bounded', () => {
  let p = service.createPlayerProfile('DedupTest');
  const summary = { matchId: createMatchId(), arenaId: 'kampung', completed: true, won: true, tags: 1, rescues: 1 };
  assert.notEqual(createMatchId(), summary.matchId);
  const first = applyMatchProgression(p, summary);
  const second = applyMatchProgression(first.profile, summary);
  assert.equal(second.profile, first.profile);
  assert.equal(second.reason, 'duplicate');
  assert.equal(second.xpEarned, 0);
  assert.equal(second.previousXP, second.currentXP);
  assert.deepEqual(second.newlyUnlockedCharacters, []);
  assert.deepEqual(second.newlyUnlockedArenaIds, []);
  assert.deepEqual(applyMatchProgression(second.profile, summary), second);
  p = first.profile;
  for (let i = 0; i < 80; i++) p = applyMatchProgression(p, { ...summary, matchId: `bounded-${i}` }).profile;
  assert.equal(p.progression.processedMatchIds.length, MAX_PROCESSED_MATCH_IDS);
  assert.equal(p.progression.processedMatchIds[0], 'bounded-30');
  assert.equal(p.progression.processedMatchIds.at(-1), 'bounded-79');
  const incomplete = applyMatchProgression(p, { ...summary, matchId: 'not-completed', completed: false });
  assert.equal(incomplete.profile, p);
  assert.ok(!p.progression.processedMatchIds.includes('not-completed'));
});

void test('module08 storage reload and stale caller cannot award same ID again; duplicates do not write', () => {
  const p = service.createPlayerProfile('DedupReload');
  const data = new Map([[PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(p)]]);
  let writes = 0;
  globalThis.window = { localStorage: { getItem: k => data.get(k), setItem: (k,v) => { writes++; data.set(k,v); } }, dispatchEvent: () => {} };
  const summary = { matchId: 'reload-identity', arenaId: 'custom-arena', completed: true, won: false, tags: 0, rescues: 0 };
  try {
    const first = service.recordMatchProgression(summary);
    assert.equal(service.recordMatchProgression(summary).reason, 'duplicate');
    assert.equal(writes, 1);
    const reloaded = storage.loadPlayerProfile();
    assert.deepEqual(reloaded, first.profile);
    assert.equal(applyMatchProgression(reloaded, summary).reason, 'duplicate');
    assert.deepEqual(getArenaStats(reloaded, 'custom-arena'), { played: 1, wins: 0 });
  } finally { delete globalThis.window; }
});

void test('module07 resolver updates XP/stats/totals then unlocks; result and input preserved', () => {
  const p = service.createPlayerProfile('RewardTest');
  p.progression.xp = 100;
  const before = structuredClone(p);
  const result = applyMatchProgression(p, { matchId: 'match-1', arenaId: 'kampung',
    completed: true, won: true, tags: 2, rescues: 1, timesCaptured: 1 });
  assert.equal(result.xpEarned, 191);
  assert.equal(result.previousXP, 100);
  assert.equal(result.currentXP, 291);
  assert.equal(result.previousLevel, 1);
  assert.equal(result.currentLevel, 2);
  assert.deepEqual(result.newlyUnlockedCharacters, ['bebe']);
  assert.deepEqual(result.newlyUnlockedArenaIds, ['pasar']);
  assert.deepEqual(result.profile.kda, { tagMusuh: 2, rescueTeam: 1, masukPenjara: 1 });
  assert.equal(result.profile.menang, 1);
  assert.deepEqual(getArenaStats(result.profile, 'kampung'), { played: 1, wins: 1 });
  assert.deepEqual(p, before);
  assert.deepEqual(parsePlayerProfile(result.profile), result.profile);
  const lost = applyMatchProgression(p, { matchId: 'loss-1', arenaId: 'custom-new',
    completed: true, won: false, tags: 999, rescues: 999 });
  assert.equal(lost.xpEarned, 224);
  assert.equal(lost.profile.kalah, 1);
  assert.equal(lost.profile.kda.tagMusuh, 999); // XP caps do not cap aggregate actions.
  assert.deepEqual(getArenaStats(lost.profile, 'custom-new'), { played: 1, wins: 0 });
});

void test('module07 incomplete no-op, invalid summary and overflow never mutate profile', () => {
  const p = service.createPlayerProfile('NoReward');
  const summary = { matchId: 'unfinished', arenaId: 'kampung', completed: false, won: true, tags: 2, rescues: 1 };
  const result = applyMatchProgression(p, summary);
  assert.equal(result.profile, p);
  assert.equal(result.applied, false);
  assert.equal(result.xpEarned, 0);
  for (const change of [{ matchId: '' }, { arenaId: '' }, { won: 'yes' }, { tags: -1 }, { timesCaptured: -1 }])
    assert.throws(() => applyMatchProgression(p, { ...summary, ...change }));
  p.progression.xp = Number.MAX_SAFE_INTEGER;
  assert.throws(() => applyMatchProgression(p, { ...summary, completed: true }), /batas aman/);
  assert.equal(p.progression.xp, Number.MAX_SAFE_INTEGER);
});

void test('module07 arena gates use the level, victory and actions earned in this same match', () => {
  const p = service.createPlayerProfile('SameMatch');
  p.progression.xp = 449;
  p.progression.arenaStats.pasar = { played: 2, wins: 2 };
  p.kda.tagMusuh = 7;
  p.kda.rescueTeam = 1;
  const result = applyMatchProgression(p, { matchId: 'threshold-match', arenaId: 'pasar',
    completed: true, won: true, tags: 1, rescues: 1 });
  assert.ok(result.newlyUnlockedCharacters.includes('ciici'));
  assert.ok(result.newlyUnlockedArenaIds.includes('taman'));
  assert.equal(getArenaStats(result.profile, 'pasar').wins, 3);
  assert.equal(result.profile.kda.tagMusuh, 8);
  assert.equal(result.profile.kda.rescueTeam, 2);
});

void test('module07 explicit storage entry persists reward once and reports storage failure', () => {
  const p = service.createPlayerProfile('StoreReward');
  const data = new Map([[PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(p)]]);
  let writes = 0;
  globalThis.window = { localStorage: { getItem: k => data.get(k), setItem: (k,v) => { writes++; data.set(k,v); } }, dispatchEvent: () => {} };
  const summary = { matchId: 'stored-match', arenaId: 'kampung', completed: true, won: true, tags: 0, rescues: 0 };
  try {
    const result = service.recordMatchProgression(summary);
    assert.equal(writes, 1);
    assert.deepEqual(storage.loadPlayerProfile(), result.profile);
    assert.equal(storage.loadPlayerProfile().progression.xp, 160);
    globalThis.window.localStorage.setItem = () => { throw new Error('quota'); };
    assert.throws(() => service.recordMatchProgression({ ...summary, matchId: 'storage-fail' }), /belum tersimpan/);
    assert.equal(storage.loadPlayerProfile().progression.xp, 160);
  } finally { delete globalThis.window; }
});

void test('module06 exact campaign rules and each requirement independently blocks unlock', () => {
  const expected = [['pasar',2,1,0,0,0], ['taman',3,3,0,8,2], ['kanal',5,4,0,15,5],
    ['kanal2',7,5,12,25,10], ['studio-kampung-2420b8cf',9,7,20,40,15]];
  assert.deepEqual(progressionRules.arenaProgression.unlockRequirements.map(r =>
    [r.arenaId,r.minLevel,r.requiredTierStats[0].minWins,r.minTotalWins ?? 0,r.minTags ?? 0,r.minRescues ?? 0]), expected);
  for (const r of progressionRules.arenaProgression.unlockRequirements) {
    const p = service.createPlayerProfile('ArenaUnlock');
    p.progression.xp = getXPRequiredForLevel(r.minLevel);
    p.menang = r.minTotalWins ?? 0;
    p.kda.tagMusuh = r.minTags ?? 0;
    p.kda.rescueTeam = r.minRescues ?? 0;
    const prerequisite = progressionRules.arenaProgression.tiers.find(t => t.id === r.requiredTierStats[0].tierId);
    const id = prerequisite.arenaIds[0];
    const wins = r.requiredTierStats[0].minWins;
    p.progression.arenaStats[id] = { played: wins, wins };
    assert.equal(isArenaUnlocked(p, r.arenaId), true);
    assert.ok(resolveArenaUnlocks(p).newlyUnlockedArenaIds.includes(r.arenaId));
    for (const change of [
      q => { q.progression.xp--; },
      q => { q.progression.arenaStats[id].wins--; },
      ...(r.minTotalWins ? [q => { q.menang--; }] : []),
      ...(r.minTags ? [q => { q.kda.tagMusuh--; }] : []),
      ...(r.minRescues ? [q => { q.kda.rescueTeam--; }] : []),
    ]) {
      const q = structuredClone(p); change(q);
      assert.equal(isArenaUnlocked(q, r.arenaId), false);
      assert.ok(getArenaUnlockProgress(q, r.arenaId).checks.some(c => !c.met));
    }
  }
});

void test('module06 historical/custom unlocks, legacy starter, tier membership and immutable resolver', () => {
  const p = service.createPlayerProfile('TierHistory');
  p.progression.unlockedArenaIds.push('studio-unknown', 'kanal2');
  const before = structuredClone(p);
  assert.equal(isArenaUnlocked(p, 'studio-unknown'), true);
  assert.equal(isArenaUnlocked(p, 'kanal2'), true);
  assert.equal(isArenaUnlocked(p, 'new-unknown'), false);
  assert.deepEqual(resolveArenaUnlocks(p).profile, p);
  assert.deepEqual(p, before);
  const legacy = { ...p, progression: undefined };
  assert.equal(isArenaUnlocked(legacy, 'kampung'), true);
  assert.equal(isArenaUnlocked(legacy, 'pasar'), false);
  const tier = progressionRules.arenaProgression.tiers[0];
  tier.arenaIds.push('studio-tier-one');
  try {
    p.progression.xp = 200;
    p.progression.arenaStats['studio-tier-one'] = { played: 1, wins: 1 };
    assert.equal(isArenaUnlocked(p, 'pasar'), true);
  } finally { tier.arenaIds.pop(); }
  for (const mutate of [
    r => { r.arenaProgression.tiers[0].mode = 'invalid'; },
    r => { r.arenaProgression.unlockRequirements[0].minTags = -1; },
    r => { r.arenaProgression.unlockRequirements[0].requiredTierStats[0].tierId = 'tier-6'; },
  ]) {
    const rules = structuredClone(progressionRules); mutate(rules);
    assert.throws(() => parseProgressionRules(rules), /tidak valid/);
  }
});

void test('module05 played increments per call and wins only on victory, including custom IDs', () => {
  const profile = service.createPlayerProfile('ArenaPlayer');
  const loss = applyArenaMatchStat(profile, 'studio-map-new', false);
  assert.deepEqual(getArenaStats(loss, 'studio-map-new'), { played: 1, wins: 0 });
  const win = applyArenaMatchStat(loss, 'studio-map-new', true);
  assert.deepEqual(getArenaStats(win, 'studio-map-new'), { played: 2, wins: 1 });
  const second = applyArenaMatchStat(win, 'another-custom-map', true);
  assert.deepEqual(getArenaStats(second, 'another-custom-map'), { played: 1, wins: 1 });
  assert.deepEqual(getArenaStats(second, 'studio-map-new'), { played: 2, wins: 1 });
  assert.deepEqual(parsePlayerProfile(second), second);
});

void test('module05 does not mutate input, unrelated profile state or storage; legacy reads safe', () => {
  const profile = service.createPlayerProfile('SafeArena');
  profile.progression.xp = 450;
  profile.progression.arenaStats.kampung = { played: 5, wins: 3 };
  profile.progression.processedMatchIds.push('old-match');
  const before = structuredClone(profile);
  const stats = getArenaStats(profile, 'kampung');
  stats.wins = 0;
  globalThis.window = { get localStorage() { throw new Error('No storage access'); } };
  try {
    const updated = applyArenaMatchStat(profile, 'pasar', true);
    assert.deepEqual(profile, before);
    const expected = structuredClone(before);
    expected.progression.arenaStats.pasar = { played: 1, wins: 1 };
    assert.deepEqual(updated, expected);
    const legacy = { ...profile };
    delete legacy.progression;
    assert.deepEqual(getArenaStats(legacy, 'kampung'), { played: 0, wins: 0 });
    assert.throws(() => applyArenaMatchStat(legacy, 'kampung', true), /migrasi/);
    assert.equal(legacy.progression, undefined);
  } finally { delete globalThis.window; }
});

void test('module05 special IDs are own entries; invalid input and overflow fail without data loss', () => {
  const profile = service.createPlayerProfile('ArenaCheck');
  for (const id of ['__proto__', 'constructor', 'toString']) {
    assert.deepEqual(getArenaStats(profile, id), { played: 0, wins: 0 });
    const updated = applyArenaMatchStat(profile, id, true);
    assert.ok(Object.hasOwn(updated.progression.arenaStats, id));
    assert.deepEqual(getArenaStats(updated, id), { played: 1, wins: 1 });
    assert.deepEqual(parsePlayerProfile(updated), updated);
  }
  for (const id of ['', ' ', null, 42]) {
    assert.throws(() => getArenaStats(profile, id));
    assert.throws(() => applyArenaMatchStat(profile, id, true));
  }
  assert.throws(() => applyArenaMatchStat(profile, 'kampung', 'win'), /boolean/);
  profile.progression.arenaStats.full = { played: Number.MAX_SAFE_INTEGER, wins: 1 };
  assert.throws(() => applyArenaMatchStat(profile, 'full', false), /batas/);
  assert.equal(profile.progression.arenaStats.full.played, Number.MAX_SAFE_INTEGER);
  profile.progression.arenaStats.bad = { played: 1, wins: 2 };
  assert.throws(() => applyArenaMatchStat(profile, 'bad', true), /tidak valid/);
  assert.deepEqual(profile.progression.arenaStats.bad, { played: 1, wins: 2 });
});

void test('module04 all character thresholds, starters and unknown IDs', () => {
  const profile = service.createPlayerProfile('Unlocker');
  for (const { characterId, minLevel } of progressionRules.characterUnlockRequirements) {
    const xp = getXPRequiredForLevel(minLevel);
    profile.progression.xp = xp;
    assert.equal(isCharacterUnlocked(profile, characterId), true);
    assert.equal(getCharacterUnlockRequirement(characterId).requiredXP, xp);
    assert.ok(resolveCharacterUnlocks(profile).profile.progression.unlockedCharacters.includes(characterId));
    if (minLevel > 1) {
      profile.progression.xp = xp - 1;
      assert.equal(isCharacterUnlocked(profile, characterId), false);
      assert.ok(!resolveCharacterUnlocks(profile).profile.progression.unlockedCharacters.includes(characterId));
      assert.equal(getCharacterUnlockProgress(profile, characterId).xpRemaining, 1);
    }
  }
  delete profile.progression;
  assert.equal(isCharacterUnlocked(profile, 'raja'), true);
  assert.equal(isCharacterUnlocked(profile, 'kaka'), true);
  assert.equal(isCharacterUnlocked(profile, 'jago'), false);
  assert.throws(() => resolveCharacterUnlocks(profile), /migrasi/);
  assert.equal(getCharacterUnlockRequirement('missing'), null);
  assert.equal(getCharacterUnlockProgress(profile, 'missing'), null);
  assert.equal(isCharacterUnlocked(profile, 'missing'), false);
});

void test('module04 historical unlocks never relock after config change; resolver is immutable/idempotent', () => {
  const profile = service.createPlayerProfile('Historian');
  profile.progression.unlockedCharacters.push('bebe', 'kodo');
  profile.progression.xp = 450;
  const before = structuredClone(profile);
  const requirement = progressionRules.characterUnlockRequirements.find(r => r.characterId === 'bebe');
  const originalLevel = requirement.minLevel;
  requirement.minLevel = 13;
  try {
    const result = resolveCharacterUnlocks(profile);
    assert.deepEqual(result.newlyUnlockedCharacters, ['ciici']);
    assert.equal(isCharacterUnlocked(result.profile, 'bebe'), true);
    assert.equal(getCharacterUnlockProgress(result.profile, 'kodo').progress, 1);
    assert.equal(getCharacterUnlockProgress(result.profile, 'kodo').xpRemaining, 0);
    assert.deepEqual(resolveCharacterUnlocks(result.profile).newlyUnlockedCharacters, []);
    assert.deepEqual(profile, before);
    assert.deepEqual(parsePlayerProfile(result.profile), result.profile);
  } finally { requirement.minLevel = originalLevel; }
});

void test('module04 progress helper and resolver never access persistence', () => {
  const profile = service.createPlayerProfile('PureUnlock');
  profile.progression.xp = 100;
  globalThis.window = { get localStorage() { throw new Error('No storage access'); } };
  try {
    assert.equal(getCharacterUnlockProgress(profile, 'bebe').progress, 0.5);
    assert.equal(getCharacterUnlockProgress(profile, 'raja').progress, 1);
    assert.deepEqual(resolveCharacterUnlocks(profile).newlyUnlockedCharacters, []);
  } finally { delete globalThis.window; }
});

void test('new profile default and independently mutable progression collections', () => {
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

void test('legacy parser remains read-only; storage now migrates once under module09', () => {
  const legacy = service.createPlayerProfile('Veteran');
  delete legacy.progression;
  legacy.menang = 12;
  legacy.kalah = 3;
  legacy.kda = { tagMusuh: 24, masukPenjara: 6, rescueTeam: 9 };
  assert.deepEqual(parsePlayerProfile(legacy), legacy);
  const data = new Map([[PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(legacy)]]);
  let writes = 0;
  globalThis.window = {
    localStorage: { getItem: key => data.get(key), setItem: (key, value) => { writes++; data.set(key, value); } },
  };
  try {
    const migrated = storage.loadPlayerProfile();
    const { progression: _progression, ...preserved } = migrated;
    assert.deepEqual(preserved, legacy);
    assert.equal(writes, 1);
    assert.deepEqual(storage.loadPlayerProfile(), migrated);
    assert.equal(writes, 1);
  } finally { delete globalThis.window; }
});

void test('persisted progression survives profile updates without awarding XP/unlocks', () => {
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

void test('invalid optional progression never invalidates a valid old profile', () => {
  const profile = service.createPlayerProfile('SafeUser');
  assert.equal(parsePlayerProgression({ ...profile.progression, xp: -1 }), undefined);
  assert.equal(parsePlayerProgression({ ...profile.progression, unlockedCharacters: ['missing'] }), undefined);
  const parsed = parsePlayerProfile({ ...profile, progression: null });
  assert.equal(parsed.id, profile.id);
  assert.equal(parsed.progression, undefined);
});

void test('module02 loads exact specified rewards, caps, levels and complete unlock roster', () => {
  assert.deepEqual(progressionRules.xpRewards, { completeMatch: 100, win: 60, tag: 8, rescue: 15 });
  assert.deepEqual(progressionRules.xpCaps, { tagPerMatch: 64, rescuePerMatch: 60 });
  assert.deepEqual(progressionRules.playerLevelThresholds,
    [0, 200, 450, 750, 1100, 1500, 1950, 2450, 3000, 3600, 4300, 5100, 6000]);
  assert.deepEqual(progressionRules.characterUnlockRequirements.map(r => [r.characterId, r.minLevel]),
    [['raja',1],['kaka',1],['bebe',2],['ciici',3],['jago',4],['maria',5],['lala',6],
     ['lui',7],['robot',8],['buto',9],['tui',10],['boke',11],['kumis',12],['kodo',13]]);
  assert.equal(progressionRules.arenaProgression.tiers.length, 6);
  assert.equal(progressionRules.arenaProgression.unlockRequirements.length, 5);
});

void test('module02 malformed rules fail explicitly without changing input or player data', () => {
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

void test('module02 arena schema validates tier membership and stat prerequisites only', () => {
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

void test('module03 specified boundaries and every configured level threshold', () => {
  for (const [xp, level] of [[0,1], [199,1], [200,2], [449,2], [450,3], [5999,12], [6000,13]])
    assert.equal(getLevelFromXP(xp), level);
  progressionRules.playerLevelThresholds.forEach((xp, i) => {
    assert.equal(getLevelFromXP(xp), i + 1);
    assert.equal(getXPRequiredForLevel(i + 1), xp);
    if (i > 0) assert.equal(getLevelFromXP(xp - 1), i);
  });
});

void test('module03 progress resets at boundary, max level has no phantom next level', () => {
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

void test('module03 completion/win/action rewards and independent caps', () => {
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

void test('module03 invalid input rejected and pure helpers do not mutate data or use storage', () => {
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
