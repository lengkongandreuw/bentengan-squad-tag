import { clickRoute, pointerWorld } from './click-navigation.ts';
import { distance } from '../../lib/math.ts';

export type PointerDownPlayer = {
  id: string;
  x: number;
  y: number;
  state: string;
  waterEnteredAt: number;
  action?: string;
  actionUntil: number;
};

export type PointerDownWorld = {
  canvas: HTMLCanvasElement;
  getView: () => { x: number; y: number; width: number; height: number; scale: number };
  getPlayers: () => PointerDownPlayer[];
  getMode: () => string;
  getPhase: () => string;
  getPaused: () => boolean;
  getFieldId: () => string;
  isBlocked: (x: number, y: number, player: PointerDownPlayer, now: number) => boolean;
  isWaterAt: (x: number, y: number) => boolean;
  worldWidth: number;
  worldHeight: number;
  clearMouse: () => void;
  log: (text: string) => void;
  setMouseRoute: (route: Array<{ x: number; y: number }>) => void;
  setMouseBoost: () => void;
  now: () => number;
};

export const handleKeyDown = (
  event: KeyboardEvent,
  keys: Set<string>,
  mode: string,
  profileOpen: boolean,
  setLeaderboardOpen: (value: boolean) => void,
): void => {
  const key = event.key.toLowerCase();
  if (profileOpen) {
    keys.clear();
    return;
  }
  if (mode === 'playing') {
    if (key === 'tab') {
      event.preventDefault();
      setLeaderboardOpen(true);
      return;
    }
    if (
      [
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        ' ',
        'shift',
        'capslock',
      ].includes(key)
    )
      event.preventDefault();
    keys.add(key);
  }
};

export const handleKeyUp = (
  event: KeyboardEvent,
  keys: Set<string>,
  setLeaderboardOpen: (value: boolean) => void,
): void => {
  const key = event.key.toLowerCase();
  if (key === 'tab') {
    setLeaderboardOpen(false);
    return;
  }
  keys.delete(key);
};

export const clearKeys = (keys: Set<string>): void => {
  keys.clear();
};

export const handleVisibilityChange = (
  keys: Set<string>,
  hidden: boolean,
): void => {
  if (hidden) keys.clear();
};

export const handlePointerDown = (event: PointerEvent, world: PointerDownWorld): void => {
  const players = world.getPlayers();
  const me = players[0];
  const now = world.now();
  if (
    event.pointerType !== 'mouse' ||
    ![0, 2].includes(event.button) ||
    world.getMode() !== 'playing' ||
    world.getPhase() !== 'PLAYING' ||
    world.getPaused() ||
    !['ACTIVE', 'IN_BASE'].includes(me.state) ||
    (world.getFieldId() === 'kanal2' && me.waterEnteredAt > 0) ||
    players.some((player) => player.action === 'ultimate' && now < player.actionUntil)
  )
    return;
  event.preventDefault();
  const shell = world.canvas.closest('.playing-shell');
  const matrix = shell ? new DOMMatrix(getComputedStyle(shell).transform) : new DOMMatrix();
  const target = pointerWorld(
    { x: event.clientX, y: event.clientY },
    world.canvas.getBoundingClientRect(),
    world.getView(),
    Math.abs(matrix.b - 1) < 0.01,
  );
  if (event.button === 2) {
    world.setMouseBoost();
    return;
  }
  const passable = (x: number, y: number) =>
    x >= 34 &&
    x <= world.worldWidth - 34 &&
    y >= 58 &&
    y <= world.worldHeight - 32 &&
    !world.isBlocked(x, y, me, now) &&
    !world.isWaterAt(x, y);
  const route = clickRoute(me, target, world.worldWidth, world.worldHeight, passable);
  world.clearMouse();
  if (!route.length) {
    world.log('Tujuan tidak dapat dijangkau. Pilih tanah kosong atau jalur jembatan.');
    return;
  }
  world.setMouseRoute(route);
};

// Right-click menu suppression while playing; menu interactions and hidden
// tabs drop the active mouse route via the injected clearer.
export const handleContextMenu = (event: { preventDefault: () => void }, mode: string) => {
  if (mode === 'playing') event.preventDefault();
};

export const handleStopForMenu = (
  event: { target: EventTarget | null },
  onClearMouse: () => void,
) => {
  if (
    event.target instanceof Element &&
    event.target.closest('button,input,select,[role="button"]')
  )
    onClearMouse();
};

export const handleStopWhenHidden = (isHidden: boolean, onClearMouse: () => void) => {
  if (isHidden) onClearMouse();
};

// 'P' pause toggle plus the paused/not-playing early-out at the top of the
// tick. Consumes the 'p' keystroke in place; the tick halts when gated.
export const stepPauseGate = (
  keys: Set<string>,
  paused: boolean,
  mode: string,
  onClearMouse: () => void,
): { paused: boolean; halted: boolean } => {
  let next = paused;
  if (keys.has('p')) {
    keys.delete('p');
    next = !next;
  }
  if (next || mode !== 'playing') {
    onClearMouse();
    return { paused: next, halted: true };
  }
  return { paused: next, halted: false };
};

// Click-route stuck detection: no progress for over 0.6s drops the route.
// Returns the updated stuck time; untouched while routeless.
export const stepMouseStuckTimeout = (
  hasRoute: boolean,
  me: { x: number; y: number },
  mouseBefore: { x: number; y: number },
  stuckTime: number,
  dt: number,
  onClearMouse: () => void,
): number => {
  if (!hasRoute) return stuckTime;
  const next = distance(me, mouseBefore) < .1 ? stuckTime + dt : 0;
  if (next > .6) onClearMouse();
  return next;
};
