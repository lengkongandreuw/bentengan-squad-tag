import type { FieldAnimatedId, FieldAssetId } from '../../lib/field-assets.generated.ts';
import type { AnimatedDecoration } from '../world/map-data/field-types';
import { roundedOn } from './canvas-shapes.ts';

// Atlas metadata + loaded images for one field. Values are captured for
// the lifetime of a match run (all const in the composition root).
export type FieldAssetWorld = {
  kanal: boolean;
  objectAssets: Record<string, { x: number; y: number; width: number; height: number }>;
  animations: Record<
    string,
    {
      fps: number;
      frames: readonly { x: number; y: number; width: number; height: number }[];
    }
  >;
  baseAtlas: HTMLImageElement;
  kanalAtlas: HTMLImageElement | null;
  animatedAtlas: HTMLImageElement;
};

// Blits one field object sprite (kanal objects ride their own atlas),
// falling back to a placeholder rounded rect until the atlas loads.
// Head shadow/flip/opacity behavior verbatim.
const drawFieldAsset = (
  world: FieldAssetWorld,
  target: CanvasRenderingContext2D,
  asset: FieldAssetId,
  x: number,
  y: number,
  w: number,
  h: number,
  flip = false,
  opacity = 1,
): void => {
  const source = world.objectAssets[asset];
  const atlas = asset.startsWith('kanalNusa') ? world.kanalAtlas : world.baseAtlas;
  if (!atlas?.complete || !atlas.naturalWidth) {
    target.fillStyle = 'rgba(28,43,31,.34)';
    roundedOn(target, x, y, w, h, Math.min(12, w / 5));
    target.fill();
    return;
  }
  target.save();
  target.globalAlpha = opacity;
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = 'high';
  if (world.kanal) {
    // Atlas sprites have transparent edges, so a shadow follows the true
    // silhouette rather than drawing a rectangular backdrop.
    target.shadowColor = 'rgba(5, 16, 12, .46)';
    target.shadowBlur = 4;
    target.shadowOffsetY = 5;
  }
  if (flip) {
    target.translate(x * 2 + w, 0);
    target.scale(-1, 1);
  }
  target.drawImage(
    atlas,
    source.x,
    source.y,
    source.width,
    source.height,
    x,
    y,
    w,
    h,
  );
  target.restore();
};

// Draws the current frame of an atlas animation. Frame index follows
// fps × elapsed time; silent no-op until the atlas loads.
const drawAnimatedAsset = (
  world: FieldAssetWorld,
  target: CanvasRenderingContext2D,
  animationId: FieldAnimatedId,
  x: number,
  y: number,
  w: number,
  h: number,
  now: number,
  flip = false,
  opacity = 1,
): void => {
  const animation = world.animations[animationId];
  const frame =
    animation.frames[
      Math.floor((now * animation.fps) / 1000) % animation.frames.length
    ];
  if (!world.animatedAtlas.complete || !world.animatedAtlas.naturalWidth)
    return;
  target.save();
  target.globalAlpha = opacity;
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = 'high';
  if (flip) {
    target.translate(x * 2 + w, 0);
    target.scale(-1, 1);
  }
  target.drawImage(
    world.animatedAtlas,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    x,
    y,
    w,
    h,
  );
  target.restore();
};

// One world, both blitters — the pair always travels together.
export type FieldAssetDraw = {
  drawFieldAsset: (
    target: CanvasRenderingContext2D,
    asset: FieldAssetId,
    x: number,
    y: number,
    w: number,
    h: number,
    flip?: boolean,
    opacity?: number,
  ) => void;
  drawAnimatedAsset: (
    target: CanvasRenderingContext2D,
    animationId: FieldAnimatedId,
    x: number,
    y: number,
    w: number,
    h: number,
    now: number,
    flip?: boolean,
    opacity?: number,
  ) => void;
};

export const createFieldAssetDraw = (world: FieldAssetWorld): FieldAssetDraw => ({
  drawFieldAsset: (target, asset, x, y, w, h, flip, opacity) =>
    drawFieldAsset(world, target, asset, x, y, w, h, flip, opacity),
  drawAnimatedAsset: (target, animationId, x, y, w, h, now, flip, opacity) =>
    drawAnimatedAsset(world, target, animationId, x, y, w, h, now, flip, opacity),
});

// Plays every configured field animation on the current tick.
export const createDrawFieldAnimations = (
  ctx: CanvasRenderingContext2D,
  drawAnimatedAsset: FieldAssetDraw['drawAnimatedAsset'],
  animated: AnimatedDecoration[],
): ((now: number) => void) =>
  (now: number): void => {
    animated.forEach((item) =>
      drawAnimatedAsset(
        ctx,
        item.animation,
        item.x,
        item.y,
        item.w,
        item.h,
        now,
        item.flip,
        item.opacity,
      ),
    );
  };
