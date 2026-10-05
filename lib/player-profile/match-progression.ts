import type { CharacterId } from '../characters';
import { creditTokens, getTokenBalance } from './economy';
import { migratePlayerEconomy } from './economy-migration';
import { calculateMatchTokenBreakdown, zeroTokenBreakdown, type MatchTokenBreakdown } from './match-token-rewards';
import { applyArenaMatchStat } from './arena-stats';
import { resolveArenaUnlocks } from './arena-unlocks';
import { resolveCharacterUnlocks, getNextCharacterGoal } from './character-unlocks';
import { MAX_PROCESSED_MATCH_IDS } from './match-identity';
import type { LocalPlayerProfile } from './types';
import { calculateMatchXPBreakdown, getCurrentLevelProgress, getLevelFromXP,
  type MatchXPSummary, type MatchXPBreakdown, type CurrentLevelProgress } from './xp-engine';

// Reuse XP action/completion fields. won is adapted to the existing win/loss
// result enum only at the XP boundary. No parallel UI reward calculation.
export type MatchSummary = Omit<MatchXPSummary, 'result'> & {
  matchId: string;
  arenaId: string;
  won: boolean;
  timesCaptured?: number;
};
export type ProgressionResult = {
  profile: LocalPlayerProfile;
  applied: boolean;
  reason: 'applied' | 'incomplete' | 'duplicate';
  xpEarned: number;
  tokenEarned: number;
  tokenBreakdown: MatchTokenBreakdown;
  previousTokenBalance: number;
  currentTokenBalance: number;
  xpBreakdown: MatchXPBreakdown;
  levelProgress: CurrentLevelProgress;
  nextCharacter: ReturnType<typeof getNextCharacterGoal>;
  previousXP: number;
  currentXP: number;
  previousLevel: number;
  currentLevel: number;
  newlyUnlockedCharacters: CharacterId[];
  newlyUnlockedArenaIds: string[];
};

function safeCount(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Counter progression tidak valid atau melebihi batas aman.');
  return value;
}

// Pure transform. recordMatchProgression is the storage boundary; callers must
// not additionally call recordCompletedMatch for this same match (double totals).
export function applyMatchProgression(profile: LocalPlayerProfile, summary: MatchSummary): ProgressionResult {
  if (!summary || typeof summary.matchId !== 'string' || !summary.matchId.trim() ||
      typeof summary.arenaId !== 'string' || !summary.arenaId.trim() || typeof summary.won !== 'boolean')
    throw new Error('Identitas/hasil pertandingan progression tidak valid.');
  const xpBreakdown = calculateMatchXPBreakdown({ ...summary, result: summary.won ? 'win' : 'loss' });
  const earned = safeCount(Object.values(xpBreakdown).reduce((sum, value) => sum + value, 0));
  const captured = safeCount(summary.timesCaptured ?? 0);
  const progression = profile.progression;
  if (!progression) throw new Error('Profil belum memiliki progression; migrasi diperlukan sebelum reward match.');
  const previousXP = progression.xp;
  const previousLevel = getLevelFromXP(previousXP);
  const unchanged: ProgressionResult = {
    profile, applied: false, reason: 'incomplete', xpEarned: 0,
    tokenEarned: 0, tokenBreakdown: zeroTokenBreakdown(),
    previousTokenBalance: getTokenBalance(profile), currentTokenBalance: getTokenBalance(profile),
    xpBreakdown: { match: 0, victory: 0, tag: 0, rescue: 0 },
    levelProgress: getCurrentLevelProgress(previousXP), nextCharacter: getNextCharacterGoal(profile),
    previousXP, currentXP: previousXP, previousLevel, currentLevel: previousLevel,
    newlyUnlockedCharacters: [], newlyUnlockedArenaIds: [],
  };
  if (!summary.completed) return unchanged;
  if (progression.processedMatchIds.includes(summary.matchId))
    return { ...unchanged, reason: 'duplicate' };
  const currentXP = safeCount(previousXP + earned);
  const updated = applyArenaMatchStat({
    ...profile,
    menang: safeCount(profile.menang + (summary.won ? 1 : 0)),
    kalah: safeCount(profile.kalah + (summary.won ? 0 : 1)),
    kda: {
      tagMusuh: safeCount(profile.kda.tagMusuh + summary.tags),
      rescueTeam: safeCount(profile.kda.rescueTeam + summary.rescues),
      masukPenjara: safeCount(profile.kda.masukPenjara + captured),
    },
    progression: { ...progression, xp: currentXP,
      processedMatchIds: [...new Set([...progression.processedMatchIds, summary.matchId])]
        .slice(-MAX_PROCESSED_MATCH_IDS),
    },
  }, summary.arenaId, summary.won);
  const characters = resolveCharacterUnlocks(updated);
  const arenas = resolveArenaUnlocks(characters.profile);
  // Reuse the existing incomplete/processedMatchIds decisions above. Commit
  // TOKEN, XP, counters and unlocks together through recordMatchProgression.
  const tokenBreakdown = calculateMatchTokenBreakdown({ ...summary, result: summary.won ? 'win' : 'loss' });
  const tokenEarned = safeCount(Object.values(tokenBreakdown).reduce((sum,value)=>sum+value,0));
  const walletProfile = migratePlayerEconomy(arenas.profile).profile;
  const previousTokenBalance = getTokenBalance(walletProfile);
  let rewardedProfile = walletProfile;
  if (tokenEarned > 0) {
    const credit = creditTokens(walletProfile,{ transactionId: `match:${summary.matchId}`, amount: tokenEarned,
      type: 'match_reward', referenceId: summary.matchId });
    if (!credit.applied) throw new Error(`Reward DOI gagal: ${credit.reason}. Profil belum diubah.`);
    rewardedProfile = credit.profile;
  }
  return {
    profile: rewardedProfile, applied: true, reason: 'applied', xpEarned: earned,
    tokenEarned, tokenBreakdown, previousTokenBalance, currentTokenBalance: getTokenBalance(rewardedProfile),
    xpBreakdown, levelProgress: getCurrentLevelProgress(currentXP),
    nextCharacter: getNextCharacterGoal(arenas.profile),
    previousXP, currentXP, previousLevel, currentLevel: getLevelFromXP(currentXP),
    newlyUnlockedCharacters: characters.newlyUnlockedCharacters,
    newlyUnlockedArenaIds: arenas.newlyUnlockedArenaIds,
  };
}
