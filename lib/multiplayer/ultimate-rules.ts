import {CHARACTER_BY_ID, MULTIPLAYER_ULTIMATE_CHARACTER_IDS} from '../characters.ts';
import type {RuntimeActor} from '../game-core/types.ts';
import {getEffectiveUltimateStats} from '../player-profile/ultimate-effective-stats.ts';
import type {UltimateRules} from '../../modules/gameplay/ultimate.ts';

/** Online uses catalog base levels for every peer, like the existing skills.
 * No client profile, upgrade level, timer or speed is accepted as authority. */
export function networkUltimateRulesFor(actor:RuntimeActor,kanal2:boolean):UltimateRules {
  const descriptor=CHARACTER_BY_ID[actor.characterId].ultimate;
  const stats=getEffectiveUltimateStats(null,actor.characterId);
  return {supported:MULTIPLAYER_ULTIMATE_CHARACTER_IDS,kanal2,
    rechargeSeconds:stats?.rechargeSeconds??45,castMs:stats?.castMs??descriptor?.castMs??0,
    durationMs:stats?.durationMs??0,speedMultiplier:stats?.speedMultiplier??1};
}
