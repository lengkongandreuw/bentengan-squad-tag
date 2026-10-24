import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Wrench } from 'lucide-react';
import { t } from '../../lib/language';
import { homeMenuArt, ModeHeadingArt } from './home-menu-art.tsx';
import { ArtworkBackButton, BackButton } from './back-button.tsx';

export function ModeBackButton({onBack}: {onBack:()=>void}) {
  return <BackButton onBack={onBack} />;
}

export function ModeSelectScreen({onCampaign,onOnline,onCustom}: {
  onCampaign:()=>void; onOnline:()=>void; onCustom:()=>void;
}) {
  const first=useRef<HTMLButtonElement>(null);
  useEffect(()=>{first.current?.focus({preventScroll:true});},[]);
  const navigate=(event:KeyboardEvent<HTMLButtonElement>)=>{
    if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const buttons=Array.from(event.currentTarget.parentElement!.querySelectorAll('button'));
    const index=buttons.indexOf(event.currentTarget);
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    event.preventDefault();event.stopPropagation();buttons[next]?.focus();
  };
  return <section className="mode-select-screen supplied-mode-screen" aria-labelledby="mode-title">
    <img className="mode-backplate" src={homeMenuArt('backplate')} width="1447" height="1277" alt="" aria-hidden="true" />
    <h1 id="mode-title" aria-label={t('PILIH MODE')}><ModeHeadingArt /></h1>
    <div className="mode-options">
      <button ref={first} type="button" className="mode-card mode-campaign supplied-mode" aria-label="CAMPAIGN" onClick={onCampaign} onKeyDown={navigate}>
        <img src={homeMenuArt('campaign')} width="1310" height="304" alt="" draggable={false} />
      </button>
      <button type="button" className="mode-card mode-online supplied-mode" aria-label="ONLINE SQUAD" onClick={onOnline} onKeyDown={navigate}>
        <img src={homeMenuArt('online')} width="1309" height="287" alt="" draggable={false} />
      </button>
      <button type="button" className="mode-card mode-custom supplied-mode" aria-label="CUSTOM ROOM" onClick={onCustom} onKeyDown={navigate}>
        <img src={homeMenuArt('custom')} width="1310" height="285" alt="" draggable={false} />
      </button>
    </div>
  </section>;
}

export function CustomRoomScreen({onBack}: {onBack:()=>void}) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
  return <section className="custom-room-screen" aria-labelledby="custom-room-title">
    <div className="custom-room-card">
      <Wrench aria-hidden="true" />
      <span>CUSTOM ROOM</span>
      <h1 ref={heading} tabIndex={-1} id="custom-room-title">Underdevelopment</h1>
      <p>{t('Kami sedang menyiapkan tempat untuk aturan mainmu sendiri.')}</p>
      <ArtworkBackButton className="custom-room-back" onBack={onBack} />
    </div>
  </section>;
}
