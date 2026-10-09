import type { Team } from '../world/map-data/field-types';
import type { PlayerState } from '../game-core/match-types';

// Minimal player facet for nameplate outline color. Only these fields cross
// the seam.
type RelationFacet = {
  team: Team;
  state: PlayerState;
  rescueShieldUntil: number;
  exitOrder: number;
};

// Outline color of p's nameplate relative to me. Pure: same inputs always
// yield the same color.
export const relationColor = (p: RelationFacet, me: RelationFacet, now: number): string => {
  if (p.team === me.team) return '#9fd0ff';
  if (p.state === 'PRISONER') return '#8f8d84';
  if (p.state === 'RETURNING' && now < p.rescueShieldUntil)
    return '#60e6ff';
  if (me.state !== 'ACTIVE') return '#f1d46c';
  if (
    (p.state === 'ACTIVE' || p.state === 'RETURNING') &&
    me.exitOrder > p.exitOrder
  )
    return '#b9ee3d';
  return p.state === 'ACTIVE' && p.exitOrder > me.exitOrder
    ? '#ff544b'
    : '#f1d46c';
};
