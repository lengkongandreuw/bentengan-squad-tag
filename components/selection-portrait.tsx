'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { previewStyle } from '../lib/selection-preview-model';
import { selectionPreviewEntry, selectionPreviewReady, loadSelectionPreview } from '../lib/selection-preview-assets';
import { characterFullBodyPortrait, characterAsset, publicAsset, type CharacterId } from '../lib/characters';

/** Use this component in future selection layouts: do not duplicate manifest logic in page CSS. */
export function SelectionPortrait({ id, active, alt }: { id: CharacterId; active: boolean; alt: string }) {
  const entry = selectionPreviewEntry(id);
  const staticUrl = entry.static ? publicAsset(entry.static) : characterFullBodyPortrait(id);
  const animatedUrl = entry.animated ? publicAsset(entry.animated) : null;
  const [ready, setReady] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    change(); query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!active || reduced || !animatedUrl) return;
    let cancelled = false;
    void loadSelectionPreview(animatedUrl).then(() => { if (!cancelled) setReady(animatedUrl); }).catch(() => {
      if (!cancelled) setFailed(previous => [...previous, animatedUrl]);
    });
    return () => { cancelled = true; };
  }, [active, reduced, animatedUrl]);
  const desired = active && !reduced && animatedUrl && (ready === animatedUrl || selectionPreviewReady(animatedUrl)) ? animatedUrl : staticUrl;
  const source = [desired, staticUrl, characterAsset(id, 'portrait.webp')].find(url => !failed.includes(url));
  // Keep original inactive Boke/Kodo proportions; edited transform applies only to active preview.
  const inactiveScale = id === 'boke' ? 1.05 : id === 'kodo' ? 1.17 : 1;
  return <img data-character={id} data-selection-portrait="v1" src={source} alt={alt}
    loading={active ? 'eager' : 'lazy'} decoding="async"
    style={previewStyle(active ? entry : { ...entry, x: 0, y: 0, scale: inactiveScale }) as CSSProperties}
    onError={() => { if (source) setFailed(previous => [...previous, source]); }} />;
}
