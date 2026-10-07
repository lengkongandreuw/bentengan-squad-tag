import { TARGET_RESCUES_PER_MATCH, TARGET_TAGS_PER_MATCH } from './defaults.ts';
import type { LocalPlayerProfile, PlayerProfileMetrics } from './types';

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const getPlayerProfileMetrics = (
  profile: LocalPlayerProfile,
): PlayerProfileMetrics => {
  const matchesPlayed = profile.menang + profile.kalah;
  const matchesForCalculation = Math.max(1, matchesPlayed);
  const { tagMusuh, masukPenjara, rescueTeam } = profile.kda;
  return {
    matchesPlayed,
    contributionPoint: Math.max(
      0,
      tagMusuh * 100 + rescueTeam * 120 - masukPenjara * 40,
    ),
    kdaRatio: (tagMusuh + rescueTeam) / Math.max(1, masukPenjara),
    radar: {
      attack: matchesPlayed === 0
        ? 0
        : clamp((tagMusuh / matchesForCalculation / TARGET_TAGS_PER_MATCH) * 100, 0, 100),
      support: matchesPlayed === 0
        ? 0
        : clamp((rescueTeam / matchesForCalculation / TARGET_RESCUES_PER_MATCH) * 100, 0, 100),
      survival: matchesPlayed === 0
        ? 0
        : 100 / (1 + masukPenjara / matchesForCalculation),
    },
  };
};
