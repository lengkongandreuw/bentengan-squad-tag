import type { Faction } from '../world/map-data/field-types';
export type MapSelectionTheme = 'purple' | 'green' | 'red';
export type ArenaSelectionState = { id: string; unlocked: boolean; requirement: string; requirementParts?: string[] };
// Presentation order only. Resolve editor replacements through their original ID,
// never their display name or append position in the Studio document.
export function orderArenaSelection<T extends {id: string; difficulty: 'easy' | 'normal' | 'hard'}>(
  fields: readonly T[], canonicalId: (id: string) => string = id => id,
): T[] {
  const difficulty = {easy: 0, normal: 1, hard: 2};
  const native = ['kampung', 'kampung3d', 'pasar', 'taman', 'kanal', 'kanal2'];
  const rank = (id: string) => {const i = native.indexOf(id);return i < 0 ? native.length : i;};
  return fields.map((field,index)=>({field,index,id:canonicalId(field.id)}))
    .sort((a,b)=>Number(b.id==='kampung')-Number(a.id==='kampung') ||
      difficulty[a.field.difficulty]-difficulty[b.field.difficulty] ||
      rank(a.id)-rank(b.id) || a.index-b.index)
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
