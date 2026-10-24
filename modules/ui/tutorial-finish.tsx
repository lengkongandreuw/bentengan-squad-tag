import {useEffect,useRef} from 'react';
import {useLanguage} from '../../lib/language';
import {ArtworkBackButton} from './back-button.tsx';
import {CHARACTER_BY_ID} from '../../lib/characters';
import type {LocalPlayerProfile} from '../../lib/player-profile/types';
import type {ProgressionResult} from '../../lib/player-profile/match-progression';
import {tutorialEducation} from '../../lib/tutorial/education';
import {getProgressionArenaId} from '../../lib/player-profile/arena-identity';
import {progressionRules} from '../../lib/player-profile/progression-rules';
import './tutorial-finish.css';

export function TutorialFinish({profile,result,error,catalog,onReward,onComplete,onLeave}:{
  profile:LocalPlayerProfile;result:ProgressionResult|null;error:string;
  catalog:readonly {id:string;name:string}[];onReward:()=>void;onComplete:(destination:'play'|'menu')=>void;onLeave:()=>void;
}) {
  const language=useLanguage(),dialog=useRef<HTMLDialogElement>(null),primary=useRef<HTMLButtonElement>(null),attempted=useRef(false);
  const text=(en:string,id:string)=>language==='id'?id:en;
  const education=tutorialEducation(result?.profile??profile,catalog);
  useEffect(()=>{const node=dialog.current,previous=document.activeElement;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
  useEffect(()=>{
    // One automatic attempt per summary. Failed storage needs explicit retry,
    // not an effect loop. The profile service still owns atomic deduplication.
    if(!attempted.current&&!result){attempted.current=true;onReward();}
  },[result,onReward]);
  useEffect(()=>{if(result||error)primary.current?.focus();},[result,error]);
  const leave=()=>result?onComplete('menu'):onLeave();
  const arenaLabel=(kind:string,id?:string)=>{
    const arenaName=(key:string)=>catalog.find(a=>getProgressionArenaId(a.id)===getProgressionArenaId(key))?.name??key;
    const name=arenaName(id??'');
    const tier=progressionRules.arenaProgression.tiers.find(t=>t.id===id)?.arenaIds.map(arenaName).join(' / ')??name;
    const labels:Record<string,string>={level:text('Player level','Level pemain'),totalWins:text('Match wins','Kemenangan match'),tags:text('Opponent tags','Tag lawan'),rescues:text('Teammate rescues','Rescue tim'),arenaPlayed:text(`Matches in ${name}`,`Main di ${name}`),arenaWins:text(`Wins in ${name}`,`Menang di ${name}`),tierWins:text(`Wins in ${tier}`,`Menang di ${tier}`)};
    return labels[kind]??kind;
  };
  return <dialog ref={dialog} className="tutorial-finish" aria-labelledby="tutorial-finish-title" onCancel={event=>{event.preventDefault();leave();}} onKeyDown={event=>event.stopPropagation()}>
    <small>BENTENG · {text('TRAINING COMPLETE','LATIHAN SELESAI')}</small>
    <h2 id="tutorial-finish-title">{text(profile.tutorial?.replay?'Good practice. Ready for a match?':'Your first fort. Nice work!',profile.tutorial?.replay?'Latihan mantap. Siap main?':'Benteng pertama. Mantap!')}</h2>
    <section aria-label={text('Training summary','Ringkasan latihan')}>
      <output>{text(result?(result.applied?'Rewards saved.':'Practice complete. No extra rewards.'):error?'Rewards not saved.':'Saving your rewards…',result?(result.applied?'Hadiah tersimpan.':'Latihan selesai. Tidak ada hadiah tambahan.'):error?'Hadiah belum tersimpan.':'Menyimpan hadiah…')}</output>
      {result&&<>
        <div className="tutorial-reward-values"><strong>+{result.xpEarned} XP</strong><strong>+{result.tokenEarned} DOI</strong></div>
        <p>{text('XP raises your level. Spend DOI on Ultimate upgrades.','XP menaikkan levelmu. Gunakan DOI untuk upgrade Ultimate.')}</p>
        <p>LEVEL {result.currentLevel} · {result.levelProgress.xpIntoLevel} / {result.levelProgress.xpForNextLevel??'MAX'} XP · {text('DOI balance','Saldo DOI')}: {result.currentTokenBalance}</p>
        <progress aria-label={text('Level progress','Progres level')} value={result.levelProgress.progress} max={1}/>
        {result.newlyUnlockedCharacters.map(id=><p key={id}>{text('UNLOCKED','TERBUKA')}: {CHARACTER_BY_ID[id].name}</p>)}
        {result.newlyUnlockedArenaIds.map(id=><p key={id}>{text('UNLOCKED','TERBUKA')}: {catalog.find(a=>a.id===id)?.name??id}</p>)}
      </>}
      <details className="tutorial-next-unlocks">
        <summary>{text('What can I unlock next?','Apa yang bisa dibuka berikutnya?')}</summary>
        <h3>{text('Next character','Karakter berikutnya')}</h3>
        {education.character?<><p>{CHARACTER_BY_ID[education.character.characterId].name} · {text('Reach level','Capai level')} {education.character.minLevel} · {education.character.currentXP} / {education.character.requiredXP} XP</p><p>{education.character.xpRemaining} XP {text('to go. Still locked until you get there.','lagi. Tetap terkunci sampai syaratnya terpenuhi.')}</p></>:<p>{text('All characters unlocked. Try a new squad!','Semua karakter terbuka. Coba tim baru!')}</p>}
        <h3>{text('Next arena','Arena berikutnya')}</h3>
        {education.arena?<><p>{education.arena.name} · {text('Meet these goals in regular matches:','Penuhi target ini di match biasa:')}</p><ul>{education.arena.checks.map(check=><li key={`${check.kind}:${check.id??''}`}><span>{check.met?text('Met','Terpenuhi'):text('To do','Belum')} · {arenaLabel(check.kind,check.id)}</span><strong>{check.current} / {check.required}</strong></li>)}</ul></>:<p>{text('All arenas unlocked. Pick your next challenge.','Semua arena terbuka. Pilih tantanganmu.')}</p>}
      </details>
      {error&&<p role="alert">{text(result?'Could not save completion. Retry LET’S PLAY without closing this screen.':'Could not save your rewards. Choose RETRY SAVE before leaving.',result?'Penyelesaian belum tersimpan. Coba LANJUT MAIN lagi tanpa menutup layar ini.':'Hadiah belum tersimpan. Pilih COBA SIMPAN LAGI sebelum keluar.')}</p>}
    </section>
    <div className="tutorial-finish-actions">
      <button ref={primary} type="button" disabled={!result&&!error} onClick={()=>result?onComplete('play'):onReward()}>{text(result?'LET’S PLAY':error?'RETRY SAVE':'SAVING…',result?'LANJUT MAIN':error?'COBA SIMPAN LAGI':'MENYIMPAN…')}</button>
      <ArtworkBackButton onBack={leave} label={text('BACK TO MENU','KEMBALI KE MENU')} />
    </div>
  </dialog>;
}
