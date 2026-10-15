import type {LocalPlayerProfile} from './types.ts';
import {progressionRules} from './progression-rules.ts';

export type TutorialStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type TutorialState = {
  version: number;
  status: TutorialStatus;
  currentStepId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  rewardClaimed: boolean;
  /** Replay is persisted, so reload can never re-enable first-time rewards. */
  replay: boolean;
  /** Current attempt, separate from lifetime completed/skipped status. */
  sessionActive: boolean;
};
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const createDefaultTutorial = (): TutorialState => ({version:1,status:'not_started',currentStepId:null,
  startedAt:null,completedAt:null,skippedAt:null,rewardClaimed:false,replay:false,sessionActive:false});

export function parseTutorialState(value: unknown): TutorialState | null {
  if (!record(value) || !Number.isSafeInteger(value.version) || (value.version as number)<1 ||
    !['not_started','in_progress','completed','skipped'].includes(value.status as string) ||
    typeof value.rewardClaimed!=='boolean' || (value.replay!==undefined&&typeof value.replay!=='boolean') ||
    (value.sessionActive!==undefined&&typeof value.sessionActive!=='boolean')) return null;
  for (const key of ['startedAt','completedAt','skippedAt']) if(value[key]!=null&&!date(value[key]))return null;
  if(value.currentStepId!=null&&(typeof value.currentStepId!=='string'||!value.currentStepId.trim()||value.currentStepId.length>64))return null;
  if(value.status==='in_progress'&&(!date(value.startedAt)||typeof value.currentStepId!=='string'))return null;
  if(value.status==='completed'&&!date(value.completedAt))return null;
  if(value.status==='skipped'&&!date(value.skippedAt))return null;
  // Inconsistent resets go through the repair path, which supplies valid dates.
  if(value.status==='not_started'&&(value.completedAt||value.skippedAt||value.startedAt||value.rewardClaimed))return null;
  const active=value.sessionActive===true||value.status==='in_progress';
  if(active&&(!date(value.startedAt)||typeof value.currentStepId!=='string'))return null;
  const status=(value.status==='in_progress'&&date(value.completedAt)?'completed':value.status==='in_progress'&&date(value.skippedAt)?'skipped':value.status) as TutorialStatus;
  return {version:value.version as number,status,currentStepId:active?value.currentStepId as string:null,sessionActive:active,
    startedAt:value.startedAt as string|null??null,completedAt:value.completedAt as string|null??null,
    skippedAt:value.skippedAt as string|null??null,rewardClaimed:value.rewardClaimed,
    replay:value.replay===true || (value.status==='in_progress'&&!!(value.completedAt||value.skippedAt||(value.sessionActive===undefined&&value.rewardClaimed)))};
}

const positive = (value: unknown) => typeof value==='number'&&Number.isFinite(value)&&value>0;
export function hasTutorialHistory(profile: LocalPlayerProfile) {
  return [profile.menang,profile.kalah,...Object.values(profile.kda),profile.progression?.xp].some(positive) ||
    !!profile.progression?.processedMatchIds.length ||
    !!profile.progression?.unlockedCharacters.some(id=>!progressionRules.initialUnlocks.characters.includes(id)) ||
    !!profile.progression?.unlockedArenaIds.some(id=>!progressionRules.initialUnlocks.arenaIds.includes(id)) ||
    Object.values(profile.progression?.arenaStats??{}).some(stats=>positive(stats.played)||positive(stats.wins));
}

export function migratePlayerTutorial(profile: LocalPlayerProfile, raw: unknown=profile.tutorial) {
  const parsed=parseTutorialState(raw);
  if(parsed)return {profile:{...profile,tutorial:parsed},migrated:Object.entries(parsed).some(([key,value])=>(raw as Record<string,unknown>)[key]!==value)};
  const value=record(raw)?raw:{};
  const experienced=hasTutorialHistory(profile);
  const terminal=value.status==='completed'||value.status==='skipped'||value.rewardClaimed===true||date(value.completedAt)||date(value.skippedAt)||date(value.startedAt);
  const tutorial=createDefaultTutorial();
  if(experienced||terminal){tutorial.status='skipped';tutorial.skippedAt=date(value.skippedAt)?value.skippedAt:profile.firstJoin;}
  if(value.status==='completed'||date(value.completedAt)||value.rewardClaimed===true){
    tutorial.status='completed';tutorial.completedAt=date(value.completedAt)?value.completedAt:profile.firstJoin;
  }
  tutorial.rewardClaimed=value.rewardClaimed===true;
  tutorial.replay=value.replay===true;
  return {profile:{...profile,tutorial},migrated:true};
}

export function shouldOfferTutorial(profile: LocalPlayerProfile | null | undefined) {
  if(!profile)return false;
  const state=migratePlayerTutorial(profile).profile.tutorial;
  return state.version===1&&state.status==='not_started';
}

function change(profile: LocalPlayerProfile, update: (state: TutorialState)=>TutorialState) {
  const state=migratePlayerTutorial(profile).profile.tutorial;
  if(state.version>1)throw new Error('Versi tutorial belum didukung.');
  const next=update(state);
  return next===state?profile:{...profile,tutorial:next};
}
const timestamp=(now:string)=>{if(!date(now))throw new Error('Waktu tutorial tidak valid.');return now;};
export function startTutorial(profile: LocalPlayerProfile, replay=false, now=new Date().toISOString()) {
  return change(profile,state=>state.sessionActive&&!replay?state:{...state,status:state.status==='completed'||state.status==='skipped'?state.status:'in_progress',currentStepId:'intro',startedAt:timestamp(now),sessionActive:true,
    replay:replay||state.replay||state.status==='completed'||state.status==='skipped'});
}
export function skipTutorial(profile: LocalPlayerProfile, now=new Date().toISOString()) {
  return change(profile,state=>state.status==='completed'&&!state.sessionActive?state:({...state,status:state.status==='completed'?'completed':'skipped',sessionActive:false,currentStepId:null,skippedAt:state.status==='completed'?state.skippedAt:state.skippedAt??timestamp(now)}));
}
export function completeTutorial(profile: LocalPlayerProfile, now=new Date().toISOString()) {
  return change(profile,state=>!state.sessionActive?state:{...state,status:'completed',sessionActive:false,currentStepId:null,
    completedAt:state.completedAt??timestamp(now)});
}
export function updateTutorialStep(profile: LocalPlayerProfile, stepId: string) {
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(stepId))throw new Error('Langkah tutorial tidak valid.');
  return change(profile,state=>state.sessionActive?{...state,currentStepId:stepId}:state);
}
export const tutorialFirstRewardEligible = (profile: LocalPlayerProfile) => {
  const state=migratePlayerTutorial(profile).profile.tutorial;
  return state.status==='completed'&&!state.replay&&!state.rewardClaimed;
};
