import type { Team } from '../world/map-data/field-types';
import type { PlayerState, RescueRequest } from '../game-core/match-types';
import type { Refill } from './spawn';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { distance, other } from '../../lib/math.ts';
import { baseVector } from './collision-navigation.ts';
import { teamComboSpeedMultiplier, type TeamComboState } from './team-combo.ts';
import type { RuntimeActor, Point, LegacyTeam, RefillState } from '../../lib/game-core/types.ts';
import type { PlayerInputFrame } from '../../lib/game-core/input.ts';

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
// Moved verbatim from lib/game-core/bot-ai.ts (R10).

export type BotObjective = 'return' | 'exit' | 'rescue' | 'refill' | 'evade' | 'tag' | 'fort' | 'idle';
export type BotPlan = { vector: Point; objective: BotObjective; targetId?: string };
export type BotWorld = {
  players: RuntimeActor[]; bases: Record<LegacyTeam, Point>; width: number; height: number;
  refills: RefillState[]; request: { requesterId: string; assignedRescuerId?: string } | null; kanal2: boolean; localTeam: LegacyTeam;
  profile: { rescueCutoff: number; threatRadius: number; playerBias: number; prediction: number; steerDistance: number };
  boostThreshold: number; navigate: (p: RuntimeActor, desired: Point, now: number, probe: number, bias: number) => Point;
};
export type BotIntent = { frame: PlayerInputFrame; objective: BotObjective; targetId?: string; blocked: boolean };
const botDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** Existing strategy order and math. No actor mutation, routing redesign or random calls. */
export function planBot(p: RuntimeActor, now: number, w: BotWorld): BotPlan {
  const toward = (target: Point, objective: BotObjective, targetId?: string): BotPlan => ({ vector: { x: target.x - p.x, y: target.y - p.y }, objective, ...(targetId ? { targetId } : {}) });
  if (p.state === 'RETURNING') return toward(w.bases[p.team], 'return');
  if (p.state === 'IN_BASE') return toward({ x: w.width / 2, y: w.height / 2 + Math.sin(now / 920 + p.aiSeed) * 230 }, 'exit');
  const requester = w.request ? w.players.find((q) => q.id === w.request?.requesterId) : undefined;
  if (requester?.state === 'PRISONER' && w.request?.assignedRescuerId === p.id) return toward(requester, 'rescue', requester.entityId);
  const held = w.players.filter((q) => q.team === p.team && q.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex);
  if (held.length && (p.aiSeed % 3 < w.profile.rescueCutoff || held.length >= 3)) return toward(held[0], 'rescue', held[0].entityId);
  if (p.boost < 34) {
    const item = w.refills.slice().sort((a, b) => botDistance(p, a) - botDistance(p, b))[0];
    if (item && botDistance(p, item) < 360) return toward(item, 'refill');
  }
  const threat = w.players.filter((q) => q.team !== p.team && q.state === 'ACTIVE' && q.exitOrder > p.exitOrder).sort((a, b) => botDistance(p, a) - botDistance(p, b))[0];
  if (threat && botDistance(p, threat) < w.profile.threatRadius) return { vector: { x: p.x - threat.x, y: p.y - threat.y }, objective: 'evade', targetId: threat.entityId };
  const target = w.players.filter((q) => q.team !== p.team && q.state === 'ACTIVE' && q.exitOrder < p.exitOrder).sort((a, b) => {
    const aBias = a.controlled ? -w.profile.playerBias : 0, bBias = b.controlled ? -w.profile.playerBias : 0;
    return botDistance(p, a) + aBias - botDistance(p, b) - bBias;
  })[0];
  if (target) return toward({ x: target.x + target.vx * w.profile.prediction, y: target.y + target.vy * w.profile.prediction }, 'tag', target.entityId);
  if (p.boost < 18 || Math.sin(now / 4300 + p.aiSeed) > 0.86) return toward(w.bases[p.team], 'return');
  const enemy = w.bases[p.team === 'blue' ? 'red' : 'blue'];
  return { vector: { x: enemy.x - p.x, y: enemy.y - p.y + Math.sin(now / 740 + p.aiSeed) * 150 }, objective: 'fort' };
}
export function createBotAuthority() {
  const sequences = new Map<string, number>();
  return {
    /** Sequential consumption preserves legacy AI observing earlier actors' movement. */
    run(authority: 'host' | 'client', w: BotWorld, now: number, consume: (p: RuntimeActor, intent: BotIntent) => void) {
      if (authority !== 'host') return;
      for (const p of w.players) {
        if (p.controller !== 'bot') continue;
        const sequence = (sequences.get(p.entityId) ?? 0) + 1;
        if (!Number.isSafeInteger(sequence)) throw Error('Bot input sequence overflow');
        sequences.set(p.entityId, sequence);
        const blocked = p.state === 'PRISONER' || !!(w.kanal2 && p.waterEnteredAt);
        const plan = blocked ? { vector: { x: 0, y: 0 }, objective: 'idle' as const } : planBot(p, now, w);
        const v = blocked ? plan.vector : w.navigate(p, plan.vector, now, p.team !== w.localTeam ? w.profile.steerDistance : 78, Math.sin(p.aiSeed + now / 1700));
        const sprint = !blocked && p.state === 'ACTIVE' && p.boost > 10 && Math.hypot(v.x, v.y) > 145 && Math.sin(now / 950 + p.aiSeed) > w.boostThreshold;
        consume(p, {
          blocked, objective: plan.objective, ...('targetId' in plan && plan.targetId ? { targetId: plan.targetId } : {}), frame: {
            entityId: p.entityId, sequence, moveX: v.x, moveY: v.y, sprint, keyboardSprint: false, sprintPulse: false,
            parkour: false, ultimate: false, rescue: plan.objective === 'rescue', pause: false, targetX: p.x + plan.vector.x, targetY: p.y + plan.vector.y,
          },
        });
      }
    },
  };
}