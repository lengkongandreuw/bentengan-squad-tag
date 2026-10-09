import type { Team } from '../world/map-data/field-types';
import type { PlayerState } from '../game-core/match-types';
import type { CharacterId } from '../../lib/characters';
import { advanceTeamCombo } from './team-combo.ts';
import type { TeamComboState } from './team-combo.ts';
import { TEAM_COLOR, teamName } from '../world/team-tables.ts';

// Single source of truth lives in team-combo.ts (R10 move); re-exported
// here so the existing contract keeps resolving.
export type { TeamComboState };

// What crosses the seam for teammates: enough for the owner's boost math.
export type TeammateFacet = {
  id: string;
  team: Team;
  state: PlayerState;
  characterId: CharacterId;
  boost: number;
};

// Combo state in, new combo state out. Every cross-owner effect is a
// narrow callback — no mutable runtime objects.
export type TeamActionWorld = {
  comboState: TeamComboState;
  playerTeam: Team;
  players: TeammateFacet[];
  onComboCallout: (text: string, until: number) => void;
  onPlayerBoost: (teammates: TeammateFacet[], fraction: number) => void;
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onTone: (frequency: number, duration: number) => void;
  onLog: (text: string) => void;
  onMissionCombo: () => void;
};

// Applies a TAG/RESCUE team-combo step. Boost fractions, callout copy,
// tone pitches, and callout windows are this subsystem's rules.
export const registerTeamAction = (
  actor: { id: string; team: Team; name: string },
  actionLabel: 'TAG' | 'RESCUE',
  x: number,
  y: number,
  now: number,
  world: TeamActionWorld,
): TeamComboState => {
  const result = advanceTeamCombo(world.comboState, actor.id, now);
  if (result.outcome === 'ignored') return result.state;

  const isPlayerTeam = actor.team === world.playerTeam;
  if (result.outcome === 'started') {
    if (isPlayerTeam)
      world.onComboCallout(`LINK 1/3 · ${actor.name} ${actionLabel}`, now + 1400);
    return result.state;
  }

  const teammates = world.players.filter(
    (p) => p.team === actor.team && p.state !== 'PRISONER',
  );
  if (result.outcome === 'duo') {
    world.onPlayerBoost(teammates, 0.12);
    world.onBurst(x, y, '#f5cf45', 20);
    world.onTone(isPlayerTeam ? 680 : 390, 0.14);
    world.onLog(`${teamName(actor.team)} merangkai DUO LINK · boost tim +12%.`);
    if (isPlayerTeam)
      world.onComboCallout('DUO LINK · BOOST TIM +12%', now + 1900);
    return result.state;
  }

  world.onPlayerBoost(teammates, 0.16);
  world.onBurst(x, y, TEAM_COLOR[actor.team], 32);
  world.onTone(isPlayerTeam ? 880 : 440, 0.22);
  world.onLog(
    `${teamName(actor.team)} mengaktifkan SQUAD SURGE · gerak +10% selama 5 detik.`,
  );
  if (isPlayerTeam) {
    world.onMissionCombo();
    world.onComboCallout('SQUAD SURGE · SPEED +10%', now + 2500);
  }
  return result.state;
};
