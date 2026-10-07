import { ultimateIcon, type UltimateIconId } from '../../lib/characters.ts';

// Ultimate meter bar with recharge hints. The visibility guard
// (PRISONER / ultimate owner) stays with the owner.
export const UltimateMeterHud = ({
  playerName,
  icon,
  hudTitle,
  shieldClass,
  meter,
}: {
  playerName: string;
  icon: UltimateIconId;
  hudTitle: string;
  shieldClass?: string;
  meter: number;
}) => (
  <div
    className={`ultimate-meter-hud ${shieldClass ?? ''} ${meter >= 100 ? 'ready' : ''}`}
    aria-label={`Meter Ultimate ${playerName} ${Math.floor(meter)} persen`}
  >
    <span>
      {ultimateIcon(icon, 14)}
      {` ${hudTitle.toUpperCase()}`}
    </span>
    <b>{Math.floor(meter)}%</b>
    <i>
      <u style={{ width: `${meter}%` }} />
    </i>
    <small>
      {meter >= 100 ? 'TEKAN CAPS LOCK' : 'OTOMATIS · TAG +20 · RESCUE +30'}
    </small>
  </div>
);
