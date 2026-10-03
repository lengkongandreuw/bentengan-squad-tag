import {
  PLAYER_PROFILE_CHANGED_EVENT,
  PLAYER_PROFILE_SCHEMA_VERSION,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from './defaults';
import { loadPlayerProfile, savePlayerProfile } from './storage';
import type { LocalPlayerProfile, MatchResult, PlayerKdaStats } from './types';
import type { CharacterId } from '../characters';
import { createDefaultProgression } from './progression';
import { applyMatchProgression, type MatchSummary } from './match-progression';

const notifyProfileChanged = () => {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event(PLAYER_PROFILE_CHANGED_EVENT));
};

const persist = (profile: LocalPlayerProfile) => {
  savePlayerProfile(profile);
  notifyProfileChanged();
  return profile;
};

export const normalizeUsername = (value: string) => value.trim().replace(/\s+/g, ' ');

export const usernameError = (value: string): string | null => {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH)
    return `Username minimal ${USERNAME_MIN_LENGTH} karakter.`;
  if (username.length > USERNAME_MAX_LENGTH)
    return `Username maksimal ${USERNAME_MAX_LENGTH} karakter.`;
  return null;
};

const profileId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createPlayerProfile = (usernameInput: string): LocalPlayerProfile => {
  const error = usernameError(usernameInput);
  if (error) throw new Error(error);
  return persist({
    schemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    id: profileId(),
    username: normalizeUsername(usernameInput),
    firstJoin: new Date().toISOString(),
    menang: 0,
    kalah: 0,
    featuredCharacterId: 'raja',
    kda: { tagMusuh: 0, masukPenjara: 0, rescueTeam: 0 },
    progression: createDefaultProgression(),
  });
};

const updateProfile = (
  change: (profile: LocalPlayerProfile) => LocalPlayerProfile,
) => {
  const profile = loadPlayerProfile();
  return profile ? persist(change(profile)) : null;
};

export const recordCompletedMatch = (
  result: MatchResult,
  matchStats: PlayerKdaStats,
) =>
  updateProfile((profile) => ({
    ...profile,
    menang: profile.menang + (result === 'win' ? 1 : 0),
    kalah: profile.kalah + (result === 'loss' ? 1 : 0),
    kda: {
      tagMusuh: profile.kda.tagMusuh + matchStats.tagMusuh,
      masukPenjara: profile.kda.masukPenjara + matchStats.masukPenjara,
      rescueTeam: profile.kda.rescueTeam + matchStats.rescueTeam,
    },
  }));

export const setFeaturedCharacter = (featuredCharacterId: CharacterId) =>
  updateProfile((profile) => ({ ...profile, featuredCharacterId }));

// Synchronous load/resolve/save using the latest stored profile. UI integration
// comes later; this replaces (not supplements) the legacy match writer when used.
export const recordMatchProgression = (summary: MatchSummary) => {
  const profile = loadPlayerProfile();
  if (!profile) return null;
  const result = applyMatchProgression(profile, summary);
  if (result.applied) {
    if (!savePlayerProfile(result.profile)) throw new Error('Reward belum tersimpan; penyimpanan browser gagal.');
    notifyProfileChanged();
  }
  return result;
};
