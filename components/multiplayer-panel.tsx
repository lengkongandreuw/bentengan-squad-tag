'use client';
import {useEffect,useRef,useState} from 'react';
import {hostSession,joinSession,type MultiplayerSession,type SessionState} from '../lib/multiplayer/session';
import {botPreview,canStartLobby,teamCharacters} from '../lib/multiplayer/lobby';
import type {CharacterId} from '../lib/characters';
import {testContent,type ContentIdentity} from '../lib/multiplayer/content';
import './multiplayer-panel.css';

export function MultiplayerPanel({onClose,arenas,prepareContent,onLaunch,onEnded}:{onClose:()=>void;
  arenas?:readonly {id:string;name:string}[];prepareContent?:(id:string)=>Promise<ContentIdentity>;
  onLaunch?:(session:MultiplayerSession)=>void;onEnded?:(message:string)=>void}) {
  const [name,setName]=useState('Pemain'),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),
    [state,setState]=useState<SessionState|null>(null),[copied,setCopied]=useState(false),[pendingReady,setPendingReady]=useState<boolean|null>(null);
  const session=useRef<MultiplayerSession|null>(null),unsubscribe=useRef<(()=>void)|null>(null),generation=useRef(0);
  const dialog=useRef<HTMLDialogElement|null>(null);
  const pendingReadyRef=useRef<boolean|null>(null);
  const launched=useRef(false),launchRef=useRef(onLaunch),endRef=useRef(onEnded);
  useEffect(()=>{launchRef.current=onLaunch;endRef.current=onEnded;},[onLaunch,onEnded]);
  const [arena,setArena]=useState(arenas?.[0]?.id??testContent.arenaId);
  const cleanup=()=>{generation.current++;pendingReadyRef.current=null;setPendingReady(null);unsubscribe.current?.();unsubscribe.current=null;session.current?.close();session.current=null;};
  useEffect(()=>()=>{generation.current++;unsubscribe.current?.();if(!launched.current)session.current?.close();},[]);
  useEffect(()=>{dialog.current?.showModal();},[]);
  const leave=()=>{cleanup();setState(null);setBusy(false);setError('');};
  const close=()=>{cleanup();onClose();};
  const connect=async(role:'host'|'client')=>{
    cleanup();const current=generation.current;setBusy(true);setError('');setState(null);setCopied(false);
    try{
      const content=prepareContent?await prepareContent(arena):testContent;
      const created=role==='host'?await hostSession(name,undefined,undefined,content):await joinSession(code,name,undefined,undefined,content);
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
      <header><h2 id="multiplayer-title">MULTIPLAYER · LOBBY</h2><button type="button" onClick={close} aria-label="Tutup multiplayer">×</button></header>
      <p className="multiplayer-note">Multiplayer kasual 2–4 manusia + bot. Host menjalankan simulasi; XP dan DOI disimpan di profil lokal masing-masing. Kode room bukan password/login, dan progression lokal tidak anti-cheat.</p>
      {!state&&<>
        <label>Nama pemain<input maxLength={32} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
        {arenas&&<label>Arena (harus sama dengan host)<select aria-label="Arena multiplayer" value={arena} onChange={e=>setArena(e.target.value)} disabled={busy}>{arenas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
        <button type="button" disabled={busy||!name.trim()} onClick={()=>void connect('host')}>HOST MATCH</button>
        <label>Kode room dari host<input value={code} onChange={e=>setCode(e.target.value)} placeholder="BNT-… (salin seluruh kode)" disabled={busy} autoComplete="off"/></label>
        <button type="button" disabled={busy||!name.trim()||!code.trim()} onClick={()=>void connect('client')}>JOIN MATCH</button>
        {busy&&<output aria-live="polite">Membuka transport WebRTC…</output>}
      </>}
      {state&&<>
        <div className="multiplayer-room"><span>Room · {state.role==='host'?'HOST':'CLIENT'}</span><code>{state.roomCode}</code>
          <button type="button" onClick={()=>{if(!navigator.clipboard?.writeText){setError('Clipboard tidak tersedia. Pilih dan salin kode di atas.');return;}void navigator.clipboard.writeText(state.roomCode).then(()=>setCopied(true)).catch(()=>setError('Clipboard tidak tersedia. Pilih dan salin kode di atas.'));}}>{copied?'TERSALIN':'SALIN KODE'}</button></div>
        <output aria-live="polite">{state.phase==='connecting'?'Menghubungkan ke host…':state.phase==='lobby'?'Lobby terhubung':state.phase==='playing'?'Lobby dikunci · persiapan disetujui':'Room ditutup'}
          {state.latencyMs!==null?` · ping ${Math.round(state.latencyMs)} ms`:''}</output>
        {lobby&&<>
          <ul className="multiplayer-participants">{lobby.participants.map(p=><li key={p.peerId}>
            <span>{p.name}{p.host?' · HOST':''}</span><span>{p.team==='red'?'MERAH':'HIJAU'} · {p.characterId.toUpperCase()} · {p.ready?'SIAP':'BELUM SIAP'}</span>
          </li>)}</ul>
          <p>Slot bot: Merah {bots!.red} · Hijau {bots!.green} (5 vs 5, maksimum 4 manusia).</p>
          {local&&<div className="multiplayer-selection">
            <label>Tim<select aria-label="Tim" value={local.team} disabled={state.phase!=='lobby'} onChange={e=>{const team=e.target.value as 'red'|'green';const choice=teamCharacters(team).find(id=>!lobby.participants.some(p=>p.peerId!==local.peerId&&p.team===team&&p.characterId===id));if(choice)session.current?.select(team,choice);else setError('Tim ini tidak memiliki slot karakter kosong.');}}>
              <option value="red">Merah</option><option value="green">Hijau</option></select></label>
            <label>Karakter<select aria-label="Karakter" value={local.characterId} disabled={state.phase!=='lobby'} onChange={e=>session.current?.select(local.team,e.target.value as CharacterId)}>
              {teamCharacters(local.team).map(id=><option key={id} value={id} disabled={lobby.participants.some(p=>p.peerId!==local.peerId&&p.team===local.team&&p.characterId===id)}>{id.toUpperCase()}</option>)}</select></label>
            <label><input type="checkbox" checked={pendingReady??local.ready} aria-busy={pendingReady!==null} disabled={state.phase!=='lobby'||pendingReady!==null} onChange={e=>{if(state.role==='client'){pendingReadyRef.current=e.target.checked;setPendingReady(e.target.checked);}session.current?.ready(e.target.checked);}}/> Saya siap</label>
            {pendingReady!==null&&<output aria-live="polite">Menunggu konfirmasi host…</output>}
          </div>}
          {state.role==='host'&&<button type="button" disabled={!canStartLobby(lobby)} onClick={()=>session.current?.start()}>MULAI PERSIAPAN ROOM</button>}
          {state.phase==='lobby'&&<p className="multiplayer-note">Versi build dan revisi arena cocok. Host dapat memulai saat minimal 2 manusia dan semuanya siap.</p>}
          {state.phase==='playing'&&<p className="multiplayer-note">Belum masuk pertandingan online. Tidak ada simulasi, XP, atau DOI multiplayer yang dijalankan pada tahap ini.</p>}
        </>}
        <button type="button" onClick={leave}>KELUAR ROOM</button>
      </>}
      {(error||state?.error)&&<p role="alert" className="multiplayer-error">{error||state?.error}</p>}
    </dialog>
  </div>;
}
