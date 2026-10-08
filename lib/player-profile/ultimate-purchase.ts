import type { CharacterId } from '../characters';
import type { LocalPlayerProfile } from './types';
import { isCharacterUnlocked } from './character-unlocks.ts';
import { getTokenBalance, parsePlayerEconomy, spendTokens } from './economy.ts';
import { createDefaultUltimateUpgrades, parseUltimateUpgradeState, getUltimateUpgradeConfig } from './ultimate-upgrades.ts';

export type UltimatePurchaseReason = 'applied' | 'insufficient_balance' | 'max_level' | 'unsupported_character' |
  'character_locked' | 'duplicate' | 'invalid' | 'level_mismatch' | 'storage_failed';
export type UltimatePurchaseResult = {
  profile: LocalPlayerProfile; applied: boolean; reason: UltimatePurchaseReason;
  previousBalance: number; currentBalance: number; previousLevel: number; currentLevel: number;
};
const stateForPurchase = (profile: LocalPlayerProfile) => profile.ultimateUpgrades === undefined
  ? createDefaultUltimateUpgrades() : parseUltimateUpgradeState(profile.ultimateUpgrades);
export function getUltimateUpgradeLevel(profile: LocalPlayerProfile, characterId: string): number {
  if(!getUltimateUpgradeConfig(characterId,0))return 0;
  return stateForPurchase(profile)?.levels[characterId as CharacterId] ?? 0;
}
export function getNextUltimateUpgrade(profile: LocalPlayerProfile, characterId: string) {
  if (!stateForPurchase(profile)) return null;
  return getUltimateUpgradeConfig(characterId,getUltimateUpgradeLevel(profile,characterId)+1);
}
export function canPurchaseUltimateUpgrade(profile: LocalPlayerProfile, characterId: string): boolean {
  const next = getNextUltimateUpgrade(profile,characterId);
  return !!next && next.cost>0 && !!parsePlayerEconomy(profile.economy) &&
    isCharacterUnlocked(profile,characterId as CharacterId) && getTokenBalance(profile)>=next.cost;
}
// Pass the displayed quote's previous level to reject stale purchase requests.
export function purchaseUltimateUpgrade(profile: LocalPlayerProfile, characterId: string,
  transactionId: string, expectedPreviousLevel = getUltimateUpgradeLevel(profile,characterId)): UltimatePurchaseResult {
  const previousBalance = getTokenBalance(profile), previousLevel = getUltimateUpgradeLevel(profile,characterId);
  const fail = (reason: UltimatePurchaseReason): UltimatePurchaseResult => ({ profile, applied:false, reason,
    previousBalance,currentBalance:previousBalance,previousLevel,currentLevel:previousLevel });
  if(!getUltimateUpgradeConfig(characterId,0))return fail('unsupported_character');
  const state = stateForPurchase(profile), wallet = parsePlayerEconomy(profile.economy);
  if(!state || !wallet || typeof transactionId!=='string' || !transactionId.trim())return fail('invalid');
  if(wallet.recentTransactions.some(tx=>tx.id===transactionId))return fail('duplicate');
  if(!Number.isSafeInteger(expectedPreviousLevel)||expectedPreviousLevel<0)return fail('invalid');
  if(previousLevel!==expectedPreviousLevel)return fail('level_mismatch');
  if(!isCharacterUnlocked(profile,characterId as CharacterId))return fail('character_locked');
  const next = getNextUltimateUpgrade(profile,characterId);
  if(!next)return fail('max_level');
  if(previousBalance<next.cost)return fail('insufficient_balance');
  // Paid MVP tiers all cost TOKEN. A zero-cost future tier needs an explicit
  // idempotent claim design, not an unrecorded purchase or zero ledger amount.
  if(next.cost===0)return fail('invalid');
  const debit = spendTokens(profile,{transactionId,amount:next.cost,type:'ultimate_upgrade',referenceId:`${characterId}:${next.level}`});
  if(!debit.applied)return fail(debit.reason);
  const updated=debit.profile;
  return { profile:{...updated,ultimateUpgrades:{version:state.version,levels:{...state.levels,[characterId]:next.level}}},
    applied:true,reason:'applied',previousBalance,currentBalance:getTokenBalance(updated),previousLevel,currentLevel:next.level };
}
