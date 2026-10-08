import { solidAt, waterAt, speedAt } from './model.js';
export const MAX_POLYGON_NODES = 64;
export function closestEdge(points, point, w = 1, h = 1) {
  let best = Infinity,
    edge = 0;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    const dx = (b.x - a.x) * w,
      dy = (b.y - a.y) * h;
    const px = (point.x - a.x) * w,
      py = (point.y - a.y) * h;
    const t = Math.max(
      0,
      Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)),
    );
    const distance = Math.hypot(px - t * dx, py - t * dy);
    if (distance < best) {
      best = distance;
      edge = i;
    }
  });
  return edge;
}
export function polygonBounds(points) {
  if (points.length < 3 || points.length > MAX_POLYGON_NODES)
    throw new Error('Gunakan3–64 titik; klik Selesai setelah minimal3 titik.');
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  const w = Math.max(...points.map((p) => p.x)) - x,
    h = Math.max(...points.map((p) => p.y)) - y;
  if (w < 10 || h < 10)
    throw new Error(
      'Collider terlalu kecil. Buat lebar dan tinggi minimal10 unit.',
    );
  return {
    x,
    y,
    w,
    h,
    points: points.map((p) => ({ x: (p.x - x) / w, y: (p.y - y) / h })),
  };
}
export function moveDummy(map, player, dx, dy, dt, jumping, boost = false) {
  const length = Math.hypot(dx, dy) || 1;
  const multiplier = speedAt(map, player.x, player.y);
  const speed = 210 * multiplier * (boost ? 1.7 : 1);
  const steps = Math.max(1, Math.ceil((speed * Math.min(dt, 0.04)) / 6));
  let { x, y } = player,
    blocked = false;
  const clampX = (v) => Math.max(34, Math.min(map.width - 34, v));
  const clampY = (v) => Math.max(58, Math.min(map.height - 32, v));
  for (let i = 0; i < steps; i++) {
    const nx = clampX(x + ((dx / length) * speed * Math.min(dt, 0.04)) / steps);
    const ny = clampY(y + ((dy / length) * speed * Math.min(dt, 0.04)) / steps);
    if (!solidAt(map, nx, y, 13, jumping)) x = nx;
    else if (dx) blocked = true;
    if (!solidAt(map, x, ny, 13, jumping)) y = ny;
    else if (dy) blocked = true;
  }
  return { x, y, blocked, multiplier, fallen: !jumping && waterAt(map, x, y) };
}
