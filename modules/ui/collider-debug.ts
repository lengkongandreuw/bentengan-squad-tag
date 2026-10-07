// Dev-only collider overlay for kanal: rasterizes every solid box plus
// map bounds onto a cached layer, then highlights solid edges. The cache
// lives here; the owner flips `enabled` (F8) at runtime.
type Rect = { x: number; y: number; w: number; h: number };

export type ColliderDebugWorld = {
  enabled: () => boolean;
  kanal: boolean;
  waterMaskPixels: () => Uint8ClampedArray | null;
  waterMaskCanvas: HTMLCanvasElement;
  worldWidth: number;
  worldHeight: number;
  obstacles: Rect[];
  fortRects: Rect[];
  ctx: CanvasRenderingContext2D;
};

export const createColliderDebugDraw = (
  world: ColliderDebugWorld,
): (() => void) => {
  let layer: HTMLCanvasElement | null = null;
  let waterSource: Uint8ClampedArray | null = null;
  return (): void => {
    if (!world.enabled() || !world.kanal) return;
    const mask = world.waterMaskPixels();
    if (!layer || waterSource !== mask) {
      waterSource = mask;
      layer = document.createElement('canvas');
      layer.width = Math.ceil(world.worldWidth);
      layer.height = Math.ceil(world.worldHeight);
      const target = layer.getContext('2d')!;
      target.fillStyle = '#fff';
      if (mask) target.drawImage(world.waterMaskCanvas, 0, 0, world.worldWidth, world.worldHeight);
      for (const box of [...world.obstacles, ...world.fortRects]) target.fillRect(box.x, box.y, box.w, box.h);
      target.fillRect(0, 0, 34, world.worldHeight);
      target.fillRect(world.worldWidth - 34, 0, 34, world.worldHeight);
      target.fillRect(0, 0, world.worldWidth, 58);
      target.fillRect(0, world.worldHeight - 32, world.worldWidth, 32);
      const pixels = target.getImageData(0, 0, layer.width, layer.height);
      const solid = new Uint8Array(layer.width * layer.height);
      for (let i = 0; i < solid.length; i++) solid[i] = pixels.data[i * 4] > 127 ? 1 : 0;
      for (let i = 0; i < solid.length; i++) {
        const x = i % layer.width, y = Math.floor(i / layer.width);
        const edge = solid[i] && (x === 0 || y === 0 || x === layer.width - 1 || y === layer.height - 1 ||
          !solid[i - 1] || !solid[i + 1] || !solid[i - layer.width] || !solid[i + layer.width]);
        pixels.data[i * 4] = solid[i] ? 255 : 70;
        pixels.data[i * 4 + 1] = edge ? 242 : solid[i] ? 55 : 220;
        pixels.data[i * 4 + 2] = edge ? 130 : solid[i] ? 60 : 135;
        pixels.data[i * 4 + 3] = edge ? 255 : solid[i] ? 105 : 22;
      }
      target.putImageData(pixels, 0, 0);
    }
    world.ctx.save();
    world.ctx.drawImage(layer, 0, 0, world.worldWidth, world.worldHeight);
    world.ctx.restore();
  };
};
