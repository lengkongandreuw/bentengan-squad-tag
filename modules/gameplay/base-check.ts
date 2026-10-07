import type { Team } from '../world/map-data/field-types';
import type { PlayerState } from '../game-core/match-types';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { distance, other, tieHash } from '../../lib/math.ts';
import { fortOccupant } from './base.ts';

// Q2-adjacent but not a Q2 ultimate value: verbatim move from HEAD.
// Re-entry jitter cooldown at the fort edge.
const BASE_REENTRY_COOLDOWN_MS = 1500;

// Fort-state facet. Player satisfies this; transitions stay in place.
export type BaseCheckFacet = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
  state: PlayerState;
  x: number;
  y: number;
  boost: number;
  boostReadyAt: number;
  baseCharge: number;
  exitDeadline: number;
  exitOrder: number;
  fortCharge: number;
  lastExitAt: number;
  rescueShieldUntil: number;
  waterEnteredAt: number;
};

// Fort entry/exit, charge, capture, and boost-ready rules. Exit
// candidates and side effects go through narrow callbacks.
export type BaseCheckWorld = {
  players: BaseCheckFacet[];
  bases: Record<Team, { x: number; y: number }>;
  baseRadius: number;
  kanal: boolean;
  round: number;
  onExitCandidate: (p: BaseCheckFacet) => void;
  onLog: (text: string) => void;
  onTone: (frequency: number, duration: number) => void;
  onWinRound: (team: Team, reason: string) => void;
};

export const baseCheck = (
  p: BaseCheckFacet,
  dt: number,
  now: number,
  world: BaseCheckWorld,
): void => {
  if (p.state === 'PRISONER' || (world.kanal && p.waterEnteredAt)) return;
  const stats = CHARACTER_BY_ID[p.characterId],
    insideOwn = distance(p, world.bases[p.team]) < world.baseRadius,
    maxBoost = stats.boost,
    chargeTime = stats.baseChargeTime;
  const contested = Boolean(
    fortOccupant(world.players, world.bases, world.baseRadius, world.kanal, p.team),
  );
  if (insideOwn) {
    if (contested) {
      if (p.state === 'IN_BASE' || p.state === 'RETURNING')
        world.onExitCandidate(p);
    } else if (
      p.state === 'ACTIVE' &&
      now - p.lastExitAt < BASE_REENTRY_COOLDOWN_MS
    ) {
      p.fortCharge = 0;
    } else {
      if (p.state !== 'IN_BASE') {
        p.state = 'IN_BASE';
        p.baseCharge = 0;
        p.exitDeadline = 0;
        p.fortCharge = 0;
      }
      const charging = world.players
        .filter(
          (q) =>
            q.team === p.team &&
            q.state === 'IN_BASE' &&
            distance(q, world.bases[q.team]) < world.baseRadius,
        )
        .sort(
          (a, b) =>
            b.baseCharge - a.baseCharge ||
            tieHash(world.round, a.id) - tieHash(world.round, b.id),
        )
        .slice(0, 3);
      if (
        charging.some((q) => q.id === p.id) &&
        p.baseCharge < chargeTime
      ) {
        p.baseCharge = Math.min(chargeTime, p.baseCharge + dt);
        if (p.baseCharge >= chargeTime && !p.exitDeadline)
          p.exitDeadline = now + 5000;
      }
      p.boost = maxBoost;
      p.boostReadyAt = 0;
      if (
        p.baseCharge >= chargeTime &&
        p.exitDeadline > 0 &&
        now >= p.exitDeadline
      ) {
        p.x =
          world.bases[p.team].x +
          (p.team === 'blue' ? world.baseRadius + 5 : -world.baseRadius - 5);
        world.onExitCandidate(p);
        world.onLog(`${p.name} dipaksa keluar—grace 5 detik habis.`);
      }
    }
  } else if (p.state === 'IN_BASE' && p.baseCharge >= chargeTime) {
    world.onExitCandidate(p);
  }
  if (
    p.state === 'ACTIVE' &&
    distance(p, world.bases[other(p.team)]) < world.baseRadius
  ) {
    const defending = world.players.some(
      (q) =>
        q.team !== p.team &&
        q.state === 'ACTIVE' &&
        distance(q, world.bases[other(p.team)]) < world.baseRadius,
    );
    p.fortCharge = defending ? 0 : p.fortCharge + dt;
    if (p.fortCharge >= 1.5) world.onWinRound(p.team, 'BENTENG DIREBUT');
  } else p.fortCharge = 0;
  if (p.boost < maxBoost && p.boostReadyAt > 0 && now >= p.boostReadyAt) {
    p.boost = maxBoost;
    p.boostReadyAt = 0;
    if (p.controlled) {
      world.onLog(`Boost ${p.name} pulih penuh setelah 20 detik.`);
      world.onTone(690, 0.13);
    }
  }
};

// Resolves collected exit candidates: dedupes by id, orders by round
// tie-hash, then activates each player with a fresh exit order. The
// counter comes from the owner; mission/log/tone are narrow callbacks.
export const applyExitOrder = (
  candidates: BaseCheckFacet[],
  now: number,
  world: {
    round: number;
    nextExitOrder: () => number;
    onMissionRefresh: () => void;
    onLog: (text: string) => void;
    onTone: (frequency: number) => void;
  },
): void => {
  Array.from(new Map(candidates.map((p) => [p.id, p])).values())
    .sort((a, b) => tieHash(world.round, a.id) - tieHash(world.round, b.id))
    .forEach((p) => {
      p.state = 'ACTIVE';
      p.exitOrder = world.nextExitOrder();
      p.lastExitAt = now;
      p.baseCharge = 0;
      p.exitDeadline = 0;
      p.rescueShieldUntil = 0;
      if (p.controlled && p.exitOrder > 5) world.onMissionRefresh();
      world.onLog(`${p.name} keluar sebagai urutan #${p.exitOrder}.`);
      world.onTone(p.controlled ? 520 : 380);
    });
};
