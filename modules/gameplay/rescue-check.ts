import type { Team } from '../world/map-data/field-types';
import type {
  PlayerAction,
  PlayerState,
  RescueRequest,
} from '../game-core/match-types.ts';
import type { MatchEventInput } from '../game-core/match-state';
import type { GameplaySound } from '../audio/audio-port';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { distance } from '../../lib/math.ts';

// Q2 (frozen): Raja ultimate rescue bonus. Verbatim move from HEAD — value,
// formula, cap, trigger, and eligibility must not change without sign-off.
const RAJA_ULTIMATE_RESCUE_BONUS = 30;

// Rescuer/held facets. Player satisfies this.
export type RescueFacet = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
  state: PlayerState;
  x: number;
  y: number;
  action?: PlayerAction;
  actionUntil: number;
  prisonIndex: number;
  prisonOwner?: Team;
  rescueShieldUntil: number;
  waterEnteredAt: number;
};

// Prisoner release rule. Prisoner transitions mutate facets in place (the
// rule's own state changes); everything else is a narrow callback.
export type RescueCheckWorld = {
  players: RescueFacet[];
  kanal: boolean;
  rescueRequest: RescueRequest | null;
  audible: (rescuer: RescueFacet) => boolean;
  onStat: (player: { id: string }, key: 'rescues') => void;
  onProfileStat: (key: 'rescueTeam') => void;
  onClearRescueRequest: () => void;
  onMatchEvent: (event: MatchEventInput) => void;
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onAudio: (name: GameplaySound, volume?: number) => void;
  onLog: (text: string) => void;
  onTeamAction: (rescuer: RescueFacet, x: number, y: number) => void;
  onChargeUltimate: (
    controlled: boolean | undefined,
    characterId: CharacterId,
    amount: number,
  ) => void;
  onMissionRescue: () => void;
};

export const rescueCheck = (now: number, world: RescueCheckWorld): void => {
  const players = world.players;
  players
    .filter((p) => p.state === 'ACTIVE' && !(world.kanal && p.waterEnteredAt))
    .forEach((rescuer) => {
      const held = players
        .filter((p) => p.team === rescuer.team && p.state === 'PRISONER')
        .sort((a, b) => b.prisonIndex - a.prisonIndex);
      const rescuerStats = CHARACTER_BY_ID[rescuer.characterId];
      if (
        held[0] &&
        distance(rescuer, held[0]) < rescuerStats.rescueRange
      ) {
        held.forEach((p) => {
          p.state = 'RETURNING';
          p.prisonOwner = undefined;
          p.rescueShieldUntil = now + rescuerStats.rescueShieldMs;
          p.x += rescuer.team === 'blue' ? -22 : 22;
        });
        rescuer.action = 'rescue';
        rescuer.actionUntil = now + 460;
        world.onStat(rescuer, 'rescues');
        if (rescuer.controlled) world.onProfileStat('rescueTeam');
        const request = world.rescueRequest;
        if (request && held.some((player) => player.id === request.requesterId))
          world.onClearRescueRequest();
        world.onMatchEvent({
          kind: 'rescue',
          actorName: rescuer.name,
          actorTeam: rescuer.team,
          targetName: held.length === 1 ? held[0].name : undefined,
          targetTeam: held.length === 1 ? held[0].team : undefined,
          rescuedCount: held.length,
        });
        world.onBurst(held[0].x, held[0].y, '#b9ee3d', 26);
        if (held.some((p) => p.controlled)) world.onAudio('rescued');
        else if (rescuer.controlled) world.onAudio('rescue');
        else if (world.audible(rescuer)) world.onAudio('rescue', 0.25);
        world.onLog(`${rescuer.name} membebaskan ${held.length} rekan.`);
        world.onTeamAction(rescuer, held[0].x, held[0].y);
        world.onChargeUltimate(
          rescuer.controlled,
          rescuer.characterId,
          RAJA_ULTIMATE_RESCUE_BONUS,
        );
        if (rescuer.controlled) world.onMissionRescue();
      }
    });
};
