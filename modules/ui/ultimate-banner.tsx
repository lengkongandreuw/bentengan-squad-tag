import { t } from '../../lib/language';
import { ULTIMATE_BANNERS, type UltimateIconId } from '../../lib/characters.ts';

// One-shot ultimate cast banner. The visibility guard (casting + owner)
// stays with the owner.
export const UltimateBanner = ({
  playerName,
  icon,
  hudTitle,
  bannerAlt,
  bannerClass,
  textOnly=false,
}: {
  playerName: string;
  icon: UltimateIconId;
  hudTitle: string;
  bannerAlt: string;
  bannerClass?: string;
  textOnly?: boolean;
}) => (
  <output
    className={`ultimate-banner ${bannerClass ?? ''}`}
    aria-label={t(`${playerName} mengaktifkan ${hudTitle}`)}
  >
    {textOnly?<strong className="ultimate-banner-text">{hudTitle}</strong>:<img src={ULTIMATE_BANNERS[icon]()} alt={t(bannerAlt)} decoding="async" />}
  </output>
);
