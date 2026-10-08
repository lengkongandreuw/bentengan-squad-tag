import { progressionRules } from './progression-rules';
import type { MatchResult } from './types';

export type MatchXPSummary = {
  completed: boolean;
  result: MatchResult;
  tags: number;
  rescues: number;
};

export type CurrentLevelProgress = {
  level: number;
  xp: number;
  levelStartXP: number;
  nextLevelXP: number | null;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  xpToNextLevel: number;
  progress: number;
  isMaxLevel: boolean;
};

const validCount = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${name}: gunakan bilangan bulat nonnegatif yang aman.`);
  return value;
};

// Pure helpers: no storage, profile mutations, UI, unlocks or match listeners.
export function getLevelFromXP(xp: number): number {
  validCount(xp, 'XP');
  const thresholds = progressionRules.playerLevelThresholds;
  for (let i = thresholds.length - 1; i >= 0; i--)
    if (xp >= thresholds[i]) return i + 1;
  return 1;
}

// Cumulative XP needed to reach a level, not XP needed from the previous level.
export function getXPRequiredForLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1 ||
      level > progressionRules.playerLevelThresholds.length)
    throw new Error('Level berada di luar konfigurasi progression.');
  return progressionRules.playerLevelThresholds[level - 1];
}

export function getCurrentLevelProgress(xp: number): CurrentLevelProgress {
  const level = getLevelFromXP(xp);
  const levelStartXP = getXPRequiredForLevel(level);
  const nextLevelXP = progressionRules.playerLevelThresholds[level] ?? null;
  const xpForNextLevel = nextLevelXP === null ? null : nextLevelXP - levelStartXP;
  const xpIntoLevel = xp - levelStartXP;
  return {
    level, xp, levelStartXP, nextLevelXP, xpIntoLevel, xpForNextLevel,
    xpToNextLevel: nextLevelXP === null ? 0 : nextLevelXP - xp,
    progress: xpForNextLevel === null ? 1 : xpIntoLevel / xpForNextLevel,
    isMaxLevel: nextLevelXP === null,
  };
}

export function getXPToNextLevel(xp: number): number {
  return getCurrentLevelProgress(xp).xpToNextLevel;
}

export type MatchXPBreakdown = { match: number; victory: number; tag: number; rescue: number };

export function calculateMatchXPBreakdown(summary: MatchXPSummary): MatchXPBreakdown {
  if (!summary || typeof summary.completed !== 'boolean' ||
      !['win', 'loss'].includes(summary.result))
    throw new Error('Ringkasan pertandingan XP tidak valid.');
  const tags = validCount(summary.tags, 'Tag');
  const rescues = validCount(summary.rescues, 'Rescue');
  // Abandoned/incomplete matches award nothing, including action rewards.
  if (!summary.completed) return { match: 0, victory: 0, tag: 0, rescue: 0 };
  const { xpRewards: rewards, xpCaps: caps } = progressionRules;
  return { match: rewards.completeMatch, victory: summary.result === 'win' ? rewards.win : 0,
    tag: Math.min(tags * rewards.tag, caps.tagPerMatch),
    rescue: Math.min(rescues * rewards.rescue, caps.rescuePerMatch) };
}

export function calculateMatchXP(summary: MatchXPSummary): number {
  return validCount(Object.values(calculateMatchXPBreakdown(summary)).reduce((sum, value) => sum + value, 0), 'Total XP');
}
