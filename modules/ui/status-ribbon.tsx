import { t } from '../../lib/language';
// Player state strip: state dot, name, faction, state label, exit order.
// Pure presentation over precomputed display strings.
export const StatusRibbon = ({
  playerName,
  factionLabel,
  state,
  order,
}: {
  playerName: string;
  factionLabel: string;
  state: string;
  order: number | string;
}) => (
  <div className="status-ribbon">
    <span className={`state-dot ${state.toLowerCase()}`} />
    <span>
      <b>{t(playerName)}</b>
      {t(factionLabel)}
    </span>
    <strong>{t(state.replace('_', ' '))}</strong>
    <em>{t("PRIORITAS #")}{t(order || '—')}</em>
  </div>
);
