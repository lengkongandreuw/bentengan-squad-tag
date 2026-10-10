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

export type UltimateKind = 'shield' | 'surge' | 'flight';
export type UltimateDescriptor = {
  kind: UltimateKind;
  name: string;
  shortLabel: string;
  hudTitle: string;
  buffText: string;
  bannerAlt: string;
  icon: 'shield' | 'zap';
  hudClass: string;
  shieldClass: string;
  actionClass: string;
  indicatorClass: string;
  bannerClass: string;
  trackEdge: string;
  trackFill: string;
  castBurst: string;
  castBeepHz: number;
  castMs: number;
  bannerMs: number;
  strip: boolean;
  castLog: string;
};

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
  mirrorWest: boolean;
  dedicatedEast: boolean;
  ultimate?: UltimateDescriptor;
};

import { createElement } from 'react';
import { Shield, Zap } from 'lucide-react';
import bebeData from '../config/characters/bebe.json' with { type: 'json' };
import bokeData from '../config/characters/boke.json' with { type: 'json' };
import butoData from '../config/characters/buto.json' with { type: 'json' };
import ciiciData from '../config/characters/ciici.json' with { type: 'json' };
import jagoData from '../config/characters/jago.json' with { type: 'json' };
import kakaData from '../config/characters/kaka.json' with { type: 'json' };
import kodoData from '../config/characters/kodo.json' with { type: 'json' };
import kumisData from '../config/characters/kumis.json' with { type: 'json' };
import lalaData from '../config/characters/lala.json' with { type: 'json' };
import luiData from '../config/characters/lui.json' with { type: 'json' };
import mariaData from '../config/characters/maria.json' with { type: 'json' };
import rajaData from '../config/characters/raja.json' with { type: 'json' };
import robotData from '../config/characters/robot.json' with { type: 'json' };
import tuiData from '../config/characters/tui.json' with { type: 'json' };

export const CHARACTERS: CharacterDefinition[] = [
  robotData as CharacterDefinition,
  ciiciData as CharacterDefinition,
  kakaData as CharacterDefinition,
  butoData as CharacterDefinition,
  jagoData as CharacterDefinition,
  rajaData as CharacterDefinition,
  lalaData as CharacterDefinition,
  mariaData as CharacterDefinition,
  kumisData as CharacterDefinition,
  bokeData as CharacterDefinition,
  tuiData as CharacterDefinition,
  luiData as CharacterDefinition,
  bebeData as CharacterDefinition,
  kodoData as CharacterDefinition,
];

export const CHARACTER_BY_ID = Object.fromEntries(
  CHARACTERS.map(character => [character.id, character]),
) as Record<CharacterId, CharacterDefinition>;

export const ULTIMATE_CHARACTER_IDS: ReadonlySet<CharacterId> = new Set(
  CHARACTERS.filter(character => character.ultimate).map(character => character.id),
);

export const characterUsesDedicatedEast = (id: CharacterId): boolean =>
  CHARACTER_BY_ID[id]?.dedicatedEast ?? false;

export const characterMirrorsWest = (id: CharacterId): boolean =>
  CHARACTER_BY_ID[id]?.mirrorWest ?? false;

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

export const ULTIMATE_ICONS = { shield: Shield, zap: Zap } as const;
export type UltimateIconId = keyof typeof ULTIMATE_ICONS;
export const ultimateIcon = (icon: UltimateIconId, size: number) =>
  createElement(ULTIMATE_ICONS[icon], { size });
export const ULTIMATE_BANNERS = {
  shield: kakaUltimateBannerAsset,
  zap: rajaUltimateBannerAsset,
} as const;

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
