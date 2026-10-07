import { Gauge, Lock, Shield, Users, Zap } from 'lucide-react';
import { ultimateIcon, type UltimateIconId } from '../../lib/characters.ts';
import { ArenaIntel } from './arena-intel.tsx';

// Desktop action dock: status pills, key hints, and the ultimate button.
// The ultimate-owner gate stays with the owner; everything else is props.
export const ActionDock = ({
  mechanicsLocked,
  state,
  intel,
  comboSurge,
  hasUltimate,
  meter,
  casting,
  ultimateActionClass,
  ultimateTitle,
  ultimateIconId,
  onTapUltimate,
}: {
  mechanicsLocked: boolean;
  state: string;
  intel: {
    baseGrace: number;
    fortLock: string;
    pickupCount: number;
    fieldWins: number;
  };
  comboSurge: boolean;
  hasUltimate: boolean;
  meter: number;
  casting: boolean;
  ultimateActionClass: string;
  ultimateTitle: string;
  ultimateIconId: UltimateIconId;
  onTapUltimate: () => void;
}) => (
  <div
    className={`action-dock ${mechanicsLocked ? 'mechanics-inactive' : ''} ${state === 'PRISONER' ? 'context-hidden' : ''}`}
    aria-label="Aksi pemain"
    aria-disabled={mechanicsLocked}
  >
    <ArenaIntel
      baseGrace={intel.baseGrace}
      fortLock={intel.fortLock}
      pickupCount={intel.pickupCount}
      fieldWins={intel.fieldWins}
      className="arena-intel dock-status"
    />
    <span className="ready-action">
      <Zap size={19} />
      <b>SPACE</b>
      <small>SPRINT</small>
    </span>
    <span>
      <Gauge size={19} />
      <b>SHIFT</b>
      <small>PARKOUR</small>
    </span>
    <span className={comboSurge ? 'combo-ready' : ''}>
      <Users size={19} />
      <b>AUTO</b>
      <small>COMBO</small>
    </span>
    <span>
      <Shield size={19} />
      <b>AUTO</b>
      <small>RESCUE</small>
    </span>
    {hasUltimate ? (
      <button
        className={`ultimate-action ${ultimateActionClass} ${meter >= 100 && !casting ? 'ultimate-ready' : ''}`}
        onClick={onTapUltimate}
        disabled={meter < 100 || mechanicsLocked}
        aria-label={`${ultimateTitle} ${Math.floor(meter)} persen`}
      >
        {ultimateIcon(ultimateIconId, 18)}
        <b>CAPS</b>
        <small>
          {casting
            ? 'CASTING'
            : meter >= 100
              ? 'ULT READY'
              : `ULT ${Math.floor(meter)}%`}
        </small>
        <i style={{ width: `${meter}%` }} />
      </button>
    ) : (
      <span className="locked">
        <Lock size={16} />
        <b>—</b>
      </span>
    )}
    <span className="locked">
      <Lock size={16} />
      <b>—</b>
    </span>
  </div>
);
