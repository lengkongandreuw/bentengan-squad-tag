// FEATURE_MATCH_FORMAT_5_RONDE: scoring, lock, tiebreaks, golden round, team fort
// progress, perks and bot fort duty. Run: node --experimental-strip-types --test scripts/test-match-format.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  completeRound, createMatchProgress, fortLockSeconds, fullCaptureHoldSeconds, isFinalRound,
  maxRemainingPoints, normalizeMatchFormat, pointsFor, roundSecondsFor,
} from '../modules/game-core/match-format.ts';
import { resolveTeamFort, resolveAllHeld, resolveBase } from '../modules/gameplay/tag-combat.ts';
import {
  botPickPerk, createPerkDraft, effectiveStats, emptyTeamPerks, fortCaptureBonusSeconds,
  PERK_LIST, refillSpawnWeight, resolvePerkDraft,
} from '../modules/gameplay/perks.ts';
import { assignGuards, createBotAuthority, planBot } from '../modules/gameplay/ai-movement.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';

const none = { blue: 0, red: 0 };
const win = (progress, round, winner, reason, unique = none) =>
  completeRound(progress, { round, winner, reason, durationSec: 100, uniqueCaptures: unique });

void test('points follow the table and the final round doubles', () => {
  assert.equal(pointsFor('BENTENG DIREBUT', false), 3);
  assert.equal(pointsFor('SEMUA LAWAN DITANGKAP', false), 2);
  for (const reason of ['WAKTU HABIS', 'TANGKAPAN UNIK', 'SUDDEN DEATH TAG']) assert.equal(pointsFor(reason, false), 1);
  assert.equal(pointsFor('BENTENG DIREBUT', true), 6);
  const p = createMatchProgress('standard');
  assert.equal(p.totalRounds, 5);
  assert.equal(createMatchProgress('tournament').totalRounds, 7);
  assert.equal(isFinalRound(p, 5), true);
  assert.equal(isFinalRound(p, 4), false);
  assert.equal(roundSecondsFor(p), 180);
  assert.equal(fullCaptureHoldSeconds(p), 4);
  assert.equal(fortLockSeconds(p), 45);
  assert.equal(normalizeMatchFormat('bad'), 'standard');
});

void test('all five rounds play, highest points wins (×2 final can flip the result)', () => {
  const p = createMatchProgress('standard');
  assert.equal(win(p, 1, 'blue', 'WAKTU HABIS').matchOver, false);
  assert.equal(win(p, 2, 'blue', 'WAKTU HABIS').matchOver, false);
  assert.equal(win(p, 3, 'red', 'WAKTU HABIS').matchOver, false);
  assert.equal(win(p, 4, 'blue', 'WAKTU HABIS').matchOver, false);
  const last = win(p, 5, 'red', 'BENTENG DIREBUT');
  assert.deepEqual(p.points, { blue: 3, red: 7 });
  assert.equal(last.record.points, 6);
  assert.equal(last.matchOver, true);
  assert.equal(last.winner, 'red');
  assert.equal(p.rounds.length, 5);
});

void test('match locks once the gap exceeds the remaining maximum', () => {
  const p = createMatchProgress('standard');
  assert.equal(maxRemainingPoints(p, 3), 9);
  win(p, 1, 'blue', 'BENTENG DIREBUT');
  win(p, 2, 'blue', 'BENTENG DIREBUT');
  const third = win(p, 3, 'blue', 'BENTENG DIREBUT');
  // 9 − 0 is not > 9 → keep playing.
  assert.equal(third.matchOver, false);
  const fourth = win(p, 4, 'blue', 'WAKTU HABIS');
  // 10 > 6 remaining (final ×2) → locked.
  assert.equal(fourth.matchOver, true);
  assert.equal(fourth.locked, true);
  assert.equal(fourth.winner, 'blue');
  assert.equal(p.locked, true);
});

