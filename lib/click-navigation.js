/** Inverse of the canvas camera; dimensions are logical CSS pixels, not DPR pixels. */
export function pointerWorld(point, rect, view, rotated = false) {
  const x = rotated ? (point.y - rect.top) / rect.height : (point.x - rect.left) / rect.width;
  const y = rotated ? 1 - (point.x - rect.left) / rect.width : (point.y - rect.top) / rect.height;
  return { x: view.x + (x - .5) * view.width / view.scale, y: view.y + (y - .5) * view.height / view.scale };
}

export function clearSegment(a, b, passable, step = 8) {
  const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
  for (let n = 1; n <= count; n++) if (!passable(a.x + (b.x - a.x) * n / count, a.y + (b.y - a.y) * n / count)) return false;
  return true;
}

/** Bounded A* grid. Every edge is sampled; diagonal edges cannot cut corners. */
export function clickRoute(start, target, width, height, passable, cell = 24) {
  if (!passable(target.x, target.y)) return [];
  if (clearSegment(start, target, passable)) return [target];
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const point = key => ({ x: (key % cols + .5) * cell, y: (Math.floor(key / cols) + .5) * cell });
  const keyAt = p => Math.floor(p.y / cell) * cols + Math.floor(p.x / cell);
  const first = keyAt(start), goal = keyAt(target);
  const scores = new Map([[first, 0]]), previous = new Map();
  const open = new Set([first]), closed = new Set();
  const heuristic = p => Math.hypot(target.x - p.x, target.y - p.y);
  for (let iteration = 0; open.size && iteration < 8000; iteration++) {
    let current = first, best = Infinity;
    for (const key of open) {
      const score = scores.get(key) + heuristic(key === first ? start : point(key));
      if (score < best) { current = key; best = score; }
    }
    const here = current === first ? start : point(current);
    if ((current === goal || heuristic(here) < cell * 2) && clearSegment(here, target, passable)) {
      const route = [target];
      while (current !== first) { route.unshift(point(current)); current = previous.get(current); }
      return route;
    }
    open.delete(current); closed.add(current);
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
      if (!x && !y) continue;
      const cx = current % cols + x, cy = Math.floor(current / cols) + y;
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      const key = cy * cols + cx, next = point(key);
      if (closed.has(key) || !passable(next.x, next.y) || !clearSegment(here, next, passable)) continue;
      const score = scores.get(current) + Math.hypot(next.x - here.x, next.y - here.y);
      if (score >= (scores.get(key) ?? Infinity)) continue;
      scores.set(key, score); previous.set(key, current); open.add(key);
    }
  }
  return [];
}
