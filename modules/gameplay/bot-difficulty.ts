import type { BotWeakness } from './ai-movement.ts';

// Player-chosen bot difficulty for single-player matches (multiplayer keeps the
// arena's own difficulty). Speed, boost and player-bias parity values never change;
// difficulty only shapes decisions.

export type BotDifficulty = 'easy' | 'normal' | 'hard';
export const BOT_DIFFICULTY_STORAGE_KEY = 'benteng-bot-difficulty-v1';
export const BOT_DIFFICULTIES: readonly { id: BotDifficulty; label: string }[] = [
  { id: 'easy', label: 'Bot Mudah' },
  { id: 'normal', label: 'Bot Normal' },
  { id: 'hard', label: 'Bot Sulit' },
];
export type BotSetup = {
  /** Enemy-only human-like limits (Mudah). */
  weakness?: BotWeakness & { enemiesOnly: true };
  /** Dedicated fort guard per team (Sulit), leaving the fort empty for guardSwapGapMs on rotation. */
  guardDuty?: { guardSwapGapMs: number };
};

export const normalizeBotDifficulty = (value: unknown): BotDifficulty =>
  value === 'easy' || value === 'hard' ? value : 'normal';
export function loadBotDifficulty(): BotDifficulty {
  try { return normalizeBotDifficulty(localStorage.getItem(BOT_DIFFICULTY_STORAGE_KEY)); }
  catch { return 'normal'; }
}
export function saveBotDifficulty(value: unknown): BotDifficulty {
  const id = normalizeBotDifficulty(value);
  try { localStorage.setItem(BOT_DIFFICULTY_STORAGE_KEY, id); } catch { /* Optional storage. */ }
  return id;
}
export function botSetup(difficulty: BotDifficulty): BotSetup {
  if (difficulty === 'easy') return { weakness: { reactionMs: [450, 650], visionRadius: 360, enemiesOnly: true } };
  if (difficulty === 'hard') return { guardDuty: { guardSwapGapMs: 6000 } };
  return {};
}
