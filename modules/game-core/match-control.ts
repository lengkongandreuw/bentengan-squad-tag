import type { Faction, Team } from '../world/map-data/field-types';
import type { CharacterId } from '../../lib/characters';
import type { MatchEvent, RescueRequest } from './match-types';
import type { RuntimeActor, LegacyTeam, MatchPhase } from '../../lib/game-core/types.ts';
import type { GameEvent } from '../../lib/game-core/events.ts';
import type { PlayerStats } from '../gameplay/bars-score';
import { createStatsStore, ensureStats } from '../gameplay/bars-score.ts';
import { makePlayers } from '../gameplay/roster.ts';
import { seedRefills, spawnGeo as createSpawnGeo } from '../gameplay/spawn.ts';
import type { Refill } from '../gameplay/spawn';
import { createTeamComboState } from '../gameplay/team-combo.ts';
import type { TeamComboState } from '../gameplay/team-combo.ts';

export type ResetRoundWorld = {
  clearMouse: () => void;
  getBases: () => Record<Team, { x: number; y: number }>;
  getSelectedFaction: () => Faction | null;
  getSelectedId: () => CharacterId;
  getWorldWidth: () => number;
  getObstacles: () => import('../world/map-data/field-types').Obstacle[];
  getStudioMap: () => import('../../lib/map-studio-model.js').StudioMap | null;
  getRound: () => number;
  setPlayers: (players: unknown[]) => void;
  getPlayers: () => unknown[];
  setRoundStats: (store: Record<string, PlayerStats>) => void;
  getMatchStats: () => Record<string, PlayerStats>;
  setMatchEvents: (events: MatchEvent[]) => void;
  setRescueRequest: (req: RescueRequest | null) => void;
  setRescueRequestCooldownUntil: (n: number) => void;
  setRefills: (refills: Refill[]) => void;
  setRefillId: (id: number) => void;
  setTimer: (n: number) => void;
  setExitCounter: (n: number) => void;
  setTotalCapture: (v: Record<Team, number>) => void;
  setSuddenDeath: (v: boolean) => void;
  setRoundWinner: (v: Team | undefined) => void;
  setRoundEndReason: (v: string) => void;
  setResultWinner: (v: Team | undefined) => void;
  setResultAnnouncementUntil: (n: number) => void;
  setUltimateImpactAt: (n: number) => void;
  setUltimateBuffUntil: (n: number) => void;
  setUltimateShieldUntil: (n: number) => void;
  setUltimateImpactApplied: (v: boolean) => void;
  setUltimateBannerVisible: (v: boolean) => void;
  setTeamCombos: (v: Record<Team, TeamComboState>) => void;
  setComboCallout: (v: string) => void;
  setComboCalloutUntil: (n: number) => void;
  setPhase: (v: string) => void;
  setPhaseUntil: (n: number) => void;
  setAnnouncement: (v: string) => void;
  log: (text: string) => void;
  now: () => number;
};

export type SuddenDeathPlayer = {
  team: Team;
  state: string;
  capturedIds: string[];
};

export type SuddenDeathState = {
  timer: number;
  suddenDeath: boolean;
  announcement: string;
};

export type SuddenDeathWorld = {
  onWinRound: (team: Team, reason: string) => void;
  onLog: (text: string) => void;
  onTone: (frequency: number, duration: number) => void;
};

// Timer expiry with prisoner/capture tiebreaks, else sudden death.
// Pure decision: tick state returns by value; round wins and effects leave
// through narrow callbacks.
export const stepSuddenDeath = (
  players: SuddenDeathPlayer[],
  state: SuddenDeathState,
  dt: number,
  world: SuddenDeathWorld,
): SuddenDeathState => {
  let timer = state.timer;
  if (!state.suddenDeath) timer -= dt;
  if (!state.suddenDeath && timer <= 0) {
    const blueHeld = players.filter(
      (p) => p.team === 'red' && p.state === 'PRISONER',
    ).length;
    const redHeld = players.filter(
      (p) => p.team === 'blue' && p.state === 'PRISONER',
    ).length;
    const blueUnique = new Set(
      players
        .filter((p) => p.team === 'blue')
        .flatMap((p) => p.capturedIds),
    ).size;
    const redUnique = new Set(
      players.filter((p) => p.team === 'red').flatMap((p) => p.capturedIds),
    ).size;
    if (blueHeld !== redHeld)
      world.onWinRound(blueHeld > redHeld ? 'blue' : 'red', 'WAKTU HABIS');
    else if (blueUnique !== redUnique)
      world.onWinRound(blueUnique > redUnique ? 'blue' : 'red', 'TANGKAPAN UNIK');
    else {
      world.onLog('Skor seri—tag atau rebut benteng berikutnya menang.');
      world.onTone(760, 0.22);
      return {
        timer: 0,
        suddenDeath: true,
        announcement: 'SUDDEN DEATH',
      };
    }
  }
  return { timer, suddenDeath: state.suddenDeath, announcement: state.announcement };
};

