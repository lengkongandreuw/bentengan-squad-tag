import { economyRules } from './economy-rules.ts';
import type { LocalPlayerProfile } from './types';

export const PLAYER_ECONOMY_VERSION = 1;
export const MAX_RECENT_ECONOMY_TRANSACTIONS = economyRules.recentTransactionLimit;

export type EconomyTransaction = {
  id: string;
  type: 'match_reward' | 'ultimate_upgrade';
  // Credits are positive; spending is negative.
  amount: number;
  createdAt: string;
  referenceId?: string;
};

export type PlayerEconomy = {
  version: number;
  tokenBalance: number;
  lifetimeTokenEarned: number;
  lifetimeTokenSpent: number;
  // Recent diagnostics only, not a second processed-match history.
  recentTransactions: EconomyTransaction[];
};

export const createDefaultEconomy = (): PlayerEconomy => ({
  version: PLAYER_ECONOMY_VERSION,
  tokenBalance: 0,
  lifetimeTokenEarned: 0,
  lifetimeTokenSpent: 0,
  recentTransactions: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export const parseEconomyTransaction = (value: unknown): EconomyTransaction | null => {
  if (!isRecord(value) || !nonEmptyString(value.id) ||
    (value.type !== 'match_reward' && value.type !== 'ultimate_upgrade') ||
    typeof value.amount !== 'number' || !Number.isSafeInteger(value.amount) ||
    value.amount === 0 ||
    (value.type === 'match_reward' ? value.amount < 0 : value.amount > 0) ||
    !nonEmptyString(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt)) ||
    (value.referenceId !== undefined && !nonEmptyString(value.referenceId))) return null;
  return {
    id: value.id, type: value.type, amount: value.amount, createdAt: value.createdAt,
    ...(value.referenceId !== undefined ? { referenceId: value.referenceId } : {}),
  };
};

// Read-only validation. Missing/invalid economy never invalidates the profile;
// legacy migration/repair is separate from explicit transaction operations.
export const parsePlayerEconomy = (value: unknown): PlayerEconomy | null => {
  if (!isRecord(value) || value.version !== PLAYER_ECONOMY_VERSION ||
    !nonNegativeInteger(value.tokenBalance) ||
    !nonNegativeInteger(value.lifetimeTokenEarned) ||
    !nonNegativeInteger(value.lifetimeTokenSpent) ||
    !Array.isArray(value.recentTransactions)) return null;
  const recentTransactions: EconomyTransaction[] = [];
  const start = Math.max(0, value.recentTransactions.length - MAX_RECENT_ECONOMY_TRANSACTIONS);
  for (let index = 0; index < value.recentTransactions.length; index++) {
    const transaction = parseEconomyTransaction(value.recentTransactions[index]);
    if (!transaction) return null;
    if (index >= start) recentTransactions.push(transaction);
  }
  return {
    version: PLAYER_ECONOMY_VERSION,
    tokenBalance: value.tokenBalance,
    lifetimeTokenEarned: value.lifetimeTokenEarned,
    lifetimeTokenSpent: value.lifetimeTokenSpent,
    recentTransactions,
  };
};

export type EconomyMutationInput = {
  transactionId: string;
  // Always a positive magnitude; spending writes a negative ledger amount.
  amount: number;
  type: EconomyTransaction['type'];
  referenceId?: string;
  createdAt?: string;
};
export type EconomyMutationResult =
  | { applied: true; profile: LocalPlayerProfile; transaction: EconomyTransaction }
  | { applied: false; profile: LocalPlayerProfile; reason: 'insufficient_balance' | 'duplicate' | 'invalid' };

const mutateTokens = (
  profile: LocalPlayerProfile, input: EconomyMutationInput, spending: boolean,
): EconomyMutationResult => {
  const fail = (reason: 'insufficient_balance' | 'duplicate' | 'invalid'): EconomyMutationResult =>
    ({ applied: false, profile, reason });
  const wallet = parsePlayerEconomy(profile?.economy);
  // Missing/invalid legacy wallets wait for the migration module. Never reset
  // balances or silently seed a new wallet while performing a transaction.
  if (!wallet || !isRecord(input) || !nonEmptyString(input.transactionId) ||
    !nonNegativeInteger(input.amount) || input.amount === 0 ||
    input.type !== (spending ? 'ultimate_upgrade' : 'match_reward')) return fail('invalid');
  const transaction = parseEconomyTransaction({
    id: input.transactionId, type: input.type,
    amount: spending ? -input.amount : input.amount,
    createdAt: input.createdAt === undefined ? new Date().toISOString() : input.createdAt,
    ...(input.referenceId !== undefined ? { referenceId: input.referenceId } : {}),
  });
  if (!transaction) return fail('invalid');
  if (wallet.recentTransactions.some(entry => entry.id === transaction.id)) return fail('duplicate');
  if (spending && wallet.tokenBalance < input.amount) return fail('insufficient_balance');
  const tokenBalance = wallet.tokenBalance + transaction.amount;
  const lifetimeTokenEarned = wallet.lifetimeTokenEarned + (spending ? 0 : input.amount);
  const lifetimeTokenSpent = wallet.lifetimeTokenSpent + (spending ? input.amount : 0);
  if (![tokenBalance, lifetimeTokenEarned, lifetimeTokenSpent].every(nonNegativeInteger)) return fail('invalid');
  return {
    applied: true,
    profile: { ...profile, economy: {
      ...wallet, tokenBalance, lifetimeTokenEarned, lifetimeTokenSpent,
      recentTransactions: [...wallet.recentTransactions, transaction].slice(-economyRules.recentTransactionLimit),
    } },
    transaction: { ...transaction },
  };
};

export const creditTokens = (profile: LocalPlayerProfile, input: EconomyMutationInput): EconomyMutationResult =>
  mutateTokens(profile, input, false);
export const spendTokens = (profile: LocalPlayerProfile, input: EconomyMutationInput): EconomyMutationResult =>
  mutateTokens(profile, input, true);
export const getTokenBalance = (profile: LocalPlayerProfile): number =>
  parsePlayerEconomy(profile?.economy)?.tokenBalance ?? 0;
