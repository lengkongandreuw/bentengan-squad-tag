import { t } from '../../lib/language';
import { memo } from 'react';
import { getPlayerProfileMetrics, type LocalPlayerProfile } from '../../lib/player-profile';

type KdaSummaryProps = {
  profile: LocalPlayerProfile;
};

export const KdaSummary = memo(function KdaSummary({ profile }: KdaSummaryProps) {
  const metrics = getPlayerProfileMetrics(profile);
  return (
    <>
      <div className="player-kda-grid" aria-label={t("Statistik KDA")}>
        <div className="player-kda-card">
          <div className="player-kda-card-surface"><small>{t("TAG")}</small><b>{t(profile.kda.tagMusuh)}</b></div>
          <span className="player-kda-marker" aria-hidden="true">{t("#")}</span>
        </div>
        <div className="player-kda-card">
          <div className="player-kda-card-surface"><small>{t("PRISON")}</small><b>{t(profile.kda.masukPenjara)}</b></div>
          <span className="player-kda-marker" aria-hidden="true">{t("!")}</span>
        </div>
        <div className="player-kda-card">
          <div className="player-kda-card-surface"><small>{t("RESCUE")}</small><b>{t(profile.kda.rescueTeam)}</b></div>
          <span className="player-kda-marker" aria-hidden="true">{t("+")}</span>
        </div>
      </div>
      <dl className="player-profile-metrics">
        <div><dt>{t("KDA RATIO")}</dt><dd>{t(metrics.kdaRatio.toFixed(2))}</dd></div>
        <div><dt>{t("CONTRIBUTION")}</dt><dd>{t(metrics.contributionPoint)}</dd></div>
        <div><dt>{t("MAIN")}</dt><dd>{t(String(metrics.matchesPlayed).padStart(2, '0'))}</dd></div>
      </dl>
    </>
  );
});
