import { LogOut, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { t } from '../../lib/language';
import { AudioSettings } from './audio-settings.tsx';
import { GraphicsSettings } from './graphics-settings.tsx';

// Pause overlay. Pure presentation; every action is injected by the owner.
export const PauseOverlay = ({
  musicMuted,
  onResume,
  onToggleMusic,
  onRestart,
  onQuit,
}: {
  musicMuted: boolean;
  onResume: () => void;
  onToggleMusic: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) => (
  <div className="pause-overlay">
    <div>
      <small>{t('PERMAINAN DIJEDA')}</small>
      <h2>{t('Lagi jeda.')}</h2>
      <button onClick={onResume}>
        <Play size={17} fill="currentColor" />{t(' Lanjut main')}
      </button>
      <button onClick={onToggleMusic} aria-pressed={musicMuted}>
        {musicMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        {t(musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar')}
      </button>
      <div className="pause-settings-row">
        <AudioSettings />
        <GraphicsSettings />
      </div>
      <button onClick={onRestart}>
        <RotateCcw size={17} />{t(' Mulai ulang')}
      </button>
      <button onClick={onQuit}>
        <LogOut size={17} />{t(' Keluar ke menu')}
      </button>
    </div>
  </div>
);
