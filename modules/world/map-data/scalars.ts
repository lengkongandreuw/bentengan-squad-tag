// Shared map scalars. Single owner: map geometry derives from these, and the
// composition root imports them. Gameplay tuning (speeds, cooldowns,
// ultimates, difficulty) lives elsewhere and must not move here.
export const DESIGN_W = 1440;
export const DESIGN_H = 800;
export const W = 1538;
export const H = 1096;
export const WORLD_SCALE_X = W / DESIGN_W;
export const WORLD_SCALE_Y = H / DESIGN_H;
export const MAP1_GUIDE_WIDTH = 1452;
export const MAP1_GUIDE_HEIGHT = 1088;
export const MAP1_WORLD_WIDTH = Math.round(W * 1.15);
export const MAP1_WORLD_HEIGHT = Math.round(H * 1.15);
export const MAP2_GUIDE_WIDTH = 1672;
export const MAP2_GUIDE_HEIGHT = 941;
export const MAP2_WORLD_WIDTH = Math.round(MAP2_GUIDE_WIDTH * 1.15);
export const MAP2_WORLD_HEIGHT = Math.round(MAP2_GUIDE_HEIGHT * 1.15);
export const MAP3_GUIDE_WIDTH = 1672;
export const MAP3_GUIDE_HEIGHT = 941;
export const MAP3_WORLD_WIDTH = Math.round(MAP3_GUIDE_WIDTH * 1.15);
export const MAP3_WORLD_HEIGHT = Math.round(MAP3_GUIDE_HEIGHT * 1.15);
export const MAP4_GUIDE_WIDTH = 1699;
export const MAP4_GUIDE_HEIGHT = 926;
// A 15% physical expansion creates genuine running room between the canal,
// forts, prison yards, and centre obstacles. Keep the terrain and authored
// scenery at the same scale so the village reads as one cohesive place.
export const MAP4_WORLD_SCALE = 1.15;
export const MAP4_OBJECT_SCALE = 1.4;
export const MAP4_WORLD_WIDTH = Math.round(MAP4_GUIDE_WIDTH * MAP4_WORLD_SCALE);
export const MAP4_WORLD_HEIGHT = Math.round(MAP4_GUIDE_HEIGHT * MAP4_WORLD_SCALE);
export const MAP4_2_GUIDE_WIDTH = 2059;
export const MAP4_2_INSERT = 360;
export const MAP4_2_LEFT_ANCHOR = 750;
export const MAP4_2_RIGHT_ANCHOR = 950;
export const MAP_OBJECT_SCALE = 0.9;
export const BASE_RADIUS = 118;
export const BASES = {
  blue: { x: 174, y: 520 },
  red: { x: W - 174, y: 520 },
};
export const worldX = (value: number) => Math.round(value * WORLD_SCALE_X);
export const worldY = (value: number) => Math.round(value * WORLD_SCALE_Y);
