import { NETWORK_RATES } from './rates.ts';
import type { ProtocolMessage } from './protocol.ts';
import type { MultiplayerSession } from './session';
import type { PlayerInputFrame } from '../game-core/input.ts';
import { wireInput } from './remote-input.ts';

export type NetworkPump = {
  tickClientInput: (localNow: number) => void;
  tickHostSnapshot: (localNow: number, now: number) => void;
};

export const createNetworkPump = (source: {
  network: MultiplayerSession;
  matchId: string;
  myEntityId: string;
  sampleInput: (
    entityId: string,
    keys: ReadonlySet<string>,
    boost: boolean,
    target?: { x: number; y: number },
  ) => PlayerInputFrame;
  keys: Set<string>;
  mouseBoost: () => boolean;
  setMouseBoost: (value: boolean) => void;
  mouseRoute: () => Array<{ x: number; y: number }>;
  clearMouse: () => void;
  distance: (a: { x: number; y: number }, b: { x: number; y: number }) => number;
  me: () => { state: string; x: number; y: number } | undefined;
  publishSnapshot: (now: number, initial: boolean) => void;
}): NetworkPump => {
  let lastInputSend = 0;
  let lastSnapshotSend = -Infinity;
  let initialSnapshot = true;
  const tickClientInput = (localNow: number) => {
    if (localNow - lastInputSend < 1000 / NETWORK_RATES.inputHz) return;
    const me = source.me();
    if (!me) return;
    if (!['ACTIVE', 'IN_BASE'].includes(me.state)) source.clearMouse();
    const route = source.mouseRoute();
    while (route.length && source.distance(me, route[0]) <= 5) route.shift();
    const frame = source.sampleInput(
      source.myEntityId,
      source.keys,
      source.mouseBoost(),
      route[0],
    );
    if (frame.moveX || frame.moveY) route.length = 0;
    source.network.sendInput({
      version: 1,
      type: 'INPUT',
      matchId: source.matchId,
      entityId: source.myEntityId,
      sequence: frame.sequence,
      input: wireInput(frame),
    } as Extract<ProtocolMessage, { type: 'INPUT' }>);
    if (frame.ultimate) source.keys.delete('capslock');
    if (frame.rescue) source.keys.delete('r');
    source.setMouseBoost(false);
    lastInputSend = localNow;
  };
  const tickHostSnapshot = (localNow: number, now: number) => {
    if (localNow - lastSnapshotSend < 1000 / NETWORK_RATES.snapshotHz) return;
    source.publishSnapshot(now, initialSnapshot);
    initialSnapshot = false;
    lastSnapshotSend = localNow;
  };
  return { tickClientInput, tickHostSnapshot };
};
