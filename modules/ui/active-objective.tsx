import { Flag } from 'lucide-react';

// Active-objective button opening the mission panel.
export const ActiveObjective = ({
  missionCount,
  onOpen,
}: {
  missionCount: number;
  onOpen: () => void;
}) => (
  <button
    className="active-objective"
    onClick={onOpen}
    aria-label={`Tujuan aktif: ${missionCount} dari 6`}
    data-progress={missionCount}
  >
    <Flag size={20} />
    <span>
      <small>TUJUAN AKTIF · {missionCount}/6</small>
      <b>
        {missionCount === 6 ? 'Semua misi selesai' : 'Buktikan core loop'}
      </b>
    </span>
    <i>›</i>
  </button>
);
