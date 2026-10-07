import type { FieldConfig } from '../world/map-data/field-types';
import { MAP4_GUIDE_HEIGHT, MAP4_GUIDE_WIDTH } from '../world/map-data/scalars.ts';
import { kanal2X } from '../world/map-data/guide-fields.ts';

type Glint = { x: number; y: number; phase: number };

// Kanal's live water layer: drifting glints (sampled from the mask) plus
// the two translucent canal drops with crest, ribbons, and foam. Visual
// only — water rules come from the mask itself. All numbers verbatim.
export type DrawKanalWaterWorld = {
  ctx: CanvasRenderingContext2D;
  kanal: boolean;
  waterMaskPixels: () => Uint8ClampedArray | null;
  glints: Glint[];
  worldWidth: number;
  worldHeight: number;
  field: FieldConfig;
  isWaterAt: (x: number, y: number) => boolean;
};

export const createDrawKanalWater = (
  world: DrawKanalWaterWorld,
): ((now: number) => void) => {
  const ctx = world.ctx;
  return (now: number): void => {
    if (!world.kanal || !world.waterMaskPixels()) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.3;
    ctx.strokeStyle = 'rgba(184, 243, 252, .46)';
    for (const glint of world.glints) {
      const upper = glint.y < world.worldHeight * 0.36;
      const lower = glint.y > world.worldHeight * 0.64;
      const sideways = upper ? 0.55 : lower ? -0.55 : 0;
      const dx = glint.x < world.worldWidth / 2 ? -sideways : sideways;
      const drift = ((now * 0.018 + glint.phase) % 18) - 9;
      const x = glint.x + dx * drift;
      const y = glint.y + drift;
      if (!world.isWaterAt(x, y)) continue;
      ctx.globalAlpha = 0.42 + 0.18 * Math.sin(now / 650 + glint.phase);
      ctx.beginPath();
      ctx.moveTo(x - dx * 4, y - 4);
      ctx.lineTo(x + dx * 4, y + 4);
      ctx.stroke();
    }
    // A translucent falling sheet, bright crest, and downstream foam make
    // the two canal drops readable even in the overview camera. This is
    // visual-only; the water mask and movement rules are untouched.
    const field = world.field;
    const sx = world.worldWidth / (field.designWidth ?? MAP4_GUIDE_WIDTH);
    const sy = world.worldHeight / (field.designHeight ?? MAP4_GUIDE_HEIGHT);
    for (const drop of [{ y: 94, h: 22 }, { y: 798, h: 34 }]) {
      const x = (field.id === 'kanal2' ? kanal2X(849) : 849) * sx;
      const y = drop.y * sy;
      if (!world.isWaterAt(x, y + 7 * sy)) continue;
      const width = 55 * sx;
      const fallHeight = drop.h * sy;
      const fallingWater = ctx.createLinearGradient(x, y, x, y + fallHeight);
      fallingWater.addColorStop(0, 'rgba(226, 253, 255, .8)');
      fallingWater.addColorStop(0.42, 'rgba(112, 218, 238, .55)');
      fallingWater.addColorStop(1, 'rgba(42, 143, 193, .2)');
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = fallingWater;
      ctx.beginPath();
      ctx.moveTo(x - width * 0.46, y + 2 * sy);
      ctx.lineTo(x + width * 0.46, y + 2 * sy);
      ctx.lineTo(x + width * 0.4, y + fallHeight);
      ctx.lineTo(x - width * 0.4, y + fallHeight);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.82;
      ctx.lineWidth = 3.2 * sx;
      ctx.strokeStyle = 'rgba(239, 255, 255, .9)';
      ctx.beginPath();
      ctx.ellipse(x, y, width / 2, 4 * sy, 0, 0, Math.PI);
      ctx.stroke();
      for (let index = -3; index <= 3; index++) {
        const ribbonX = x + index * 7 * sx;
        const fall = (now / 28 + index * 11) % fallHeight;
        ctx.globalAlpha = 0.3 + 0.12 * Math.sin(now / 330 + index);
        ctx.beginPath();
        ctx.moveTo(ribbonX, y + 3 * sy + fall * 0.42);
        ctx.lineTo(ribbonX + 1.5 * sx, y + 4 * sy + fall);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.62 + 0.08 * Math.sin(now / 260);
      ctx.beginPath();
      ctx.ellipse(x, y + fallHeight, width * 0.43, 5 * sy, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let bubble = -2; bubble <= 2; bubble++) {
        const bob = Math.sin(now / 310 + bubble * 1.7) * 2 * sy;
        ctx.globalAlpha = 0.38 + 0.12 * Math.sin(now / 270 + bubble);
        ctx.beginPath();
        ctx.arc(x + bubble * 10 * sx, y + fallHeight + 6 * sy + bob, 2.6 * sx, 0, Math.PI * 2);
        ctx.fillStyle = '#e7fcff';
        ctx.fill();
      }
    }
    ctx.restore();
  };
};
