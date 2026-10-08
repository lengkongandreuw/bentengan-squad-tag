import type { ProgressionResult } from '../../lib/player-profile/match-progression';
import { economyRules } from '../../lib/player-profile/economy-rules.ts';

// Render only engine output; duplicate/incomplete results never replay rewards.
export function MatchTokenSummary({ result }: { result: ProgressionResult }) {
  const currency = economyRules.currency.label;
  return <div className="match-token-summary">
    <h3>{currency} PERTANDINGAN</h3>
    {result.applied ? <>
      {Object.entries(result.tokenBreakdown).map(([key, value]) => <p key={key}>
        <span>{{ match: 'Match selesai', victory: 'Victory', tag: 'Tag', rescue: 'Rescue' }[key]}</span>
        <b>+{value} {currency}</b>
      </p>)}
      <strong>+{result.tokenEarned} {currency} TOTAL</strong>
    </> : <p>{result.reason === 'duplicate' ? `${currency} match ini sudah diproses; tidak ditambahkan lagi.` : `Match belum selesai; tidak ada ${currency} baru.`}</p>}
    <p>Saldo setelah pertandingan: <b>{result.currentTokenBalance.toLocaleString('id-ID')} {currency}</b></p>
  </div>;
}
