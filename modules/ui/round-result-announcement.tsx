import type { RoundResultAnnouncement } from '../game-core/snapshot-types';
import type { Team } from '../world/map-data/field-types';
import { FACTION_FOR_TEAM, teamName } from '../world/team-tables.ts';
import { t } from '../../lib/language';

// Fullscreen round/match victory card. Pure presentation; the prebuilt
// frame table is injected (owner resolves it once).
export const RoundResultAnnouncementCard = ({
  result,
  assets,
}: {
  result: RoundResultAnnouncement;
  assets: Record<Team, string>;
}) => {
  if (!result.visible || !result.winner) return null;
  return (
    <section
      className={`round-result-announcement ${FACTION_FOR_TEAM[result.winner]}`}
      aria-live="assertive"
      aria-label={t(`${teamName(result.winner)} memenangkan ${result.final ? 'match' : 'ronde'}`)}
    >
      <img src={assets[result.winner]} alt="" />
      <p>
        <strong>{t(teamName(result.winner).toUpperCase())}</strong>{t(' ')}
        {t(result.final ? 'MENANG MATCH!' : 'MENANG RONDE!')}
      </p>
    </section>
  );
};
