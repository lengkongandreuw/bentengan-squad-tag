import type { Team } from '../world/map-data/field-types';

const BASE_LABELS = { blue: 'BENTENG MERAH', red: 'BENTENG HIJAU' } as const;

// Fort ring, label, and lock indicator. Renders only the data it receives:
// geometry, team display color, and the precomputed occupant name (if any).
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
