import { fortLockSeconds, type MatchProgress } from './match-format.ts';

// Capture lock and enemy occupation are different rules. Both HUDs must use
// this same round clock, including zero-lock legacy and golden rounds.
export function fortLockRemaining(progress: MatchProgress, phase: string, now: number, startedAt: number) {
  return phase === 'PLAYING'
    ? Math.max(0, Math.ceil((fortLockSeconds(progress) * 1000 - (now - startedAt)) / 1000)) : 0;
}

export function fortStatusText(remaining: number, redOccupant?: string, greenOccupant?: string) {
  if (remaining > 0) return `Benteng terkunci ${remaining} detik`;
  if (redOccupant && greenOccupant) return 'Kedua benteng ditempati lawan';
  if (redOccupant) return `Benteng Merah ditempati ${redOccupant}`;
  if (greenOccupant) return `Benteng Hijau ditempati ${greenOccupant}`;
  return 'Benteng terbuka';
}
