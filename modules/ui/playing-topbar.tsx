import {Pause} from 'lucide-react';
import {t} from '../../lib/language';
export function PlayingTopbar({onPause}:{onPause:()=>void}) {
  return <header className="game-topbar"><button className="icon-button" onClick={onPause} aria-label={t('Jeda')} title={t('Jeda')}><Pause size={20} aria-hidden="true"/></button></header>;
}
