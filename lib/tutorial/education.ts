import type {LocalPlayerProfile} from '../player-profile/types.ts';
import {getNextCharacterGoal} from '../player-profile/character-unlocks.ts';
import {getArenaSelectionProgress} from '../player-profile/arena-selection-progress.ts';
import {isArenaUnlocked} from '../player-profile/arena-unlocks.ts';

/** Same catalog order and requirement helpers as normal content selection. */
export function tutorialEducation(profile:LocalPlayerProfile,catalog:readonly {id:string;name:string}[]) {
  const arena=catalog.find(item=>!isArenaUnlocked(profile,item.id)&&getArenaSelectionProgress(profile,item.id,catalog).configured);
  return {character:getNextCharacterGoal(profile),arena:arena?{...arena,...getArenaSelectionProgress(profile,arena.id,catalog)}:null};
}
