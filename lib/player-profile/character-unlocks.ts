import type { CharacterId } from '../characters';
import { progressionRules } from './progression-rules';
import type { LocalPlayerProfile } from './types';
import { getLevelFromXP, getXPRequiredForLevel } from './xp-engine';

export function getCharacterUnlockRequirement(characterId: CharacterId) {
  const requirement = progressionRules.characterUnlockRequirements.find(
    entry => entry.characterId === characterId,
  );
  return requirement ? { ...requirement, requiredXP: getXPRequiredForLevel(requirement.minLevel) } : null;
}

// Player-only helpers; bots never call these gates. Missing legacy progression
// is read as level 1, without migrating or writing storage.
export function isCharacterUnlocked(profile: LocalPlayerProfile, characterId: CharacterId): boolean {
  if (profile.progression?.unlockedCharacters.includes(characterId) ||
      progressionRules.initialUnlocks.characters.includes(characterId)) return true;
  const requirement = getCharacterUnlockRequirement(characterId);
  return requirement !== null && getLevelFromXP(profile.progression?.xp ?? 0) >= requirement.minLevel;
}

export function getCharacterUnlockProgress(profile: LocalPlayerProfile, characterId: CharacterId) {
  const requirement = getCharacterUnlockRequirement(characterId);
  if (!requirement) return null;
  const currentXP = profile.progression?.xp ?? 0;
  const currentLevel = getLevelFromXP(currentXP);
  const unlocked = isCharacterUnlocked(profile, characterId);
  return {
    ...requirement, currentXP, currentLevel, unlocked,
    xpRemaining: unlocked ? 0 : Math.max(0, requirement.requiredXP - currentXP),
    progress: unlocked || requirement.requiredXP === 0 ? 1 :
      Math.min(1, currentXP / requirement.requiredXP),
  };
}

// Returns a merged profile for a future match resolver to persist. Never relock,
// even after requirements change. Explicitly leave legacy migration to module09.
export function resolveCharacterUnlocks(profile: LocalPlayerProfile) {
  const progression = profile.progression;
  if (!progression) throw new Error('Profil belum memiliki progression; migrasi diperlukan sebelum resolve unlock.');
  const level = getLevelFromXP(progression.xp);
  const unlocked = new Set(progression.unlockedCharacters);
  const newlyUnlockedCharacters: CharacterId[] = [];
  for (const characterId of [
    ...progressionRules.initialUnlocks.characters,
    ...progressionRules.characterUnlockRequirements.filter(r => level >= r.minLevel).map(r => r.characterId),
  ]) {
    if (!unlocked.has(characterId)) {
      unlocked.add(characterId);
      newlyUnlockedCharacters.push(characterId);
    }
  }
  return {
    profile: { ...profile, progression: { ...progression, unlockedCharacters: [...unlocked] } },
    newlyUnlockedCharacters,
  };
}
