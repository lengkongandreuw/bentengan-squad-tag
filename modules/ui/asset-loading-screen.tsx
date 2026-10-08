import { ArenaBackdrop } from './arena-backdrop.tsx';

// Fullscreen asset-loading screen (selection or match). The owner owns
// the loading state and receives retry/back actions.
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
}) => (
  <main
    className={`pregame-shell asset-loading-screen ${selectionLoading ? `loading-ui-${faction}` : ''}`}
    aria-busy={!loadError}
    aria-label={`Memuat aset ${loadProgress}%`}
  >
    <ArenaBackdrop
      id={gameLoading ? fieldId : `${faction}-loading`}
      video={gameLoading}
    />
    {selectionLoading && (
      <img
        className="team-loading-frame"
        src={frameSrc}
        alt=""
        aria-hidden="true"
      />
    )}
    <section
      className={`asset-loading-card ${selectionLoading ? 'team-loading-card' : ''} ${loadError ? 'load-error' : ''}`}
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
  </main>
);
