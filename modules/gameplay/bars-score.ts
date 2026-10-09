import { CHARACTER_BY_ID, ULTIMATE_CHARACTER_IDS, type CharacterId } from '../../lib/characters.ts';
import type { Team } from '../world/map-data/field-types';
import type { PlayerState } from '../game-core/match-types';
import GAME_RULES from '../../config/game-rules.json' with { type: 'json' };

export type PlayerStats = {
  tags: number;
  prisons: number;
  rescues: number;
};

export type StatsStores = {
  round: Record<string, PlayerStats>;
  match: Record<string, PlayerStats>;
};

// Fresh zeroed stats. Every entry is a new object; stores never share refs.
export const emptyStats = (): PlayerStats => ({ tags: 0, prisons: 0, rescues: 0 });

export const createStatsStore = (playerIds: string[]): Record<string, PlayerStats> =>
  Object.fromEntries(playerIds.map((id) => [id, emptyStats()]));

export const ensureStats = (
  store: Record<string, PlayerStats>,
  player: { id: string },
) => (store[player.id] ??= emptyStats());

export const addStat = (
  stores: StatsStores,
  player: { id: string },
  key: keyof PlayerStats,
  amount = 1,
) => {
  ensureStats(stores.round, player)[key] += amount;
  ensureStats(stores.match, player)[key] += amount;
};

export const contributionScore = (stats: PlayerStats) =>
  stats.tags * 100 + stats.rescues * 120 - stats.prisons * 40;

// Minimal player facet for leaderboard rows. Only these fields cross the seam.
type BoardPlayerFacet = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
};

export type BoardRow = Omit<BoardPlayerFacet, 'team'> &
  PlayerStats & { contribution: number; mvp: boolean };

// One team's leaderboard rows, preserving input order. Pure: reads the given
// store and players, allocates fresh row objects.
export const boardRows = (
  store: Record<string, PlayerStats>,
  players: BoardPlayerFacet[],
  team: Team,
  mvpId: string,
): BoardRow[] =>
  players
    .filter((player) => player.team === team)
    .map((player) => ({
      id: player.id,
      name: player.name,
      characterId: player.characterId,
      controlled: player.controlled,
      ...ensureStats(store, player),
      contribution: contributionScore(ensureStats(store, player)),
      mvp: player.id === mvpId,
    }));

// Ultimate meter charge. Bots and non-ultimate characters never charge;
// the meter clamps to 0–100. Pure: callers reassign the returned value.
export const chargeUltimateMeter = (
  meter: number,
  controlled: boolean | undefined,
  characterId: CharacterId,
  amount: number,
): number => {
  if (!controlled || !ULTIMATE_CHARACTER_IDS.has(characterId)) return meter;
  return Math.min(100, Math.max(0, meter + amount));
};

export const RAJA_ULTIMATE_SPEED_MULTIPLIER = 1.4;

// Titah Halilintar speed bonus: ACTIVE teammates of the caster move +40%
// while the buff window holds; everyone else moves at base speed.
export const rajaUltimateMultiplier = (
  playerTeam: Team,
  playerState: PlayerState,
  casterTeam: Team,
  now: number,
  buffUntil: number,
): number =>
  playerTeam === casterTeam &&
  playerState === 'ACTIVE' &&
  now < buffUntil
    ? RAJA_ULTIMATE_SPEED_MULTIPLIER
    : 1;

export type UltimateImpactCaster = {
  characterId: CharacterId;
  team: Team;
  x: number;
  y: number;
};

export type UltimateImpactPlayer = {
  team: Team;
  ultimateShieldUntil: number;
};

export type UltimateImpactState = {
  ultimateImpactAt: number;
  ultimateImpactApplied: boolean;
  ultimateShieldUntil: number;
  ultimateBuffUntil: number;
};

export type UltimateImpactWorld = {
  shieldMs: number;
  buffMs: number;
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onTone: (frequency: number, duration: number) => void;
  onLog: (text: string) => void;
};

// Ultimate cast resolution: Kaka shields the whole team against tags,
// Raja buffs ACTIVE teammates' speed. Durations arrive as inputs (Q2: no
// tuning here); bursts/tones/logs leave through narrow callbacks. Teammate
// shield fields mutate in place; loop-local timers return by value.
export const applyUltimateImpact = (
  caster: UltimateImpactCaster,
  players: UltimateImpactPlayer[],
  state: UltimateImpactState,
  now: number,
  world: UltimateImpactWorld,
): UltimateImpactState => {
  if (!(state.ultimateImpactAt && !state.ultimateImpactApplied && now >= state.ultimateImpactAt))
    return state;
  if (CHARACTER_BY_ID[caster.characterId]?.ultimate?.kind === 'shield') {
    const ultimateShieldUntil = now + world.shieldMs;
    players
      .filter((player) => player.team === caster.team)
      .forEach((player) => {
        player.ultimateShieldUntil = ultimateShieldUntil;
      });
    world.onBurst(caster.x, caster.y, '#35f477', 34);
    world.onBurst(caster.x, caster.y, '#baffc9', 18);
    world.onTone(540, 0.32);
    world.onLog(
      'PERISAI HIJAU · seluruh rekan kebal TAG selama 5 detik.',
    );
    return { ultimateImpactAt: 0, ultimateImpactApplied: true, ultimateShieldUntil, ultimateBuffUntil: state.ultimateBuffUntil };
  }
  world.onBurst(caster.x, caster.y, '#ef233c', 28);
  world.onBurst(caster.x, caster.y, '#b54a32', 18);
  world.onTone(118, 0.32);
  world.onLog(
    'TITAH HALILINTAR · seluruh rekan ACTIVE bergerak +40% selama 5 detik.',
  );
  return { ultimateImpactAt: 0, ultimateImpactApplied: true, ultimateShieldUntil: state.ultimateShieldUntil, ultimateBuffUntil: now + world.buffMs };
};

