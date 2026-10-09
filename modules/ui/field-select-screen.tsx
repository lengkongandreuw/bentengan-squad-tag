import { t } from '../../lib/language';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import type { Faction, FieldConfig, FieldId } from '../world/map-data/field-types';
import { Play } from 'lucide-react';
import { CharacterPreview } from './character-preview.tsx';

// Final pre-match screen: arena carousel, squad strip, and the start
// button. Pure presentation; selection, carousel stepping, and the start
// action are injected.
export const FieldSelectScreen = ({
  faction,
  selectedFieldId,
  fields,
  squad,
  resolveAsset,
  onSelect,
  onStep,
  onStart,
}: {
  faction: Faction;
  selectedFieldId: FieldId;
  fields: FieldConfig[];
  squad: CharacterId[];
  resolveAsset: (file: string) => string;
  onSelect: (id: FieldId) => void;
  onStep: (direction: -1 | 1) => void;
  onStart: () => void;
}) => (
  <section
    className={`field-select-screen faction-${faction}`}
    aria-labelledby="field-title"
  >
    <header>
      <span>{t("LANGKAH TERAKHIR")}</span>
      <h1 id="field-title">{t("Pilih arena pertarungan")}</h1>
      <p>
        {t("Setiap arena punya kepadatan jalur berbeda. Rotasi otomatis terjadi setelah tiga kemenangan.")}
      </p>
    </header>
    <div className="arena-carousel">
      <button
        className="arena-nav previous"
        aria-label={t("Arena sebelumnya")}
        onClick={() => onStep(-1)}
      >
        {t("‹")}
      </button>
      <div className="field-card-row" aria-label={t("Pilihan arena")}>
        {fields.map((field, index) => (
          <button
            key={field.id}
            className={`field-card field-${field.id} difficulty-${field.difficulty} ${selectedFieldId === field.id ? 'selected' : ''}`}
            onClick={() => onSelect(field.id)}
            aria-pressed={selectedFieldId === field.id}
            style={{ '--arena-offset': ((index - fields.findIndex(item => item.id === selectedFieldId) + fields.length + 1) % fields.length) - 1 } as React.CSSProperties}
          >
            <img
              className="field-card-preview"
              src={resolveAsset(`fields/${field.id}.webp`)}
              alt=""
              aria-hidden="true"
            />
            <small>{t("0")}{t(index + 1)}</small>
            <em>{t(field.difficulty)}</em>
            <strong>{t(field.name)}</strong>
            <span>{t(field.kicker)}</span>
            <i>
              {t(selectedFieldId === field.id ? 'ARENA AKTIF' : 'PILIH ARENA')}
            </i>
          </button>
        ))}
      </div>
      <button
        className="arena-nav next"
        aria-label={t("Arena berikutnya")}
        onClick={() => onStep(1)}
      >
        {t("›")}
      </button>
    </div>
    <div className="match-lineup">
      <div>
        {squad.map((id, index) => (
          <figure key={id} className={index === 0 ? 'controlled' : ''}>
            <CharacterPreview
              id={id}
              alt={t(CHARACTER_BY_ID[id].name)}
              eager={index === 0}
            />
            <figcaption>
              {t(index === 0 ? 'KAMU' : CHARACTER_BY_ID[id].name)}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
    <button className={`graffiti-primary launch-${faction}`} onClick={onStart}>
      <span>
        <Play size={19} fill="currentColor" />{t(" MULAI MATCH")}
      </span>
    </button>
  </section>
);
