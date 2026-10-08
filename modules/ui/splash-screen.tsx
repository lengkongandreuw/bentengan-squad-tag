import { landingLogoAsset } from '../../lib/branding.ts';

// Landing splash: hero art, logo, and the enter button. Pure presentation;
// the UI-asset resolver and the enter action are injected.
export const SplashScreen = ({
  resolveAsset,
  onEnter,
}: {
  resolveAsset: (file: string) => string;
  onEnter: () => void;
}) => (
  <section className="splash-screen" aria-labelledby="game-title">
    <img
      className="splash-hero splash-red"
      src={resolveAsset('heroes/red-active.webp')}
      alt="Raja dari Tim Merah"
    />
    <img
      className="splash-hero splash-green"
      src={resolveAsset('heroes/green-active.webp')}
      alt="Kaka dari Tim Hijau"
    />
    <div className="splash-center">
      <img
        className="splash-logo"
        src={landingLogoAsset()}
        alt="Benteng Squad Tag"
        id="game-title"
      />
      <button className="enter-game" onClick={onEnter}>
        <span>PRESS</span> SPACE <small>atau klik untuk masuk</small>
      </button>
    </div>
  </section>
);
