import type { Faction } from '../world/map-data/field-types';
export type MapSelectionTheme = 'purple' | 'green' | 'red';
export type ArenaSelectionState = { id: string; unlocked: boolean; requirement: string; requirementParts?: string[] };
export const mapSelectionTheme = (faction?: Faction | null): MapSelectionTheme =>
  faction === 'red' || faction === 'green' ? faction : 'purple';
export const mapSelectionFiles = (faction?: Faction | null) => {
  const theme = mapSelectionTheme(faction);
  return {title:`map-selection/map-title-${theme}.png`,frame:`map-selection/map-frame-${theme}.png`,
    selectedRow:`map-selection/arena-row-selected-${theme}.png`,row:'map-selection/arena-row-default.png',
    lock:'map-selection/arena-lock.png',info:'map-selection/arena-info-panel.png',
    start:`map-selection/start-match-${theme}.png`};
};
