import rawRules from '../../config/progression.json';
import { CHARACTERS, type CharacterId } from '../characters';

export type ArenaProgressionTier = {
  id: string;
  arenaIds: string[];
};
export type ArenaUnlockRequirement = {
  arenaId: string;
  tierId: string;
  minLevel: number;
  requiredArenaStats: { arenaId: string; minPlayed: number; minWins: number }[];
};
export type ProgressionRules = {
  version: 1;
  initialUnlocks: { characters: CharacterId[]; arenaIds: string[] };
  xpRewards: { completeMatch: number; win: number; tag: number; rescue: number };
  xpCaps: { tagPerMatch: number; rescuePerMatch: number };
  // Index 0 is level 1. These are cumulative XP thresholds, not per-level costs.
  playerLevelThresholds: number[];
  characterUnlockRequirements: { characterId: CharacterId; minLevel: number }[];
  arenaProgression: {
    tiers: ArenaProgressionTier[];
    unlockRequirements: ArenaUnlockRequirement[];
  };
};

const fail = (path: string): never => {
  throw new Error(`Konfigurasi progression tidak valid: ${path}.`);
};
const record = (v: unknown, path: string): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : fail(path);
const counter = (v: unknown, path: string, min = 0): number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min ? v : fail(path);
const id = (v: unknown, path: string): string =>
  typeof v === 'string' && /^[a-z][a-z0-9_-]*$/.test(v) ? v : fail(path);
const array = (v: unknown, path: string): unknown[] => Array.isArray(v) ? v : fail(path);
const unique = (values: string[], path: string): string[] =>
  new Set(values).size === values.length ? values : fail(`${path} (duplikat)`);
const character = (v: unknown, path: string): CharacterId => {
  const value = id(v, path);
  return CHARACTERS.some(c => c.id === value) ? value as CharacterId : fail(path);
};

// Reject malformed rules explicitly. Never replace bad balancing rules with
// invented rewards/defaults, and never read or write player storage here.
export function parseProgressionRules(value: unknown): ProgressionRules {
  const root = record(value, 'root');
  if (root.version !== 1) fail('version');
  const rewards = record(root.xpRewards, 'xpRewards');
  const caps = record(root.xpCaps, 'xpCaps');
  const initial = record(root.initialUnlocks, 'initialUnlocks');
  const thresholds = array(root.playerLevelThresholds, 'playerLevelThresholds')
    .map((v, i) => counter(v, `playerLevelThresholds[${i}]`));
  if (!thresholds.length || thresholds[0] !== 0 ||
      thresholds.some((v, i) => i > 0 && v <= thresholds[i - 1]))
    fail('playerLevelThresholds (mulai 0 dan meningkat)');
  const level = (v: unknown, path: string) => {
    const n = counter(v, path, 1);
    return n <= thresholds.length ? n : fail(path);
  };
  const unlocks = array(root.characterUnlockRequirements, 'characterUnlockRequirements')
    .map((v, i) => {
      const r = record(v, `characterUnlockRequirements[${i}]`);
      return { characterId: character(r.characterId, `characterUnlockRequirements[${i}].characterId`),
        minLevel: level(r.minLevel, `characterUnlockRequirements[${i}].minLevel`) };
    });
  unique(unlocks.map(r => r.characterId), 'characterUnlockRequirements');
  if (CHARACTERS.some(c => !unlocks.some(r => r.characterId === c.id)))
    fail('characterUnlockRequirements (roster tidak lengkap)');
  const initialCharacters = unique(array(initial.characters, 'initialUnlocks.characters')
    .map(v => character(v, 'initialUnlocks.characters')), 'initialUnlocks.characters') as CharacterId[];
  const starters = unlocks.filter(r => r.minLevel === 1).map(r => r.characterId);
  if (!initialCharacters.length || starters.length !== initialCharacters.length ||
      starters.some(c => !initialCharacters.includes(c))) fail('initialUnlocks.characters (harus setara Lv.1)');
  const initialArenas = unique(array(initial.arenaIds, 'initialUnlocks.arenaIds')
    .map(v => id(v, 'initialUnlocks.arenaIds')), 'initialUnlocks.arenaIds');
  if (!initialArenas.length) fail('initialUnlocks.arenaIds');

  const arena = record(root.arenaProgression, 'arenaProgression');
  const tiers = array(arena.tiers, 'arenaProgression.tiers').map((v, i) => {
    const r = record(v, `arenaProgression.tiers[${i}]`);
    const arenaIds = unique(array(r.arenaIds, 'tier.arenaIds').map(v => id(v, 'tier.arenaIds')), 'tier.arenaIds');
    if (!arenaIds.length) fail('tier.arenaIds');
    return { id: id(r.id, 'tier.id'), arenaIds };
  });
  unique(tiers.map(t => t.id), 'tier.id');
  unique(tiers.flatMap(t => t.arenaIds), 'tier.arenaIds (lintas tier)');
  const arenaUnlocks = array(arena.unlockRequirements, 'arenaProgression.unlockRequirements').map((v, i) => {
    const r = record(v, `arenaProgression.unlockRequirements[${i}]`);
    const arenaId = id(r.arenaId, 'arenaRequirement.arenaId');
    const tierId = id(r.tierId, 'arenaRequirement.tierId');
    if (!tiers.some(t => t.id === tierId && t.arenaIds.includes(arenaId))) fail('arenaRequirement.tierId/arenaId');
    const requiredArenaStats = array(r.requiredArenaStats, 'arenaRequirement.requiredArenaStats').map(v => {
      const stats = record(v, 'requiredArenaStats');
      const arenaId = id(stats.arenaId, 'requiredArenaStats.arenaId');
      const minPlayed = counter(stats.minPlayed, 'requiredArenaStats.minPlayed');
      const minWins = counter(stats.minWins, 'requiredArenaStats.minWins');
      if (minWins > minPlayed) fail('requiredArenaStats.minWins > minPlayed');
      if (arenaId === r.arenaId || (!initialArenas.includes(arenaId) && !tiers.some(t => t.arenaIds.includes(arenaId))))
        fail('requiredArenaStats.arenaId');
      return { arenaId, minPlayed, minWins };
    });
    unique(requiredArenaStats.map(s => s.arenaId), 'requiredArenaStats.arenaId');
    return { arenaId, tierId, minLevel: level(r.minLevel, 'arenaRequirement.minLevel'), requiredArenaStats };
  });
  unique(arenaUnlocks.map(r => r.arenaId), 'arenaRequirement.arenaId');
  return {
    version: 1,
    initialUnlocks: { characters: initialCharacters, arenaIds: initialArenas },
    xpRewards: {
      completeMatch: counter(rewards.completeMatch, 'xpRewards.completeMatch'),
      win: counter(rewards.win, 'xpRewards.win'),
      tag: counter(rewards.tag, 'xpRewards.tag'),
      rescue: counter(rewards.rescue, 'xpRewards.rescue'),
    },
    xpCaps: { tagPerMatch: counter(caps.tagPerMatch, 'xpCaps.tagPerMatch'),
      rescuePerMatch: counter(caps.rescuePerMatch, 'xpCaps.rescuePerMatch') },
    playerLevelThresholds: thresholds,
    characterUnlockRequirements: unlocks,
    arenaProgression: { tiers, unlockRequirements: arenaUnlocks },
  };
}

// Loaded only when imported; no component or gameplay integration in MODULE02.
export const progressionRules = parseProgressionRules(rawRules);
