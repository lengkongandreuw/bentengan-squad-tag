export const AUDIO_SETTINGS_EVENT = 'benteng-audio-settings';
export const MUSIC_PREVIEW_EVENT = 'benteng-music-preview';
export type AudioLevels = { music: number; sfx: number };
export const DEFAULT_AUDIO_LEVELS: AudioLevels = { music: .16, sfx: .85 };
let cached: AudioLevels | null = null;
export const clampVolume = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
export function audioLevels(): AudioLevels {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_LEVELS;
  if (!cached) {
    try {
      const saved = JSON.parse(localStorage.getItem('benteng-audio-levels-v1') || '{}');
      cached = { music: clampVolume(saved.music, .16), sfx: clampVolume(saved.sfx, .85) };
    } catch { cached = { ...DEFAULT_AUDIO_LEVELS }; }
  }
  return cached;
}
export function saveAudioLevels(next: AudioLevels) {
  cached = { music: clampVolume(next.music, .16), sfx: clampVolume(next.sfx, .85) };
  try { localStorage.setItem('benteng-audio-levels-v1', JSON.stringify(cached)); } catch { /* Optional storage. */ }
  window.dispatchEvent(new Event(AUDIO_SETTINGS_EVENT));
}
