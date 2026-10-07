import { ULTIMATE_BANNERS, type UltimateIconId } from '../../lib/characters.ts';

// One-shot ultimate cast banner. The visibility guard (casting + owner)
// stays with the owner.
export const UltimateBanner = ({
  playerName,
  icon,
  hudTitle,
  bannerAlt,
  bannerClass,
}: {
  playerName: string;
  icon: UltimateIconId;
  hudTitle: string;
  bannerAlt: string;
  bannerClass?: string;
}) => (
  <div
    className={`ultimate-banner ${bannerClass ?? ''}`}
    role="status"
    aria-label={`${playerName} mengaktifkan ${hudTitle}`}
  >
    <img src={ULTIMATE_BANNERS[icon]()} alt={bannerAlt} decoding="async" />
  </div>
);
