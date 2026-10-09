import config from '../../config/ultimate-upgrades.json' with { type: 'json' };
import { CHARACTERS, type CharacterId } from '../characters.ts';
import type { LocalPlayerProfile } from './types';

export type UltimateUpgradeLevel = Readonly<{ level: number; cost: number; rechargeSeconds: number; castMs: number; durationMs: number; speedMultiplier?: number }>;
export type UltimateUpgradeCatalog = Readonly<{ version: 1; characters: ReadonlyArray<Readonly<{ characterId: CharacterId; levels: ReadonlyArray<UltimateUpgradeLevel> }>> }>;
export type UltimateUpgradeState = { version: number; levels: Partial<Record<CharacterId,number>> };
const record = (value: unknown): value is Record<string,unknown> => typeof value==='object' && value!==null && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value==='number' && Number.isSafeInteger(value) && value>=0;
export function parseUltimateUpgradeCatalog(value: unknown): UltimateUpgradeCatalog {
  if(!record(value)||value.version!==1||!Array.isArray(value.characters)||!value.characters.length) throw new Error('Ultimate catalog: invalid root.');
  const seen=new Set<string>();
  const characters=value.characters.map(entry=>{
    if(!record(entry)||typeof entry.characterId!=='string'||!CHARACTERS.some(c=>c.id===entry.characterId)||seen.has(entry.characterId)||!Array.isArray(entry.levels)||!entry.levels.length) throw new Error('Ultimate catalog: invalid/duplicate character.');
    seen.add(entry.characterId);
    const levels=entry.levels.map((row,index)=>{
      if(!record(row)||row.level!==index||!count(row.cost)||(index===0&&row.cost!==0)||
        !count(row.rechargeSeconds)||row.rechargeSeconds===0||!count(row.castMs)||row.castMs===0||!count(row.durationMs)||row.durationMs===0||
        (row.speedMultiplier!==undefined && (typeof row.speedMultiplier!=='number'||!Number.isFinite(row.speedMultiplier)||row.speedMultiplier<1||row.speedMultiplier>Number.MAX_SAFE_INTEGER))||
        (entry.characterId==='raja'&&row.speedMultiplier===undefined)||
        Object.keys(row).some(key=>!['level','cost','rechargeSeconds','castMs','durationMs','speedMultiplier'].includes(key))) throw new Error('Ultimate catalog: invalid level/cost/timing/multiplier.');
      return Object.freeze({level:index,cost:row.cost,rechargeSeconds:row.rechargeSeconds,castMs:row.castMs,durationMs:row.durationMs,
        ...(row.speedMultiplier!==undefined?{speedMultiplier:row.speedMultiplier as number}:{})});
    });
    return Object.freeze({characterId:entry.characterId as CharacterId,levels:Object.freeze(levels)});
  });
  return Object.freeze({version:1,characters:Object.freeze(characters)});
}
export const ultimateUpgradeCatalog = parseUltimateUpgradeCatalog(config);
export const createDefaultUltimateUpgrades = (): UltimateUpgradeState => ({version:1,levels:{raja:0,kaka:0}});
export function getUltimateUpgradeConfig(id: string, level=0): UltimateUpgradeLevel | null {
  if(!count(level))return null;
  return ultimateUpgradeCatalog.characters.find(entry=>entry.characterId===id)?.levels[level]??null;
}
export function parseUltimateUpgradeState(value: unknown): UltimateUpgradeState | null {
  if(!record(value)||value.version!==1||!record(value.levels))return null;
  const levels: UltimateUpgradeState['levels']={};
  for(const [id,level] of Object.entries(value.levels)) {
    if(!count(level)||!getUltimateUpgradeConfig(id,level))return null;
    levels[id as CharacterId]=level;
  }
  return {version:1,levels};
}
export function getPlayerUltimateUpgrade(profile: LocalPlayerProfile, id: string): UltimateUpgradeLevel | null {
  const state = parseUltimateUpgradeState(profile.ultimateUpgrades);
  return getUltimateUpgradeConfig(id,state?.levels[id as CharacterId]??0);
}
