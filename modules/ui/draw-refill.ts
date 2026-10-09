import type { Refill } from '../gameplay/spawn';
import type { FieldAnimatedId } from '../../lib/field-assets.generated.ts';
import type { FieldAssetDraw } from './field-assets.ts';

// Draws one boost refill with its grade's animation and an id-seeded
// pulse. Binds the match canvas and the field-asset animator once.
export const createDrawRefill = (
  ctx: CanvasRenderingContext2D,
  drawAnimatedAsset: FieldAssetDraw['drawAnimatedAsset'],
): ((item: Refill, now: number) => void) => {
  return (item: Refill, now: number): void => {
    const animation: FieldAnimatedId =
      item.grade === 100
        ? 'boost100'
        : item.grade === 75
          ? 'boost75'
          : item.grade === 40
            ? 'boost40'
            : 'boost25';
    const pulse = 1 + Math.sin(now / 220 + item.id) * 0.08;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.scale(pulse, pulse);
    drawAnimatedAsset(ctx, animation, -27, -30, 54, 58, now + item.id * 37);
    ctx.restore();
  };
};