void test('points tie: rounds won, then unique captures, then golden round', () => {
  // 4–4 on points (final ×2), red won 3 rounds vs 2 → red.
  const e = createMatchProgress('standard');
  win(e, 1, 'blue', 'BENTENG DIREBUT'); win(e, 2, 'red', 'WAKTU HABIS');
  win(e, 3, 'red', 'WAKTU HABIS'); win(e, 4, 'blue', 'WAKTU HABIS');
  const byRounds = win(e, 5, 'red', 'WAKTU HABIS');
  assert.deepEqual(e.points, { blue: 4, red: 4 });
  assert.equal(byRounds.winner, 'red');
  // With an odd round count every round has a winner, so rounds won cannot tie on the
  // real path; the later tiebreaks are exercised through prepared state.
  const tied = () => {
    const p = createMatchProgress('standard');
    for (let r = 1; r <= 4; r++) win(p, r, r % 2 ? 'blue' : 'red', 'WAKTU HABIS');
    p.points = { blue: 4, red: 2 }; p.roundsWon = { blue: 2, red: 1 };
    return p;
  };
  const unique = tied();
  assert.equal(win(unique, 5, 'red', 'WAKTU HABIS', { blue: 0, red: 1 }).winner, 'red');
  const k = tied();
  const goldenNext = win(k, 5, 'red', 'WAKTU HABIS');
  assert.equal(goldenNext.matchOver, false);
  assert.equal(goldenNext.goldenNext, true);
  assert.equal(k.golden, true);
  assert.equal(roundSecondsFor(k), 90);
  assert.equal(fortLockSeconds(k), 0);
  assert.equal(isFinalRound(k, 6), false);
  const decided = win(k, 6, 'blue', 'SUDDEN DEATH TAG');
  assert.equal(decided.matchOver, true);
  assert.equal(decided.winner, 'blue');
  assert.equal(decided.record.golden, true);
});

void test('legacy best-of-3 is unchanged for multiplayer', () => {
  const p = createMatchProgress('legacy-bo3');
  assert.equal(roundSecondsFor(p), 240);
  assert.equal(fullCaptureHoldSeconds(p), 2);
  assert.equal(fortLockSeconds(p), 0);
  assert.equal(win(p, 1, 'blue', 'BENTENG DIREBUT').matchOver, false);
  const end = win(p, 2, 'blue', 'WAKTU HABIS');
  assert.equal(end.matchOver, true);
  assert.equal(end.winner, 'blue');
  assert.equal(end.record.points, 0);
});

const actor = (id, team, x, y, state = 'ACTIVE', extra = {}) => ({
  id, entityId: `entity-${id}`, team, x, y, vx: 0, vy: 0, state, controller: 'bot', characterId: 'raja', aiSeed: 1,
  exitOrder: 1, boost: 100, fortCharge: 0, baseCharge: 0, exitDeadline: 0, lastExitAt: -1e9, boostReadyAt: 0,
  capturedIds: [], prisonIndex: 0, waterEnteredAt: 0, flight: null, ...extra,
});
const bases = { blue: { x: 100, y: 300 }, red: { x: 900, y: 300 } };
const fortRules = (over = {}) => ({
  bases, radius: 60, kanal2: false, captureSecondsByAttackers: [5, 3.5, 2.5], decayPerSecond: 0.25,
  locked: false, bonusSeconds: () => 0, ...over,
});
const runFort = (players, seconds, rules = fortRules(), progress = { blue: 0, red: 0 }) => {
  let events = [];
  for (let t = 0; t < seconds; t += 0.05) events = events.concat(resolveTeamFort(players, progress, 0.05, rules).events);
  return { progress, events };
};

