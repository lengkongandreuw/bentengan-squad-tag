import type { CharacterId } from '../../lib/characters';
import GAME_RULES from '../../config/game-rules.json' with { type: 'json' };
import type { Faction, Team } from './map-data/field-types';

// Match-team display tables derived from the game-rules config. Pure data
// plus naming/lineup helpers — no match state, no UI.
export const TEAM_COLOR = {
  blue: GAME_RULES.teams.red.color,
  red: GAME_RULES.teams.green.color,
};

export const FIXED_ROSTERS: Record<Faction, CharacterId[]> = {
  red: GAME_RULES.teams.red.roster as CharacterId[],
  green: GAME_RULES.teams.green.roster as CharacterId[],
};

export const TEAM_FOR_FACTION: Record<Faction, Team> = { red: 'blue', green: 'red' };
export const FACTION_FOR_TEAM: Record<Team, Faction> = { blue: 'red', red: 'green' };

export const factionName = (faction: Faction): string => GAME_RULES.teams[faction].label;
export const teamName = (team: Team): string => factionName(FACTION_FOR_TEAM[team]);

export const lineupFor = (faction: Faction, selectedId?: CharacterId): CharacterId[] => {
  const roster = FIXED_ROSTERS[faction];
  return selectedId && roster.includes(selectedId)
    ? [selectedId, ...roster.filter((id) => id !== selectedId)].slice(
        0,
        GAME_RULES.matchSize,
      )
    : roster.slice(0, GAME_RULES.matchSize);
};
