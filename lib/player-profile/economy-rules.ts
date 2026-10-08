import config from '../../config/economy.json' with { type: 'json' };

export type EconomyRules = Readonly<{
  version: 1;
  currency: Readonly<{ id: 'token'; label: string }>;
  matchRewards: Readonly<{
    completeMatch: number; win: number; tag: number; tagPerMatchCap: number;
    rescue: number; rescuePerMatchCap: number;
  }>;
  recentTransactionLimit: number;
}>;

const record = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`Economy config: ${field} must be an object.`);
  return value as Record<string, unknown>;
};
const integer = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`Economy config: ${field} must be a nonnegative safe integer.`);
  return value;
};

export const parseEconomyRules = (value: unknown): EconomyRules => {
  const root = record(value, 'root');
  if (root.version !== 1) throw new Error('Economy config: unsupported version.');
  const currency = record(root.currency, 'currency');
  if (currency.id !== 'token' || typeof currency.label !== 'string' || !currency.label.trim())
    throw new Error('Economy config: invalid currency id/label.');
  const rewards = record(root.matchRewards, 'matchRewards');
  const recentTransactionLimit = integer(root.recentTransactionLimit, 'recentTransactionLimit');
  // Explicit bounded debug ledger, never an unbounded processed-match history.
  if (recentTransactionLimit < 1 || recentTransactionLimit > 1000)
    throw new Error('Economy config: recentTransactionLimit must be between 1 and 1000.');
  return Object.freeze({
    version: 1,
    currency: Object.freeze({ id: 'token', label: currency.label.trim() }),
    matchRewards: Object.freeze({
      completeMatch: integer(rewards.completeMatch, 'matchRewards.completeMatch'),
      win: integer(rewards.win, 'matchRewards.win'),
      tag: integer(rewards.tag, 'matchRewards.tag'),
      tagPerMatchCap: integer(rewards.tagPerMatchCap, 'matchRewards.tagPerMatchCap'),
      rescue: integer(rewards.rescue, 'matchRewards.rescue'),
      // Cap is TOKEN earned, not number of rescues.
      rescuePerMatchCap: integer(rewards.rescuePerMatchCap, 'matchRewards.rescuePerMatchCap'),
    }),
    recentTransactionLimit,
  });
};

// Malformed configuration throws on import; no hidden fallback balancing.
export const economyRules = parseEconomyRules(config);
