import { Users } from 'lucide-react';
import type { Faction } from '../world/map-data/field-types';

// Team combo status strip: surge countdown, link level, step pips.
// Snapshot combo fields arrive as plain values.
export const TeamComboHud = ({
  faction,
  surgeRemaining,
  comboLevel,
  comboRemaining,
}: {
  faction: Faction | null;
  surgeRemaining: number;
  comboLevel: number;
  comboRemaining: number;
}) => (
  <div
    className={`team-combo-hud ${faction} ${surgeRemaining ? 'surge' : ''} ${comboLevel || surgeRemaining ? '' : 'context-hidden'}`}
    aria-label="Status combo aksi tim"
  >
    <Users size={17} />
    <span>
      <small>{surgeRemaining ? 'COMBO AKTIF' : 'AKSI TIM'}</small>
      <b>
        {surgeRemaining
          ? `SQUAD SURGE ${surgeRemaining}s`
          : comboLevel
            ? `LINK ${comboLevel}/3 · ${comboRemaining}s`
            : 'RANGKAI 3 AKSI'}
      </b>
    </span>
    <i>
      {[1, 2, 3].map((step) => (
        <u
          key={step}
          className={surgeRemaining || comboLevel >= step ? 'filled' : ''}
        />
      ))}
    </i>
  </div>
);
