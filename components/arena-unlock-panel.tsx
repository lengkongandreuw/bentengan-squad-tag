import { t } from '../lib/language';
import { useEffect, useState } from 'react';
import { getArenaSelectionProgress } from '../lib/player-profile/arena-selection-progress';
import type { LocalPlayerProfile } from '../lib/player-profile/types';

export function ArenaUnlockPanel({ profile, catalog, selectedId }: {
  profile: LocalPlayerProfile; catalog: readonly { id: string; name: string }[]; selectedId: string;
}) {
  const [inspectId, setInspectId] = useState(selectedId);
  useEffect(() => setInspectId(selectedId), [selectedId]);
  const progress = getArenaSelectionProgress(profile, inspectId, catalog);
  return <details className="arena-unlock-panel" open>
    <summary>{t("SYARAT ARENA")}</summary>
    <div className="arena-unlock-body">
      <label>{t("Periksa arena (tidak mengubah pilihan match)")}<select value={inspectId} onChange={event => setInspectId(event.target.value)}>
          {t(catalog.map(arena => <option key={arena.id} value={arena.id}>{t(arena.name)}</option>))}
        </select>
      </label>
      <strong>{t(progress.unlocked ? 'TERBUKA · Bisa dimainkan' : 'TERKUNCI · Penuhi syarat berikut')}</strong>
      {t(!progress.configured && !progress.unlocked && <p>{t("Aturan unlock arena ini belum tersedia.")}</p>)}
      <ul>{t(progress.checks.map(check => <li key={`${check.kind}:${check.id ?? ''}`}>
        <span>{t(check.met ? '✓' : '○')} {t(check.label)}</span>
        <b>{t(check.current)}{t(" / ")}{t(check.required)}</b>
      </li>))}</ul>
      {t(progress.unlocked && <p>{t("Arena yang sudah terbuka tetap dapat dimainkan.")}</p>)}
    </div>
  </details>;
}
