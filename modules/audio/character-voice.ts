import type { CharacterId } from '../../lib/characters.ts';

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
) => {
  const file = CHARACTER_VOICE_FILES[id];
  return file ? resolveAsset(file) : null;
};
