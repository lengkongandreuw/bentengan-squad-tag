/**
 * @typedef {Readonly<{
 *   directionRows: Readonly<Record<'south' | 'west' | 'east' | 'north', number>>,
 *   dedicatedEast: boolean,
 *   runColumns: readonly number[],
 *   boostColumns: readonly number[],
 *   runColumnsByDirection?: Readonly<Record<'south' | 'west' | 'east' | 'north', readonly number[]>>,
 *   boostColumnsByDirection?: Readonly<Record<'south' | 'west' | 'east' | 'north', readonly number[]>>,
 *   tag: Readonly<{row: number, columns: readonly number[]}>,
 *   rescue: Readonly<{row: number, columns: readonly number[]}>,
 *   prisoner: Readonly<{row: number, columns: readonly number[]}>,
 *   victory: Readonly<{row: number, columns: readonly number[]}>,
 *   defeat: Readonly<{row: number, columns: readonly number[]}>,
 *   tagByDirection?: Readonly<Record<'south' | 'west' | 'east' | 'north', number>>,
 *   parkour?: Readonly<{row: number, columns: readonly number[]}>,
 *   parkourByDirection?: Readonly<Record<'south' | 'west' | 'east' | 'north', Readonly<{row: number, columns: readonly number[]}>>,
 *   ultimate?: Readonly<{row: number, columns: readonly number[]}>,
 * }>} CharacterAnimationMapping
 */

/** @type {CharacterAnimationMapping} */
export const DEFAULT_ANIMATION_MAPPING = Object.freeze({
  directionRows: Object.freeze({ south: 0, west: 1, east: 2, north: 3 }),
  dedicatedEast: true,
  runColumns: Object.freeze([1, 2, 3, 4, 5]),
  boostColumns: Object.freeze([1, 2, 3, 4, 5]),
  tag: Object.freeze({ row: 4, columns: Object.freeze([0, 1, 2, 3]) }),
  rescue: Object.freeze({ row: 4, columns: Object.freeze([3, 4, 5, 6]) }),
  prisoner: Object.freeze({ row: 5, columns: Object.freeze([0, 1]) }),
  victory: Object.freeze({ row: 5, columns: Object.freeze([2, 3, 4]) }),
  defeat: Object.freeze({ row: 5, columns: Object.freeze([5, 6]) }),
});

/** @type {Readonly<{jago: CharacterAnimationMapping, raja: CharacterAnimationMapping}>} */
export const CHARACTER_ANIMATION_OVERRIDES = Object.freeze({
  jago: Object.freeze({
    directionRows: Object.freeze({ south: 0, west: 1, east: 1, north: 2 }),
    dedicatedEast: false,
    runColumns: Object.freeze([1, 2, 3, 4]),
    boostColumns: Object.freeze([1, 2, 3, 4]),
    runColumnsByDirection: Object.freeze({
      south: Object.freeze([1, 2, 3, 4]),
      west: Object.freeze([1, 2, 3, 4, 5, 6]),
      east: Object.freeze([1, 2, 3, 4, 5, 6]),
      north: Object.freeze([1, 2, 3, 4, 5, 6]),
    }),
    boostColumnsByDirection: Object.freeze({
      south: Object.freeze([1, 2, 3, 4]),
      west: Object.freeze([1, 2, 3, 4, 5, 6]),
      east: Object.freeze([1, 2, 3, 4, 5, 6]),
      north: Object.freeze([1, 2, 3, 4, 5, 6]),
    }),
    tag: Object.freeze({ row: 4, columns: Object.freeze([4, 5, 6]) }),
    rescue: Object.freeze({ row: 5, columns: Object.freeze([4, 5, 6]) }),
    prisoner: Object.freeze({ row: 3, columns: Object.freeze([4]) }),
    victory: Object.freeze({ row: 3, columns: Object.freeze([5]) }),
    defeat: Object.freeze({ row: 3, columns: Object.freeze([6]) }),
    parkour: Object.freeze({ row: 3, columns: Object.freeze([0, 1, 2, 3]) }),
    parkourByDirection: Object.freeze({
      south: Object.freeze({ row: 3, columns: Object.freeze([0, 1, 2, 3]) }),
      west: Object.freeze({ row: 4, columns: Object.freeze([0, 1, 2, 3]) }),
      east: Object.freeze({ row: 4, columns: Object.freeze([0, 1, 2, 3]) }),
      north: Object.freeze({ row: 5, columns: Object.freeze([0, 1, 2, 3]) }),
    }),
  }),
  raja: Object.freeze({
    directionRows: Object.freeze({ south: 0, west: 1, east: 1, north: 2 }),
    dedicatedEast: false,
    runColumns: Object.freeze([1, 2, 3]),
    boostColumns: Object.freeze([4, 5, 6]),
    tagByDirection: Object.freeze({ south: 0, east: 1, west: 2, north: 3 }),
    tag: Object.freeze({ row: 3, columns: Object.freeze([0]) }),
    parkour: Object.freeze({ row: 3, columns: Object.freeze([4, 5, 6]) }),
    rescue: Object.freeze({ row: 4, columns: Object.freeze([6]) }),
    prisoner: Object.freeze({ row: 4, columns: Object.freeze([0, 1, 2]) }),
    victory: Object.freeze({ row: 4, columns: Object.freeze([3, 4, 6]) }),
    defeat: Object.freeze({ row: 4, columns: Object.freeze([5]) }),
    ultimate: Object.freeze({ row: 5, columns: Object.freeze([0, 1, 2, 3]) }),
  }),
});

/** @param {string} id @returns {CharacterAnimationMapping} */
export const characterAnimationMapping = id => id === 'raja'
  ? CHARACTER_ANIMATION_OVERRIDES.raja
  : id === 'jago'
    ? CHARACTER_ANIMATION_OVERRIDES.jago
    : DEFAULT_ANIMATION_MAPPING;
