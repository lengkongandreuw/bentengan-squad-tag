import type { FieldAssetId } from '../../lib/field-assets.generated';
import type { Prison, Team } from '../world/map-data/field-types';

const BASE_LABELS = { blue: 'BENTENG MERAH', red: 'BENTENG HIJAU' } as const;

// Fort ring, label, and lock indicator. Renders only the data it receives:
// geometry, team display color, and the precomputed occupant name (if any).
// Prison overlays live here too: same layer, same asset helper, same owner.
export const drawBase = (
  target: CanvasRenderingContext2D,
  base: { x: number; y: number },
  baseRadius: number,
  kanal: boolean,
  team: Team,
  color: string,
  occupantName?: string,
): void => {
  const occupant = occupantName !== undefined;
  target.strokeStyle = occupant ? '#f5cf45' : color;
  target.lineWidth = occupant ? 7 : 4;
  target.setLineDash(occupant ? [3, 5] : [8, 7]);
  target.beginPath();
  target.arc(base.x, base.y, baseRadius, 0, Math.PI * 2);
  target.stroke();
  target.setLineDash([]);
  const baseLabelY = kanal ? base.y + baseRadius + 16 : base.y + 130;
  target.fillStyle = '#fff3d0';
  target.font = '800 10px Arial';
  target.textAlign = 'center';
  target.fillText(
    BASE_LABELS[team],
    base.x,
    baseLabelY,
  );
  if (occupant) {
    target.fillStyle = '#f5cf45';
    target.font = '900 9px Arial';
    target.fillText(`TERKUNCI · ${occupantName}`, base.x, baseLabelY + 14);
  }
};

export type PrisonAssets = Record<Team, Prison>;

// Prison overlay sprites for both teams. Skipped when the field bakes
// structures into the background. The asset painter stays the caller's.
export const drawPrisonOverlays = (
  target: CanvasRenderingContext2D,
  prisons: PrisonAssets,
  paintAsset: (
    target: CanvasRenderingContext2D,
    asset: FieldAssetId,
    x: number,
    y: number,
    w: number,
    h: number,
    flip: boolean,
    opacity: number,
  ) => void,
  backgroundBaked?: boolean,
): void => {
  if (backgroundBaked) return;
  (['blue', 'red'] as Team[]).forEach((team) => {
    const prison = prisons[team];
    paintAsset(
      target,
      prison.overlayAsset ?? 'prisonOverlay',
      prison.x,
      prison.y,
      prison.w,
      prison.h,
      prison.flip ?? team === 'red',
      0.98,
    );
  });
};

// Pulsing rescue-request ring with a '!' marker over the requesting prisoner.
// Skips silently when there is no request or the requester is not a prisoner.
export const drawRescueBubble = (
  target: CanvasRenderingContext2D,
  players: Array<{ id: string; x: number; y: number; state: string }>,
  requesterId: string | undefined,
  now: number,
): void => {
  const rescueRequester = requesterId
    ? players.find((player) => player.id === requesterId)
    : undefined;
  if (rescueRequester?.state === 'PRISONER') {
    const pulse = 18 + Math.sin(now / 120) * 4;
    target.save();
    target.strokeStyle = '#f5cf45';
    target.fillStyle = '#15180f';
    target.lineWidth = 3;
    target.beginPath();
    target.arc(rescueRequester.x, rescueRequester.y - 42, pulse, 0, Math.PI * 2);
    target.fill();
    target.stroke();
    target.fillStyle = '#fff5be';
    target.font = '900 20px Arial';
    target.textAlign = 'center';
    target.fillText('!', rescueRequester.x, rescueRequester.y - 35);
    target.restore();
  }
};

// Full-frame dim with the phase announcement (countdown / round-over / match-over).
// No-op while PLAYING.
export const drawPhaseOverlay = (
  target: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  phase: string,
  announcement: string,
): void => {
  if (phase !== 'PLAYING') {
    target.fillStyle = 'rgba(12,17,13,.52)';
    target.fillRect(0, 0, cw, ch);
    target.fillStyle = '#fff4d1';
    target.font = `800 ${phase === 'COUNTDOWN' ? 90 : 54}px var(--font-heading)`;
    target.textAlign = 'center';
    target.fillText(announcement, cw / 2, ch / 2);
  }
};

// Mouse-route destination ring. Scales the stroke against the camera zoom.
export const drawRouteTarget = (
  target: CanvasRenderingContext2D,
  route: Array<{ x: number; y: number }>,
  scale: number,
): void => {
  if (route.length) {
    const point = route[route.length - 1];
    target.strokeStyle = '#caff73';
    target.lineWidth = 2 / scale;
    target.beginPath();
    target.arc(point.x, point.y, 9, 0, Math.PI * 2);
    target.stroke();
  }
};
