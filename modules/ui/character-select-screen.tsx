import { t } from '../../lib/language';
import { roleLabel } from '../../lib/player-copy';
import {
  CHARACTER_BY_ID,
  ULTIMATE_CHARACTER_IDS,
  type CharacterDefinition,
  type CharacterId,
} from '../../lib/characters.ts';
import type { Faction } from '../world/map-data/field-types';
import { factionName } from '../world/team-tables.ts';
import { SelectionPortrait } from './selection-portrait.tsx';
import { statPercent } from './format.ts';
import {UltimateUpgradePanel} from './ultimate-upgrade-panel.tsx';
import type {LocalPlayerProfile} from '../../lib/player-profile/index.ts';
import {CharacterLockBadge} from './character-lock-badge.tsx';
import {getNextCharacterGoal,getCharacterSelectionState} from '../../lib/player-profile/index.ts';

const CharacterNextGoal=({profile}:{profile:LocalPlayerProfile})=>{
  const goal=getNextCharacterGoal(profile);
  return <div className="character-next-goal" aria-label={t('Target unlock berikutnya')}>{t(goal?`Target berikutnya: ${CHARACTER_BY_ID[goal.characterId].name} · Lv.${goal.minLevel} · ${goal.xpRemaining} XP lagi`:'Semua karakter telah terbuka')}</div>;
};

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
  profile,
  onProfileRefresh,
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
  profile?:LocalPlayerProfile|null;
  onProfileRefresh?:()=>void;
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
      onError={event => { event.currentTarget.hidden = true; }}
    />
    <header className="roster-branding">
      <img
        className="roster-team-main"
        src={resolveAsset(`controls/team-${faction}-active.webp`)}
        alt={t(factionName(faction))}
      />
      <button
        className="roster-team-swap"
        onClick={onSwapTeam}
        aria-label={t("Ganti tim")}
      >
        <img
          src={resolveAsset(
            `controls/team-${faction === 'red' ? 'green' : 'red'}-normal.webp`,
          )}
          alt={t(factionName(faction === 'red' ? 'green' : 'red'))}
        />
      </button>
    </header>
    <h1 id="roster-title" className="sr-only">
      {t("Pilih karakter ")}{t(factionName(faction))}
    </h1>
    <div className="roster-stage">
      <button
        className="carousel-arrow left"
        onClick={() => onCycle(-1)}
        aria-label={t("Karakter sebelumnya")}
      >
        {t("‹")}
      </button>
      <div className="character-carousel">
        {characters.map((character, index) => (
          <button
            key={character.id}
            className={`carousel-character ${selectedId === character.id ? 'selected' : ''} ${getCharacterSelectionState(profile,character.id).locked?'locked':''}`}
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
              alt={t(character.name)}
              active={selectedId === character.id}
            />
            <CharacterLockBadge profile={profile??null} id={character.id}/>
            {ULTIMATE_CHARACTER_IDS.has(character.id) && (
              <strong className="ultimate-roster-badge" aria-label={t("Memiliki Ultimate")}>
                <img src={resolveAsset('controls/ultimate-label.png')} alt="" aria-hidden="true" />
              </strong>
            )}
            <span>{t(character.name)}</span>
          </button>
        ))}
      </div>
      <button
        className="carousel-arrow right"
        onClick={() => onCycle(1)}
        aria-label={t("Karakter berikutnya")}
      >
        {t("›")}
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
          {t(factionName(faction))}{t(" · ")}{t(roleLabel[selected.role])}
        </span>
        <h2 className="character-panel-name">{t(selected.name)}</h2>
        <p className="character-panel-summary">{t(selected.copy)}</p>
      </header>
      <section className="character-panel-skill">
        <small>{t("KEMAMPUAN KHUSUS")}</small>
        <b>{t(selected.passiveName)}</b>
        <p>{t(selected.passiveCopy)}</p>
      </section>
      <dl className="character-panel-stats">
        <div className="character-panel-stat">
          <dt className="character-panel-stat-label">
            {t("Kecepatan ")}<b>{selected.speed}</b>
          </dt>
          <dd className="character-panel-stat-track">
            <i style={{ width: statPercent(selected.speed, 188, 240) }} />
          </dd>
        </div>
        <div className="character-panel-stat">
          <dt className="character-panel-stat-label">
            {t("Boost ")}<b>{selected.boost}</b>
          </dt>
          <dd className="character-panel-stat-track">
            <i style={{ width: statPercent(selected.boost, 84, 128) }} />
          </dd>
        </div>
        <div className="character-panel-stat">
          <dt className="character-panel-stat-label">
            {t("Kelincahan ")}<b>{selected.agility.toFixed(2)}</b>
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
        <span>{t("PILIH ")}{t(selected.name)}</span>
      </button>
    </aside>
    {profile&&onProfileRefresh&&<UltimateUpgradePanel key={selectedId} profile={profile} characterId={selectedId} onRefresh={onProfileRefresh}/>}
    <div className="character-mobile-summary"><p>{t(selected.passiveCopy)}</p><b>{t('Kecepatan ')}{selected.speed}{t(' · Boost ')}{selected.boost}{t(' · Kelincahan ')}{selected.agility.toFixed(2)}</b></div>
    {profile&&<CharacterNextGoal profile={profile}/>}
  </section>
);
