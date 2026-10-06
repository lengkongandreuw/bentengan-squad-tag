import type {CanonicalGameState,RuntimeActor,LegacyTeam,TeamId} from './types';

export type RenderIdentity={entityId:string;id:string;name:string};
export const legacyTeam=(team:TeamId):LegacyTeam=>team==='red'?'blue':'red';
/** Detached compatibility projection. Drawing may mutate these copies, never simulation. */
export function createRenderAdapter(identities:readonly RenderIdentity[]) {
  const metadata=new Map(identities.map(p=>[p.entityId,p]));
  return (state:CanonicalGameState)=>{
    const key=(id:string)=>metadata.get(id)?.id??id;
    const players:RuntimeActor[]=state.entities.map(p=>{
      const {team,prisonOwner,capturedEntityIds,tagDirection,headingRadians,ultimateMeter,...data}=p;
      void headingRadians;void ultimateMeter;
      return {...data,id:key(p.entityId),name:metadata.get(p.entityId)?.name??p.characterId,
        controlled:p.controller==='local',team:legacyTeam(team),prisonOwner:prisonOwner?legacyTeam(prisonOwner):undefined,
        capturedIds:capturedEntityIds.map(key),...(tagDirection?{visualTagVector:{...tagDirection}}:{}),
        flight:p.flight?{...p.flight,lastGround:{...p.flight.lastGround}}:null};
    });
    return {players,refills:state.refills.map(p=>({...p})),phase:state.phase,
      roundWinner:state.result?legacyTeam(state.result.winner):undefined,
      ultimateMeter:state.entities.find(p=>p.entityId===state.ultimate.actorId)?.ultimateMeter??0,
      ultimateBuffUntil:state.ultimate.buffUntil,
      teamCombos:{blue:{...state.teams.red.combo},red:{...state.teams.green.combo}},
      rescueRequest:state.rescueRequest?{requesterId:key(state.rescueRequest.requesterId)}:null,
    };
  };
}
export type RenderFrame=ReturnType<ReturnType<typeof createRenderAdapter>>;
