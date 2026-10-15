import type {LocalPlayerProfile} from './types.ts';
import {applyMatchProgression} from './match-progression.ts';
import {migratePlayerTutorial} from './tutorial.ts';

/** Lifetime identity, not the transient training match ID; atomic with claimed. */
export function applyTutorialReward(profile:LocalPlayerProfile) {
  const tutorial=migratePlayerTutorial(profile).profile.tutorial;
  if(tutorial.version!==1)throw new Error('Versi tutorial belum didukung.');
  const eligible=tutorial.sessionActive&&tutorial.currentStepId==='reward'&&tutorial.status==='in_progress'&&!tutorial.replay&&!tutorial.rewardClaimed;
  const result=applyMatchProgression(profile,{matchId:`tutorial:v1:${profile.id}`,arenaId:'kampung',completed:eligible,won:false,tags:0,rescues:0},'onboarding');
  if(eligible&&(result.applied||result.reason==='duplicate'))result.profile={...result.profile,tutorial:{...tutorial,rewardClaimed:true}};
  return result;
}
