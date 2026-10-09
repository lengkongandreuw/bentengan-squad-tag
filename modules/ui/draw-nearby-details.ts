import type { FieldConfig, Team } from '../world/map-data/field-types';
import type { MapObject, StudioMap } from '../../lib/map-studio-model.js';
import type { FieldAssetDraw } from './field-assets.ts';

const NEAR_FIELD_DETAIL_RADIUS = 560;

// Near-camera prop layer: studio backgrounds first, then (in play mode)
// decorations, obstacles, forts, and prisons inside the detail radius.
// Overview and kanal draw everything at native resolution. Verbatim.
export type DrawNearbyWorld = {
  ctx: CanvasRenderingContext2D;
  field: FieldConfig;
  studioMap: StudioMap | null;
  drawMapObject: (
    ctx: CanvasRenderingContext2D,
    object: MapObject,
    now: number,
  ) => void;
  isPlaying: () => boolean;
  kanal: boolean;
  bases: Record<Team, { x: number; y: number }>;
  fortWidth: number;
  fortHeight: number;
  fortAnchorY: number;
  drawFieldAsset: FieldAssetDraw['drawFieldAsset'];
};

export const createDrawNearbyFieldDetails = (
  world: DrawNearbyWorld,
): ((me: { x: number; y: number }, activeCamera: string) => void) => {
  const ctx = world.ctx;
  const field = world.field;
  const visualObstacles = field.obstacles;
  return (me: { x: number; y: number }, activeCamera: string): void => {
    if (world.studioMap) {
      world.studioMap.objects
        .filter((o) => o.layer === 'background')
        .sort((a, b) => a.z - b.z)
        .forEach((o) => world.drawMapObject(ctx, o, performance.now()));
    }
    if (!world.isPlaying() && !world.kanal) return;
    // Kanal has few props, so draw every one at native atlas resolution in
    // both cameras. This also prevents props vanishing at the view edge.
    const showEverything = activeCamera === 'overview' || world.kanal;
    const radiusSquared = NEAR_FIELD_DETAIL_RADIUS * NEAR_FIELD_DETAIL_RADIUS;
    const isNearby = (x: number, y: number, w: number, h: number) => {
      if (showEverything) return true;
      const dx = x + w / 2 - me.x,
        dy = y + h / 2 - me.y;
      return dx * dx + dy * dy <= radiusSquared;
    };
    field.decorations.forEach((item) => {
      if (
        !item.underlay &&
        (world.kanal || !showEverything) &&
        isNearby(item.x, item.y, item.w, item.h)
      )
        world.drawFieldAsset(
          ctx,
          item.asset,
          item.x,
          item.y,
          item.w,
          item.h,
          item.flip,
          item.opacity,
        );
    });
    visualObstacles.forEach((item) => {
      if (
        (!world.kanal && showEverything) ||
        item.hidden ||
        item.underlay ||
        !isNearby(item.x, item.y, item.w, item.h)
      )
        return;
      world.drawFieldAsset(
        ctx,
        item.asset,
        item.x + item.w / 2 - item.visualW / 2,
        item.y + item.h - item.visualH,
        item.visualW,
        item.visualH,
        item.flip,
      );
    });
    (['blue', 'red'] as Team[]).forEach((team) => {
      const base = world.bases[team];
      if (
        !field.structuresInBackground &&
        !field.basesInBackground &&
        isNearby(
          base.x - world.fortWidth / 2,
          base.y - world.fortAnchorY,
          world.fortWidth,
          world.fortHeight,
        )
      )
        world.drawFieldAsset(
          ctx,
          team === 'blue' ? 'fortRed' : 'fortGreen',
          base.x - world.fortWidth / 2,
          base.y - world.fortAnchorY,
          world.fortWidth,
          world.fortHeight,
          false,
          0.96,
        );
      const prison = field.prisons[team];
      if (
        !field.structuresInBackground &&
        isNearby(prison.x, prison.y, prison.w, prison.h)
      )
        world.drawFieldAsset(
          ctx,
          prison.floorAsset ?? 'prisonFloor',
          prison.x,
          prison.y,
          prison.w,
          prison.h,
          prison.flip ?? team === 'red',
          0.96,
        );
    });
  };
};
