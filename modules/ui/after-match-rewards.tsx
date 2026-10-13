import { useState, type ReactNode } from 'react';
import {
  Check,
  Coins,
  LogOut,
  Map as MapIcon,
  RotateCcw,
  Users,
  Zap,
} from 'lucide-react';
import type { ProgressionResult } from '../../lib/player-profile/match-progression';
import { getNewUnlockNotices } from '../../lib/player-profile/unlock-notifications.ts';
import { economyRules } from '../../lib/player-profile/economy-rules.ts';
import { CHARACTER_BY_ID, type CharacterId } from '../../lib/characters.ts';
import { CharacterPreview } from './character-preview.tsx';
import { arenaImage } from './arena-backdrop.tsx';
import { t } from '../../lib/language';
import './after-match-rewards.css';

// Match Rewards stage (Phase 2). Pure presentation over the authoritative
// ProgressionResult produced once at match completion. This component never
// calls recordMatchProgression / applyMatchProgression / creditTokens or any
// persistence: mounting, stage switches, dismissal and footer navigation only
// read the result object handed down from the host.
const XP_LABELS: Record<string, string> = {
  match: 'Selesai bermain',
  victory: 'Menang',
  tag: 'Tag',
  rescue: 'Rescue',
};

const breakdownRows = (breakdown: Record<string, number>, roundsPlayed?: number) =>
  Object.entries(breakdown).map(([key, value]) => ({
    key,
    label: `${XP_LABELS[key] ?? key}${key === 'match' && roundsPlayed ? ` · ${roundsPlayed} ronde` : ''}`,
    value,
  }));

const RewardCard = ({
  sticker,
  total,
  unit,
  rows,
  foot,
  accent,
}: {
  sticker: string;
  total: string;
  unit: string;
  rows: Array<{ key: string; label: string; value: number }>;
  foot?: ReactNode;
  accent: 'xp' | 'doi';
}) => (
  <article className={`after-match-rewards-card ${accent}`}>
    <span className="after-match-rewards-sticker">{t(sticker)}</span>
    <small className="after-match-rewards-total-label">{t('TOTAL')}</small>
    <div className="after-match-rewards-total">
      <b>
        {total} {unit}
      </b>
    </div>
    <h4>{t('RINCIAN')}</h4>
    <ul>
      {rows.map((row) => (
        <li key={row.key} className={row.value === 0 ? 'zero' : ''}>
          <span>{t(row.label)}</span>
          <b>
            +{row.value} {unit}
          </b>
        </li>
      ))}
    </ul>
    {foot}
  </article>
);

