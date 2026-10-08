import {parseRoomCode} from './transport.ts';
/** Invitations select content; the existing host handshake still verifies it. */
export function parseInvite(value:string,arenas:readonly {id:string}[]) {
  const code=parseRoomCode(value);
  if(code)return {code,arenaId:null};
  try{
    const url=new URL(value),room=parseRoomCode(url.searchParams.get('room')??''),arenaId=url.searchParams.get('arena');
    if(!room||!arenaId||!arenas.some(a=>a.id===arenaId))return null;
    return {code:room,arenaId};
  }catch{return null;}
}
export function createInvite(base:string,code:string,arenaId:string) {
  if(!parseRoomCode(code))throw Error('Kode room tidak valid.');
  const url=new URL(base);url.searchParams.set('room',code);url.searchParams.set('arena',arenaId);url.hash='';return url.href;
}
