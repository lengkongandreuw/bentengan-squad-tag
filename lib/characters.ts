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
};

export const CHARACTERS: CharacterDefinition[] = [
  { id: 'robot', name: 'Robot', role: 'Guardian', speed: 198, boost: 118, agility: 0.9, visualScale: 1.04, accent: '#c99a58', copy: 'Pertahanan kukuh dan cadangan boost terbesar.' },
  { id: 'ciici', name: 'Ciici', role: 'Rescuer', speed: 219, boost: 96, agility: 1.22, visualScale: 0.95, accent: '#d45a43', copy: 'Lincah menerobos jalur untuk memutus rantai penjara.' },
  { id: 'kaka', name: 'Kaka', role: 'Runner', speed: 238, boost: 88, agility: 1.08, visualScale: 0.98, accent: '#33d36b', copy: 'Pelari tercepat untuk rotasi dan mengejar prioritas.' },
  { id: 'buto', name: 'Buto', role: 'Guardian', speed: 194, boost: 122, agility: 0.86, visualScale: 1.08, accent: '#82934b', copy: 'Penjaga benteng bertenaga besar dan sulit dilewati.' },
  { id: 'jago', name: 'Jago', role: 'Chaser', speed: 229, boost: 92, agility: 1.14, visualScale: 1.02, accent: '#d92d43', copy: 'Pemburu agresif dengan akselerasi tajam.' },
  { id: 'raja', name: 'Raja', role: 'All-rounder', speed: 216, boost: 102, agility: 1.02, visualScale: 0.96, accent: '#55c932', copy: 'Seimbang untuk membaca arena dan mengisi semua peran.' },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map(character => [character.id, character])) as Record<CharacterId, CharacterDefinition>;

const publicBase = ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(/\/?$/, '/');

export const characterAsset = (id: CharacterId, file: 'atlas.webp' | 'portrait.webp' | 'animations.json') =>
  `${publicBase}characters/${id}/${file}`;

export const publicAsset = (file: string) => `${publicBase}${file.replace(/^\//, '')}`;
