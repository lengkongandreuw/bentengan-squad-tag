import { ArenaBackdrop } from './arena-backdrop.tsx';
import { LoadingMedia, loadingUsesBuiltinProgress } from './loading-media.tsx';

// Fullscreen asset-loading screen (selection or match). The owner owns
// the loading state and receives retry/back actions. Custom loading media
// (Loading Studio) overlays the arena backdrop; builtin progress frames
// show only when the media preserves them.
export const AssetLoadingScreen = ({
  selectionLoading,
  gameLoading,
  faction,
  fieldId,
  frameSrc,
  loadError,
  loadProgress,
  onRetry,
  onBack,
}: {
  selectionLoading: boolean;
  gameLoading: boolean;
  faction: string;
  fieldId: string;
  frameSrc: string;
  loadError: string;
  loadProgress: number;
  onRetry: () => void;
  onBack: () => void;
}) => {
  const slot = gameLoading ? 'match' : `character-${faction}`;
  const builtinProgress = selectionLoading && loadingUsesBuiltinProgress(slot);
  return <main
    className={`pregame-shell asset-loading-screen ${selectionLoading ? `loading-ui-${faction}` : ''}`}
    aria-busy={!loadError}
    aria-label={`Memuat aset ${loadProgress}%`}
  >
    <LoadingMedia slot={slot} arenaId={fieldId}
      fallback={<ArenaBackdrop id={gameLoading ? fieldId : `${faction}-loading`} video={gameLoading} />} />
    {builtinProgress && (
      <img
        className="team-loading-frame"
        src={frameSrc}
        alt=""
        aria-hidden="true"
      />
    )}
    <section
      className={`asset-loading-card ${builtinProgress ? 'team-loading-card' : ''} ${loadError ? 'load-error' : ''}`}
      aria-busy={!loadError}
      aria-live="polite"
    >
      <h1>
        {gameLoading ? 'MENYIAPKAN PERTANDINGAN' : 'MENYIAPKAN KARAKTER'}
      </h1>
      <p>{loadError || 'Memuat aset… Tunggu sebentar.'}</p>
      <progress max={100} value={loadProgress} aria-label="Progres pemuatan aset" />
      <p>{loadProgress}%</p>
      {loadError && <button onClick={onRetry}>COBA LAGI</button>}
      <button onClick={onBack}>KEMBALI KE PILIH TIM</button>
    </section>
  </main>;
};
