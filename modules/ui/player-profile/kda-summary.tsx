import { memo } from 'react';
import { getPlayerProfileMetrics, type LocalPlayerProfile } from '../../../lib/player-profile';

type KdaSummaryProps = {
  profile: LocalPlayerProfile;
};

export const KdaSummary = memo(function KdaSummary({ profile }: KdaSummaryProps) {
  const metrics = getPlayerProfileMetrics(profile);
  return (
    <>
      <div className="player-kda-grid" aria-label="Statistik KDA">
        <div className="player-kda-card">
          <div className="player-kda-card-surface"><small>TAG</small><b>{profile.kda.tagMusuh}</b></div>
          <span className="player-kda-marker" aria-hidden="true">#</span>
        </div>
        <div className="player-kda-card">
          <div className="player-kda-card-surface"><small>PRISON</small><b>{profile.kda.masukPenjara}</b></div>
          <span className="player-kda-marker" aria-hidden="true">!</span>
        </div>
        <div className="player-kda-card">
          <div className="player-kda-card-surface"><small>RESCUE</small><b>{profile.kda.rescueTeam}</b></div>
          <span className="player-kda-marker" aria-hidden="true">+</span>
        </div>
      </div>
      <dl className="player-profile-metrics">
        <div><dt>KDA RATIO</dt><dd>{metrics.kdaRatio.toFixed(2)}</dd></div>
        <div><dt>CONTRIBUTION</dt><dd>{metrics.contributionPoint}</dd></div>
        <div><dt>MATCH</dt><dd>{String(metrics.matchesPlayed).padStart(2, '0')}</dd></div>
      </dl>
    </>
  );
});
