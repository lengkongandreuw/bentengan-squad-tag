'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS, CharacterId, characterAsset } from '../lib/characters';
import { ChevronLeft, Download, Grid3X3, Pause, Play, Upload } from 'lucide-react';

type Direction = 'south' | 'west' | 'east' | 'north';
type AnimationName = 'idle' | 'run' | 'boost' | 'tag' | 'rescue' | 'prisoner' | 'victory' | 'defeat';

const animationOptions: Array<{ id: AnimationName; label: string }> = [
  { id: 'idle', label: 'Idle' }, { id: 'run', label: 'Run' }, { id: 'boost', label: 'Boost' },
  { id: 'tag', label: 'Tag' }, { id: 'rescue', label: 'Rescue' }, { id: 'prisoner', label: 'Prisoner' },
  { id: 'victory', label: 'Victory' }, { id: 'defeat', label: 'Defeat' },
];

const sequenceFor = (animation: AnimationName, direction: Direction) => {
  if (animation === 'idle') return { row: direction === 'north' ? 2 : direction === 'south' ? 0 : 1, columns: [0] };
  if (animation === 'run') return { row: direction === 'north' ? 2 : direction === 'south' ? 0 : 1, columns: [1, 2, 3, 4, 5, 6] };
  if (animation === 'boost') return { row: direction === 'north' ? 2 : direction === 'south' ? 0 : 1, columns: [7] };
  if (animation === 'tag') return { row: 3, columns: [0, 1, 2, 3] };
  if (animation === 'rescue') return { row: 3, columns: [4, 5, 6, 7] };
  if (animation === 'prisoner') return { row: 4, columns: [0, 1] };
  if (animation === 'victory') return { row: 4, columns: [2, 3, 4] };
  return { row: 4, columns: [5, 6, 7] };
};

