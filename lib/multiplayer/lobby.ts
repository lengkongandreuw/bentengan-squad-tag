import rules from '../../config/game-rules.json';
import type {CharacterId} from '../characters';
import type {TeamId} from '../game-core/types';
export type Participant={peerId:string;name:string;team:TeamId;characterId:CharacterId;ready:boolean;host:boolean};
export type LobbyState={sessionId:string;hostPeerId:string;revision:number;phase:'lobby'|'started';participants:Participant[]};
export const MAX_HUMANS=4;
export const teamCharacters=(team:TeamId)=>rules.teams[team].roster as CharacterId[];
export function createLobby(hostPeerId:string,name:string,sessionId:string):LobbyState {
  return {sessionId,hostPeerId,revision:0,phase:'lobby',participants:[{peerId:hostPeerId,name,team:'red',characterId:teamCharacters('red')[0],ready:true,host:true}]};
}
export function addParticipant(lobby:LobbyState,peerId:string,name:string):LobbyState|null {
  if(lobby.phase!=='lobby'||lobby.participants.length>=MAX_HUMANS||lobby.participants.some(p=>p.peerId===peerId))return null;
  const count=(team:TeamId)=>lobby.participants.filter(p=>p.team===team).length;
  const team:TeamId=count('green')<=count('red')?'green':'red';
  const characterId=teamCharacters(team).find(id=>!lobby.participants.some(p=>p.team===team&&p.characterId===id));
  if(!characterId)return null;
  return {...lobby,revision:lobby.revision+1,participants:[...lobby.participants,{peerId,name,team,characterId,ready:false,host:false}]};
}
export function selectParticipant(lobby:LobbyState,peerId:string,team:TeamId,characterId:CharacterId) {
  const p=lobby.participants.find(p=>p.peerId===peerId);
  if(!p||lobby.phase!=='lobby'||!teamCharacters(team).includes(characterId)||lobby.participants.some(q=>q.peerId!==peerId&&q.team===team&&q.characterId===characterId))return null;
  if(p.team===team&&p.characterId===characterId)return lobby;
  return {...lobby,revision:lobby.revision+1,participants:lobby.participants.map(q=>q.peerId===peerId?{...q,team,characterId,ready:false}:q)};
}
export function readyParticipant(lobby:LobbyState,peerId:string,ready:boolean) {
  if(lobby.phase!=='lobby'||!lobby.participants.some(p=>p.peerId===peerId))return null;
  return {...lobby,revision:lobby.revision+1,participants:lobby.participants.map(p=>p.peerId===peerId?{...p,ready}:p)};
}
export function removeParticipant(lobby:LobbyState,peerId:string) {
  return {...lobby,revision:lobby.revision+1,participants:lobby.participants.filter(p=>p.peerId!==peerId)};
}
export const canStartLobby=(lobby:LobbyState)=>lobby.phase==='lobby'&&lobby.participants.length>=2&&lobby.participants.every(p=>p.ready);
export function startLobby(lobby:LobbyState,peerId:string) {
  return peerId===lobby.hostPeerId&&canStartLobby(lobby)?{...lobby,revision:lobby.revision+1,phase:'started' as const}:null;
}
export function botPreview(lobby:LobbyState){return {red:5-lobby.participants.filter(p=>p.team==='red').length,green:5-lobby.participants.filter(p=>p.team==='green').length};}
