import { createDefaultEconomy, parsePlayerEconomy, parseEconomyTransaction,
  MAX_RECENT_ECONOMY_TRANSACTIONS, type PlayerEconomy } from './economy.ts';
import type { LocalPlayerProfile } from './types';

// Recover explicit safe fields only. Never infer TOKEN from XP or old matches.
export function migratePlayerEconomy(profile: LocalPlayerProfile, raw: unknown = profile.economy) {
  const valid = parsePlayerEconomy(raw);
  if (valid) return { profile, migrated: false };
  const data = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw as Record<string,unknown> : {};
  const wallet: PlayerEconomy = createDefaultEconomy();
  for (const field of ['tokenBalance','lifetimeTokenEarned','lifetimeTokenSpent'] as const) {
    const value = data[field];
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) wallet[field] = value;
  }
  if (Array.isArray(data.recentTransactions)) {
    const seen = new Set<string>();
    for (let i=data.recentTransactions.length-1;i>=0 && wallet.recentTransactions.length<MAX_RECENT_ECONOMY_TRANSACTIONS;i--) {
      const entry = parseEconomyTransaction(data.recentTransactions[i]);
      if(entry && !seen.has(entry.id)) { seen.add(entry.id);wallet.recentTransactions.unshift(entry); }
    }
  }
  return { profile: { ...profile, economy: wallet }, migrated: true };
}
