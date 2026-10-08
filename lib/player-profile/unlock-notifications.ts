import { CHARACTER_BY_ID } from '../characters';
import type { ProgressionResult } from './match-progression';

export type UnlockNotice = { kind: 'character' | 'arena'; id: string; name: string };

// Only fresh resolver events produce notices. Never derive notifications from
// persistent profile unlock lists: loading a profile must not replay old events.
export function getNewUnlockNotices(result: ProgressionResult | null,
  arenas: readonly { id: string; name: string }[]): UnlockNotice[] {
  if (!result?.applied) return [];
  return [
    ...[...new Set(result.newlyUnlockedCharacters)].map(id => ({
      kind: 'character' as const, id, name: CHARACTER_BY_ID[id].name,
    })),
    ...[...new Set(result.newlyUnlockedArenaIds)].map(id => ({
      kind: 'arena' as const, id, name: arenas.find(arena => arena.id === id)?.name ?? id,
    })),
  ];
}
