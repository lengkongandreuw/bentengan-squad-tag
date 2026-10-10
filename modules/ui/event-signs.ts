import type { GameEvent } from '../../lib/game-core/events.ts';
export type EventSignType =
  | 'TAG_SUCCESS'
  | 'BASE_CAPTURE_SUCCESS'
  | 'HELP_REQUESTED';
export const EVENT_SIGN_CONFIG = {
  TAG_SUCCESS: {
    asset: 'tag_sign.png',
    durationMs: 900,
    priority: 2,
    ratio: 91 / 83,
    scale: 1.05,
    offsetX: 0,
    offsetY: 8,
  },
  BASE_CAPTURE_SUCCESS: {
    asset: 'bentengsign.png',
    durationMs: 1300,
    priority: 3,
    ratio: 80 / 66,
    scale: 1.1,
    offsetX: 0,
    offsetY: 8,
  },
  HELP_REQUESTED: {
    asset: 'helpsign.png',
    durationMs: 1500,
    priority: 1,
    ratio: 74 / 55,
    scale: 1.05,
    offsetX: 0,
    offsetY: 8,
  },
} as const;
export type EventSign = {
  actorId: string;
  eventId: string;
  type: EventSignType;
  start: number;
};
export function createEventSigns() {
  let time = 0;
  const active = new Map<string, EventSign>(),
    seen = new Set<string>();
  return {
    accept(event: GameEvent, eventId: string) {
      const type =
        event.type === 'PLAYER_TAGGED'
          ? 'TAG_SUCCESS'
          : event.type === 'FORT_CAPTURED'
            ? 'BASE_CAPTURE_SUCCESS'
            : event.type === 'HELP_REQUESTED'
              ? 'HELP_REQUESTED'
              : null;
      if (!type || !('actorId' in event) || !event.actorId || seen.has(eventId))
        return false;
      seen.add(eventId);
      if (seen.size > 512) seen.delete(seen.values().next().value!);
      const current = active.get(event.actorId);
      if (
        current &&
        current.start === time &&
        EVENT_SIGN_CONFIG[current.type].priority >
          EVENT_SIGN_CONFIG[type].priority
      )
        return false;
      active.set(event.actorId, {
        actorId: event.actorId,
        eventId,
        type,
        start: time,
      });
      return true;
    },
    advance(
      deltaMs: number,
      paused: boolean,
      actors: readonly { entityId: string; state: string }[],
    ) {
      if (!paused) time += Math.max(0, Math.min(100, deltaMs));
      if (!active.size) return;
      const live = new Map(actors.map((p) => [p.entityId, p.state]));
      for (const [id, sign] of active) {
        const state = live.get(id),
          age = time - sign.start;
        if (
          !state ||
          (age > 220 &&
            (state === 'IN_BASE' ||
              (sign.type === 'HELP_REQUESTED' && state !== 'PRISONER'))) ||
          age >= EVENT_SIGN_CONFIG[sign.type].durationMs
        )
          active.delete(id);
      }
    },
    read() {
      return [...active.values()].map((sign) => ({
        ...sign,
        ageMs: time - sign.start,
      }));
    },
    clear() {
      active.clear();
    },
  };
}
export function eventSignMotion(
  age: number,
  duration: number,
  reduced = false,
) {
  const fade = Math.max(0, Math.min(1, (duration - age) / 180));
  if (reduced) return { alpha: fade, scale: 1, float: 0 };
  return {
    alpha: Math.min(1, age / 100) * fade,
    scale:
      age < 100
        ? 0.8 + (0.26 * age) / 100
        : age < 160
          ? 1.06 - (0.06 * (age - 100)) / 60
          : 1,
    float: Math.min(4, (4 * age) / duration),
  };
}
export type SignBounds = {
  x: number;
  top: number;
  height: number;
  visible: boolean;
};
export function drawEventSigns(
  ctx: CanvasRenderingContext2D,
  signs: ReturnType<ReturnType<typeof createEventSigns>['read']>,
  bounds: ReadonlyMap<string, SignBounds>,
  camera: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  },
  images: Record<EventSignType, HTMLImageElement>,
  reduced = false,
) {
  if (!signs.length) return;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const sign of signs) {
    const b = bounds.get(sign.actorId),
      config = EVENT_SIGN_CONFIG[sign.type],
      image = images[sign.type];
    if (!b?.visible || !image.complete || !image.naturalWidth) continue;
    const x = (b.x - camera.x) * camera.scale + camera.width / 2,
      head = (b.top - camera.y) * camera.scale + camera.height / 2;
    if (
      x < 0 ||
      x > camera.width ||
      head + b.height * camera.scale < 0 ||
      head > camera.height
    )
      continue;
    const motion = eventSignMotion(sign.ageMs, config.durationMs, reduced),
      width =
        Math.max(44, Math.min(104, b.height * camera.scale * config.scale)) *
        motion.scale,
      height = width / config.ratio;
    let actorHash = 0;
    for (let i = 0; i < sign.actorId.length; i++)
      actorHash += sign.actorId.charCodeAt(i);
    const jitter = ((actorHash % 3) - 1) * 3;
    ctx.globalAlpha = motion.alpha;
    ctx.drawImage(
      image,
      x - width / 2 + config.offsetX + jitter,
      head - config.offsetY - height - motion.float,
      width,
      height,
    );
  }
  ctx.restore();
}
