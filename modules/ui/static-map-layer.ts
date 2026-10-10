import type { FieldConfig, Obstacle, Team } from '../world/map-data/field-types';
import type { StudioMap } from '../../lib/map-studio-model.js';
import type { GroundTileId, FieldAssetId } from '../../lib/field-assets.generated.ts';
import { BASE_RADIUS, worldX, worldY } from '../world/map-data/scalars.ts';
import { TEAM_COLOR } from '../world/team-tables.ts';
import { roundedOn } from './canvas-shapes.ts';
import type { FieldAssetDraw } from './field-assets.ts';
import { tamanGroundFinish, drawTamanPrisonGrounding, drawTamanContactShadows } from '../../lib/taman-visuals.js';
import { drawPasar2ShoreDepth, drawPasar2ContactShadows } from '../../lib/pasar2-visuals.js';

const STATIC_MAP_SCALE = 0.5;

// The live map draw for one field: studio maps paint their terrain per
// frame; authored maps bake scenery into a scaled static layer (redrawn
// only when invalidated by asset loads) and blit it each frame.
export type StaticMapLayerWorld = {
  // Live getter: `ctx` is a reassignable binding in the composition root.
  getContext: () => CanvasRenderingContext2D;
  field: FieldConfig;
  fieldBackground: HTMLImageElement | null;
  studioMap: StudioMap | null;
  kanal: boolean;
  worldWidth: number;
  worldHeight: number;
  bases: Record<Team, { x: number; y: number }>;
  fortWidth: number;
  fortHeight: number;
  fortAnchorY: number;
  groundTile: (tile: GroundTileId) => HTMLCanvasElement;
  drawFieldAsset: FieldAssetDraw['drawFieldAsset'];
  drawMapTerrain: (
    ctx: CanvasRenderingContext2D,
    map: StudioMap,
    now: number,
  ) => void;
};

export type StaticMapLayer = {
  layer: HTMLCanvasElement;
  invalidate: () => void;
  drawMap: () => void;
};

