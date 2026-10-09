import {
  Check,
  Flag,
  Gauge,
  Lock,
  LogOut,
  Map as MapIcon,
  Play,
  RotateCcw,
  Shield,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { StatsBoard } from '../game-core/snapshot-types';
import type { Team } from '../world/map-data/field-types';
import { formatTime } from './format.ts';
import { teamName } from '../world/team-tables.ts';
import { CharacterPreview } from './character-preview.tsx';
import { t } from '../../lib/language';

// Round recap / match leaderboard / match-over dialog over the HUD.
// Pure presentation: all state comes from the snapshot board and every
// action arrives as a callback.
export const RoundStatsOverlay = ({
  statsBoard,
  leaderboardOpen,
  onCloseLeaderboard,
  onRequestNextRound,
  onRematch,
  onBackToCharacterSelect,
  onBackToFieldSelect,
  onQuit,
}: {
  statsBoard: StatsBoard;
  leaderboardOpen: boolean;
  onCloseLeaderboard: () => void;
  onRequestNextRound: () => void;
  onRematch: () => void;
  onBackToCharacterSelect: () => void;
  onBackToFieldSelect: () => void;
  onQuit: () => void;
}) => (
  <section
    className={`round-stats-overlay ${statsBoard.final ? 'final' : ''}`}
    role="dialog"
    aria-modal={statsBoard.visible}
    aria-labelledby="round-stats-title"
  >
    <div className="round-stats-panel">
      <header className="round-stats-head">
        <div>
          <span>
            {t(statsBoard.final
              ? 'MATCH SELESAI'
              : leaderboardOpen && !statsBoard.visible
                ? 'MATCH LEADERBOARD'
                : `REKAP RONDE ${statsBoard.round}`)}
          </span>
          <h2 id="round-stats-title">
            {t(statsBoard.winner
              ? `${teamName(statsBoard.winner).toUpperCase()} UNGGUL`
              : 'STATISTIK PEMAIN')}
          </h2>
          <p>
            {t(statsBoard.final
              ? 'Pilih aksi berikutnya untuk lanjut.'
              : statsBoard.visible
                ? `Lanjut otomatis ${statsBoard.countdown}s`
                : 'Tekan Tab atau klik skor untuk melihat statistik match.')}
          </p>
        </div>
        <div className="round-match-meta" aria-label={t("Info match")}>
          <span>
            <Gauge size={14} />
            <small>{t("DURASI")}</small>
            <b>{t(formatTime(statsBoard.duration))}</b>
          </span>
          <span>
            <Flag size={14} />
            <small>{t("FORMAT")}</small>
            <b>{t(statsBoard.format.toUpperCase())}</b>
          </span>
          <span>
            <MapIcon size={14} />
            <small>{t("MAP")}</small>
            <b>{t(statsBoard.mapName.toUpperCase())}</b>
          </span>
        </div>
        {!statsBoard.visible && (
          <button
            className="round-stats-close"
            onClick={onCloseLeaderboard}
            aria-label={t("Tutup leaderboard")}
          >
            <X size={16} />
          </button>
        )}
      </header>
      <div className="round-scoreline" aria-label={t("Skor match")}>
        <span>
          {t("TIM MERAH ")}<b>{t(statsBoard.score.blue)}</b>
        </span>
        <i>{t("BEST OF 3")}</i>
        <span>
          <b>{t(statsBoard.score.red)}</b>{t(" HIJAU")}
        </span>
      </div>
      <div className="round-stats-grid">
        {(['blue', 'red'] as Team[]).map((team) => (
          <article key={team} className={`round-team-card ${team}`}>
            <h3>{t(teamName(team).toUpperCase())}</h3>
            {statsBoard.teams[team].map((player) => (
              <div
                key={player.id}
                className={`round-stat-row ${player.controlled ? 'controlled' : ''} ${player.mvp ? 'mvp' : ''}`}
              >
                <CharacterPreview id={player.characterId} alt="" />
                <b>{t(player.controlled ? 'KAMU' : player.name)}</b>
                <span title={t("Tag musuh")}>
                  <Zap size={13} /> {player.tags}
                </span>
                <span title={t("Masuk penjara")}>
                  <Lock size={13} /> {player.prisons}
                </span>
                <span title={t("Rescue teman")}>
                  <Shield size={13} /> {player.rescues}
                </span>
                <strong title={t("Contribution score")}>
                  {t(player.contribution)}
                </strong>
              </div>
            ))}
          </article>
        ))}
      </div>
      {statsBoard.mvpName && (
        <aside className="round-mvp-card">
          <b>{t("MVP")}</b>
          <span>
            {t(statsBoard.mvpName)}{t(" · Kontribusi tertinggi di match ini")}
          </span>
        </aside>
      )}
      <footer className="round-stats-actions">
        {statsBoard.final ? (
          <>
            <button className="primary" onClick={onRematch}>
              <RotateCcw size={16} />{t(" REMATCH")}
            </button>
            <button onClick={onBackToCharacterSelect}>
              <Users size={16} />{t(" PILIH KARAKTER")}
            </button>
            <button onClick={onBackToFieldSelect}>
              <MapIcon size={16} />{t(" GANTI MAP")}
            </button>
            <button className="danger" onClick={onQuit}>
              <LogOut size={16} />{t(" KELUAR")}
            </button>
          </>
        ) : statsBoard.visible ? (
          <>
            <button className="primary" onClick={onRequestNextRound}>
              <Play size={16} fill="currentColor" />{t(" RONDE BERIKUTNYA")}
            </button>
            <button className="danger" onClick={onQuit}>
              <LogOut size={16} />{t(" KELUAR")}
            </button>
          </>
        ) : (
          <button className="primary" onClick={onCloseLeaderboard}>
            <Check size={16} />{t(" TUTUP")}
          </button>
        )}
      </footer>
    </div>
  </section>
);
