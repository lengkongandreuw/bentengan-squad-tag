import { t } from '../../lib/language';
import { AudioSettings } from './audio-settings.tsx';
import { GraphicsSettings } from './graphics-settings.tsx';

// Pregame action row: about (splash only), music toggle, rules, audio panel.
export const MenuActionsRow = ({
  menuStep,
  musicMuted,
  resolveAsset,
  onAbout,
  onToggleMusic,
  onOpenRules,
  onAudioOpen,
}: {
  menuStep: string;
  musicMuted: boolean;
  resolveAsset: (file: string) => string;
  onAbout: () => void;
  onToggleMusic: () => void;
  onOpenRules: () => void;
  onAudioOpen: () => void;
}) => (
  <div className={`pregame-actions step-${menuStep}`}>
    {menuStep === 'splash' && (
      <button
        className="music-toggle"
        onKeyDown={(event) => event.stopPropagation()}
        onClick={onAbout}
      >
        {t("ABOUT DEVELOPER")}
      </button>
    )}
    <button
      className={`sound-trigger ${musicMuted ? 'muted' : ''}`}
      onClick={onToggleMusic}
      aria-pressed={musicMuted}
      aria-label={t(musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar')}
    >
      <img
        src={resolveAsset(`controls/sound-trigger-${musicMuted ? 'off' : 'on'}.png`)}
        alt=""
      />
    </button>
    <button className="rules-button graffiti-primary" onClick={onOpenRules}>
      <span>{t("GAME RULES")}</span>
    </button>
    <AudioSettings
      onOpen={onAudioOpen}
      trigger={<img src={resolveAsset('controls/settings-button.png')} alt="" />}
    />
    <GraphicsSettings onOpen={onAudioOpen} />
  </div>
);
