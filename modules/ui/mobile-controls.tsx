import type { PointerEvent as ReactPointerEvent } from 'react';
import { t } from '../../lib/language';

export type TouchProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
};

// Touch controls (D-pad + actions). The key-injecting `touch` handlers and
// the mechanics lock arrive as props; the owner keeps the key state.
export const MobileControls = ({
  state,
  playerMechanicsLocked,
  hasUltimate,
  meter,
  ultimateActionClass,
  ultimateTitle,
  touch,
  parkourReady=false,
  parkourHint='',
  parkourCooldownSeconds=0,
}: {
  state: string;
  playerMechanicsLocked: boolean;
  hasUltimate: boolean;
  meter: number;
  ultimateActionClass: string;
  ultimateTitle: string;
  touch: (key: string) => TouchProps;
  parkourReady?:boolean;
  parkourHint?:string;
  parkourCooldownSeconds?:number;
}) => (
  <div
    className={`mobile-controls ${state === 'PRISONER' ? 'context-hidden' : ''}`}
    aria-label={t("Kontrol sentuh")}
  >
    <div className="touch-dpad">
      <button aria-label={t("Gerak atas")} disabled={playerMechanicsLocked} {...touch('w')}>
        {t("▲")}
      </button>
      <button aria-label={t("Gerak kiri")} disabled={playerMechanicsLocked} {...touch('a')}>
        {t("◀")}
      </button>
      <button aria-label={t("Gerak kanan")} disabled={playerMechanicsLocked} {...touch('d')}>
        {t("▶")}
      </button>
      <button aria-label={t("Gerak bawah")} disabled={playerMechanicsLocked} {...touch('s')}>
        {t("▼")}
      </button>
    </div>
    <div className="touch-actions">
      <button
        className="touch-boost"
        aria-label={t("Sprint")}
        disabled={playerMechanicsLocked}
        {...touch(' ')}
      >
        {t("SPRINT")}
      </button>
      <button
        aria-label={t("Parkour")}
        title={t(parkourHint)}
        className={parkourReady?'parkour-ready':''}
        disabled={playerMechanicsLocked}
        {...touch('shift')}
      >
        {t("PARKOUR")}
        {parkourCooldownSeconds>0?` · ${parkourCooldownSeconds}s`:''}
      </button>
      {hasUltimate && (
        <button
          className={`touch-ultimate ${ultimateActionClass}`}
          aria-label={t(ultimateTitle)}
          disabled={meter < 100 || playerMechanicsLocked}
          {...touch('capslock')}
        >
          {t("ULT ")}{Math.floor(meter)}{t("%")}
        </button>
      )}
    </div>
  </div>
);
