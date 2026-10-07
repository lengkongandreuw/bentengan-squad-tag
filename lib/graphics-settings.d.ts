export type GraphicsPreset = 'high' | 'balanced' | 'low';
export const GRAPHICS_SETTINGS_EVENT: string;
export const GRAPHICS_STORAGE_KEY: string;
export const GRAPHICS_PRESETS: Record<GraphicsPreset, {label:string;maxDpr:number;scale:number;particleStride:number;waterStride:number}>;
export function normalizeGraphics(value: unknown): GraphicsPreset;
export function graphicsPreset(): GraphicsPreset;
export function saveGraphicsPreset(value: unknown): GraphicsPreset;
export function graphicsPixelRatio(preset: unknown, deviceRatio: number): number;
