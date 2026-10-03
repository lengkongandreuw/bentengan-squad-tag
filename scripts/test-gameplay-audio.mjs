import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const source = await readFile(new URL('../lib/gameplay-audio.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture({ missing = [], suspended = false } = {}) {
  const events = [], requests = [], listeners = new Map();
  const levels = { sfx: .85, music: .16 };
  class Node {
    gain = { value: 0, setTargetAtTime(value) { this.value = value; }, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
    frequency = this.gain; Q = this.gain; threshold = this.gain; ratio = this.gain;
    playbackRate = { value: 1 };
    connect() {} disconnect() {}
    start(time) { events.push({ node: this, file: this.buffer?.file, time }); }
    stop() { this.stopped = true; this.onended?.(); }
  }
  class Context {
    currentTime = 1; state = suspended ? 'suspended' : 'running'; sampleRate = 100;
    createDynamicsCompressor() { return new Node(); }
    createGain() { return new Node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    createBufferSource() { return new Node(); }
    createOscillator() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    async decodeAudioData(data) { return { file: data, duration: 6 }; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
  }
  const sandbox = {
    exports: {}, AudioContext: Context, AbortController, setTimeout, clearTimeout,
    Math, audioLevels: () => levels, AUDIO_SETTINGS_EVENT: 'volume',
    publicAsset: file => '/bentengan-squad-tag/' + file,
    window: { addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
    fetch: async url => {
      requests.push(url);
      const file = url.replace('/bentengan-squad-tag/', '');
      return { ok: !missing.includes(file), arrayBuffer: async () => file };
    },
  };
  vm.runInNewContext(code, sandbox);
  return { ...sandbox.exports, events, requests, levels, listeners };
}
async function ready(options) {
  const f = fixture(options), audio = new f.GameplayAudio();
  await audio.unlock(); await audio.preload;
  return { ...f, audio };
}
test('manifest:20 actual assets, Pages path,4 impacts and5 announcers', async () => {
  const f = await ready();
  assert.equal(f.TAG_SAMPLE_FILES.length, 4); assert.equal(f.TAG_COUNTER_FILES.length, 5);
  assert.equal(new Set(f.requests).size, 20);
  assert.ok(f.requests.every(path => path.startsWith('/bentengan-squad-tag/audio/gameplay/')));
  for (const path of f.requests) await access(new URL('../public/' + path.replace('/bentengan-squad-tag/', ''), import.meta.url));
  f.audio.close();
});
test('streak tiers1–5,6+ silent; exact10s expiry and explicit reset', () => {
  const { TagStreakTracker } = fixture(), tracker = new TagStreakTracker();
  for (let n = 1; n <= 5; n++) assert.equal(tracker.tag(n * 1000), n);
  assert.equal(tracker.tag(6000), undefined); assert.equal(tracker.tag(7000), undefined);
  tracker.expire(16999); assert.equal(tracker.count, 7);
  tracker.expire(17000); assert.equal(tracker.count, 0);
  assert.equal(tracker.tag(17001), 1); tracker.reset(); assert.equal(tracker.tag(17002), 1);
});
test('each confirmed player tag gets exactly1 nonrepeating impact and delayed announcer', async () => {
  const f = await ready();
  for (let n = 1; n <= 7; n++) { f.audio.context.currentTime = n; f.audio.playerTag(n * 1000); }
  const impacts = f.events.filter(e => f.TAG_SAMPLE_FILES.includes(e.file));
  const voices = f.events.filter(e => f.TAG_COUNTER_FILES.includes(e.file));
  assert.equal(impacts.length, 7); assert.equal(voices.length, 5);
  impacts.slice(1).forEach((e, i) => assert.notEqual(e.file, impacts[i].file));
  voices.forEach((e, i) => assert.equal(e.time, i + 1 + .15));
  f.audio.resetTagStreak(); assert.ok(voices.every(e => e.node.stopped)); f.audio.close();
});
test('bot impacts, rescue, dash and fort entry do not increment/reset streak', async () => {
  const f = await ready(); f.audio.playerTag(1000);
  for (const sound of ['tag', 'rescue', 'dash', 'fort-enter']) { f.audio.context.currentTime++; f.audio.play(sound); }
  assert.equal(f.audio.streak.count, 1);
  f.audio.expireTagStreak(11000); assert.equal(f.audio.streak.count, 0);
  f.audio.close();
});
test('capture prefers special then generic then procedural, never stacks', async () => {
  for (const missing of [[], ['audio/gameplay/objective-success-benteng.mp3'], ['audio/gameplay/objective-success-benteng.mp3', 'audio/gameplay/objective-success.mp3']]) {
    const f = await ready({ missing }); f.audio.play('fort-captured');
    const custom = f.events.filter(e => e.file);
    assert.equal(custom.length, missing.length === 2 ? 0 : 1);
    if (custom.length) assert.equal(custom[0].file, missing.length ? f.CAPTURE_FALLBACK : f.SAMPLE_FILES['fort-captured']);
    else assert.ok(f.events.length > 0);
    f.audio.close();
  }
});
test('procedural step/prison and missing custom remain available; no fetch per play', async () => {
  const f = await ready({ missing: ['audio/gameplay/boost.mp3'] });
  f.audio.play('dash'); f.audio.play('step'); f.audio.play('prison');
  assert.ok(f.events.length > 0); assert.ok(f.events.every(e => !e.file));
  assert.equal(f.requests.length, 20); f.audio.close();
});
test('volume master remains live, samples compensate3x; close stops sources', async () => {
  const f = await ready(); f.audio.play('ultimate');
  assert.equal(f.audio.output.gain.value, .85 * 3);
  f.levels.sfx = 0; f.listeners.get('volume')(); assert.equal(f.audio.output.gain.value, 0);
  f.levels.sfx = .4; f.listeners.get('volume')(); assert.equal(f.audio.output.gain.value, .4 * 3);
  assert.equal(f.levels.music, .16); f.audio.close();
  assert.ok(f.events.every(e => e.node.stopped)); assert.equal(f.audio.play('victory'), false);
});
test('countdown loading is optional and one-shot; result guard and player-only hooks', async () => {
  const f = await ready({ suspended: true });
  assert.equal(f.audio.play('countdown'), true); assert.equal(f.audio.play('countdown'), false);
  const game = await readFile(new URL('../app/prototype.tsx', import.meta.url), 'utf8');
  assert.match(game, /if \(phase !== 'PLAYING'\) return;\s+gameplayAudio.resetTagStreak\(\)/);
  assert.match(game, /else if \(winner.controlled\) gameplayAudio.playerTag\(now\)/);
  assert.match(game, /if \(!countdownSoundPlayed && now < phaseUntil\) countdownSoundPlayed = gameplayAudio.playCountdown/);
  assert.match(game, /gameplayAudio.play\(team === players\[0\].team \? 'victory' : 'defeat'\)/);
  assert.doesNotMatch(game, /playAudioCue\(\s+team === players\[0\].team \? 'victory.mp3'/);
  f.audio.close();
});
test('whole countdown sample fits existing gameplay countdown, without changing timer', async () => {
  const f = await ready(); f.audio.playCountdown(2.8);
  const cue = f.events.find(e => e.file === f.SAMPLE_FILES.countdown);
  assert.equal(cue.node.playbackRate.value, 6 / 2.8); f.audio.close();
});
