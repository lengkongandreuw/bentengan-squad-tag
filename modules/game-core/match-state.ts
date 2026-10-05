import type { MatchEvent } from './match-types';

// Single-owner match-event queue. Appends one event with kind-derived
// priority and expiry, keeping only the newest priority tier.
//
// Observed HEAD semantics, preserved exactly:
// - expired events are filtered first (array is reassigned),
// - duration: tag 2100, rescue 2500, anything else 1800,
// - an incoming event with lower priority than the newest tier is dropped
//   WITHOUT consuming a sequence id,
// - otherwise the whole queue is replaced by the incoming event,
// - ties sort by descending id (newest first).
export type MatchEventInput = Omit<MatchEvent, 'id' | 'priority' | 'expiresAt'>;

export type MatchEventQueue = {
  events: MatchEvent[];
  nextId: number;
};

export const pushMatchEvent = (
  queue: MatchEventQueue,
  event: MatchEventInput,
  now: number,
): MatchEventQueue => {
  const priority = event.kind === 'rescue' ? 2 : 1;
  const duration =
    event.kind === 'tag' ? 2100 : event.kind === 'rescue' ? 2500 : 1800;
  const events = queue.events.filter((item) => item.expiresAt > now);
  if (events.length > 0) {
    if (priority < events[0].priority) return { events, nextId: queue.nextId };
    return {
      events: [{ ...event, id: queue.nextId + 1, priority, expiresAt: now + duration }],
      nextId: queue.nextId + 1,
    };
  }
  events.push({ ...event, id: queue.nextId + 1, priority, expiresAt: now + duration });
  events.sort((a, b) => b.priority - a.priority || b.id - a.id);
  return { events, nextId: queue.nextId + 1 };
};