void test('team fort capture: 5 / 3.5 / 2.5 seconds by attackers, lock, decay and fort guard perk', () => {
  const one = [actor('a', 'blue', 900, 300)];
  assert.equal(runFort(one, 4.8).events.length, 0);
  assert.equal(runFort(one, 5.1).events[0]?.reason, 'BENTENG DIREBUT');
  const two = [actor('a', 'blue', 900, 300), actor('b', 'blue', 905, 300)];
  assert.equal(runFort(two, 3.3).events.length, 0);
  assert.ok(runFort(two, 3.6).events.length > 0);
  const three = [...two, actor('c', 'blue', 895, 300), actor('d', 'blue', 900, 310)];
  assert.ok(runFort(three, 2.6).events.length > 0);
  assert.equal(runFort(three, 2.3).events.length, 0);
  // Locked: no progress.
  assert.equal(runFort(one, 10, fortRules({ locked: true })).progress.blue, 0);
  // Defended: progress decays 0.25/s instead of resetting.
  const half = { blue: 0.5, red: 0 };
  runFort([actor('a', 'blue', 900, 300), actor('g', 'red', 890, 300)], 1, fortRules(), half);
  assert.ok(Math.abs(half.blue - 0.25) < 0.02, String(half.blue));
  // Empty fort decays too.
  const left = { blue: 0.3, red: 0 };
  runFort([actor('a', 'blue', 500, 300)], 2, fortRules(), left);
  assert.equal(left.blue, 0);
  // Benteng Kokoh (+1.5 s) on the defending red team.
  const kokoh = fortRules({ bonusSeconds: (defender) => (defender === 'red' ? fortCaptureBonusSeconds(['fort_guard']) : 0) });
  assert.equal(runFort(one, 6.3, kokoh).events.length, 0);
  assert.ok(runFort(one, 6.6, kokoh).events.length > 0);
  // Team mode disables the legacy per-player 1.5 s capture inside resolveBase.
  const solo = actor('a', 'blue', 900, 300);
  const base = { bases, radius: 60, kanal2: false, boost: 100, chargeTime: 0.5, reentryMs: 1500, tieHash: () => 0 };
  let legacy = [], team = [];
  for (let t = 0; t < 2; t += 0.1) legacy = legacy.concat(resolveBase([solo], solo, 0.1, 0, [], base));
  solo.fortCharge = 0;
  for (let t = 0; t < 2; t += 0.1) team = team.concat(resolveBase([solo], solo, 0.1, 0, [], { ...base, teamFort: true }));
  assert.ok(legacy.some((e) => e.type === 'objective'));
  assert.ok(!team.some((e) => e.type === 'objective'));
});

void test('full-capture hold uses the configured seconds', () => {
  const players = [actor('a', 'blue', 0, 0), actor('b', 'red', 0, 0, 'PRISONER', { prisonOwner: 'blue' })];
  const total = { blue: 0, red: 0 };
  assert.equal(resolveAllHeld(players, total, 3, 4).length, 0);
  assert.equal(resolveAllHeld(players, total, 1.1, 4)[0]?.reason, 'SEMUA LAWAN DITANGKAP');
  assert.equal(resolveAllHeld(players, { blue: 0, red: 0 }, 2.1).length, 1); // legacy default 2 s
});

void test('perks are a multiplier layer; base character stats stay untouched', () => {
  const base = { ...CHARACTER_BY_ID.raja };
  assert.equal(effectiveStats('raja', []), CHARACTER_BY_ID.raja);
  const s = effectiveStats('raja', ['swift_feet', 'long_reach', 'deep_breath', 'quick_gate', 'rescue_shield']);
  assert.ok(Math.abs(s.speed - base.speed * 1.06) < 1e-9);
  assert.ok(Math.abs(s.rescueRange - base.rescueRange * 1.25) < 1e-9);
  assert.ok(Math.abs(s.boost - base.boost * 1.15) < 1e-9);
  assert.ok(Math.abs(s.baseChargeTime - base.baseChargeTime * 0.8) < 1e-9);
  assert.equal(s.rescueShieldMs, base.rescueShieldMs + 700);
  assert.deepEqual(CHARACTER_BY_ID.raja, base);
  assert.equal(refillSpawnWeight(['double_refill']), 1.3);
  assert.equal(refillSpawnWeight([]), 1);
  assert.equal(PERK_LIST.length, 7);
});

