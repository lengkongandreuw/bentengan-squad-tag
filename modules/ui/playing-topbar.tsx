import { Menu, Pause, UserRound, Volume2, VolumeX } from 'lucide-react';
import { AudioSettings } from './audio-settings';

// Match topbar: brand lockup plus profile/audio/mission/pause actions.
// All state and actions arrive as props (the owner owns the refs/keys).
export const PlayingTopbar = ({
  logoSrc,
  hasProfile,
  musicMuted,
  onOpenProfile,
  onAudioOpen,
  onToggleMusic,
  onToggleMission,
  onPause,
}: {
  logoSrc: string;
  hasProfile: boolean;
  musicMuted: boolean;
  onOpenProfile: () => void;
  onAudioOpen: () => void;
  onToggleMusic: () => void;
  onToggleMission: () => void;
  onPause: () => void;
}) => (
  <header className="game-topbar">
    <div className="brand-lockup">
      <img className="game-logo" src={logoSrc} alt="Benteng Squad Tag" />
      <span className="brand-kicker">
        <i /> Playable rules prototype
        <br />
        Field compact · guarded
      </span>
    </div>
    <div className="top-actions">
      {hasProfile && (
        <button
          className="icon-button profile-match-trigger"
          onClick={onOpenProfile}
          aria-label="Buka profil pemain"
          title="Profil pemain"
        >
          <UserRound size={18} />
        </button>
      )}
      <AudioSettings onOpen={onAudioOpen} />
      <button
        className={`icon-button ${musicMuted ? 'muted' : ''}`}
        onClick={onToggleMusic}
        aria-pressed={musicMuted}
        aria-label={musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar'}
        title={musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar'}
      >
        {musicMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <button
        className="icon-button hud-menu-button"
        onClick={onToggleMission}
        aria-label="Buka menu misi"
      >
        <Menu size={19} />
      </button>
      <button className="icon-button" onClick={onPause} aria-label="Jeda">
        <Pause size={18} />
      </button>
    </div>
  </header>
);
