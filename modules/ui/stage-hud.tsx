import { t } from '../../lib/language';
import type { Snapshot } from '../game-core/snapshot-types';
import { formatTime } from './format.ts';

// Top score/time strip over the stage. Clicking (or Enter/Space) toggles
// the match leaderboard.
export const StageHud = ({
  snapshot,
  onToggle,
}: {
  snapshot: Snapshot;
  onToggle: () => void;
}) => (
  <button
    className="stage-hud"
    type="button"
    aria-label={t("Buka leaderboard statistik match")}
    onClick={onToggle}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle();
      }
    }}
  >
    <div className="hud-red">
      <span>{snapshot.blue}</span>
      <b>
        {t("TIM MERAH")}<small>{snapshot.blueHeld}{t("/5 TAHANAN")}</small>
      </b>
    </div>
    <time>
      {t(snapshot.suddenDeath ? 'SD' : formatTime(snapshot.timer))}
      <small>{t("WAKTU")}</small>
    </time>
    <div className="hud-green">
      <b>
        {t("HIJAU")}<small>{snapshot.redHeld}{t("/5 TAHANAN")}</small>
      </b>
      <span>{snapshot.red}</span>
    </div>
  </button>
);
