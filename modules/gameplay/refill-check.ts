import type { PlayerState } from '../game-core/match-types';
import type { CharacterId } from '../../lib/characters';
import type { Refill } from './spawn';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { distance } from '../../lib/math.ts';

// Boost-hungry player facet. Player satisfies this.
export type RefillPlayerFacet = {
  id: string;
  name: string;
  characterId: CharacterId;
  controlled?: boolean;
  state: PlayerState;
  boost: number;
  x: number;
  y: number;
  waterEnteredAt: number;
};

// Boost pickup rule. Player boost mutates in place (the rule's own
// effect); the refills list, particles, tones, log, and mission go
// through narrow callbacks — `onRefills` delivers the list with the
// consumed item removed (visible to later finds in the same pass).
export type RefillCheckWorld = {
  players: RefillPlayerFacet[];
  refills: Refill[];
  kanal: boolean;
  onRefills: (next: Refill[]) => void;
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onTone: (frequency: number, duration: number) => void;
  onLog: (text: string) => void;
  onMissionBoost: () => void;
};

export const refillCheck = (world: RefillCheckWorld): void => {
  let refills = world.refills;
  world.players
    .filter(
      (p) =>
        p.state === 'ACTIVE' &&
        !(world.kanal && p.waterEnteredAt) &&
        p.boost < CHARACTER_BY_ID[p.characterId].boost,
    )
    .forEach((p) => {
      const item = refills.find((i) => distance(p, i) < 27);
      if (!item) return;
      const maxBoost = CHARACTER_BY_ID[p.characterId].boost;
      p.boost = Math.min(maxBoost, p.boost + (maxBoost * item.grade) / 100);
      refills = refills.filter((i) => i.id !== item.id);
      const refillColor =
        item.grade === 100
          ? '#60e6ff'
          : item.grade === 75
            ? '#ef75ff'
            : item.grade === 40
              ? '#f5cf45'
              : '#b9ee3d';
      world.onBurst(item.x, item.y, refillColor, 18);
      world.onTone(560 + item.grade * 2, 0.12);
      if (p.controlled) world.onMissionBoost();
      world.onLog(`${p.name} mengambil refill boost ${item.grade}%.`);
    });
  world.onRefills(refills);
};