export const createStaticMapLayer = (
  input: StaticMapLayerWorld,
): StaticMapLayer => {
  const field = input.field;
  const fieldBackground = input.fieldBackground;
  const studioMap = input.studioMap;
  const kanal = input.kanal;
  const worldWidth = input.worldWidth;
  const worldHeight = input.worldHeight;
  const bases = input.bases;
  const fortWidth = input.fortWidth;
  const fortHeight = input.fortHeight;
  const fortAnchorY = input.fortAnchorY;
  const groundTileCanvas = input.groundTile;
  const drawFieldAsset = input.drawFieldAsset;

  // Raised authored scenery needs a full-resolution cache; otherwise the
  // close camera resamples it twice and makes fences/foliage look flat.
  const staticMapScale = kanal
    ? 1.5
    : field.structuresInBackground
      ? 0.75
      : STATIC_MAP_SCALE;
  const staticLayer = document.createElement('canvas');
  staticLayer.width = Math.round(worldWidth * staticMapScale);
  staticLayer.height = Math.round(worldHeight * staticMapScale);
  const staticLayerContext = staticLayer.getContext('2d');
  let staticMapDirty = true;
  const invalidate = (): void => {
    staticMapDirty = true;
  };

  const drawStaticMap = (target: CanvasRenderingContext2D) => {
    target.clearRect(0, 0, worldWidth, worldHeight);
    target.imageSmoothingEnabled = true;
    target.imageSmoothingQuality = 'high';
    if (
      fieldBackground?.complete &&
      fieldBackground.naturalWidth &&
      fieldBackground.naturalHeight
    ) {
      target.drawImage(field.id === 'taman' ? tamanGroundFinish(fieldBackground, worldWidth, worldHeight) : fieldBackground, 0, 0, worldWidth, worldHeight);
    } else {
      const primaryPattern = target.createPattern(
        groundTileCanvas(field.ground),
        'repeat',
      );
      target.fillStyle = primaryPattern ?? '#7f815a';
      target.fillRect(0, 0, worldWidth, worldHeight);
    }
    target.fillStyle = kanal
      ? 'rgba(19,27,21,.03)'
      : 'rgba(19,27,21,.08)';
    target.fillRect(0, 0, worldWidth, worldHeight);
    // The authored reference already contains its finished plaza. Extra
    // runtime guide rectangles make the ground look boxed-in at close range.
    if (kanal && field.paths.length > 0) {
      // The cleared centre planters become quiet, walkable mini-plazas.
      // This is terrain detail only: it deliberately adds no obstruction.
      const scaleX = worldWidth / (field.designWidth ?? worldWidth);
      const scaleY = worldHeight / (field.designHeight ?? worldHeight);
      const plazaZones = [
        { x: 568, y: 378, w: 202, h: 76 },
        { x: 930, y: 378, w: 202, h: 76 },
      ];
      target.save();
      plazaZones.forEach((zone) => {
        const x = Math.round(zone.x * scaleX);
        const y = Math.round(zone.y * scaleY);
        const w = Math.round(zone.w * scaleX);
        const h = Math.round(zone.h * scaleY);
        const radius = Math.max(12, Math.min(w, h) * 0.22);
        target.fillStyle = 'rgba(91, 73, 44, .14)';
        roundedOn(target, x, y, w, h, radius);
        target.fill();
        target.strokeStyle = 'rgba(53, 43, 30, .16)';
        target.lineWidth = 1;
        roundedOn(target, x, y, w, h, radius);
        target.stroke();

        // A few low-contrast stones make the grass-to-plaza transition feel
        // grounded without drawing a rigid grid or a visible white box.
        const pebbles = [
          [0.2, 0.3, 3],
          [0.53, 0.68, 2],
          [0.82, 0.38, 3],
          [0.38, 0.47, 2],
        ];
        target.fillStyle = 'rgba(54, 44, 30, .17)';
        pebbles.forEach(([px, py, size]) => {
          target.beginPath();
          target.ellipse(
            x + w * px,
            y + h * py,
            size * scaleX,
            size * 0.65 * scaleY,
            -0.25,
            0,
            Math.PI * 2,
          );
          target.fill();
        });
      });
      target.restore();
    }

    field.paths.forEach((pathConfig) => {
      const pattern = target.createPattern(
        groundTileCanvas(pathConfig.tile),
        'repeat',
      );
      target.save();
      target.globalAlpha = pathConfig.opacity;
      roundedOn(
        target,
        pathConfig.x,
        pathConfig.y,
        pathConfig.w,
        pathConfig.h,
        pathConfig.radius,
      );
      target.clip();
      target.fillStyle = pattern ?? '#88877a';
      target.fillRect(pathConfig.x, pathConfig.y, pathConfig.w, pathConfig.h);
      target.restore();
      target.strokeStyle = 'rgba(255,245,211,.18)';
      target.lineWidth = 3;
      roundedOn(
        target,
        pathConfig.x,
        pathConfig.y,
        pathConfig.w,
        pathConfig.h,
        pathConfig.radius,
      );
      target.stroke();
    });
    if (!kanal && field.id !== 'taman') {
      target.strokeStyle = 'rgba(255,255,255,.13)';
      target.lineWidth = 2;
      target.setLineDash([16, 18]);
      [worldY(296), worldY(506)].forEach((y) => {
        target.beginPath();
        target.moveTo(worldX(238), y);
        target.lineTo(worldWidth - worldX(238), y);
        target.stroke();
      });
      target.setLineDash([]);
    }

    const visualObstacles: Obstacle[] = field.obstacles;
    if (field.id === 'pasar') {
      drawPasar2ShoreDepth(target);
      drawPasar2ContactShadows(target, visualObstacles);
    }
    if (field.id === 'taman') {
      drawTamanPrisonGrounding(target, field.prisons);
      drawTamanContactShadows(target, visualObstacles);
    }
    const drawSceneryLayer = (underlay: boolean) => {
      // Kanal's raised props are drawn at native atlas resolution on the
      // live canvas below. Baking them into the scaled ground and drawing
      // them again at close range caused soft/doubled silhouettes.
      if ((kanal || field.id === 'pasar' || field.id === 'taman') && !underlay) return;
      const scenery = [
        ...field.decorations
          .filter((item) => Boolean(item.underlay) === underlay)
          .map((item) => ({
            baseline: item.y + item.h,
            draw: () =>
              drawFieldAsset(
                target,
                item.asset,
                item.x,
                item.y,
                item.w,
                item.h,
                item.flip,
                item.opacity,
              ),
          })),
        ...visualObstacles
          .filter(
            (item) =>
              !item.hidden && Boolean(item.underlay) === underlay,
          )
          .map((item) => ({
            baseline: item.y + item.h,
            draw: () =>
              drawFieldAsset(
                target,
                item.asset,
                item.x + item.w / 2 - item.visualW / 2,
                item.y + item.h - item.visualH,
                item.visualW,
                item.visualH,
                item.flip,
              ),
          })),
      ].sort((a, b) => a.baseline - b.baseline);
      scenery.forEach((item) => item.draw());
    };

    // Border and perimeter art belongs below gameplay-critical structures.
    drawSceneryLayer(true);

    if (!kanal)
      (['blue', 'red'] as Team[]).forEach((team) => {
        const b = bases[team],
          color = TEAM_COLOR[team];
        target.fillStyle = `${color}20`;
        target.beginPath();
        target.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2);
        target.fill();
        target.strokeStyle = `${color}68`;
        target.lineWidth = 3;
        target.beginPath();
        target.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2);
        target.stroke();
        const fortAsset: FieldAssetId =
          team === 'blue' ? 'fortRed' : 'fortGreen';
        if (!field.structuresInBackground && !field.basesInBackground)
          drawFieldAsset(
            target,
            fortAsset,
            b.x - fortWidth / 2,
            b.y - fortAnchorY,
            fortWidth,
            fortHeight,
            false,
            0.96,
          );
      });

    if (!field.structuresInBackground && !kanal)
      (['blue', 'red'] as Team[]).forEach((team) => {
        const prison = field.prisons[team];
        drawFieldAsset(
          target,
          prison.floorAsset ?? 'prisonFloor',
          prison.x,
          prison.y,
          prison.w,
          prison.h,
          prison.flip ?? team === 'red',
          0.96,
        );
      });

    drawSceneryLayer(false);

    if (!field.background) {
      target.fillStyle = 'rgba(20,31,23,.94)';
      target.fillRect(0, 32, worldWidth, 34);
      target.fillRect(0, worldHeight - 32, worldWidth, 32);
      target.strokeStyle = 'rgba(255,241,205,.24)';
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(0, 66);
      target.lineTo(worldWidth, 66);
      target.stroke();
      target.font = '800 15px var(--font-heading)';
      target.fillStyle = '#fff0cf';
      target.textAlign = 'center';
      target.fillText(
        `${field.name.toUpperCase()} · ${field.difficulty.toUpperCase()} · ARENA 5v5`,
        worldWidth / 2,
        55,
      );
    }
  };

  const drawMap = () => {
    const ctx = input.getContext();
    if (studioMap) { input.drawMapTerrain(ctx, studioMap, performance.now()); return; }
    if (staticLayerContext && staticMapDirty) {
      staticLayerContext.setTransform(
        staticMapScale,
        0,
        0,
        staticMapScale,
        0,
        0,
      );
      drawStaticMap(staticLayerContext);
      staticMapDirty = false;
    }
    if (staticLayerContext)
      ctx.drawImage(
        staticLayer,
        0,
        0,
        staticLayer.width,
        staticLayer.height,
        0,
        0,
        worldWidth,
        worldHeight,
      );
    else {
      ctx.fillStyle = '#667556';
      ctx.fillRect(0, 0, worldWidth, worldHeight);
    }
  };

  return { layer: staticLayer, invalidate, drawMap };
};
