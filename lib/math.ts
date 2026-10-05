// Generic 2D math shared by gameplay, navigation, and HUD code. Pure,
// dependency-free, safe to call from any module or test.
export const other = (team: 'blue' | 'red'): 'blue' | 'red' =>
  team === 'blue' ? 'red' : 'blue';

export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Deterministic exit-order hash (FNV-1a plus finalizer mix). The round seeds
// the hash so ties break differently each round but identically for every
// observer of the same round. Always returns an unsigned 32-bit integer.
export const tieHash = (round: number, id: string): number => {
  let value = (2166136261 ^ round) >>> 0;
  for (let i = 0; i < id.length; i++) {
    value ^= id.charCodeAt(i);
    value = Math.imul(value, 16777619) >>> 0;
  }
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  return value >>> 0;
};
