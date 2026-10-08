import type {RuntimeActor,LegacyTeam,MatchPhase} from './types';
import type {GameEvent} from './events';
export type RoundResult = Extract<GameEvent,{type:'ROUND_ENDED'|'MATCH_ENDED'}>&{phase:'ROUND_OVER'|'MATCH_OVER';phaseUntil:number};
export function suddenDeathTagWinner(suddenDeath:boolean,team:LegacyTeam) {
  return suddenDeath?{team,reason:'SUDDEN DEATH TAG'}:null;
}
/** Best-of-three authority; caller presents and persists the returned result once. */
export function endRound(players:RuntimeActor[],score:Record<LegacyTeam,number>,phase:MatchPhase,team:LegacyTeam,reason:string,now:number):RoundResult|null {
  if(phase!=='PLAYING')return null;
  for(const actor of players)actor.flight=null;
  score[team]++;
  const complete=score[team]>=2;
  return {type:complete?'MATCH_ENDED':'ROUND_ENDED',team,reason,phase:complete?'MATCH_OVER':'ROUND_OVER',phaseUntil:now+(complete?Infinity:4500)};
}
export function stepMatchTimer(players:RuntimeActor[],timer:number,suddenDeath:boolean,dt:number) {
  if(suddenDeath)return {timer,suddenDeath,winner:null};
  timer-=dt;
  if(timer>0)return {timer,suddenDeath,winner:null};
  const blueHeld=players.filter(p=>p.team==='red'&&p.state==='PRISONER').length;
  const redHeld=players.filter(p=>p.team==='blue'&&p.state==='PRISONER').length;
  const unique=(team:LegacyTeam)=>new Set(players.filter(p=>p.team===team).flatMap(p=>p.capturedIds)).size;
  const blueUnique=unique('blue'),redUnique=unique('red');
  if(blueHeld!==redHeld)return {timer,suddenDeath,winner:{team:(blueHeld>redHeld?'blue':'red') as LegacyTeam,reason:'WAKTU HABIS'}};
  if(blueUnique!==redUnique)return {timer,suddenDeath,winner:{team:(blueUnique>redUnique?'blue':'red') as LegacyTeam,reason:'TANGKAPAN UNIK'}};
  return {timer:0,suddenDeath:true,winner:null};
}
export function phaseTransition(phase:MatchPhase,until:number,now:number,nextRoundRequested:boolean) {
  if(phase==='COUNTDOWN')return now>=until?'start-round':'countdown';
  if(phase==='ROUND_OVER'&&(now>=until||nextRoundRequested))return 'next-round';
  return phase==='MATCH_OVER'?'finished':'continue';
}
