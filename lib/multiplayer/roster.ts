import {teamCharacters,type LobbyState} from './lobby.ts';
import type {RuntimeActor,TeamId} from '../game-core/types';
export function createMatchRoster(lobby:LobbyState){
  const host=lobby.participants.find(p=>p.host);if(!host)throw Error('Missing host');
  return [host.team,host.team==='red'?'green':'red'].flatMap(team=>{
    const humans=lobby.participants.filter(p=>p.team===team);
    const characters=[...new Set([...humans.map(p=>p.characterId),...teamCharacters(team as TeamId)])].slice(0,5);
    return characters.map((characterId,slot)=>({team:team as TeamId,characterId,slot,
      peerId:humans.find(p=>p.characterId===characterId)?.peerId??null}));
  });
}
/** Transfer control only: identity, character, location, prison and stats survive. */
export function takeoverDisconnected<T extends RuntimeActor>(players:T[],present:ReadonlySet<string>,disconnected:Set<string>){
  const changes:{peerId:string;entityId:string}[]=[];
  for(const p of players)if(p.controller==='remote'&&p.ownerPeerId&&!present.has(p.ownerPeerId)){
    changes.push({peerId:p.ownerPeerId,entityId:p.entityId});disconnected.add(p.ownerPeerId);
    p.controller='bot';p.controlled=false;delete p.ownerPeerId;p.vx=0;p.vy=0;
  }
  return changes;
}
