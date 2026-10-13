import { useState } from 'react';
import {
  ArrowRight,
  Clover,
  Lock,
  LogOut,
  Shield,
  Star,
  Triangle,
  Zap,
} from 'lucide-react';
import type { MatchFormatView, StatsBoard } from '../game-core/snapshot-types';
import type { ProgressionResult } from '../../lib/player-profile/match-progression';
import type { Team } from '../world/map-data/field-types';
import { teamName } from '../world/team-tables.ts';
import { formatTime } from './format.ts';
import { CharacterPreview } from './character-preview.tsx';
import { AfterMatchRewards } from './after-match-rewards.tsx';
import { t } from '../../lib/language';
import './after-match-results.css';

// Shared Match Statistics-style header (banner + DURASI/FORMAT/MAP). Used by
// both After Match stages so the two screens stay visually identical.
export const AfterMatchHeader = ({
  statsBoard,
  formatLabel,
}: {
  statsBoard: StatsBoard;
  formatLabel: string;
}) => (
  <div className="after-match-top">
    <div className="after-match-banner">{t('MATCH SELESAI!')}</div>
    <div className="after-match-meta-card">
      <small>{t('DURASI')}</small>
      <b>{t(formatTime(statsBoard.duration))}</b>
    </div>
    <div className="after-match-meta-card">
      <small>{t('FORMAT')}</small>
      <b>{t(formatLabel)}</b>
    </div>
    <div className="after-match-meta-card">
      <small>{t('MAP')}</small>
      <b>{t(statsBoard.mapName.toUpperCase())}</b>
    </div>
  </div>
);

