export const GRAPHICS_SETTINGS_EVENT = 'benteng-graphics-settings';
export const GRAPHICS_STORAGE_KEY = 'benteng-graphics-v1';
export const GRAPHICS_PRESETS = Object.freeze({
  high: Object.freeze({ label: 'Tinggi', maxDpr: 2, scale: 1, particleStride: 1, waterStride: 1 }),
  balanced: Object.freeze({ label: 'Seimbang', maxDpr: 1.5, scale: 1, particleStride: 2, waterStride: 2 }),
  low: Object.freeze({ label: 'Ringan', maxDpr: 1, scale: .75, particleStride: 3, waterStride: 4 }),
});
export const normalizeGraphics = value => Object.hasOwn(GRAPHICS_PRESETS, value) ? value : 'high';
export function graphicsPreset() {
  try { return normalizeGraphics(localStorage.getItem(GRAPHICS_STORAGE_KEY)); }
  catch { return 'high'; }
}
export function saveGraphicsPreset(value) {
  const preset = normalizeGraphics(value);
  try { localStorage.setItem(GRAPHICS_STORAGE_KEY, preset); } catch { /* Optional storage. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(GRAPHICS_SETTINGS_EVENT, { detail: preset }));
  return preset;
}
export function graphicsPixelRatio(preset, deviceRatio) {
  const ratio = Number.isFinite(deviceRatio) ? Math.max(1, deviceRatio) : 1;
  const settings = GRAPHICS_PRESETS[normalizeGraphics(preset)];
  return Math.min(settings.maxDpr, ratio) * settings.scale;
}
