import type { Team } from '../world/map-data/field-types';
import type { PlayerState } from '../game-core/match-types';
import type { Obstacle, Prison } from '../world/map-data/field-types';

// Minimal player facet for prison layout. Only these fields cross the seam.
type PrisonerFacet = {
  team: Team;
  state: PlayerState;
  prisonOwner?: Team;
  prisonIndex: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
};

// Deterministic in-place layout of held prisoners inside their owner's
// prison. Mutates exactly: prisonIndex, x, y, lastX, lastY. Reads only the
// given prisons geometry, each player's team/state/owner, and the kanal
// layout variant. No audio, stats, mission, events, or UI.
export const layoutPrisons = (
  prisons: Record<Team, Prison>,
  players: PrisonerFacet[],
  kanal: boolean,
): void => {
  (['blue', 'red'] as Team[]).forEach((owner) => {
    const prison = prisons[owner];
    players
      .filter((p) => p.state === 'PRISONER' && p.prisonOwner === owner)
      .forEach((p, i) => {
        p.prisonIndex = i;
        if (kanal) {
          const column = i % 3;
          const row = Math.floor(i / 3);
          const leftToRight = prison.x + 34 + column * ((prison.w - 68) / 2);
          p.x =
            owner === 'blue'
              ? leftToRight
              : prison.x + prison.w - (leftToRight - prison.x);
          p.y = prison.y + 76 + row * 30;
          p.lastX = p.x;
          p.lastY = p.y;
          return;
        }
        p.x =
          owner === 'blue'
            ? prison.x + 62 + i * 31
            : prison.x + prison.w - 62 - i * 31;
        p.y =
          owner === 'blue' ? prison.y + 116 + i * 6 : prison.y + 82 - i * 6;
        p.lastX = p.x;
        p.lastY = p.y;
      });
  });
};

// Kanal's prison uses a thin U-frame: walls block traversal, while the
// wide front gate and entire interior remain open for rescues. No other
// arena receives these additional collision rules. Pure geometry.
export const kanalPrisonWalls = (
  prisons: Record<Team, Prison>,
  kanal: boolean,
): Obstacle[] =>
  kanal
    ? Object.values(prisons).flatMap((prison): Obstacle[] => {
        const thickness = Math.max(12, Math.round(Math.min(prison.w, prison.h) * 0.09));
        const gateWidth = Math.max(76, Math.round(prison.w * 0.48));
        const shoulderWidth = Math.round((prison.w - gateWidth) / 2);
        const hiddenWall = (x: number, y: number, w: number, h: number): Obstacle => ({
          asset: prison.floorAsset ?? 'prisonFloor',
          x,
          y,
          w,
          h,
          visualW: 1,
          visualH: 1,
          hidden: true,
        });
        return [
          hiddenWall(prison.x, prison.y, prison.w, thickness),
          hiddenWall(prison.x, prison.y + thickness, thickness, prison.h - thickness),
          hiddenWall(prison.x + prison.w - thickness, prison.y + thickness, thickness, prison.h - thickness),
          hiddenWall(prison.x, prison.y + prison.h - thickness, shoulderWidth, thickness),
          hiddenWall(prison.x + prison.w - shoulderWidth, prison.y + prison.h - thickness, shoulderWidth, thickness),
        ];
      })
    : [];
