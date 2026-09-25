import settings from '../config/selection-previews.json';
import { previewEntry } from './selection-preview-model';
import { publicAsset, type CharacterId } from './characters';
import { imageReady } from './asset-ready';

// Retain decoded image references for the whole selection session. Both loading
// gate and portrait renderer consult this cache, avoiding a second lazy-load gap.
const ready = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();
export const selectionPreviewReady = (url: string) => ready.has(url);
export const selectionPreviewEntry = (id: CharacterId) => previewEntry(settings, id);
export function selectionPreviewUrls(id: CharacterId): string[] {
  const entry = selectionPreviewEntry(id);
  return [entry.static, entry.animated].filter(Boolean).map(file => publicAsset(file));
}
export function loadSelectionPreview(url: string): Promise<void> {
  if (ready.has(url)) return Promise.resolve();
  const existing = pending.get(url);
  if (existing) return existing;
  const image = new Image();
  image.src = url;
  const promise = imageReady(image, 90000).then(() => { ready.set(url, image); }).finally(() => { pending.delete(url); });
  pending.set(url, promise);
  return promise;
}
