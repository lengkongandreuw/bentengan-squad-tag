// Shared match-runtime domain types. Minimal by design: each type moves here
// only when a real extraction needs it from more than one module.
import type { Team } from '../world/map-data/field-types';

export type PlayerState = 'IN_BASE' | 'ACTIVE' | 'PRISONER' | 'RETURNING';
export type PlayerAction = 'tag' | 'rescue' | 'ultimate';
export type MatchEventKind = 'tag' | 'rescue' | 'rescue-request';
export type MatchEvent = {
  id: number;
  kind: MatchEventKind;
  priority: number;
  actorName?: string;
  actorTeam?: Team;
  targetName?: string;
  targetTeam?: Team;
  rescuedCount?: number;
  expiresAt: number;
};
export type RescueRequest = {
  requesterId: string;
  team: Team;
  expiresAt: number;
  assignedRescuerId?: string;
};
