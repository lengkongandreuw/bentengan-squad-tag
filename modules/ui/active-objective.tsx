import { Flag } from 'lucide-react';
import { t } from '../../lib/language';

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
    aria-label={t(`Tujuan aktif: ${missionCount} dari 6`)}
    data-progress={missionCount}
  >
    <Flag size={20} />
    <span>
      <small>{t("TUJUAN AKTIF · ")}{missionCount}{t("/6")}</small>
      <b>
        {t(missionCount === 6 ? 'Semua misi selesai' : 'Buktikan core loop')}
      </b>
    </span>
    <i>{t("›")}</i>
  </button>
);
