import { getArenaStats } from './arena-stats';
import { getProgressionArenaId, getProgressionArenaIds } from './arena-identity';
import { progressionRules } from './progression-rules';
import type { LocalPlayerProfile } from './types';
import { getLevelFromXP } from './xp-engine';

export function getArenaUnlockRequirement(arenaId: string) {
  const requirement = progressionRules.arenaProgression.unlockRequirements.find(r => r.arenaId === getProgressionArenaId(arenaId));
  return requirement ? {
    ...requirement,
    requiredArenaStats: requirement.requiredArenaStats.map(r => ({ ...r })),
    requiredTierStats: (requirement.requiredTierStats ?? []).map(r => ({ ...r })),
  } : null;
}

export function getArenaUnlockProgress(profile: LocalPlayerProfile, arenaId: string) {
  const requirement = getArenaUnlockRequirement(arenaId);
  const historical = getProgressionArenaIds(arenaId).some(id => profile.progression?.unlockedArenaIds.includes(id));
  const starter = progressionRules.initialUnlocks.arenaIds.includes(getProgressionArenaId(arenaId));
  const checks: { kind: string; id?: string; current: number; required: number; met: boolean }[] = [];
  const check = (kind: string, current: number, required: number, id?: string) =>
    checks.push({ kind, ...(id ? { id } : {}), current, required, met: current >= required });
  if (requirement) {
    check('level', getLevelFromXP(profile.progression?.xp ?? 0), requirement.minLevel);
    check('totalWins', profile.menang, requirement.minTotalWins ?? 0);
    check('tags', profile.kda.tagMusuh, requirement.minTags ?? 0);
    check('rescues', profile.kda.rescueTeam, requirement.minRescues ?? 0);
    for (const r of requirement.requiredArenaStats) {
      const stats = getArenaStats(profile, r.arenaId);
      check('arenaPlayed', stats.played, r.minPlayed, r.arenaId);
      check('arenaWins', stats.wins, r.minWins, r.arenaId);
    }
    for (const r of requirement.requiredTierStats) {
      const tier = progressionRules.arenaProgression.tiers.find(t => t.id === r.tierId)!;
      // Saturate at safe integer; only comparison is needed, never store the sum.
      const wins = tier.arenaIds.reduce((sum, id) =>
        Math.min(Number.MAX_SAFE_INTEGER, sum + getArenaStats(profile, id).wins), 0);
      check('tierWins', wins, r.minWins, r.tierId);
    }
  }
  const eligible = starter || (requirement !== null && checks.every(c => c.met));
  return { arenaId, requirement, checks, eligible, unlocked: historical || eligible };
}

export function isArenaUnlocked(profile: LocalPlayerProfile, arenaId: string): boolean {
  return getArenaUnlockProgress(profile, arenaId).unlocked;
}

export function resolveArenaUnlocks(profile: LocalPlayerProfile) {
  const progression = profile.progression;
  if (!progression) throw new Error('Profil belum memiliki progression; migrasi diperlukan sebelum resolve arena.');
  const unlocked = new Set(progression.unlockedArenaIds);
  const newlyUnlockedArenaIds: string[] = [];
  for (const id of [...progressionRules.initialUnlocks.arenaIds,
    ...progressionRules.arenaProgression.unlockRequirements.map(r => r.arenaId)]) {
    if (!unlocked.has(id) && isArenaUnlocked(profile, id)) {
      unlocked.add(id);
      newlyUnlockedArenaIds.push(id);
    }
  }
  return { profile: { ...profile, progression: { ...progression, unlockedArenaIds: [...unlocked] } },
    newlyUnlockedArenaIds };
}
