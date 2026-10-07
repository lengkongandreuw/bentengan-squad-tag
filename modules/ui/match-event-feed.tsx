import type { MatchEvent, MatchEventKind } from '../game-core/match-types';

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
                <strong className={event.actorTeam}>{event.actorName}</strong>{' '}
                menangkap{' '}
                <strong className={event.targetTeam}>{event.targetName}</strong>
              </>
            )}
            {event.kind === 'rescue' && (
              <>
                <strong className={event.actorTeam}>{event.actorName}</strong>{' '}
                menyelamatkan tim
              </>
            )}
            {event.kind === 'rescue-request' && (
              <>
                <strong className={event.actorTeam}>{event.actorName}</strong>{' '}
                meminta rescue!
              </>
            )}
          </p>
        </div>
      ))}
    </aside>
  );
};
