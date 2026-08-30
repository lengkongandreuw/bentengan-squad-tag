export type CharacterId = 'robot' | 'ciici' | 'kaka' | 'buto' | 'jago' | 'raja';
export type CharacterRole = 'Guardian' | 'Rescuer' | 'Runner' | 'Chaser' | 'All-rounder';

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
};

export const CHARACTERS: CharacterDefinition[] = [
  { id: 'robot', name: 'Robot', role: 'Guardian', speed: 198, boost: 118, agility: 0.9, visualScale: 1.04, accent: '#c99a58', copy: 'Penjaga stabil untuk patroli panjang dan menahan jalur pulang.', passiveName: 'Kapasitor Besar', passiveCopy: 'Boost terkuras 15% lebih lambat.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.64, boostDrain: 26, baseChargeTime: .75, rescueShieldMs: 1500 },
  { id: 'ciici', name: 'Ciici', role: 'Rescuer', speed: 219, boost: 96, agility: 1.22, visualScale: 0.95, accent: '#d45a43', copy: 'Spesialis menerobos penjara dan mengevakuasi seluruh rantai.', passiveName: 'Tangan Cepat', passiveCopy: 'Jangkauan rescue lebih luas; rekan kebal 2,2 detik.', tagRange: 28, rescueRange: 42, boostMultiplier: 1.68, boostDrain: 31, baseChargeTime: .7, rescueShieldMs: 2200 },
  { id: 'kaka', name: 'Kaka', role: 'Runner', speed: 238, boost: 88, agility: 1.08, visualScale: 1, accent: '#33d36b', copy: 'Pelari tercepat untuk rotasi, umpan, dan mengejar prioritas.', passiveName: 'Top Speed', passiveCopy: 'Kecepatan dasar tertinggi dengan cadangan boost pendek.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.68, boostDrain: 31, baseChargeTime: .75, rescueShieldMs: 1500 },
  { id: 'buto', name: 'Buto', role: 'Guardian', speed: 194, boost: 122, agility: 0.86, visualScale: 1.08, accent: '#82934b', copy: 'Benteng berjalan yang kuat menutup jalur dan menjaga penjara.', passiveName: 'Jangkauan Besar', passiveCopy: 'Kontak tangkap 21% lebih jauh dari karakter lain.', tagRange: 34, rescueRange: 32, boostMultiplier: 1.62, boostDrain: 31, baseChargeTime: .75, rescueShieldMs: 1500 },
  { id: 'jago', name: 'Jago', role: 'Chaser', speed: 229, boost: 92, agility: 1.14, visualScale: 1.02, accent: '#d92d43', copy: 'Pemburu agresif untuk menutup jarak sebelum target kembali.', passiveName: 'Ledakan Kejar', passiveCopy: 'Boost tercepat, tetapi menghabiskan energi lebih deras.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.82, boostDrain: 34, baseChargeTime: .75, rescueShieldMs: 1500 },
  { id: 'raja', name: 'Raja', role: 'All-rounder', speed: 216, boost: 102, agility: 1.02, visualScale: 1, accent: '#55c932', copy: 'Komandan fleksibel untuk berganti antara serang dan bertahan.', passiveName: 'Reposisi Cepat', passiveCopy: 'Persiapan keluar benteng 27% lebih singkat.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.68, boostDrain: 31, baseChargeTime: .55, rescueShieldMs: 1500 },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map(character => [character.id, character])) as Record<CharacterId, CharacterDefinition>;

const publicBase = ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(/\/?$/, '/');

export const characterAsset = (id: CharacterId, file: 'atlas.webp' | 'portrait.webp' | 'animations.json') =>
  `${publicBase}characters/${id}/${file}`;

export const publicAsset = (file: string) => `${publicBase}${file.replace(/^\//, '')}`;
