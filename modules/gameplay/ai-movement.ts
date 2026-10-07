import type { Team } from '../world/map-data/field-types';
import type { PlayerState, RescueRequest } from '../game-core/match-types';
import type { Refill } from './spawn';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { distance, other } from '../../lib/math.ts';
import { baseVector } from './collision-navigation.ts';
import { teamComboSpeedMultiplier, type TeamComboState } from './team-combo.ts';

export type AiProfile = {
  prediction: number;
  playerBias: number;
  threatRadius: number;
  rescueCutoff: number;
};

export type PlayerFacet = {
  id: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: PlayerState;
  exitOrder: number;
  boost: number;
  aiSeed: number;
  prisonIndex: number;
};

export type AiVectorWorld = {
  players: PlayerFacet[];
  rescueRequest: RescueRequest | null;
  refills: Refill[];
  bases: Record<Team, { x: number; y: number }>;
  worldWidth: number;
  worldHeight: number;
  aiProfile: AiProfile;
};

export const aiVector = (
  p: PlayerFacet,
  now: number,
  world: AiVectorWorld,
): { x: number; y: number } => {
  if (p.state === 'RETURNING') return baseVector(p, world.bases);
  if (p.state === 'IN_BASE')
    return {
      x: world.worldWidth / 2 - p.x,
      y: world.worldHeight / 2 + Math.sin(now / 920 + p.aiSeed) * 230 - p.y,
    };
  const requester = world.rescueRequest
    ? world.players.find((player) => player.id === world.rescueRequest?.requesterId)
    : undefined;
  if (
    requester &&
    requester.state === 'PRISONER' &&
    world.rescueRequest?.assignedRescuerId === p.id
  )
    return { x: requester.x - p.x, y: requester.y - p.y };
  const held = world.players
    .filter((q) => q.team === p.team && q.state === 'PRISONER')
    .sort((a, b) => b.prisonIndex - a.prisonIndex);
  if (
    held.length &&
    (p.aiSeed % 3 < world.aiProfile.rescueCutoff || held.length >= 3)
  )
    return { x: held[0].x - p.x, y: held[0].y - p.y };
  if (p.boost < 34) {
    const item = world.refills
      .slice()
      .sort((a, b) => distance(p, a) - distance(p, b))[0];
    if (item && distance(p, item) < 360)
      return { x: item.x - p.x, y: item.y - p.y };
  }
  const threat = world.players
    .filter(
      (q) =>
        q.team !== p.team &&
        q.state === 'ACTIVE' &&
        q.exitOrder > p.exitOrder,
    )
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  if (threat && distance(p, threat) < world.aiProfile.threatRadius)
    return { x: p.x - threat.x, y: p.y - threat.y };
  const target = world.players
    .filter(
      (q) =>
        q.team !== p.team &&
        q.state === 'ACTIVE' &&
        q.exitOrder < p.exitOrder,
    )
    .sort((a, b) => {
      const aPlayerBias = a.controlled ? -world.aiProfile.playerBias : 0;
      const bPlayerBias = b.controlled ? -world.aiProfile.playerBias : 0;
      return distance(p, a) + aPlayerBias - distance(p, b) - bPlayerBias;
    })[0];
  if (target)
    return {
      x: target.x + target.vx * world.aiProfile.prediction - p.x,
      y: target.y + target.vy * world.aiProfile.prediction - p.y,
    };
  if (p.boost < 18 || Math.sin(now / 4300 + p.aiSeed) > 0.86)
    return baseVector(p, world.bases);
  const enemy = world.bases[other(p.team)];
  return {
    x: enemy.x - p.x,
    y: enemy.y - p.y + Math.sin(now / 740 + p.aiSeed) * 150,
  };
};

export type BotPlayer = PlayerFacet & {
  boostReadyAt: number;
  waterEnteredAt: number;
};

export type BotStepWorld = Omit<AiVectorWorld, 'players' | 'aiProfile'> & {
  players: BotPlayer[];
  aiProfile: AiProfile & { steerDistance: number };
  isKanal: boolean;
  teamCombos: Record<Team, TeamComboState>;
  speedMultiplier: number;
  boostThreshold: number;
  boostDrainMultiplier: number;
  move: (
    p: BotPlayer,
    x: number,
    y: number,
    speed: number,
    dt: number,
    now: number,
  ) => void;
  navigate: (
    p: BotPlayer,
    desired: { x: number; y: number },
    now: number,
    steerDistance: number,
    turnBias: number,
  ) => { x: number; y: number };
  rajaMultiplier: (p: BotPlayer) => number;
};

// One tick of bot stepping: decide (aiVector), steer around hazards, decide
// boost, then move. players[0] is the human and is skipped; prisoners and
// kanal swimmers just stop. Head numbers verbatim (145 far threshold, +10
// boost floor, 78 friendly steer, 20s boost-ready).
export const stepBots = (
  me: { team: Team },
  now: number,
  dt: number,
  world: BotStepWorld,
): void => {
  world.players.slice(1).forEach((p) => {
    if (p.state === 'PRISONER' || (world.isKanal && p.waterEnteredAt)) {
      p.vx = 0;
      p.vy = 0;
      return;
    }
    const stats = CHARACTER_BY_ID[p.characterId];
    const enemyOfPlayer = p.team !== me.team;
    const desired = aiVector(p, now, world);
    const vector = world.navigate(
      p,
      desired,
      now,
      enemyOfPlayer ? world.aiProfile.steerDistance : 78,
      Math.sin(p.aiSeed + now / 1700),
    );
    const far = Math.hypot(vector.x, vector.y) > 145;
    const boostAi =
      p.state === 'ACTIVE' &&
      !(world.isKanal && p.waterEnteredAt) &&
      p.boost > 10 &&
      far &&
      Math.sin(now / 950 + p.aiSeed) > world.boostThreshold;
    if (boostAi) {
      p.boost = Math.max(
        0,
        p.boost - stats.boostDrain * world.boostDrainMultiplier * dt,
      );
      p.boostReadyAt = now + 20000;
    }
    const comboMultiplier = teamComboSpeedMultiplier(
      world.teamCombos[p.team],
      now,
    );
    world.move(
      p,
      vector.x,
      vector.y,
      stats.speed *
        comboMultiplier *
        world.rajaMultiplier(p) *
        world.speedMultiplier *
        (boostAi ? stats.boostMultiplier : 1),
      dt,
      now,
    );
  });
};