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
import { TEAM_COLOR, teamName } from '../world/team-tables.ts';
import { recordCompletedMatch } from '../../lib/player-profile/profile-service.ts';

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

export type WinRoundWorld = {
  getPhase: () => string;
  playFortCaptured: (team: Team, volume: number) => void;
  getPlayers: () => Array<{ team: Team }>;
  score: Record<Team, number>;
  setRoundWinner: (v: Team | undefined) => void;
  setRoundEndReason: (v: string) => void;
  setPhase: (v: string) => void;
  setMatchEvents: (events: MatchEvent[]) => void;
  setResultWinner: (v: Team | undefined) => void;
  setResultAnnouncementUntil: (n: number) => void;
  getPendingProfile: () => { tagMusuh?: number; masukPenjara?: number; rescueTeam?: number; [key: string]: unknown };
  setPendingProfile: (v: Record<string, number>) => void;
  getCompletedMatches: () => number;
  setCompletedMatches: (n: number) => void;
  getFieldRotationPending: () => boolean;
  setFieldRotationPending: (v: boolean) => void;
  playAudioCue: (file: string, volume: number) => void;
  setPhaseUntil: (n: number) => void;
  setAnnouncement: (v: string) => void;
  playTone: (frequency: number, duration: number) => void;
  burst: (x: number, y: number, color: string, count: number) => void;
  getWorldWidth: () => number;
  getWorldHeight: () => number;
  log: (text: string) => void;
  now: () => number;
  emptyKda: Record<string, number>;
};

export const createResetRound = (world: ResetRoundWorld) => {
  return (): void => {
    world.clearMouse();
    const players = makePlayers({
      faction: world.getSelectedFaction(),
      selectedId: world.getSelectedId(),
      bases: world.getBases(),
    });
    world.setPlayers(players);
    world.setRoundStats(
      createStatsStore(
        players.map((p: unknown) => (p as { id: string }).id),
      ),
    );
    world.setMatchEvents([]);
    world.setRescueRequest(null);
    world.setRescueRequestCooldownUntil(0);
    const matchStats = world.getMatchStats();
    players.forEach((player: unknown) =>
      ensureStats(matchStats, player as { id: string }),
    );
    const spawnGeometry = createSpawnGeo(
      world.getWorldWidth(),
      world.getObstacles(),
      world.getStudioMap(),
    );
    const seeded = seedRefills(spawnGeometry);
    world.setRefills(seeded.refills);
    world.setRefillId(seeded.nextId);
    world.setTimer(240);
    world.setExitCounter(0);
    world.setTotalCapture({ blue: 0, red: 0 });
    world.setSuddenDeath(false);
    world.setRoundWinner(undefined);
    world.setRoundEndReason('');
    world.setResultWinner(undefined);
    world.setResultAnnouncementUntil(0);
    world.setUltimateImpactAt(0);
    world.setUltimateBuffUntil(0);
    world.setUltimateShieldUntil(0);
    world.setUltimateImpactApplied(false);
    world.setUltimateBannerVisible(false);
    world.setTeamCombos({
      blue: createTeamComboState(),
      red: createTeamComboState(),
    });
    world.setComboCallout('');
    world.setComboCalloutUntil(0);
    world.setPhase('COUNTDOWN');
    world.setPhaseUntil(world.now() + 2800);
    const round = world.getRound();
    const announcement = `RONDE ${round}`;
    world.setAnnouncement(announcement);
    world.log(`Ronde ${round}: 10 pemain menyusun urutan keluar.`);
  };
};

export const createWinRound = (world: WinRoundWorld) => {
  return (team: Team, reason: string): void => {
    if (world.getPhase() !== 'PLAYING') return;
    if (reason === 'BENTENG DIREBUT')
      world.playFortCaptured(team, team === world.getPlayers()[0].team ? 1 : 0.55);
    world.score[team]++;
    world.setRoundWinner(team);
    world.setRoundEndReason(reason);
    const phase = world.score[team] >= 2 ? 'MATCH_OVER' : 'ROUND_OVER';
    world.setPhase(phase);
    const resultNow = world.now();
    world.setMatchEvents([]);
    world.setResultWinner(team);
    world.setResultAnnouncementUntil(resultNow + 1500);
    if (phase === 'MATCH_OVER') {
      const pending = world.getPendingProfile();
      const isWin = team === world.getPlayers()[0].team;
      recordCompletedMatch(isWin ? 'win' : 'loss', pending as never);
      world.setPendingProfile({ ...world.emptyKda });
      const completed = world.getCompletedMatches() + 1;
      world.setCompletedMatches(completed);
      world.setFieldRotationPending(completed >= 3);
      world.playAudioCue(team === world.getPlayers()[0].team ? 'victory.mp3' : 'defeat.mp3', 0.68);
    }
    world.setPhaseUntil(resultNow + (phase === 'MATCH_OVER' ? Number.POSITIVE_INFINITY : 4500));
    const announcement =
      phase === 'MATCH_OVER'
        ? `${teamName(team).toUpperCase()} MENANG MATCH${world.getFieldRotationPending() ? ' · FIELD BERIKUTNYA' : ''}`
        : `${teamName(team).toUpperCase()} MENANG · ${reason}`;
    world.setAnnouncement(announcement);
    world.playTone(team === 'blue' ? 720 : 320, 0.25);
    world.burst(world.getWorldWidth() / 2, world.getWorldHeight() / 2, TEAM_COLOR[team], 38);
    world.log(announcement);
  };
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
