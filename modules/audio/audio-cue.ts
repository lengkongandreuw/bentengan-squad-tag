import { uiAudioAsset } from '../../lib/characters.ts';
import { audioLevels } from '../../lib/audio-settings.ts';

export const playAudioCue = (file: string, volume = 0.55) => {
  try {
    const cue = new Audio(uiAudioAsset(file));
    cue.volume = volume * audioLevels().sfx;
    void cue.play().catch(() => undefined);
  } catch {
    /* Audio tetap opsional pada browser yang memblokir media. */
  }
};
