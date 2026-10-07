import type { PointerEvent as ReactPointerEvent } from 'react';

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
}: {
  state: string;
  playerMechanicsLocked: boolean;
  hasUltimate: boolean;
  meter: number;
  ultimateActionClass: string;
  ultimateTitle: string;
  touch: (key: string) => TouchProps;
}) => (
  <div
    className={`mobile-controls ${state === 'PRISONER' ? 'context-hidden' : ''}`}
    aria-label="Kontrol sentuh"
  >
    <div className="touch-dpad">
      <button aria-label="Gerak atas" disabled={playerMechanicsLocked} {...touch('w')}>
        ▲
      </button>
      <button aria-label="Gerak kiri" disabled={playerMechanicsLocked} {...touch('a')}>
        ◀
      </button>
      <button aria-label="Gerak kanan" disabled={playerMechanicsLocked} {...touch('d')}>
        ▶
      </button>
      <button aria-label="Gerak bawah" disabled={playerMechanicsLocked} {...touch('s')}>
        ▼
      </button>
    </div>
    <div className="touch-actions">
      <button
        className="touch-boost"
        aria-label="Sprint"
        disabled={playerMechanicsLocked}
        {...touch(' ')}
      >
        SPRINT
      </button>
      <button
        aria-label="Parkour"
        disabled={playerMechanicsLocked}
        {...touch('shift')}
      >
        PARKOUR
      </button>
      {hasUltimate && (
        <button
          className={`touch-ultimate ${ultimateActionClass}`}
          aria-label={ultimateTitle}
          disabled={meter < 100 || playerMechanicsLocked}
          {...touch('capslock')}
        >
          ULT {Math.floor(meter)}%
        </button>
      )}
    </div>
  </div>
);
