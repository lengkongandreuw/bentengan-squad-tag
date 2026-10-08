import type {StudioMap,MapObject} from './map-studio-model.js';
import type {FieldAssetId} from './field-assets.generated';
export type ColliderReference = Pick<MapObject,'id'|'name'|'x'|'y'|'w'|'h'|'shape'|'points'|'behavior'|'nativeCollision'>;
export function arenaRulesFor(map?: Pick<StudioMap,'arenaRules'|'replaces'>): 'kanal2'|'standard';
export function prepareArenaMap<T extends StudioMap>(map:T,referenceObjects:ColliderReference[]):T;
export function kanalColliderObjects<T>(obstacles:T[],polygons:(o:T)=>number[][][]):ColliderReference[];
export function kanalPrisonWalls(prisons:Record<string,{x:number;y:number;w:number;h:number;floorAsset?:FieldAssetId}>):
  {asset:FieldAssetId;x:number;y:number;w:number;h:number;visualW:number;visualH:number;hidden:boolean}[];