export function CharacterWorkshop({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedId, setSelectedId] = useState<CharacterId>('kaka');
  const [animation, setAnimation] = useState<AnimationName>('run');
  const [direction, setDirection] = useState<Direction>('south');
  const [playing, setPlaying] = useState(true);
  const [fps, setFps] = useState(10);
  const [scale, setScale] = useState(100);
  const [anchorX, setAnchorX] = useState(50);
  const [anchorY, setAnchorY] = useState(91);
  const [showSheet, setShowSheet] = useState(false);
  const [customUrl, setCustomUrl] = useState<string>();
  const [customName, setCustomName] = useState<string>();
  const selected = CHARACTERS.find(character => character.id === selectedId) ?? CHARACTERS[0];
  const atlasUrl = customUrl ?? characterAsset(selected.id, 'atlas.webp');
  const sequence = useMemo(() => sequenceFor(animation, direction), [animation, direction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = new Image();
    image.src = atlasUrl;
    let raf = 0;
    const render = (now: number) => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const width = rect.width, height = rect.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#141b16'; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y < height; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      const groundY = height * .76;
      ctx.strokeStyle = '#b9ee3d55'; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(24, groundY); ctx.lineTo(width - 24, groundY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#b9ee3d'; ctx.font = '800 9px Arial'; ctx.textAlign = 'left'; ctx.fillText(`ANCHOR ${anchorX}% / ${anchorY}%`, 24, groundY + 18);
      if (image.complete && image.naturalWidth) {
        const frameIndex = playing ? Math.floor(now / (1000 / fps)) % sequence.columns.length : 0;
        const column = sequence.columns[frameIndex];
        const sourceLeft = Math.round(column * image.naturalWidth / 8);
        const sourceTop = Math.round(sequence.row * image.naturalHeight / 5);
        const sourceRight = Math.round((column + 1) * image.naturalWidth / 8);
        const sourceBottom = Math.round((sequence.row + 1) * image.naturalHeight / 5);
        const sourceWidth = sourceRight - sourceLeft, sourceHeight = sourceBottom - sourceTop;
        const drawHeight = Math.min(height * .68, 268) * scale / 100 * selected.visualScale;
        const drawWidth = drawHeight * sourceWidth / sourceHeight;
        const centerX = width * anchorX / 100;
        ctx.save();
        if (direction === 'east' && sequence.row === 1) { ctx.translate(centerX * 2, 0); ctx.scale(-1, 1); }
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, sourceLeft, sourceTop, sourceWidth, sourceHeight, centerX - drawWidth / 2, groundY - drawHeight * anchorY / 100, drawWidth, drawHeight);
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(centerX, groundY + 4, drawWidth * .22, 8, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#d9d0be'; ctx.font = '700 13px Arial'; ctx.textAlign = 'center'; ctx.fillText('Memuat atlas…', width / 2, height / 2);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [atlasUrl, sequence, direction, playing, fps, scale, anchorX, anchorY, selected.visualScale]);

  useEffect(() => () => { if (customUrl) URL.revokeObjectURL(customUrl); }, [customUrl]);

  const upload = (file?: File) => {
    if (!file) return;
    if (customUrl) URL.revokeObjectURL(customUrl);
    setCustomUrl(URL.createObjectURL(file)); setCustomName(file.name); setShowSheet(false);
  };

  const exportConfig = () => {
    const config = { character: customName ?? selected.id, grid: { columns: 8, rows: 5 }, anchor: { x: anchorX / 100, y: anchorY / 100 }, preview: { animation, direction, fps, scale: scale / 100 } };
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `${selected.id}-workshop.json`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="workshop-shell" aria-label="Bentengan Character Workshop">
      <header className="workshop-head">
        <div><span>Asset pipeline · 8×5 grid</span><h1>Character Workshop</h1><p>Audit frame, anchor, skala, dan animasi sebelum masuk ke arena.</p></div>
        <button className="workshop-back" onClick={onClose}><ChevronLeft size={17} /> Kembali ke game</button>
      </header>
      <div className="workshop-layout">
        <aside className="workshop-roster">
          <b>ROSTER · 6 KARAKTER</b>
          <div>{CHARACTERS.map(character => <button key={character.id} className={selectedId === character.id && !customUrl ? 'selected' : ''} onClick={() => { setSelectedId(character.id); setCustomUrl(undefined); setCustomName(undefined); }}><img src={characterAsset(character.id, 'portrait.webp')} alt="" /><span><strong>{character.name}</strong><small>{character.role}</small></span></button>)}</div>
          <label className="upload-sprite"><Upload size={16} /><span>Uji sprite baru<small>PNG transparan · grid 8×5</small></span><input type="file" accept="image/png,image/webp" onChange={event => upload(event.target.files?.[0])} /></label>
        </aside>
        <div className="workshop-stage">
          <div className="workshop-stagebar"><span><i style={{ background: selected.accent }} />{customName ?? `${selected.name} · ${selected.role}`}</span><button onClick={() => setShowSheet(value => !value)}><Grid3X3 size={15} /> {showSheet ? 'Preview' : 'Lihat sheet'}</button></div>
          {showSheet ? <div className="sheet-audit"><img src={atlasUrl} alt={`Sprite sheet ${selected.name}`} /><span className="grid-overlay" /></div> : <canvas ref={canvasRef} />}
          <div className="arena-scale"><img src={characterAsset(selected.id, 'portrait.webp')} alt="" /><span>Preview portrait otomatis</span><b>48–64 px arena target</b></div>
        </div>
        <aside className="workshop-controls">
          <div className="control-title"><span>ANIMATION LAB</span><button onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Jeda animasi' : 'Putar animasi'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button></div>
          <label>Animasi<select value={animation} onChange={event => setAnimation(event.target.value as AnimationName)}>{animationOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label>Arah<select value={direction} onChange={event => setDirection(event.target.value as Direction)}><option value="south">Selatan / depan</option><option value="west">Barat / kiri</option><option value="east">Timur / mirror</option><option value="north">Utara / belakang</option></select></label>
          <label>Kecepatan <output>{fps} fps</output><input type="range" min="4" max="16" value={fps} onChange={event => setFps(Number(event.target.value))} /></label>
          <label>Skala <output>{scale}%</output><input type="range" min="70" max="130" value={scale} onChange={event => setScale(Number(event.target.value))} /></label>
          <label>Anchor X <output>{anchorX}%</output><input type="range" min="35" max="65" value={anchorX} onChange={event => setAnchorX(Number(event.target.value))} /></label>
          <label>Anchor Y <output>{anchorY}%</output><input type="range" min="75" max="100" value={anchorY} onChange={event => setAnchorY(Number(event.target.value))} /></label>
          <button className="export-config" onClick={exportConfig}><Download size={16} /> Export konfigurasi</button>
          <p><b>Pipeline aktif.</b> File produksi sudah memiliki atlas WebP, portrait, dan metadata animasi.</p>
        </aside>
      </div>
    </section>
  );
}
