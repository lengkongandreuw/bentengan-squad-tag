import type { RoundResultAnnouncement } from '../game-core/snapshot-types';
import type { Team } from '../world/map-data/field-types';
import { FACTION_FOR_TEAM, teamName } from '../world/team-tables';

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
      aria-label={`${teamName(result.winner)} memenangkan ${result.final ? 'match' : 'ronde'}`}
    >
      <img src={assets[result.winner]} alt="" />
      <p>
        <strong>{teamName(result.winner).toUpperCase()}</strong>{' '}
        {result.final ? 'MENANG MATCH!' : 'MENANG RONDE!'}
      </p>
    </section>
  );
};
