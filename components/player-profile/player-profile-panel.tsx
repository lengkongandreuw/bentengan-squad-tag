'use client';
import { t, getLanguage } from '../../lib/language';


import { createPortal } from 'react-dom';
import { useState } from 'react';
import {
  CHARACTERS,
  CHARACTER_BY_ID,
  characterPreviewIcon,
} from '../../lib/characters';
import {
  getPlayerProfileMetrics,
  setFeaturedCharacter,
  type LocalPlayerProfile,
} from '../../lib/player-profile';
import { KdaSummary } from './kda-summary';
import { TokenWallet } from '../token-wallet';
import { PlayerRadarChart } from './radar-chart';
import './profile-poster.css';

type PlayerProfilePanelProps = {
  profile: LocalPlayerProfile;
  onClose: () => void;
};

const compactPlayerId = (id: string) =>
  id.length > 12
    ? `${id.slice(0, 8).toUpperCase()}…${id.slice(-4).toUpperCase()}`
    : id.toUpperCase();

export function PlayerProfilePanel({
  profile,
  onClose,
}: PlayerProfilePanelProps) {
  const [isCharacterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [hasCopiedPlayerId, setHasCopiedPlayerId] = useState(false);
  const metrics = getPlayerProfileMetrics(profile);
  const featuredCharacter = CHARACTER_BY_ID[profile.featuredCharacterId];
  const selectFeaturedCharacter = (characterId: typeof featuredCharacter.id) => {
    setFeaturedCharacter(characterId);
    setCharacterPickerOpen(false);
  };
  const copyPlayerId = async () => {
    try {
      await navigator.clipboard.writeText(profile.id);
      setHasCopiedPlayerId(true);
      window.setTimeout(() => setHasCopiedPlayerId(false), 1800);
    } catch {
      setHasCopiedPlayerId(false);
    }
  };
  if (typeof document === 'undefined') return null;

  return createPortal(
    <section className="player-profile-overlay" role="dialog" aria-modal="true" aria-labelledby="player-profile-title">
      <div className="player-profile-panel profile-poster">
        <header className="profile-poster-header">
          <div>
            <span>{t("PROFILE")}</span>
            <p>{t("Bergabung ")}{t(new Date(profile.firstJoin).toLocaleDateString(getLanguage()==='id'?'id-ID':'en-US'))}</p>
            <TokenWallet profile={profile} />
          </div>
          <button className="profile-close" type="button" onClick={onClose} aria-label={t("Tutup profil")}>{t("×")}</button>
        </header>
        <button
          className="profile-hero-card"
          onClick={() => setCharacterPickerOpen(true)}
          aria-label={t(`Pilih foto profil, saat ini ${featuredCharacter.name}`)}
          title={t("Pilih foto profil")}
        >
          <span className="profile-hero-tag">{t("HERO")}</span>
          <span className="profile-hero-frame">
            <img src={characterPreviewIcon(featuredCharacter.id)} alt={t(featuredCharacter.name)} />
          </span>
        </button>
        <section className="profile-poster-main">
          <div className="profile-identity">
            <span className="profile-street-id">{t("PLAYER / STREET ID")}</span>
            <span className="profile-player-id" title={t(profile.id)}>{t("ID · ")}{t(compactPlayerId(profile.id))}
            </span>
            <button
              className={hasCopiedPlayerId ? 'profile-copy-id copied' : 'profile-copy-id'}
              type="button"
              onClick={copyPlayerId}
              aria-label={t(hasCopiedPlayerId ? 'ID pemain tersalin' : 'Salin ID pemain')}
              title={t(hasCopiedPlayerId ? 'ID tersalin' : 'Salin ID pemain')}
            >
              <span aria-hidden="true" />
            </button>
          </div>
          <h2 id="player-profile-title">
            <span className="profile-username">
              <span className="profile-username-shadow" aria-hidden="true">{t(profile.username)}</span>
              <span className="profile-username-text">{t(profile.username)}</span>
            </span>
          </h2>
          <KdaSummary profile={profile} />
        </section>
        <section className="profile-poster-style" aria-label={t("Gaya bermain")}>
          <span className="profile-how-i-play">{t("CARA MAINMU")}</span>
          <h3>{t("GAYA MAIN")}</h3>
          <PlayerRadarChart
            attack={metrics.radar.attack}
            support={metrics.radar.support}
            survival={metrics.radar.survival}
            hasMatchData={metrics.matchesPlayed > 0}
          />
        </section>
        <section className="profile-poster-record" aria-label={t("Rekor match")}>
          <span>{t("REKOR MAIN")}</span>
          <div>
            <em>{t("W")}</em>
            <b>{t(String(profile.menang).padStart(2, '0'))}</b>
            <i>{t("—")}</i>
            <strong>{t(String(profile.kalah).padStart(2, '0'))}</strong>
            <u>{t("L")}</u>
          </div>
        </section>
        <span className="profile-go-copy" aria-hidden="true">{t("/// GO! GO!")}</span>
        <span className="profile-corner-stripes" aria-hidden="true" />
        <b className="profile-local-badge">{t("PROFIL")}<br />{t("LOKAL")}</b>
        {t(isCharacterPickerOpen && (
          <section
            className="profile-character-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-character-picker-title"
          >
            <div className="profile-character-picker-card">
              <header>
                <div>
                  <span>{t("PILIH FOTO PROFIL")}</span>
                  <h3 id="profile-character-picker-title">{t("IKON KARAKTER")}</h3>
                  <p>{t("Pilih karakter yang akan ditampilkan pada profilmu.")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCharacterPickerOpen(false)}
                  aria-label={t("Tutup pilihan karakter")}
                >{t("×")}</button>
              </header>
              <div className="profile-character-picker-grid">
                {t(CHARACTERS.map((character) => {
                  const isSelected = character.id === profile.featuredCharacterId;
                  return (
                    <button
                      key={character.id}
                      type="button"
                      className={isSelected ? 'selected' : undefined}
                      aria-pressed={isSelected}
                      onClick={() => selectFeaturedCharacter(character.id)}
                    >
                      <img src={characterPreviewIcon(character.id)} alt="" />
                      <span>{t(character.name)}</span>
                    </button>
                  );
                }))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </section>,
    document.body,
  );
}
