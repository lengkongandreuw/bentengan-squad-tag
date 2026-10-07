import type { Faction, Team } from '../world/map-data/field-types';
import type { CharacterId } from '../../lib/characters';
import type { PlayerState } from '../game-core/match-types';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { TEAM_FOR_FACTION, FIXED_ROSTERS, lineupFor } from '../world/team-tables.ts';
import GAME_RULES from '../../config/game-rules.json' with { type: 'json' };

// Fresh roster player. The prototype's `Player` type extends this
// structurally (visualTagVector/prisonOwner/action stay optional there).
export type RosterPlayer = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: PlayerState;
  exitOrder: number;
  boost: number;
  baseCharge: number;
  exitDeadline: number;
  lastExitAt: number;
  tagCooldown: number;
  parkourUntil: number;
  boostReadyAt: number;
  fortCharge: number;
  prisonIndex: number;
  captures: number;
  aiSeed: number;
  rescueShieldUntil: number;
  ultimateShieldUntil: number;
  fallSafeUntil: number;
  fallNoticeUntil: number;
  waterEnteredAt: number;
  waterFallUntil: number;
  capturedIds: string[];
  actionUntil: number;
  lastX: number;
  lastY: number;
};

const makePlayer = (
  bases: Record<Team, { x: number; y: number }>,
  id: string,
  characterId: CharacterId,
  team: Team,
  slot: number,
  controlled = false,
): RosterPlayer => {
  const b = bases[team];
  const character = CHARACTER_BY_ID[characterId];
  const offset =
    GAME_RULES.spawnOffsets[slot] ?? GAME_RULES.spawnOffsets[0];
  const direction = team === 'blue' ? 1 : -1;
  return {
    id,
    name: character.name.toUpperCase(),
    team,
    characterId,
    controlled,
    x: b.x + offset.x * direction,
    y: b.y + offset.y,
    vx: 0,
    vy: 0,
    state: 'IN_BASE',
    exitOrder: 0,
    boost: character.boost,
    baseCharge: 0,
    exitDeadline: 0,
    lastExitAt: 0,
    tagCooldown: 0,
    parkourUntil: 0,
    boostReadyAt: 0,
    fortCharge: 0,
    prisonIndex: 0,
    captures: 0,
    rescueShieldUntil: 0,
    ultimateShieldUntil: 0,
    fallSafeUntil: 0,
    fallNoticeUntil: 0,
    waterEnteredAt: 0,
    waterFallUntil: 0,
    capturedIds: [],
    actionUntil: 0,
    lastX: b.x + offset.x * direction,
    lastY: b.y + offset.y,
    aiSeed: 0.35 + slot * 1.17 + (team === 'red' ? 5.3 : 0),
  };
};

// User roster first (slot 0 = "you", controlled), then the opponent.
// Pure given (faction, selectedId, bases): no randomness, no globals.
export const makePlayers = (options: {
  faction: Faction | null;
  selectedId: CharacterId;
  bases: Record<Team, { x: number; y: number }>;
}): RosterPlayer[] => {
  const faction = options.faction ?? 'red';
  const opponentFaction: Faction = faction === 'red' ? 'green' : 'red';
  const userTeam = TEAM_FOR_FACTION[faction];
  const opponentTeam = TEAM_FOR_FACTION[opponentFaction];
  const userRoster = lineupFor(faction, options.selectedId);
  const opponentRoster = lineupFor(opponentFaction);
  return [
    ...userRoster.map((characterId, slot) =>
      makePlayer(
        options.bases,
        slot === 0 ? 'you' : `ally${slot + 1}`,
        characterId,
        userTeam,
        slot,
        slot === 0,
      ),
    ),
    ...opponentRoster.map((characterId, slot) =>
      makePlayer(
        options.bases,
        `enemy${slot + 1}`,
        characterId,
        opponentTeam,
        slot,
      ),
    ),
  ];
};

// Next roster id with wrap-around (character cycling in selection menus).
export const cycleRosterId = (
  roster: readonly CharacterId[],
  currentId: CharacterId,
  direction: -1 | 1,
): CharacterId => {
  const index = roster.indexOf(currentId);
  return roster[(index + direction + roster.length) % roster.length];
};

// Selection-menu derivations: full character objects for the grid, id
// lineups for the squad strips. Pure projections of faction + selection.
export const rosterCharacters = (
  faction: Faction | null,
): Array<(typeof CHARACTER_BY_ID)[CharacterId]> =>
  faction ? FIXED_ROSTERS[faction].map((id) => CHARACTER_BY_ID[id]) : [];

export const squadLineup = (faction: Faction | null, selectedId: CharacterId): CharacterId[] =>
  faction ? lineupFor(faction, selectedId) : [];

export const opponentLineup = (faction: Faction | null): CharacterId[] =>
  faction ? lineupFor(faction === 'red' ? 'green' : 'red') : [];
