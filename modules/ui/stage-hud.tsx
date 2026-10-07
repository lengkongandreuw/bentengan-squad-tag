import type { Snapshot } from '../game-core/snapshot-types';
import { formatTime } from './format';

// Top score/time strip over the stage. Clicking (or Enter/Space) toggles
// the match leaderboard.
export const StageHud = ({
  snapshot,
  onToggle,
}: {
  snapshot: Snapshot;
  onToggle: () => void;
}) => (
  <div
    className="stage-hud"
    role="button"
    tabIndex={0}
    aria-label="Buka leaderboard statistik match"
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
        TIM MERAH<small>{snapshot.blueHeld}/5 TAHANAN</small>
      </b>
    </div>
    <time>
      {snapshot.suddenDeath ? 'SD' : formatTime(snapshot.timer)}
      <small>WAKTU</small>
    </time>
    <div className="hud-green">
      <b>
        HIJAU<small>{snapshot.redHeld}/5 TAHANAN</small>
      </b>
      <span>{snapshot.red}</span>
    </div>
  </div>
);
