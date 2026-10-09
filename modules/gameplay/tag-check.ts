import type { Team } from '../world/map-data/field-types';
import type { PlayerState } from '../game-core/match-types';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import { distance } from '../../lib/math.ts';

// Swept closest-approach distance between two moving points (tag contact
// math). Moved verbatim from lib/tag-contact.js; pure.
export const sweptContactDistance = (
  a: { x: number; y: number; lastX: number; lastY: number },
  b: { x: number; y: number; lastX: number; lastY: number },
): number => {
  const startX = a.lastX - b.lastX;
  const startY = a.lastY - b.lastY;
  const travelX = (a.x - a.lastX) - (b.x - b.lastX);
  const travelY = (a.y - a.lastY) - (b.y - b.lastY);
  const travelSquared = travelX * travelX + travelY * travelY;
  const projection = travelSquared > .001
    ? -(startX * travelX + startY * travelY) / travelSquared
    : 0;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(startX + travelX * t, startY + travelY * t);
};

// Minimal player facet for tag detection. Player satisfies this.
export type TagPlayerFacet = {
  id: string;
  team: Team;
  characterId: CharacterId;
  state: PlayerState;
  exitOrder: number;
  parkourUntil: number;
  ultimateShieldUntil: number;
  rescueShieldUntil: number;
  waterEnteredAt: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
};

// Line-of-sight predicate is bound by the owner (obstacles + studio map);
// capture application stays with the owner's capture forwarder.
export type TagCheckWorld = {
  players: TagPlayerFacet[];
  kanal: boolean;
  lineOfSight: (a: TagPlayerFacet, b: TagPlayerFacet) => boolean;
  onCapture: (attacker: TagPlayerFacet, target: TagPlayerFacet) => void;
};

// Swept-contact tag detection. Collects legal contacts, resolves them in
// exit-order priority (ties broken by id), and applies each capture once.
export const tagCheck = (now: number, world: TagCheckWorld): void => {
  const contacts: Array<{ attacker: TagPlayerFacet; target: TagPlayerFacet }> = [];
  const players = world.players;
  for (let i = 0; i < players.length; i++)
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i],
        b = players[j],
        contactDistance = Math.min(
          distance(a, b),
          sweptContactDistance(a, b),
        );
      if (
        a.team === b.team ||
        (world.kanal && (a.waterEnteredAt || b.waterEnteredAt)) ||
        !world.lineOfSight(a, b) ||
        now < a.parkourUntil ||
        now < b.parkourUntil
      )
        continue;
      const aTargetable =
        now >= a.ultimateShieldUntil &&
        (a.state === 'ACTIVE' ||
          (a.state === 'RETURNING' && now >= a.rescueShieldUntil));
      const bTargetable =
        now >= b.ultimateShieldUntil &&
        (b.state === 'ACTIVE' ||
          (b.state === 'RETURNING' && now >= b.rescueShieldUntil));
      if (
        a.state === 'ACTIVE' &&
        bTargetable &&
        a.exitOrder > b.exitOrder &&
        contactDistance <= CHARACTER_BY_ID[a.characterId].tagRange + 4
      )
        contacts.push({ attacker: a, target: b });
      else if (
        b.state === 'ACTIVE' &&
        aTargetable &&
        b.exitOrder > a.exitOrder &&
        contactDistance <= CHARACTER_BY_ID[b.characterId].tagRange + 4
      )
        contacts.push({ attacker: b, target: a });
    }
  contacts.sort(
    (a, b) =>
      b.attacker.exitOrder - a.attacker.exitOrder ||
      b.target.exitOrder - a.target.exitOrder ||
      a.attacker.id.localeCompare(b.attacker.id),
  );
  const resolved = new Set<string>();
  contacts.forEach(({ attacker, target }) => {
    if (resolved.has(attacker.id) || resolved.has(target.id)) return;
    const before = target.state;
    world.onCapture(attacker, target);
    if (before !== 'PRISONER' && target.state === 'PRISONER') {
      resolved.add(attacker.id);
      resolved.add(target.id);
    }
  });
};