// Final After Match screen (Statistics + Rewards stages).
// Pure presentation: statistics come from the authoritative StatsBoard and
// MatchFormatView, rewards from the authoritative ProgressionResult produced
// once at match completion (`blue` is Tim Merah and `red` is Tim Hijau).
// NEXT is a local presentation-stage transition (`results` -> `rewards`).
// It never advances rounds, restarts the match, or awards anything.
export const AfterMatchResults = ({
  statsBoard,
  match,
  result,
  arenas,
  unlockDismissed,
  onDismiss,
  onQuit,
  onRematch,
  onBackToCharacterSelect,
  onBackToFieldSelect,
  onNextToRewards,
}: {
  statsBoard: StatsBoard;
  match?: MatchFormatView;
  /** Completed-match progression result; null when unavailable (guest/no profile). */
  result: ProgressionResult | null;
  arenas: readonly { id: string; name: string }[];
  unlockDismissed: boolean;
  onDismiss: () => void;
  onQuit: () => void;
  onRematch: () => void;
  onBackToCharacterSelect: () => void;
  onBackToFieldSelect: () => void;
  /** Explicit integration point for the future Rewards screen. When absent,
   * NEXT falls back to the local `rewards` stage. */
  onNextToRewards?: () => void;
}) => {
  // Local presentation stage. The view mounts fresh on every match end
  // (the final branch unmounts while the board is hidden), so `results` is
  // always the initial stage with no reset effect needed.
  const [stage, setStage] = useState<'results' | 'rewards'>('results');

  const blueScore = match?.scored ? match.points.blue : statsBoard.score.blue;
  const redScore = match?.scored ? match.points.red : statsBoard.score.red;
  const winnerTeam: Team =
    statsBoard.winner ?? (redScore >= blueScore ? 'red' : 'blue');
  const loserTeam: Team = winnerTeam === 'red' ? 'blue' : 'red';
  const formatLabel = (match?.scored ? match.label : statsBoard.format).toUpperCase();
  const winnerName = teamName(winnerTeam).toUpperCase();
  const winnerIsGreen = winnerTeam === 'red';

  const allRows = [...statsBoard.teams.blue, ...statsBoard.teams.red];
  const mvpRow =
    allRows.find((player) => player.id === statsBoard.mvpId) ??
    allRows.find((player) => player.mvp);

  const goNext = () => {
    if (onNextToRewards) {
      onNextToRewards();
      return;
    }
    setStage('rewards');
  };

  if (stage === 'rewards') {
    return (
      <div className="after-match after-match-rewards" data-stage="rewards">
        <AfterMatchHeader statsBoard={statsBoard} formatLabel={formatLabel} />
        <AfterMatchRewards
          result={result}
          arenas={arenas}
          unlockDismissed={unlockDismissed}
          onDismiss={onDismiss}
          onQuit={onQuit}
          onRematch={onRematch}
          onBackToCharacterSelect={onBackToCharacterSelect}
          onBackToFieldSelect={onBackToFieldSelect}
        />
      </div>
    );
  }

  const renderRoster = (team: Team, isWinner: boolean) => (
    <div className={`after-match-roster ${team} ${isWinner ? 'winner' : 'loser'}`}>
      <div className="after-match-team-head">
        {team === 'red' ? <Clover size={15} /> : <Triangle size={13} />}
        <span>{t(teamName(team).toUpperCase())}</span>
        {isWinner && <em>{t('PEMENANG')}</em>}
      </div>
      <ul>
        {statsBoard.teams[team].map((player) => (
          <li
            key={player.id}
            className={`after-match-row ${player.controlled ? 'controlled' : ''} ${player.mvp ? 'mvp' : ''}`}
          >
            {player.controlled && (
              <span className="after-match-kamu">{t('KAMU')}</span>
            )}
            <span className="after-match-portrait">
              {player.mvp && (
                <i className="after-match-row-star" aria-label="MVP">
                  <Star size={11} fill="currentColor" />
                </i>
              )}
              <CharacterPreview id={player.characterId} alt="" />
            </span>
            <b>{player.name.toUpperCase()}</b>
            <span className="after-match-cell" title={t('Tag musuh')}>
              <Zap size={12} />
              {player.tags}
            </span>
            <span className="after-match-cell" title={t('Masuk penjara')}>
              <Lock size={12} />
              {player.prisons}
            </span>
            <span className="after-match-cell" title={t('Rescue teman')}>
              <Shield size={12} />
              {player.rescues}
            </span>
            <strong
              className={`after-match-pts ${player.contribution > 0 ? 'pos' : player.contribution < 0 ? 'neg' : 'zero'}`}
              title={t('Contribution score')}
            >
              {player.contribution}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="after-match" data-stage="results">
      <AfterMatchHeader statsBoard={statsBoard} formatLabel={formatLabel} />

      <div className="after-match-panel">
        <section
          className={`after-match-left ${winnerIsGreen ? 'green' : 'red'}`}
          aria-label={t('Pemenang match')}
        >
          <h2 id="round-stats-title" className="after-match-winner-name">
            {t(winnerName)}
          </h2>
          <div className="after-match-victory">{t('UNGGUL!')}</div>
          <div className="after-match-score" aria-label={t('Skor match')}>
            <div className="after-match-score-side hijau">
              <small>{t('HIJAU')}</small>
              <b>{match?.scored ? match.points.red : statsBoard.score.red}</b>
              <span>{t('TIM HIJAU')}</span>
            </div>
            <i className="after-match-slash" aria-hidden="true">
              /
            </i>
            <div className="after-match-score-side merah">
              <small>{t('MERAH')}</small>
              <b>{match?.scored ? match.points.blue : statsBoard.score.blue}</b>
              <span>{t('TIM MERAH')}</span>
            </div>
            <em className="after-match-format-sticker">{t(formatLabel)}</em>
          </div>
          {mvpRow && (
            <aside className="after-match-mvp" aria-label="MVP">
              <span className="after-match-mvp-star" aria-hidden="true">
                <Star size={16} fill="currentColor" />
              </span>
              <em className="after-match-mvp-flag">MVP!</em>
              <span className="after-match-mvp-portrait">
                <CharacterPreview
                  id={mvpRow.characterId}
                  alt=""
                  variant="full"
                  eager={true}
                />
              </span>
              <div className="after-match-mvp-body">
                <b>{mvpRow.name.toUpperCase()}</b>
                <small>{t('Kontribusi tertinggi di match ini')}</small>
                <div className="after-match-mvp-stats">
                  <span title={t('Tag musuh')}>
                    TAG <b>{mvpRow.tags}</b>
                  </span>
                  <span title={t('Masuk penjara')}>
                    PRISON <b>{mvpRow.prisons}</b>
                  </span>
                  <span title={t('Rescue teman')}>
                    RESCUE <b>{mvpRow.rescues}</b>
                  </span>
                </div>
              </div>
            </aside>
          )}
        </section>

        <section className="after-match-right" aria-label={t('Catatan lapangan')}>
          <div className="after-match-section-head">
            <h3>{t('CATATAN LAPANGAN')}</h3>
            <div className="after-match-legend">
              <span>
                <Zap size={11} />
                TAG
              </span>
              <span>
                <Lock size={11} />
                {t('TERTANGKAP')}
              </span>
              <span>
                <Shield size={11} />
                RESCUE
              </span>
              <span>PTS</span>
            </div>
          </div>
          {renderRoster(winnerTeam, true)}
          <div className="after-match-vs">VS</div>
          {renderRoster(loserTeam, false)}
        </section>
      </div>

      <div className="after-match-actions">
        <button type="button" className="after-match-quit" onClick={onQuit}>
          <LogOut size={16} />
          {t('KELUAR')}
        </button>
        <p className="after-match-helper">{t('Pilih aksi berikutnya untuk lanjut.')}</p>
        <button type="button" className="after-match-next" onClick={goNext}>
          {t('NEXT')}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
