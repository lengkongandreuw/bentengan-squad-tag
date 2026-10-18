import {useLanguage} from '../../lib/language';
import {CHARACTER_BY_ID,publicAsset} from '../../lib/characters';
import {getNextCharacterGoal} from '../../lib/player-profile/character-unlocks';
import type {LocalPlayerProfile} from '../../lib/player-profile/types';
import './character-next-goal.css';
/** Uses the existing cumulative requirement/progress helper; never writes the profile. */
export function CharacterNextGoal({profile}:{profile:LocalPlayerProfile}){
  const id=useLanguage()==='id',goal=getNextCharacterGoal(profile),number=new Intl.NumberFormat(id?'id-ID':'en-US');
  const name=goal?CHARACTER_BY_ID[goal.characterId].name:'';
  const text=goal?`${id?'Berikutnya':'Up next'}: ${name} · Lv.${goal.minLevel} · ${number.format(goal.xpRemaining)} XP ${id?'lagi':'to go'}`:id?'SEMUA KARAKTER TERBUKA':'ALL CHARACTERS UNLOCKED';
  return <section className={`character-next-goal unlock-progress-strip${goal?'':' all-unlocked'}`} aria-label={id?'Target unlock berikutnya':'Next character unlock'}>
    <img className="unlock-strip-art" src={publicAsset('ui-v2/character-selection/next-unlock-frame.webp')} width={1580} height={302} alt="" draggable={false}/>
    <div className="unlock-strip-heading">{goal?<><strong>{id?'Berikutnya':'Up next'}: {name}</strong><span className="unlock-required-level"> · Lv.{goal.minLevel}</span><span> · {number.format(goal.xpRemaining)} XP {id?'lagi':'to go'}</span></>:<strong>{text}</strong>}</div>
    <div className="unlock-strip-track" aria-hidden="true"><i style={{transform:`scaleX(${goal?.progress??1})`,backgroundImage:`url("${publicAsset('ui-v2/character-selection/next-unlock-fill.webp')}")`}}/></div>
    <progress className="unlock-strip-semantic" value={goal?Math.min(goal.currentXP,goal.requiredXP):1} max={goal?.requiredXP||1} aria-label={text}>{text}</progress>
  </section>;
}
