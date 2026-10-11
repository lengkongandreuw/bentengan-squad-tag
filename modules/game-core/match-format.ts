import MATCH_FORMAT from '../../config/match-format.json' with { type: 'json' };
import type { LegacyTeam } from '../../lib/game-core/types.ts';

// Round-scored match format (FEATURE_MATCH_FORMAT_5_RONDE). Pure decisions only:
// the runtime owns timers, phases and presentation and records results here.

export type ScoredFormatId = 'standard' | 'tournament';
export type MatchFormatId = ScoredFormatId | 'legacy-bo3';
export type TeamTotals = Record<LegacyTeam, number>;
export type RoundRecord = {
  round: number;
  winner: LegacyTeam;
  reason: string;
  points: number;
  durationSec: number;
  final: boolean;
  golden: boolean;
};
export type MatchProgress = {
  formatId: MatchFormatId;
  totalRounds: number;
  points: TeamTotals;
  roundsWon: TeamTotals;
  uniqueCaptures: TeamTotals;
  rounds: RoundRecord[];
  /** The next/current round is the golden round (points tied after all tiebreaks). */
  golden: boolean;
  locked: boolean;
  winner?: LegacyTeam;
};
export type RoundOutcome = {
  record: RoundRecord;
  matchOver: boolean;
  locked: boolean;
  /** True when the match continues into a golden round. */
  goldenNext: boolean;
  winner?: LegacyTeam;
};

export const MATCH_FORMAT_CONFIG = MATCH_FORMAT;
export const LEGACY_ROUND_SECONDS = 240;
export const LEGACY_FULL_CAPTURE_HOLD_SECONDS = 2;
export const MATCH_FORMAT_STORAGE_KEY = 'benteng-match-format-v1';
const FORMATS = MATCH_FORMAT.formats as Record<ScoredFormatId, { label: string; rounds: number }>;
const POINTS = MATCH_FORMAT.points as Record<string, number>;
const MAX_ROUND_POINTS = Math.max(...Object.values(POINTS));

export const isScoredFormat = (id: MatchFormatId): id is ScoredFormatId => id !== 'legacy-bo3';
export const normalizeMatchFormat = (value: unknown): ScoredFormatId =>
  typeof value === 'string' && Object.hasOwn(FORMATS, value)
    ? (value as ScoredFormatId)
    : (MATCH_FORMAT.defaultFormat as ScoredFormatId);
export const matchFormatLabel = (id: ScoredFormatId) => FORMATS[id].label;
export const scoredFormatIds = () => Object.keys(FORMATS) as ScoredFormatId[];

export function loadMatchFormat(): ScoredFormatId {
  try { return normalizeMatchFormat(localStorage.getItem(MATCH_FORMAT_STORAGE_KEY)); }
  catch { return normalizeMatchFormat(null); }
}
export function saveMatchFormat(value: unknown): ScoredFormatId {
  const id = normalizeMatchFormat(value);
  try { localStorage.setItem(MATCH_FORMAT_STORAGE_KEY, id); } catch { /* Optional storage. */ }
  return id;
}

const teams = (): TeamTotals => ({ blue: 0, red: 0 });
export function createMatchProgress(formatId: MatchFormatId): MatchProgress {
  return {
    formatId,
    totalRounds: isScoredFormat(formatId) ? FORMATS[formatId].rounds : 3,
    points: teams(),
    roundsWon: teams(),
    uniqueCaptures: teams(),
    rounds: [],
    golden: false,
    locked: false,
  };
}

export const isFinalRound = (progress: MatchProgress, round: number) =>
  isScoredFormat(progress.formatId) && !progress.golden && round === progress.totalRounds;
export const roundSecondsFor = (progress: MatchProgress) =>
  !isScoredFormat(progress.formatId)
    ? LEGACY_ROUND_SECONDS
    : progress.golden ? MATCH_FORMAT.goldenRound.seconds : MATCH_FORMAT.roundSeconds;
export const fullCaptureHoldSeconds = (progress: MatchProgress) =>
  isScoredFormat(progress.formatId) ? MATCH_FORMAT.fullCaptureHoldSeconds : LEGACY_FULL_CAPTURE_HOLD_SECONDS;
/** Fort lock at round start; the golden round never locks. */
export const fortLockSeconds = (progress: MatchProgress) =>
  isScoredFormat(progress.formatId) && !progress.golden ? MATCH_FORMAT.fort.lockSeconds : 0;
export const pointsFor = (reason: string, final: boolean) =>
  (POINTS[reason] ?? 1) * (final ? MATCH_FORMAT.finalRoundMultiplier : 1);

/** Highest points still obtainable after `completedRound` (regular rounds 3, final round 3×multiplier). */
export function maxRemainingPoints(progress: MatchProgress, completedRound: number) {
  let total = 0;
  for (let r = completedRound + 1; r <= progress.totalRounds; r++)
    total += MAX_ROUND_POINTS * (r === progress.totalRounds ? MATCH_FORMAT.finalRoundMultiplier : 1);
  return total;
}

const leader = (totals: TeamTotals): LegacyTeam | undefined =>
  totals.blue === totals.red ? undefined : totals.blue > totals.red ? 'blue' : 'red';

/**
 * Records one finished round (mutating `progress`) and decides whether the match ends.
 * Legacy best-of-3 keeps the old rule: first to two rounds wins.
 */
export function completeRound(
  progress: MatchProgress,
  result: { round: number; winner: LegacyTeam; reason: string; durationSec: number; uniqueCaptures: TeamTotals },
): RoundOutcome {
  const golden = progress.golden;
  const final = isFinalRound(progress, result.round);
  const scored = isScoredFormat(progress.formatId);
  const points = scored ? pointsFor(result.reason, final) : 0;
  const record: RoundRecord = {
    round: result.round, winner: result.winner, reason: result.reason, points,
    durationSec: Math.max(0, Math.round(result.durationSec)), final, golden,
  };
  progress.rounds.push(record);
  progress.roundsWon[result.winner]++;
  progress.points[result.winner] += points;
  progress.uniqueCaptures.blue += result.uniqueCaptures.blue;
  progress.uniqueCaptures.red += result.uniqueCaptures.red;
  const finish = (winner: LegacyTeam, locked = false): RoundOutcome => {
    progress.winner = winner;
    progress.locked = locked;
    progress.golden = false;
    return { record, matchOver: true, locked, goldenNext: false, winner };
  };
  if (!scored) {
    return progress.roundsWon[result.winner] >= 2
      ? finish(result.winner)
      : { record, matchOver: false, locked: false, goldenNext: false };
  }
  if (golden) return finish(result.winner);
  if (result.round >= progress.totalRounds) {
    const winner = leader(progress.points) ?? leader(progress.roundsWon) ?? leader(progress.uniqueCaptures);
    if (winner) return finish(winner);
    progress.golden = true;
    return { record, matchOver: false, locked: false, goldenNext: true };
  }
  const gap = Math.abs(progress.points.blue - progress.points.red);
  if (gap > maxRemainingPoints(progress, result.round)) return finish(leader(progress.points)!, true);
  return { record, matchOver: false, locked: false, goldenNext: false };
}
