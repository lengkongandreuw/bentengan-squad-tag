'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { audioLevels, saveAudioLevels, DEFAULT_AUDIO_LEVELS, AUDIO_SETTINGS_EVENT, MUSIC_PREVIEW_EVENT } from '../lib/audio-settings';
import { GameplayAudio, type GameplaySound } from '../lib/gameplay-audio';
import { uiAudioAsset } from '../lib/characters';

export function AudioSettings({ onOpen, trigger }: { onOpen?: () => void; trigger?: ReactNode }) {
  const [levels, setLevels] = useState(DEFAULT_AUDIO_LEVELS);
  const [sound, setSound] = useState<GameplaySound>('step');
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState('');
  const music = useRef<HTMLAudioElement | null>(null);
  const sfx = useRef<GameplayAudio | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    music.current?.pause(); music.current = null;
    window.dispatchEvent(new CustomEvent(MUSIC_PREVIEW_EVENT, { detail: false }));
    setPreviewing(false);
  };
  useEffect(() => {
    const update = () => {
      setLevels({ ...audioLevels() });
      if (music.current) music.current.volume = audioLevels().music;
    };
    update(); window.addEventListener(AUDIO_SETTINGS_EVENT, update);
    return () => { stop(); sfx.current?.close(); window.removeEventListener(AUDIO_SETTINGS_EVENT, update); };
  }, []);
  const previewMusic = () => {
    if (previewing) return stop();
    stop(); setMessage('');
    const sample = new Audio(uiAudioAsset('ingame-music.mp3'));
    sample.volume = audioLevels().music; music.current = sample;
    window.dispatchEvent(new CustomEvent(MUSIC_PREVIEW_EVENT, { detail: true }));
    setPreviewing(true); sample.onended = stop;
    void sample.play().catch(() => { if (music.current === sample) { stop(); setMessage('Audio belum dapat diputar. Coba lagi.'); } });
    timer.current = setTimeout(stop, 5000);
  };
  return <details className={`audio-settings${trigger ? ' image-trigger' : ''}`} onToggle={event => {
    onOpen?.();
    if (!event.currentTarget.open) { stop(); sfx.current?.close(); sfx.current = null; }
  }} onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
    <summary aria-label="Pengaturan volume audio">{trigger ?? '♫ AUDIO'}</summary>
    <div className="audio-settings-panel">
      <b>VOLUME AUDIO</b>
      <label>Musik latar <output>{Math.round(levels.music * 100)}%</output>
        <input aria-label="Volume musik latar" type="range" min="0" max="100" value={Math.round(levels.music * 100)} onChange={e => saveAudioLevels({ ...levels, music: Number(e.target.value) / 100 })} />
      </label>
      <button onClick={previewMusic}>{previewing ? 'Hentikan preview' : 'Dengar musik game · 5 detik'}</button>
      <label>SFX <output>{Math.round(levels.sfx * 100)}%</output>
        <input aria-label="Volume SFX" type="range" min="0" max="100" value={Math.round(levels.sfx * 100)} onChange={e => saveAudioLevels({ ...levels, sfx: Number(e.target.value) / 100 })} />
      </label>
      <select aria-label="Efek suara untuk preview" value={sound} onChange={e => setSound(e.target.value as GameplaySound)}>
        {Object.entries({ step:'Langkah', dash:'Dash', tag:'Tag berhasil', caught:'Tertangkap', prison:'Penjara', rescued:'Dibebaskan', rescue:'Membebaskan', 'fort-enter':'Masuk benteng lawan', 'fort-captured':'Benteng direbut' }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button onClick={async () => { sfx.current ??= new GameplayAudio(); const player = sfx.current; await player.unlock(); player.play(sound, sound === 'step' ? .8 : 1); }}>Dengar SFX</button>
      <small>0% = senyap. Preview musik dapat didengar meski mute aktif. Pertandingan tetap berjalan.</small>
      <small role="status">{message}</small>
    </div>
  </details>;
}
