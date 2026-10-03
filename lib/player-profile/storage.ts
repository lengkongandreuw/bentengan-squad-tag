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

export const savePlayerProfile = (profile: LocalPlayerProfile): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    // Penyimpanan browser bersifat opsional dan dapat diblokir pengguna.
    return false;
  }
};
