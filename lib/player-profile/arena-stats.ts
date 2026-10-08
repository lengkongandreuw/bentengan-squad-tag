import type { ArenaProgressionStats } from './progression';
import type { LocalPlayerProfile } from './types';
import { getProgressionArenaId, getProgressionArenaIds } from './arena-identity.ts';

function validateArenaId(arenaId: string): void {
  if (typeof arenaId !== 'string' || !arenaId.trim())
    throw new Error('Arena ID harus berupa string yang tidak kosong.');
}

// Dynamic IDs, including custom maps. A read never inserts a default entry or
// migrates a legacy profile. Return a copy so callers cannot mutate stored stats.
export function getArenaStats(profile: LocalPlayerProfile, arenaId: string): ArenaProgressionStats {
  validateArenaId(arenaId);
  const stats = profile.progression?.arenaStats;
  const total = { played: 0, wins: 0 };
  for (const id of getProgressionArenaIds(arenaId)) {
    if (!stats || !Object.hasOwn(stats, id)) continue;
    const entry = stats[id];
    if (!entry || !Number.isSafeInteger(entry.played) || !Number.isSafeInteger(entry.wins) ||
        entry.played < 0 || entry.wins < 0 || entry.wins > entry.played)
      throw new Error(`Statistik arena tidak valid: ${id}`);
    total.played += entry.played; total.wins += entry.wins;
    if (!Number.isSafeInteger(total.played) || !Number.isSafeInteger(total.wins))
      throw new Error('Statistik arena melebihi batas bilangan bulat yang aman.');
  }
  return total;
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
  const arenaStats = { ...progression.arenaStats };
  for (const alias of getProgressionArenaIds(arenaId)) delete arenaStats[alias];
  return {
    ...profile,
    progression: {
      ...progression,
      arenaStats: { ...arenaStats, [getProgressionArenaId(arenaId)]: next },
    },
  };
}
