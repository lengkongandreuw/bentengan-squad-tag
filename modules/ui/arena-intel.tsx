import { BatteryCharging, Flag, Lock, RotateCcw } from 'lucide-react';

// Match status pills (fort grace, fort lock, refills, arena rotation).
// Rendered twice: standalone over the stage, and inside the action dock.
export const ArenaIntel = ({
  baseGrace,
  fortLock,
  pickupCount,
  fieldWins,
  className = 'arena-intel',
}: {
  baseGrace: number;
  fortLock: string;
  pickupCount: number;
  fieldWins: number;
  className?: string;
}) => (
  <div className={className} aria-label="Status aturan pertandingan">
    <span className={baseGrace > 0 ? 'urgent' : ''}>
      <Flag size={12} />
      {baseGrace > 0 ? `KELUAR ${baseGrace}s` : 'BASE AMAN'}
    </span>
    <span className={fortLock === 'Benteng terbuka' ? '' : 'urgent'}>
      <Lock size={12} /> {fortLock.toUpperCase()}
    </span>
    <span>
      <BatteryCharging size={12} /> REFILL {pickupCount}
    </span>
    <span>
      <RotateCcw size={12} /> ROTASI {fieldWins}/3
    </span>
  </div>
);
