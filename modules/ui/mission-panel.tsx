import {
  BatteryCharging,
  Check,
  Flag,
  Gauge,
  Shield,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import type { Snapshot } from '../game-core/snapshot-types';
import type { Faction } from '../world/map-data/field-types';
import { factionName } from '../world/team-tables.ts';
import { CharacterPreview } from './character-preview.tsx';
import { publicAsset } from '../../lib/characters.ts';
import GAME_RULES from '../../config/game-rules.json' with { type: 'json' };
import { t } from '../../lib/language';
import { playerStateLabel } from '../../lib/player-copy.ts';

// Slide-in objectives/mission panel. Pure presentation: open state,
// snapshot, and the close callback arrive as props.
export const MissionPanel = ({
  open,
  onClose,
  missionCount,
  snapshot,
  mode,
  selectedFaction,
  musicMuted,
}: {
  open: boolean;
  onClose: () => void;
  missionCount: number;
  snapshot: Snapshot;
  mode: string;
  selectedFaction: Faction | null;
  musicMuted: boolean;
}) => (
  <aside className={`mission-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
    <button
      className="mission-close"
      onClick={onClose}
      aria-label={t("Tutup tujuan")}
    >
      <X size={20} />
    </button>
    <div className="mission-head">
      <span>{t(`Rules test · ${missionCount}/6`)}</span>
      <h2>{t("Buktikan core loop")}</h2>
    </div>
    <div className="mission-progress">
      <span style={{ width: `${missionCount * (100 / 6)}%` }} />
    </div>
    <div className="computed-status">
      <span>
        {t("Keluar base ")}{t(snapshot.baseGrace > 0 ? `${snapshot.baseGrace}s` : '—')}
      </span>
      <span>
        {t("Status benteng ")}<b>{t(snapshot.fortLock)}</b>
      </span>
      <span>
        {t("Refill aktif ")}<b>{t(snapshot.pickupCount)}</b>
      </span>
      <span>
        {t("Rotasi arena ")}<b>{t(snapshot.fieldWins)}{t("/3")}</b>
      </span>
    </div>
    <ul className="mission-list">
      <li className={snapshot.mission.refresh ? 'done' : ''}>
        {snapshot.mission.refresh ? <Check size={18} /> : <Flag size={18} />}
        <div>
          <b>{t("Refresh prioritas")}</b>
          <span>
            {t("Kembali ke benteng dan keluar lagi sebagai urutan terbaru.")}
          </span>
        </div>
      </li>
      <li className={snapshot.mission.boost ? 'done' : ''}>
        <BatteryCharging size={18} />
        <div>
          <b>{t("Sprint terbatas")}</b>
          <span>
            {t("Tekan Space untuk ledakan lari")}{' '}
            {t(GAME_RULES.boostDurationMs / 1000)}{t(" detik. Pulih 20 detik atau ambil refill.")}
          </span>
        </div>
      </li>
      <li className={snapshot.mission.parkour ? 'done' : ''}>
        <Gauge size={18} />
        <div>
          <b>{t("Parkour kontekstual")}</b>
          <span>
            {t("Tekan Shift di dekat rintangan atau tepi sungai. Di ponsel, gunakan tombol PARKOUR di sisi kanan.")}
          </span>
        </div>
      </li>
      <li className={snapshot.mission.tag ? 'done' : ''}>
        <Zap size={18} />
        <div>
          <b>{t("Menangkap target")}</b>
          <span>
            {t("Outline hijau = keluar lebih dulu dan boleh ditangkap.")}
          </span>
        </div>
      </li>
      <li className={snapshot.mission.rescue ? 'done' : ''}>
        <Shield size={18} />
        <div>
          <b>{t("Bebaskan penjara")}</b>
          <span>
            {t("Jangkau rekan terluar untuk membebaskan seluruh rantai.")}
          </span>
        </div>
      </li>
      <li className={snapshot.mission.combo ? 'done' : ''}>
        <Users size={18} />
        <div>
          <b>{t("Combo aksi tim")}</b>
          <span>
            {t("Rangkai tag atau rescue dari rekan berbeda dalam 6,5 detik untuk Squad Surge.")}
          </span>
        </div>
      </li>
    </ul>
    {mode === 'playing' ? (
      <>
        <div className={`team-status ${selectedFaction}`}>
          <span>
            {t(selectedFaction
              ? factionName(selectedFaction).toUpperCase()
              : 'TIM')}{t(' ')}{t("· 5 PEMAIN UNIK")}
          </span>
          {snapshot.team.map((member, index) => (
            <div key={`${member.name}-${index}`}>
              <CharacterPreview id={member.characterId} />
              <b>{t(member.name)}</b>
              <i style={{ width: `${Math.min(100, member.boost)}%` }} />
              <em>{t(playerStateLabel(member.state))}</em>
            </div>
          ))}
        </div>
        <div className="event-feed">
          {snapshot.logs.map((entry, index) => (
            <p key={`${entry}-${index}`}>{t(entry)}</p>
          ))}
        </div>
      </>
    ) : (
      <div className="reference-card">
        <img
          src={publicAsset('characters.webp?v=8')}
          alt={t("Referensi karakter Benteng Squad Tag")}
        />
        <div>
          <b>{t("Empat belas sprite produksi terpasang")}</b>
          <span>
            {t("Tim tetap, atlas 7×6 anti-potong, portrait transparan, animasi arah, tag, rescue, tahanan, menang, dan kalah.")}
          </span>
        </div>
      </div>
    )}
    <div className="audio-note">
      {t(musicMuted ? <VolumeX size={13} /> : <Volume2 size={13} />)}
      {t(musicMuted
        ? 'Musik latar mati. Suara arena dan efek tetap aktif.'
        : 'Musik menu dan pertandingan aktif setelah interaksi pertama.')}
    </div>
  </aside>
);
