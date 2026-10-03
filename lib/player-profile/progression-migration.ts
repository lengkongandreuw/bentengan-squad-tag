import { CHARACTERS, type CharacterId } from '../characters';
import { resolveArenaUnlocks } from './arena-unlocks';
import { resolveCharacterUnlocks } from './character-unlocks';
import { MAX_PROCESSED_MATCH_IDS } from './match-identity';
import { createDefaultProgression, parsePlayerProgression, PLAYER_PROGRESSION_VERSION,
  type ArenaProgressionStats } from './progression';
import { progressionRules } from './progression-rules';
import type { LocalPlayerProfile } from './types';

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
const safeCounter = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
const ids = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((v): v is string => typeof v === 'string' && !!v.trim()))] : [];

// Aggregate history has no per-match cap information. BigInt avoids overflow
// before saturation to the XP engine's supported safe-integer range.
export function estimateHistoricalXP(profile: LocalPlayerProfile): number {
  const count = (v: unknown) => BigInt(typeof v === 'number' && Number.isFinite(v) && v >= 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v)) : 0);
  const rewards = progressionRules.xpRewards;
  const total = (count(profile.menang) + count(profile.kalah)) * BigInt(rewards.completeMatch) +
    count(profile.menang) * BigInt(rewards.win) + count(profile.kda?.tagMusuh) * BigInt(rewards.tag) +
    count(profile.kda?.rescueTeam) * BigInt(rewards.rescue);
  return Number(total > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : total);
}

// Pure migration. Storage supplies raw optional data so malformed entries can
// be recovered individually, rather than discarding every historical unlock.
// Current valid/new profiles and future versions are never downgraded/re-awarded.
export function migratePlayerProgression(
  profile: LocalPlayerProfile, rawProgression: unknown = profile.progression,
  completedAt = new Date().toISOString(),
) {
  const parsed = parsePlayerProgression(rawProgression);
  if (parsed && parsed.version >= PLAYER_PROGRESSION_VERSION)
    return { profile, migrated: false };
  if (Number.isNaN(Date.parse(completedAt))) throw new Error('Waktu migrasi tidak valid.');
  const raw = record(rawProgression);
  const arenaStats: Record<string, ArenaProgressionStats> = {};
  for (const [id, value] of Object.entries(record(raw.arenaStats))) {
    const entry = record(value);
    const played = safeCounter(entry.played);
    const wins = safeCounter(entry.wins);
    if (id.trim() && played !== undefined && wins !== undefined && wins <= played)
      Object.defineProperty(arenaStats, id, {
        value: { played, wins }, enumerable: true, writable: true, configurable: true,
      });
  }
  const defaults = createDefaultProgression();
  const candidate: LocalPlayerProfile = {
    ...profile,
    progression: {
      ...defaults,
      xp: Math.max(estimateHistoricalXP(profile), safeCounter(raw.xp) ?? 0),
      unlockedCharacters: [...new Set([...defaults.unlockedCharacters,
        ...ids(raw.unlockedCharacters).filter((id): id is CharacterId => CHARACTERS.some(c => c.id === id))])],
      unlockedArenaIds: [...new Set([...defaults.unlockedArenaIds, ...ids(raw.unlockedArenaIds)])],
      arenaStats,
      processedMatchIds: ids(raw.processedMatchIds).slice(-MAX_PROCESSED_MATCH_IDS),
      migrationCompletedAt: completedAt,
    },
  };
  // Only trustworthy per-arena stats can satisfy tier wins; no fabricated wins.
  const characters = resolveCharacterUnlocks(candidate);
  const arenas = resolveArenaUnlocks(characters.profile);
  return { profile: arenas.profile, migrated: true };
}
