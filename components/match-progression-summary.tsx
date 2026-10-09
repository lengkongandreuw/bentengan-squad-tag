import { t } from '../lib/language';
import { CHARACTER_BY_ID } from '../lib/characters';
import type { ProgressionResult } from '../lib/player-profile/match-progression';
import { MatchTokenSummary } from './match-token-summary';

// Presentation only: never reads storage or resolves/awards progression.
export function MatchProgressionSummary({ result }: { result: ProgressionResult | null }) {
  if (!result) return <section className="match-progression-summary" aria-label={t("Hadiah pertandingan")}>
    <p>{t("Ringkasan hadiah belum tersedia. Cek pesan penyimpanan profil.")}</p>
  </section>;
  const { xpBreakdown, levelProgress, nextCharacter } = result;
  return <section className="match-progression-summary" aria-label={t("Hadiah pertandingan")}>
    <div><h3>{t("XP PERTANDINGAN")}</h3>
      {t(Object.entries(xpBreakdown).map(([key, value]) => <p key={key}>
        <span>{t({ match: 'Selesai bermain', victory: 'Menang', tag: 'Tag', rescue: 'Rescue' }[key])}</span>
        <b>{t("+")}{t(value)}{t(" XP")}</b>
      </p>))}
      <strong>{t("+")}{t(result.xpEarned)}{t(" XP TOTAL")}</strong>
      {t(!result.applied && <small>{t(result.reason === 'duplicate' ? 'Hadiah pertandingan ini sudah masuk. Tidak ditambahkan dua kali.' : 'Pertandingan belum selesai. Belum ada hadiah.')}</small>)}
    </div>
    <div><h3>{t("LEVEL ")}{t(result.currentLevel)}</h3>
      {t(result.currentLevel > result.previousLevel && <strong>{t("NAIK LEVEL! Sebelumnya level ")}{t(result.previousLevel)}{t(".")}</strong>)}
      <p>{t(result.currentXP)}{t(" / ")}{t(levelProgress.nextLevelXP ?? 'MAX')}{t(" XP")}</p>
      <progress value={levelProgress.progress} max={1} aria-label={t("Progress ke level berikutnya")} />
      <p>{t(levelProgress.isMaxLevel ? 'Level maksimum tercapai' : `${levelProgress.xpToNextLevel} XP ke level berikutnya`)}</p>
      <h3>{t("KARAKTER BERIKUTNYA")}</h3>
      {t(nextCharacter ? <><strong>{t(CHARACTER_BY_ID[nextCharacter.characterId].name)}</strong>
        <p>{t(nextCharacter.xpRemaining)}{t(" XP lagi · Level ")}{t(nextCharacter.minLevel)}</p></>
        : <p>{t("Semua karakter sudah terbuka")}</p>)}
    </div>
    <MatchTokenSummary result={result} />
  </section>;
}
