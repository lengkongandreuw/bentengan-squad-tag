// Pure display-formatting helpers for HUD and selection screens.
// No state, no deps beyond the shared math clamp.
import { clamp } from '../../lib/math.ts';

// mm:ss clock for the match timer and stats board duration.
export const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Normalized percent string for stat bars. Min/max come from the roster
// range the caller displays against.
export const statPercent = (value: number, min: number, max: number): string =>
  `${Math.round(clamp((value - min) / (max - min), 0, 1) * 100)}%`;
