import { PLAYER_PROFILE_STORAGE_KEY } from './defaults';
import { parsePlayerProfile } from './migrations';
import type { LocalPlayerProfile } from './types';

export const loadPlayerProfile = (): LocalPlayerProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    return raw ? parsePlayerProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const savePlayerProfile = (profile: LocalPlayerProfile) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Penyimpanan browser bersifat opsional dan dapat diblokir pengguna.
  }
};
