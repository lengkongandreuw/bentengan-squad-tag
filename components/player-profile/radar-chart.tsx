'use client';
import { t } from '../../lib/language';


import { memo } from 'react';

type PlayerRadarChartProps = {
  attack: number;
  support: number;
  survival: number;
  hasMatchData: boolean;
};

const center = { x: 137.5, y: 183 };
const axes = {
  attack: { x: 137.5, y: 86 },
  support: { x: 219, y: 232 },
  survival: { x: 56, y: 232 },
};

function radarPoint(axis: keyof typeof axes, value: number) {
  const amount = Math.max(0, Math.min(100, value)) / 100;
  const end = axes[axis];
  return `${center.x + (end.x - center.x) * amount},${center.y + (end.y - center.y) * amount}`;
}

function triangle(level: number) {
  return [
    radarPoint('attack', level),
    radarPoint('support', level),
    radarPoint('survival', level),
  ].join(' ');
}

export const PlayerRadarChart = memo(function PlayerRadarChart({
  attack,
  support,
  survival,
  hasMatchData,
}: PlayerRadarChartProps) {
  const values = [
    radarPoint('attack', attack),
    radarPoint('support', support),
    radarPoint('survival', survival),
  ].join(' ');

  return (
    <svg
      className="player-radar-chart"
      viewBox="0 0 275 265"
      role="img"
      aria-label={t(hasMatchData
        ? `Gaya main: Serang ${Math.round(attack)}, Bantu ${Math.round(support)}, Bertahan ${Math.round(survival)}`
        : 'Selesaikan satu pertandingan untuk melihat gaya mainmu.')}
    >
      <text className="radar-axis-label" x="137.5" y="56" textAnchor="middle">{t("SERANG")}</text>
      <g className="radar-grid">
        {t([20, 40, 60, 80, 100].map((level) => (
          <polygon key={level} points={triangle(level)} />
        )))}
      </g>
      {t(hasMatchData && <polygon className="radar-value" points={values} />)}
      <text className="radar-axis-label" x="56" y="258" textAnchor="middle">{t("BERTAHAN")}</text>
      <text className="radar-axis-label" x="219" y="258" textAnchor="middle">{t("BANTU")}</text>
    </svg>
  );
});
