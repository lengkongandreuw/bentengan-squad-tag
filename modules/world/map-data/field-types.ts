import type {
  FieldAnimatedId,
  FieldAssetId,
  GroundTileId,
} from '../../../lib/field-assets.generated';

export type Team = 'blue' | 'red';
export type Faction = 'red' | 'green';
export type FieldId =
  | 'kampung'
  | 'pasar'
  | 'taman'
  | 'kanal'
  | 'kanal2'
  | 'kampung3d'
  | `studio-${string}`;
export type DifficultyId = 'easy' | 'normal' | 'hard';
export type Obstacle = {
  x: number;
  y: number;
  w: number;
  h: number;
  asset: FieldAssetId;
  visualW: number;
  visualH: number;
  flip?: boolean;
  hidden?: boolean;
  underlay?: boolean;
};
export type FieldDecoration = {
  asset: FieldAssetId;
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
  opacity?: number;
  underlay?: boolean;
};
export type AnimatedDecoration = {
  animation: FieldAnimatedId;
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
  opacity?: number;
};
export type FieldPath = {
  tile: GroundTileId;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  radius: number;
};
export type Prison = {
  x: number;
  y: number;
  w: number;
  h: number;
  floorAsset?: FieldAssetId;
  overlayAsset?: FieldAssetId;
  flip?: boolean;
};
export type FieldConfig = {
  id: FieldId;
  name: string;
  kicker: string;
  difficulty: DifficultyId;
  aiIntensity: number;
  ground: GroundTileId;
  background?: string;

  designWidth?: number;
  designHeight?: number;
  width?: number;
  height?: number;
  objectScale?: number;
  structuresInBackground?: boolean;
  // Some authored maps already include their forts but still need the
  // gameplay prison buildings rendered above the terrain.
  basesInBackground?: boolean;
  waterMask?: string;
  waterMaskWidth?: number;
  waterMaskHeight?: number;



  baseRadius?: number;
  bases?: Record<Team, { x: number; y: number }>;
  prisons: Record<Team, Prison>;
  paths: FieldPath[];
  obstacles: Obstacle[];
  decorations: FieldDecoration[];
  animated: AnimatedDecoration[];
};
