'use client';
import { useEffect, useState } from 'react';
import { publicAsset } from '../lib/characters';

const sourceArena = (id: string) => id === 'kampung3d' ? 'kampung' : id;
export const arenaImage = (id: string) => publicAsset(`arena-ui/${sourceArena(id)}.webp?v=1`);
export const arenaVideo = (id: string) => publicAsset(`arena-ui/${sourceArena(id)}.mp4?v=1`);

export function ArenaBackdrop({ id, video = false, onEnded }: {
  id: string; video?: boolean; onEnded?: () => void;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return <div className="arena-backdrop" aria-hidden="true">
    <img key={`${id}-image`} src={arenaImage(id)} alt="" fetchPriority="high" />
    {video && !reducedMotion && !failed && <video key={`${id}-video`} src={arenaVideo(id)}
      poster={arenaImage(id)} autoPlay muted playsInline preload="auto"
      loop={!onEnded} onEnded={onEnded} onError={() => setFailed(true)} />}
    <div className="arena-backdrop-shade" />
  </div>;
}
