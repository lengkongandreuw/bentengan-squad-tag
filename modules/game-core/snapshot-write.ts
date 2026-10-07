import type { Team } from '../world/map-data/field-types';
import type { CharacterId } from '../../lib/characters';
import type { PlayerState } from './match-types';
import type { Snapshot } from './snapshot-types';
import type { FortPlayerFacet } from '../gameplay/base';
import type { Refill } from '../gameplay/spawn';

type TeamComboState = {
  step: number;
  surgeUntil: number;
  expiresAt: number;
  lastActorId: string;
};
type FortOccupantResult = { name: string } | undefined;

export type SnapshotWriteWorld = {
  canvas: HTMLCanvasElement;
  getLastHud: () => number;
  setLastHud: (value: number) => void;
  getPlayers: () => Array<{
    id: string;
    name: string;
    team: Team;
    characterId: CharacterId;
    controlled?: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: PlayerState;
    boost: number;
    baseCharge: number;
    exitOrder: number;
    fortCharge: number;
    captures: number;
    action?: string;
    actionUntil: number;
    parkourUntil: number;
    ultimateShieldUntil: number;
    rescueShieldUntil: number;
    fallNoticeUntil: number;
    waterEnteredAt: number;
    waterFallUntil: number;
    exitDeadline: number;
    boostReadyAt: number;
  }>;
  bases: Record<Team, { x: number; y: number }>;
  baseRadius: number;
  getFieldId: () => string;
  hitsObstacle: (x: number, y: number) => boolean;
  fortOccupant: (
    players: FortPlayerFacet[],
    bases: Record<Team, { x: number; y: number }>,
    baseRadius: number,
    kanal: boolean,
    baseTeam: Team,
    exceptId?: string,
  ) => FortOccupantResult;
  getTeamCombos: () => Record<Team, TeamComboState>;
  teamComboSeconds: (state: TeamComboState, now: number) => number;
  getScore: () => Record<Team, number>;
  getRound: () => number;
  getTimer: () => number;
  getLogs: () => string[];
  getMission: () => Snapshot['mission'];
  getSelected: () => { boost: number };
  getCharacterBoost: (id: CharacterId) => number;
  getUltimateMeter: () => number;
  getUltimateShieldUntil: () => number;
  getUltimateBuffUntil: () => number;
  getUltimateKind: (id: CharacterId) => string | undefined;
  getMatchEvents: () => Array<{ expiresAt: number; [key: string]: unknown }>;
  getRescueRequest: () => { requesterId: string; expiresAt: number } | null;
  getRescueRequestCooldownUntil: () => number;
  getResultWinner: () => Team | undefined;
  getResultAnnouncementUntil: () => number;
  getPhase: () => string;
  getRoundEndReason: () => string;
  getPhaseUntil: () => number;
  getMatchStartedAt: () => number;
  getFieldName: () => string;
  getCompletedMatches: () => number;
  getComboCallout: () => string;
  getComboCalloutUntil: () => number;
  isLeaderboardOpen: () => boolean;
  buildStatsBoard: (now: number) => Snapshot['statsBoard'];
  setSnapshot: (updater: (prev: Snapshot) => Snapshot) => void;
  getSnapshot: () => Snapshot;
  getRefills: () => Refill[];
  getPaused: () => boolean;
  getSuddenDeath: () => boolean;
};

