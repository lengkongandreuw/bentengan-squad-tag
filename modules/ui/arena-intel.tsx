import { BatteryCharging, Flag, Lock, RotateCcw } from 'lucide-react';
import { t,useLanguage } from '../../lib/language';

// Match status pills (fort grace, fort lock, refills, arena rotation).
// Rendered twice: standalone over the stage, and inside the action dock.
export const ArenaIntel = ({
  baseGrace,
  fortLock,
  pickupCount,
  fieldWins,
  className = 'arena-intel',
  fortLabel,
}: {
  baseGrace: number;
  fortLock: string;
  pickupCount: number;
  fieldWins: number;
  className?: string;
  fortLabel?:string;
}) => {const language=useLanguage();return (
  <div className={className} aria-label={t("Status aturan pertandingan")}>
    <span className={baseGrace > 0 ? 'urgent' : ''}>
      <Flag size={12} />
      {baseGrace > 0?t(`KELUAR ${baseGrace}s`):language==='id'?'TIMER KELUAR NONAKTIF':'NO EXIT COUNTDOWN'}
    </span>
    <span className={fortLock === 'Benteng terbuka' ? '' : 'urgent'}>
      <Lock size={12} /> {(fortLabel??t(fortLock)).toUpperCase()}
    </span>
    <span>
      <BatteryCharging size={12} />{t(" REFILL ")}{pickupCount}
    </span>
    <span>
      <RotateCcw size={12} />{t(" ROTASI ")}{fieldWins}{t("/3")}
    </span>
  </div>
);};
