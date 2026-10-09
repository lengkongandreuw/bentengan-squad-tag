import { t } from '../../lib/language';
import { ultimateIcon, type CharacterId, type UltimateIconId } from '../../lib/characters.ts';
import { CharacterPreview } from './character-preview.tsx';
import type { Faction } from '../world/map-data/field-types';

// Controlled-player card with ultimate charge sub-panel. Faction label and
// prisoner styling arrive precomputed; the ultimate-owner guard stays owner
// (ULTIMATE_CHARACTER_IDS membership implies a descriptor — same data source).
export const CharacterHud = ({
  characterId,
  playerName,
  faction,
  factionLabel,
  passiveName,
  state,
  meter,
  ultimate,
}: {
  characterId: CharacterId;
  playerName: string;
  faction: Faction | null;
  factionLabel: string;
  passiveName: string;
  state: string;
  meter: number;
  ultimate?: {
    icon: UltimateIconId;
    hudClass?: string;
    shortLabel?: string;
  };
}) => (
  <div
    className={`character-hud ${faction} ${state === 'PRISONER' ? 'prisoner' : ''}`}
  >
    <CharacterPreview id={characterId} eager />
    <span>
      <b>{t(playerName)}</b>
      <small>
        {t(factionLabel)}{t(" ·")}{t(' ')}
        {t(passiveName)}
      </small>
      <em>{t(state.replace('_', ' '))}</em>
    </span>
    {ultimate && (
      <div
        className={`character-ultimate ${ultimate.hudClass ?? ''} ${meter >= 100 ? 'ready' : ''}`}
        aria-label={t(`Charge ultimate ${Math.floor(meter)} persen`)}
      >
        <span>
          {ultimateIcon(ultimate.icon, 12)}
          {t(ultimate.shortLabel ?? 'TITAH')}
        </span>
        <b>{Math.floor(meter)}%</b>
        <i>
          <u style={{ width: `${meter}%` }} />
        </i>
      </div>
    )}
  </div>
);
