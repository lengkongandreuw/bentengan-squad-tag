import {useLanguage,t} from '../../lib/language';
import {playerStateLabel} from '../../lib/player-copy';
import type {Snapshot} from '../game-core/snapshot-types';
import {ArenaIntel} from './arena-intel';
import {FORT_CARD_LABELS} from './fort-status-hud';

/** Read-only migration of the mission drawer; never simulates or awards progress. */
export function PauseMatchOverview({snapshot}:{snapshot:Snapshot}){
  const id=useLanguage()==='id';
  const objectives=[
    ['refresh',id?'Perbarui urutan tag':'Refresh tag priority'],
    ['boost',id?'Gunakan Sprint':'Use Sprint'],
    ['parkour',id?'Lompat / Parkour':'Jump / Parkour'],
    ['tag',id?'Tangkap lawan':'Tag an opponent'],
    ['rescue',id?'Bebaskan teman':'Rescue a teammate'],
    ['combo',id?'Rangkai aksi tim':'Chain team actions'],
  ] as const;
  return <>
    <ArenaIntel baseGrace={snapshot.baseGrace} fortLock={snapshot.fortLock} fortLabel={snapshot.fortStatus?FORT_CARD_LABELS[snapshot.fortStatus.state][id?1:0]:undefined} pickupCount={snapshot.pickupCount} fieldWins={snapshot.fieldWins}/>
    <h4>{id?'Objektif selesai':'Objectives completed'} · {objectives.filter(([key])=>snapshot.mission[key]).length}/6</h4>
    <ul className="pause-objectives">{objectives.map(([key,label])=><li key={key}><span>{snapshot.mission[key]?'✓':'—'}</span> {label}</li>)}</ul>
    <h4>{id?'Tim kamu':'Your squad'}</h4>
    <dl className="pause-squad">{snapshot.team.map((member,index)=><div key={`${member.characterId}-${index}`}><dt>{member.name}</dt><dd>{t(playerStateLabel(member.state))} · Sprint {Math.round(member.boost)}%</dd></div>)}</dl>
    {snapshot.logs.length>0&&<details><summary>{id?'Kejadian terbaru':'Recent events'}</summary><ul>{snapshot.logs.map((log,index)=><li key={index}>{t(log)}</li>)}</ul></details>}
  </>;
}
