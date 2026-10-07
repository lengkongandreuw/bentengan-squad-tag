import type { Team } from '../world/map-data/field-types';
import type { PlayerAction, PlayerState } from '../game-core/match-types';
import type { MatchEventInput } from '../game-core/match-state';
import type { GameplaySound } from '../audio/audio-port';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { other } from '../../lib/math.ts';
import { TEAM_COLOR } from '../world/team-tables.ts';

// Q2 (frozen): Raja ultimate tag bonus. Verbatim move from HEAD — value,
// formula, cap, trigger, and eligibility must not change without sign-off.
const RAJA_ULTIMATE_TAG_BONUS = 20;

// Winner/loser facets. Includes every field the capture rule reads or
// transitions; Player satisfies this structurally.
export type CapturePlayerFacet = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
  x: number;
  y: number;
  state: PlayerState;
  exitOrder: number;
  parkourUntil: number;
  tagCooldown: number;
  ultimateShieldUntil: number;
  rescueShieldUntil: number;
  captures: number;
  capturedIds: string[];
  visualTagVector?: { x: number; y: number };
  action?: PlayerAction;
  actionUntil: number;
  fortCharge: number;
  prisonOwner?: Team;
};

// Capture rule + player transitions. Every cross-owner effect (stats,
// profile, events, particles, audio, log, combo, meter, mission, prisons,
// round win) is a narrow callback; `loserAudible` is the pre-capture
// distance(players[0], loser) < 300 data point, computed by the owner.
export type CaptureWorld = {
  suddenDeath: boolean;
  loserAudible: boolean;
  onStat: (player: { id: string }, key: 'tags' | 'prisons') => void;
  onProfileStat: (key: 'tagMusuh' | 'masukPenjara') => void;
  onMatchEvent: (event: MatchEventInput) => void;
  onBurst: (x: number, y: number, color: string) => void;
  onAudio: (name: GameplaySound, volume?: number) => void;
  onLog: (text: string) => void;
  onTeamAction: (x: number, y: number) => void;
  onChargeUltimate: (
    controlled: boolean | undefined,
    characterId: CharacterId,
    amount: number,
  ) => void;
  onMissionTag: () => void;
  onLayoutPrisons: () => void;
  onWinRound: (team: Team, reason: string) => void;
};

export const capture = (
  winner: CapturePlayerFacet,
  loser: CapturePlayerFacet,
  now: number,
  world: CaptureWorld,
): void => {
  if (now < loser.ultimateShieldUntil) return;
  const targetable =
    loser.state === 'ACTIVE' ||
    (loser.state === 'RETURNING' && now >= loser.rescueShieldUntil);
  if (
    winner.state !== 'ACTIVE' ||
    now < winner.parkourUntil ||
    now < loser.parkourUntil ||
    winner.tagCooldown > now ||
    !targetable ||
    winner.exitOrder <= loser.exitOrder
  )
    return;
  winner.tagCooldown =
    now + CHARACTER_BY_ID[winner.characterId].tagCooldownMs;
  winner.captures++;
  world.onStat(winner, 'tags');
  world.onStat(loser, 'prisons');
  if (winner.controlled) world.onProfileStat('tagMusuh');
  if (loser.controlled) world.onProfileStat('masukPenjara');
  world.onMatchEvent({
    kind: 'tag',
    actorName: winner.name,
    actorTeam: winner.team,
    targetName: loser.name,
    targetTeam: loser.team,
  });
  if (!winner.capturedIds.includes(loser.id))
    winner.capturedIds.push(loser.id);
  winner.action = 'tag';
  winner.visualTagVector = { x: loser.x - winner.x, y: loser.y - winner.y };
  winner.actionUntil = now + 420;
  loser.state = 'PRISONER';
  loser.prisonOwner = winner.team;
  loser.fortCharge = 0;
  loser.rescueShieldUntil = 0;
  world.onBurst(loser.x, loser.y, TEAM_COLOR[winner.team]);
  if (loser.controlled) world.onAudio('caught');
  else if (winner.controlled) world.onAudio('tag');
  else if (world.loserAudible) world.onAudio('tag', 0.22);
  world.onLog(
    `${winner.name} #${winner.exitOrder} menangkap ${loser.name} #${loser.exitOrder}.`,
  );
  world.onTeamAction(loser.x, loser.y);
  world.onChargeUltimate(
    winner.controlled,
    winner.characterId,
    RAJA_ULTIMATE_TAG_BONUS,
  );
  if (winner.controlled) world.onMissionTag();
  world.onLayoutPrisons();
  if (world.suddenDeath) world.onWinRound(winner.team, 'SUDDEN DEATH TAG');
};

// Full-team hold: when every opponent sits in one team's prison, hold
// time accumulates dt (owner's record mutates in place); holding it for
// two seconds wins the round. HEAD threshold verbatim.
export const updateCaptureHold = (
  totalCapture: Record<Team, number>,
  players: {
    team: Team;
    state: PlayerState;
    prisonOwner?: Team;
  }[],
  dt: number,
  onWinRound: (team: Team, reason: string) => void,
): void => {
  (['blue', 'red'] as Team[]).forEach((team) => {
    const allHeld = players
      .filter((p) => p.team === other(team))
      .every((p) => p.state === 'PRISONER' && p.prisonOwner === team);
    totalCapture[team] = allHeld ? totalCapture[team] + dt : 0;
    if (totalCapture[team] >= 2) onWinRound(team, 'SEMUA LAWAN DITANGKAP');
  });
};
