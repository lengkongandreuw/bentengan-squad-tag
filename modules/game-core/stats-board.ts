import type { Team } from '../world/map-data/field-types';
import type { StatsBoard } from './snapshot-types';
import {
  boardRows as boardRowsOf,
  contributionScore,
  ensureStats,
} from '../gameplay/bars-score.ts';

export type BuildStatsBoardInput = {
  phase: string;
  round: number;
  roundWinner?: Team;
  roundEndReason: string;
  resultAnnouncementUntil: number;
  phaseUntil: number;
  matchStartedAt: number;
  fieldName: string;
  score: Record<Team, number>;
  players: Array<{
    id: string;
    name: string;
    team: Team;
    characterId: import('../../lib/characters').CharacterId;
    controlled?: boolean;
  }>;
  roundStats: Record<string, import('../gameplay/bars-score').PlayerStats>;
  matchStats: Record<string, import('../gameplay/bars-score').PlayerStats>;
  isLeaderboardOpen: () => boolean;
};

export const buildStatsBoard = (
  now: number,
  input: BuildStatsBoardInput,
): StatsBoard => {
  const automatic =
    input.phase === 'ROUND_OVER' || input.phase === 'MATCH_OVER';
  const final = input.phase === 'MATCH_OVER';
  const store =
    final || input.isLeaderboardOpen() ? input.matchStats : input.roundStats;
  const rankedPlayers = input.players
    .map((player) => ({
      player,
      contribution: contributionScore(ensureStats(store, player)),
    }))
    .sort(
      (a, b) =>
        b.contribution - a.contribution ||
        ensureStats(store, b.player).tags -
          ensureStats(store, a.player).tags ||
        ensureStats(store, b.player).rescues -
          ensureStats(store, a.player).rescues ||
        a.player.name.localeCompare(b.player.name),
    );
  const mvp = rankedPlayers[0];
  return {
    visible: automatic && now >= input.resultAnnouncementUntil,
    final,
    round: input.round,
    winner: input.roundWinner,
    reason: input.roundEndReason,
    countdown:
      input.phase === 'ROUND_OVER'
        ? Math.max(0, Math.ceil((input.phaseUntil - now) / 1000))
        : 0,
    duration: Math.max(0, (now - input.matchStartedAt) / 1000),
    mapName: input.fieldName,
    format: 'Best of 3',
    mvpId: mvp?.player.id ?? '',
    mvpName: mvp?.player.name ?? '',
    score: { ...input.score },
    teams: {
      blue: boardRowsOf(store, input.players, 'blue', mvp?.player.id ?? ''),
      red: boardRowsOf(store, input.players, 'red', mvp?.player.id ?? ''),
    },
  };
};
