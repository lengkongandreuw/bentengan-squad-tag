import type {LegacyTeam,Point,RuntimeActor} from '../../lib/game-core/types.ts';
import {flightBusy} from '../gameplay/flight-ultimate.ts';

export type FortCardState='safe'|'guarded'|'open'|'attacked'|'critical'|'captured';
export type FortStatusView={state:FortCardState;lockSeconds:number;capturePercent:number};
/** Read-only projection of existing fort contenders/progress, never a capture rule. */
export function resolveFortStatus({actors,team,base,radius,water,phase,lockSeconds,captureProgress,captureSeconds,captured}: {
  actors:readonly Pick<RuntimeActor,'team'|'state'|'x'|'y'|'flight'|'waterEnteredAt'>[];team:LegacyTeam;base:Point;radius:number;water:boolean;phase:string;
  lockSeconds:number;captureProgress:number;captureSeconds:number;captured:boolean;
}):FortStatusView{
  const progress=Math.max(0,Math.min(1,Number.isFinite(captureProgress)?captureProgress:0));
  const contenders=actors.filter(p=>p.state==='ACTIVE'&&!flightBusy(p)&&!(water&&p.waterEnteredAt)&&Math.hypot(p.x-base.x,p.y-base.y)<radius);
  const attacked=contenders.some(p=>p.team!==team);
  const state:FortCardState=captured?'captured':phase==='COUNTDOWN'||lockSeconds>0?'safe':
    attacked&&progress>0&&(1-progress)*captureSeconds<=1?'critical':attacked?'attacked':contenders.some(p=>p.team===team)?'guarded':'open';
  return {state,lockSeconds:Math.max(0,lockSeconds),capturePercent:Math.round(progress*100)};
}
