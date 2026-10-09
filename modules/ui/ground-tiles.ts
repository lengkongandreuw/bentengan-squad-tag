import type { GroundTileId } from '../../lib/field-assets.generated.ts';

// Cuts one ground tile out of the loaded atlas onto a fresh canvas.
// The surface is blank until the atlas loads (HEAD guard verbatim);
// callers own the returned canvas (they cache per tile id).
export const createGroundTileCanvas = (
  atlasImage: HTMLImageElement,
  tiles: Record<GroundTileId, { x: number; y: number; width: number; height: number }>,
): ((tile: GroundTileId) => HTMLCanvasElement) => {
  return (tile: GroundTileId): HTMLCanvasElement => {
    const source = tiles[tile];
    const surface = document.createElement('canvas');
    surface.width = source.width;
    surface.height = source.height;
    const surfaceContext = surface.getContext('2d');
    if (
      surfaceContext &&
      atlasImage.complete &&
      atlasImage.naturalWidth
    ) {
      surfaceContext.drawImage(
        atlasImage,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        source.width,
        source.height,
      );
    }
    return surface;
  };
};
