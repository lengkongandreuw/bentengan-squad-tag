import type { MatchEvent, MatchEventKind } from '../game-core/match-types';
import { t } from '../../lib/language';

// Match-event toasts (tag / rescue / rescue-request) over the HUD.
// Pure presentation: events and the prebuilt frame table are injected.
export const MatchEventFeed = ({
  events,
  frames,
}: {
  events: MatchEvent[];
  frames: Record<MatchEventKind, string>;
}) => {
  if (events.length === 0) return null;
  return (
    <aside className="match-event-feed" aria-live="polite">
      {events.map((event) => (
        <div key={event.id} className={`match-event-toast ${event.kind}`}>
          <img src={frames[event.kind]} alt="" />
          <p>
            {event.kind === 'tag' && (
              <>
                <strong className={event.actorTeam}>{t(event.actorName)}</strong>{t(' ')}{t("menangkap")}{t(' ')}
                <strong className={event.targetTeam}>{t(event.targetName)}</strong>
              </>
            )}
            {event.kind === 'rescue' && (
              <>
                <strong className={event.actorTeam}>{t(event.actorName)}</strong>{t(' ')}{t("menyelamatkan tim")}
              </>
            )}
            {event.kind === 'rescue-request' && (
              <>
                <strong className={event.actorTeam}>{t(event.actorName)}</strong>{t(' ')}{t("meminta rescue!")}
              </>
            )}
          </p>
        </div>
      ))}
    </aside>
  );
};
