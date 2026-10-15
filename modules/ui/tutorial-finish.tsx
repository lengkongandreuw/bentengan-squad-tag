import {useEffect,useRef} from 'react';
import {useLanguage} from '../../lib/language';
import {CHARACTER_BY_ID} from '../../lib/characters';
import type {LocalPlayerProfile} from '../../lib/player-profile/types';
import type {ProgressionResult} from '../../lib/player-profile/match-progression';
import type {TutorialSession,TutorialSignalKind} from '../../lib/tutorial/types';
import {tutorialEducation} from '../../lib/tutorial/education';
import {getProgressionArenaId} from '../../lib/player-profile/arena-identity';
import {progressionRules} from '../../lib/player-profile/progression-rules';
import './tutorial-finish.css';

export function TutorialFinish({session,profile,result,error,catalog,onReward,onSignal,onComplete,onLeave}:{
  session:TutorialSession;profile:LocalPlayerProfile;result:ProgressionResult|null;error:string;
  catalog:readonly {id:string;name:string}[];onReward:()=>void;onSignal:(kind:TutorialSignalKind)=>void;onComplete:()=>void;onLeave:()=>void;
}) {
  const language=useLanguage(),dialog=useRef<HTMLDialogElement>(null),primary=useRef<HTMLButtonElement>(null);
  const text=(en:string,id:string)=>language==='id'?id:en;
  const education=tutorialEducation(profile,catalog),step=session.stepId;
  useEffect(()=>{const node=dialog.current,previous=document.activeElement;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
  useEffect(()=>{primary.current?.focus();},[step]);
  const arenaLabel=(kind:string,id?:string)=>{
    const arenaName=(key:string)=>catalog.find(a=>getProgressionArenaId(a.id)===getProgressionArenaId(key))?.name??key;
    const name=arenaName(id??'');
    const tier=progressionRules.arenaProgression.tiers.find(t=>t.id===id)?.arenaIds.map(arenaName).join(' / ')??name;
    const labels:Record<string,string>={level:text('Player level','Level pemain'),totalWins:text('Match wins','Kemenangan match'),tags:text('Opponent tags','Tag lawan'),rescues:text('Teammate rescues','Rescue tim'),arenaPlayed:text(`Matches in ${name}`,`Main di ${name}`),arenaWins:text(`Wins in ${name}`,`Menang di ${name}`),tierWins:text(`Wins in ${tier}`,`Menang di ${tier}`)};
    return labels[kind]??kind;
  };
  return <dialog ref={dialog} className="tutorial-finish" aria-labelledby="tutorial-finish-title" onCancel={event=>{event.preventDefault();onLeave();}} onKeyDown={event=>event.stopPropagation()}>
    <small>BENTENG · {text('TRAINING COMPLETE','LATIHAN SELESAI')}</small>
    <h2 id="tutorial-finish-title">{text(step==='reward'?'Your first fort. Nice work!':step==='character_unlock'?'Build your squad.':step==='map_unlock'?'Take it to a new arena.':'Your squad is waiting.',step==='reward'?'Benteng pertama. Mantap!':step==='character_unlock'?'Lengkapi timmu.':step==='map_unlock'?'Jajal arena berikutnya.':'Timmu sudah menunggu.')}</h2>
    {step==='reward'&&<section aria-label={text('Tutorial rewards','Hadiah tutorial')}>
      <p>{text(profile.tutorial?.replay?'Replay is for practice—your progress stays safe.':'Save your first-training reward. Competitive stats stay untouched.',profile.tutorial?.replay?'Latihan ulang untuk berlatih—progresmu tetap aman.':'Simpan hadiah latihan pertamamu. Statistik kompetitif tetap aman.')}</p>
      {result&&<>
        <div className="tutorial-reward-values" aria-live="polite"><strong>+{result.xpEarned} XP</strong><strong>+{result.tokenEarned} DOI</strong></div>
        <p>{text('XP raises your player level. Spend DOI on Ultimate upgrades.','XP menaikkan level pemain. Gunakan DOI untuk upgrade Ultimate.')}</p>
        <p>{text('LEVEL','LEVEL')} {result.currentLevel} · {result.levelProgress.xpIntoLevel} / {result.levelProgress.xpForNextLevel??'MAX'} XP</p>
        <progress aria-label={text('Level progress','Progres level')} value={result.levelProgress.progress} max={1}/>
        <p>{text('DOI balance','Saldo DOI')}: {result.currentTokenBalance}</p>
        {result.newlyUnlockedCharacters.map(id=><p key={id}>{text('UNLOCKED','TERBUKA')}: {CHARACTER_BY_ID[id].name}</p>)}
        {result.newlyUnlockedArenaIds.map(id=><p key={id}>{text('UNLOCKED','TERBUKA')}: {catalog.find(a=>a.id===id)?.name??id}</p>)}
        {!result.applied&&<p>{text('No new reward: replay or already saved.','Tidak ada hadiah baru: latihan ulang atau sudah tersimpan.')}</p>}
      </>}
    </section>}
    {step==='character_unlock'&&<section>
      <p>{text('Keep playing to unlock more characters.','Terus main untuk membuka lebih banyak karakter.')}</p>
      {education.character?<><h3>{CHARACTER_BY_ID[education.character.characterId].name}</h3><p>{text('Reach level','Capai level')} {education.character.minLevel} · {education.character.currentXP} / {education.character.requiredXP} XP</p><progress aria-label={text('Next character progress','Progres karakter berikutnya')} value={education.character.progress} max={1}/><p>{education.character.xpRemaining} XP {text('to go. Still locked until you get there.','lagi. Tetap terkunci sampai syaratnya terpenuhi.')}</p></>:<p>{text('All characters unlocked. Try a new squad!','Semua karakter terbuka. Coba tim baru!')}</p>}
    </section>}
    {step==='map_unlock'&&<section>
      {education.arena?<><h3>{education.arena.name}</h3><p>{text('Your next arena. Meet these goals in regular matches:','Arena berikutnya. Penuhi target ini di match biasa:')}</p><ul>{education.arena.checks.map(check=><li key={`${check.kind}:${check.id??''}`}><span>{check.met?text('Met','Terpenuhi'):text('To do','Belum')} · {arenaLabel(check.kind,check.id)}</span><strong>{check.current} / {check.required}</strong></li>)}</ul></>:<p>{text('All configured arenas unlocked. Pick your next challenge.','Semua arena terkonfigurasi sudah terbuka. Pilih tantanganmu.')}</p>}
    </section>}
    {step==='complete'&&<p>{text('Move. Tag. Rescue. Take their Benteng. You’re ready.','Gerak. Tag. Rescue. Rebut benteng lawan. Kamu siap.')}</p>}
    {error&&<p role="alert">{text(step==='complete'?'Could not save completion. Retry LET’S PLAY without closing this screen.':'Could not save. Your reward has not been confirmed. Retry without closing this screen.',step==='complete'?'Penyelesaian belum tersimpan. Coba LANJUT MAIN lagi tanpa menutup layar ini.':'Belum bisa menyimpan. Hadiah belum dikonfirmasi. Coba lagi tanpa menutup layar ini.')}</p>}
    <div className="tutorial-finish-actions">
      <button ref={primary} type="button" onClick={()=>{
        if(step==='reward'){if(!result)onReward();else onSignal('REWARD_SAVED');}
        else if(step==='character_unlock')onSignal('CHARACTER_EXPLAINED');
        else if(step==='map_unlock')onSignal('MAP_EXPLAINED');else onComplete();
      }}>{text(step==='reward'&&!result?'SAVE REWARDS':step==='complete'?'LET’S PLAY':'CONTINUE',step==='reward'&&!result?'SIMPAN HADIAH':step==='complete'?'LANJUT MAIN':'LANJUT')}</button>
      <button type="button" onClick={onLeave}>{text('BACK TO MENU','KEMBALI KE MENU')}</button>
    </div>
  </dialog>;
}
