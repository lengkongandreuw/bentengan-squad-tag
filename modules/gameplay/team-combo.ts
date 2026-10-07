// Squad combo state machine: chain three different actors' tag/rescue
// actions inside the window to trigger Squad Surge. Pure; callers store
// the returned state. Moved verbatim from lib/team-combo.js.
export const TEAM_COMBO_WINDOW_MS = 6500;
export const TEAM_SURGE_DURATION_MS = 5000;

export type TeamComboState = {
  step: number;
  expiresAt: number;
  lastActorId: string;
  surgeUntil: number;
};

export type TeamComboOutcome = 'ignored' | 'surge' | 'duo' | 'started';

export const createTeamComboState = (): TeamComboState => ({
  step: 0,
  expiresAt: 0,
  lastActorId: '',
  surgeUntil: 0,
});

export const advanceTeamCombo = (
  current: TeamComboState,
  actorId: string,
  now: number,
): { state: TeamComboState; outcome: TeamComboOutcome } => {
  if (current.surgeUntil > now) return { state: current, outcome: 'ignored' };

  const chainActive = current.expiresAt > now && current.step > 0;
  if (chainActive && current.lastActorId === actorId) return { state: current, outcome: 'ignored' };

  const step = chainActive ? current.step + 1 : 1;
  if (step >= 3) {
    return {
      state: { step: 0, expiresAt: 0, lastActorId: actorId, surgeUntil: now + TEAM_SURGE_DURATION_MS },
      outcome: 'surge',
    };
  }

  return {
    state: { step, expiresAt: now + TEAM_COMBO_WINDOW_MS, lastActorId: actorId, surgeUntil: 0 },
    outcome: step === 2 ? 'duo' : 'started',
  };
};

export const teamComboSpeedMultiplier = (state: TeamComboState, now: number): number =>
  state.surgeUntil > now ? 1.1 : 1;

export const teamComboSeconds = (state: TeamComboState, now: number): number =>
  Math.max(0, Math.ceil(((state.surgeUntil > now ? state.surgeUntil : state.expiresAt) - now) / 1000));
