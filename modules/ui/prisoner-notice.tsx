import { Lock, BellRing } from 'lucide-react';

// Prisoner notice with the rescue-request button. The visibility guard
// (PRISONER, not paused) lives inside; the key tap arrives as a callback.
export const PrisonerNotice = ({
  prisoner,
  paused,
  requestActive,
  requestRemaining,
  requestCooldown,
  onRequest,
}: {
  prisoner: boolean;
  paused: boolean;
  requestActive: boolean;
  requestRemaining: number;
  requestCooldown: number;
  onRequest: () => void;
}) => {
  if (!prisoner || paused) return null;
  return (
    <div className="prisoner-notice" role="status">
      <Lock size={22} />
      <span>
        <b>MENUNGGU DIBEBASKAN</b>
        <small>
          {requestActive
            ? `Sinyal aktif ${requestRemaining}s`
            : requestCooldown
              ? `Sinyal siap ${requestCooldown}s`
              : 'Kirim sinyal ke rekan tim.'}
        </small>
      </span>
      <button
        className="rescue-request-button"
        onClick={onRequest}
        disabled={requestCooldown > 0}
        aria-label="Minta rescue"
      >
        <BellRing size={16} />
        {requestActive
          ? 'BANTUAN DIKIRIM'
          : requestCooldown
            ? `${requestCooldown}s`
            : 'MINTA RESCUE'}
      </button>
    </div>
  );
};
