import { CHARACTERS, type CharacterId } from '../characters';
import { progressionRules } from './progression-rules';

export type ArenaProgressionStats = {
  played: number;
  wins: number;
};

export type PlayerProgression = {
  version: number;
  xp: number;
  unlockedCharacters: CharacterId[];
  unlockedArenaIds: string[];
  arenaStats: Record<string, ArenaProgressionStats>;
  processedMatchIds: string[];
  migrationCompletedAt?: string;
};

export const PLAYER_PROGRESSION_VERSION = 1 as const;

// Each profile owns fresh arrays/records; no shared mutable defaults.
export const createDefaultProgression = (): PlayerProgression => ({
  version: PLAYER_PROGRESSION_VERSION,
  xp: 0,
  unlockedCharacters: [...progressionRules.initialUnlocks.characters],
  unlockedArenaIds: [...progressionRules.initialUnlocks.arenaIds],
  arenaStats: {},
  processedMatchIds: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCounter = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isIds = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(id => typeof id === 'string' && id.trim().length > 0);

// Read-only validation, not a migration: missing/invalid data leaves the
// existing profile usable. No XP rewards, unlock evaluation or storage writes.
export const parsePlayerProgression = (value: unknown): PlayerProgression | undefined => {
  if (!isRecord(value) || !isCounter(value.version) || value.version < 1 ||
      !isCounter(value.xp) || !isIds(value.unlockedCharacters) ||
      !value.unlockedCharacters.every(id => CHARACTERS.some(c => c.id === id)) ||
      !isIds(value.unlockedArenaIds) || !isIds(value.processedMatchIds) ||
      !isRecord(value.arenaStats)) return undefined;

  const arenaStats: Record<string, ArenaProgressionStats> = {};
  for (const [id, stats] of Object.entries(value.arenaStats)) {
    if (!id.trim() || !isRecord(stats) || !isCounter(stats.played) ||
        !isCounter(stats.wins) || stats.wins > stats.played) return undefined;
    Object.defineProperty(arenaStats, id, {
      value: { played: stats.played, wins: stats.wins },
      enumerable: true, configurable: true, writable: true,
    });
  }
  if (value.migrationCompletedAt !== undefined &&
      (typeof value.migrationCompletedAt !== 'string' ||
       Number.isNaN(Date.parse(value.migrationCompletedAt)))) return undefined;
  return {
    version: value.version,
    xp: value.xp,
    unlockedCharacters: [...value.unlockedCharacters] as CharacterId[],
    unlockedArenaIds: [...value.unlockedArenaIds],
    arenaStats,
    processedMatchIds: [...value.processedMatchIds],
    ...(value.migrationCompletedAt !== undefined
      ? { migrationCompletedAt: value.migrationCompletedAt as string } : {}),
  };
};