export type CastFreezePlayer = {
  vx: number;
  vy: number;
  lastX: number;
  lastY: number;
  x: number;
  y: number;
};

// Ultimate cast freeze: all motion stops while the one-shot cast plays and
// the held keys latch for release after. Returns the latched keys, or null
// when no cast is running (owner keeps its latch values and continues).
// Player velocity fields mutate in place.
export const freezeDuringUltimateCast = (
  players: CastFreezePlayer[],
  keys: Set<string>,
  casting: boolean,
  onClearMouse: () => void,
): { boostLatch: boolean; parkourLatch: boolean } | null => {
  if (!casting) return null;
  onClearMouse();
  players.forEach((player) => {
    player.vx = 0;
    player.vy = 0;
    player.lastX = player.x;
    player.lastY = player.y;
  });
  return { boostLatch: keys.has(' '), parkourLatch: keys.has('shift') };
};

// Passive meter charge for ultimate characters (Q2: formula and 45s
// recharge move verbatim; the caller passes the frozen value).
export const tickUltimateMeter = (
  meter: number,
  isUltimate: boolean,
  dt: number,
  rechargeSeconds: number,
): number =>
  isUltimate
    ? Math.min(100, Math.max(0, meter + (dt * 100) / rechargeSeconds))
    : meter;

export type UltimateCastPlayer = {
  characterId: CharacterId;
  state: string;
  action?: string;
  actionUntil: number;
  parkourUntil: number;
  waterEnteredAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type UltimateCastWorld = {
  isKanal: boolean;
  onBanner: (durationMs: number) => void;
  onBurst: (x: number, y: number, color: string, count: number) => void;
  onTone: (frequency: number, duration: number) => void;
  onLog: (text: string) => void;
};

// Caps Lock cast initiation: availability gate, meter reset, action timing,
// and cast effects. The key itself is consumed by the owner (input concern).
// Returns the next loop-local timers, or null when the cast is unavailable.
// The `me` facet's action/timing/velocity fields mutate in place.
export const beginUltimateCast = (
  me: UltimateCastPlayer,
  meter: number,
  now: number,
  castMsFallback: number,
  world: UltimateCastWorld,
): { meter: number; ultimateImpactAt: number; ultimateImpactApplied: boolean; boostBurstUntil: number } | null => {
  const actionAvailable =
    ULTIMATE_CHARACTER_IDS.has(me.characterId) &&
    meter >= 100 &&
    me.state === 'ACTIVE' &&
    !(world.isKanal && me.waterEnteredAt) &&
    now >= me.parkourUntil &&
    (!me.action || now >= me.actionUntil);
  if (!actionAvailable) return null;
  const meUltimate = CHARACTER_BY_ID[me.characterId]?.ultimate;
  const castDuration = meUltimate?.castMs ?? castMsFallback;
  const ultimateImpactAt = now + castDuration;
  me.action = 'ultimate';
  me.actionUntil = ultimateImpactAt;
  me.vx = 0;
  me.vy = 0;
  world.onBanner(meUltimate?.bannerMs ?? 820);
  world.onBurst(me.x, me.y, meUltimate?.castBurst ?? '#ef233c', 14);
  world.onTone(meUltimate?.castBeepHz ?? 180, 0.2);
  world.onLog(meUltimate?.castLog ?? 'RAJA memanggil TITAH HALILINTAR.');
  return { meter: 0, ultimateImpactAt, ultimateImpactApplied: false, boostBurstUntil: 0 };
};

export type BoostPlayer = {
  state: string;
  waterEnteredAt: number;
  boost: number;
  boostReadyAt: number;
};

export type BoostTickWorld = {
  now: number;
  dx: number;
  dy: number;
  isKanal: boolean;
  boostKey: boolean;
  boostLatch: boolean;
  mouseBoost: boolean;
  boostBurstUntil: number;
  boostDrain: number;
  comboBoosted: boolean;
  dt: number;
  onMissionBoost: () => void;
};

// One tick of the sprint bar: trigger gate (fresh key press or mouse boost),
// latch, active-burst drain with the 0.8 combo discount, and the 20s
// recharge mark. Head numbers verbatim (duration from game rules).
// `me.boost`/`boostReadyAt` mutate on drain; timers return by value.
export const stepBoost = (
  me: BoostPlayer,
  world: BoostTickWorld,
): { boostBurstUntil: number; boostLatch: boolean; mouseBoost: boolean; boosting: boolean } => {
  let boostBurstUntil = world.boostBurstUntil;
  if (
    world.boostKey &&
    (!world.boostLatch || world.mouseBoost) &&
    me.boost > 0 &&
    !(world.isKanal && me.waterEnteredAt) &&
    (me.state === 'ACTIVE' || me.state === 'IN_BASE')
  )
    boostBurstUntil = world.now + GAME_RULES.boostDurationMs;
  const boostLatch = world.boostKey;
  const boosting =
    world.now < boostBurstUntil &&
    me.boost > 0 &&
    !(world.isKanal && me.waterEnteredAt) &&
    Boolean(world.dx || world.dy) &&
    (me.state === 'ACTIVE' || me.state === 'IN_BASE');
  if (boosting) {
    me.boost = Math.max(
      0,
      me.boost -
        world.boostDrain * (world.comboBoosted ? 0.8 : 1) * world.dt,
    );
    me.boostReadyAt = world.now + 20000;
    world.onMissionBoost();
  }
  return { boostBurstUntil, boostLatch, mouseBoost: false, boosting };
};
