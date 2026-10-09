import { audioLevels } from '../../lib/audio-settings.ts';

let audio: AudioContext | null = null;

export const playTone = (frequency: number, duration = 0.08): void => {
  if (audioLevels().sfx === 0) return;
  try {
    audio ??= new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = Math.max(0.0001, 0.05 * audioLevels().sfx);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.stop(audio.currentTime + duration);
  } catch {
    /* optional */
  }
};

export const closeToneAudio = (): void => {
  if (audio) {
    void audio.close();
    audio = null;
  }
};