import {createRoom,joinRoom,type RoomTransport,type TransportDriver} from './transport';
import {MULTIPLAYER_PROTOCOL_VERSION as version,type ProtocolMessage} from './protocol';
import {createLobby,addParticipant,selectParticipant,readyParticipant,removeParticipant,startLobby,teamCharacters,type LobbyState} from './lobby';
import type {CharacterId} from '../characters';
import type {TeamId} from '../game-core/types';
import {text} from '../game-core/validation';
import {contentMismatch,testContent,type ContentIdentity} from './content';

export type SessionState={role:'host'|'client';roomCode:string;localPeerId:string;phase:'connecting'|'lobby'|'playing'|'ended';
  lobby:LobbyState|null;error:string;latencyMs:number|null};
export type SessionClock={now:()=>number;timeout:(fn:()=>void,ms:number)=>unknown;interval:(fn:()=>void,ms:number)=>unknown;clear:(handle:unknown)=>void};
const browserClock:SessionClock={now:()=>Date.now(),timeout:(fn,ms)=>setTimeout(fn,ms),interval:(fn,ms)=>setInterval(fn,ms),
  clear:handle=>{clearTimeout(handle as ReturnType<typeof setTimeout>);clearInterval(handle as ReturnType<typeof setInterval>);}};
export function attachSession(role:'host'|'client',name:string,transport:RoomTransport,clock=browserClock,content:ContentIdentity=testContent) {
  name=text(32)(name.trim());
  const localPeerId=transport.localPeerId,hostPeerId=transport.hostPeerId,sessionId=transport.roomCode;
  let closed=false,acknowledged=role==='host',nonce=0;
  let state:SessionState={role,roomCode:sessionId,localPeerId,phase:role==='host'?'lobby':'connecting',
    lobby:role==='host'?createLobby(localPeerId,name,sessionId):null,error:'',latencyMs:null};
  const listeners=new Set<(state:SessionState)=>void>(),pending=new Map<string,{nonce:number;sentAtMs:number}>(),timers:unknown[]=[],off:(()=>void)[]=[];
  const compatible=new Set<string>(),gameListeners=new Set<(peer:string,message:ProtocolMessage)=>void>();
  const lastHeard=new Map<string,number>();
  let lastSnapshot:ProtocolMessage|null=null,lastTick=-1;
  let finalResult:Extract<ProtocolMessage,{type:'MATCH_RESULT'}>|null=null;
  const resultAcks=new Set<string>();
  const eventIds=new Set<string>();
  let snapshotPublications=0;
  const read=()=>structuredClone(state);
  const notify=()=>{for(const fn of listeners)fn(read());};
  const stop=()=>{for(const timer of timers)clock.clear(timer);for(const unsubscribe of off)unsubscribe();transport.close();pending.clear();lastHeard.clear();compatible.clear();gameListeners.clear();lastSnapshot=null;finalResult=null;resultAcks.clear();eventIds.clear();};
  const fail=(error:string)=>{if(closed)return;state={...state,phase:'ended',error};closed=true;stop();notify();};
  const send=(peer:string,message:ProtocolMessage)=>{
    if(closed)return;void transport.send(peer,message).catch(()=>{if(!closed){state.error='Pesan gagal dikirim. Periksa koneksi peer.';notify();}});
  };
  const publish=()=>{
    if(!state.lobby)return;state.phase=state.lobby.phase==='started'?'playing':'lobby';notify();
    for(const p of state.lobby.participants)if(p.peerId!==localPeerId)send(p.peerId,{version,type:'LOBBY_STATE',lobby:state.lobby});
  };
  const ping=(peer:string)=>{const data={nonce:++nonce,sentAtMs:clock.now()};pending.set(peer,data);send(peer,{version,type:'PING',...data});};
  const accepted=(peer:string)=>role==='client'?acknowledged&&peer===hostPeerId:!!state.lobby?.participants.some(p=>p.peerId===peer&&!p.host);
  const depart=(peer:string)=>{pending.delete(peer);lastHeard.delete(peer);compatible.delete(peer);
    if(role==='host'&&state.lobby?.participants.some(p=>p.peerId===peer)){
      state.lobby=removeParticipant(state.lobby,peer);publish();
    }
  };
  const reject=(peer:string,code:'full'|'locked'|'selection'|'incompatible',message:string)=>send(peer,{version,type:'SESSION_ERROR',code,message});
  off.push(transport.onMessage((peer,m)=>{
    if(closed)return;
    if(m.type==='CONTENT_VERSION'){
      if(role==='client'&&peer!==hostPeerId)return;
      const error=contentMismatch(content,m.content);
      if(error){compatible.delete(peer);if(role==='client')fail(error);else {
        if(state.lobby?.participants.some(p=>p.peerId===peer)){state.lobby=removeParticipant(state.lobby,peer);publish();}
        reject(peer,'incompatible',error);
      }return;}
      compatible.add(peer);
      if(role==='host')send(peer,{version,type:'CONTENT_VERSION',content});
      else send(peer,{version,type:'HELLO',peerId:localPeerId,name});
      return;
    }
    if(role==='host'&&m.type==='HELLO'){
      if(m.peerId!==peer||peer===localPeerId||!compatible.has(peer))return;
      if(state.lobby!.participants.some(p=>p.peerId===peer))return;
      const next=addParticipant(state.lobby!,peer,m.name.trim());
      if(!next){reject(peer,state.lobby!.phase==='started'?'locked':'full','Room penuh atau sudah dikunci.');return;}
      state.lobby=next;
      lastHeard.set(peer,clock.now());
      void transport.send(peer,{version,type:'HELLO_ACK',hostPeerId,assignedPeerId:peer,sessionId}).then(()=>{
        if(!closed){publish();ping(peer);}
      }).catch(()=>{if(!closed){state.lobby=removeParticipant(state.lobby!,peer);publish();}});
      return;
    }
    if(role==='client'){
      if(peer!==hostPeerId)return;
      if(m.type==='HELLO_ACK'){
        if(!compatible.has(peer)||m.hostPeerId!==hostPeerId||m.assignedPeerId!==localPeerId||m.sessionId!==sessionId)return;
        acknowledged=true;lastHeard.set(peer,clock.now());ping(peer);return;
      }
      if(m.type==='SESSION_ERROR'){
        if(m.code==='selection'){state.error=m.message;notify();}else fail(m.message);return;
      }
      if(m.type==='LOBBY_STATE'){
        const next=m.lobby;
        if(!acknowledged||next.hostPeerId!==hostPeerId||next.sessionId!==sessionId||
          !next.participants.some(p=>p.peerId===localPeerId)||next.participants.some(p=>!teamCharacters(p.team).includes(p.characterId))||
          (state.lobby&&next.revision<=state.lobby.revision))return;
        if(next.phase==='started'&&state.phase!=='playing')transport.resetMetrics();
        lastHeard.set(peer,clock.now());state.lobby=next;state.phase=next.phase==='started'?'playing':'lobby';state.error='';notify();return;
      }
    }
    if(!accepted(peer))return;
    lastHeard.set(peer,clock.now());
    if(role==='host'&&m.type==='PLAYER_LEFT'&&m.peerId===peer){depart(peer);return;}
    if(m.type==='PING'){send(peer,{version,type:'PONG',nonce:m.nonce,sentAtMs:m.sentAtMs});return;}
    if(m.type==='PONG'){
      const sent=pending.get(peer);if(!sent||sent.nonce!==m.nonce||sent.sentAtMs!==m.sentAtMs)return;
      pending.delete(peer);state.latencyMs=Math.max(0,clock.now()-sent.sentAtMs);notify();return;
    }
    if(role==='host'&&(m.type==='PLAYER_SELECTION'||m.type==='READY')){
      if(m.peerId!==peer)return;
      const next=m.type==='READY'?readyParticipant(state.lobby!,peer,m.ready):selectParticipant(state.lobby!,peer,m.team,m.characterId);
      if(next){state.lobby=next;state.error='';publish();}else reject(peer,'selection','Pilihan ditolak: karakter tidak sesuai tim, sudah dipilih, atau lobby dikunci.');
    }
    if(state.phase==='playing'&&compatible.has(peer)){
      if(role==='host'&&m.type==='INPUT'){for(const fn of gameListeners)fn(peer,m);}
      if(role==='host'&&m.type==='RESULT_ACK'&&m.peerId===peer&&m.matchId===finalResult?.matchId)resultAcks.add(peer);
      if(role==='client'&&m.type==='MATCH_RESULT'&&m.matchId===`${sessionId}:match`&&m.arenaId===content.arenaId&&
        m.humans.some(p=>p.peerId===localPeerId&&p.team===state.lobby!.participants.find(p=>p.peerId===localPeerId)?.team)){
        if(finalResult&&JSON.stringify(finalResult)!==JSON.stringify(m))return;
        finalResult=m;for(const fn of gameListeners)fn(peer,m);
      }
      if(role==='client'&&m.type==='GAME_EVENT'&&m.matchId===`${sessionId}:match`&&!eventIds.has(m.eventId)){
        eventIds.add(m.eventId);if(eventIds.size>512)eventIds.delete(eventIds.values().next().value!);for(const fn of gameListeners)fn(peer,m);
      }
      if(role==='client'&&m.type==='PLAYER_LEFT'){for(const fn of gameListeners)fn(peer,m);}
      if(role==='client'&&(m.type==='SNAPSHOT'||m.type==='MATCH_START'||m.type==='MATCH_FRAME')){
        if(m.matchId!==`${sessionId}:match`||m.snapshot.arenaId!==content.arenaId||m.snapshot.tick<=lastTick)return;
        lastTick=m.snapshot.tick;lastSnapshot=m;for(const fn of gameListeners)fn(peer,m);
      }
    }
  }));
  off.push(transport.onPeerJoin(peer=>{
    if(!closed&&role==='client'&&peer===hostPeerId)send(peer,{version,type:'CONTENT_VERSION',content});
  }));
  off.push(transport.onPeerLeave(peer=>{
    if(role==='client'&&peer===hostPeerId){fail('HOST DISCONNECTED · Host terputus. Room ditutup; belum ada host migration.');return;}
    depart(peer);
  }));
  off.push(transport.onError(message=>{if(message.startsWith('Versi protokol berbeda')){fail(message);return;}if(!closed){state.error=message;notify();}}));
  if(role==='client')timers.push(clock.timeout(()=>{if(state.phase==='connecting')fail('Host tidak ditemukan dalam 20 detik. Periksa kode, jaringan, atau versi aplikasi.');},20000));
  timers.push(clock.interval(()=>{
    if(closed)return;
    if(role==='client'&&acknowledged&&clock.now()-(lastHeard.get(hostPeerId)??clock.now())>10000){
      fail('HOST DISCONNECTED · Host terputus atau tidak merespons. Room ditutup; belum ada host migration.');return;
    }
    if(role==='host')for(const p of state.lobby!.participants)if(!p.host&&clock.now()-(lastHeard.get(p.peerId)??clock.now())>10000){
      reject(p.peerId,'locked','Koneksi pemain terputus. Karakter diambil alih bot; belum ada reconnect.');depart(p.peerId);
    }
    for(const peer of transport.getPeers())if(accepted(peer))ping(peer);
    if(role==='host'&&finalResult)for(const p of state.lobby!.participants)if(!p.host&&!resultAcks.has(p.peerId))send(p.peerId,finalResult);
  },5000));
  return {read,subscribe(fn:(state:SessionState)=>void){listeners.add(fn);fn(read());return ()=>{listeners.delete(fn);};},
    content:structuredClone(content),
    metrics(){const m=transport.metrics();return {...m,peerCount:state.lobby?state.lobby.participants.length-1:0,
      humanCount:state.lobby?.participants.length??0,transportPeerCount:transport.getPeers().length,snapshotPublications,
      snapshotRateHz:snapshotPublications/m.elapsedSeconds,sentMessagesPerSecond:m.sentMessages/m.elapsedSeconds,
      receivedMessagesPerSecond:m.receivedMessages/m.elapsedSeconds};},
    onGameplay(fn:(peer:string,message:ProtocolMessage)=>void){gameListeners.add(fn);if(lastSnapshot)fn(hostPeerId,structuredClone(lastSnapshot));if(role==='client'&&finalResult)fn(hostPeerId,structuredClone(finalResult));return ()=>{gameListeners.delete(fn);};},
    publishResult(message:Extract<ProtocolMessage,{type:'MATCH_RESULT'}>){if(role!=='host'||closed||state.phase!=='playing'||finalResult)return;
      finalResult=structuredClone(message);for(const p of state.lobby!.participants)if(!p.host)send(p.peerId,finalResult);},
    ackResult(matchId:string){if(role==='client'&&finalResult?.matchId===matchId)send(hostPeerId,{version,type:'RESULT_ACK',matchId,peerId:localPeerId});},
    sendInput(message:Extract<ProtocolMessage,{type:'INPUT'}>){if(role==='client'&&state.phase==='playing'&&!closed)send(hostPeerId,message);},
    publishSnapshot(message:Extract<ProtocolMessage,{type:'SNAPSHOT'|'MATCH_START'|'MATCH_FRAME'}>){if(role==='host'&&state.phase==='playing'&&!closed){snapshotPublications++;for(const p of state.lobby!.participants)if(!p.host&&compatible.has(p.peerId))send(p.peerId,message);}},
    publishEvent(message:Extract<ProtocolMessage,{type:'GAME_EVENT'}>){if(role==='host'&&state.phase==='playing'&&!closed)for(const p of state.lobby!.participants)if(!p.host)send(p.peerId,message);},
    publishDeparture(peerId:string,entityId:string){if(role==='host'&&state.phase==='playing'&&!closed)for(const p of state.lobby!.participants)if(!p.host)send(p.peerId,{version,type:'PLAYER_LEFT',peerId,entityId,reason:'disconnected'});},
    select(team:TeamId,characterId:CharacterId){
      if(closed||state.phase!=='lobby')return;
      if(role==='host'){const next=selectParticipant(state.lobby!,localPeerId,team,characterId);if(next){state.lobby=next;publish();}else{state.error='Pilihan tim/karakter tidak valid atau sudah dipilih.';notify();}}
      else send(hostPeerId,{version,type:'PLAYER_SELECTION',peerId:localPeerId,team,characterId});
    },
    ready(ready:boolean){if(closed||state.phase!=='lobby')return;
      if(role==='host'){state.lobby=readyParticipant(state.lobby!,localPeerId,ready);publish();}
      else send(hostPeerId,{version,type:'READY',peerId:localPeerId,ready});
    },
    start(){if(closed||role!=='host'||!state.lobby||state.lobby.participants.some(p=>!p.host&&!compatible.has(p.peerId)))return false;const next=startLobby(state.lobby,localPeerId);
      if(!next)return false;transport.resetMetrics();snapshotPublications=0;state.lobby=next;publish();return true;},
    close(){if(closed)return;closed=true;state.phase='ended';stop();notify();listeners.clear();},
  };
}
export type MultiplayerSession=ReturnType<typeof attachSession>;
export async function hostSession(name:string,driver?:TransportDriver,clock?:SessionClock,content?:ContentIdentity){
  text(32)(name.trim());const transport=await createRoom(driver);try{return attachSession('host',name,transport,clock,content);}catch(error){transport.close();throw error;}
}
export async function joinSession(code:string,name:string,driver?:TransportDriver,clock?:SessionClock,content?:ContentIdentity){
  text(32)(name.trim());const transport=await joinRoom(code,driver);try{return attachSession('client',name,transport,clock,content);}catch(error){transport.close();throw error;}
}
