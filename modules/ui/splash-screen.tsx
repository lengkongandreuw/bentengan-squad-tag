import { t } from '../../lib/language';
import { landingLogoAsset } from '../../lib/branding.ts';

// Landing splash: hero art, logo, and the enter button. Pure presentation;
// the UI-asset resolver and the enter action are injected.
export const SplashScreen = ({
  resolveAsset,
  onEnter,
  onMultiplayer,
}: {
  resolveAsset: (file: string) => string;
  onEnter: () => void;
  onMultiplayer: () => void;
}) => (
  <section className="splash-screen" aria-labelledby="game-title">
    <img
      className="splash-hero splash-red"
      src={resolveAsset('heroes/red-active.webp')}
      alt={t("Raja dari Tim Merah")}
    />
    <img
      className="splash-hero splash-green"
      src={resolveAsset('heroes/green-active.webp')}
      alt={t("Kaka dari Tim Hijau")}
    />
    <div className="splash-center">
      <img
        className="splash-logo"
        src={landingLogoAsset()}
        alt={t("Benteng Squad Tag")}
        id="game-title"
      />
      <button className="enter-game" onClick={onEnter}>
        <span>{t("PRESS")}</span>{t(" SPACE ")}<small>{t("atau klik untuk masuk")}</small>
      </button>
      <button type="button" className="multiplayer-open" aria-label={t("MULTIPLAYER · LOBBY")} onClick={onMultiplayer}>
        <img src={resolveAsset('controls/multiplayer.webp')} alt="" width="1024" height="366" />
      </button>
    </div>
  </section>
);
