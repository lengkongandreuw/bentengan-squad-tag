import type {CharacterId} from '../characters.ts';
// Existing Kampung map and ordinary base-relative spawns; no second map schema.
export const TUTORIAL_MATCH={kind:'tutorial' as const,character:'raja' as CharacterId,
  arenaIdentity:'kampung',friendly:['raja','robot'] as CharacterId[],enemy:['ciici','kaka'] as CharacterId[],
  spawnOffsets:[{x:92,y:0},{x:92,y:35}],format:'legacy-bo3' as const,requiredWins:1};
export const isTutorialMatch=(id:string|null)=>!!id?.startsWith('tutorial:');
