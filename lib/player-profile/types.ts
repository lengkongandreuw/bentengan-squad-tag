import type { CharacterId } from '../characters';
import type { PlayerProgression } from './progression';
import type { PlayerEconomy } from './economy';
import type { UltimateUpgradeState } from './ultimate-upgrades';

export type PlayerKdaStats = {
  tagMusuh: number;
  masukPenjara: number;
  rescueTeam: number;
};

export type MatchResult = 'win' | 'loss';

export type LocalPlayerProfile = {
  schemaVersion: 1;
  id: string;
  username: string;
  firstJoin: string;
  menang: number;
  kalah: number;
  featuredCharacterId: CharacterId;
  kda: PlayerKdaStats;
  // Optional on legacy input; storage load migrates missing/outdated progression.
  progression?: PlayerProgression;
  // Legacy input may omit this; storage load migrates missing/invalid economy.
  economy?: PlayerEconomy;
  ultimateUpgrades?: UltimateUpgradeState;
};

export type RadarMetrics = {
  attack: number;
  support: number;
  survival: number;
};

export type PlayerProfileMetrics = {
  matchesPlayed: number;
  contributionPoint: number;
  kdaRatio: number;
  radar: RadarMetrics;
};
