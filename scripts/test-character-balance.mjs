// Balance guardrails: Tim Merah and Tim Hijau default lineups stay at parity, and the chase
// stats stay within ranges where every character can still catch and escape.
// Run: node --experimental-strip-types --test scripts/test-character-balance.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { CHARACTERS, CHARACTER_BY_ID } from '../lib/characters.ts';

const rules = JSON.parse(readFileSync('config/game-rules.json', 'utf8'));
const lineup = (team) => rules.teams[team].roster.slice(0, rules.matchSize).map((id) => CHARACTER_BY_ID[id]);
const avg = (cs, f) => cs.reduce((s, c) => s + f(c), 0) / cs.length;
const gap = (a, b) => Math.abs(a - b) / Math.min(a, b);
const spread = (f) => { const v = CHARACTERS.map(f); return Math.max(...v) / Math.min(...v) - 1; };

void test('default lineups are at parity (enemy is always the other default lineup)', () => {
  const red = lineup('red'), green = lineup('green');
  for (const [name, f, limit] of [
    ['speed', (c) => c.speed, 0.01],
    ['boosted top speed', (c) => c.speed * c.boostMultiplier, 0.01],
    ['tag cooldown', (c) => c.tagCooldownMs, 0.02],
    ['tag range', (c) => c.tagRange, 0.02],
    ['rescue range', (c) => c.rescueRange, 0.03],
  ]) assert.ok(gap(avg(red, f), avg(green, f)) <= limit, `${String(name)}: Merah ${avg(red, f).toFixed(1)} vs Hijau ${avg(green, f).toFixed(1)}`);
  assert.equal(Math.min(...red.map((c) => c.speed)), Math.min(...green.map((c) => c.speed)), 'same slowest member speed');
});

void test('chase stat spreads stay narrow enough to catch and escape', () => {
  assert.ok(spread((c) => c.speed) <= 0.12, 'base speed spread ≤ 12%');
  assert.ok(spread((c) => c.speed * c.boostMultiplier) <= 0.18, 'boosted top speed spread ≤ 18%');
  assert.ok(spread((c) => c.tagCooldownMs) <= 0.2, 'tag cooldown spread ≤ 20%');
  assert.ok(spread((c) => c.tagRange) <= 0.2, 'tag range spread ≤ 20%');
});

void test('role identities survive the compression', () => {
  const max = (f) => CHARACTERS.reduce((a, c) => (f(c) > f(a) ? c : a));
  const min = (f) => CHARACTERS.reduce((a, c) => (f(c) < f(a) ? c : a));
  assert.equal(max((c) => c.speed).id, 'kaka', 'Kaka: fastest base run');
  assert.equal(max((c) => c.boostMultiplier).id, 'jago', 'Jago: strongest boost');
  assert.equal(min((c) => c.tagCooldownMs).id, 'maria', 'Maria: shortest tag cooldown');
  assert.equal(max((c) => c.tagRange).id, 'kumis', 'Kumis: widest tag reach');
  assert.equal(max((c) => c.boost).id, 'kumis', 'Kumis: biggest boost reserve');
  assert.equal(max((c) => c.agility).id, 'lala', 'Lala: furthest parkour');
  assert.equal(min((c) => c.baseChargeTime).id, 'raja', 'Raja: fastest fort ready');
});
