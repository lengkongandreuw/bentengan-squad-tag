import type { PlayerKdaStats } from './types';

export const PLAYER_PROFILE_SCHEMA_VERSION = 1 as const;
export const PLAYER_PROFILE_STORAGE_KEY = 'bentengan-player-profile-v1';
export const PLAYER_PROFILE_CHANGED_EVENT = 'bentengan-player-profile-changed';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 12;

export const TARGET_TAGS_PER_MATCH = 5;
export const TARGET_RESCUES_PER_MATCH = 3;

export const EMPTY_KDA: PlayerKdaStats = Object.freeze({
  tagMusuh: 0,
  masukPenjara: 0,
  rescueTeam: 0,
});
