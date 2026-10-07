import { LogOut, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

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
      <small>PERMAINAN DIJEDA</small>
      <h2>
        Ambil napas.
        <br />
        Lanjut saat siap.
      </h2>
      <button onClick={onResume}>
        <Play size={17} fill="currentColor" /> Lanjutkan
      </button>
      <button onClick={onToggleMusic} aria-pressed={musicMuted}>
        {musicMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        {musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar'}
      </button>
      <button onClick={onRestart}>
        <RotateCcw size={17} /> Mulai ulang
      </button>
      <button onClick={onQuit}>
        <LogOut size={17} /> Keluar ke menu
      </button>
    </div>
  </div>
);
