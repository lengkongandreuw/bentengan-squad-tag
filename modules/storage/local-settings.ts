// Local-only browser settings. Sync, never throws, no backend claims.
// If a real second backend appears, this interface becomes Promise-based.
const MUSIC_MUTED_KEY = 'bentengan:music-muted';
const AUDIO_LEVELS_KEY = 'benteng-audio-levels-v1';

export type LevelSnapshot = { music: number; sfx: number };

export function loadMusicMuted(): boolean {
  try {
    return window.localStorage.getItem(MUSIC_MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMusicMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUSIC_MUTED_KEY, muted ? '1' : '0');
  } catch {
    /* Preferensi audio tetap opsional jika storage browser diblokir. */
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function loadLevelSnapshot(): LevelSnapshot | null {
  try {
    const saved: unknown = JSON.parse(
      window.localStorage.getItem(AUDIO_LEVELS_KEY) || '{}',
    );
    if (!saved || typeof saved !== 'object') return null;
    const { music, sfx } = saved as { music?: unknown; sfx?: unknown };
    if (!isFiniteNumber(music) || !isFiniteNumber(sfx)) return null;
    return { music, sfx };
  } catch {
    return null;
  }
}

export function saveLevelSnapshot(levels: LevelSnapshot): void {
  try {
    window.localStorage.setItem(AUDIO_LEVELS_KEY, JSON.stringify(levels));
  } catch {
    /* Optional storage. */
  }
}
