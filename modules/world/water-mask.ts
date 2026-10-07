// Water-mask extraction for a field. Draws the loaded mask image onto the
// caller's canvas, reads its pixels, optionally colorizes a debug overlay,
// and (for kanal) samples glint points from the pixels. HEAD math verbatim.
// Returns null until the image is ready; callers keep ownership of the
// canvas, pixels slot, and glints array.
export type WaterMaskResult = {
  pixels: Uint8ClampedArray;
  glints: Array<{ x: number; y: number; phase: number }>;
};

export const extractWaterMask = (source: {
  image: HTMLImageElement | null;
  context: CanvasRenderingContext2D | null;
  canvas: HTMLCanvasElement;
  debugContext?: CanvasRenderingContext2D | null;
  worldWidth: number;
  worldHeight: number;
  kanal: boolean;
}): WaterMaskResult | null => {
  const { image, context, canvas } = source;
  if (!image || !context || !image.naturalWidth || !image.naturalHeight)
    return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  if (source.debugContext) {
    const overlay = source.debugContext.createImageData(
      canvas.width,
      canvas.height,
    );
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
      if (pixels[pixel * 4] <= 127) continue;
      overlay.data[pixel * 4] = 255;
      overlay.data[pixel * 4 + 1] = 69;
      overlay.data[pixel * 4 + 2] = 69;
      overlay.data[pixel * 4 + 3] = 78;
    }
    source.debugContext.putImageData(overlay, 0, 0);
  }
  const glints: WaterMaskResult['glints'] = [];
  if (source.kanal) {
    const maskWidth = canvas.width;
    const maskHeight = canvas.height;
    for (let y = 9; y < maskHeight - 9; y += 12)
      for (let x = 9; x < maskWidth - 9; x += 12) {
        const solidWater = (px: number, py: number) =>
          pixels[(py * maskWidth + px) * 4] > 127;
        if (
          solidWater(x, y) &&
          solidWater(x - 3, y) &&
          solidWater(x + 3, y) &&
          solidWater(x, y - 3) &&
          solidWater(x, y + 3)
        )
          glints.push({
            x: ((x + 0.5) / maskWidth) * source.worldWidth,
            y: ((y + 0.5) / maskHeight) * source.worldHeight,
            phase: (x * 17 + y * 31) % 29,
          });
      }
  }
  return { pixels, glints };
};
