// Shared canvas path helpers. Pure wrappers over the 2D context's own
// roundRect path primitive — no state, no deps, no game rules.
export const roundedOn = (
  target: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  target.beginPath();
  target.roundRect(x, y, w, h, r);
};
