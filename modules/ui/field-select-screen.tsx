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
      <span>LANGKAH TERAKHIR</span>
      <h1 id="field-title">Pilih arena pertarungan</h1>
      <p>
        Setiap arena punya kepadatan jalur berbeda. Rotasi otomatis
        terjadi setelah tiga kemenangan.
      </p>
    </header>
    <div className="arena-carousel">
      <button
        className="arena-nav previous"
        aria-label="Arena sebelumnya"
        onClick={() => onStep(-1)}
      >
        ‹
      </button>
      <div className="field-card-row" aria-label="Pilihan arena">
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
            <small>0{index + 1}</small>
            <em>{field.difficulty}</em>
            <strong>{field.name}</strong>
            <span>{field.kicker}</span>
            <i>
              {selectedFieldId === field.id ? 'ARENA AKTIF' : 'PILIH ARENA'}
            </i>
          </button>
        ))}
      </div>
      <button
        className="arena-nav next"
        aria-label="Arena berikutnya"
        onClick={() => onStep(1)}
      >
        ›
      </button>
    </div>
    <div className="match-lineup">
      <div>
        {squad.map((id, index) => (
          <figure key={id} className={index === 0 ? 'controlled' : ''}>
            <CharacterPreview
              id={id}
              alt={CHARACTER_BY_ID[id].name}
              eager={index === 0}
            />
            <figcaption>
              {index === 0 ? 'KAMU' : CHARACTER_BY_ID[id].name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
    <button className={`graffiti-primary launch-${faction}`} onClick={onStart}>
      <span>
        <Play size={19} fill="currentColor" /> MULAI MATCH
      </span>
    </button>
  </section>
);
