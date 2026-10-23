import {useEffect} from 'react';
import {useLanguage} from '../../lib/language';
import type {RelayHud} from '../../lib/map-events/power-relay';
import './map-event-hud.css';

export const relayHudVisible=(view?:RelayHud)=>!!view&&(view.phase==='ANNOUNCING'||view.phase==='CLOSING'||!!view.feedback||!!view.notice||!!view.node);
export function MapEventHud({view,onHold}:{view:RelayHud;onHold:(held:boolean)=>void}){
  const id=useLanguage()==='id';
  const node=view.node;
  const next=view.sequence[view.progress];
  const completed=!!node&&view.sequence.indexOf(node)<view.progress;
  const canActivate=view.phase==='ACTIVE'&&node===next;
  const target=view.target;
  const direction=target?[Math.abs(target.dy)>30?(target.dy<0?(id?'utara':'north'):(id?'selatan':'south')):'',Math.abs(target.dx)>30?(target.dx<0?(id?'barat':'west'):(id?'timur':'east')):''].filter(Boolean).join(' · '):'';
  const notice=view.notice;
  const message=notice?({
    connected:id?`${notice.node} terhubung. Lanjut ke ${next??'gerbang'}.`:`${notice.node} connected. Next: ${next??'gates'}.`,
    already:id?`${notice.node} sudah terhubung. Lanjut ke ${next}.`:`${notice.node} already connected. Head to ${next}.`,
    wrong:id?`Urutan salah. Mulai lagi dari ${view.sequence[0]}.`:`Wrong order. Restart at ${view.sequence[0]}.`,
    released:id?'Aktivasi batal: tombol dilepas. Tahan sampai penuh.':'Cancelled: released too soon. Hold until full.',
    moved:id?'Aktivasi batal: kamu bergerak. Dekati node dan diam.':'Cancelled: you moved. Return to the node and stay still.',
    interrupted:id?'Aktivasi terputus: kamu terkena tag atau sedang beraksi.':'Interrupted: tagged or performing another action.',
    paused:id?'Aktivasi batal saat dijeda. Tahan lagi untuk mencoba.':'Activation cancelled while paused. Hold again to retry.',
  })[notice.kind]:null;
  // Release even if proximity, a modal, round end or resize removes the control.
  useEffect(()=>()=>onHold(false),[node,onHold]);
  const title=view.phase==='ANNOUNCING'?(id?'Power Relay segera online':'Power Relay coming online'):view.phase==='ACTIVE'?'Power Relay online':view.phase==='CLOSING'?(id?'Gerbang segera menutup':'Gates closing'):view.phase==='GATE_OPEN'?(id?'Relay terhubung · jalur tengah terbuka':'Relay connected · center open'):view.phase==='COMPLETE'?(id?'Gerbang tertutup · relay selesai':'Gates closed · relay complete'):'Relay offline';
  return <div className="core-context-hint map-event-hud" data-relay-phase={view.phase}>
    <output aria-live="polite"><strong>{title}</strong></output>
    {view.phase==='ACTIVE'&&<>
      <ol className="relay-sequence" aria-label={id?'Urutan Power Relay':'Power Relay sequence'}>{view.sequence.map((node,i)=><li key={node} aria-current={i===view.progress?'step':undefined} data-complete={i<view.progress}>{i<view.progress?'✓ ':''}{node}</li>)}</ol>
      <small>{id?'Timmu':'Your team'} {view.progress}/3 · {id?'Lawan':'Opponent'} {view.opponentProgress}/3 · {view.remaining}s</small>
      <output className="relay-notice" aria-live="polite" aria-atomic="true">{message}</output>
      {completed&&<p>{id?`${node} sudah terhubung. Berikutnya: ${next} · ${direction}.`:`${node} connected. Next: ${next} · ${direction}.`}</p>}
      {node&&!completed&&!canActivate&&<p>{id?`Tujuanmu ${next}, bukan ${node}. Urutan salah mereset progres.`:`Head to ${next}, not ${node}. Wrong order resets progress.`}</p>}
      {!canActivate&&!completed&&<p>{id?`Cari ${next} · ${direction}. Ikuti tanda NEXT.`:`Find ${next} · ${direction}. Follow NEXT.`}</p>}
      {canActivate&&<><p className="relay-key-instruction">{id?`Tahan E untuk aktifkan ${node}. Jangan bergerak.`:`Hold E to activate ${node}. Stay still.`}</p>
        <progress max={1} value={view.channel} aria-label={id?'Progres aktivasi':'Activation progress'}/>
        <button type="button" className="relay-activate" aria-label={id?`Tahan ACTIVATE Relay ${node}`:`Hold ACTIVATE Relay ${node}`} onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);onHold(true);}} onPointerUp={()=>onHold(false)} onPointerCancel={()=>onHold(false)} onLostPointerCapture={()=>onHold(false)} onBlur={()=>onHold(false)} onContextMenu={event=>event.preventDefault()} onKeyDown={event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();event.stopPropagation();onHold(true);}}} onKeyUp={event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();event.stopPropagation();onHold(false);}}}>{id?'TAHAN ACTIVATE':'HOLD ACTIVATE'} · {node}</button>
      </>}
    </>}
    {(view.phase==='GATE_OPEN'||view.phase==='CLOSING')&&<><p>{view.waiting?(id?'Jangan berhenti di gerbang. Pengaman akan mengarahkanmu keluar.':'Keep moving. Safety guides gate occupants out.'):(id?`Kedua tim bisa lewat · ${view.remaining}s`:`Both teams can use the shortcut · ${view.remaining}s`)}</p>
      {(view.laneBoost??1)>1&&<p>{id?'Timmu: +35% kecepatan di jalur tengah.':'Your team: +35% speed on the center lane.'}</p>}
      {view.winner==='opponent'&&<p>{id?'Lawan: +35% kecepatan jalur tengah. Kamu tetap bisa lewat.':'Opponent: +35% lane speed. You can still pass.'}</p>}</>}
    {view.phase==='ANNOUNCING'&&<p>{id?'Aktifkan A/B/C sesuai urutan untuk membuka jalur tengah.':'Activate A/B/C in order to open the center shortcut.'}</p>}
    {view.phase==='EXPIRED'&&<p>{id?'Waktu habis. Jalur utara dan selatan tetap terbuka.':'Time is up. North and south routes remain open.'}</p>}
    {view.phase==='DORMANT'&&<p>{id?`Online dalam ${view.remaining}s. Ini jalur pintas opsional; gunakan jalur utara/selatan dulu.`:`Online in ${view.remaining}s. Optional shortcut; use north/south routes for now.`}</p>}
    {view.phase==='COMPLETE'&&<p>{id?'Selesai untuk ronde ini. Gunakan jalur utara atau selatan.':'Done for this round. Use the north or south route.'}</p>}
  </div>;
}
