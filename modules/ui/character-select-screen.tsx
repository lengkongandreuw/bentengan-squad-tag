import {
  ULTIMATE_CHARACTER_IDS,
  ultimateIcon,
  type CharacterDefinition,
  type CharacterId,
} from '../../lib/characters.ts';
import type { Faction } from '../world/map-data/field-types';
import { factionName } from '../world/team-tables.ts';
import { SelectionPortrait } from './selection-portrait.tsx';
import { statPercent } from './format.ts';

// Character select screen: roster video, team swap, carousel grid, ability
// panel, and the select button. Hover/cycle/voice wiring arrives as
// callbacks; the owner keeps faction and selection state.
export const CharacterSelectScreen = ({
  faction,
  videoSrc,
  characters,
  selectedId,
  selected,
  resolveAsset,
  onCycle,
  onHighlight,
  onSwapTeam,
  onSelect,
}: {
  faction: Faction;
  videoSrc: string;
  characters: CharacterDefinition[];
  selectedId: CharacterId;
  selected: CharacterDefinition;
  resolveAsset: (file: string) => string;
  onCycle: (direction: -1 | 1) => void;
  onHighlight: (id: CharacterId) => void;
  onSwapTeam: () => void;
  onSelect: () => void;
}) => (
  <section
    className={`roster-screen faction-${faction}`}
    aria-labelledby="roster-title"
  >
    <video
      className="roster-video"
      src={videoSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
    <header className="roster-branding">
      <img
        className="roster-team-main"
        src={resolveAsset(`controls/team-${faction}-active.webp`)}
        alt={factionName(faction)}
      />
      <button
        className="roster-team-swap"
        onClick={onSwapTeam}
        aria-label="Ganti tim"
      >
        <img
          src={resolveAsset(
            `controls/team-${faction === 'red' ? 'green' : 'red'}-normal.webp`,
          )}
          alt={factionName(faction === 'red' ? 'green' : 'red')}
        />
      </button>
    </header>
    <h1 id="roster-title" className="sr-only">
      Pilih karakter {factionName(faction)}
    </h1>
    <div className="roster-stage">
      <button
        className="carousel-arrow left"
        onClick={() => onCycle(-1)}
        aria-label="Karakter sebelumnya"
      >
        ‹
      </button>
      <div className="character-carousel">
        {characters.map((character, index) => (
          <button
            key={character.id}
            className={`carousel-character ${selectedId === character.id ? 'selected' : ''}`}
            style={
              {
                '--offset':
                  index -
                  characters.findIndex(
                    (item) => item.id === selectedId,
                  ),
              } as React.CSSProperties
            }
            onFocus={() => onHighlight(character.id)}
            onClick={() => onHighlight(character.id)}
            aria-pressed={selectedId === character.id}
          >
            <SelectionPortrait
              id={character.id}
              alt={character.name}
              active={selectedId === character.id}
            />
            {ULTIMATE_CHARACTER_IDS.has(character.id) && (
              <strong className="ultimate-roster-badge">
                {ultimateIcon(character.ultimate?.icon ?? 'zap', 12)}
                ULTIMATE
              </strong>
            )}
            <span>{character.name}</span>
          </button>
        ))}
      </div>
      <button
        className="carousel-arrow right"
        onClick={() => onCycle(1)}
        aria-label="Karakter berikutnya"
      >
        ›
      </button>
    </div>
    <aside className={`ability-panel framed-character-panel ${faction}`}>
      <img
        className="character-panel-frame"
        src={resolveAsset(`panels/character-panel-${faction}.png`)}
        alt=""
        aria-hidden="true"
      />
      <header className="character-panel-identity">
        <span className="character-panel-role">
          {factionName(faction)} · {selected.role}
        </span>
        <h2 className="character-panel-name">{selected.name}</h2>
        <p className="character-panel-summary">{selected.copy}</p>
      </header>
      <section className="character-panel-skill">
        <small>KEMAMPUAN KHUSUS</small>
        <b>{selected.passiveName}</b>
        <p>{selected.passiveCopy}</p>
      </section>
      <dl className="character-panel-stats">
        <div className="character-panel-stat">
          <dt className="character-panel-stat-label">
            Speed <b>{selected.speed}</b>
          </dt>
          <dd className="character-panel-stat-track">
            <i style={{ width: statPercent(selected.speed, 188, 240) }} />
          </dd>
        </div>
        <div className="character-panel-stat">
          <dt className="character-panel-stat-label">
            Boost <b>{selected.boost}</b>
          </dt>
          <dd className="character-panel-stat-track">
            <i style={{ width: statPercent(selected.boost, 84, 128) }} />
          </dd>
        </div>
        <div className="character-panel-stat">
          <dt className="character-panel-stat-label">
            Agility <b>{selected.agility.toFixed(2)}</b>
          </dt>
          <dd className="character-panel-stat-track">
            <i
              style={{
                width: statPercent(selected.agility, 0.82, 1.25),
              }}
            />
          </dd>
        </div>
      </dl>
      <button
        className="graffiti-primary character-panel-select"
        onClick={onSelect}
      >
        <span>PILIH {selected.name}</span>
      </button>
    </aside>
  </section>
);
