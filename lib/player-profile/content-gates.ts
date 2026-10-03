import type { CharacterId } from '../characters';
import { isCharacterUnlocked } from './character-unlocks';
import { isArenaUnlocked } from './arena-unlocks';
import type { LocalPlayerProfile } from './types';

export const getPlayableCharacterIds = (profile: LocalPlayerProfile | null | undefined, roster: readonly CharacterId[]) =>
  profile ? roster.filter(id => isCharacterUnlocked(profile, id)) : [];

export const getPlayableArenaIds = (profile: LocalPlayerProfile | null | undefined, arenaIds: readonly string[]) =>
  profile ? arenaIds.filter(id => isArenaUnlocked(profile, id)) : [];

export function pickUnlockedCharacter(
  profile: LocalPlayerProfile | null | undefined, roster: readonly CharacterId[], random = Math.random,
): CharacterId | null {
  const choices = getPlayableCharacterIds(profile, roster);
  if (!choices.length) return null;
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random selection tidak valid.');
  return choices[Math.floor(value * choices.length)];
}

export function validatePlayableContent(
  profile: LocalPlayerProfile | null | undefined, characterId: CharacterId, arenaId: string,
  roster: readonly CharacterId[], arenaIds: readonly string[],
): string | null {
  if (!profile) return 'Buat profil pemain sebelum memulai pertandingan.';
  if (!roster.includes(characterId) || !isCharacterUnlocked(profile, characterId))
    return 'Karakter belum terbuka atau tidak tersedia di tim ini.';
  if (!arenaIds.includes(arenaId) || !isArenaUnlocked(profile, arenaId))
    return 'Arena belum terbuka atau tidak tersedia.';
  return null;
}

// Repair stale/direct state only with an explicitly available AND unlocked
// option. Never invent a map ID, and never filter the bot lineup with these APIs.
export function resolvePlayableContent(
  profile: LocalPlayerProfile | null | undefined, characterId: CharacterId, arenaId: string,
  roster: readonly CharacterId[], arenaIds: readonly string[],
) {
  const characters = getPlayableCharacterIds(profile, roster);
  const arenas = getPlayableArenaIds(profile, arenaIds);
  if (!characters.length || !arenas.length) return null;
  return {
    characterId: characters.includes(characterId) ? characterId : characters[0],
    arenaId: arenas.includes(arenaId) ? arenaId : arenas[0],
  };
}
