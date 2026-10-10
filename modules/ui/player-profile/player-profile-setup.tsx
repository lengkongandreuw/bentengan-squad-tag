'use client';
import { t } from '../../../lib/language';


import { useState } from 'react';
import type * as React from 'react';
import { createPortal } from 'react-dom';
import {
  createPlayerProfile,
  USERNAME_MAX_LENGTH,
  usernameError,
} from '../../../lib/player-profile/index.ts';

type PlayerProfileSetupProps = {
  onCreated: () => void;
};

export function PlayerProfileSetup({ onCreated }: PlayerProfileSetupProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = usernameError(username);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      createPlayerProfile(username);
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Profil gagal dibuat.');
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <dialog className="player-profile-overlay" open aria-modal="true" aria-labelledby="player-profile-setup-title">
      <form className="player-profile-panel player-profile-setup" onSubmit={submit}>
        <span>{t("PROFIL PEMAIN")}</span>
        <h2 id="player-profile-setup-title">{t("Mau dipanggil siapa?")}</h2>
        <p>{t("Nama pemain · 3–12 karakter.")}</p>
        <label className="player-username-field">
          <span>{t("NAMA PEMAIN")}</span>
          <input
            autoFocus
            value={username}
            maxLength={USERNAME_MAX_LENGTH}
            onChange={(event) => setUsername(event.target.value)}
            aria-describedby={error ? 'profile-setup-error' : undefined}
          />
        </label>
        {t(error && <p className="player-profile-error" id="profile-setup-error">{t(error)}</p>)}
        <button className="player-profile-save" type="submit">{t("SIMPAN NAMA")}</button>
      </form>
    </dialog>,
    document.body,
  );
}
