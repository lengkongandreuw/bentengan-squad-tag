import PERKS from '../../config/perks.json' with { type: 'json' };
import MATCH_FORMAT from '../../config/match-format.json' with { type: 'json' };
import { CHARACTER_BY_ID, type CharacterDefinition, type CharacterId } from '../../lib/characters.ts';
import type { LegacyTeam } from '../../lib/game-core/types.ts';

// Between-round perk draft (FEATURE_MATCH_FORMAT_5_RONDE, Fase 3). Perks are a
// multiplier layer over character stats; config/characters/*.json stays untouched.

export type PerkId = 'fort_guard' | 'swift_feet' | 'long_reach' | 'deep_breath' | 'quick_gate' | 'rescue_shield' | 'double_refill';
export type PerkDefinition = { id: PerkId; name: string; description: string; value: number; icon: string; botPriority: number };
export type TeamPerks = Record<LegacyTeam, PerkId[]>;
export type PerkDraft = {
  loser: LegacyTeam;
  winner: LegacyTeam;
  offer: PerkId[];
  /** Loser's pick; null while waiting (or when the loser already has the maximum). */
  loserPick: PerkId | null;
  winnerPick: PerkId | null;
  deadline: number;
  resolved: boolean;
};

export const PERK_LIST = PERKS.perks as PerkDefinition[];
export const PERK_BY_ID = Object.fromEntries(PERK_LIST.map((perk) => [perk.id, perk])) as Record<PerkId, PerkDefinition>;
export const PERK_DRAFT = MATCH_FORMAT.perkDraft;
export const emptyTeamPerks = (): TeamPerks => ({ blue: [], red: [] });
export const hasPerk = (perks: readonly PerkId[] | undefined, id: PerkId) => !!perks?.includes(id);

const statsCache = new Map<string, CharacterDefinition>();
/** Character stats with the team's perks applied. Returns the base object when there are no stat perks. */
export function effectiveStats(characterId: CharacterId, perks: readonly PerkId[] | undefined): CharacterDefinition {
  const base = CHARACTER_BY_ID[characterId];
  if (!perks?.length) return base;
  const key = `${characterId}|${[...perks].sort().join(',')}`;
  const cached = statsCache.get(key);
  if (cached) return cached;
  const stats = { ...base };
  if (hasPerk(perks, 'swift_feet')) stats.speed = base.speed * (1 + PERK_BY_ID.swift_feet.value);
  if (hasPerk(perks, 'long_reach')) stats.rescueRange = base.rescueRange * (1 + PERK_BY_ID.long_reach.value);
  if (hasPerk(perks, 'deep_breath')) stats.boost = base.boost * (1 + PERK_BY_ID.deep_breath.value);
  if (hasPerk(perks, 'quick_gate')) stats.baseChargeTime = base.baseChargeTime * (1 - PERK_BY_ID.quick_gate.value);
  if (hasPerk(perks, 'rescue_shield')) stats.rescueShieldMs = base.rescueShieldMs + PERK_BY_ID.rescue_shield.value;
  statsCache.set(key, stats);
  return stats;
}
/** Extra seconds enemies need to capture the fort of a team owning these perks. */
export const fortCaptureBonusSeconds = (defenderPerks: readonly PerkId[] | undefined) =>
  hasPerk(defenderPerks, 'fort_guard') ? PERK_BY_ID.fort_guard.value : 0;
/** Relative spawn weight for refills on a team's own half. */
export const refillSpawnWeight = (perks: readonly PerkId[] | undefined) =>
  1 + (hasPerk(perks, 'double_refill') ? PERK_BY_ID.double_refill.value : 0);

const shuffle = <T,>(items: T[], random: () => number) => {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const full = (perks: readonly PerkId[]) => perks.length >= PERK_DRAFT.maxPerTeam;
export const botPickPerk = (offer: readonly PerkId[]) =>
  offer.slice().sort((a, b) => PERK_BY_ID[a].botPriority - PERK_BY_ID[b].botPriority)[0] ?? null;

/**
 * Starts a draft after a round. The loser is offered up to three perks it does not own.
 * Returns null when neither team can receive a perk.
 */
export function createPerkDraft(teamPerks: TeamPerks, winner: LegacyTeam, now: number, random: () => number = Math.random): PerkDraft | null {
  const loser: LegacyTeam = winner === 'blue' ? 'red' : 'blue';
  if (full(teamPerks[loser]) && full(teamPerks[winner])) return null;
  const pool = PERK_LIST.map((perk) => perk.id).filter((id) => !teamPerks[loser].includes(id));
  const offer = full(teamPerks[loser]) ? [] : shuffle(pool, random).slice(0, PERK_DRAFT.offerCount);
  return { loser, winner, offer, loserPick: null, winnerPick: null, deadline: now + PERK_DRAFT.maxSeconds * 1000, resolved: false };
}
/**
 * Applies the loser's pick (or the first offered perk when `pick` is null) and gives the
 * winner one random perk from the rest of the offer it does not own yet. Mutates both.
 */
export function resolvePerkDraft(draft: PerkDraft, teamPerks: TeamPerks, pick: PerkId | null, random: () => number = Math.random) {
  if (draft.resolved) return draft;
  const loserPick = draft.offer.length ? (pick && draft.offer.includes(pick) ? pick : draft.offer[0]) : null;
  if (loserPick && !full(teamPerks[draft.loser]) && !teamPerks[draft.loser].includes(loserPick)) teamPerks[draft.loser].push(loserPick);
  let winnerChoices = draft.offer.filter((id) => id !== loserPick && !teamPerks[draft.winner].includes(id));
  // A full loser gets no offer; the winner still draws from every perk it lacks.
  if (!draft.offer.length) winnerChoices = PERK_LIST.map((perk) => perk.id).filter((id) => !teamPerks[draft.winner].includes(id));
  const winnerPick = full(teamPerks[draft.winner]) || !winnerChoices.length
    ? null
    : winnerChoices[Math.floor(random() * winnerChoices.length)];
  if (winnerPick) teamPerks[draft.winner].push(winnerPick);
  draft.loserPick = loserPick;
  draft.winnerPick = winnerPick;
  draft.resolved = true;
  return draft;
}
