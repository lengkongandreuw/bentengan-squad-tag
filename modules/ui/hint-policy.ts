import type {TutorialMechanic} from '../../lib/player-profile/tutorial.ts';
export type HintId='returning'|TutorialMechanic;
export type HintContext={state:string;learned:readonly TutorialMechanic[];nearObstacle:boolean;parkourReady:boolean;rescueNeeded:boolean;ultimateReady:boolean;nearEnemyFort:boolean;fortOpen:boolean;moving:boolean;tagOpportunity:boolean};
/** Priority is presentation only. Learned beginner hints do not reappear. */
export function contextualHintCandidates(c:HintContext):HintId[]{
  if(c.state==='PRISONER')return [];
  if(c.state==='RETURNING')return ['returning'];
  const candidates:[TutorialMechanic,boolean][]=[['rescue',c.rescueNeeded],['capture',c.nearEnemyFort&&c.fortOpen],['ultimate',c.ultimateReady],['parkour',c.nearObstacle&&c.parkourReady],['tag',c.tagOpportunity],['sprint',c.moving],['movement',c.state==='IN_BASE']];
  return candidates.filter(([id,active])=>active&&!c.learned.includes(id)).map(([id])=>id);
}
