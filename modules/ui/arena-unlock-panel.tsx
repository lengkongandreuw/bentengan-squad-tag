import { useEffect, useState } from 'react';
import { getArenaSelectionProgress } from '../../lib/player-profile/arena-selection-progress.ts';
import type { LocalPlayerProfile } from '../../lib/player-profile/types';

export function ArenaUnlockPanel({ profile, catalog, selectedId }: {
  profile: LocalPlayerProfile; catalog: readonly { id: string; name: string }[]; selectedId: string;
}) {
  const [inspectId, setInspectId] = useState(selectedId);
  useEffect(() => setInspectId(selectedId), [selectedId]);
  const progress = getArenaSelectionProgress(profile, inspectId, catalog);
  return <details className="arena-unlock-panel" open>
    <summary>SYARAT ARENA</summary>
    <div className="arena-unlock-body">
      <label>Periksa arena (tidak mengubah pilihan match)
        <select value={inspectId} onChange={event => setInspectId(event.target.value)}>
          {catalog.map(arena => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
        </select>
      </label>
      <strong>{progress.unlocked ? 'TERBUKA · Bisa dimainkan' : 'TERKUNCI · Penuhi syarat berikut'}</strong>
      {!progress.configured && !progress.unlocked && <p>Aturan unlock arena ini belum tersedia.</p>}
      <ul>{progress.checks.map(check => <li key={`${check.kind}:${check.id ?? ''}`}>
        <span>{check.met ? '✓' : '○'} {check.label}</span>
        <b>{check.current} / {check.required}</b>
      </li>)}</ul>
      {progress.unlocked && <p>Arena yang sudah terbuka tetap dapat dimainkan.</p>}
    </div>
  </details>;
}
