'use client';
import { t, getLanguage } from '../../lib/language';

/* oxlint-disable next/no-img-element -- Static supplied PNG art must work in the standalone Pages build. */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  audioLevels,
  saveAudioLevels,
  DEFAULT_AUDIO_LEVELS,
  AUDIO_SETTINGS_EVENT,
  MUSIC_PREVIEW_EVENT,
  type AudioLevels,
} from '../../lib/audio-settings.ts';
import { GameplayAudio, type GameplaySound } from '../audio/gameplay-audio.ts';
import { publicAsset, uiAudioAsset } from '../../lib/characters.ts';
import { LanguageSettings } from './language-settings';

const art = (name: string) => publicAsset(`ui-v2/audio-settings/${name}.png`);
function AudioArtSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId(),
    percent = Math.round(value * 100);
  return (
    <div className="audio-art-row">
      <label htmlFor={id}>
        {t(label)}
        <output htmlFor={id}>{t(percent)}{t("%")}</output>
      </label>
      <div
        className="audio-art-slider"
        data-value={percent}
        style={{ '--volume': percent / 100 } as CSSProperties}
      >
        <img
          className="audio-art-empty"
          src={art('slider-empty')}
          alt=""
          draggable={false}
        />
        <img
          className="audio-art-fill"
          src={art('slider-full')}
          alt=""
          draggable={false}
        />
        <img
          className="audio-art-knob"
          src={art('slider-knob')}
          alt=""
          draggable={false}
        />
        <input
          id={id}
          aria-label={t(`Volume ${label === 'SFX' ? 'SFX' : 'musik latar'}`)}
          aria-valuetext={t(`${percent}%`)}
          type="range"
          min="0"
          max="100"
          step="1"
          value={percent}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
        />
      </div>
    </div>
  );
}
export function AudioSettings({
  onOpen,
  trigger,
}: {
  onOpen?: () => void;
  trigger?: ReactNode;
}) {
  const [levels, setLevels] = useState(DEFAULT_AUDIO_LEVELS);
  const [sound, setSound] = useState<GameplaySound>('step');
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const details = useRef<HTMLDetailsElement | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const original = useRef<AudioLevels | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const sfx = useRef<GameplayAudio | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    music.current?.pause();
    music.current = null;
    window.dispatchEvent(
      new CustomEvent(MUSIC_PREVIEW_EVENT, { detail: false }),
    );
    setPreviewing(false);
  };
  const cleanupPreview = () => {
    stop();
    sfx.current?.close();
    sfx.current = null;
  };
  const close = (cancel = false) => {
    if (cancel && original.current) saveAudioLevels(original.current);
    original.current = null;
    cleanupPreview();
    if (dialog.current?.open) dialog.current.close();
    if (details.current) details.current.open = false;
    setOpen(false);
  };
  useEffect(() => {
    const update = () => {
      setLevels({ ...audioLevels() });
      if (music.current) music.current.volume = audioLevels().music;
    };
    update();
    window.addEventListener(AUDIO_SETTINGS_EVENT, update);
    return () => {
      cleanupPreview();
      window.removeEventListener(AUDIO_SETTINGS_EVENT, update);
    };
  }, []);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const panel = dialog.current;
    if (!panel.open) panel.showModal();
    return () => {
      if (panel.open) panel.close();
    };
  }, [open]);
  const previewMusic = () => {
    if (previewing) return stop();
    stop();
    setMessage('');
    const sample = new Audio(uiAudioAsset('ingame-music.mp3'));
    sample.volume = audioLevels().music;
    music.current = sample;
    window.dispatchEvent(
      new CustomEvent(MUSIC_PREVIEW_EVENT, { detail: true }),
    );
    setPreviewing(true);
    sample.onended = stop;
    void sample.play().catch(() => {
      if (music.current === sample) {
        stop();
        setMessage('Audio belum dapat diputar. Coba lagi.');
      }
    });
    timer.current = setTimeout(stop, 5000);
  };
  const previewSfx = async () => {
    setMessage('');
    try {
      sfx.current ??= new GameplayAudio();
      const player = sfx.current;
      await player.unlock();
      if (sfx.current === player && original.current)
        player.play(sound, sound === 'step' ? 0.8 : 1);
    } catch {
      setMessage('Efek suara belum dapat diputar. Coba lagi.');
    }
  };
  return (
    <>
      <details
        ref={details}
        className={`audio-settings${trigger ? ' image-trigger' : ''}`}
        onToggle={(event) => {
          if (event.target !== event.currentTarget) return;
          onOpen?.();
          if (event.currentTarget.open) {
            original.current ??= { ...audioLevels() };
            setLevels({ ...audioLevels() });
            setMessage('');
            setOpen(true);
          } else {
            original.current = null;
            cleanupPreview();
            setOpen(false);
          }
        }}
      >
        <summary
          aria-label={t("Pengaturan volume audio")}
          onKeyDown={(event) => event.stopPropagation()}
          onKeyUp={(event) => event.stopPropagation()}
        >
          {trigger && getLanguage()==='en' ? <span className="settings-wordmark">SETTINGS</span> : t(trigger ?? '♫ AUDIO')}
        </summary>
      </details>
      {t(open &&
        createPortal(
          <dialog
            ref={dialog}
            className="audio-settings-art-panel"
            aria-labelledby={titleId}
            onCancel={(event) => {
              event.preventDefault();
              close(true);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            onKeyUp={(event) => event.stopPropagation()}
          >
            <header className="audio-settings-art-header">
              <img src={art('header-panel')} alt="" draggable={false} />
              <h1 id={titleId}>{t("VOLUME AUDIO")}</h1>
            </header>
            <div className="audio-settings-art-card">
              <img
                className="audio-art-card-image"
                src={art('panel-card')}
                alt=""
                draggable={false}
              />
              <div className="audio-art-content">
                <AudioArtSlider
                  label={t("Musik latar")}
                  value={levels.music}
                  onChange={(music) =>
                    saveAudioLevels({ ...audioLevels(), music })
                  }
                />
                <AudioArtSlider
                  label={t("SFX")}
                  value={levels.sfx}
                  onChange={(sfx) => saveAudioLevels({ ...audioLevels(), sfx })}
                />
                <details
                  className="audio-art-preview"
                  onToggle={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      !event.currentTarget.open
                    )
                      cleanupPreview();
                  }}
                >
                  <summary>{t("PREVIEW AUDIO")}</summary>
                  <div>
                    <button type="button" onClick={previewMusic}>
                      {t(previewing
                        ? 'Hentikan preview'
                        : 'Dengar musik game · 5 detik')}
                    </button>
                    <select
                      aria-label={t("Efek suara untuk preview")}
                      value={sound}
                      onChange={(e) =>
                        setSound(e.target.value as GameplaySound)
                      }
                    >
                      {t(Object.entries({
                        step: 'Langkah',
                        dash: 'Dash',
                        tag: 'Tag berhasil',
                        caught: 'Tertangkap',
                        prison: 'Penjara',
                        rescued: 'Dibebaskan',
                        rescue: 'Membebaskan',
                        'fort-enter': 'Masuk benteng lawan',
                        'fort-captured': 'Benteng direbut',
                      }).map(([value, label]) => (
                        <option key={value} value={value}>
                          {t(label)}
                        </option>
                      )))}
                    </select>
                    <button type="button" onClick={() => void previewSfx()}>{t("Dengar SFX")}</button>
                    <small>{t("0% = senyap. Preview musik dapat didengar meski mute aktif. Pertandingan tetap berjalan.")}</small>
                    <small className="audio-art-helper">{t("Volume langsung diterapkan. BATAL mengembalikan nilai awal.")}</small>
                    <output aria-live="polite">{t(message)}</output>
                  </div>
                </details>
              </div>
              <div className="audio-settings-art-actions">
                <button type="button" onClick={() => close()}>
                  <img src={art('save-button')} alt="" />
                  <span>{t("SIMPAN")}</span>
                </button>
                <button type="button" onClick={() => close(true)}>
                  <img src={art('cancel-button')} alt="" />
                  <span>{t("BATAL")}</span>
                </button>
              </div>
            </div>
            <LanguageSettings />
          </dialog>,
          document.body,
        ))}
    </>
  );
}
