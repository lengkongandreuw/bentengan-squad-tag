import type { CharacterId } from '../../lib/characters.ts';

// Media elements are imperative browser resources, not React state.
export function stopVoiceLayerPlayback(layers: Array<{ audio: Pick<HTMLAudioElement, 'pause' | 'currentTime'> }>) {
  for (const { audio } of layers) { audio.pause(); audio.currentTime = 0; }
}

export function characterVoiceLayerAssets(
  layers: Array<{ file: string | null; volume: number; loop: boolean; enabled: boolean }>,
  resolveAsset: (file: string) => string,
) {
  return layers.filter(layer => layer.enabled && layer.file).map(layer => ({
    src: resolveAsset(layer.file!), volume: layer.volume, loop: layer.loop,
  }));
}

export const CHARACTER_VOICE_FILES: Partial<Record<CharacterId, string>> = {
  bebe: 'characters/bebe.mp3',
  kodo: 'characters/kodo.mp3',
  maria: 'characters/maria.mp3',
  tui: 'characters/tui.mp3',
  lui: 'characters/lui.mp3',
  raja: 'characters/raja.mp3',
  kaka: 'characters/kaka.mp3',
  jago: 'characters/jago.mp3',
  lala: 'characters/lala.mp3',
  buto: 'characters/buto.mp3',
  boke: 'characters/boke.mp3',
  kumis: 'characters/kumis.mp3',
  robot: 'characters/robot.mp3',
  ciici: 'characters/ciici.mp3',
};

export const characterVoiceAsset = (
  id: CharacterId,
  resolveAsset: (file: string) => string,
  voiceOverride: string | null = null,
  resolvePublicAsset: (file: string) => string = resolveAsset,
) => {
  if (!CHARACTER_VOICE_FILES[id]) return null;
  if (voiceOverride) return resolvePublicAsset(voiceOverride);
  const file = CHARACTER_VOICE_FILES[id];
  return file ? resolveAsset(file) : null;
};
