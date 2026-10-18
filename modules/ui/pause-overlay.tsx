import { LogOut, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { t, useLanguage } from '../../lib/language';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useModalDialog } from './use-modal-dialog';
import { AudioSettings } from './audio-settings.tsx';
import { GraphicsSettings } from './graphics-settings.tsx';
import {HudSettings} from './hud-settings';
import {LanguageSettings} from './language-settings';
import {RulesOverlay} from './rules-overlay';
import {PlayerStatusReference} from './player-status-reference';
import type {HudPreferences} from '../../lib/hud-preferences';
import './pause-hub.css';

// Pause overlay. Pure presentation; every action is injected by the owner.
export const PauseOverlay = ({
  musicMuted,
  onResume,
  onToggleMusic,
  onRestart,
  onQuit,
  mapPanel,helpPanel,statusPanel,onOpenProfile,hudPreferences,onHudPreferences,online=false,initialPage='home',tutorialActions,controlsInitiallyOpen=false,
}: {
  musicMuted: boolean;
  onResume: () => void;
  onToggleMusic: () => void;
  onRestart: () => void;
  onQuit: () => void;
  mapPanel?:ReactNode;helpPanel?:ReactNode;statusPanel?:ReactNode;
  onOpenProfile?:()=>void;hudPreferences?:HudPreferences;onHudPreferences?:(value:HudPreferences)=>void;online?:boolean;
  initialPage?:'home'|'help';tutorialActions?:ReactNode;
  controlsInitiallyOpen?:boolean;
}) => {
  const language = useLanguage();
  const [pending, setPending] = useState<'restart' | 'quit' | null>(null);
  const [page,setPage]=useState<'home'|'map'|'help'|'settings'>(initialPage);
  const [rules,setRules]=useState(false);
  const pageHeading=useRef<HTMLHeadingElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const confirmed = useRef(false);
  const dismissConfirmation = () => { setPending(null); queueMicrotask(() => trigger.current?.focus()); };
  const resumeButton=useRef<HTMLButtonElement>(null);
  const back=()=>{if(pending)dismissConfirmation();else if(page!=='home'){setPage('home');queueMicrotask(()=>resumeButton.current?.focus());}else onResume();};
  const dialog = useModalDialog(true, back);
  useEffect(() => { if (pending) cancel.current?.focus(); }, [pending]);
  useEffect(()=>{if(page!=='home')pageHeading.current?.focus({preventScroll:true});},[page]);
  const text = (english: string, indonesian: string) => language === 'id' ? indonesian : english;
  return (
  <dialog ref={dialog} className="pause-overlay game-modal" aria-labelledby="pause-title">
    <div className={`pause-hub ${pending?'confirming':''}`}>
      {pending ? <>
        <h2 id="pause-title">{pending === 'restart' ? text('Restart this match?', 'Ulangi pertandingan ini?') : text('Leave this match?', 'Keluar dari pertandingan?')}</h2>
        <p>{text('This unfinished match will not award completion rewards. Your saved progress and DOI are kept.', 'Pertandingan yang belum selesai tidak memberi hadiah penyelesaian. Progres tersimpan dan DOI tetap aman.')}</p>
        <button ref={cancel} onClick={dismissConfirmation}>{text('Cancel · Keep playing', 'Batal · Tetap bermain')}</button>
        <button className="pause-confirm-action" onClick={() => { if (confirmed.current) return; confirmed.current = true; (pending === 'restart' ? onRestart : onQuit)(); }}>
          {pending === 'restart' ? text('Restart match', 'Ulangi pertandingan') : text('Exit to menu', 'Keluar ke menu')}
        </button>
      </> : <>
      <header className="pause-hub-header"><div><small>{online?text('ONLINE MATCH','PERTANDINGAN ONLINE'):t('PERMAINAN DIJEDA')}</small>
      <h2 id="pause-title">{text('Take a breather.','Ambil napas dulu.')}</h2></div>
      <button ref={resumeButton} data-dialog-primary onClick={onResume}>
        <Play size={17} fill="currentColor" />{t(' Lanjut main')}
      </button></header>
      {online&&<p className="pause-online-note" role="note">{text('Online play continues while this menu is open. Your movement input is released.','Pertandingan online tetap berjalan saat menu terbuka. Input gerakmu dilepas.')}</p>}
      <div className="pause-hub-layout"><nav aria-label={text('Pause navigation','Navigasi jeda')}>
        {(['home','map','help','settings'] as const).map(id=><button key={id} aria-current={page===id?'page':undefined} onClick={()=>setPage(id)}>{({home:text('Overview','Ringkasan'),map:text('Map','Peta'),help:text('How to Play','Cara bermain'),settings:text('Settings','Pengaturan')})[id]}</button>)}
        <button onClick={onOpenProfile} disabled={!onOpenProfile}>{text('Profile','Profil')}</button>
        <hr/>
        <button disabled={online} title={online?text('Restart is unavailable online.','Restart tidak tersedia online.'):undefined} onClick={event=>{trigger.current=event.currentTarget;setPending('restart');}}><RotateCcw size={17}/>{text('Restart','Ulangi')}</button>
        <button className="pause-quit" onClick={event=>{trigger.current=event.currentTarget;setPending('quit');}}><LogOut size={17}/>{text('Exit to menu','Keluar ke menu')}</button>
      </nav><section className="pause-hub-content" aria-label={text('Pause content','Isi menu jeda')}>
        <h3 ref={pageHeading} tabIndex={-1}>{({home:text('Match overview','Ringkasan pertandingan'),map:text('Arena map','Peta arena'),help:text('How to Play','Cara bermain'),settings:text('Settings','Pengaturan')})[page]}</h3>
        {page==='home'&&<><p>{text('Your next move can wait. Check the map, refresh the controls, or tune your settings.','Langkah berikutnya bisa menunggu. Lihat peta, ingat kontrol, atau atur tampilan.')}</p>{statusPanel}</>}
        {page==='map'&&mapPanel}
        {page==='help'&&<>{helpPanel}{tutorialActions}<details className="pause-controls-reference" open={controlsInitiallyOpen}><summary>{text('Controls & team actions','Kontrol & aksi tim')}</summary><dl className="pause-controls"><div><dt>WASD / ↑↓←→</dt><dd>{text('Move · touch: D-pad','Bergerak · sentuh: D-pad')}</dd></div><div><dt>Space / {text('right click','klik kanan')}</dt><dd>Sprint · {text('touch: SPRINT','sentuh: SPRINT')}</dd></div><div><dt>Shift</dt><dd>{text('Jump / Parkour · 3s cooldown · touch: PARKOUR','Lompat / Parkour · jeda 3 detik · sentuh: PARKOUR')}</dd></div><div><dt>Caps Lock</dt><dd>Ultimate · {text('touch: ULT','sentuh: ULT')}</dd></div><div><dt>Tab</dt><dd>{text('Hold for leaderboard','Tahan untuk leaderboard')}</dd></div><div><dt>R</dt><dd>{text('Request rescue when captured','Minta rescue saat tertangkap')}</dd></div></dl><p>{text('Tag, rescue and fort capture happen on contact. Chain tags and rescues with different teammates to build your team combo.','Tag, rescue, dan perebutan benteng terjadi saat bersentuhan. Rangkai aksi bersama rekan berbeda untuk membangun combo tim.')}</p></details><button onClick={()=>setRules(true)}>{text('Full Rules','Aturan lengkap')}</button></>}
        {page==='help'&&<PlayerStatusReference/>}
        {page==='settings'&&<><div className="pause-settings-row"><AudioSettings/><GraphicsSettings/>{hudPreferences&&onHudPreferences&&<HudSettings value={hudPreferences} onChange={onHudPreferences} onOpen={()=>{}}/>}</div><LanguageSettings/>
      <button onClick={onToggleMusic} aria-pressed={musicMuted}>
        {musicMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        {t(musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar')}
      </button>
      </>}
      </section></div>
      {page!=='home'&&<footer><button onClick={back}>{text('Back to Pause','Kembali ke menu jeda')}</button></footer>}
      </>}
    </div>
    {rules&&<RulesOverlay onClose={()=>setRules(false)}/>}
  </dialog>
); };
