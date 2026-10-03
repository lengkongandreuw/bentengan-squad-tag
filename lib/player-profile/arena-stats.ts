import type { ArenaProgressionStats } from './progression';
import type { LocalPlayerProfile } from './types';

function validateArenaId(arenaId: string): void {
  if (typeof arenaId !== 'string' || !arenaId.trim())
    throw new Error('Arena ID harus berupa string yang tidak kosong.');
}

// Dynamic IDs, including custom maps. A read never inserts a default entry or
// migrates a legacy profile. Return a copy so callers cannot mutate stored stats.
export function getArenaStats(profile: LocalPlayerProfile, arenaId: string): ArenaProgressionStats {
  validateArenaId(arenaId);
  const stats = profile.progression?.arenaStats;
  if (!stats || !Object.hasOwn(stats, arenaId)) return { played: 0, wins: 0 };
  const entry = stats[arenaId];
  if (!entry || !Number.isSafeInteger(entry.played) || !Number.isSafeInteger(entry.wins) ||
      entry.played < 0 || entry.wins < 0 || entry.wins > entry.played)
    throw new Error(`Statistik arena tidak valid: ${arenaId}`);
  return { played: entry.played, wins: entry.wins };
}

// Exactly one completed match per explicit call. The future match resolver must
// handle completion and duplicate protection; this module does not persist.
export function applyArenaMatchStat(
  profile: LocalPlayerProfile, arenaId: string, won: boolean,
): LocalPlayerProfile {
  validateArenaId(arenaId);
  if (typeof won !== 'boolean') throw new Error('Hasil kemenangan harus berupa boolean.');
  const progression = profile.progression;
  if (!progression) throw new Error('Profil belum memiliki progression; migrasi diperlukan sebelum update statistik arena.');
  const previous = getArenaStats(profile, arenaId);
  const next = { played: previous.played + 1, wins: previous.wins + (won ? 1 : 0) };
  if (!Number.isSafeInteger(next.played) || !Number.isSafeInteger(next.wins))
    throw new Error('Statistik arena melebihi batas bilangan bulat yang aman.');
  return {
    ...profile,
    progression: {
      ...progression,
      arenaStats: { ...progression.arenaStats, [arenaId]: next },
    },
  };
}
