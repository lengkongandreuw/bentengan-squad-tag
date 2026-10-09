// Water-mask extraction for a field. Draws the loaded mask image onto the
// caller's canvas, reads its pixels, optionally colorizes a debug overlay,
// and (for kanal) samples glint points from the pixels. HEAD math verbatim.
// Returns null until the image is ready; callers keep ownership of the
// canvas, pixels slot, and glints array.
export type WaterMaskResult = {
  pixels: Uint8ClampedArray;
  glints: Array<{ x: number; y: number; phase: number }>;
};

const sampleGlints = (
  pixels: Uint8ClampedArray,
  maskWidth: number,
  maskHeight: number,
  worldWidth: number,
  worldHeight: number,
): WaterMaskResult['glints'] => {
  const glints: WaterMaskResult['glints'] = [];
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
          x: ((x + 0.5) / maskWidth) * worldWidth,
          y: ((y + 0.5) / maskHeight) * worldHeight,
          phase: (x * 17 + y * 31) % 29,
        });
    }
  return glints;
};

export const decodeStudioWaterMask = (
  mask: { width: number; height: number; rows: number[][] },
  source: { worldWidth: number; worldHeight: number; kanal: boolean },
): WaterMaskResult | null => {
  if (!mask || !mask.width || !mask.height || !Array.isArray(mask.rows)) return null;
  const pixels = new Uint8ClampedArray(mask.width * mask.height * 4);
  mask.rows.forEach((row, y) => {
    if (!row || y < 0 || y >= mask.height) return;
    for (let i = 0; i < row.length; i += 2)
      for (let x = row[i]; x < row[i + 1]; x++) {
        if (x < 0 || x >= mask.width) continue;
        pixels[(y * mask.width + x) * 4] = 255;
      }
  });
  const glints = source.kanal
    ? sampleGlints(pixels, mask.width, mask.height, source.worldWidth, source.worldHeight)
    : [];
  return { pixels, glints };
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
  const glints = source.kanal
    ? sampleGlints(pixels, canvas.width, canvas.height, source.worldWidth, source.worldHeight)
    : [];
  return { pixels, glints };
};
