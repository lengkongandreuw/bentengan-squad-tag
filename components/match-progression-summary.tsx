import { CHARACTER_BY_ID } from '../lib/characters';
import type { ProgressionResult } from '../lib/player-profile/match-progression';
import { MatchTokenSummary } from './match-token-summary';

// Presentation only: never reads storage or resolves/awards progression.
export function MatchProgressionSummary({ result }: { result: ProgressionResult | null }) {
  if (!result) return <section className="match-progression-summary" aria-label="Progression pertandingan">
    <p>Ringkasan progression belum tersedia. Periksa pemberitahuan penyimpanan profil.</p>
  </section>;
  const { xpBreakdown, levelProgress, nextCharacter } = result;
  return <section className="match-progression-summary" aria-label="Progression pertandingan">
    <div><h3>XP PERTANDINGAN</h3>
      {Object.entries(xpBreakdown).map(([key, value]) => <p key={key}>
        <span>{{ match: 'Match selesai', victory: 'Victory', tag: 'Tag', rescue: 'Rescue' }[key]}</span>
        <b>+{value} XP</b>
      </p>)}
      <strong>+{result.xpEarned} XP TOTAL</strong>
      {!result.applied && <small>{result.reason === 'duplicate' ? 'Reward match ini sudah diproses; tidak ditambahkan lagi.' : 'Match belum selesai; tidak ada reward.'}</small>}
    </div>
    <div><h3>LEVEL {result.currentLevel}</h3>
      {result.currentLevel > result.previousLevel && <strong>Naik dari level {result.previousLevel}!</strong>}
      <p>{result.currentXP} / {levelProgress.nextLevelXP ?? 'MAX'} XP</p>
      <progress value={levelProgress.progress} max={1} aria-label="Progress ke level berikutnya" />
      <p>{levelProgress.isMaxLevel ? 'Level maksimum tercapai' : `${levelProgress.xpToNextLevel} XP ke level berikutnya`}</p>
      <h3>KARAKTER BERIKUTNYA</h3>
      {nextCharacter ? <><strong>{CHARACTER_BY_ID[nextCharacter.characterId].name}</strong>
        <p>{nextCharacter.xpRemaining} XP lagi · Level {nextCharacter.minLevel}</p></>
        : <p>Semua karakter sudah terbuka</p>}
    </div>
    <MatchTokenSummary result={result} />
  </section>;
}