void test('perk draft: loser picks 1 of 3, winner gets a random leftover, max 3, no duplicates', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const perks = emptyTeamPerks();
  const draft = createPerkDraft(perks, 'blue', 0, random);
  assert.equal(draft.loser, 'red');
  assert.equal(draft.offer.length, 3);
  assert.equal(new Set(draft.offer).size, 3);
  resolvePerkDraft(draft, perks, draft.offer[1], random);
  assert.deepEqual(perks.red, [draft.offer[1]]);
  assert.equal(perks.blue.length, 1);
  assert.ok(draft.offer.includes(perks.blue[0]) && perks.blue[0] !== draft.offer[1]);
  // Timeout (null pick) takes the first offered perk.
  const next = createPerkDraft(perks, 'blue', 0, random);
  assert.ok(!next.offer.some((id) => perks.red.includes(id)));
  resolvePerkDraft(next, perks, null, random);
  assert.equal(perks.red[1], next.offer[0]);
  for (let i = 0; i < 6; i++) {
    const d = createPerkDraft(perks, i % 2 ? 'red' : 'blue', 0, random);
    if (d) resolvePerkDraft(d, perks, botPickPerk(d.offer), random);
  }
  assert.ok(perks.blue.length <= 3 && perks.red.length <= 3);
  assert.equal(new Set(perks.blue).size, perks.blue.length);
  assert.equal(new Set(perks.red).size, perks.red.length);
  assert.equal(createPerkDraft({ blue: ['fort_guard', 'swift_feet', 'long_reach'], red: ['fort_guard', 'swift_feet', 'long_reach'] }, 'blue', 0, random), null);
  // Bot priority: Benteng Kokoh first, then Tangan Panjang, Kaki Angin…
  assert.equal(botPickPerk(['swift_feet', 'fort_guard', 'long_reach']), 'fort_guard');
  assert.equal(botPickPerk(['swift_feet', 'double_refill', 'long_reach']), 'long_reach');
});

const botWorld = (players, duty) => ({
  players, bases, width: 1000, height: 600, refills: [], request: null, kanal2: false, localTeam: 'blue',
  profile: { rescueCutoff: 0, threatRadius: 0, playerBias: 0, prediction: 0, steerDistance: 90 },
  boostThreshold: 2, navigate: (p, v) => v, duty,
});

void test('bots: one guard per team, guard chases only lower exit orders, at most 2 fort rushers', () => {
  const duty = { baseRadius: 60, maxFortAttackers: 2, rotateMs: 30000 };
  const blue = [1, 2, 3, 4, 5].map((n) => actor(`b${n}`, 'blue', 200 + n * 60, 300, 'ACTIVE', { exitOrder: n }));
  const red = [1, 2, 3, 4, 5].map((n) => actor(`r${n}`, 'red', 600 + n * 50, 300, 'ACTIVE', { exitOrder: n }));
  const w = botWorld([...blue, ...red], duty);
  const guards = assignGuards(w, 0, {}, 30000);
  assert.equal(guards.blue, 'b1'); // nearest to the blue fort
  assert.equal(guards.red, 'r5');
  // Intruder near the blue fort with a lower exit order → the guard chases it.
  const intruder = actor('x', 'red', 150, 300, 'ACTIVE', { exitOrder: 0 });
  const chase = planBot(blue[0], 0, { ...w, players: [...w.players, intruder], duty: { ...duty, guards } });
  assert.equal(chase.objective, 'guard');
  assert.equal(chase.targetId, intruder.entityId);
  // Intruder outranks the guard → the guard heads into its own fort.
  intruder.exitOrder = 9;
  const refresh = planBot(blue[0], 0, { ...w, players: [...w.players, intruder], duty: { ...duty, guards } });
  assert.equal(refresh.objective, 'guard');
  assert.ok(refresh.vector.x < 0); // toward the blue fort at x=100
  // Rotation after 30 s picks another bot.
  const state = { blue: { id: 'b1', since: 0 } };
  assert.notEqual(assignGuards(w, 31000, state, 30000).blue, 'b1');
  // Fort rush cap: with nothing else to do every bot would rush; only two per team may.
  const rushers = [1, 2, 3, 4].map((n) => actor(`q${n}`, 'blue', 500, 300, 'ACTIVE', { exitOrder: 0, aiSeed: 0 }));
  const objectives = [];
  createBotAuthority().run('host', botWorld(rushers, { ...duty, maxFortAttackers: 2 }), 0, (_p, intent) => objectives.push(intent.objective));
  assert.equal(objectives.filter((o) => o === 'fort').length, 2);
  // Legacy (no duty) keeps every bot's original objective.
  const legacy = [];
  createBotAuthority().run('host', botWorld(rushers.map((p) => ({ ...p })), undefined), 0, (_p, intent) => legacy.push(intent.objective));
  assert.ok(!legacy.includes('guard') && !legacy.includes('center'));
});
