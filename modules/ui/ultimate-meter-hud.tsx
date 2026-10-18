import { t } from '../../lib/language';
import { ultimateIcon, type UltimateIconId } from '../../lib/characters.ts';

// Ultimate meter bar with recharge hints. The visibility guard
// (PRISONER / ultimate owner) stays with the owner.
export const UltimateMeterHud = ({
  playerName,
  icon,
  hudTitle,
  shieldClass,
  meter,
  disabled=false,onActivate,
}: {
  playerName: string;
  icon: UltimateIconId;
  hudTitle: string;
  shieldClass?: string;
  meter: number;
  disabled?:boolean;onActivate:()=>void;
}) => (
  <button type="button" disabled={disabled||meter<100} onClick={onActivate}
    className={`ultimate-meter-hud ${shieldClass ?? ''} ${meter >= 100 ? 'ready' : ''}`}
    aria-label={t(`Meter Ultimate ${playerName} ${Math.floor(meter)} persen`)}
  >
    <span>
      {ultimateIcon(icon, 14)}
      {t(` ${hudTitle.toUpperCase()}`)}
    </span>
    <b>{Math.floor(meter)}%</b>
    <i>
      <u style={{ width: `${meter}%` }} />
    </i>
    <small>
      {t(meter >= 100 ? 'TEKAN CAPS LOCK' : 'ULTIMATE')}
    </small>
  </button>
);
