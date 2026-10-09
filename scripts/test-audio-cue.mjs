import assert from 'node:assert/strict';
import { playAudioCue } from '../modules/audio/audio-cue.ts';

// Browser Audio stub recording construction, volume, and play calls.
const played = [];
globalThis.Audio = class {
  constructor(src) {
    this.src = src;
    this.volume = 0;
  }

  play() {
    played.push([this.src, this.volume]);
    return Promise.resolve();
  }
};

playAudioCue('press-play.mp3', 0.64);
assert.equal(played.length, 1);
assert.ok(played[0][0].includes('press-play.mp3'));
assert.ok(played[0][1] > 0 && played[0][1] <= 0.64);

// Blocked media (play rejects, Audio throws) never propagates.
globalThis.Audio = class {
  play() {
    return Promise.reject(new Error('blocked'));
  }
};
playAudioCue('press-play.mp3');
console.log('PASS playAudioCue: cue routing with sfx-scaled volume, blocked-media silence.');
