import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMatchAudio } from '../modules/audio/audio-port.ts';

const source = await readFile(new URL('../app/prototype.tsx', import.meta.url), 'utf8');
const captureSource = await readFile(new URL('../modules/gameplay/capture.ts', import.meta.url), 'utf8');
const rescueSource = await readFile(new URL('../modules/gameplay/rescue-check.ts', import.meta.url), 'utf8');
const waterSource = await readFile(new URL('../modules/gameplay/water.ts', import.meta.url), 'utf8');
const movementAudioSource = await readFile(new URL('../modules/gameplay/movement-audio.ts', import.meta.url), 'utf8');
// Per-site pins: every gameplay audio event still routes through the port.
// Sites moved into gameplay modules are pinned there as narrow onAudio
// callbacks; the port stays prototype-owned.
const once = [
  "for (const sound of rescueEffects.sounds) matchAudio.play(sound.name, sound.volume);",
];
for (const snippet of once) assert.ok(source.includes(snippet), `missing prototype audio site: ${snippet}`);
// Movement cues moved with stepMovementAudio: triggers pinned in the module,
// port wiring pinned as forwarder literals in prototype.
for (const snippet of [
  'world.onStep(boosting ? .8 : .6)',
  'world.onDash()',
  'world.onPrison()',
  'world.onFortEnter()',
]) assert.ok(movementAudioSource.includes(snippet), `missing movement-audio cue: ${snippet}`);
for (const snippet of [
  "onStep: (volume) => matchAudio.play('step', volume)",
  "onDash: () => matchAudio.play('dash')",
  "onPrison: () => matchAudio.play('prison')",
  "onFortEnter: () => matchAudio.play('fort-enter')",
]) assert.ok(source.includes(snippet), `missing port forwarder: ${snippet}`);
// Moved sites: pinned at their module homes.
// fort-captured lives in prototype's winRound: guard + volume math inline,
// routed through the GameplayAudio engine (Seam 58 predates the match-audio port).
assert.ok(source.includes("if (reason === 'BENTENG DIREBUT') gameplayAudio.play('fort-captured', team === players[0].team ? 1 : .55)"), 'fort-captured guard + volume math live in prototype winRound');
assert.ok(waterSource.includes("onAudio('dash', 0.38)"), 'kanal2 drowning dash cue lives in water.ts');
assert.ok(captureSource.includes("onAudio('caught')"), 'caught cue lives in capture.ts');
assert.ok(captureSource.includes("onAudio('tag')"), 'plain tag cue lives in capture.ts');
assert.ok(captureSource.includes("onAudio('tag', 0.22)"), 'distant tag cue lives in capture.ts');
assert.ok(rescueSource.includes("onAudio('rescued')"), 'rescued cue lives in rescue-check.ts');
assert.ok(rescueSource.includes("onAudio('rescue')"), 'rescue cue lives in rescue-check.ts');
assert.ok(rescueSource.includes("onAudio('rescue', 0.25)"), 'distant rescue cue lives in rescue-check.ts');
// Plain tag fires exactly once (capture's winner-controlled branch).
assert.equal(captureSource.split("onAudio('tag')").length - 1, 1, 'plain tag call routes through the port');
// Prototype keeps 1 direct port call + 8 onAudio-style forwarders.
assert.equal(source.split('matchAudio.play(').length - 1, 9, 'exactly 9 prototype port references');
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
console.log('PASS audio port: site pins (prototype + module homes), wiring, safe play, idempotent close.');
