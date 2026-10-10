import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import {
  CHARACTERS,
  CHARACTER_BY_ID,
  ULTIMATE_CHARACTER_IDS,
  characterMirrorsWest,
  characterUsesDedicatedEast,
} from '../lib/characters.ts';

const files = (await readdir('config/characters')).filter((file) => file.endsWith('.json')).sort();
assert.deepEqual(files, ['bebe.json', 'boke.json', 'buto.json', 'ciici.json', 'jago.json', 'kaka.json', 'kodo.json', 'kumis.json', 'lala.json', 'lui.json', 'maria.json', 'raja.json', 'robot.json', 'tui.json']);
assert.equal(CHARACTERS.length, 14);
// The table is the JSON on disk: every stat round-trips verbatim.
for (const file of files) {
  const disk = JSON.parse(await readFile(`config/characters/${file}`, 'utf8'));
  assert.deepEqual(CHARACTER_BY_ID[disk.id], disk, `${disk.id} matches disk`);
}
// Spot values (frozen balance, Q2).
assert.equal(CHARACTER_BY_ID.kaka.speed, 238);
assert.equal(CHARACTER_BY_ID.raja.baseChargeTime, 0.55);
assert.equal(CHARACTER_BY_ID.maria.tagCooldownMs, 360);
assert.equal(CHARACTER_BY_ID.kumis.tagRange, 36);
assert.equal(CHARACTER_BY_ID.buto.tagRange, 34);
// Orientation flags preserve the old branch winners.
assert.equal(characterMirrorsWest('raja'), true);
assert.equal(characterMirrorsWest('jago'), true);
assert.equal(characterMirrorsWest('kaka'), false);
assert.equal(characterUsesDedicatedEast('jago'), true);
assert.equal(characterUsesDedicatedEast('raja'), false);
assert.equal(characterUsesDedicatedEast('kaka'), false);
// Ultimate set and frozen ultimate numbers.
assert.deepEqual([...ULTIMATE_CHARACTER_IDS].sort(), ['bebe', 'ciici', 'kaka', 'raja']);
for(const id of ['bebe','ciici']) {
  assert.equal(CHARACTER_BY_ID[id].ultimate.kind,'flight');
  assert.equal(CHARACTER_BY_ID[id].ultimate.castMs,id==='bebe'?700:650);
}
assert.deepEqual(CHARACTER_BY_ID.kaka.ultimate, {
  kind: 'shield', name: 'Perisai Hijau', shortLabel: 'PERISAI', hudTitle: 'Perisai Hijau',
  buffText: ' KEBAL TAG · ', bannerAlt: 'ULTIMATE SKILL KAKA', icon: 'shield',
  hudClass: 'kaka', shieldClass: 'kaka-shield', actionClass: 'kaka-ultimate',
  indicatorClass: 'kaka-shield-indicator', bannerClass: 'kaka-banner',
  trackEdge: '#082414', trackFill: '#47e97c', castBurst: '#35f477', castBeepHz: 360,
  castMs: 3600, bannerMs: 1050, strip: true, castLog: 'KAKA membangkitkan PERISAI HIJAU.',
});
assert.equal(CHARACTER_BY_ID.raja.ultimate.kind, 'surge');
assert.equal(CHARACTER_BY_ID.raja.ultimate.castMs, 3200);
assert.equal(CHARACTER_BY_ID.raja.ultimate.bannerMs, 820);
assert.equal(CHARACTER_BY_ID.lala.ultimate, undefined);
console.log('PASS character data: 14 JSON files, verbatim stats, flags, frozen ultimates.');
