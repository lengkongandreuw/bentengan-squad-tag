import { getArenaUnlockProgress } from './arena-unlocks';
import { progressionRules } from './progression-rules';
import type { LocalPlayerProfile } from './types';
import { getProgressionArenaId } from './arena-identity';

export function getArenaSelectionProgress(profile: LocalPlayerProfile, arenaId: string,
  catalog: readonly { id: string; name: string }[]) {
  const result = getArenaUnlockProgress(profile, arenaId);
  const name = (id: string) => catalog.find(arena => getProgressionArenaId(arena.id) === getProgressionArenaId(id))?.name ?? id;
  return {
    unlocked: result.unlocked,
    configured: result.requirement !== null,
    checks: result.checks.filter(check => check.required > 0).map(check => {
      const tier = progressionRules.arenaProgression.tiers.find(entry => entry.id === check.id);
      const labels: Record<string, string> = {
        level: 'Level pemain', totalWins: 'Total kemenangan', tags: 'Tag lawan',
        rescues: 'Rescue tim', arenaPlayed: `Main di ${name(check.id ?? '')}`,
        arenaWins: `Menang di ${name(check.id ?? '')}`,
        tierWins: `Menang di ${tier?.arenaIds.map(name).join(' / ') ?? check.id}`,
      };
      return { ...check, label: labels[check.kind] ?? check.kind };
    }),
  };
}
