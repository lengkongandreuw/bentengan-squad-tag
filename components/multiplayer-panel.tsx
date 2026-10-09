'use client';
import { t } from '../lib/language';

import {useEffect,useRef,useState} from 'react';
import {hostSession,joinSession,type MultiplayerSession,type SessionState} from '../lib/multiplayer/session';
import {botPreview,canStartLobby,teamCharacters} from '../lib/multiplayer/lobby';
import type {CharacterId} from '../lib/characters';
import {testContent,type ContentIdentity} from '../lib/multiplayer/content';
import './multiplayer-panel.css';
import {LoadingMedia,loadingMediaFor} from './loading-media';
import {createInvite,parseInvite} from '../lib/multiplayer/invite';

export function MultiplayerPanel({onClose,arenas,prepareContent,onLaunch,onEnded,initialName}:{onClose:()=>void;initialName?:string;
  arenas?:readonly {id:string;name:string}[];prepareContent?:(id:string)=>Promise<ContentIdentity>;
  onLaunch?:(session:MultiplayerSession)=>void;onEnded?:(message:string)=>void}) {
  const invitation=typeof window!=='undefined'?parseInvite(window.location.href,arenas??[]):null;
  const [flow,setFlow]=useState<'host'|'client'>(invitation?'client':'host');
  const [name,setName]=useState(initialName??'Pemain'),[code,setCode]=useState(invitation?window.location.href:''),[busy,setBusy]=useState(false),[error,setError]=useState(''),
    [state,setState]=useState<SessionState|null>(null),[copied,setCopied]=useState(false),[pendingReady,setPendingReady]=useState<boolean|null>(null);
  const session=useRef<MultiplayerSession|null>(null),unsubscribe=useRef<(()=>void)|null>(null),generation=useRef(0);
  const dialog=useRef<HTMLDialogElement|null>(null);
  const pendingReadyRef=useRef<boolean|null>(null);
  const launched=useRef(false),launchRef=useRef(onLaunch),endRef=useRef(onEnded);
  useEffect(()=>{launchRef.current=onLaunch;endRef.current=onEnded;},[onLaunch,onEnded]);
  const [arena,setArena]=useState(invitation?.arenaId??arenas?.[0]?.id??testContent.arenaId);
  const cleanup=()=>{generation.current++;pendingReadyRef.current=null;setPendingReady(null);unsubscribe.current?.();unsubscribe.current=null;session.current?.close();session.current=null;};
  useEffect(()=>()=>{generation.current++;unsubscribe.current?.();if(!launched.current)session.current?.close();},[]);
  useEffect(()=>{dialog.current?.showModal();},[]);
  const leave=()=>{cleanup();setState(null);setBusy(false);setError('');};
  const close=()=>{cleanup();onClose();};
  const connect=async(role:'host'|'client')=>{
    cleanup();const current=generation.current;setBusy(true);setError('');setState(null);setCopied(false);
    try{
      const invite=role==='client'?parseInvite(code,arenas??[]):null;
      if(role==='client'&&!invite)throw Error('Kode atau undangan tidak valid. Salin seluruh kode/link dari host.');
      const arenaId=invite?.arenaId??arena;
      setArena(arenaId);
      const content=prepareContent?await prepareContent(arenaId):testContent;
      const created=role==='host'?await hostSession(name,undefined,undefined,content):await joinSession(invite!.code,name,undefined,undefined,content);
      if(current!==generation.current){created.close();return;}
      session.current=created;unsubscribe.current=created.subscribe(next=>{
        setState(next);const pending=pendingReadyRef.current,participant=next.lobby?.participants.find(p=>p.peerId===next.localPeerId);
        if(next.phase==='playing'&&!launched.current&&launchRef.current){launched.current=true;dialog.current?.close();launchRef.current(created);}
        if(next.phase==='ended'&&launched.current){launched.current=false;endRef.current?.(next.error||'Room ditutup.');}
        if(pending!==null&&(next.phase!=='lobby'||next.error||participant?.ready===pending)){pendingReadyRef.current=null;setPendingReady(null);}
      });
    }catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Room gagal dibuka.');}
    finally{if(current===generation.current)setBusy(false);}
  };
  const lobby=state?.lobby,local=lobby?.participants.find(p=>p.peerId===state?.localPeerId),bots=lobby?botPreview(lobby):null;
  if(state?.phase==='playing'&&onLaunch)return null;
  return <div className="multiplayer-overlay">
    <dialog ref={dialog} aria-modal="true" aria-labelledby="multiplayer-title" className="multiplayer-panel" onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>e.stopPropagation()}>
      <header><h2 id="multiplayer-title">{t("MULTIPLAYER · LOBBY")}</h2><button type="button" onClick={close} aria-label={t("Tutup multiplayer")}>{t("×")}</button></header>
      <p>{t("Main bersama 2–4 pemain. Slot kosong diisi bot.")}</p>
      <details className="multiplayer-note"><summary>{t("Koneksi & data pemain")}</summary><p>{t("Game berjalan di perangkat pembuat room (host). XP dan DOI disimpan di browser masing-masing, bukan akun online. Kode room hanya untuk bergabung, bukan password. Data lokal tidak terlindungi dari manipulasi. Semua pemain harus memakai versi game dan arena yang sama.")}</p></details>
      {t(!state&&<>
        <nav className="multiplayer-flows" aria-label={t("Cara masuk room")}>
          <button aria-pressed={flow==='host'} disabled={busy} onClick={()=>setFlow('host')}>{t("Jadi host")}</button>
          <button aria-pressed={flow==='client'} disabled={busy} onClick={()=>setFlow('client')}>{t("Punya kode")}</button>
        </nav>
        <label>{t("Nama pemain")}<input maxLength={32} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
        {t(flow==='client'&&<label>{t("Kode atau link undangan dari host")}<input value={code} onChange={e=>{const value=e.target.value;setCode(value);const invite=parseInvite(value,arenas??[]);if(invite?.arenaId)setArena(invite.arenaId);}} placeholder={t("BNT-… atau link undangan")} disabled={busy} autoComplete="off"/></label>)}
        {t(arenas&&<label>{t(flow==='host'?'Arena pertandingan':parseInvite(code,arenas)?.arenaId?'Arena mengikuti undangan host':'Arena host (pilih jika hanya menerima kode)')}<select aria-label={t("Arena multiplayer")} value={arena} onChange={e=>setArena(e.target.value)} disabled={busy||flow==='client'&&!!parseInvite(code,arenas)?.arenaId}>{t(arenas.map(a=><option key={a.id} value={a.id}>{t(a.name)}</option>))}</select></label>)}
        {t(flow==='host'?<button type="button" disabled={busy||!name.trim()} onClick={()=>void connect('host')}>{t("BUAT ROOM")}</button>
          :<button type="button" disabled={busy||!name.trim()||!code.trim()} onClick={()=>void connect('client')}>{t("GABUNG ROOM")}</button>)}
        {t(busy&&<output aria-live="polite">{t("Menyiapkan koneksi…")}</output>)}
      </>)}
      {t(state&&<>
        <div className="multiplayer-room"><span>{t("Room · ")}{t(state.role==='host'?'HOST':'CLIENT')}</span><code>{t(state.roomCode)}</code>
          <button type="button" onClick={()=>{if(!navigator.clipboard?.writeText){setError('Clipboard tidak tersedia. Pilih dan salin kode di atas.');return;}void navigator.clipboard.writeText(state.roomCode).then(()=>setCopied(true)).catch(()=>setError('Clipboard tidak tersedia. Pilih dan salin kode di atas.'));}}>{t(copied?'TERSALIN':'SALIN KODE')}</button></div>
        <label>{t("Link undangan (arena otomatis)")}<input readOnly value={createInvite(window.location.href,state.roomCode,arena)} onFocus={e=>e.target.select()}/></label>
        <button type="button" onClick={()=>{const url=createInvite(window.location.href,state.roomCode,arena);
          if(navigator.share){void navigator.share({title:'Main Benteng bersama',url}).catch(e=>{if(e?.name!=='AbortError')setError('Gagal membagikan. Salin link undangan di atas.');});}
          else if(navigator.clipboard?.writeText){void navigator.clipboard.writeText(url).then(()=>setCopied(true)).catch(()=>setError('Pilih dan salin link undangan di atas.'));}
          else setError('Pilih dan salin link undangan di atas.');}}>{t("BAGIKAN UNDANGAN")}</button>
        <output aria-live="polite">{t(state.phase==='connecting'?'Menghubungkan ke host…':state.phase==='lobby'?'Lobby terhubung':state.phase==='playing'?'Lobby dikunci · persiapan disetujui':'Room ditutup')}
          {t(state.latencyMs!==null?` · ping ${Math.round(state.latencyMs)} ms`:'')}</output>
        {t(lobby&&<>
          <ul className="multiplayer-participants">{t(lobby.participants.map(p=><li key={p.peerId}>
            <span>{t(p.name)}{t(p.host?' · HOST':'')}</span><span>{t(p.team==='red'?'MERAH':'HIJAU')}{t(" · ")}{t(p.characterId.toUpperCase())}{t(" · ")}{t(p.ready?'SIAP':'BELUM SIAP')}</span>
          </li>))}</ul>
          <p>{t("Slot bot: Merah ")}{t(bots!.red)}{t(" · Hijau ")}{t(bots!.green)}{t(" (5 vs 5, maksimum 4 manusia).")}</p>
          {t(local&&<div className="multiplayer-selection">
            <label>{t("Tim")}<select aria-label={t("Tim")} value={local.team} disabled={state.phase!=='lobby'} onChange={e=>{const team=e.target.value as 'red'|'green';const choice=teamCharacters(team).find(id=>!lobby.participants.some(p=>p.peerId!==local.peerId&&p.team===team&&p.characterId===id));if(choice)session.current?.select(team,choice);else setError('Tim ini tidak memiliki slot karakter kosong.');}}>
              <option value="red">{t("Merah")}</option><option value="green">{t("Hijau")}</option></select></label>
            <label>{t("Karakter")}<select aria-label={t("Karakter")} value={local.characterId} disabled={state.phase!=='lobby'} onChange={e=>session.current?.select(local.team,e.target.value as CharacterId)}>
              {t(teamCharacters(local.team).map(id=><option key={id} value={id} disabled={lobby.participants.some(p=>p.peerId!==local.peerId&&p.team===local.team&&p.characterId===id)}>{t(id.toUpperCase())}</option>))}</select></label>
            <label><input type="checkbox" checked={pendingReady??local.ready} aria-busy={pendingReady!==null} disabled={state.phase!=='lobby'||pendingReady!==null} onChange={e=>{if(state.role==='client'){pendingReadyRef.current=e.target.checked;setPendingReady(e.target.checked);}session.current?.ready(e.target.checked);}}/>{t(" Siap main")}</label>
            {t(pendingReady!==null&&<output aria-live="polite">{t("Menunggu konfirmasi host…")}</output>)}
          </div>)}
          {t(state.role==='host'&&<button type="button" disabled={!canStartLobby(lobby)} onClick={()=>session.current?.start()}>{t("MULAI BARENG")}</button>)}
          {t(state.phase==='lobby'&&<p className="multiplayer-note">{t("Versi build dan revisi arena cocok. Host dapat memulai saat minimal 2 manusia dan semuanya siap.")}</p>)}
          {t(state.phase==='playing'&&<p className="multiplayer-note">{t("Belum masuk pertandingan online. Tidak ada simulasi, XP, atau DOI multiplayer yang dijalankan pada tahap ini.")}</p>)}
        </>)}
        <button type="button" onClick={leave}>{t("KELUAR ROOM")}</button>
      </>)}
      {t((busy||state?.phase==='connecting'||pendingReady!==null)&&loadingMediaFor('multiplayer-connection')&&<div className="connection-loading-media"><LoadingMedia slot="multiplayer-connection"/></div>)}
      {t((error||state?.error)&&<p role="alert" className="multiplayer-error">{t(error||state?.error)}</p>)}
    </dialog>
  </div>;
}
