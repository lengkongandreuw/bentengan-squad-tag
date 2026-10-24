import type { Faction } from '../world/map-data/field-types';
import {progressionRules} from '../../lib/player-profile/progression-rules.ts';
export type MapSelectionTheme = 'purple' | 'green' | 'red';
export type ArenaSelectionState = { id: string; unlocked: boolean; requirement: string; requirementParts?: string[] };
const campaignTiers = progressionRules.arenaProgression.tiers.filter(tier=>tier.mode==='campaign')
  .slice().sort((a,b)=>(a.tier??0)-(b.tier??0));
const campaignOrder = campaignTiers.flatMap(tier=>tier.arenaIds);
export function arenaSelectionDifficulty(arenaId:string, fallback:'easy'|'normal'|'hard') {
  return campaignTiers.find(tier=>tier.arenaIds.includes(arenaId))?.difficulty ?? fallback;
}
// Campaign/unlock order first; optional free-play maps follow by difficulty.
// Editor replacements keep their canonical position, irrespective of name/order.
export function orderArenaSelection<T extends {id: string; difficulty: 'easy' | 'normal' | 'hard'}>(
  fields: readonly T[], canonicalId: (id: string) => string = id => id,
): T[] {
  const difficulty = {easy: 0, normal: 1, hard: 2};
  const rank = (id:string) => {const i=campaignOrder.indexOf(id);return i<0?campaignOrder.length:i;};
  return fields.map((field,index)=>({field,index,id:canonicalId(field.id)}))
    .sort((a,b)=>rank(a.id)-rank(b.id) ||
      difficulty[a.field.difficulty]-difficulty[b.field.difficulty] ||
      a.index-b.index)
    .map(entry=>entry.field);
}
export const mapSelectionTheme = (faction?: Faction | null): MapSelectionTheme =>
  faction === 'red' || faction === 'green' ? faction : 'purple';
export const mapSelectionFiles = (faction?: Faction | null) => {
  const theme = mapSelectionTheme(faction);
  return {title:`map-selection/map-title-${theme}.png`,frame:`map-selection/map-frame-${theme}.png`,
    selectedRow:`map-selection/arena-row-selected-${theme}.png`,row:'map-selection/arena-row-default.png',
    lock:'map-selection/arena-lock.png',info:'map-selection/arena-info-panel.png',
    start:`map-selection/start-match-${theme}.png`};
};
