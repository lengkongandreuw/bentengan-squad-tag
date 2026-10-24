import { t } from '../../lib/language';
import { PRODUCT_COPYRIGHT } from '../../lib/branding.ts';
import { homeMenuArt } from './home-menu-art.tsx';

// Landing splash: hero art, logo, and the enter button. Pure presentation;
// the UI-asset resolver and the enter action are injected.
export const SplashScreen = ({
  onEnter,
}: {
  onEnter: () => void;
}) => (
  <section className="splash-screen comic-home" aria-labelledby="game-title">
    <div className="splash-center">
      <img
        className="splash-logo"
        src={homeMenuArt('logo')}
        width="1632" height="759"
        alt={t("Benteng Squad Tag")}
        id="game-title"
      />
      <button type="button" className="enter-game comic-play supplied-play" onClick={onEnter} aria-label={t('MAINKAN')}>
        <img src={homeMenuArt('play')} width="2172" height="724" alt="" draggable={false} />
      </button>
    </div>
    <footer className="splash-copyright">{PRODUCT_COPYRIGHT}</footer>
  </section>
);
