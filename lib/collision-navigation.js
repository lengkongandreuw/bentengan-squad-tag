const DEFAULT_BOUNDS = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };

export const pointHitsExpandedRect = (x, y, rect, radius = 13) =>
  x > rect.x - radius && x < rect.x + rect.w + radius &&
  y > rect.y - radius && y < rect.y + rect.h + radius;

export const depenetrateFromRects = (position, rects, radius = 13, bounds = DEFAULT_BOUNDS) => {
  let x = position.x;
  let y = position.y;
  const epsilon = .25;
  const maxPasses = Math.max(4, rects.length * 2);

  for (let pass = 0; pass < maxPasses; pass++) {
    const rect = rects.find(item => pointHitsExpandedRect(x, y, item, radius));
    if (!rect) break;

    const left = rect.x - radius;
    const right = rect.x + rect.w + radius;
    const top = rect.y - radius;
    const bottom = rect.y + rect.h + radius;
    const exits = [
      { distance: Math.abs(x - left), x: left - epsilon, y },
      { distance: Math.abs(right - x), x: right + epsilon, y },
      { distance: Math.abs(y - top), x, y: top - epsilon },
      { distance: Math.abs(bottom - y), x, y: bottom + epsilon },
    ].sort((a, b) => a.distance - b.distance);
    x = Math.max(bounds.minX, Math.min(bounds.maxX, exits[0].x));
    y = Math.max(bounds.minY, Math.min(bounds.maxY, exits[0].y));
  }

  return { x, y };
};

const pathIsClear = (position, direction, distance, rects, radius) => {
  for (let step = 1; step <= 4; step++) {
    const t = step / 4;
    if (rects.some(rect => pointHitsExpandedRect(
      position.x + direction.x * distance * t,
      position.y + direction.y * distance * t,
      rect,
      radius,
    ))) return false;
  }
  return true;
};

export const steerAroundRects = (position, vector, rects, radius = 13, probeDistance = 82, turnBias = 1) => {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < .001) return vector;
  const direction = { x: vector.x / magnitude, y: vector.y / magnitude };
  if (pathIsClear(position, direction, probeDistance, rects, radius)) return vector;

  const bias = turnBias < 0 ? -1 : 1;
  const angles = [bias * .5, -bias * .5, bias * .9, -bias * .9, bias * 1.3, -bias * 1.3];
  for (const angle of angles) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const candidate = {
      x: direction.x * cos - direction.y * sin,
      y: direction.x * sin + direction.y * cos,
    };
    if (pathIsClear(position, candidate, probeDistance, rects, radius)) {
      return { x: candidate.x * magnitude, y: candidate.y * magnitude };
    }
  }

  return { x: -direction.y * magnitude * bias, y: direction.x * magnitude * bias };
};
