import {decodeProtocolMessage,encodeProtocolMessage,MAX_PROTOCOL_MESSAGE_CHARS,MULTIPLAYER_PROTOCOL_VERSION,type ProtocolMessage} from './protocol';

export type WireLink={send:(data:string,target?:string)=>Promise<void>;getPeers:()=>string[];
  onMessage:(fn:(data:unknown,peerId:string)=>void)=>void;onJoin:(fn:(peerId:string)=>void)=>void;
  onLeave:(fn:(peerId:string)=>void)=>void;close:()=>Promise<void>|void};
export type TransportDriver={selfId:string;random:()=>Uint8Array;open:(roomCode:string,onError:(message:string)=>void)=>WireLink};
export type RoomTransport={roomCode:string;localPeerId:string;hostPeerId:string;getPeers:()=>string[];
  metrics:()=>{elapsedSeconds:number;sentMessages:number;sentBytes:number;receivedMessages:number;receivedBytes:number;sentByType:Record<string,{messages:number;bytes:number}>;receivedByType:Record<string,{messages:number;bytes:number}>};resetMetrics:()=>void;
  send:(peerId:string,message:ProtocolMessage)=>Promise<void>;broadcast:(message:ProtocolMessage)=>Promise<void>;
  onMessage:(fn:(peerId:string,message:ProtocolMessage)=>void)=>()=>void;
  onPeerJoin:(fn:(peerId:string)=>void)=>()=>void;onPeerLeave:(fn:(peerId:string)=>void)=>()=>void;
  onError:(fn:(message:string)=>void)=>()=>void;close:()=>void};
