import { ULTIMATE_CHARACTER_IDS, type CharacterId } from '../../lib/characters.ts';
import type { Team } from '../world/map-data/field-types';

export type PlayerStats = {
  tags: number;
  prisons: number;
  rescues: number;
};

export type StatsStores = {
  round: Record<string, PlayerStats>;
  match: Record<string, PlayerStats>;
};

// Fresh zeroed stats. Every entry is a new object; stores never share refs.
export const emptyStats = (): PlayerStats => ({ tags: 0, prisons: 0, rescues: 0 });

export const createStatsStore = (playerIds: string[]): Record<string, PlayerStats> =>
  Object.fromEntries(playerIds.map((id) => [id, emptyStats()]));

export const ensureStats = (
  store: Record<string, PlayerStats>,
  player: { id: string },
) => (store[player.id] ??= emptyStats());

export const addStat = (
  stores: StatsStores,
  player: { id: string },
  key: keyof PlayerStats,
  amount = 1,
) => {
  ensureStats(stores.round, player)[key] += amount;
  ensureStats(stores.match, player)[key] += amount;
};

export const contributionScore = (stats: PlayerStats) =>
  stats.tags * 100 + stats.rescues * 120 - stats.prisons * 40;

// Minimal player facet for leaderboard rows. Only these fields cross the seam.
type BoardPlayerFacet = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
};

export type BoardRow = Omit<BoardPlayerFacet, 'team'> &
  PlayerStats & { contribution: number; mvp: boolean };

// One team's leaderboard rows, preserving input order. Pure: reads the given
// store and players, allocates fresh row objects.
export const boardRows = (
  store: Record<string, PlayerStats>,
  players: BoardPlayerFacet[],
  team: Team,
  mvpId: string,
): BoardRow[] =>
  players
    .filter((player) => player.team === team)
    .map((player) => ({
      id: player.id,
      name: player.name,
      characterId: player.characterId,
      controlled: player.controlled,
      ...ensureStats(store, player),
      contribution: contributionScore(ensureStats(store, player)),
      mvp: player.id === mvpId,
    }));

// Ultimate meter charge. Bots and non-ultimate characters never charge;
// the meter clamps to 0–100. Pure: callers reassign the returned value.
export const chargeUltimateMeter = (
  meter: number,
  controlled: boolean | undefined,
  characterId: CharacterId,
  amount: number,
): number => {
  if (!controlled || !ULTIMATE_CHARACTER_IDS.has(characterId)) return meter;
  return Math.min(100, Math.max(0, meter + amount));
};
