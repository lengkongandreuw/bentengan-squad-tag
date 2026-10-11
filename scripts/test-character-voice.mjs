import assert from 'node:assert/strict';
import { CHARACTER_VOICE_FILES, characterVoiceAsset, characterVoiceLayerAssets, stopVoiceLayerPlayback } from '../modules/audio/character-voice.ts';

// Table covers all 14 roster voices.
assert.equal(Object.keys(CHARACTER_VOICE_FILES).length, 14);

// Resolver is injected and its result returned verbatim.
const seen = [];
assert.equal(characterVoiceAsset('raja', (file) => { seen.push(file); return `ASSET:${file}`; }), 'ASSET:characters/raja.mp3');
assert.deepEqual(seen, ['characters/raja.mp3']);
assert.equal(characterVoiceAsset('raja', () => { throw new Error('Must not resolve default'); },
  'selection-previews/raja/custom.mp3', file => `/base/${file}`), '/base/selection-previews/raja/custom.mp3');
assert.equal(characterVoiceAsset('unknown-id', () => 'default', 'custom.mp3', () => 'override'), null);

// Missing entry resolves to null without calling the resolver.
let called = false;
assert.equal(characterVoiceAsset('unknown-id', () => { called = true; return 'X'; }), null);
assert.equal(called, false);
let stopped = 0;
const tracks = [1, 2].map(() => ({ audio: { pause: () => stopped++, currentTime: 12 } }));
stopVoiceLayerPlayback(tracks);
assert.equal(stopped, 2); assert.ok(tracks.every(track => track.audio.currentTime === 0));
assert.deepEqual(characterVoiceLayerAssets([
  { file: 'a.mp3', enabled: true, volume: .2, loop: false },
  { file: 'b.mp3', enabled: true, volume: .4, loop: true },
  { file: 'c.mp3', enabled: false, volume: 1, loop: true },
  { file: null, enabled: true, volume: .5, loop: true },
], file => `/base/${file}`), [
  { src: '/base/a.mp3', volume: .2, loop: false }, { src: '/base/b.mp3', volume: .4, loop: true },
]);
console.log('PASS characterVoiceAsset: table coverage, injected resolver, null passthrough.');
