import type {CanonicalGameState,TeamId} from '../game-core/types';
import {createSnapshot} from '../game-core/snapshot.ts';
import {parseProtocolMessage,type ProtocolMessage} from './protocol.ts';
import type {MatchSummary,ProgressionResult} from '../player-profile/match-progression';
export type MatchResultPacket=Extract<ProtocolMessage,{type:'MATCH_RESULT'}>;
export function createMatchResult(state:CanonicalGameState,humans:readonly {peerId:string;entityId:string}[],disconnected:ReadonlySet<string>):MatchResultPacket {
  if(state.phase!=='MATCH_OVER'||!state.result?.complete)throw Error('Incomplete match cannot award progression');
  const value:MatchResultPacket={version:1,type:'MATCH_RESULT',matchId:state.matchId,arenaId:state.arenaId,tick:state.tick,
    winner:state.result.winner,reason:state.result.reason,snapshot:createSnapshot(state),humans:humans.map(p=>{
      const actor=state.entities.find(e=>e.entityId===p.entityId),stats=state.matchStats[p.entityId];
      if(!actor||!stats)throw Error('Missing human result identity/statistics');
      return {...p,team:actor.team,eligible:!disconnected.has(p.peerId),...stats};
    })};
  const parsed=parseProtocolMessage(value);if(!parsed||parsed.type!=='MATCH_RESULT')throw Error('Invalid final result');return parsed;
}
/** Existing persistent resolver remains the only writer. Failed storage can retry. */
export function createResultHandoff(expected:{matchId:string;arenaId:string;peerId:string;entityId:string;team:TeamId},writer:(summary:MatchSummary)=>ProgressionResult|null){
  let delivered=false;
  return (value:unknown)=>{
    const m=parseProtocolMessage(value);
    if(!m||m.type!=='MATCH_RESULT'||m.matchId!==expected.matchId||m.arenaId!==expected.arenaId)return {ack:false,result:null};
    const human=m.humans.find(p=>p.peerId===expected.peerId&&p.entityId===expected.entityId&&p.team===expected.team);
    if(!human)return {ack:false,result:null};
    if(!human.eligible||delivered)return {ack:true,result:null};
    const result=writer({matchId:m.matchId,arenaId:m.arenaId,completed:true,won:m.winner===human.team,
      tags:human.tags,rescues:human.rescues,timesCaptured:human.prisons});
    if(!result)throw Error('Profil lokal tidak tersedia. Reward belum disimpan.');
    delivered=true;return {ack:true,result};
  };
}
