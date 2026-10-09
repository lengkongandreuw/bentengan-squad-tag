import { t } from '../lib/language';
import { Lock } from 'lucide-react';
import type { CharacterId } from '../lib/characters';
import { getCharacterSelectionState } from '../lib/player-profile/content-gates';
import type { LocalPlayerProfile } from '../lib/player-profile/types';

export function CharacterLockBadge({ profile, id }: {
  profile: LocalPlayerProfile | null | undefined; id: CharacterId;
}) {
  const state = getCharacterSelectionState(profile, id);
  if (!state.locked) return null;
  return <strong className="character-lock-badge" title={t(`${state.xpRemaining ?? 0} XP lagi untuk membuka karakter`)}>
    <Lock size={12} aria-hidden="true" />{t(" TERKUNCI")}<small>{t("BUKA DI LEVEL ")}{t(state.requiredLevel ?? '—')}</small>
  </strong>;
}
