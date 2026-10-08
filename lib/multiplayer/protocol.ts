import type {GameEvent} from '../game-core/events';
import {canonicalTeam} from '../game-core/state.ts';
import {parseSnapshot,type GameSnapshot} from '../game-core/snapshot.ts';
import {object,oneOf,integer,nonnegative,finite,bool,id,text,team,character,nullable,list,point,bounded,safely,type Validator} from '../game-core/validation.ts';

export const MULTIPLAYER_PROTOCOL_VERSION=1;
export const MAX_PROTOCOL_MESSAGE_CHARS=128*1024;
const version=oneOf([MULTIPLAYER_PROTOCOL_VERSION]);
const inputSchema=object({moveX:bounded(-1,1),moveY:bounded(-1,1),sprint:bool,keyboardSprint:bool,sprintPulse:bool,
  parkour:bool,ultimate:bool,rescue:bool,pause:bool,target:nullable(point)});
export type NetworkInput=ReturnType<typeof inputSchema>;
/** Explicit conversion of core's compatibility faction names; do not guess at inbound teams. */
type WireEvent<T> = T extends {team:infer _Team}?Omit<T,'team'>&{team:'red'|'green'}:T;
export type NetworkGameEvent=WireEvent<GameEvent>;
export function toNetworkGameEvent(event:GameEvent):NetworkGameEvent {
  const value='team' in event?{...event,team:canonicalTeam(event.team)}:{...event};
  const parsed=parseNetworkGameEvent(value);if(!parsed)throw Error('Invalid game event');return parsed;
}
export function fromNetworkGameEvent(event:NetworkGameEvent):GameEvent {
  return ('team' in event?{...event,team:event.team==='red'?'blue':'red'}:{...event}) as GameEvent;
}
const eventSchemas={
  PLAYER_TAGGED:object({type:oneOf(['PLAYER_TAGGED']),actorId:id,targetId:id,x:finite,y:finite}),
  PLAYER_CAPTURED:object({type:oneOf(['PLAYER_CAPTURED']),actorId:id,targetId:id}),
  PLAYER_RESCUED:object({type:oneOf(['PLAYER_RESCUED']),actorId:id,targetIds:list(id),x:finite,y:finite}),
  ULTIMATE_STARTED:object({type:oneOf(['ULTIMATE_STARTED']),actorId:id,flight:bool}),
  ULTIMATE_APPLIED:object({type:oneOf(['ULTIMATE_APPLIED']),actorId:id,effect:oneOf(['shield','speed']),durationMs:nonnegative,speedMultiplier:nonnegative}),
  FORT_ENTERED:object({type:oneOf(['FORT_ENTERED']),actorId:id,team}),
  FORT_CAPTURED:object({type:oneOf(['FORT_CAPTURED']),team,reason:oneOf(['BENTENG DIREBUT'])}),
  ROUND_ENDED:object({type:oneOf(['ROUND_ENDED']),team,reason:text(256)}),
  MATCH_ENDED:object({type:oneOf(['MATCH_ENDED']),team,reason:text(256)}),
  FORCED_EXIT:object({type:oneOf(['FORCED_EXIT']),actorId:id}),
  BOOST_RECOVERED:object({type:oneOf(['BOOST_RECOVERED']),actorId:id}),
};
function discriminator(value:unknown):string|null {
  try{
    if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)return null;
    const d=Object.getOwnPropertyDescriptor(value,'type');return d&&'value' in d&&typeof d.value==='string'?d.value:null;
  }catch{return null;}
}
export function parseNetworkGameEvent(value:unknown):NetworkGameEvent|null {
  const key=discriminator(value);if(!key||!Object.hasOwn(eventSchemas,key))return null;
  const parsed=safely(eventSchemas[key as keyof typeof eventSchemas] as Validator<NetworkGameEvent>,value);
  if(parsed?.type==='PLAYER_RESCUED'&&(!parsed.targetIds.length||new Set(parsed.targetIds).size!==parsed.targetIds.length||parsed.targetIds.includes(parsed.actorId)))return null;
  if(parsed&&(parsed.type==='PLAYER_TAGGED'||parsed.type==='PLAYER_CAPTURED')&&parsed.actorId===parsed.targetId)return null;
  return parsed;
}
const snapshot:Validator<GameSnapshot>=value=>{const parsed=parseSnapshot(value);if(!parsed)throw Error('Invalid snapshot');return parsed;};
const gameEvent:Validator<NetworkGameEvent>=value=>{const parsed=parseNetworkGameEvent(value);if(!parsed)throw Error('Invalid event');return parsed;};
const lobby=object({sessionId:id,hostPeerId:id,revision:integer,phase:oneOf(['lobby','started']),participants:list(object({
  peerId:id,name:text(32),team,characterId:character,ready:bool,host:bool}),4)});