export function parseRoomCode(value:string) {
  const code=value.trim();return /^BNT-[A-HJ-NP-Z2-9]{8}-[A-Za-z0-9]{20}$/.test(code)?code:null;
}
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function openRoom(role:'host'|'client',code:string|undefined,driver:TransportDriver):RoomTransport {
  const bytes=role==='host'?driver.random():null;
  const roomCode=role==='host'?`BNT-${Array.from(bytes!.slice(0,8),n=>alphabet[n%32]).join('')}-${driver.selfId}`:parseRoomCode(code??'');
  if(!roomCode||!parseRoomCode(roomCode))throw Error('Kode room tidak valid. Salin seluruh kode dari host.');
  if(role==='client'&&roomCode.endsWith(`-${driver.selfId}`))throw Error('Gunakan tab/perangkat lain untuk join room sendiri.');
  const hostPeerId=roomCode.slice(-20),messages=new Set<(p:string,m:ProtocolMessage)=>void>(),joins=new Set<(p:string)=>void>(),
    leaves=new Set<(p:string)=>void>(),errors=new Set<(m:string)=>void>();
  let closed=false;
  const encoder=new TextEncoder();let metricsStarted=performance.now(),sentMessages=0,sentBytes=0,receivedMessages=0,receivedBytes=0;
  const sentByType:Record<string,{messages:number;bytes:number}>={},receivedByType:Record<string,{messages:number;bytes:number}>={};
  const count=(table:typeof sentByType,type:string,bytes:number)=>{const row=table[type]??={messages:0,bytes:0};row.messages++;row.bytes+=bytes;};
  const link=driver.open(roomCode,message=>{if(!closed)for(const fn of errors)fn(message);});
  const peers=new Set(link.getPeers());
  link.onJoin(peer=>{if(closed||peer===driver.selfId)return;peers.add(peer);for(const fn of joins)fn(peer);});
  link.onLeave(peer=>{if(closed||!peers.delete(peer))return;for(const fn of leaves)fn(peer);});
  link.onMessage((data,peer)=>{
    if(closed||!peers.has(peer)||typeof data!=='string')return;
    const message=decodeProtocolMessage(data);
    if(message){const bytes=encoder.encode(data).byteLength;receivedMessages++;receivedBytes+=bytes;count(receivedByType,message.type,bytes);for(const fn of messages)fn(peer,message);return;}
    if(data.length<=MAX_PROTOCOL_MESSAGE_CHARS)try{
      const envelope=JSON.parse(data);
      if(envelope&&typeof envelope.version==='number'&&envelope.version!==MULTIPLAYER_PROTOCOL_VERSION&&
        (envelope.type==='HELLO'||envelope.type==='CONTENT_VERSION')){
        const message='Versi protokol berbeda. Perbarui game kedua pemain.';
        if(role==='host')void link.send(encodeProtocolMessage({version:MULTIPLAYER_PROTOCOL_VERSION,type:'SESSION_ERROR',code:'incompatible',message}),peer).catch(()=>{});
        else if(peer===hostPeerId)for(const fn of errors)fn(message);
        return;
      }
    }catch{/* Malformed packets remain ignored. */}
  });
  const listen=<T>(set:Set<T>,fn:T)=>{if(closed)throw Error('Room sudah ditutup.');set.add(fn);return ()=>{set.delete(fn);};};
  return {roomCode,localPeerId:driver.selfId,hostPeerId,getPeers:()=>Array.from(peers),
    metrics:()=>({elapsedSeconds:Math.max(.001,(performance.now()-metricsStarted)/1000),sentMessages,sentBytes,receivedMessages,receivedBytes,sentByType:structuredClone(sentByType),receivedByType:structuredClone(receivedByType)}),
    resetMetrics(){metricsStarted=performance.now();sentMessages=0;sentBytes=0;receivedMessages=0;receivedBytes=0;for(const key of Object.keys(sentByType))delete sentByType[key];for(const key of Object.keys(receivedByType))delete receivedByType[key];},
    async send(peer,message){if(closed||!peers.has(peer))throw Error('Peer tidak terhubung.');const data=encodeProtocolMessage(message);await link.send(data,peer);
      const bytes=encoder.encode(data).byteLength;sentMessages++;sentBytes+=bytes;count(sentByType,message.type,bytes);},
    async broadcast(message){if(closed)throw Error('Room sudah ditutup.');const data=encodeProtocolMessage(message),targets=peers.size;await link.send(data);
      const bytes=encoder.encode(data).byteLength;for(let i=0;i<targets;i++){sentMessages++;sentBytes+=bytes;count(sentByType,message.type,bytes);}},
    onMessage:fn=>listen(messages,fn),onPeerLeave:fn=>listen(leaves,fn),onError:fn=>listen(errors,fn),
    onPeerJoin:fn=>{const off=listen(joins,fn);for(const peer of peers)queueMicrotask(()=>{if(!closed&&joins.has(fn)&&peers.has(peer))fn(peer);});return off;},
    close(){if(closed)return;closed=true;messages.clear();joins.clear();leaves.clear();errors.clear();peers.clear();void Promise.resolve(link.close()).catch(()=>{});},
  };
}
/** All library-specific APIs are isolated here and loaded only on explicit Host/Join. */
export async function browserDriver():Promise<TransportDriver> {
  if(typeof RTCPeerConnection==='undefined'||typeof crypto==='undefined')throw Error('Browser ini tidak mendukung WebRTC. Gunakan Chrome/Edge terbaru melalui HTTPS atau localhost.');
  const lib=await import('@trystero-p2p/mqtt');
  return {selfId:lib.selfId,random:()=>crypto.getRandomValues(new Uint8Array(8)),open:(roomCode,onError)=>{
    const room=lib.joinRoom({appId:'benteng-squad-tag-p2p-v1',maxReceiveBytes:128*1024},roomCode,{onJoinError:()=>onError('Signaling gagal. Periksa jaringan lalu coba kembali.')});
    const action=room.makeAction<string>('bnt-v1');
    return {send:(data,target)=>action.send(data,target?{target}:undefined),getPeers:()=>Object.keys(room.getPeers()),
      onMessage:fn=>{action.onMessage=(data,{peerId})=>fn(data,peerId);},onJoin:fn=>{room.onPeerJoin=fn;},
      onLeave:fn=>{room.onPeerLeave=fn;},close:()=>room.leave()};
  }};
}
export async function createRoom(driver?:TransportDriver){return openRoom('host',undefined,driver??await browserDriver());}
export async function joinRoom(code:string,driver?:TransportDriver){
  if(!parseRoomCode(code))throw Error('Kode room tidak valid. Salin seluruh kode dari host.');
  return openRoom('client',code,driver??await browserDriver());
}