// Arena rotation decision: advance to the next ordered field once the
// threshold is met, otherwise stay put. Moved verbatim from lib/field-cycle.
export const fieldCycleDecision = (
  currentId: string,
  completedMatches: number,
  orderedIds: string[],
  threshold = 3,
): { fieldId: string; wins: number; rotated: boolean } => {
  if (completedMatches < threshold) return { fieldId: currentId, wins: completedMatches, rotated: false };
  const currentIndex = Math.max(0, orderedIds.indexOf(currentId));
  return {
    fieldId: orderedIds[(currentIndex + 1) % orderedIds.length],
    wins: 0,
    rotated: true,
  };
};

// Arena rotation every three completed matches. Returns the next field and
// the reset win count, or null while the threshold is unmet (so the owner
// skips its selection write and avoids a redundant render).
export const pendingFieldRotation = (
  completedMatches: number,
  selectedFieldId: string,
  fieldIds: string[],
): { wins: number; fieldId: string } | null => {
  if (completedMatches < 3) return null;
  const decision = fieldCycleDecision(selectedFieldId, completedMatches, fieldIds);
  return { wins: decision.wins, fieldId: decision.fieldId };
};

// Landing video rotation: random arena except the current one.
export const nextLandingArenaId = <T extends string>(
  currentId: T,
  fieldIds: T[],
  pick: (count: number) => number,
): T => {
  const choices = fieldIds.filter((id) => id !== currentId);
  return choices[pick(choices.length)];
};

// Field-card stepping with wrap-around (keyboard arrows and prev/next buttons
// share this one cycler).
export const stepFieldId = <T extends string>(
  currentId: T,
  direction: -1 | 1,
  fieldIds: T[],
): T => {
  const index = fieldIds.findIndex((id) => id === currentId);
  return fieldIds[(index + direction + fieldIds.length) % fieldIds.length];
};
// Moved verbatim from lib/game-core/match-rules.ts (R10).
export type RoundResult = Extract<GameEvent, { type: 'ROUND_ENDED' | 'MATCH_ENDED' }> & { phase: 'ROUND_OVER' | 'MATCH_OVER'; phaseUntil: number };
export function suddenDeathTagWinner(suddenDeath: boolean, team: LegacyTeam) {
  return suddenDeath ? { team, reason: 'SUDDEN DEATH TAG' } : null;
}
/** Best-of-three authority; caller presents and persists the returned result once. */
export function endRound(players: RuntimeActor[], score: Record<LegacyTeam, number>, phase: MatchPhase, team: LegacyTeam, reason: string, now: number): RoundResult | null {
  if (phase !== 'PLAYING') return null;
  for (const actor of players) actor.flight = null;
  score[team]++;
  const complete = score[team] >= 2;
  return { type: complete ? 'MATCH_ENDED' : 'ROUND_ENDED', team, reason, phase: complete ? 'MATCH_OVER' : 'ROUND_OVER', phaseUntil: now + (complete ? Infinity : 4500) };
}
export function stepMatchTimer(players: RuntimeActor[], timer: number, suddenDeath: boolean, dt: number) {
  if (suddenDeath) return { timer, suddenDeath, winner: null };
  timer -= dt;
  if (timer > 0) return { timer, suddenDeath, winner: null };
  const blueHeld = players.filter((p) => p.team === 'red' && p.state === 'PRISONER').length;
  const redHeld = players.filter((p) => p.team === 'blue' && p.state === 'PRISONER').length;
  const unique = (team: LegacyTeam) => new Set(players.filter((p) => p.team === team).flatMap((p) => p.capturedIds)).size;
  const blueUnique = unique('blue'), redUnique = unique('red');
  if (blueHeld !== redHeld) return { timer, suddenDeath, winner: { team: (blueHeld > redHeld ? 'blue' : 'red') as LegacyTeam, reason: 'WAKTU HABIS' } };
  if (blueUnique !== redUnique) return { timer, suddenDeath, winner: { team: (blueUnique > redUnique ? 'blue' : 'red') as LegacyTeam, reason: 'TANGKAPAN UNIK' } };
  return { timer: 0, suddenDeath: true, winner: null };
}
export function phaseTransition(phase: MatchPhase, until: number, now: number, nextRoundRequested: boolean) {
  if (phase === 'COUNTDOWN') return now >= until ? 'start-round' : 'countdown';
  if (phase === 'ROUND_OVER' && (now >= until || nextRoundRequested)) return 'next-round';
  return phase === 'MATCH_OVER' ? 'finished' : 'continue';
}