const statRows=list(object({entityId:id,tags:integer,rescues:integer,prisons:integer}),10);
const schemas={
  MATCH_FRAME:object({version,type:oneOf(['MATCH_FRAME']),matchId:id,tick:integer,snapshot,matchStartedAtMs:nonnegative,rescueCooldownUntil:nonnegative,
    roundStats:statRows,matchStats:statRows}),
  MATCH_RESULT:object({version,type:oneOf(['MATCH_RESULT']),matchId:id,arenaId:id,tick:integer,winner:team,reason:text(256),snapshot,
    humans:list(object({peerId:id,entityId:id,team,eligible:bool,tags:integer,rescues:integer,prisons:integer}),4)}),
  RESULT_ACK:object({version,type:oneOf(['RESULT_ACK']),matchId:id,peerId:id}),
  CONTENT_VERSION:object({version,type:oneOf(['CONTENT_VERSION']),content:object({protocolVersion:integer,buildVersion:text(128),arenaId:id,arenaRevision:text(128)})}),
  LOBBY_STATE:object({version,type:oneOf(['LOBBY_STATE']),lobby}),
  SESSION_ERROR:object({version,type:oneOf(['SESSION_ERROR']),code:oneOf(['full','locked','selection','incompatible']),message:text(256)}),
  HELLO:object({version,type:oneOf(['HELLO']),peerId:id,name:text(32)}),
  HELLO_ACK:object({version,type:oneOf(['HELLO_ACK']),hostPeerId:id,assignedPeerId:id,sessionId:id}),
  READY:object({version,type:oneOf(['READY']),peerId:id,ready:bool}),
  PLAYER_SELECTION:object({version,type:oneOf(['PLAYER_SELECTION']),peerId:id,characterId:character,team}),
  INPUT:object({version,type:oneOf(['INPUT']),matchId:id,entityId:id,sequence:integer,input:inputSchema}),
  SNAPSHOT:object({version,type:oneOf(['SNAPSHOT']),matchId:id,tick:integer,snapshot}),
  GAME_EVENT:object({version,type:oneOf(['GAME_EVENT']),matchId:id,tick:integer,eventId:id,event:gameEvent}),
  MATCH_START:object({version,type:oneOf(['MATCH_START']),matchId:id,arenaId:id,startAtMs:nonnegative,snapshot}),
  MATCH_END:object({version,type:oneOf(['MATCH_END']),matchId:id,tick:integer,winner:team,reason:text(256)}),
  PING:object({version,type:oneOf(['PING']),nonce:integer,sentAtMs:nonnegative}),
  PONG:object({version,type:oneOf(['PONG']),nonce:integer,sentAtMs:nonnegative}),
  PLAYER_LEFT:object({version,type:oneOf(['PLAYER_LEFT']),peerId:id,entityId:nullable(id),reason:oneOf(['quit','disconnected','timeout'])}),
};
export type ProtocolMessage=ReturnType<(typeof schemas)[keyof typeof schemas]>;
/** Structural validation only; connection ownership, monotonicity and authority are later runtime gates. */
export function parseProtocolMessage(value:unknown):ProtocolMessage|null {
  const key=discriminator(value);if(!key||!Object.hasOwn(schemas,key))return null;
  const m=safely(schemas[key as keyof typeof schemas] as Validator<ProtocolMessage>,value);if(!m)return null;
  if(m.type==='HELLO'&&!m.name.trim())return null;
  if(m.type==='LOBBY_STATE'){
    const peers=m.lobby.participants,hosts=peers.filter(p=>p.host);
    if(!peers.length||hosts.length!==1||hosts[0].peerId!==m.lobby.hostPeerId||new Set(peers.map(p=>p.peerId)).size!==peers.length||
      peers.some(p=>!p.name.trim())||new Set(peers.map(p=>`${p.team}:${p.characterId}`)).size!==peers.length)return null;
  }
  if(m.type==='INPUT'&&(m.sequence<1||m.input.sprint!==(m.input.keyboardSprint||m.input.sprintPulse)))return null;
  if(m.type==='MATCH_RESULT'){
    const s=m.snapshot,rows=m.humans;
    if(m.matchId!==s.matchId||m.arenaId!==s.arenaId||m.tick!==s.tick||s.phase!=='MATCH_OVER'||!s.result?.complete||s.result.winner!==m.winner||s.result.reason!==m.reason||
      !rows.length||new Set(rows.map(p=>p.peerId)).size!==rows.length||new Set(rows.map(p=>p.entityId)).size!==rows.length||
      rows.some(p=>!s.entities.some(e=>e.id===p.entityId&&e.team===p.team)))return null;
  }
  if(m.type==='MATCH_FRAME'){
    const ids=new Set(m.snapshot.entities.map(p=>p.id));
    if(m.matchId!==m.snapshot.matchId||m.tick!==m.snapshot.tick||[m.roundStats,m.matchStats].some(rows=>rows.length!==ids.size||new Set(rows.map(p=>p.entityId)).size!==ids.size||rows.some(p=>!ids.has(p.entityId))))return null;
  }
  if(m.type==='SNAPSHOT'&&(m.matchId!==m.snapshot.matchId||m.tick!==m.snapshot.tick))return null;
  if(m.type==='MATCH_START'&&(m.matchId!==m.snapshot.matchId||m.arenaId!==m.snapshot.arenaId||
    (m.snapshot.phase!=='COUNTDOWN'&&m.snapshot.phase!=='PLAYING')))return null;
  return m;
}
export const isProtocolMessage=(value:unknown):value is ProtocolMessage=>parseProtocolMessage(value)!==null;
export function decodeProtocolMessage(json:string):ProtocolMessage|null {
  if(typeof json!=='string'||json.length>MAX_PROTOCOL_MESSAGE_CHARS)return null;
  try{return parseProtocolMessage(JSON.parse(json));}catch{return null;}
}
export function encodeProtocolMessage(message:ProtocolMessage):string {
  const parsed=parseProtocolMessage(message);if(!parsed)throw Error('Invalid protocol message');
  const json=JSON.stringify(parsed);if(json.length>MAX_PROTOCOL_MESSAGE_CHARS)throw Error('Protocol message too large');return json;
}
