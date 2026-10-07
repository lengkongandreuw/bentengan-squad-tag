import type { Faction } from '../world/map-data/field-types';
import { factionName } from '../world/team-tables';

// Team pick screen: two faction cards with hover/focus highlight.
// Pure presentation; hover state, asset resolver, and the pick action
// (which owns navigation + voice) are injected.
export const TeamScreen = ({
  activeFaction,
  logoSrc,
  resolveAsset,
  onHover,
  onPick,
}: {
  activeFaction: Faction | null;
  logoSrc: string;
  resolveAsset: (file: string) => string;
  onHover: (faction: Faction | null) => void;
  onPick: (faction: Faction) => void;
}) => (
  <section className="team-screen" aria-labelledby="team-title">
    <h1 id="team-title" className="sr-only">
      Pilih tim
    </h1>
    <img className="ghost-logo" src={logoSrc} alt="" />
    {(['red', 'green'] as Faction[]).map((faction) => (
      <button
        key={faction}
        className={`team-pick team-pick-${faction} ${activeFaction === faction ? 'active' : ''}`}
        onPointerEnter={() => onHover(faction)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(faction)}
        onClick={() => onPick(faction)}
        aria-label={`Pilih ${factionName(faction)}`}
      >
        <img
          className="team-hero"
          src={resolveAsset(
            `heroes/${faction}-${activeFaction === faction ? 'active' : 'inactive'}.webp`,
          )}
          alt=""
        />
        <img
          className="team-banner"
          src={resolveAsset(
            `controls/team-${faction}-${activeFaction === faction ? 'active' : 'normal'}.webp`,
          )}
          alt={factionName(faction)}
        />
      </button>
    ))}
    <div className="team-hint">Arah kiri/kanan untuk memilih · Enter untuk lanjut</div>
  </section>
);
