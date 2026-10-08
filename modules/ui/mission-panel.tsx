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
      aria-label="Tutup tujuan"
    >
      <X size={20} />
    </button>
    <div className="mission-head">
      <span>Rules test · {missionCount}/6</span>
      <h2>Buktikan core loop</h2>
    </div>
    <div className="mission-progress">
      <span style={{ width: `${missionCount * (100 / 6)}%` }} />
    </div>
    <div className="computed-status">
      <span>
        Keluar base{' '}
        <b>{snapshot.baseGrace > 0 ? `${snapshot.baseGrace}s` : '—'}</b>
      </span>
      <span>
        Status benteng <b>{snapshot.fortLock}</b>
      </span>
      <span>
        Refill aktif <b>{snapshot.pickupCount}</b>
      </span>
      <span>
        Rotasi arena <b>{snapshot.fieldWins}/3</b>
      </span>
    </div>
    <ul className="mission-list">
      <li className={snapshot.mission.refresh ? 'done' : ''}>
        {snapshot.mission.refresh ? <Check size={18} /> : <Flag size={18} />}
        <div>
          <b>Refresh prioritas</b>
          <span>
            Kembali ke benteng dan keluar lagi sebagai urutan terbaru.
          </span>
        </div>
      </li>
      <li className={snapshot.mission.boost ? 'done' : ''}>
        <BatteryCharging size={18} />
        <div>
          <b>Sprint terbatas</b>
          <span>
            Tekan Space untuk ledakan lari{' '}
            {GAME_RULES.boostDurationMs / 1000} detik. Pulih 20 detik atau
            ambil refill.
          </span>
        </div>
      </li>
      <li className={snapshot.mission.parkour ? 'done' : ''}>
        <Gauge size={18} />
        <div>
          <b>Parkour kontekstual</b>
          <span>
            Tekan Shift di dekat rintangan atau tepi sungai. Di ponsel,
            gunakan tombol PARKOUR di sisi kanan.
          </span>
        </div>
      </li>
      <li className={snapshot.mission.tag ? 'done' : ''}>
        <Zap size={18} />
        <div>
          <b>Menangkap target</b>
          <span>
            Outline hijau = keluar lebih dulu dan boleh ditangkap.
          </span>
        </div>
      </li>
      <li className={snapshot.mission.rescue ? 'done' : ''}>
        <Shield size={18} />
        <div>
          <b>Bebaskan penjara</b>
          <span>
            Jangkau rekan terluar untuk membebaskan seluruh rantai.
          </span>
        </div>
      </li>
      <li className={snapshot.mission.combo ? 'done' : ''}>
        <Users size={18} />
        <div>
          <b>Combo aksi tim</b>
          <span>
            Rangkai tag atau rescue dari rekan berbeda dalam 6,5 detik
            untuk Squad Surge.
          </span>
        </div>
      </li>
    </ul>
    {mode === 'playing' ? (
      <>
        <div className={`team-status ${selectedFaction}`}>
          <span>
            {selectedFaction
              ? factionName(selectedFaction).toUpperCase()
              : 'TIM'}{' '}
            · 5 PEMAIN UNIK
          </span>
          {snapshot.team.map((member, index) => (
            <div key={`${member.name}-${index}`}>
              <CharacterPreview id={member.characterId} />
              <b>{member.name}</b>
              <i style={{ width: `${Math.min(100, member.boost)}%` }} />
              <em>{member.state.replace('_', ' ')}</em>
            </div>
          ))}
        </div>
        <div className="event-feed">
          {snapshot.logs.map((entry, index) => (
            <p key={`${entry}-${index}`}>{entry}</p>
          ))}
        </div>
      </>
    ) : (
      <div className="reference-card">
        <img
          src={publicAsset('characters.webp?v=8')}
          alt="Referensi karakter Benteng Squad Tag"
        />
        <div>
          <b>Empat belas sprite produksi terpasang</b>
          <span>
            Tim tetap, atlas 7×6 anti-potong, portrait transparan, animasi
            arah, tag, rescue, tahanan, menang, dan kalah.
          </span>
        </div>
      </div>
    )}
    <div className="audio-note">
      {musicMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      {musicMuted
        ? 'Musik latar mati. Suara arena dan efek tetap aktif.'
        : 'Musik menu dan pertandingan aktif setelah interaksi pertama.'}
    </div>
  </aside>
);
