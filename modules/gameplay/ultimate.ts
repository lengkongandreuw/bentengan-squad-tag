import type { RuntimeActor } from '../../lib/game-core/types.ts';
import {
  advanceFlight,
  flightBusy,
  flightConfig,
  isFlying,
  safeFlightLanding,
  startFlight,
  type FlightConfig,
} from './flight-ultimate.ts';
import type { GameEvent } from '../../lib/game-core/events.ts';
import { ultimateEffectFor, BUTO_DRIVE_SPEED_MULTIPLIER } from './ultimate-effects.ts';

export type UltimateState = {
  meter: number;
  impactAt: number;
  impactApplied: boolean;
  buffUntil: number;
  shieldUntil: number;
  jammerUntil: number;
  driveUntil: number;
};
export const createUltimateState=():UltimateState=>({meter:0,impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0,jammerUntil:0,driveUntil:0});
/** Round resets keep accumulated charge, matching the existing ultimate rules. */
export function resetUltimateEffects(state:UltimateState) {
  Object.assign(state,{impactAt:0,impactApplied:false,buffUntil:0,shieldUntil:0,jammerUntil:0,driveUntil:0});
}
export type UltimateRules = {
  supported: ReadonlySet<string>;
  rechargeSeconds: number;
  castMs: number;
  durationMs: number;
  speedMultiplier: number;
  kanal2: boolean;
};
export type UltimateFact = Extract<
  GameEvent,
  { type: 'ULTIMATE_STARTED' | 'ULTIMATE_APPLIED' }
>;
export function gainUltimate(
  meter: number,
  actor: RuntimeActor,
  amount: number,
  supported: ReadonlySet<string>,
) {
  return actor.controlled && supported.has(actor.characterId)
    ? Math.max(0, Math.min(100, meter + amount))
    : meter;
}
export function ultimateEligible(
  actor: RuntimeActor,
  state: UltimateState,
  now: number,
  rules: UltimateRules,
) {
  return (
    rules.supported.has(actor.characterId) &&
    (!!flightConfig(actor.characterId)||ultimateEffectFor(actor.characterId)!==null) &&
    state.meter >= 100 &&
    !flightBusy(actor) &&
    actor.state === 'ACTIVE' &&
    !(rules.kanal2 && actor.waterEnteredAt) &&
    now >= actor.parkourUntil &&
    (!actor.action || now >= actor.actionUntil)
  );
}
/** Mutates only simulation data. Input consumption and presentation belong to caller. */
export function stepUltimate(
  players: RuntimeActor[],
  actor: RuntimeActor,
  state: UltimateState,
  dt: number,
  now: number,
  pressed: boolean,
  rules: UltimateRules,
): UltimateFact[] {
  const hasFlight = !!flightConfig(actor.characterId);
  const effect=ultimateEffectFor(actor.characterId);
  const facts: UltimateFact[] = [];
  if(!hasFlight&&!effect)return facts;
  if (rules.supported.has(actor.characterId))
    state.meter = Math.max(
      0,
      Math.min(100, state.meter + (dt * 100) / rules.rechargeSeconds),
    );
  if (pressed && ultimateEligible(actor, state, now, rules)) {
    state.meter = 0;
    if (hasFlight) {
      actor.flight = startFlight(actor);
      actor.action = undefined;
      actor.actionUntil = 0;
    } else {
      state.impactAt = now + rules.castMs;
      state.impactApplied = false;
      actor.action = 'ultimate';
      actor.actionUntil = state.impactAt;
      actor.vx = 0;
      actor.vy = 0;
    }
    facts.push({
      type: 'ULTIMATE_STARTED',
      actorId: actor.entityId,
      flight: hasFlight,
    });
  }
  if (state.impactAt && !state.impactApplied && now >= state.impactAt) {
    state.impactApplied = true;
    state.impactAt = 0;
    if(!effect)return facts;
    if (effect === 'shield') {
      state.shieldUntil = now + rules.durationMs;
      for (const player of players)
        if (player.team === actor.team)
          player.ultimateShieldUntil = state.shieldUntil;
    } else if(effect==='speed')state.buffUntil = now + rules.durationMs;
    else if(effect==='jammer')state.jammerUntil=now+rules.durationMs;
    else if(effect==='drive')state.driveUntil=now+rules.durationMs;
    facts.push({
      type: 'ULTIMATE_APPLIED',
      actorId: actor.entityId,
      effect,
      durationMs: rules.durationMs,
      speedMultiplier: effect==='drive'?BUTO_DRIVE_SPEED_MULTIPLIER:effect==='jammer'?1:rules.speedMultiplier,
    });
  }
  return facts;
}
export function ultimateCasting(
  actor: RuntimeActor,
  now: number,
  supported: ReadonlySet<string>,
) {
  return (
    supported.has(actor.characterId) &&
    actor.action === 'ultimate' &&
    now < actor.actionUntil
  );
}
export function ultimateSpeed(
  player: RuntimeActor,
  caster: RuntimeActor,
  now: number,
  buffUntil: number,
  multiplier: number,
) {
  return player.team === caster.team &&
    player.state === 'ACTIVE' &&
    now < buffUntil
    ? multiplier
    : 1;
}
export function freezeUltimateActors(players: RuntimeActor[]) {
  for (const player of players) {
    player.vx = 0;
    player.vy = 0;
    player.lastX = player.x;
    player.lastY = player.y;
  }
}
export type FlightFact = {
  name: string;
  stage: string;
  remaining: number;
  distance: number;
};
/** Reuses authored-sequence completion supplied as numeric truth by the asset adapter. */
export function stepFlight(
  actor: RuntimeActor,
  config: FlightConfig,
  dt: number,
  complete: boolean,
  valid: (x: number, y: number) => boolean,
) {
  const facts: FlightFact[] = [];
  let landingFailed = false;
  const note = (name: string) => {
    const f = actor.flight!;
    facts.push({
      name,
      stage: f.stage,
      remaining: f.remaining,
      distance: f.distance,
    });
  };
  if (actor.flight) {
    actor.flight = advanceFlight(actor.flight, config, dt, complete, {
      onFlightStart: () => {
        note('onFlightStart');
        note('flight_loop_sfx');
      },
      onFlightWarning: () => note('flight_warning_sfx'),
      onFlightLanding: () => {
        note('onFlightLanding');
        note('flight_land_sfx');
      },
      onFlightEnd: () => note('ultimate_flight_ended'),
      onSafeLanding: () => {
        const landing = safeFlightLanding(actor, actor.flight!.lastGround, valid);
        if (landing) {
          actor.x = landing.x;
          actor.y = landing.y;
          actor.lastX = actor.x;
          actor.lastY = actor.y;
        } else landingFailed = true;
      },
    });
    if (actor.state !== 'ACTIVE') actor.flight = null;
    if (isFlying(actor) && valid(actor.x, actor.y))
      actor.flight!.lastGround = { x: actor.x, y: actor.y };
  }
  return { facts, landingFailed };
}
