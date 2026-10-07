import type { Team } from '../world/map-data/field-types';
import type { PlayerState } from '../game-core/match-types';
import { distance } from '../../lib/math.ts';

// Minimal player facet for fort queries. Only these fields cross the seam.
export type FortPlayerFacet = {
  id: string;
  name: string;
  team: Team;
  state: PlayerState;
  waterEnteredAt: number;
  x: number;
  y: number;
};

// First active enemy inside a team's base radius, if any. No mutation,
// no audio, no stats. Water only blocks on kanal maps.
export const fortOccupant = (
  players: FortPlayerFacet[],
  bases: Record<Team, { x: number; y: number }>,
  baseRadius: number,
  kanal: boolean,
  baseTeam: Team,
  exceptId?: string,
): FortPlayerFacet | undefined =>
  players.find(
    (p) =>
      p.id !== exceptId &&
      !(kanal && p.waterEnteredAt) &&
      p.state === 'ACTIVE' &&
      p.team !== baseTeam &&
      distance(p, bases[baseTeam]) < baseRadius,
  );
