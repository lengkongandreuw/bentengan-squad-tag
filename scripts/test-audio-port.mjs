import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMatchAudio } from '../modules/audio/audio-port.ts';

const source = await readFile(new URL('../app/prototype.tsx', import.meta.url), 'utf8');
// Per-site pins: every gameplay audio event still routes through the port.
// The rescue-request pair moved into the rescue module contract (pinned by
// test-rescue-request.mjs) and is applied here through the sounds loop.
const once = [
  "for (const sound of rescueEffects.sounds) matchAudio.play(sound.name, sound.volume);",
  "matchAudio.play('dash', 0.38);",
  "matchAudio.play('caught');",
  "matchAudio.play('tag', .22);",
  "matchAudio.play('rescued');",
  "matchAudio.play('rescue');",
  "matchAudio.play('rescue', .25);",
  "matchAudio.play('step', boosting ? .8 : .6);",
  "matchAudio.play('dash');",
  "matchAudio.play('prison');",
  "matchAudio.play('fort-enter');",
  "if (reason === 'BENTENG DIREBUT') matchAudio.play('fort-captured', team === players[0].team ? 1 : .55);",
];
for (const snippet of once) assert.ok(source.includes(snippet), `missing audio site: ${snippet}`);
assert.equal(source.split("matchAudio.play('tag');").length - 1, 1, 'plain tag call routes through the port');
assert.equal(source.split('matchAudio.play(').length - 1, 13, 'exactly 13 port calls');
assert.ok(source.includes('const matchAudio = createMatchAudio();'), 'port created per match');
assert.ok(source.includes('matchAudio.close();'), 'port closed on teardown');
assert.ok(!source.includes('gameplayAudio'), 'no raw engine reference in app/');

// Port contract against a stub window: wiring, safe play, idempotent close.
const added = [];
const removed = [];
globalThis.window = {
  addEventListener: (type, fn) => added.push([type, fn]),
  removeEventListener: (type, fn) => removed.push([type, fn]),
};
const port = createMatchAudio();
assert.deepEqual(added.map(([type]) => type).sort((a, b) => (a < b ? -1 : 1)), ['keydown', 'pointerdown']);
for (const name of ['step', 'dash', 'tag', 'caught', 'prison', 'rescued', 'rescue', 'fort-enter', 'fort-captured']) {
  port.play(name);
  port.play(name, 0.5);
}
port.unlock();
port.close();
port.close();
const unlockRemoved = removed.map(([type]) => type).filter((type) => type !== 'benteng-audio-settings');
assert.deepEqual(unlockRemoved.sort((a, b) => (a < b ? -1 : 1)), ['keydown', 'keydown', 'pointerdown', 'pointerdown']);
console.log('PASS audio port: 13 sites pinned, wiring, safe play, idempotent close.');
