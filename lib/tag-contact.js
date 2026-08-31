export const sweptContactDistance = (a, b) => {
  const startX = a.lastX - b.lastX;
  const startY = a.lastY - b.lastY;
  const travelX = (a.x - a.lastX) - (b.x - b.lastX);
  const travelY = (a.y - a.lastY) - (b.y - b.lastY);
  const travelSquared = travelX * travelX + travelY * travelY;
  const projection = travelSquared > .001
    ? -(startX * travelX + startY * travelY) / travelSquared
    : 0;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(startX + travelX * t, startY + travelY * t);
};
