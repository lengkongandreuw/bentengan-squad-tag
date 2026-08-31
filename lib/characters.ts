export type CharacterId = 'robot' | 'ciici' | 'kaka' | 'buto' | 'jago' | 'raja' | 'lala' | 'maria' | 'kumis' | 'boke' | 'tui' | 'lui';
export type CharacterRole = 'Guardian' | 'Rescuer' | 'Runner' | 'Chaser' | 'All-rounder' | 'Scout' | 'Disruptor';

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
  { id: 'robot', name: 'Robot', role: 'Guardian', speed: 198, boost: 118, agility: 0.9, visualScale: 1.04, accent: '#c99a58', copy: 'Penjaga stabil untuk patroli panjang dan menahan jalur pulang.', passiveName: 'Kapasitor Besar', passiveCopy: 'Boost terkuras 15% lebih lambat.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.64, boostDrain: 26, baseChargeTime: .75, rescueShieldMs: 1500, tagCooldownMs: 500 },
  { id: 'ciici', name: 'Ciici', role: 'Rescuer', speed: 219, boost: 96, agility: 1.22, visualScale: 0.95, accent: '#d45a43', copy: 'Spesialis menerobos penjara dan mengevakuasi seluruh rantai.', passiveName: 'Tangan Cepat', passiveCopy: 'Jangkauan rescue lebih luas; rekan kebal 2,2 detik.', tagRange: 28, rescueRange: 42, boostMultiplier: 1.68, boostDrain: 31, baseChargeTime: .7, rescueShieldMs: 2200, tagCooldownMs: 500 },
  { id: 'kaka', name: 'Kaka', role: 'Runner', speed: 238, boost: 88, agility: 1.08, visualScale: 1, accent: '#33d36b', copy: 'Pelari tercepat untuk rotasi, umpan, dan mengejar prioritas.', passiveName: 'Top Speed', passiveCopy: 'Kecepatan dasar tertinggi dengan cadangan boost pendek.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.68, boostDrain: 31, baseChargeTime: .75, rescueShieldMs: 1500, tagCooldownMs: 500 },
  { id: 'buto', name: 'Buto', role: 'Guardian', speed: 194, boost: 122, agility: 0.86, visualScale: 1.08, accent: '#82934b', copy: 'Benteng berjalan yang kuat menutup jalur dan menjaga penjara.', passiveName: 'Jangkauan Besar', passiveCopy: 'Kontak tangkap 21% lebih jauh dari karakter lain.', tagRange: 34, rescueRange: 32, boostMultiplier: 1.62, boostDrain: 31, baseChargeTime: .75, rescueShieldMs: 1500, tagCooldownMs: 500 },
  { id: 'jago', name: 'Jago', role: 'Chaser', speed: 229, boost: 92, agility: 1.14, visualScale: 1.02, accent: '#d92d43', copy: 'Pemburu agresif untuk menutup jarak sebelum target kembali.', passiveName: 'Ledakan Kejar', passiveCopy: 'Boost tercepat, tetapi menghabiskan energi lebih deras.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.82, boostDrain: 34, baseChargeTime: .75, rescueShieldMs: 1500, tagCooldownMs: 500 },
  { id: 'raja', name: 'Raja', role: 'All-rounder', speed: 216, boost: 102, agility: 1.02, visualScale: 1, accent: '#55c932', copy: 'Komandan fleksibel untuk berganti antara serang dan bertahan.', passiveName: 'Reposisi Cepat', passiveCopy: 'Persiapan keluar benteng 27% lebih singkat.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.68, boostDrain: 31, baseChargeTime: .55, rescueShieldMs: 1500, tagCooldownMs: 500 },
  { id: 'lala', name: 'Lala', role: 'Scout', speed: 224, boost: 100, agility: 1.24, visualScale: 1, accent: '#77b9df', copy: 'Pengintai lincah yang paling mudah menembus jalur rintangan.', passiveName: 'Langkah Sutra', passiveCopy: 'Parkour terjauh dengan biaya boost paling ringan.', tagRange: 27, rescueRange: 34, boostMultiplier: 1.7, boostDrain: 30, baseChargeTime: .68, rescueShieldMs: 1700, tagCooldownMs: 500 },
  { id: 'maria', name: 'Maria', role: 'Chaser', speed: 232, boost: 94, agility: 1.12, visualScale: 1.01, accent: '#df8b49', copy: 'Pemburu cepat yang efektif mengunci target secara beruntun.', passiveName: 'Tempo Tag', passiveCopy: 'Cooldown setelah menangkap 28% lebih singkat.', tagRange: 30, rescueRange: 32, boostMultiplier: 1.72, boostDrain: 32, baseChargeTime: .75, rescueShieldMs: 1500, tagCooldownMs: 360 },
  { id: 'kumis', name: 'Kumis', role: 'Guardian', speed: 188, boost: 128, agility: 0.82, visualScale: 1.1, accent: '#e2554a', copy: 'Penjaga terbesar dengan daya tahan dan wilayah tangkap luas.', passiveName: 'Benteng Hidup', passiveCopy: 'Boost terbesar dan jangkauan tangkap terluas.', tagRange: 36, rescueRange: 30, boostMultiplier: 1.58, boostDrain: 25, baseChargeTime: .8, rescueShieldMs: 1500, tagCooldownMs: 540 },
  { id: 'boke', name: 'Boke', role: 'Disruptor', speed: 202, boost: 116, agility: 0.88, visualScale: 1.08, accent: '#ef677c', copy: 'Pengacau garis depan yang kuat memecah formasi lawan.', passiveName: 'Tag Kasar', passiveCopy: 'Jangkauan besar dengan recovery tag lebih cepat.', tagRange: 32, rescueRange: 31, boostMultiplier: 1.66, boostDrain: 29, baseChargeTime: .76, rescueShieldMs: 1500, tagCooldownMs: 410 },
  { id: 'tui', name: 'Tui', role: 'Runner', speed: 230, boost: 96, agility: 1.17, visualScale: 1, accent: '#ef3f43', copy: 'Sprinter Tim Merah dengan akselerasi kuat untuk membuka serangan.', passiveName: 'Start Meledak', passiveCopy: 'Sprint Space mencapai kecepatan puncak lebih cepat.', tagRange: 28, rescueRange: 32, boostMultiplier: 1.78, boostDrain: 32, baseChargeTime: .65, rescueShieldMs: 1500, tagCooldownMs: 480 },
  { id: 'lui', name: 'Lui', role: 'Scout', speed: 226, boost: 104, agility: 1.19, visualScale: .98, accent: '#42d875', copy: 'Pengintai Tim Hijau yang unggul menyelinap melalui jalur sempit.', passiveName: 'Jalur Sunyi', passiveCopy: 'Sprint stabil dengan kendali parkour yang presisi.', tagRange: 28, rescueRange: 35, boostMultiplier: 1.72, boostDrain: 29, baseChargeTime: .68, rescueShieldMs: 1750, tagCooldownMs: 480 },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map(character => [character.id, character])) as Record<CharacterId, CharacterDefinition>;
const DEDICATED_EAST_CHARACTERS = new Set<CharacterId>(['buto', 'jago', 'lala', 'maria', 'kumis', 'boke', 'tui', 'lui']);
export const characterUsesDedicatedEast = (id: CharacterId) => DEDICATED_EAST_CHARACTERS.has(id);

const publicBase = ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(/\/?$/, '/');

export const characterAsset = (id: CharacterId, file: 'atlas.webp' | 'portrait.webp' | 'animations.json') =>
  `${publicBase}characters/${id}/${file}`;

export const publicAsset = (file: string) => `${publicBase}${file.replace(/^\//, '')}`;
