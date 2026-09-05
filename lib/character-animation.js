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

export const CHARACTER_ANIMATION_OVERRIDES = Object.freeze({
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

export const characterAnimationMapping = id => id === 'raja'
  ? CHARACTER_ANIMATION_OVERRIDES.raja
  : DEFAULT_ANIMATION_MAPPING;
