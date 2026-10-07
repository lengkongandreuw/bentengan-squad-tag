'use client';

import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  createPlayerProfile,
  USERNAME_MAX_LENGTH,
  usernameError,
} from '../../../lib/player-profile';

type PlayerProfileSetupProps = {
  onCreated: () => void;
};

export function PlayerProfileSetup({ onCreated }: PlayerProfileSetupProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
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
    <section className="player-profile-overlay" role="dialog" aria-modal="true" aria-labelledby="player-profile-setup-title">
      <form className="player-profile-panel player-profile-setup" onSubmit={submit}>
        <span>PROFIL PEMAIN</span>
        <h2 id="player-profile-setup-title">Buat profil</h2>
        <p>Buat username maksimal 12 karakter.</p>
        <label className="player-username-field">
          <span>USERNAME</span>
          <input
            autoFocus
            value={username}
            maxLength={USERNAME_MAX_LENGTH}
            onChange={(event) => setUsername(event.target.value)}
            aria-describedby={error ? 'profile-setup-error' : undefined}
          />
        </label>
        {error && <p className="player-profile-error" id="profile-setup-error">{error}</p>}
        <button className="player-profile-save" type="submit">CONFIRM</button>
      </form>
    </section>,
    document.body,
  );
}
