import { t } from '../../lib/language';
import type { Snapshot } from '../game-core/snapshot-types';
import { formatTime } from './format.ts';
import { PerkIcons } from './perk-draft-panel.tsx';

// Top score/time strip over the stage. Clicking (or Enter/Space) toggles
// the match leaderboard.
export const StageHud = ({
  snapshot,
  onToggle,
  teamSize=5,
}: {
  snapshot: Snapshot;
  onToggle: () => void;
  teamSize?:number;
}) => {
  const match = snapshot.match;
  // Scored formats show points; legacy best-of-3 keeps rounds won.
  const roundLabel = match.golden ? 'RONDE EMAS' : match.final ? 'FINAL · POIN ×2' : `RONDE ${snapshot.round}/${match.totalRounds}`;
  return (
  <button
    className={`stage-hud${match.scored ? ' scored' : ''}${match.final || match.golden ? ' final-round' : ''}`}
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
      <span title={t(match.scored ? 'Poin' : 'Ronde dimenangkan')}>{match.scored ? match.points.blue : snapshot.blue}</span>
      <b>
        {t("TIM MERAH")}<small>{snapshot.blueHeld}{t(`/${teamSize} TAHANAN`)}</small>
        {match.scored && <PerkIcons perks={match.perks.blue} team="blue" />}
      </b>
    </div>
    <time>
      {t(snapshot.suddenDeath ? 'SD' : formatTime(snapshot.timer))}
      <small>{t(match.scored ? roundLabel : "WAKTU")}</small>
      {match.scored && match.lastStand && <small className="hud-last-stand">{t('⏱ TERAKHIR BERTAHAN')}</small>}
    </time>
    <div className="hud-green">
      <b>
        {t("HIJAU")}<small>{snapshot.redHeld}{t(`/${teamSize} TAHANAN`)}</small>
        {match.scored && <PerkIcons perks={match.perks.red} team="red" />}
      </b>
      <span title={t(match.scored ? 'Poin' : 'Ronde dimenangkan')}>{match.scored ? match.points.red : snapshot.red}</span>
    </div>
  </button>
  );
};
