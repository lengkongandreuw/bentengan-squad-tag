import type { LocalPlayerProfile } from './types';
import { getPlayerUltimateUpgrade, getUltimateUpgradeConfig } from './ultimate-upgrades';

export type EffectiveUltimateStats = Readonly<{
  level: number; rechargeSeconds: number; castMs: number; durationMs: number; speedMultiplier?: number;
}>;
export function getEffectiveUltimateStats(profile: LocalPlayerProfile | null, characterId: string): EffectiveUltimateStats | null {
  const config = profile ? getPlayerUltimateUpgrade(profile,characterId) : getUltimateUpgradeConfig(characterId,0);
  if(!config)return null; // No invented stats for unsupported characters.
  return Object.freeze({level:config.level,rechargeSeconds:config.rechargeSeconds,castMs:config.castMs,durationMs:config.durationMs,
    ...(config.speedMultiplier!==undefined?{speedMultiplier:config.speedMultiplier}:{})});
}
// Capture once at match initialization; non-controlled actors always use base.
export function snapshotUltimateStats(profile: LocalPlayerProfile | null, characterId: string, controlled=true) {
  return getEffectiveUltimateStats(controlled?profile:null,characterId);
}
