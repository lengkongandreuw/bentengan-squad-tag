export const MAX_PROCESSED_MATCH_IDS = 50;

// Shared with profile identity; create ONE ID at match start and retain it
// through callbacks/result re-entry. Do not generate a new ID on reward calls.
export const createLocalId = (prefix = 'local') =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createMatchId = () => createLocalId('match');
