export type CharacterId =
  | 'robot'
  | 'ciici'
  | 'kaka'
  | 'buto'
  | 'jago'
  | 'raja'
  | 'lala'
  | 'maria'
  | 'kumis'
  | 'boke'
  | 'tui'
  | 'lui'
  | 'bebe'
  | 'kodo';

export type CharacterRole =
  | 'Wall'
  | 'Rescuer'
  | 'Runner'
  | 'Chaser'
  | 'All-rounder'
  | 'Scout'
  | 'Disruptor';

export type CharacterDefinition = {
  id: CharacterId;
  name: string;
  role: CharacterRole;
  speed: number;
  boost: number;
  agility: number;
  visualScale: number;
  accent: string;
  copy: string;
  passiveName: string;
  passiveCopy: string;
  tagRange: number;
  rescueRange: number;
  boostMultiplier: number;
  boostDrain: number;
  baseChargeTime: number;
  rescueShieldMs: number;
  tagCooldownMs: number;
};

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: 'robot',
    name: 'Robot',
    role: 'Wall',
    speed: 198,
    boost: 118,
    agility: 0.9,
    visualScale: 1.04,
    accent: '#c99a58',
    copy: 'Baterai awet, jaga benteng jalan terus. Lawan mau lewat? Harus izin dulu.',
    passiveName: 'BIG CELL',
    passiveCopy: 'Boost habis 15% lebih lambat.',
    tagRange: 28,
    rescueRange: 32,
    boostMultiplier: 1.64,
    boostDrain: 26,
    baseChargeTime: .75,
    rescueShieldMs: 1500,
    tagCooldownMs: 500,
  },
  {
    id: 'ciici',
    name: 'Ciici',
    role: 'Rescuer',
    speed: 219,
    boost: 96,
    agility: 1.22,
    visualScale: 0.95,
    accent: '#d45a43',
    copy: 'Teman kena tag? Ciici cari celah. Sekali sentuh, satu rantai bebas.',
    passiveName: 'NIGHT PULL',
    passiveCopy: 'Jangkauan rescue lebih jauh. Rekan yang dibebaskan kebal tag 2,2 detik.',
    tagRange: 28,
    rescueRange: 42,
    boostMultiplier: 1.68,
    boostDrain: 31,
    baseChargeTime: .7,
    rescueShieldMs: 2200,
    tagCooldownMs: 500,
  },
  {
    id: 'kaka',
    name: 'Kaka',
    role: 'Runner',
    speed: 238,
    boost: 88,
    agility: 1.08,
    visualScale: 1,
    accent: '#33d36b',
    copy: 'Baru kelihatan, sudah di tikungan. Lari kencang, tapi jangan boros boost.',
    passiveName: 'Top Speed',
    passiveCopy: 'Lari dasar paling cepat, cadangan boost lebih kecil.',
    tagRange: 28,
    rescueRange: 32,
    boostMultiplier: 1.68,
    boostDrain: 31,
    baseChargeTime: .75,
    rescueShieldMs: 1500,
    tagCooldownMs: 500,
  },
  {
    id: 'buto',
    name: 'Buto',
    role: 'Wall',
    speed: 194,
    boost: 122,
    agility: 0.86,
    visualScale: 0.9,
    accent: '#82934b',
    copy: 'Buto jaga jalur. Lawan yang mau lewat mending pikir dua kali.',
    passiveName: 'Jangkauan Besar',
    passiveCopy: 'Jangkauan tag +21% dari jangkauan standar.',
    tagRange: 34,
    rescueRange: 32,
    boostMultiplier: 1.62,
    boostDrain: 31,
    baseChargeTime: .75,
    rescueShieldMs: 1500,
    tagCooldownMs: 500,
  },
  {
    id: 'jago',
    name: 'Jago',
    role: 'Chaser',
    speed: 229,
    boost: 92,
    agility: 1.14,
    visualScale: 1.2,
    accent: '#d92d43',
    copy: 'Lihat celah, langsung kejar. Jangan kasih lawan waktu buat pulang.',
    passiveName: 'Ledakan Kejar',
    passiveCopy: 'Boost paling kencang, tapi lebih cepat habis.',
    tagRange: 28,
    rescueRange: 32,
    boostMultiplier: 1.82,
    boostDrain: 34,
    baseChargeTime: .75,
    rescueShieldMs: 1500,
    tagCooldownMs: 500,
  },
  {
    id: 'raja',
    name: 'Raja',
    role: 'All-rounder',
    speed: 216,
    boost: 102,
    agility: 1.02,
    visualScale: 0.86,
    accent: '#55c932',
    copy: 'Jaga benteng bisa, buka serangan juga. Raja tahu kapan harus maju.',
    passiveName: 'Reposisi Cepat',
    passiveCopy: 'Waktu siap di benteng 27% lebih singkat.',
    tagRange: 28,
    rescueRange: 32,
    boostMultiplier: 1.68,
    boostDrain: 31,
    baseChargeTime: .55,
    rescueShieldMs: 1500,
    tagCooldownMs: 500,
  },
  {
    id: 'lala',
    name: 'Lala',
    role: 'Scout',
    speed: 224,
    boost: 100,
    agility: 1.24,
    visualScale: 1.16,
    accent: '#77b9df',
    copy: 'Lawan ambil jalan memutar? Lala pilih lewat rintangan.',
    passiveName: 'Langkah Sutra',
    passiveCopy: 'Parkour paling jauh dan paling hemat boost.',
    tagRange: 27,
    rescueRange: 34,
    boostMultiplier: 1.7,
    boostDrain: 30,
    baseChargeTime: .68,
    rescueShieldMs: 1700,
    tagCooldownMs: 500,
  },
  {
    id: 'maria',
    name: 'Maria',
    role: 'Chaser',
    speed: 232,
    boost: 94,
    agility: 1.12,
    visualScale: 0.99,
    accent: '#df8b49',
    copy: 'Satu kena, cari yang berikutnya. Maria jago menjaga tempo kejaran.',
    passiveName: 'Tempo Tag',
    passiveCopy: 'Jeda antar-tag 28% lebih singkat.',
    tagRange: 30,
    rescueRange: 32,
    boostMultiplier: 1.72,
    boostDrain: 32,
    baseChargeTime: .75,
    rescueShieldMs: 1500,
    tagCooldownMs: 360,
  },
  {
    id: 'kumis',
    name: 'Kumis',
    role: 'Wall',
    speed: 188,
    boost: 128,
    agility: 0.82,
    visualScale: 1.3,
    accent: '#e2554a',
    copy: 'Santai duduknya, lebar jangkauannya. Jangan lewat terlalu dekat.',
    passiveName: 'Benteng Hidup',
    passiveCopy: 'Cadangan boost terbesar dan jangkauan tag terluas.',
    tagRange: 36,
    rescueRange: 30,
    boostMultiplier: 1.58,
    boostDrain: 25,
    baseChargeTime: .8,
    rescueShieldMs: 1500,
    tagCooldownMs: 540,
  },
  {
    id: 'boke',
    name: 'Boke',
    role: 'Disruptor',
    speed: 202,
    boost: 116,
    agility: 0.88,
    visualScale: 1.05,
    accent: '#ef677c',
    copy: 'Lawan sudah rapi? Boke datang bikin barisan mereka buyar.',
    passiveName: 'Tag Kasar',
    passiveCopy: 'Jangkauan tag lebar, jeda antar-tag lebih singkat.',
    tagRange: 32,
    rescueRange: 31,
    boostMultiplier: 1.66,
    boostDrain: 29,
    baseChargeTime: .76,
    rescueShieldMs: 1500,
    tagCooldownMs: 410,
  },
  {
    id: 'tui',
    name: 'Tui',
    role: 'Runner',
    speed: 230,
    boost: 96,
    agility: 1.17,
    visualScale: 0.94,
    accent: '#ef3f43',
    copy: 'Yang lain baru ancang-ancang, Tui sudah tancap gas. Pas buat buka serangan.',
    passiveName: 'Start Meledak',
    passiveCopy: 'Sprint mencapai kecepatan puncak lebih cepat.',
    tagRange: 28,
    rescueRange: 32,
    boostMultiplier: 1.78,
    boostDrain: 32,
    baseChargeTime: .65,
    rescueShieldMs: 1500,
    tagCooldownMs: 480,
  },
  {
    id: 'lui',
    name: 'Lui',
    role: 'Scout',
    speed: 226,
    boost: 104,
    agility: 1.19,
    visualScale: 0.93,
    accent: '#42d875',
    copy: 'Jalur sempit bukan alasan berhenti. Lui cari celah, lalu melesat.',
    passiveName: 'Jalur Sunyi',
    passiveCopy: 'Sprint stabil, parkour mudah diarahkan.',
    tagRange: 28,
    rescueRange: 35,
    boostMultiplier: 1.72,
    boostDrain: 29,
    baseChargeTime: .68,
    rescueShieldMs: 1750,
    tagCooldownMs: 480,
  },
  {
    id: 'bebe',
    name: 'Bebe',
    role: 'Rescuer',
    speed: 218,
    boost: 110,
    agility: 1.1,
    visualScale: 0.96,
    accent: '#4eeaf2',
    copy: 'Kecil-kecil siap nolong. Bebe dan dronenya pantang tinggalin teman.',
    passiveName: 'Drone Penolong',
    passiveCopy: 'Jangkauan rescue lebih jauh. Rekan yang dibebaskan kebal tag lebih lama.',
    tagRange: 27,
    rescueRange: 41,
    boostMultiplier: 1.7,
    boostDrain: 29,
    baseChargeTime: .7,
    rescueShieldMs: 2150,
    tagCooldownMs: 490,
  },
  {
    id: 'kodo',
    name: 'Kodo',
    role: 'Wall',
    speed: 200,
    boost: 124,
    agility: .9,
    visualScale: 1.17,
    accent: '#f28a2d',
    copy: 'Kodo sudah nunggu di lorong. Cari jalan lain, atau siap kena tag.',
    passiveName: 'Ekor Penghadang',
    passiveCopy: 'Jangkauan tag lebar dengan cadangan boost yang awet.',
    tagRange: 35,
    rescueRange: 31,
    boostMultiplier: 1.62,
    boostDrain: 26,
    baseChargeTime: .78,
    rescueShieldMs: 1500,
    tagCooldownMs: 520,
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(
  CHARACTERS.map(character => [character.id, character]),
) as Record<CharacterId, CharacterDefinition>;

const DEDICATED_EAST_CHARACTERS = new Set<CharacterId>([
  'buto',
  'jago',
  'lala',
  'maria',
  'kumis',
  'boke',
  'tui',
  'lui',
  'bebe',
  'kodo',
]);

export const characterUsesDedicatedEast = (id: CharacterId) =>
  DEDICATED_EAST_CHARACTERS.has(id);

const publicBase = (
  (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
).replace(/\/?$/, '/');

const CHARACTER_PREVIEW_ICON_FILES: Record<CharacterId, string> = {
  robot: 'robot',
  ciici: 'ciici',
  kaka: 'kaka',
  buto: 'buto',
  jago: 'jago',
  raja: 'raja',
  lala: 'lala',
  maria: 'maria',
  kumis: 'kumis',
  boke: 'boke',
  tui: 'tui',
  lui: 'lui',
  bebe: 'bebe',
  kodo: 'kodo',
};

export const CHARACTER_PREVIEW_ICONS = Object.freeze(
  Object.fromEntries(
    Object.entries(CHARACTER_PREVIEW_ICON_FILES).map(([id, file]) => [
      id,
      `${publicBase}ui-v2/character-icons/${file}.webp?v=8`,
    ]),
  ) as Record<CharacterId, string>,
);

export const characterPreviewIcon = (id: CharacterId) =>
  CHARACTER_PREVIEW_ICONS[id];

export const characterFullBodyPortrait = (id: CharacterId) =>
  `${publicBase}ui-v2/portraits/${id}.webp?v=${
    id === 'boke' || id === 'kodo' ? 9 : 8
  }`;

export const rajaUltimateBannerAsset = () =>
  `${publicBase}ui-v2/skills/raja-titah-halilintar.webp?v=8`;

export const kakaUltimateBannerAsset = () =>
  `${publicBase}ui-v2/skills/kaka-perisai-hijau.webp?v=8`;

export const characterSelectionVideo = (faction: 'red' | 'green') =>
  `${publicBase}ui-v2/videos/team-${faction}.mp4?v=8`;

export const uiAudioAsset = (file: string) =>
  `${publicBase}ui-v2/audio/${file}?v=8`;

/**
 * Cache version sprite gameplay.
 *
 * Naikkan angka karakter setiap kali atlas/runtime/portrait/animations
 * karakter tersebut diganti.
 */
const CHARACTER_ASSET_VERSION: Record<CharacterId, number> = {
  robot: 10,
  ciici: 10,
  kaka: 9,
  buto: 9,
  jago: 10,
  raja: 9,
  lala: 10,
  maria: 9,
  kumis: 10,
  boke: 9,
  tui: 9,
  lui: 9,
  bebe: 9,
  kodo: 9,
};

export const characterAsset = (
  id: CharacterId,
  file: 'atlas.webp' | 'atlas-runtime.webp' | 'portrait.webp' | 'animations.json',
) =>
  `${publicBase}characters/${id}/${file}?v=${CHARACTER_ASSET_VERSION[id]}`;

export const characterRuntimeAsset = (id: CharacterId) =>
  characterAsset(id, 'atlas-runtime.webp');

export const kakaUltimateSpriteAsset = () =>
  `${publicBase}characters/kaka/ultimate-runtime.webp?v=1`;

export const publicAsset = (file: string) =>
  `${publicBase}${file.replace(/^\//, '')}`;
