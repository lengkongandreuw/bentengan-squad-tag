/** @typedef {'south' | 'west' | 'east' | 'north'} SpriteDirection */

export const IDLE_COLUMNS = Object.freeze([0]);
export const RUN_COLUMNS = Object.freeze([1, 2, 3, 4, 5]);
// Pose kolom 6 pada sheet sumber tidak konsisten arah antar-karakter.
// Sprint memakai run cycle directional yang dipercepat agar selalu menghadap gerak.
export const BOOST_COLUMNS = RUN_COLUMNS;

/** @param {number} vx @param {number} vy @returns {SpriteDirection} */
export const directionFromVelocity = (vx, vy) => {
  if (Math.abs(vx) > Math.abs(vy)) return vx >= 0 ? 'east' : 'west';
  return vy < 0 ? 'north' : 'south';
};

/** @param {SpriteDirection} direction */
export const directionalRow = direction => direction === 'north' ? 3 : direction === 'east' ? 2 : direction === 'south' ? 0 : 1;

/** @param {SpriteDirection} direction @param {boolean} hasDedicatedEast */
export const shouldMirrorSprite = (direction, hasDedicatedEast) => direction === 'east' && !hasDedicatedEast;

/** @param {SpriteDirection} direction */
export const sprintEffectRotation = direction => direction === 'west' ? Math.PI : direction === 'north' ? -Math.PI / 2 : direction === 'south' ? Math.PI / 2 : 0;

