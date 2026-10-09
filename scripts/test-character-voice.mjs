import assert from 'node:assert/strict';
import { CHARACTER_VOICE_FILES, characterVoiceAsset } from '../modules/audio/character-voice.ts';

// Table covers all 14 roster voices.
assert.equal(Object.keys(CHARACTER_VOICE_FILES).length, 14);

// Resolver is injected and its result returned verbatim.
const seen = [];
assert.equal(characterVoiceAsset('raja', (file) => { seen.push(file); return `ASSET:${file}`; }), 'ASSET:characters/raja.mp3');
assert.deepEqual(seen, ['characters/raja.mp3']);

// Missing entry resolves to null without calling the resolver.
let called = false;
assert.equal(characterVoiceAsset('unknown-id', () => { called = true; return 'X'; }), null);
assert.equal(called, false);
console.log('PASS characterVoiceAsset: table coverage, injected resolver, null passthrough.');
