import { getNewUnlockNotices } from '../lib/player-profile/unlock-notifications';
import type { ProgressionResult } from '../lib/player-profile/match-progression';

export function UnlockNotificationPanel({ result, arenas, dismissed, onDismiss }: {
  result: ProgressionResult | null;
  arenas: readonly { id: string; name: string }[];
  dismissed: boolean;
  onDismiss: () => void;
}) {
  const notices = getNewUnlockNotices(result, arenas);
  if (dismissed || !notices.length) return null;
  return <section className="unlock-notification-panel" aria-label="Konten baru terbuka">
    <div aria-live="polite" aria-atomic="true">
      <h3>KONTEN BARU TERBUKA!</h3>
      <ul>{notices.map(notice => <li key={`${notice.kind}:${notice.id}`}>
        <span>{notice.kind === 'character' ? 'NEW CHARACTER UNLOCKED' : 'NEW ARENA UNLOCKED'}</span>
        <strong>{notice.name}</strong>
      </li>)}</ul>
      <p>Sudah tersimpan di profil dan tersedia pada pilihan berikutnya.</p>
    </div>
    <button onClick={onDismiss} aria-label="Tutup notifikasi unlock">MENGERTI</button>
  </section>;
}
