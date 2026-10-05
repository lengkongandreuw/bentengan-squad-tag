import type { Team } from '../world/map-data/field-types';
import type { MatchEvent, PlayerState, RescueRequest } from '../game-core/match-types';
import type { GameplaySound } from '../audio/audio-port';
import { distance, other } from '../../lib/math.ts';

// Minimal player facet for rescue requests. Only these fields cross the seam.
type RescuePlayerFacet = {
  id: string;
  name: string;
  team: Team;
  state: PlayerState;
  controlled?: boolean;
  x: number;
  y: number;
};

export type RescueRequestEffects = {
  request: RescueRequest | null;
  cooldownUntil: number;
  event: Omit<MatchEvent, 'id' | 'priority' | 'expiresAt'> | null;
  sounds: Array<{ name: GameplaySound; volume?: number }>;
  bursts: Array<{ x: number; y: number; color: string; count?: number }>;
  logs: string[];
};

// Pure rescue-request decision. Computes the new request (or none) and
// returns every side effect for the orchestrator to apply: match event,
// sounds, bursts, and log lines. Never touches audio, particles, or HUD.
export const requestRescue = (
  players: RescuePlayerFacet[],
  prevRequest: RescueRequest | null,
  cooldownUntil: number,
  query: { bases: Record<Team, { x: number; y: number }>; baseRadius: number },
  now: number,
): RescueRequestEffects => {
  const unchanged: RescueRequestEffects = {
    request: prevRequest,
    cooldownUntil,
    event: null,
    sounds: [],
    bursts: [],
    logs: [],
  };
  const requester = players[0];
  if (
    requester.state !== 'PRISONER' ||
    prevRequest ||
    now < cooldownUntil
  )
    return unchanged;
  const assignedRescuer = players
    .filter(
      (player) =>
        !player.controlled &&
        player.team === requester.team &&
        player.state === 'ACTIVE' &&
        distance(player, query.bases[other(player.team)]) > query.baseRadius * 1.25,
    )
    .sort((a, b) => distance(a, requester) - distance(b, requester))[0];
  return {
    request: {
      requesterId: requester.id,
      team: requester.team,
      expiresAt: now + 6000,
      assignedRescuerId: assignedRescuer?.id,
    },
    cooldownUntil: now + 10000,
    event: {
      kind: 'rescue-request',
      actorName: requester.name,
      actorTeam: requester.team,
    },
    sounds: [{ name: 'rescue', volume: 0.38 }],
    bursts: [{ x: requester.x, y: requester.y - 26, color: '#f5cf45', count: 18 }],
    logs: [`${requester.name} meminta bantuan rescue.`],
  };
};