export const createSnapshotWriter = (world: SnapshotWriteWorld) => {
  return (now: number): void => {
    if (now - world.getLastHud() <= 100) return;
    world.setLastHud(now);
    const players = world.getPlayers();
    const me = players[0];
    const bases = world.bases;
    const baseRadius = world.baseRadius;
    const fieldId = world.getFieldId();
    const score = world.getScore();
    const round = world.getRound();
    const timer = world.getTimer();
    const logs = world.getLogs();
    const mission = world.getMission();
    const selected = world.getSelected();
    const ultimateMeter = world.getUltimateMeter();
    const ultimateShieldUntil = world.getUltimateShieldUntil();
    const ultimateBuffUntil = world.getUltimateBuffUntil();
    const matchEvents = world.getMatchEvents();
    const rescueRequest = world.getRescueRequest();
    const rescueRequestCooldownUntil = world.getRescueRequestCooldownUntil();
    const resultWinner = world.getResultWinner();
    const resultAnnouncementUntil = world.getResultAnnouncementUntil();
    const phase = world.getPhase();
    const completedMatches = world.getCompletedMatches();
    const comboCallout = world.getComboCallout();
    const comboCalloutUntil = world.getComboCalloutUntil();
    const refills = world.getRefills();
    const paused = world.getPaused();
    const suddenDeath = world.getSuddenDeath();
    const teamCombos = world.getTeamCombos();
    const blueLock = world.fortOccupant(players, bases, baseRadius, fieldId === 'kanal2', 'blue') as { name: string } | undefined;
    const redLock = world.fortOccupant(players, bases, baseRadius, fieldId === 'kanal2', 'red') as { name: string } | undefined;
    world.canvas.dataset.playerPosition = `${me.x.toFixed(1)},${me.y.toFixed(1)}`;
    world.canvas.dataset.embeddedPlayers = String(
      players.filter((p) => p.state !== 'PRISONER' && world.hitsObstacle(p.x, p.y)).length,
    );
    world.canvas.dataset.aiMoving = String(
      players.slice(1).filter((p) => p.state !== 'PRISONER' && Math.hypot(p.vx, p.vy) > 8).length,
    );
    world.canvas.dataset.enemyCaptures = String(
      players.filter((p) => p.team !== me.team).reduce((sum, p) => sum + p.captures, 0),
    );
    world.canvas.dataset.teamCombo = `${teamCombos[me.team].step}:${world.teamComboSeconds(teamCombos[me.team], now)}`;
    const playerCombo = teamCombos[me.team];
    const snapshot = world.getSnapshot();
    world.setSnapshot(() => ({
      ...snapshot,
      blue: score.blue,
      red: score.red,
      round,
      timer,
      boost: (me.boost / selected.boost) * 100,
      boostCountdown: me.boost >= selected.boost || !me.boostReadyAt ? 0 : Math.max(0, Math.ceil((me.boostReadyAt - now) / 1000)),
      order: me.exitOrder,
      state: me.state as Snapshot['state'],
      paused,
      logs: [...logs],
      mission: { ...mission },
      team: players
        .filter((p) => p.team === me.team)
        .map((p) => ({
          name: p.name,
          characterId: p.characterId,
          state: p.state as Snapshot['team'][number]['state'],
          boost: (p.boost / world.getCharacterBoost(p.characterId)) * 100,
        })),
      blueHeld: players.filter((p) => p.team === 'red' && p.state === 'PRISONER').length,
      redHeld: players.filter((p) => p.team === 'blue' && p.state === 'PRISONER').length,
      pickupCount: refills.length,
      fortLock: blueLock ? `Merah dikunci ${blueLock.name}` : redLock ? `Hijau dikunci ${redLock.name}` : 'Benteng terbuka',
      baseGrace: me.state === 'IN_BASE' && me.exitDeadline ? Math.max(0, Math.ceil((me.exitDeadline - now) / 1000)) : 0,
      suddenDeath,
      fieldWins: completedMatches,
      comboLevel: playerCombo.step,
      comboRemaining: playerCombo.surgeUntil > now ? 0 : world.teamComboSeconds(playerCombo, now),
      comboSurgeRemaining: playerCombo.surgeUntil > now ? world.teamComboSeconds(playerCombo, now) : 0,
      comboCallout: now < comboCalloutUntil ? comboCallout : '',
      ultimateMeter,
      ultimateBuffRemaining:
        now < (world.getUltimateKind(me.characterId) === 'shield' ? ultimateShieldUntil : ultimateBuffUntil)
          ? Math.ceil(((world.getUltimateKind(me.characterId) === 'shield' ? ultimateShieldUntil : ultimateBuffUntil) - now) / 1000)
          : 0,
      ultimateCasting: me.action === 'ultimate' && now < me.actionUntil,
      matchEvents: matchEvents.filter((event) => event.expiresAt > now) as Snapshot['matchEvents'],
      rescueRequestActive: rescueRequest?.requesterId === me.id && now < rescueRequest.expiresAt,
      rescueRequestRemaining: rescueRequest?.requesterId === me.id ? Math.max(0, Math.ceil((rescueRequest.expiresAt - now) / 1000)) : 0,
      rescueRequestCooldown: Math.max(0, Math.ceil((rescueRequestCooldownUntil - now) / 1000)),
      roundResult: {
        visible: Boolean(resultWinner) && now < resultAnnouncementUntil,
        winner: resultWinner,
        final: phase === 'MATCH_OVER',
      },
      statsBoard: world.buildStatsBoard(now),
    }));
  };
};
