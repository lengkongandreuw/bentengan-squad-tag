import { t } from '../../lib/language';
import type { ProgressionResult } from '../../lib/player-profile/match-progression';
import { economyRules } from '../../lib/player-profile/economy-rules.ts';

// Render only engine output; duplicate/incomplete results never replay rewards.
export function MatchTokenSummary({ result }: { result: ProgressionResult }) {
  const currency = economyRules.currency.label;
  return <div className="match-token-summary">
    <h3>{t(currency)}{t(" PERTANDINGAN")}</h3>
    {t(result.applied ? <>
      {t(Object.entries(result.tokenBreakdown).map(([key, value]) => <p key={key}>
        <span>{t({ match: 'Selesai bermain', victory: 'Menang', tag: 'Tag', rescue: 'Rescue' }[key])}</span>
        <b>{t("+")}{t(value)} {t(currency)}</b>
      </p>))}
      <strong>{t("+")}{t(result.tokenEarned)} {t(currency)}{t(" TOTAL")}</strong>
    </> : <p>{t(result.reason === 'duplicate' ? `${currency} pertandingan ini sudah masuk. Tidak ditambahkan dua kali.` : `Pertandingan belum selesai. Belum ada hadiah ${currency}.`)}</p>)}
    <p>{t("Saldo setelah pertandingan: ")}<b>{t(result.currentTokenBalance.toLocaleString('id-ID'))} {t(currency)}</b></p>
  </div>;
}