export const AfterMatchRewards = ({
  result,
  arenas,
  unlockDismissed,
  onDismiss,
  onQuit,
  onRematch,
  onBackToCharacterSelect,
  onBackToFieldSelect,
}: {
  result: ProgressionResult | null;
  arenas: readonly { id: string; name: string }[];
  unlockDismissed: boolean;
  onDismiss: () => void;
  onQuit: () => void;
  onRematch: () => void;
  onBackToCharacterSelect: () => void;
  onBackToFieldSelect: () => void;
}) => {
  const [failedArt, setFailedArt] = useState<Record<string, boolean>>({});
  const currency = economyRules.currency.label;
  const notices = getNewUnlockNotices(result, arenas);
  const applied = result?.applied === true;
  const progress = result?.levelProgress;
  const percent = progress
    ? Math.max(0, Math.min(100, Math.round(progress.progress * 100)))
    : 0;
  const leveledUp =
    applied && result && result.currentLevel > result.previousLevel;
  const nextCharacter = applied ? result?.nextCharacter ?? null : null;

  return (
    <>
      <div className="after-match-rewards-body">
        <section
          className="after-match-rewards-left"
          aria-label={t('Hadiah pertandingan')}
        >
          <div className="after-match-rewards-cards">
            {result && applied ? (
              <>
                <RewardCard
                  accent="xp"
                  sticker="XP PERTANDINGAN"
                  total={`+${result.xpEarned}`}
                  unit="XP"
                  rows={breakdownRows(result.xpBreakdown, result.roundsPlayed)}
                />
                <RewardCard
                  accent="doi"
                  sticker="DOI PERTANDINGAN"
                  total={`+${result.tokenEarned}`}
                  unit={currency}
                  rows={breakdownRows(result.tokenBreakdown, result.roundsPlayed)}
                  foot={
                    <p className="after-match-rewards-balance">
                      <span>
                        <Coins size={14} />
                        {t('Saldo setelah pertandingan:')}
                      </span>
                      <b>
                        {t(result.currentTokenBalance.toLocaleString('id-ID'))}{' '}
                        {t(currency)}
                      </b>
                    </p>
                  }
                />
              </>
            ) : (
              <div className="after-match-rewards-unavailable">
                <p>
                  {t(
                    result?.reason === 'duplicate'
                      ? 'Hadiah pertandingan ini sudah masuk. Tidak ditambahkan dua kali.'
                      : 'Ringkasan hadiah belum tersedia. Cek pesan penyimpanan profil.',
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="after-match-rewards-level">
            <div className="after-match-rewards-badge">
              <span>{t('LEVEL')}</span>
              <b>{progress ? progress.level : '—'}</b>
            </div>
            <div className="after-match-rewards-progress">
              {leveledUp && result ? (
                <strong className="after-match-rewards-levelup">
                  <Zap size={14} />
                  {t(`NAIK DARI LEVEL ${result.previousLevel}!`)}
                </strong>
              ) : progress?.isMaxLevel ? (
                <strong className="after-match-rewards-levelup">
                  {t('LEVEL MAKSIMUM TERCAPAI')}
                </strong>
              ) : null}
              <p className="after-match-rewards-xp-line">
                {result && progress
                  ? progress.nextLevelXP === null
                    ? t(`${result.currentXP} XP`)
                    : t(`${result.currentXP} / ${progress.nextLevelXP} XP`)
                  : t('—')}
              </p>
              <progress
                className="after-match-rewards-bar"
                max={100}
                value={percent}
                aria-label={t('Progress ke level berikutnya')}
              />
              <small>
                {result && progress
                  ? progress.isMaxLevel
                    ? t('Level maksimum tercapai')
                    : t(`${progress.xpToNextLevel} XP ke level berikutnya`)
                  : t('—')}
              </small>
            </div>
            <div className="after-match-rewards-next">
              {nextCharacter ? (
                <>
                  <span className="after-match-rewards-next-portrait">
                    <CharacterPreview
                      id={nextCharacter.characterId}
                      alt=""
                      variant="full"
                    />
                  </span>
                  <div>
                    <small>{t('KARAKTER BERIKUTNYA')}</small>
                    <b>
                      {t(CHARACTER_BY_ID[nextCharacter.characterId].name)}
                    </b>
                    <p>
                      {t(
                        `Level ${nextCharacter.minLevel} · ${nextCharacter.xpRemaining} XP lagi`,
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="after-match-rewards-next-empty">
                  <small>{t('KARAKTER BERIKUTNYA')}</small>
                  <b>{applied ? t('Semua karakter sudah terbuka') : t('—')}</b>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside
          className="after-match-rewards-unlocks"
          aria-label={t('Konten baru terbuka')}
        >
          <div className="after-match-rewards-unlocks-head">
            <b>{t('KONTEN BARU')}</b>
            <strong>{t('TERBUKA!')}</strong>
          </div>
          <ul className="after-match-rewards-unlock-list">
            {!unlockDismissed &&
              notices.map((notice) =>
                notice.kind === 'character' ? (
                  <li key={`${notice.kind}:${notice.id}`}>
                    <span className="after-match-rewards-unlock-art">
                      <CharacterPreview
                        id={notice.id as CharacterId}
                        alt=""
                        variant="full"
                        eager={true}
                      />
                    </span>
                    <div>
                      <em>{t('NEW CHARACTER UNLOCKED')}</em>
                      <b>{t(notice.name)}</b>
                      <i>{t('TERBUKA')}</i>
                    </div>
                  </li>
                ) : (
                  <li key={`${notice.kind}:${notice.id}`}>
                    <span className="after-match-rewards-unlock-art arena">
                      <b aria-hidden="true">{notice.name.charAt(0)}</b>
                      {!failedArt[notice.id] && (
                        <img
                          src={arenaImage(notice.id)}
                          alt=""
                          loading="lazy"
                          onError={() =>
                            setFailedArt((prev) => ({ ...prev, [notice.id]: true }))
                          }
                        />
                      )}
                    </span>
                    <div>
                      <em>{t('NEW ARENA UNLOCKED')}</em>
                      <b>{t(notice.name)}</b>
                      <i>{t('TERBUKA')}</i>
                    </div>
                  </li>
                ),
              )}
            {(unlockDismissed || notices.length === 0) && (
              <li className="after-match-rewards-unlock-empty">
                {t('BELUM ADA UNLOCK BARU')}
              </li>
            )}
          </ul>
          <p>{t('Sudah tersimpan di profil dan tersedia pada pilihan berikutnya.')}</p>
          <button type="button" onClick={onDismiss}>
            <Check size={14} />
            {t('MENGERTI')}
          </button>
        </aside>
      </div>

      <div className="after-match-actions after-match-rewards-footer">
        <button type="button" className="after-match-quit" onClick={onQuit}>
          <LogOut size={16} />
          {t('KELUAR')}
        </button>
        <p className="after-match-helper">{t('Pilih aksi berikutnya untuk lanjut.')}</p>
        <button type="button" className="after-match-secondary" onClick={onBackToCharacterSelect}>
          <Users size={16} />
          {t('PILIH KARAKTER')}
        </button>
        <button type="button" className="after-match-secondary" onClick={onBackToFieldSelect}>
          <MapIcon size={16} />
          {t('GANTI MAP')}
        </button>
        <button type="button" className="after-match-rematch" onClick={onRematch}>
          <RotateCcw size={16} />
          {t('REMATCH')}
        </button>
      </div>
    </>
  );
};
