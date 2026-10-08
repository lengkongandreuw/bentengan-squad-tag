export const GRAPHICS_SETTINGS_EVENT = 'benteng-graphics-settings';
export const GRAPHICS_STORAGE_KEY = 'benteng-graphics-v1';
export const GRAPHICS_PRESETS = Object.freeze({
  // Auto keeps full effects and only adapts canvas resolution (see nextAutoPixelRatio).
  auto: Object.freeze({ label: 'Otomatis', maxDpr: 2, scale: 1, particleStride: 1, waterStride: 1 }),
  high: Object.freeze({ label: 'Tinggi', maxDpr: 2, scale: 1, particleStride: 1, waterStride: 1 }),
  balanced: Object.freeze({ label: 'Seimbang', maxDpr: 1.5, scale: 1, particleStride: 2, waterStride: 2 }),
  low: Object.freeze({ label: 'Ringan', maxDpr: 1, scale: .75, particleStride: 3, waterStride: 4 }),
});
export const DEFAULT_GRAPHICS = 'auto';
export const AUTO_PIXEL_RATIO = Object.freeze({ min: .6, step: .1, slowFrameMs: 20, fastWorkMs: 12, windowMs: 2000 });
export const normalizeGraphics = value => typeof value === 'string' && Object.hasOwn(GRAPHICS_PRESETS, value) ? value : DEFAULT_GRAPHICS;
export function graphicsPreset() {
  try { return normalizeGraphics(localStorage.getItem(GRAPHICS_STORAGE_KEY)); }
  catch { return DEFAULT_GRAPHICS; }
}
export function saveGraphicsPreset(value) {
  const preset = normalizeGraphics(value);
  try { localStorage.setItem(GRAPHICS_STORAGE_KEY, preset); } catch { /* Optional storage. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(GRAPHICS_SETTINGS_EVENT, { detail: preset }));
  return preset;
}
const deviceRatioOf = deviceRatio => Number.isFinite(deviceRatio) ? Math.max(1, deviceRatio) : 1;
/** Highest ratio auto may climb to on this display. */
export const autoMaxPixelRatio = deviceRatio => Math.min(GRAPHICS_PRESETS.auto.maxDpr, deviceRatioOf(deviceRatio));
/** Auto starts like Seimbang on HiDPI and like Tinggi on 1× displays. */
export function autoInitialPixelRatio(deviceRatio) {
  const ratio = deviceRatioOf(deviceRatio);
  return ratio > 1 ? Math.min(GRAPHICS_PRESETS.balanced.maxDpr, ratio) : 1;
}
/**
 * One adaptive step, evaluated once per AUTO_PIXEL_RATIO.windowMs. Slow frames lower
 * resolution; frames with spare budget raise it, never beyond the display ratio.
 */
export function nextAutoPixelRatio(current, avgFrameMs, avgWorkMs, deviceRatio) {
  const max = autoMaxPixelRatio(deviceRatio), { min, step, slowFrameMs, fastWorkMs } = AUTO_PIXEL_RATIO;
  const value = Number.isFinite(current) ? Math.min(max, Math.max(min, current)) : autoInitialPixelRatio(deviceRatio);
  const round = n => Math.round(n * 100) / 100;
  if (avgFrameMs > slowFrameMs) return round(Math.max(min, value - step));
  if (avgWorkMs < fastWorkMs && avgFrameMs <= slowFrameMs) return round(Math.min(max, value + step));
  return value;
}
export function graphicsPixelRatio(preset, deviceRatio, autoRatio) {
  const ratio = deviceRatioOf(deviceRatio);
  const name = normalizeGraphics(preset);
  if (name === 'auto') return Number.isFinite(autoRatio) ? Math.min(autoMaxPixelRatio(ratio), Math.max(AUTO_PIXEL_RATIO.min, autoRatio)) : autoInitialPixelRatio(ratio);
  const settings = GRAPHICS_PRESETS[name];
  return Math.min(settings.maxDpr, ratio) * settings.scale;
}
