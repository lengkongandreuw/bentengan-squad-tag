const DEFAULT_BOUNDS = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };

export const pointHitsExpandedRect = (x, y, rect, radius = 13) =>
  x > rect.x - radius && x < rect.x + rect.w + radius &&
  y > rect.y - radius && y < rect.y + rect.h + radius;

// Immutable match geometry: broad phase only, identical strict rectangle test.
export function createRectQuery(rects, cellSize = 128) {
  const buckets = new Map(), global = [];
  for (const rect of rects) {
    const x0=Math.floor(rect.x/cellSize),x1=Math.floor((rect.x+rect.w)/cellSize);
    const y0=Math.floor(rect.y/cellSize),y1=Math.floor((rect.y+rect.h)/cellSize);
    if ((x1-x0+1)*(y1-y0+1)>1024) {global.push(rect);continue;}
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++) {
      const key=`${x},${y}`;
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(rect);
    }
  }
  return (x,y,radius=13) => {
    if(global.some(rect=>pointHitsExpandedRect(x,y,rect,radius)))return true;
    for(let cx=Math.floor((x-radius)/cellSize);cx<=Math.floor((x+radius)/cellSize);cx++)
      for(let cy=Math.floor((y-radius)/cellSize);cy<=Math.floor((y+radius)/cellSize);cy++)
        if(buckets.get(`${cx},${cy}`)?.some(rect=>pointHitsExpandedRect(x,y,rect,radius)))return true;
    return false;
  };
}

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
