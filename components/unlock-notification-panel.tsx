import { t } from '../lib/language';
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
  return <section className="unlock-notification-panel" aria-label={t("Konten baru terbuka")}>
    <div aria-live="polite" aria-atomic="true">
      <h3>{t("BARU TERBUKA!")}</h3>
      <ul>{t(notices.map(notice => <li key={`${notice.kind}:${notice.id}`}>
        <span>{t(notice.kind === 'character' ? 'KARAKTER BARU' : 'ARENA BARU')}</span>
        <strong>{t(notice.name)}</strong>
      </li>))}</ul>
      <p>{t("Sudah masuk profilmu. Bisa dipilih untuk pertandingan berikutnya.")}</p>
    </div>
    <button onClick={onDismiss} aria-label={t("Tutup notifikasi unlock")}>{t("MENGERTI")}</button>
  </section>;
}
