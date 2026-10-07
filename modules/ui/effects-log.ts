// Match log line list helpers. Pure: the owner keeps the array and
// reassigns from the returned list, preserving HEAD semantics (newest
// first, capped at 5 entries).
export const LOG_LIMIT = 5;

export const pushLog = (logs: string[], text: string): string[] =>
  [text, ...logs].slice(0, LOG_LIMIT);
