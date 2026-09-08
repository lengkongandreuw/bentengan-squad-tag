'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  BatteryCharging,
  Check,
  Flag,
  Gauge,
  Lock,
  LogOut,
  Map as MapIcon,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Users,
  Volume2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { CharacterWorkshop } from '../components/character-workshop';
import {
  CHARACTER_BY_ID,
  CharacterId,
  characterAsset,
  characterFullBodyPortrait,
  characterPreviewIcon,
  characterRuntimeAsset,
  characterSelectionVideo,
  characterUsesDedicatedEast,
  kakaUltimateBannerAsset,
  kakaUltimateSpriteAsset,
  publicAsset,
  rajaUltimateBannerAsset,
  uiAudioAsset,
} from '../lib/characters';
import { characterAnimationMapping } from '../lib/character-animation.js';
import {
  FIELD_ANIMATED_ATLAS,
  FIELD_ASSET_VERSION,
  FIELD_GROUND_ATLAS,
  FIELD_OBJECT_ATLAS,
  FieldAnimatedId,
  FieldAssetId,
  GroundTileId,
} from '../lib/field-assets.generated';
import {
  directionFromVelocity,
  directionalRow,
  shouldMirrorSprite,
  sprintEffectRotation,
} from '../lib/sprite-motion.js';
import { fieldCycleDecision } from '../lib/field-cycle.js';
import { sweptContactDistance } from '../lib/tag-contact.js';
import {
  depenetrateFromRects,
  pointHitsExpandedRect,
  steerAroundRects,
} from '../lib/collision-navigation.js';
import {
  advanceTeamCombo,
  createTeamComboState,
  teamComboSeconds,
  teamComboSpeedMultiplier,
} from '../lib/team-combo.js';
import GAME_RULES from '../config/game-rules.json';

type Team = 'blue' | 'red';
type Faction = 'red' | 'green';
type PlayerState = 'IN_BASE' | 'ACTIVE' | 'PRISONER' | 'RETURNING';
type PlayerAction = 'tag' | 'rescue' | 'ultimate';
type Grade = 25 | 40 | 75 | 100;
type FieldId = 'kampung' | 'pasar' | 'taman' | 'kanal';
type CameraMode = 'follow' | 'tactical' | 'overview';
type MenuStep = 'splash' | 'team' | 'character' | 'field';
type DifficultyId = 'easy' | 'normal' | 'hard';
type Player = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: PlayerState;
  exitOrder: number;
  boost: number;
  baseCharge: number;
  exitDeadline: number;
  lastExitAt: number;
  tagCooldown: number;
  parkourUntil: number;
  boostReadyAt: number;
  fortCharge: number;
  prisonOwner?: Team;
  prisonIndex: number;
  captures: number;
  aiSeed: number;
  rescueShieldUntil: number;
  ultimateShieldUntil: number;
  fallSafeUntil: number;
  fallNoticeUntil: number;
  capturedIds: string[];
  action?: PlayerAction;
  actionUntil: number;
  lastX: number;
  lastY: number;
};
type Obstacle = {
  x: number;
  y: number;
  w: number;
  h: number;
  asset: FieldAssetId;
  visualW: number;
  visualH: number;
  flip?: boolean;
  hidden?: boolean;
  underlay?: boolean;
};
type FieldDecoration = {
  asset: FieldAssetId;
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
  opacity?: number;
  underlay?: boolean;
};
type AnimatedDecoration = {
  animation: FieldAnimatedId;
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
  opacity?: number;
};
type FieldPath = {
  tile: GroundTileId;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  radius: number;
};
type Prison = {
  x: number;
  y: number;
  w: number;
  h: number;
  floorAsset?: FieldAssetId;
  overlayAsset?: FieldAssetId;
  flip?: boolean;
};
type FieldConfig = {
  id: FieldId;
  name: string;
  kicker: string;
  difficulty: DifficultyId;
  aiIntensity: number;
  ground: GroundTileId;
  background?: string;
  designWidth?: number;
  designHeight?: number;
  width?: number;
  height?: number;
  objectScale?: number;
  structuresInBackground?: boolean;
  waterMask?: string;
  waterMaskWidth?: number;
  waterMaskHeight?: number;
  bases?: Record<Team, { x: number; y: number }>;
  prisons: Record<Team, Prison>;
  paths: FieldPath[];
  obstacles: Obstacle[];
  decorations: FieldDecoration[];
  animated: AnimatedDecoration[];
};
type Refill = {
  id: number;
  x: number;
  y: number;
  grade: Grade;
  lane: 0 | 1 | 2;
  expiresAt: number;
};
type Mission = {
  refresh: boolean;
  boost: boolean;
  parkour: boolean;
  tag: boolean;
  rescue: boolean;
  combo: boolean;
};
type Snapshot = {
  blue: number;
  red: number;
  round: number;
  timer: number;
  boost: number;
  boostCountdown: number;
  order: number;
  state: PlayerState;
  paused: boolean;
  logs: string[];
  mission: Mission;
  team: Array<{
    name: string;
    characterId: CharacterId;
    state: PlayerState;
    boost: number;
  }>;
  blueHeld: number;
  redHeld: number;
  pickupCount: number;
  fortLock: string;
  baseGrace: number;
  suddenDeath: boolean;
  fieldWins: number;
  comboLevel: number;
  comboRemaining: number;
  comboSurgeRemaining: number;
  comboCallout: string;
  ultimateMeter: number;
  ultimateBuffRemaining: number;
  ultimateCasting: boolean;
};

const DESIGN_W = 1440;
const DESIGN_H = 800;
const W = 1538;
const H = 1096;
const WORLD_SCALE_X = W / DESIGN_W;
const WORLD_SCALE_Y = H / DESIGN_H;
const MAP1_GUIDE_WIDTH = 1452;
const MAP1_GUIDE_HEIGHT = 1088;
const MAP1_WORLD_WIDTH = Math.round(W * 1.15);
const MAP1_WORLD_HEIGHT = Math.round(H * 1.15);
const MAP2_GUIDE_WIDTH = 1672;
const MAP2_GUIDE_HEIGHT = 941;
const MAP2_WORLD_WIDTH = Math.round(MAP2_GUIDE_WIDTH * 1.15);
const MAP2_WORLD_HEIGHT = Math.round(MAP2_GUIDE_HEIGHT * 1.15);
const MAP3_GUIDE_WIDTH = 1672;
const MAP3_GUIDE_HEIGHT = 941;
const MAP3_WORLD_WIDTH = Math.round(MAP3_GUIDE_WIDTH * 1.15);
const MAP3_WORLD_HEIGHT = Math.round(MAP3_GUIDE_HEIGHT * 1.15);
const STATIC_MAP_SCALE = 0.5;
const NEAR_FIELD_DETAIL_RADIUS = 560;
const PLAYER_COLLISION_RADIUS = 13;
const BASE_REENTRY_COOLDOWN_MS = 1500;
const AI_ALLY_SPEED_MULTIPLIER = 0.92;
const RAJA_ULTIMATE_RECHARGE_SECONDS = 45;
const RAJA_ULTIMATE_TAG_BONUS = 20;
const RAJA_ULTIMATE_RESCUE_BONUS = 30;
const RAJA_ULTIMATE_CAST_MS = 3200;
const RAJA_ULTIMATE_BUFF_MS = 5000;
const RAJA_ULTIMATE_SPEED_MULTIPLIER = 1.4;
const KAKA_ULTIMATE_CAST_MS = 3600;
const KAKA_ULTIMATE_FRAME_COUNT = 9;
const KAKA_ULTIMATE_SHIELD_MS = 5000;
const ULTIMATE_CHARACTER_IDS = new Set<CharacterId>(['raja', 'kaka']);
const DIFFICULTY_PROFILES = {
  easy: {
    enemySpeed: 0.94,
    steerDistance: 70,
    boostThreshold: 0.22,
    prediction: 0.08,
    playerBias: 45,
    threatRadius: 145,
    rescueCutoff: 0.9,
    boostDrain: 0.72,
  },
  normal: {
    enemySpeed: 1,
    steerDistance: 86,
    boostThreshold: -0.16,
    prediction: 0.18,
    playerBias: 95,
    threatRadius: 165,
    rescueCutoff: 1.55,
    boostDrain: 0.6,
  },
  hard: {
    enemySpeed: 1.04,
    steerDistance: 100,
    boostThreshold: -0.48,
    prediction: 0.28,
    playerBias: 150,
    threatRadius: 185,
    rescueCutoff: 2.2,
    boostDrain: 0.5,
  },
} satisfies Record<
  DifficultyId,
  {
    enemySpeed: number;
    steerDistance: number;
    boostThreshold: number;
    prediction: number;
    playerBias: number;
    threatRadius: number;
    rescueCutoff: number;
    boostDrain: number;
  }
>;
const worldX = (value: number) => Math.round(value * WORLD_SCALE_X);
const worldY = (value: number) => Math.round(value * WORLD_SCALE_Y);
const BASE_RADIUS = 118;
const BASES = {
  blue: { x: 174, y: 520 },
  red: { x: W - 174, y: 520 },
};
const DEFAULT_RAW_PRISONS: Record<Team, Prison> = {
  blue: { x: 244, y: 472, w: 254, h: 190 },
  red: { x: 942, y: 154, w: 254, h: 190 },
};
const TEAM_COLOR = {
  blue: GAME_RULES.teams.red.color,
  red: GAME_RULES.teams.green.color,
};
const FIXED_ROSTERS = {
  red: GAME_RULES.teams.red.roster as CharacterId[],
  green: GAME_RULES.teams.green.roster as CharacterId[],
};
const TEAM_FOR_FACTION: Record<Faction, Team> = { red: 'blue', green: 'red' };
const FACTION_FOR_TEAM: Record<Team, Faction> = { blue: 'red', red: 'green' };
const factionName = (faction: Faction) => GAME_RULES.teams[faction].label;
const teamName = (team: Team) => factionName(FACTION_FOR_TEAM[team]);
const lineupFor = (faction: Faction, selectedId?: CharacterId) => {
  const roster = FIXED_ROSTERS[faction];
  return selectedId && roster.includes(selectedId)
    ? [selectedId, ...roster.filter((id) => id !== selectedId)].slice(
        0,
        GAME_RULES.matchSize,
      )
    : roster.slice(0, GAME_RULES.matchSize);
};
const RAW_FIELD_CONFIGS: FieldConfig[] = [
  {
    id: 'kampung',
    name: 'Kampung Merdeka',
    kicker: 'Lapangan terbuka · ramah pemula',
    difficulty: 'easy',
    aiIntensity: 1,
    ground: 'dirt',
    prisons: DEFAULT_RAW_PRISONS,
    paths: [
      {
        tile: 'paving',
        x: 214,
        y: 306,
        w: 1012,
        h: 184,
        opacity: 0.52,
        radius: 54,
      },
    ],
    obstacles: [
      {
        x: 58,
        y: 166,
        w: 174,
        h: 54,
        asset: 'warung',
        visualW: 220,
        visualH: 183,
      },
      {
        x: 1160,
        y: 168,
        w: 176,
        h: 54,
        asset: 'hall',
        visualW: 230,
        visualH: 190,
      },
      {
        x: 1180,
        y: 610,
        w: 168,
        h: 52,
        asset: 'guardPost',
        visualW: 205,
        visualH: 184,
      },
      {
        x: 286,
        y: 190,
        w: 122,
        h: 26,
        asset: 'clothesline',
        visualW: 176,
        visualH: 142,
      },
      {
        x: 1032,
        y: 588,
        w: 122,
        h: 26,
        asset: 'clothesline',
        visualW: 166,
        visualH: 134,
        flip: true,
      },
      {
        x: 402,
        y: 354,
        w: 168,
        h: 36,
        asset: 'drain',
        visualW: 190,
        visualH: 72,
      },
      {
        x: 870,
        y: 410,
        w: 168,
        h: 36,
        asset: 'drain',
        visualW: 190,
        visualH: 72,
      },
      {
        x: 650,
        y: 282,
        w: 88,
        h: 58,
        asset: 'crates',
        visualW: 100,
        visualH: 84,
      },
      {
        x: 704,
        y: 516,
        w: 74,
        h: 54,
        asset: 'crates',
        visualW: 88,
        visualH: 74,
        flip: true,
      },
      {
        x: 534,
        y: 612,
        w: 42,
        h: 44,
        asset: 'bucket',
        visualW: 50,
        visualH: 54,
      },
      {
        x: 866,
        y: 142,
        w: 44,
        h: 60,
        asset: 'trash',
        visualW: 52,
        visualH: 78,
      },
      {
        x: 540,
        y: 582,
        w: 136,
        h: 44,
        asset: 'coffeeStall',
        visualW: 196,
        visualH: 188,
      },
      {
        x: 468,
        y: 150,
        w: 92,
        h: 46,
        asset: 'snackCart',
        visualW: 132,
        visualH: 150,
      },
      {
        x: 934,
        y: 586,
        w: 98,
        h: 48,
        asset: 'foodCart',
        visualW: 138,
        visualH: 148,
      },
      {
        x: 176,
        y: 286,
        w: 98,
        h: 58,
        asset: 'crates',
        visualW: 112,
        visualH: 92,
      },
      {
        x: 390,
        y: 518,
        w: 158,
        h: 34,
        asset: 'drain',
        visualW: 180,
        visualH: 66,
      },
      {
        x: 454,
        y: 252,
        w: 136,
        h: 42,
        asset: 'marketStallA',
        visualW: 186,
        visualH: 148,
      },
      {
        x: 568,
        y: 438,
        w: 142,
        h: 42,
        asset: 'coffeeStall',
        visualW: 194,
        visualH: 184,
      },
      {
        x: 742,
        y: 174,
        w: 84,
        h: 56,
        asset: 'crates',
        visualW: 98,
        visualH: 80,
        flip: true,
      },
      {
        x: 716,
        y: 364,
        w: 154,
        h: 32,
        asset: 'drain',
        visualW: 178,
        visualH: 62,
      },
      {
        x: 826,
        y: 610,
        w: 46,
        h: 52,
        asset: 'trash',
        visualW: 54,
        visualH: 72,
      },
      {
        x: 908,
        y: 356,
        w: 140,
        h: 42,
        asset: 'marketStallC',
        visualW: 188,
        visualH: 150,
        flip: true,
      },
      {
        x: 1038,
        y: 516,
        w: 92,
        h: 58,
        asset: 'crates',
        visualW: 108,
        visualH: 90,
      },
      {
        x: 1124,
        y: 302,
        w: 154,
        h: 34,
        asset: 'drain',
        visualW: 178,
        visualH: 64,
      },
      {
        x: 1234,
        y: 488,
        w: 94,
        h: 46,
        asset: 'snackCart',
        visualW: 132,
        visualH: 148,
        flip: true,
      },
      {
        x: 306,
        y: 92,
        w: 72,
        h: 58,
        asset: 'parkTree',
        visualW: 118,
        visualH: 154,
      },
      {
        x: 1196,
        y: 92,
        w: 72,
        h: 58,
        asset: 'parkTree',
        visualW: 118,
        visualH: 154,
        flip: true,
      },
    ],
    decorations: [
      { asset: 'bunting', x: 602, y: 68, w: 236, h: 122, opacity: 0.94 },
      { asset: 'plant', x: 242, y: 650, w: 62, h: 78 },
      { asset: 'bush', x: 1060, y: 86, w: 100, h: 66 },
      { asset: 'bush', x: 420, y: 74, w: 92, h: 60 },
      { asset: 'plant', x: 884, y: 684, w: 58, h: 74 },
      { asset: 'bunting', x: 196, y: 82, w: 210, h: 110, opacity: 0.82 },
      {
        asset: 'bunting',
        x: 1018,
        y: 626,
        w: 210,
        h: 110,
        flip: true,
        opacity: 0.82,
      },
    ],
    animated: [{ animation: 'flag', x: 690, y: 76, w: 66, h: 92 }],
  },
  {
    id: 'pasar',
    name: 'Pasar Senggol',
    kicker: 'Beton · jalur rapat',
    difficulty: 'normal',
    aiIntensity: 1,
    ground: 'concrete',
    prisons: DEFAULT_RAW_PRISONS,
    paths: [
      {
        tile: 'paving',
        x: 226,
        y: 116,
        w: 988,
        h: 126,
        opacity: 0.54,
        radius: 38,
      },
      {
        tile: 'paving',
        x: 214,
        y: 338,
        w: 1012,
        h: 128,
        opacity: 0.54,
        radius: 38,
      },
      {
        tile: 'paving',
        x: 226,
        y: 560,
        w: 988,
        h: 126,
        opacity: 0.54,
        radius: 38,
      },
    ],
    obstacles: [
      {
        x: 54,
        y: 170,
        w: 176,
        h: 54,
        asset: 'warung',
        visualW: 220,
        visualH: 183,
      },
      {
        x: 260,
        y: 126,
        w: 98,
        h: 64,
        asset: 'crates',
        visualW: 112,
        visualH: 94,
      },
      {
        x: 1082,
        y: 610,
        w: 98,
        h: 64,
        asset: 'crates',
        visualW: 112,
        visualH: 94,
        flip: true,
      },
      {
        x: 438,
        y: 254,
        w: 148,
        h: 30,
        asset: 'drain',
        visualW: 170,
        visualH: 60,
      },
      {
        x: 854,
        y: 516,
        w: 148,
        h: 30,
        asset: 'drain',
        visualW: 170,
        visualH: 60,
      },
      {
        x: 390,
        y: 390,
        w: 118,
        h: 58,
        asset: 'crates',
        visualW: 128,
        visualH: 106,
      },
      {
        x: 932,
        y: 390,
        w: 118,
        h: 58,
        asset: 'crates',
        visualW: 128,
        visualH: 106,
        flip: true,
      },
      {
        x: 636,
        y: 162,
        w: 48,
        h: 66,
        asset: 'trash',
        visualW: 56,
        visualH: 84,
      },
      {
        x: 758,
        y: 564,
        w: 48,
        h: 54,
        asset: 'bucket',
        visualW: 54,
        visualH: 58,
      },
      {
        x: 630,
        y: 378,
        w: 180,
        h: 38,
        asset: 'drain',
        visualW: 204,
        visualH: 72,
      },
      {
        x: 236,
        y: 150,
        w: 146,
        h: 42,
        asset: 'marketStallA',
        visualW: 190,
        visualH: 152,
      },
      {
        x: 608,
        y: 132,
        w: 150,
        h: 42,
        asset: 'marketStallB',
        visualW: 194,
        visualH: 154,
      },
      {
        x: 1018,
        y: 570,
        w: 146,
        h: 42,
        asset: 'marketStallC',
        visualW: 190,
        visualH: 152,
      },
      {
        x: 470,
        y: 548,
        w: 94,
        h: 46,
        asset: 'snackCart',
        visualW: 134,
        visualH: 152,
      },
      {
        x: 780,
        y: 188,
        w: 98,
        h: 46,
        asset: 'foodCart',
        visualW: 140,
        visualH: 150,
      },
      {
        x: 142,
        y: 294,
        w: 142,
        h: 42,
        asset: 'marketStallA',
        visualW: 188,
        visualH: 150,
      },
      {
        x: 300,
        y: 610,
        w: 96,
        h: 46,
        asset: 'foodCart',
        visualW: 138,
        visualH: 148,
      },
      {
        x: 420,
        y: 470,
        w: 152,
        h: 32,
        asset: 'drain',
        visualW: 176,
        visualH: 62,
      },
      {
        x: 520,
        y: 102,
        w: 94,
        h: 58,
        asset: 'crates',
        visualW: 108,
        visualH: 90,
      },
      {
        x: 610,
        y: 628,
        w: 48,
        h: 58,
        asset: 'trash',
        visualW: 56,
        visualH: 78,
      },
      {
        x: 712,
        y: 274,
        w: 148,
        h: 44,
        asset: 'marketStallB',
        visualW: 194,
        visualH: 154,
      },
      {
        x: 842,
        y: 88,
        w: 98,
        h: 46,
        asset: 'snackCart',
        visualW: 138,
        visualH: 150,
        flip: true,
      },
      {
        x: 896,
        y: 626,
        w: 146,
        h: 42,
        asset: 'marketStallC',
        visualW: 190,
        visualH: 152,
        flip: true,
      },
      {
        x: 1010,
        y: 308,
        w: 46,
        h: 54,
        asset: 'bucket',
        visualW: 54,
        visualH: 58,
      },
      {
        x: 1112,
        y: 306,
        w: 146,
        h: 42,
        asset: 'marketStallA',
        visualW: 190,
        visualH: 152,
        flip: true,
      },
      {
        x: 1172,
        y: 514,
        w: 152,
        h: 32,
        asset: 'drain',
        visualW: 176,
        visualH: 62,
      },
      {
        x: 1264,
        y: 166,
        w: 92,
        h: 58,
        asset: 'crates',
        visualW: 108,
        visualH: 90,
        flip: true,
      },
      {
        x: 318,
        y: 274,
        w: 46,
        h: 54,
        asset: 'bucket',
        visualW: 54,
        visualH: 58,
      },
    ],
    decorations: [
      { asset: 'bunting', x: 600, y: 66, w: 240, h: 124 },
      { asset: 'lamp', x: 344, y: 588, w: 46, h: 96 },
      { asset: 'lamp', x: 1046, y: 106, w: 46, h: 96 },
      { asset: 'plant', x: 1188, y: 670, w: 58, h: 74 },
      { asset: 'lamp', x: 566, y: 86, w: 46, h: 96 },
      { asset: 'lamp', x: 828, y: 616, w: 46, h: 96 },
      { asset: 'bunting', x: 232, y: 618, w: 220, h: 112, opacity: 0.82 },
      {
        asset: 'bunting',
        x: 984,
        y: 72,
        w: 220,
        h: 112,
        flip: true,
        opacity: 0.82,
      },
    ],
    animated: [
      { animation: 'vendor', x: 690, y: 360, w: 122, h: 100 },
      { animation: 'flag', x: 1188, y: 92, w: 62, h: 88, flip: true },
    ],
  },
  {
    id: 'taman',
    name: 'Taman Kota',
    kicker: 'Rumput · ruang terbuka',
    difficulty: 'hard',
    aiIntensity: 1,
    ground: 'grass',
    prisons: DEFAULT_RAW_PRISONS,
    paths: [
      {
        tile: 'paving',
        x: 624,
        y: 72,
        w: 192,
        h: 656,
        opacity: 0.52,
        radius: 58,
      },
      {
        tile: 'paving',
        x: 224,
        y: 324,
        w: 992,
        h: 152,
        opacity: 0.52,
        radius: 58,
      },
    ],
    obstacles: [
      {
        x: 302,
        y: 188,
        w: 70,
        h: 56,
        asset: 'parkTree',
        visualW: 124,
        visualH: 158,
      },
      {
        x: 1068,
        y: 556,
        w: 70,
        h: 56,
        asset: 'parkTree',
        visualW: 124,
        visualH: 158,
        flip: true,
      },
      {
        x: 500,
        y: 604,
        w: 100,
        h: 42,
        asset: 'flowerBedSmall',
        visualW: 126,
        visualH: 88,
      },
      {
        x: 840,
        y: 218,
        w: 100,
        h: 42,
        asset: 'flowerBedSmall',
        visualW: 126,
        visualH: 88,
        flip: true,
      },
      {
        x: 544,
        y: 344,
        w: 112,
        h: 34,
        asset: 'drain',
        visualW: 132,
        visualH: 50,
      },
      {
        x: 784,
        y: 424,
        w: 112,
        h: 34,
        asset: 'drain',
        visualW: 132,
        visualH: 50,
      },
      {
        x: 666,
        y: 154,
        w: 48,
        h: 56,
        asset: 'plant',
        visualW: 66,
        visualH: 84,
      },
      {
        x: 726,
        y: 598,
        w: 48,
        h: 56,
        asset: 'plant',
        visualW: 66,
        visualH: 84,
        flip: true,
      },
      {
        x: 1180,
        y: 158,
        w: 150,
        h: 48,
        asset: 'hall',
        visualW: 214,
        visualH: 178,
      },
      {
        x: 202,
        y: 354,
        w: 154,
        h: 44,
        asset: 'gardenMedium',
        visualW: 188,
        visualH: 142,
      },
      {
        x: 1080,
        y: 390,
        w: 154,
        h: 44,
        asset: 'gardenMedium',
        visualW: 188,
        visualH: 142,
        flip: true,
      },
      {
        x: 566,
        y: 176,
        w: 182,
        h: 34,
        asset: 'plantFence',
        visualW: 218,
        visualH: 70,
      },
      {
        x: 698,
        y: 592,
        w: 182,
        h: 34,
        asset: 'flowerFence',
        visualW: 218,
        visualH: 74,
      },
      {
        x: 660,
        y: 366,
        w: 120,
        h: 48,
        asset: 'flowerBedSmall',
        visualW: 138,
        visualH: 94,
      },
      {
        x: 130,
        y: 164,
        w: 72,
        h: 56,
        asset: 'parkTree',
        visualW: 124,
        visualH: 158,
      },
      {
        x: 278,
        y: 604,
        w: 126,
        h: 40,
        asset: 'flowerBedSmall',
        visualW: 160,
        visualH: 116,
      },
      {
        x: 388,
        y: 286,
        w: 148,
        h: 42,
        asset: 'gardenMedium',
        visualW: 184,
        visualH: 138,
      },
      {
        x: 476,
        y: 94,
        w: 174,
        h: 32,
        asset: 'plantFence',
        visualW: 212,
        visualH: 68,
      },
      {
        x: 530,
        y: 514,
        w: 108,
        h: 40,
        asset: 'flowerBedSmall',
        visualW: 132,
        visualH: 90,
      },
      {
        x: 768,
        y: 256,
        w: 108,
        h: 40,
        asset: 'flowerBedSmall',
        visualW: 132,
        visualH: 90,
        flip: true,
      },
      {
        x: 814,
        y: 646,
        w: 174,
        h: 32,
        asset: 'flowerFence',
        visualW: 212,
        visualH: 72,
      },
      {
        x: 930,
        y: 470,
        w: 148,
        h: 42,
        asset: 'gardenMedium',
        visualW: 184,
        visualH: 138,
        flip: true,
      },
      {
        x: 1034,
        y: 102,
        w: 126,
        h: 40,
        asset: 'flowerBedSmall',
        visualW: 160,
        visualH: 116,
        flip: true,
      },
      {
        x: 1226,
        y: 586,
        w: 72,
        h: 56,
        asset: 'parkTree',
        visualW: 124,
        visualH: 158,
        flip: true,
      },
      {
        x: 352,
        y: 446,
        w: 146,
        h: 32,
        asset: 'drain',
        visualW: 170,
        visualH: 60,
      },
      {
        x: 958,
        y: 286,
        w: 146,
        h: 32,
        asset: 'drain',
        visualW: 170,
        visualH: 60,
      },
    ],
    decorations: [
      { asset: 'lamp', x: 498, y: 612, w: 48, h: 100 },
      { asset: 'lamp', x: 894, y: 88, w: 48, h: 100 },
      { asset: 'bunting', x: 606, y: 68, w: 228, h: 118, opacity: 0.86 },
      { asset: 'bush', x: 228, y: 92, w: 92, h: 60 },
      { asset: 'bush', x: 1118, y: 650, w: 92, h: 60, flip: true },
      { asset: 'plant', x: 612, y: 664, w: 60, h: 76 },
      { asset: 'plant', x: 826, y: 76, w: 60, h: 76 },
      { asset: 'bush', x: 418, y: 660, w: 94, h: 62 },
      { asset: 'bush', x: 954, y: 86, w: 94, h: 62, flip: true },
    ],
    animated: [
      { animation: 'fountain', x: 674, y: 332, w: 92, h: 90 },
      { animation: 'flag', x: 690, y: 82, w: 64, h: 90 },
    ],
  },
  {
    id: 'kanal',
    name: 'Alun Kanal Nusantara',
    kicker: 'Kanal cincin · parkour silang',
    difficulty: 'hard',
    aiIntensity: 1.03,
    ground: 'grass',
    prisons: {
      blue: { x: 312, y: 342, w: 254, h: 190 },
      red: { x: 1026, y: 342, w: 254, h: 190 },
    },
    paths: [
      {
        tile: 'paving',
        x: 206,
        y: 310,
        w: 1028,
        h: 182,
        opacity: 0.62,
        radius: 82,
      },
      {
        tile: 'paving',
        x: 620,
        y: 84,
        w: 200,
        h: 632,
        opacity: 0.58,
        radius: 76,
      },
      {
        tile: 'dirt',
        x: 438,
        y: 178,
        w: 564,
        h: 444,
        opacity: 0.5,
        radius: 176,
      },
    ],
    obstacles: [
      {
        x: 238,
        y: 126,
        w: 152,
        h: 42,
        asset: 'guardPost',
        visualW: 202,
        visualH: 176,
      },
      {
        x: 1050,
        y: 126,
        w: 152,
        h: 42,
        asset: 'hall',
        visualW: 214,
        visualH: 178,
        flip: true,
      },
      {
        x: 238,
        y: 630,
        w: 144,
        h: 40,
        asset: 'marketStallA',
        visualW: 188,
        visualH: 150,
      },
      {
        x: 1058,
        y: 630,
        w: 144,
        h: 40,
        asset: 'marketStallC',
        visualW: 188,
        visualH: 150,
        flip: true,
      },
      {
        x: 454,
        y: 190,
        w: 168,
        h: 32,
        asset: 'drain',
        visualW: 192,
        visualH: 68,
      },
      {
        x: 818,
        y: 190,
        w: 168,
        h: 32,
        asset: 'drain',
        visualW: 192,
        visualH: 68,
        flip: true,
      },
      {
        x: 454,
        y: 578,
        w: 168,
        h: 32,
        asset: 'drain',
        visualW: 192,
        visualH: 68,
      },
      {
        x: 818,
        y: 578,
        w: 168,
        h: 32,
        asset: 'drain',
        visualW: 192,
        visualH: 68,
        flip: true,
      },
      {
        x: 422,
        y: 274,
        w: 146,
        h: 32,
        asset: 'plantFence',
        visualW: 190,
        visualH: 68,
      },
      {
        x: 872,
        y: 274,
        w: 146,
        h: 32,
        asset: 'plantFence',
        visualW: 190,
        visualH: 68,
        flip: true,
      },
      {
        x: 422,
        y: 494,
        w: 146,
        h: 32,
        asset: 'flowerFence',
        visualW: 190,
        visualH: 72,
      },
      {
        x: 872,
        y: 494,
        w: 146,
        h: 32,
        asset: 'flowerFence',
        visualW: 190,
        visualH: 72,
        flip: true,
      },
      {
        x: 570,
        y: 252,
        w: 106,
        h: 38,
        asset: 'flowerBedSmall',
        visualW: 132,
        visualH: 90,
      },
      {
        x: 764,
        y: 252,
        w: 106,
        h: 38,
        asset: 'flowerBedSmall',
        visualW: 132,
        visualH: 90,
        flip: true,
      },
      {
        x: 570,
        y: 510,
        w: 106,
        h: 38,
        asset: 'flowerBedSmall',
        visualW: 132,
        visualH: 90,
      },
      {
        x: 764,
        y: 510,
        w: 106,
        h: 38,
        asset: 'flowerBedSmall',
        visualW: 132,
        visualH: 90,
        flip: true,
      },
      {
        x: 620,
        y: 344,
        w: 82,
        h: 50,
        asset: 'gardenMedium',
        visualW: 146,
        visualH: 116,
      },
      {
        x: 738,
        y: 406,
        w: 82,
        h: 50,
        asset: 'gardenMedium',
        visualW: 146,
        visualH: 116,
        flip: true,
      },
      {
        x: 650,
        y: 116,
        w: 54,
        h: 58,
        asset: 'crates',
        visualW: 76,
        visualH: 70,
      },
      {
        x: 736,
        y: 626,
        w: 54,
        h: 58,
        asset: 'crates',
        visualW: 76,
        visualH: 70,
        flip: true,
      },
      {
        x: 520,
        y: 370,
        w: 48,
        h: 54,
        asset: 'bucket',
        visualW: 54,
        visualH: 58,
      },
      {
        x: 872,
        y: 376,
        w: 48,
        h: 54,
        asset: 'trash',
        visualW: 56,
        visualH: 78,
        flip: true,
      },
      {
        x: 332,
        y: 214,
        w: 72,
        h: 56,
        asset: 'parkTree',
        visualW: 124,
        visualH: 158,
      },
      {
        x: 1036,
        y: 530,
        w: 72,
        h: 56,
        asset: 'parkTree',
        visualW: 124,
        visualH: 158,
        flip: true,
      },
      {
        x: 334,
        y: 548,
        w: 92,
        h: 58,
        asset: 'crates',
        visualW: 108,
        visualH: 90,
      },
      {
        x: 1014,
        y: 206,
        w: 92,
        h: 58,
        asset: 'crates',
        visualW: 108,
        visualH: 90,
        flip: true,
      },
      {
        x: 680,
        y: 304,
        w: 80,
        h: 44,
        asset: 'flowerBedSmall',
        visualW: 108,
        visualH: 82,
      },
      {
        x: 680,
        y: 452,
        w: 80,
        h: 44,
        asset: 'flowerBedSmall',
        visualW: 108,
        visualH: 82,
        flip: true,
      },
    ],
    decorations: [
      { asset: 'bush', x: 170, y: 82, w: 108, h: 70 },
      { asset: 'bush', x: 1160, y: 650, w: 108, h: 70, flip: true },
      { asset: 'plant', x: 398, y: 92, w: 62, h: 78 },
      { asset: 'plant', x: 980, y: 632, w: 62, h: 78, flip: true },
      { asset: 'bunting', x: 560, y: 58, w: 320, h: 128, opacity: 0.82 },
      { asset: 'lamp', x: 592, y: 662, w: 48, h: 100 },
      { asset: 'lamp', x: 800, y: 60, w: 48, h: 100 },
    ],
    animated: [
      { animation: 'fountain', x: 682, y: 354, w: 76, h: 76 },
      { animation: 'flag', x: 190, y: 320, w: 62, h: 88 },
      { animation: 'flag', x: 1188, y: 390, w: 62, h: 88, flip: true },
    ],
  },
];
const KAMPUNG_OPEN_ARENA = {
  paths: [
    {
      tile: 'paving' as GroundTileId,
      x: 196,
      y: 286,
      w: 1048,
      h: 244,
      opacity: 0.34,
      radius: 34,
    },
    {
      tile: 'paving' as GroundTileId,
      x: 650,
      y: 72,
      w: 140,
      h: 656,
      opacity: 0.5,
      radius: 42,
    },
  ],
  obstacles: [
    {
      x: 248,
      y: 104,
      w: 160,
      h: 48,
      asset: 'warung' as FieldAssetId,
      visualW: 214,
      visualH: 180,
    },
    {
      x: 886,
      y: 96,
      w: 174,
      h: 50,
      asset: 'hall' as FieldAssetId,
      visualW: 224,
      visualH: 186,
      flip: true,
    },
    {
      x: 922,
      y: 616,
      w: 154,
      h: 48,
      asset: 'guardPost' as FieldAssetId,
      visualW: 202,
      visualH: 176,
      flip: true,
    },
    {
      x: 414,
      y: 104,
      w: 92,
      h: 44,
      asset: 'snackCart' as FieldAssetId,
      visualW: 130,
      visualH: 146,
    },
    {
      x: 686,
      y: 628,
      w: 96,
      h: 44,
      asset: 'foodCart' as FieldAssetId,
      visualW: 134,
      visualH: 146,
    },
    {
      x: 352,
      y: 244,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
    },
    {
      x: 536,
      y: 244,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
    },
    {
      x: 772,
      y: 244,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
      flip: true,
    },
    {
      x: 956,
      y: 244,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
      flip: true,
    },
    {
      x: 352,
      y: 530,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
    },
    {
      x: 536,
      y: 530,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
    },
    {
      x: 772,
      y: 530,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
      flip: true,
    },
    {
      x: 956,
      y: 530,
      w: 132,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 156,
      visualH: 58,
      flip: true,
    },
    {
      x: 426,
      y: 350,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
    },
    {
      x: 574,
      y: 350,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
    },
    {
      x: 754,
      y: 350,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
      flip: true,
    },
    {
      x: 902,
      y: 350,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
      flip: true,
    },
    {
      x: 426,
      y: 440,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
    },
    {
      x: 574,
      y: 440,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
    },
    {
      x: 754,
      y: 440,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
      flip: true,
    },
    {
      x: 902,
      y: 440,
      w: 112,
      h: 28,
      asset: 'drain' as FieldAssetId,
      visualW: 136,
      visualH: 54,
      flip: true,
    },
    {
      x: 330,
      y: 320,
      w: 46,
      h: 52,
      asset: 'crates' as FieldAssetId,
      visualW: 68,
      visualH: 66,
    },
    {
      x: 1064,
      y: 426,
      w: 46,
      h: 52,
      asset: 'crates' as FieldAssetId,
      visualW: 68,
      visualH: 66,
      flip: true,
    },
    {
      x: 650,
      y: 300,
      w: 46,
      h: 52,
      asset: 'bucket' as FieldAssetId,
      visualW: 52,
      visualH: 56,
    },
    {
      x: 744,
      y: 466,
      w: 46,
      h: 52,
      asset: 'trash' as FieldAssetId,
      visualW: 54,
      visualH: 74,
    },
    {
      x: 292,
      y: 650,
      w: 70,
      h: 54,
      asset: 'parkTree' as FieldAssetId,
      visualW: 118,
      visualH: 150,
    },
    {
      x: 1078,
      y: 104,
      w: 70,
      h: 54,
      asset: 'parkTree' as FieldAssetId,
      visualW: 118,
      visualH: 150,
      flip: true,
    },
  ],
  decorations: [
    {
      asset: 'bunting' as FieldAssetId,
      x: 574,
      y: 56,
      w: 292,
      h: 120,
      opacity: 0.9,
    },
    { asset: 'bush' as FieldAssetId, x: 168, y: 78, w: 104, h: 68 },
    {
      asset: 'bush' as FieldAssetId,
      x: 1168,
      y: 650,
      w: 104,
      h: 68,
      flip: true,
    },
    { asset: 'plant' as FieldAssetId, x: 422, y: 660, w: 60, h: 76 },
    { asset: 'plant' as FieldAssetId, x: 958, y: 74, w: 60, h: 76, flip: true },
  ],
  animated: [
    { animation: 'flag' as FieldAnimatedId, x: 670, y: 74, w: 62, h: 88 },
    { animation: 'vendor' as FieldAnimatedId, x: 690, y: 366, w: 76, h: 64 },
  ],
};
const guideObstacle = (
  asset: FieldAssetId,
  x: number,
  y: number,
  w: number,
  h: number,
  visualW: number,
  visualH: number,
  flip = false,
): Obstacle => ({
  asset,
  x,
  y,
  w,
  h,
  visualW,
  visualH,
  ...(flip ? { flip } : {}),
});
const guideCollider = (
  asset: FieldAssetId,
  x: number,
  y: number,
  w: number,
  h: number,
): Obstacle => ({
  ...guideObstacle(asset, x, y, w, h, 1, 1),
  hidden: true,
});
const MAP_OBJECT_SCALE = 0.9;
const map2GroupObstacle = (
  x: number,
  y: number,
  w: number,
  h: number,
): Obstacle => {
  const group = { x: 280, y: 320, w: 1115, h: 335 };
  const groupCenterX = group.x + group.w / 2;
  const groupCenterY = group.y + group.h / 2;
  const positionScaleX = MAP2_WORLD_WIDTH / MAP2_GUIDE_WIDTH;
  const positionScaleY = MAP2_WORLD_HEIGHT / MAP2_GUIDE_HEIGHT;
  const centerX =
    groupCenterX +
    ((x + w / 2 - groupCenterX) * MAP_OBJECT_SCALE) / positionScaleX;
  const centerY =
    groupCenterY +
    ((y + h / 2 - groupCenterY) * MAP_OBJECT_SCALE) / positionScaleY;
  return {
    ...guideObstacle(
      'map2Center',
      centerX - w / 2,
      centerY - h / 2,
      w,
      h,
      1,
      1,
    ),
    hidden: true,
  };
};

const GUIDE_FIELD_CONFIGS: FieldConfig[] = [
  {
    id: 'kampung',
    name: 'Kampung Merdeka',
    kicker: 'Lapangan terbuka · ramah pemula',
    difficulty: 'easy',
    aiIntensity: 1,
    ground: 'kampungGround',
    background: 'kampung-map.webp',
    designWidth: MAP1_GUIDE_WIDTH,
    designHeight: MAP1_GUIDE_HEIGHT,
    width: MAP1_WORLD_WIDTH,
    height: MAP1_WORLD_HEIGHT,
    objectScale: 0.9,
    bases: {
      blue: { x: 166, y: 505 },
      red: { x: 1286, y: 505 },
    },
    prisons: {
      blue: {
        x: 150,
        y: 752,
        w: 270,
        h: 205,
        floorAsset: 'industrialPrisonBlueFloor',
        overlayAsset: 'industrialPrisonBlueOverlay',
      },
      red: {
        x: 1148,
        y: 48,
        w: 270,
        h: 205,
        floorAsset: 'industrialPrisonRedFloor',
        overlayAsset: 'industrialPrisonRedOverlay',
      },
    },
    paths: [],
    obstacles: [
      {
        ...guideObstacle('warung', 238, 142, 170, 42, 205, 154),
        underlay: true,
      },
      {
        ...guideObstacle('hall', 916, 152, 184, 46, 230, 174),
        underlay: true,
      },
      {
        ...guideObstacle('guardPost', 964, 888, 188, 46, 230, 190),
        underlay: true,
      },
      {
        ...guideObstacle('marketStallB', 654, 910, 168, 42, 214, 166),
        underlay: true,
      },
      ...[
        [500, 228],
        [878, 228],
        [380, 308],
        [582, 332],
        [792, 332],
        [1000, 308],
        [500, 430],
        [878, 430],
        [664, 494],
        [380, 568],
        [500, 568],
        [878, 568],
        [1000, 568],
        [500, 682],
        [582, 682],
        [792, 682],
        [878, 682],
      ].map(([x, y], i) =>
        guideObstacle(
          i % 3 === 1 ? 'drain' : 'parkBarrier',
          x,
          y,
          108,
          20,
          132,
          54,
          i % 4 === 0,
        ),
      ),
      guideObstacle('parkTree', 484, 116, 46, 40, 105, 126),
      guideObstacle('parkTree', 174, 290, 48, 42, 108, 130),
      guideObstacle('parkTree', 1228, 290, 48, 42, 108, 130, true),
      guideObstacle('parkTree', 74, 904, 46, 40, 105, 126),
      guideObstacle('parkTree', 1330, 904, 46, 40, 105, 126, true),
      { ...guideObstacle('snackCart', 76, 126, 62, 34, 98, 112), underlay: true },
      { ...guideObstacle('foodCart', 490, 888, 66, 36, 102, 116), underlay: true },
      { ...guideObstacle('snackCart', 930, 950, 62, 34, 98, 112, true), underlay: true },
    ],
    decorations: [
      { asset: 'bunting', x: 590, y: 18, w: 280, h: 102, opacity: 0.92, underlay: true },
      { asset: 'plant', x: 108, y: 964, w: 58, h: 72, underlay: true },
      { asset: 'plant', x: 1282, y: 964, w: 58, h: 72, flip: true, underlay: true },
    ],
    animated: [],
  },
  {
    id: 'pasar',
    name: 'Pasar Senggol',
    kicker: 'Lorong pasar · jalur rapat',
    difficulty: 'normal',
    aiIntensity: 1,
    ground: 'kampungGround',
    background: 'pasar-map.webp',
    designWidth: MAP2_GUIDE_WIDTH,
    designHeight: MAP2_GUIDE_HEIGHT,
    width: MAP2_WORLD_WIDTH,
    height: MAP2_WORLD_HEIGHT,
    objectScale: MAP_OBJECT_SCALE,
    bases: {
      blue: { x: 170, y: 455 },
      red: { x: 1502, y: 455 },
    },
    prisons: {
      blue: {
        x: 205,
        y: 100,
        w: 305,
        h: 220,
        floorAsset: 'map2PrisonRedFloor',
        overlayAsset: 'map2PrisonRedOverlay',
      },
      red: {
        x: 1155,
        y: 96,
        w: 310,
        h: 225,
        floorAsset: 'map2PrisonGreenFloor',
        overlayAsset: 'map2PrisonGreenOverlay',
      },
    },
    paths: [],
    obstacles: [
      guideObstacle('map2BarrierRed', 640, 251, 159, 56, 186, 82),
      guideObstacle('map2BarrierGreen', 875, 251, 147, 56, 180, 82),
      guideObstacle('map2PlanterRed', 647, 665, 164, 78, 190, 105),
      guideObstacle('map2PlanterGreen', 865, 672, 155, 71, 190, 101),
      guideObstacle('map2Trash', 554, 210, 34, 52, 52, 72),
      guideObstacle('map2Cart', 1050, 167, 84, 84, 105, 105),
      ...[
        [400, 339, 140, 50],
        [570, 355, 100, 28],
        [980, 355, 105, 28],
        [1125, 339, 140, 50],
        [300, 430, 160, 62],
        [460, 430, 150, 62],
        [610, 440, 85, 52],
        [700, 382, 270, 150],
        [980, 440, 85, 52],
        [1065, 430, 150, 62],
        [1215, 430, 160, 62],
        [400, 565, 150, 60],
        [575, 600, 110, 30],
        [980, 600, 110, 30],
        [1120, 565, 150, 60],
      ].map(([x, y, w, h]) => map2GroupObstacle(x, y, w, h)),
      {
        ...guideObstacle('marketStallA', 250, 760, 180, 40, 230, 175),
        underlay: true,
      },
      {
        ...guideObstacle('marketStallB', 752, 830, 176, 40, 220, 172),
        underlay: true,
      },
      {
        ...guideObstacle('marketStallC', 1218, 760, 180, 40, 230, 175, true),
        underlay: true,
      },
      {
        ...guideObstacle('snackCart', 548, 790, 66, 36, 104, 118),
        underlay: true,
      },
      {
        ...guideObstacle('foodCart', 1058, 790, 66, 36, 106, 118, true),
        underlay: true,
      },
    ],
    decorations: [
      { asset: 'map2Center', x: 280, y: 320, w: 1115, h: 335, opacity: 0.99 },
    ],
    animated: [],
  },
  {
    id: 'taman',
    name: 'Taman Kota',
    kicker: 'Taman simetris · parkour teknis',
    difficulty: 'hard',
    aiIntensity: 1,
    ground: 'parkGrass',
    background: 'taman-map.webp',
    designWidth: MAP3_GUIDE_WIDTH,
    designHeight: MAP3_GUIDE_HEIGHT,
    width: MAP3_WORLD_WIDTH,
    height: MAP3_WORLD_HEIGHT,
    objectScale: 1,
    structuresInBackground: true,
    bases: {
      blue: { x: 150, y: 452 },
      red: { x: 1518, y: 452 },
    },
    prisons: {
      blue: {
        x: 399,
        y: 645,
        w: 206,
        h: 186,
        floorAsset: 'parkPrisonBlueFloor',
        overlayAsset: 'parkPrisonBlueOverlay',
      },
      red: {
        x: 1046,
        y: 93,
        w: 195,
        h: 159,
        floorAsset: 'parkPrisonRedFloor',
        overlayAsset: 'parkPrisonRedOverlay',
      },
    },
    paths: [],
    obstacles: [
      // Perimeter collision follows the authored water/hedge margin while
      // leaving the north and south entrances open.
      guideCollider('parkCornerNW', 24, 72, 250, 60),
      guideCollider('parkCornerNE', 1398, 72, 250, 60),
      guideCollider('parkCornerNW', 24, 190, 80, 130),
      guideCollider('parkCornerSW', 24, 620, 90, 130),
      guideCollider('parkCornerNE', 1568, 190, 80, 130),
      guideCollider('parkCornerSE', 1558, 620, 90, 130),
      guideCollider('parkCornerSW', 24, 780, 210, 80),
      guideCollider('parkCornerSE', 1438, 780, 210, 80),

      // Four authored parkour barriers and the central fountain footprint.
      guideCollider('parkBarrier', 602, 368, 76, 16),
      guideCollider('parkBarrier', 992, 368, 76, 16),
      guideCollider('parkBarrier', 594, 520, 80, 18),
      guideCollider('parkBarrier', 998, 520, 78, 18),
      guideCollider('flowerBedSmall', 792, 405, 90, 34),

      // Trees, flower beds and benches use only their solid lower footprint.
      guideCollider('parkTree', 398, 190, 76, 28),
      guideCollider('parkFlowerFenceLong', 594, 142, 164, 30),
      guideCollider('parkFlowerFence', 320, 304, 140, 28),
      guideCollider('parkPlanterLong', 642, 265, 112, 26),
      guideCollider('gardenMedium', 885, 248, 94, 24),
      guideCollider('parkTree', 1294, 108, 74, 26),
      guideCollider('parkFlowerFence', 1208, 307, 142, 26),
      guideCollider('parkFlowerFence', 318, 592, 140, 26),
      guideCollider('gardenMedium', 662, 642, 112, 28),
      guideCollider('parkPlanterLong', 916, 633, 116, 28),
      guideCollider('parkFlowerFenceLong', 1215, 624, 142, 28),
      guideCollider('parkTree', 1172, 752, 92, 28),
      guideCollider('parkFlowerFenceLong', 894, 798, 164, 28),

      // Lamps, bollards and bins remain small tactical blockers.
      guideCollider('parkLamp', 506, 110, 16, 14),
      guideCollider('parkLamp', 950, 140, 18, 14),
      guideCollider('parkLamp', 1008, 214, 14, 14),
      guideCollider('parkLamp', 1264, 244, 15, 14),
      guideCollider('parkLamp', 326, 452, 34, 16),
      guideCollider('parkLamp', 1312, 452, 34, 16),
      guideCollider('parkLamp', 364, 674, 14, 14),
      guideCollider('parkLamp', 631, 715, 14, 14),
      guideCollider('parkLamp', 695, 818, 28, 14),
      guideCollider('parkLamp', 1143, 840, 14, 14),
    ],
    decorations: [],
    animated: [],
  },
  {
    id: 'kanal',
    name: 'Alun Kanal Nusantara',
    kicker: 'Kanal cincin · jembatan dan parkour',
    difficulty: 'hard',
    aiIntensity: 1.03,
    ground: 'canalGrass',
    background: 'kanal-map.webp',
    waterMask: 'kanal-water-mask.png',
    waterMaskWidth: 850,
    waterMaskHeight: 463,
    designWidth: 1699,
    designHeight: 926,
    width: 1699,
    height: 926,
    objectScale: 1,
    structuresInBackground: true,
    bases: {
      blue: { x: 180, y: 446 },
      red: { x: 1518, y: 446 },
    },
    prisons: {
      blue: {
        x: 177,
        y: 535,
        w: 153,
        h: 132,
        floorAsset: 'industrialPrisonBlueFloor',
        overlayAsset: 'industrialPrisonBlueOverlay',
      },
      red: {
        x: 1328,
        y: 244,
        w: 150,
        h: 130,
        floorAsset: 'industrialPrisonRedFloor',
        overlayAsset: 'industrialPrisonRedOverlay',
      },
    },
    paths: [],
    obstacles: [
      // Margin/pagar mengikuti footprint padat pada panduan final. Gambar
      // margin sendiri sudah berada di background sehingga tidak menutup
      // benteng atau penjara dengan lapisan visual tambahan.
      guideCollider('jungleNW', 24, 72, 570, 50),
      guideCollider('jungleNE', 1105, 72, 570, 50),
      guideCollider('jungleNW', 594, 72, 210, 45),
      guideCollider('jungleNE', 895, 72, 210, 45),
      guideCollider('jungleNW', 24, 122, 460, 38),
      guideCollider('jungleNE', 1215, 122, 460, 38),
      guideCollider('jungleSW', 24, 820, 570, 66),
      guideCollider('jungleSE', 1105, 820, 570, 66),
      guideCollider('jungleSW', 594, 840, 210, 46),
      guideCollider('jungleSE', 895, 840, 210, 46),
      guideCollider('jungleSW', 24, 770, 300, 50),
      guideCollider('jungleSE', 1375, 770, 300, 50),
      guideCollider('jungleNW', 24, 160, 54, 170),
      guideCollider('jungleSW', 24, 610, 54, 160),
      guideCollider('jungleNE', 1621, 160, 54, 170),
      guideCollider('jungleSE', 1621, 610, 54, 160),

      // Barrier pusat: collider hanya menutupi pot/struktur padat dan
      // menyisakan jalur lari serta semua jembatan tetap terbuka.
      guideCollider('canalBarrierLong', 442, 183, 150, 38),
      guideCollider('canalBarrier', 796, 184, 107, 40),
      guideCollider('canalBarrierLong', 1107, 183, 150, 38),
      guideCollider('flowerBedSmall', 690, 282, 91, 54),
      guideCollider('flowerBedSmall', 918, 282, 91, 54),
      guideCollider('canalBarrierLong', 594, 408, 150, 54),
      guideCollider('canalBarrier', 812, 404, 75, 70),
      guideCollider('canalBarrierLong', 955, 408, 150, 54),
      guideCollider('flowerBedSmall', 690, 535, 91, 54),
      guideCollider('flowerBedSmall', 918, 535, 91, 54),
      guideCollider('canalBarrierLong', 442, 662, 150, 40),
      guideCollider('canalBarrier', 796, 660, 107, 42),
      guideCollider('canalBarrierLong', 1107, 662, 150, 40),

      // Objek taktis sisi luar dan pepohonan rendah.
      guideCollider('canalBarrier', 206, 244, 126, 34),
      guideCollider('canalBarrier', 1367, 553, 126, 34),
      guideCollider('canalBarrier', 258, 684, 116, 34),
      guideCollider('canalBarrier', 1325, 207, 116, 34),
      guideCollider('flowerBedSmall', 448, 639, 105, 32),
      guideCollider('flowerBedSmall', 1146, 214, 105, 32),
    ],
    decorations: [],
    animated: [],
  },
];

const FIELD_CONFIGS: FieldConfig[] = GUIDE_FIELD_CONFIGS.map((field) => {
  const width = field.width ?? W;
  const height = field.height ?? H;
  const scaleX = width / (field.designWidth ?? DESIGN_W);
  const scaleY = height / (field.designHeight ?? DESIGN_H);
  const mapX = (value: number) => Math.round(value * scaleX);
  const mapY = (value: number) => Math.round(value * scaleY);
  const objectScale = field.objectScale ?? 1;
  const mapW = (value: number) => Math.round(value * objectScale);
  const mapH = (value: number) => Math.round(value * objectScale);
  const mapObjectX = (x: number, w: number) =>
    field.objectScale
      ? Math.round((x + w / 2) * scaleX - mapW(w) / 2)
      : mapX(x);
  const mapObjectY = (y: number, h: number) =>
    field.objectScale
      ? Math.round((y + h / 2) * scaleY - mapH(h) / 2)
      : mapY(y);
  return {
    ...field,
    width,
    height,
    bases: field.bases
      ? {
          blue: { x: mapX(field.bases.blue.x), y: mapY(field.bases.blue.y) },
          red: { x: mapX(field.bases.red.x), y: mapY(field.bases.red.y) },
        }
      : BASES,
    prisons: {
      blue: {
        ...field.prisons.blue,
        x: mapObjectX(field.prisons.blue.x, field.prisons.blue.w),
        y: mapObjectY(field.prisons.blue.y, field.prisons.blue.h),
        w: mapW(field.prisons.blue.w),
        h: mapH(field.prisons.blue.h),
      },
      red: {
        ...field.prisons.red,
        x: mapObjectX(field.prisons.red.x, field.prisons.red.w),
        y: mapObjectY(field.prisons.red.y, field.prisons.red.h),
        w: mapW(field.prisons.red.w),
        h: mapH(field.prisons.red.h),
      },
    },
    paths: field.paths.map((path) => ({
      ...path,
      x: mapX(path.x),
      y: mapY(path.y),
      w: mapX(path.w),
      h: mapY(path.h),
      radius: Math.round(path.radius * Math.min(scaleX, scaleY)),
    })),
    obstacles: field.obstacles.map((item) => ({
      ...item,
      x: mapObjectX(item.x, item.w),
      y: mapObjectY(item.y, item.h),
      w: mapW(item.w),
      h: mapH(item.h),
      visualW: mapW(item.visualW),
      visualH: mapH(item.visualH),
    })),
    decorations: field.decorations.map((item) => ({
      ...item,
      x: mapObjectX(item.x, item.w),
      y: mapObjectY(item.y, item.h),
      w: mapW(item.w),
      h: mapH(item.h),
    })),
    animated: field.animated.map((item) => ({
      ...item,
      x: mapObjectX(item.x, item.w),
      y: mapObjectY(item.y, item.h),
      w: mapW(item.w),
      h: mapH(item.h),
    })),
  };
});
const prisonClearance = 12;
const arenaValidationErrors: string[] = [];
for (const field of FIELD_CONFIGS) {
  const fieldWidth = field.width ?? W;
  const fieldHeight = field.height ?? H;
  const fieldBases = field.bases ?? BASES;
  if (field.obstacles.length < 26)
    arenaValidationErrors.push(`${field.id}: kepadatan arena tidak mencukupi`);
  for (const obstacle of field.obstacles) {
    if (
      obstacle.x < 24 ||
      obstacle.y < 72 ||
      obstacle.x + obstacle.w > fieldWidth - 24 ||
      obstacle.y + obstacle.h > fieldHeight - 40
    )
      arenaValidationErrors.push(
        `${field.id}: obstacle ${obstacle.asset} (${obstacle.x},${obstacle.y}) keluar batas arena`,
      );
    for (const prison of Object.values(field.prisons)) {
      const overlapsPrison =
        obstacle.x < prison.x + prison.w + prisonClearance &&
        obstacle.x + obstacle.w > prison.x - prisonClearance &&
        obstacle.y < prison.y + prison.h + prisonClearance &&
        obstacle.y + obstacle.h > prison.y - prisonClearance;
      if (overlapsPrison)
        arenaValidationErrors.push(
          `${field.id}: obstacle ${obstacle.asset} (${obstacle.x},${obstacle.y}) masuk zona penjara`,
        );
    }
    for (const base of Object.values(fieldBases)) {
      const nearestX = Math.max(
        obstacle.x,
        Math.min(obstacle.x + obstacle.w, base.x),
      );
      const nearestY = Math.max(
        obstacle.y,
        Math.min(obstacle.y + obstacle.h, base.y),
      );
      if (Math.hypot(base.x - nearestX, base.y - nearestY) < BASE_RADIUS + 28)
        arenaValidationErrors.push(
          `${field.id}: obstacle ${obstacle.asset} (${obstacle.x},${obstacle.y}) menutup akses benteng`,
        );
    }
  }
}
if (arenaValidationErrors.length > 0)
  throw new Error(arenaValidationErrors.join('\n'));
const FIELD_BY_ID = Object.fromEntries(
  FIELD_CONFIGS.map((field) => [field.id, field]),
) as Record<FieldId, FieldConfig>;
const CAMERA_OPTIONS: Array<{ id: CameraMode; label: string }> = [
  { id: 'follow', label: 'Dekat' },
  { id: 'tactical', label: 'Taktis' },
  { id: 'overview', label: 'Overall' },
];
const initialSnapshot: Snapshot = {
  blue: 0,
  red: 0,
  round: 1,
  timer: 240,
  boost: 100,
  boostCountdown: 0,
  order: 0,
  state: 'IN_BASE',
  paused: false,
  logs: ['Prototype 5v5 siap.'],
  mission: {
    refresh: false,
    boost: false,
    parkour: false,
    tag: false,
    rescue: false,
    combo: false,
  },
  team: [],
  blueHeld: 0,
  redHeld: 0,
  pickupCount: 0,
  fortLock: 'Benteng terbuka',
  baseGrace: 0,
  suddenDeath: false,
  fieldWins: 0,
  comboLevel: 0,
  comboRemaining: 0,
  comboSurgeRemaining: 0,
  comboCallout: '',
  ultimateMeter: 0,
  ultimateBuffRemaining: 0,
  ultimateCasting: false,
};

const other = (team: Team): Team => (team === 'blue' ? 'red' : 'blue');
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const statPercent = (value: number, min: number, max: number) =>
  `${Math.round(clamp((value - min) / (max - min), 0, 1) * 100)}%`;
const uiAsset = (file: string) => publicAsset(`ui-v2/${file}?v=8`);

const CharacterPreview = ({
  id,
  alt = '',
  eager = false,
  className,
  variant = 'icon',
}: {
  id: CharacterId;
  alt?: string;
  eager?: boolean;
  className?: string;
  variant?: 'icon' | 'full';
}) => (
  <img
    className={className}
    src={
      variant === 'full'
        ? characterFullBodyPortrait(id)
        : characterPreviewIcon(id)
    }
    alt={alt}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    onError={(event) => {
      if (event.currentTarget.dataset.fallback === 'true') return;
      event.currentTarget.dataset.fallback = 'true';
      const fallback = characterAsset(id, 'portrait.webp');
      event.currentTarget.src = fallback;
    }}
  />
);

const spriteImages = new Map<CharacterId, HTMLImageElement>();
const fieldImages = new Map<string, HTMLImageElement>();
let sprintDustImage: HTMLImageElement | null = null;
let kakaUltimateImage: HTMLImageElement | null = null;
const spriteFrame = (
  width: number,
  height: number,
  column: number,
  row: number,
) => {
  const x = Math.round((column * width) / 7),
    y = Math.round((row * height) / 6);
  const right = Math.round(((column + 1) * width) / 7),
    bottom = Math.round(((row + 1) * height) / 6);
  return { x, y, width: right - x, height: bottom - y };
};

const getSpriteImage = (id: CharacterId) => {
  const cached = spriteImages.get(id);
  if (cached) return cached;
  const image = new Image();
  image.decoding = 'async';
  image.src = characterRuntimeAsset(id);
  spriteImages.set(id, image);
  return image;
};

const getSprintDustImage = () => {
  if (sprintDustImage) return sprintDustImage;
  sprintDustImage = new Image();
  sprintDustImage.decoding = 'async';
  sprintDustImage.src = publicAsset('vfx/sprint-dust.webp?v=7');
  return sprintDustImage;
};

const getKakaUltimateImage = () => {
  if (kakaUltimateImage) return kakaUltimateImage;
  kakaUltimateImage = new Image();
  kakaUltimateImage.decoding = 'async';
  kakaUltimateImage.src = kakaUltimateSpriteAsset();
  return kakaUltimateImage;
};

const getFieldImage = (asset: string) => {
  const url = publicAsset(`field/${asset}?v=${FIELD_ASSET_VERSION}`);
  const cached = fieldImages.get(url);
  if (cached) return cached;
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  fieldImages.set(url, image);
  return image;
};

export function BentenganPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Set<string>>(new Set());
  const cameraModeRef = useRef<CameraMode>('follow');
  const completedMatchesRef = useRef(0);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [selectedId, setSelectedId] = useState<CharacterId>('raja');
  const [selectedFieldId, setSelectedFieldId] = useState<FieldId>('kampung');
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [mode, setMode] = useState<'menu' | 'playing'>('menu');
  const [menuStep, setMenuStep] = useState<MenuStep>('splash');
  const [hoveredFaction, setHoveredFaction] = useState<Faction | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [view, setView] = useState<'game' | 'workshop'>('game');
  const [run, setRun] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [ultimateBannerVisible, setUltimateBannerVisible] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const selected = CHARACTER_BY_ID[selectedId];
  const availableCharacters = useMemo(
    () =>
      selectedFaction
        ? FIXED_ROSTERS[selectedFaction].map((id) => CHARACTER_BY_ID[id])
        : [],
    [selectedFaction],
  );
  const squad = useMemo(
    () => (selectedFaction ? lineupFor(selectedFaction, selectedId) : []),
    [selectedFaction, selectedId],
  );
  const opponentSquad = useMemo(
    () =>
      selectedFaction
        ? lineupFor(selectedFaction === 'red' ? 'green' : 'red')
        : [],
    [selectedFaction],
  );

  const chooseFaction = (faction: Faction) => {
    setSelectedFaction(faction);
    setSelectedId(FIXED_ROSTERS[faction][0]);
  };

  const playAudioCue = (file: string, volume = 0.55) => {
    try {
      const cue = new Audio(uiAudioAsset(file));
      cue.volume = volume;
      void cue.play().catch(() => undefined);
    } catch {
      /* Audio tetap opsional pada browser yang memblokir media. */
    }
  };

  useEffect(() => {
    const unlock = () => setAudioUnlocked(true);
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!audioUnlocked) return;
    const music = new Audio(
      uiAudioAsset(
        mode === 'playing' ? 'ingame-music.mp3' : 'opening-title.mp3',
      ),
    );
    music.loop = true;
    music.volume = mode === 'playing' ? 0.34 : 0.42;
    const ambience =
      mode === 'playing'
        ? new Audio(uiAudioAsset('ingame-ambience.mp3'))
        : null;
    if (ambience) {
      ambience.loop = true;
      ambience.volume = 0.22;
    }
    void music.play().catch(() => undefined);
    if (ambience) void ambience.play().catch(() => undefined);
    return () => {
      music.pause();
      music.removeAttribute('src');
      music.load();
      if (ambience) {
        ambience.pause();
        ambience.removeAttribute('src');
        ambience.load();
      }
    };
  }, [audioUnlocked, mode]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    if (!ULTIMATE_CHARACTER_IDS.has(selectedId)) return;
    const banner = new Image();
    banner.decoding = 'async';
    banner.src =
      selectedId === 'raja'
        ? rajaUltimateBannerAsset()
        : kakaUltimateBannerAsset();
    if (selectedId === 'kaka') getKakaUltimateImage();
  }, [selectedId]);

  useEffect(() => {
    let uiAudio: AudioContext | null = null;
    let lastHoverTarget: EventTarget | null = null;
    let lastHoverAt = 0;
    const playUiTone = (
      frequency: number,
      duration: number,
      gainValue: number,
      type: OscillatorType = 'sine',
    ) => {
      try {
        uiAudio ??= new AudioContext();
        if (uiAudio.state !== 'running') void uiAudio.resume();
        const oscillator = uiAudio.createOscillator();
        const gain = uiAudio.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, uiAudio.currentTime);
        gain.gain.setValueAtTime(gainValue, uiAudio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          uiAudio.currentTime + duration,
        );
        oscillator.connect(gain);
        gain.connect(uiAudio.destination);
        oscillator.start();
        oscillator.stop(uiAudio.currentTime + duration);
      } catch {
        /* Audio UI bersifat opsional. */
      }
    };
    const playUiSample = (target: HTMLElement) => {
      const file = target.matches('.graffiti-back,.rules-close') ? 'ui-back.mp3' : 'ui-select.mp3';
      const sample = new Audio(uiAudioAsset(file));
      sample.volume = 0.48;
      void sample.play().catch(() => undefined);
    };
    const interactive = (target: EventTarget | null) =>
      target instanceof Element
        ? (target.closest('button,[role="button"]') as HTMLElement | null)
        : null;
    const onPointerOver = (event: PointerEvent) => {
      const target = interactive(event.target);
      const now = performance.now();
      if (
        !target ||
        target === lastHoverTarget ||
        target.matches(':disabled') ||
        event.pointerType !== 'mouse' ||
        now - lastHoverAt < 55 ||
        !uiAudio
      )
        return;
      lastHoverTarget = target;
      lastHoverAt = now;
      playUiTone(560, 0.035, 0.012, 'sine');
    };
    const onPointerOut = (event: PointerEvent) => {
      if (interactive(event.target) === lastHoverTarget) lastHoverTarget = null;
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = interactive(event.target);
      if (!target || target.matches(':disabled')) return;
      playUiSample(target);
      playUiTone(235, 0.06, 0.025, 'triangle');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        interactive(event.target)
      )
        playUiTone(300, 0.055, 0.02, 'triangle');
    };
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      if (uiAudio) void uiAudio.close();
    };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (mode === 'playing') {
        if (
          [
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            ' ',
            'shift',
            'capslock',
          ].includes(key)
        )
          event.preventDefault();
        keys.current.add(key);
      }
    };
    const up = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    const releaseAll = () => keys.current.clear();
    const visibility = () => {
      if (document.hidden) releaseAll();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0,
      last = performance.now(),
      lastHud = 0;
    let phase: 'COUNTDOWN' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER' =
      'COUNTDOWN';
    let phaseUntil = performance.now() + 3000,
      timer = 240,
      round = 1,
      exitCounter = 0;
    let score = { blue: 0, red: 0 },
      paused = false,
      announcement = mode === 'playing' ? 'BERSIAP!' : '',
      roundWinner: Team | undefined;
    let fieldRotationPending = false;
    let logs = [
      '5v5 · pemain yang keluar terakhir memiliki prioritas tangkap tertinggi.',
    ];
    let mission: Mission = {
      refresh: false,
      boost: false,
      parkour: false,
      tag: false,
      rescue: false,
      combo: false,
    };
    let totalCapture = { blue: 0, red: 0 },
      nextRefillSpawn = performance.now() + 8000,
      refillId = 0,
      suddenDeath = false;
    let teamCombos = {
      blue: createTeamComboState(),
      red: createTeamComboState(),
    };
    let comboCallout = '',
      comboCalloutUntil = 0;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }> = [];
    let refills: Refill[] = [],
      audio: AudioContext | null = null,
      parkourLatch = false,
      boostLatch = false,
      boostBurstUntil = 0;
    let ultimateMeter = 0,
      ultimateImpactAt = 0,
      ultimateBuffUntil = 0,
      ultimateShieldUntil = 0,
      ultimateImpactApplied = false;
    let bannerTimeout = 0;
    const field = FIELD_BY_ID[selectedFieldId];
    const worldWidth = field.width ?? W;
    const worldHeight = field.height ?? H;
    const bases = field.bases ?? BASES;
    const obstacles = field.obstacles;
    const fieldObjectScale = field.objectScale ?? 1;
    const fortWidth = Math.round(168 * fieldObjectScale);
    const fortHeight = Math.round(188 * fieldObjectScale);
    const fortAnchorY = Math.round(130 * fieldObjectScale);
    const aiProfile = DIFFICULTY_PROFILES[field.difficulty];
    const fieldObjectAtlas = getFieldImage('objects.webp');
    const fieldAnimatedAtlas = getFieldImage('animated.webp');
    const fieldGroundAtlas = getFieldImage('grounds.webp');
    const fieldBackground = field.background
      ? getFieldImage(field.background)
      : null;
    const fieldWaterMask = field.waterMask
      ? getFieldImage(field.waterMask)
      : null;
    const waterMaskCanvas = document.createElement('canvas');
    waterMaskCanvas.width = field.waterMaskWidth ?? 1;
    waterMaskCanvas.height = field.waterMaskHeight ?? 1;
    const waterMaskContext = waterMaskCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    let waterMaskPixels: Uint8ClampedArray | null = null;
    const cacheWaterMask = () => {
      if (
        !fieldWaterMask ||
        !waterMaskContext ||
        !fieldWaterMask.naturalWidth ||
        !fieldWaterMask.naturalHeight
      )
        return;
      waterMaskContext.clearRect(
        0,
        0,
        waterMaskCanvas.width,
        waterMaskCanvas.height,
      );
      waterMaskContext.drawImage(
        fieldWaterMask,
        0,
        0,
        waterMaskCanvas.width,
        waterMaskCanvas.height,
      );
      waterMaskPixels = waterMaskContext.getImageData(
        0,
        0,
        waterMaskCanvas.width,
        waterMaskCanvas.height,
      ).data;
    };
    const staticMapScale = field.structuresInBackground
      ? 0.75
      : STATIC_MAP_SCALE;
    const staticLayer = document.createElement('canvas');
    staticLayer.width = Math.round(worldWidth * staticMapScale);
    staticLayer.height = Math.round(worldHeight * staticMapScale);
    const staticLayerContext = staticLayer.getContext('2d');
    let staticMapDirty = true;
    const invalidateStaticMap = () => {
      staticMapDirty = true;
    };
    fieldObjectAtlas.addEventListener('load', invalidateStaticMap);
    fieldGroundAtlas.addEventListener('load', invalidateStaticMap);
    fieldBackground?.addEventListener('load', invalidateStaticMap);
    fieldWaterMask?.addEventListener('load', cacheWaterMask);
    if (fieldWaterMask?.complete) cacheWaterMask();

    const beep = (frequency: number, duration = 0.08) => {
      try {
        audio ??= new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.035;
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + duration,
        );
        oscillator.stop(audio.currentTime + duration);
      } catch {
        /* optional */
      }
    };
    const makePlayer = (
      id: string,
      characterId: CharacterId,
      team: Team,
      slot: number,
      controlled = false,
    ): Player => {
      const b = bases[team];
      const character = CHARACTER_BY_ID[characterId];
      const offset =
        GAME_RULES.spawnOffsets[slot] ?? GAME_RULES.spawnOffsets[0];
      const direction = team === 'blue' ? 1 : -1;
      return {
        id,
        name: character.name.toUpperCase(),
        team,
        characterId,
        controlled,
        x: b.x + offset.x * direction,
        y: b.y + offset.y,
        vx: 0,
        vy: 0,
        state: 'IN_BASE',
        exitOrder: 0,
        boost: character.boost,
        baseCharge: 0,
        exitDeadline: 0,
        lastExitAt: 0,
        tagCooldown: 0,
        parkourUntil: 0,
        boostReadyAt: 0,
        fortCharge: 0,
        prisonIndex: 0,
        captures: 0,
        rescueShieldUntil: 0,
        ultimateShieldUntil: 0,
        fallSafeUntil: 0,
        fallNoticeUntil: 0,
        capturedIds: [],
        actionUntil: 0,
        lastX: b.x + offset.x * direction,
        lastY: b.y + offset.y,
        aiSeed: 0.35 + slot * 1.17 + (team === 'red' ? 5.3 : 0),
      };
    };
    const makePlayers = () => {
      const faction = selectedFaction ?? 'red';
      const opponentFaction: Faction = faction === 'red' ? 'green' : 'red';
      const userTeam = TEAM_FOR_FACTION[faction];
      const opponentTeam = TEAM_FOR_FACTION[opponentFaction];
      const userRoster = lineupFor(faction, selectedId);
      const opponentRoster = lineupFor(opponentFaction);
      return [
        ...userRoster.map((characterId, slot) =>
          makePlayer(
            slot === 0 ? 'you' : `ally${slot + 1}`,
            characterId,
            userTeam,
            slot,
            slot === 0,
          ),
        ),
        ...opponentRoster.map((characterId, slot) =>
          makePlayer(`enemy${slot + 1}`, characterId, opponentTeam, slot),
        ),
      ];
    };
    let players = makePlayers();
    const log = (text: string) => {
      logs = [text, ...logs].slice(0, 5);
    };
    const chargeUltimate = (actor: Player, amount: number) => {
      if (!actor.controlled || !ULTIMATE_CHARACTER_IDS.has(actor.characterId))
        return;
      ultimateMeter = clamp(ultimateMeter + amount, 0, 100);
    };
    const burst = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * (30 + Math.random() * 80),
          vy: Math.sin(a) * (30 + Math.random() * 80),
          life: 0.65,
          color,
        });
      }
    };
    const randomGrade = (): Grade => {
      const roll = Math.random();
      return roll < 0.52 ? 25 : roll < 0.78 ? 40 : roll < 0.95 ? 75 : 100;
    };
    const spawnRefill = (now = performance.now()) => {
      const laneCounts = ([0, 1, 2] as const).map(
        (lane) => refills.filter((item) => item.lane === lane).length,
      );
      const minimum = Math.min(...laneCounts);
      const lane = laneCounts.indexOf(minimum) as 0 | 1 | 2;
      const laneBounds = [
        [worldY(92), worldY(292)],
        [worldY(300), worldY(516)],
        [worldY(524), worldY(712)],
      ] as const;
      for (let tries = 0; tries < 30; tries++) {
        const x = worldX(236) + Math.random() * (worldWidth - worldX(472)),
          y =
            laneBounds[lane][0] +
            Math.random() * (laneBounds[lane][1] - laneBounds[lane][0]);
        if (
          obstacles.every(
            (o) =>
              x < o.x - 28 ||
              x > o.x + o.w + 28 ||
              y < o.y - 28 ||
              y > o.y + o.h + 28,
          )
        ) {
          refills.push({
            id: ++refillId,
            x,
            y,
            grade: randomGrade(),
            lane,
            expiresAt: now + 25000,
          });
          return;
        }
      }
    };
    const seedRefills = () => {
      refills = [];
      const now = performance.now();
      for (let i = 0; i < 6; i++) spawnRefill(now);
    };
    seedRefills();
    const resetRound = () => {
      players = makePlayers();
      seedRefills();
      timer = 240;
      exitCounter = 0;
      totalCapture = { blue: 0, red: 0 };
      suddenDeath = false;
      roundWinner = undefined;
      ultimateImpactAt = 0;
      ultimateBuffUntil = 0;
      ultimateShieldUntil = 0;
      ultimateImpactApplied = false;
      setUltimateBannerVisible(false);
      teamCombos = {
        blue: createTeamComboState(),
        red: createTeamComboState(),
      };
      comboCallout = '';
      comboCalloutUntil = 0;
      phase = 'COUNTDOWN';
      phaseUntil = performance.now() + 2800;
      announcement = `RONDE ${round}`;
      log(`Ronde ${round}: 10 pemain menyusun urutan keluar.`);
    };
    const winRound = (team: Team, reason: string) => {
      if (phase !== 'PLAYING') return;
      score[team]++;
      roundWinner = team;
      phase = score[team] >= 2 ? 'MATCH_OVER' : 'ROUND_OVER';
      if (phase === 'MATCH_OVER') {
        completedMatchesRef.current++;
        fieldRotationPending = completedMatchesRef.current >= 3;
        playAudioCue(
          team === players[0].team ? 'victory.mp3' : 'defeat.mp3',
          0.68,
        );
      }
      phaseUntil = performance.now() + (phase === 'MATCH_OVER' ? 7000 : 3800);
      announcement =
        phase === 'MATCH_OVER'
          ? `${teamName(team).toUpperCase()} MENANG MATCH${fieldRotationPending ? ' · FIELD BERIKUTNYA' : ''}`
          : `${teamName(team).toUpperCase()} MENANG · ${reason}`;
      beep(team === 'blue' ? 720 : 320, 0.25);
      burst(worldWidth / 2, worldHeight / 2, TEAM_COLOR[team], 38);
      log(announcement);
    };
    const fortOccupant = (baseTeam: Team, exceptId?: string) =>
      players.find(
        (p) =>
          p.id !== exceptId &&
          p.state === 'ACTIVE' &&
          p.team !== baseTeam &&
          distance(p, bases[baseTeam]) < BASE_RADIUS,
      );
    const tieHash = (id: string) => {
      let value = (2166136261 ^ round) >>> 0;
      for (let i = 0; i < id.length; i++) {
        value ^= id.charCodeAt(i);
        value = Math.imul(value, 16777619) >>> 0;
      }
      value ^= value >>> 16;
      value = Math.imul(value, 0x7feb352d) >>> 0;
      value ^= value >>> 15;
      return value >>> 0;
    };
    const segmentHitsRect = (a: Player, b: Player, o: Obstacle) => {
      const steps = 8;
      for (let i = 1; i < steps; i++) {
        const t = i / steps,
          x = a.x + (b.x - a.x) * t,
          y = a.y + (b.y - a.y) * t;
        if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h)
          return true;
      }
      return false;
    };
    const hasLineOfSight = (a: Player, b: Player) =>
      !obstacles.some((o) => segmentHitsRect(a, b, o));
    const hitsObstacle = (x: number, y: number) =>
      obstacles.some((o) =>
        pointHitsExpandedRect(x, y, o, PLAYER_COLLISION_RADIUS),
      );
    const isWaterAt = (x: number, y: number) => {
      if (!waterMaskPixels) return false;
      const maskX = clamp(
        Math.round((x / worldWidth) * (waterMaskCanvas.width - 1)),
        0,
        waterMaskCanvas.width - 1,
      );
      const maskY = clamp(
        Math.round((y / worldHeight) * (waterMaskCanvas.height - 1)),
        0,
        waterMaskCanvas.height - 1,
      );
      return waterMaskPixels[(maskY * waterMaskCanvas.width + maskX) * 4] > 127;
    };
    const isNearWater = (x: number, y: number) =>
      field.waterMask
        ? [
            [0, 0],
            [-30, 0],
            [30, 0],
            [0, -30],
            [0, 30],
          ].some(([offsetX, offsetY]) =>
            isWaterAt(x + offsetX, y + offsetY),
          )
        : false;
    const recoverFromObstacle = (p: Player, now: number) => {
      if (
        p.state === 'PRISONER' ||
        now < p.parkourUntil ||
        !hitsObstacle(p.x, p.y)
      )
        return;
      const recovered = depenetrateFromRects(
        p,
        obstacles,
        PLAYER_COLLISION_RADIUS,
        { minX: 34, maxX: worldWidth - 34, minY: 58, maxY: worldHeight - 32 },
      );
      p.x = recovered.x;
      p.y = recovered.y;
    };
    const blocked = (x: number, y: number, p: Player, now: number) => {
      if (now >= p.parkourUntil && hitsObstacle(x, y)) return true;
      if (
        p.state === 'IN_BASE' &&
        p.baseCharge < CHARACTER_BY_ID[p.characterId].baseChargeTime &&
        distance(p, bases[p.team]) < BASE_RADIUS &&
        distance({ x, y }, bases[p.team]) >= BASE_RADIUS
      )
        return true;
      for (const team of ['blue', 'red'] as Team[]) {
        const entering =
          distance({ x, y }, bases[team]) < BASE_RADIUS &&
          distance(p, bases[team]) >= BASE_RADIUS;
        if (entering && p.team !== team && fortOccupant(team, p.id))
          return true;
      }
      return false;
    };
    const move = (
      p: Player,
      dx: number,
      dy: number,
      speed: number,
      dt: number,
      now: number,
    ) => {
      const len = Math.hypot(dx, dy) || 1;
      p.vx = (dx / len) * speed;
      p.vy = (dy / len) * speed;
      const nx = clamp(p.x + p.vx * dt, 34, worldWidth - 34),
        ny = clamp(p.y + p.vy * dt, 58, worldHeight - 32);
      if (!blocked(nx, p.y, p, now)) p.x = nx;
      if (!blocked(p.x, ny, p, now)) p.y = ny;
    };
    const spacingPositionAllowed = (p: Player, x: number, y: number) => {
      if (hitsObstacle(x, y)) return false;
      if (
        p.state === 'IN_BASE' &&
        p.baseCharge < CHARACTER_BY_ID[p.characterId].baseChargeTime &&
        distance({ x, y }, bases[p.team]) >= BASE_RADIUS
      )
        return false;
      return true;
    };
    const resolvePlayerSpacing = (now: number) => {
      const visible = players.filter((p) => p.state !== 'PRISONER');
      for (let i = 0; i < visible.length; i++)
        for (let j = i + 1; j < visible.length; j++) {
          const a = visible[i],
            b = visible[j];
          const dx = b.x - a.x,
            dy = b.y - a.y,
            d = Math.hypot(dx, dy);
          const minimum =
            a.state === 'IN_BASE' && b.state === 'IN_BASE' ? 42 : 30;
          if (d >= minimum) continue;
          const nx = d > 0.01 ? dx / d : tieHash(a.id) % 2 ? 1 : -1,
            ny = d > 0.01 ? dy / d : 0;
          const push = (minimum - d) * 0.52;
          const ax = clamp(a.x - nx * push, 34, worldWidth - 34),
            ay = clamp(a.y - ny * push, 58, worldHeight - 32);
          const bx = clamp(b.x + nx * push, 34, worldWidth - 34),
            by = clamp(b.y + ny * push, 58, worldHeight - 32);
          if (spacingPositionAllowed(a, ax, ay)) {
            a.x = ax;
            a.y = ay;
          }
          if (spacingPositionAllowed(b, bx, by)) {
            b.x = bx;
            b.y = by;
          }
        }
      visible.forEach((p) => recoverFromObstacle(p, now));
    };
    const baseVector = (p: Player) => ({
      x: bases[p.team].x - p.x,
      y: bases[p.team].y - p.y,
    });
    const resetFallenPlayer = (p: Player, now: number) => {
      const base = bases[p.team];
      const side = p.team === 'blue' ? 1 : -1;
      const lane = (tieHash(p.id) % 5) - 2;
      p.x = base.x + side * 24;
      p.y = base.y + lane * 17;
      p.lastX = p.x;
      p.lastY = p.y;
      p.vx = 0;
      p.vy = 0;
      p.state = 'IN_BASE';
      p.exitOrder = 0;
      p.baseCharge = 0;
      p.exitDeadline = 0;
      p.fortCharge = 0;
      p.parkourUntil = 0;
      p.action = undefined;
      p.actionUntil = 0;
      p.fallSafeUntil = now + 1800;
      p.fallNoticeUntil = now + 1500;
      burst(p.x, p.y, '#60e6ff', 14);
      if (p.controlled) {
        beep(210, 0.16);
        log('OOOPSS... HATI-HATI · kembali ke benteng.');
      }
    };
    const riverFallCheck = (now: number) => {
      if (!field.waterMask || !waterMaskPixels) return;
      players.forEach((p) => {
        if (
          p.state === 'PRISONER' ||
          now < p.parkourUntil ||
          now < p.fallSafeUntil ||
          !isWaterAt(p.x, p.y)
        )
          return;
        resetFallenPlayer(p, now);
      });
    };
    const aiVector = (p: Player, now: number) => {
      if (p.state === 'RETURNING') return baseVector(p);
      if (p.state === 'IN_BASE')
        return {
          x: worldWidth / 2 - p.x,
          y: worldHeight / 2 + Math.sin(now / 920 + p.aiSeed) * 230 - p.y,
        };
      const held = players
        .filter((q) => q.team === p.team && q.state === 'PRISONER')
        .sort((a, b) => b.prisonIndex - a.prisonIndex);
      if (
        held.length &&
        (p.aiSeed % 3 < aiProfile.rescueCutoff || held.length >= 3)
      )
        return { x: held[0].x - p.x, y: held[0].y - p.y };
      if (p.boost < 34) {
        const item = refills
          .slice()
          .sort((a, b) => distance(p, a) - distance(p, b))[0];
        if (item && distance(p, item) < 360)
          return { x: item.x - p.x, y: item.y - p.y };
      }
      const threat = players
        .filter(
          (q) =>
            q.team !== p.team &&
            q.state === 'ACTIVE' &&
            q.exitOrder > p.exitOrder,
        )
        .sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (threat && distance(p, threat) < aiProfile.threatRadius)
        return { x: p.x - threat.x, y: p.y - threat.y };
      const target = players
        .filter(
          (q) =>
            q.team !== p.team &&
            q.state === 'ACTIVE' &&
            q.exitOrder < p.exitOrder,
        )
        .sort((a, b) => {
          const aPlayerBias = a.controlled ? -aiProfile.playerBias : 0,
            bPlayerBias = b.controlled ? -aiProfile.playerBias : 0;
          return distance(p, a) + aPlayerBias - distance(p, b) - bPlayerBias;
        })[0];
      if (target)
        return {
          x: target.x + target.vx * aiProfile.prediction - p.x,
          y: target.y + target.vy * aiProfile.prediction - p.y,
        };
      if (p.boost < 18 || Math.sin(now / 4300 + p.aiSeed) > 0.86)
        return baseVector(p);
      const enemy = bases[other(p.team)];
      return {
        x: enemy.x - p.x,
        y: enemy.y - p.y + Math.sin(now / 740 + p.aiSeed) * 150,
      };
    };
    const layoutPrisons = () => {
      (['blue', 'red'] as Team[]).forEach((owner) => {
        const prison = field.prisons[owner];
        players
          .filter((p) => p.state === 'PRISONER' && p.prisonOwner === owner)
          .forEach((p, i) => {
            p.prisonIndex = i;
            if (field.id === 'kanal') {
              const column = i % 3;
              const row = Math.floor(i / 3);
              const leftToRight = prison.x + 34 + column * ((prison.w - 68) / 2);
              p.x =
                owner === 'blue'
                  ? leftToRight
                  : prison.x + prison.w - (leftToRight - prison.x);
              p.y = prison.y + 76 + row * 30;
              p.lastX = p.x;
              p.lastY = p.y;
              return;
            }
            p.x =
              owner === 'blue'
                ? prison.x + 62 + i * 31
                : prison.x + prison.w - 62 - i * 31;
            p.y =
              owner === 'blue' ? prison.y + 116 + i * 6 : prison.y + 82 - i * 6;
            p.lastX = p.x;
            p.lastY = p.y;
          });
      });
    };
    const registerTeamAction = (
      actor: Player,
      actionLabel: 'TAG' | 'RESCUE',
      x: number,
      y: number,
      now: number,
    ) => {
      const result = advanceTeamCombo(teamCombos[actor.team], actor.id, now);
      teamCombos[actor.team] = result.state;
      if (result.outcome === 'ignored') return;

      const isPlayerTeam = actor.team === players[0].team;
      if (result.outcome === 'started') {
        if (isPlayerTeam) {
          comboCallout = `LINK 1/3 · ${actor.name} ${actionLabel}`;
          comboCalloutUntil = now + 1400;
        }
        return;
      }

      const teammates = players.filter(
        (p) => p.team === actor.team && p.state !== 'PRISONER',
      );
      if (result.outcome === 'duo') {
        teammates.forEach((p) => {
          const maximum = CHARACTER_BY_ID[p.characterId].boost;
          p.boost = Math.min(maximum, p.boost + maximum * 0.12);
        });
        burst(x, y, '#f5cf45', 20);
        beep(isPlayerTeam ? 680 : 390, 0.14);
        log(`${teamName(actor.team)} merangkai DUO LINK · boost tim +12%.`);
        if (isPlayerTeam) {
          comboCallout = 'DUO LINK · BOOST TIM +12%';
          comboCalloutUntil = now + 1900;
        }
        return;
      }

      teammates.forEach((p) => {
        const maximum = CHARACTER_BY_ID[p.characterId].boost;
        p.boost = Math.min(maximum, p.boost + maximum * 0.16);
      });
      burst(x, y, TEAM_COLOR[actor.team], 32);
      beep(isPlayerTeam ? 880 : 440, 0.22);
      log(
        `${teamName(actor.team)} mengaktifkan SQUAD SURGE · gerak +10% selama 5 detik.`,
      );
      if (isPlayerTeam) {
        mission.combo = true;
        comboCallout = 'SQUAD SURGE · SPEED +10%';
        comboCalloutUntil = now + 2500;
      }
    };
    const capture = (winner: Player, loser: Player, now: number) => {
      if (now < loser.ultimateShieldUntil) return;
      const targetable =
        loser.state === 'ACTIVE' ||
        (loser.state === 'RETURNING' && now >= loser.rescueShieldUntil);
      if (
        winner.state !== 'ACTIVE' ||
        now < winner.parkourUntil ||
        now < loser.parkourUntil ||
        winner.tagCooldown > now ||
        !targetable ||
        winner.exitOrder <= loser.exitOrder
      )
        return;
      winner.tagCooldown =
        now + CHARACTER_BY_ID[winner.characterId].tagCooldownMs;
      winner.captures++;
      if (!winner.capturedIds.includes(loser.id))
        winner.capturedIds.push(loser.id);
      winner.action = 'tag';
      winner.actionUntil = now + 420;
      loser.state = 'PRISONER';
      loser.prisonOwner = winner.team;
      loser.fortCharge = 0;
      loser.rescueShieldUntil = 0;
      burst(loser.x, loser.y, TEAM_COLOR[winner.team]);
      beep(winner.controlled ? 820 : 250);
      log(
        `${winner.name} #${winner.exitOrder} menangkap ${loser.name} #${loser.exitOrder}.`,
      );
      registerTeamAction(winner, 'TAG', loser.x, loser.y, now);
      chargeUltimate(winner, RAJA_ULTIMATE_TAG_BONUS);
      if (winner.controlled) mission.tag = true;
      layoutPrisons();
      if (suddenDeath) winRound(winner.team, 'SUDDEN DEATH TAG');
    };
    const tagCheck = (now: number) => {
      const contacts: Array<{ attacker: Player; target: Player }> = [];
      for (let i = 0; i < players.length; i++)
        for (let j = i + 1; j < players.length; j++) {
          const a = players[i],
            b = players[j],
            contactDistance = Math.min(
              distance(a, b),
              sweptContactDistance(a, b),
            );
          if (
            a.team === b.team ||
            !hasLineOfSight(a, b) ||
            now < a.parkourUntil ||
            now < b.parkourUntil
          )
            continue;
          const aTargetable =
            now >= a.ultimateShieldUntil &&
            (a.state === 'ACTIVE' ||
              (a.state === 'RETURNING' && now >= a.rescueShieldUntil));
          const bTargetable =
            now >= b.ultimateShieldUntil &&
            (b.state === 'ACTIVE' ||
              (b.state === 'RETURNING' && now >= b.rescueShieldUntil));
          if (
            a.state === 'ACTIVE' &&
            bTargetable &&
            a.exitOrder > b.exitOrder &&
            contactDistance <= CHARACTER_BY_ID[a.characterId].tagRange + 4
          )
            contacts.push({ attacker: a, target: b });
          else if (
            b.state === 'ACTIVE' &&
            aTargetable &&
            b.exitOrder > a.exitOrder &&
            contactDistance <= CHARACTER_BY_ID[b.characterId].tagRange + 4
          )
            contacts.push({ attacker: b, target: a });
        }
      contacts.sort(
        (a, b) =>
          b.attacker.exitOrder - a.attacker.exitOrder ||
          b.target.exitOrder - a.target.exitOrder ||
          a.attacker.id.localeCompare(b.attacker.id),
      );
      const resolved = new Set<string>();
      contacts.forEach(({ attacker, target }) => {
        if (resolved.has(attacker.id) || resolved.has(target.id)) return;
        const before = target.state;
        capture(attacker, target, now);
        if (before !== 'PRISONER' && target.state === 'PRISONER') {
          resolved.add(attacker.id);
          resolved.add(target.id);
        }
      });
    };
    const rescueCheck = (now: number) => {
      players
        .filter((p) => p.state === 'ACTIVE')
        .forEach((rescuer) => {
          const held = players
            .filter((p) => p.team === rescuer.team && p.state === 'PRISONER')
            .sort((a, b) => b.prisonIndex - a.prisonIndex);
          const rescuerStats = CHARACTER_BY_ID[rescuer.characterId];
          if (
            held[0] &&
            distance(rescuer, held[0]) < rescuerStats.rescueRange
          ) {
            held.forEach((p) => {
              p.state = 'RETURNING';
              p.prisonOwner = undefined;
              p.rescueShieldUntil = now + rescuerStats.rescueShieldMs;
              p.x += rescuer.team === 'blue' ? -22 : 22;
            });
            rescuer.action = 'rescue';
            rescuer.actionUntil = now + 460;
            burst(held[0].x, held[0].y, '#b9ee3d', 26);
            beep(620, 0.16);
            log(`${rescuer.name} membebaskan ${held.length} rekan.`);
            registerTeamAction(rescuer, 'RESCUE', held[0].x, held[0].y, now);
            chargeUltimate(rescuer, RAJA_ULTIMATE_RESCUE_BONUS);
            if (rescuer.controlled) mission.rescue = true;
          }
        });
    };
    const refillCheck = () => {
      players
        .filter(
          (p) =>
            p.state === 'ACTIVE' &&
            p.boost < CHARACTER_BY_ID[p.characterId].boost,
        )
        .forEach((p) => {
          const item = refills.find((i) => distance(p, i) < 27);
          if (!item) return;
          const maxBoost = CHARACTER_BY_ID[p.characterId].boost;
          p.boost = Math.min(maxBoost, p.boost + (maxBoost * item.grade) / 100);
          refills = refills.filter((i) => i.id !== item.id);
          const refillColor =
            item.grade === 100
              ? '#60e6ff'
              : item.grade === 75
                ? '#ef75ff'
                : item.grade === 40
                  ? '#f5cf45'
                  : '#b9ee3d';
          burst(item.x, item.y, refillColor, 18);
          beep(560 + item.grade * 2, 0.12);
          if (p.controlled) mission.boost = true;
          log(`${p.name} mengambil refill boost ${item.grade}%.`);
        });
    };
    const baseCheck = (
      p: Player,
      dt: number,
      now: number,
      exitCandidates: Player[],
    ) => {
      if (p.state === 'PRISONER') return;
      const stats = CHARACTER_BY_ID[p.characterId],
        insideOwn = distance(p, bases[p.team]) < BASE_RADIUS,
        maxBoost = stats.boost,
        chargeTime = stats.baseChargeTime;
      const contested = Boolean(fortOccupant(p.team));
      if (insideOwn) {
        if (contested) {
          if (p.state === 'IN_BASE' || p.state === 'RETURNING')
            exitCandidates.push(p);
        } else if (
          p.state === 'ACTIVE' &&
          now - p.lastExitAt < BASE_REENTRY_COOLDOWN_MS
        ) {
          p.fortCharge = 0;
        } else {
          if (p.state !== 'IN_BASE') {
            p.state = 'IN_BASE';
            p.baseCharge = 0;
            p.exitDeadline = 0;
            p.fortCharge = 0;
          }
          const charging = players
            .filter(
              (q) =>
                q.team === p.team &&
                q.state === 'IN_BASE' &&
                distance(q, bases[q.team]) < BASE_RADIUS,
            )
            .sort(
              (a, b) =>
                b.baseCharge - a.baseCharge || tieHash(a.id) - tieHash(b.id),
            )
            .slice(0, 3);
          if (
            charging.some((q) => q.id === p.id) &&
            p.baseCharge < chargeTime
          ) {
            p.baseCharge = Math.min(chargeTime, p.baseCharge + dt);
            if (p.baseCharge >= chargeTime && !p.exitDeadline)
              p.exitDeadline = now + 5000;
          }
          p.boost = maxBoost;
          p.boostReadyAt = 0;
          if (
            p.baseCharge >= chargeTime &&
            p.exitDeadline > 0 &&
            now >= p.exitDeadline
          ) {
            p.x =
              bases[p.team].x +
              (p.team === 'blue' ? BASE_RADIUS + 5 : -BASE_RADIUS - 5);
            exitCandidates.push(p);
            log(`${p.name} dipaksa keluar—grace 5 detik habis.`);
          }
        }
      } else if (p.state === 'IN_BASE' && p.baseCharge >= chargeTime) {
        exitCandidates.push(p);
      }
      if (
        p.state === 'ACTIVE' &&
        distance(p, bases[other(p.team)]) < BASE_RADIUS
      ) {
        const defending = players.some(
          (q) =>
            q.team !== p.team &&
            q.state === 'ACTIVE' &&
            distance(q, bases[other(p.team)]) < BASE_RADIUS,
        );
        p.fortCharge = defending ? 0 : p.fortCharge + dt;
        if (p.fortCharge >= 1.5) winRound(p.team, 'BENTENG DIREBUT');
      } else p.fortCharge = 0;
      if (p.boost < maxBoost && p.boostReadyAt > 0 && now >= p.boostReadyAt) {
        p.boost = maxBoost;
        p.boostReadyAt = 0;
        if (p.controlled) {
          log(`Boost ${p.name} pulih penuh setelah 20 detik.`);
          beep(690, 0.13);
        }
      }
    };
    const update = (dt: number, now: number) => {
      if (keys.current.has('p')) {
        keys.current.delete('p');
        paused = !paused;
      }
      if (paused || mode !== 'playing') return;
      if (phase === 'COUNTDOWN') {
        announcement = `${Math.max(1, Math.ceil((phaseUntil - now) / 1000))}`;
        if (now >= phaseUntil) {
          phase = 'PLAYING';
          announcement = 'MULAI!';
          setTimeout(() => {
            if (phase === 'PLAYING') announcement = '';
          }, 800);
        }
        return;
      }
      if (phase === 'ROUND_OVER' && now >= phaseUntil) {
        round++;
        resetRound();
        return;
      }
      if (phase === 'MATCH_OVER') {
        if (now >= phaseUntil) {
          if (fieldRotationPending) {
            const decision = fieldCycleDecision(
              selectedFieldId,
              completedMatchesRef.current,
              FIELD_CONFIGS.map((item) => item.id),
            );
            completedMatchesRef.current = decision.wins;
            setSelectedFieldId(decision.fieldId);
          } else {
            score = { blue: 0, red: 0 };
            round = 1;
            resetRound();
          }
        }
        return;
      }
      if (!suddenDeath) timer -= dt;
      if (!suddenDeath && timer <= 0) {
        const blueHeld = players.filter(
          (p) => p.team === 'red' && p.state === 'PRISONER',
        ).length;
        const redHeld = players.filter(
          (p) => p.team === 'blue' && p.state === 'PRISONER',
        ).length;
        const blueUnique = new Set(
          players
            .filter((p) => p.team === 'blue')
            .flatMap((p) => p.capturedIds),
        ).size;
        const redUnique = new Set(
          players.filter((p) => p.team === 'red').flatMap((p) => p.capturedIds),
        ).size;
        if (blueHeld !== redHeld)
          winRound(blueHeld > redHeld ? 'blue' : 'red', 'WAKTU HABIS');
        else if (blueUnique !== redUnique)
          winRound(blueUnique > redUnique ? 'blue' : 'red', 'TANGKAPAN UNIK');
        else {
          suddenDeath = true;
          timer = 0;
          announcement = 'SUDDEN DEATH';
          log('Skor seri—tag atau rebut benteng berikutnya menang.');
          beep(760, 0.22);
        }
      }
      refills = refills.filter((item) => item.expiresAt > now);
      if (now >= nextRefillSpawn && refills.length < 9) {
        spawnRefill(now);
        nextRefillSpawn = now + 8000 + Math.random() * 4000;
      }
      players.forEach((player) => recoverFromObstacle(player, now));
      players.forEach((player) => {
        player.lastX = player.x;
        player.lastY = player.y;
      });
      const me = players[0];
      let dx = 0,
        dy = 0;
      if (ULTIMATE_CHARACTER_IDS.has(me.characterId))
        ultimateMeter = clamp(
          ultimateMeter + (dt * 100) / RAJA_ULTIMATE_RECHARGE_SECONDS,
          0,
          100,
        );
      if (keys.current.has('capslock')) {
        keys.current.delete('capslock');
        const actionAvailable =
          ULTIMATE_CHARACTER_IDS.has(me.characterId) &&
          ultimateMeter >= 100 &&
          me.state === 'ACTIVE' &&
          now >= me.parkourUntil &&
          (!me.action || now >= me.actionUntil);
        if (actionAvailable) {
          const castDuration =
            me.characterId === 'kaka'
              ? KAKA_ULTIMATE_CAST_MS
              : RAJA_ULTIMATE_CAST_MS;
          ultimateMeter = 0;
          ultimateImpactAt = now + castDuration;
          ultimateImpactApplied = false;
          me.action = 'ultimate';
          me.actionUntil = ultimateImpactAt;
          me.vx = 0;
          me.vy = 0;
          boostBurstUntil = 0;
          setUltimateBannerVisible(true);
          window.clearTimeout(bannerTimeout);
          bannerTimeout = window.setTimeout(
            () => setUltimateBannerVisible(false),
            me.characterId === 'kaka' ? 1050 : 820,
          );
          const isKaka = me.characterId === 'kaka';
          burst(me.x, me.y, isKaka ? '#35f477' : '#ef233c', 14);
          beep(isKaka ? 360 : 180, 0.2);
          log(
            isKaka
              ? 'KAKA membangkitkan PERISAI HIJAU.'
              : 'RAJA memanggil TITAH HALILINTAR.',
          );
        }
      }
      const ultimateCasting =
        ULTIMATE_CHARACTER_IDS.has(me.characterId) &&
        me.action === 'ultimate' &&
        now < me.actionUntil;
      if (
        ultimateImpactAt &&
        !ultimateImpactApplied &&
        now >= ultimateImpactAt
      ) {
        ultimateImpactApplied = true;
        ultimateImpactAt = 0;
        if (me.characterId === 'kaka') {
          ultimateShieldUntil = now + KAKA_ULTIMATE_SHIELD_MS;
          players
            .filter((player) => player.team === me.team)
            .forEach((player) => {
              player.ultimateShieldUntil = ultimateShieldUntil;
            });
          burst(me.x, me.y, '#35f477', 34);
          burst(me.x, me.y, '#baffc9', 18);
          beep(540, 0.32);
          log(
            'PERISAI HIJAU · seluruh rekan kebal TAG selama 5 detik.',
          );
        } else {
          ultimateBuffUntil = now + RAJA_ULTIMATE_BUFF_MS;
          burst(me.x, me.y, '#ef233c', 28);
          burst(me.x, me.y, '#b54a32', 18);
          beep(118, 0.32);
          log(
            'TITAH HALILINTAR · seluruh rekan ACTIVE bergerak +40% selama 5 detik.',
          );
        }
      }
      const rajaUltimateMultiplier = (player: Player) =>
        player.team === me.team &&
        player.state === 'ACTIVE' &&
        now < ultimateBuffUntil
          ? RAJA_ULTIMATE_SPEED_MULTIPLIER
          : 1;
      const playerComboMultiplier = teamComboSpeedMultiplier(
        teamCombos[me.team],
        now,
      );
      if (ultimateCasting) {
        players.forEach((player) => {
          player.vx = 0;
          player.vy = 0;
          player.lastX = player.x;
          player.lastY = player.y;
        });
        boostLatch = keys.current.has(' ');
        parkourLatch = keys.current.has('shift');
        return;
      }
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx--;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx++;
      if (keys.current.has('w') || keys.current.has('arrowup')) dy--;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dy++;
      const boostKey = keys.current.has(' ');
      if (
        boostKey &&
        !boostLatch &&
        me.boost > 0 &&
        (me.state === 'ACTIVE' || me.state === 'IN_BASE')
      )
        boostBurstUntil = now + GAME_RULES.boostDurationMs;
      boostLatch = boostKey;
      const boosting =
        now < boostBurstUntil &&
        me.boost > 0 &&
        (dx || dy) &&
        (me.state === 'ACTIVE' || me.state === 'IN_BASE');
      if (boosting) {
        me.boost = Math.max(
          0,
          me.boost -
            selected.boostDrain * (playerComboMultiplier > 1 ? 0.8 : 1) * dt,
        );
        me.boostReadyAt = now + 20000;
        mission.boost = true;
      }
      const parkourKey = keys.current.has('shift');
      const parkourCost = 8 / selected.agility;
      if (
        parkourKey &&
        !parkourLatch &&
        me.boost >= parkourCost &&
        now > me.parkourUntil &&
        (dx || dy) &&
        (me.state === 'ACTIVE' || me.state === 'IN_BASE')
      ) {
        const near =
          obstacles.some(
            (o) =>
              me.x + 44 > o.x &&
              me.x - 44 < o.x + o.w &&
              me.y + 44 > o.y &&
              me.y - 44 < o.y + o.h,
          ) || isNearWater(me.x, me.y);
        if (near) {
          const parkourDistance = 54 * selected.agility;
          me.parkourUntil = now + 320;
          me.boost = Math.max(0, me.boost - parkourCost);
          me.boostReadyAt = now + 20000;
          me.x = clamp(me.x + dx * parkourDistance, 34, worldWidth - 34);
          me.y = clamp(me.y + dy * parkourDistance, 58, worldHeight - 32);
          mission.parkour = true;
          burst(me.x, me.y, '#f4df9a', 9);
          beep(460);
        }
      }
      parkourLatch = parkourKey;
      if (me.state === 'RETURNING') {
        const vector = baseVector(me);
        move(
          me,
          vector.x,
          vector.y,
          selected.speed * playerComboMultiplier,
          dt,
          now,
        );
      } else if ((dx || dy) && me.state !== 'PRISONER')
        move(
          me,
          dx,
          dy,
          selected.speed *
            playerComboMultiplier *
            rajaUltimateMultiplier(me) *
            (boosting ? selected.boostMultiplier : 1),
          dt,
          now,
        );
      else {
        me.vx = 0;
        me.vy = 0;
      }
      players.slice(1).forEach((p) => {
        if (p.state === 'PRISONER') {
          p.vx = 0;
          p.vy = 0;
          return;
        }
        const stats = CHARACTER_BY_ID[p.characterId];
        const enemyOfPlayer = p.team !== me.team;
        const desired = aiVector(p, now);
        const vector = steerAroundRects(
          p,
          desired,
          obstacles,
          PLAYER_COLLISION_RADIUS,
          enemyOfPlayer ? aiProfile.steerDistance : 78,
          Math.sin(p.aiSeed + now / 1700),
        );
        const far =
          Math.hypot(vector.x, vector.y) > (enemyOfPlayer ? 120 : 165);
        const boostThreshold = enemyOfPlayer ? aiProfile.boostThreshold : -0.15;
        const boostAi =
          p.state === 'ACTIVE' &&
          p.boost > (enemyOfPlayer ? 7 : 12) &&
          far &&
          Math.sin(now / 950 + p.aiSeed) > boostThreshold;
        if (boostAi) {
          p.boost = Math.max(
            0,
            p.boost -
              stats.boostDrain *
                (enemyOfPlayer ? aiProfile.boostDrain : 0.66) *
                dt,
          );
          p.boostReadyAt = now + 20000;
        }
        const comboMultiplier = teamComboSpeedMultiplier(
          teamCombos[p.team],
          now,
        );
        move(
          p,
          vector.x,
          vector.y,
          stats.speed *
            comboMultiplier *
            rajaUltimateMultiplier(p) *
            (enemyOfPlayer
              ? aiProfile.enemySpeed * field.aiIntensity
              : AI_ALLY_SPEED_MULTIPLIER) *
            (boostAi ? stats.boostMultiplier : 1),
          dt,
          now,
        );
      });
      resolvePlayerSpacing(now);
      riverFallCheck(now);
      const exitCandidates: Player[] = [];
      players.forEach((p) => baseCheck(p, dt, now, exitCandidates));
      Array.from(new Map(exitCandidates.map((p) => [p.id, p])).values())
        .sort((a, b) => tieHash(a.id) - tieHash(b.id))
        .forEach((p) => {
          p.state = 'ACTIVE';
          p.exitOrder = ++exitCounter;
          p.lastExitAt = now;
          p.baseCharge = 0;
          p.exitDeadline = 0;
          p.rescueShieldUntil = 0;
          if (p.controlled && p.exitOrder > 5) mission.refresh = true;
          log(`${p.name} keluar sebagai urutan #${p.exitOrder}.`);
          beep(p.controlled ? 520 : 380);
        });
      refillCheck();
      tagCheck(now);
      rescueCheck(now);
      layoutPrisons();
      (['blue', 'red'] as Team[]).forEach((team) => {
        const allHeld = players
          .filter((p) => p.team === other(team))
          .every((p) => p.state === 'PRISONER' && p.prisonOwner === team);
        totalCapture[team] = allHeld ? totalCapture[team] + dt : 0;
        if (totalCapture[team] >= 2) winRound(team, 'SEMUA LAWAN DITANGKAP');
      });
      particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt;
      });
      particles = particles.filter((p) => p.life > 0);
    };

    const roundedOn = (
      target: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) => {
      target.beginPath();
      target.roundRect(x, y, w, h, r);
    };
    const rounded = (x: number, y: number, w: number, h: number, r: number) =>
      roundedOn(ctx, x, y, w, h, r);
    const drawFieldAsset = (
      target: CanvasRenderingContext2D,
      asset: FieldAssetId,
      x: number,
      y: number,
      w: number,
      h: number,
      flip = false,
      opacity = 1,
    ) => {
      const source = FIELD_OBJECT_ATLAS.assets[asset];
      if (!fieldObjectAtlas.complete || !fieldObjectAtlas.naturalWidth) {
        target.fillStyle = 'rgba(28,43,31,.34)';
        roundedOn(target, x, y, w, h, Math.min(12, w / 5));
        target.fill();
        return;
      }
      target.save();
      target.globalAlpha = opacity;
      target.imageSmoothingEnabled = true;
      target.imageSmoothingQuality = 'high';
      if (flip) {
        target.translate(x * 2 + w, 0);
        target.scale(-1, 1);
      }
      target.drawImage(
        fieldObjectAtlas,
        source.x,
        source.y,
        source.width,
        source.height,
        x,
        y,
        w,
        h,
      );
      target.restore();
    };
    const drawAnimatedAsset = (
      target: CanvasRenderingContext2D,
      animationId: FieldAnimatedId,
      x: number,
      y: number,
      w: number,
      h: number,
      now: number,
      flip = false,
      opacity = 1,
    ) => {
      const animation = FIELD_ANIMATED_ATLAS.animations[animationId];
      const frame =
        animation.frames[
          Math.floor((now * animation.fps) / 1000) % animation.frames.length
        ];
      if (!fieldAnimatedAtlas.complete || !fieldAnimatedAtlas.naturalWidth)
        return;
      target.save();
      target.globalAlpha = opacity;
      target.imageSmoothingEnabled = true;
      target.imageSmoothingQuality = 'high';
      if (flip) {
        target.translate(x * 2 + w, 0);
        target.scale(-1, 1);
      }
      target.drawImage(
        fieldAnimatedAtlas,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        x,
        y,
        w,
        h,
      );
      target.restore();
    };
    const groundTileCanvas = (tile: GroundTileId) => {
      const source = FIELD_GROUND_ATLAS.tiles[tile];
      const surface = document.createElement('canvas');
      surface.width = source.width;
      surface.height = source.height;
      const surfaceContext = surface.getContext('2d');
      if (
        surfaceContext &&
        fieldGroundAtlas.complete &&
        fieldGroundAtlas.naturalWidth
      ) {
        surfaceContext.drawImage(
          fieldGroundAtlas,
          source.x,
          source.y,
          source.width,
          source.height,
          0,
          0,
          source.width,
          source.height,
        );
      }
      return surface;
    };
    const drawStaticMap = (target: CanvasRenderingContext2D) => {
      target.clearRect(0, 0, worldWidth, worldHeight);
      target.imageSmoothingEnabled = true;
      target.imageSmoothingQuality = 'high';
      if (
        fieldBackground?.complete &&
        fieldBackground.naturalWidth &&
        fieldBackground.naturalHeight
      ) {
        target.drawImage(fieldBackground, 0, 0, worldWidth, worldHeight);
      } else {
        const primaryPattern = target.createPattern(
          groundTileCanvas(field.ground),
          'repeat',
        );
        target.fillStyle = primaryPattern ?? '#7f815a';
        target.fillRect(0, 0, worldWidth, worldHeight);
      }
      target.fillStyle = 'rgba(19,27,21,.08)';
      target.fillRect(0, 0, worldWidth, worldHeight);
      field.paths.forEach((pathConfig) => {
        const pattern = target.createPattern(
          groundTileCanvas(pathConfig.tile),
          'repeat',
        );
        target.save();
        target.globalAlpha = pathConfig.opacity;
        roundedOn(
          target,
          pathConfig.x,
          pathConfig.y,
          pathConfig.w,
          pathConfig.h,
          pathConfig.radius,
        );
        target.clip();
        target.fillStyle = pattern ?? '#88877a';
        target.fillRect(pathConfig.x, pathConfig.y, pathConfig.w, pathConfig.h);
        target.restore();
        target.strokeStyle = 'rgba(255,245,211,.18)';
        target.lineWidth = 3;
        roundedOn(
          target,
          pathConfig.x,
          pathConfig.y,
          pathConfig.w,
          pathConfig.h,
          pathConfig.radius,
        );
        target.stroke();
      });
      target.strokeStyle = 'rgba(255,255,255,.13)';
      target.lineWidth = 2;
      target.setLineDash([16, 18]);
      [worldY(296), worldY(506)].forEach((y) => {
        target.beginPath();
        target.moveTo(worldX(238), y);
        target.lineTo(worldWidth - worldX(238), y);
        target.stroke();
      });
      target.setLineDash([]);

      const drawSceneryLayer = (underlay: boolean) => {
        const scenery = [
          ...field.decorations
            .filter((item) => Boolean(item.underlay) === underlay)
            .map((item) => ({
              baseline: item.y + item.h,
              draw: () =>
                drawFieldAsset(
                  target,
                  item.asset,
                  item.x,
                  item.y,
                  item.w,
                  item.h,
                  item.flip,
                  item.opacity,
                ),
            })),
          ...obstacles
            .filter(
              (item) =>
                !item.hidden && Boolean(item.underlay) === underlay,
            )
            .map((item) => ({
              baseline: item.y + item.h,
              draw: () =>
                drawFieldAsset(
                  target,
                  item.asset,
                  item.x + item.w / 2 - item.visualW / 2,
                  item.y + item.h - item.visualH,
                  item.visualW,
                  item.visualH,
                  item.flip,
                ),
            })),
        ].sort((a, b) => a.baseline - b.baseline);
        scenery.forEach((item) => item.draw());
      };

      // Border and perimeter art belongs below gameplay-critical structures.
      drawSceneryLayer(true);

      (['blue', 'red'] as Team[]).forEach((team) => {
        const b = bases[team],
          color = TEAM_COLOR[team];
        target.fillStyle = `${color}20`;
        target.beginPath();
        target.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2);
        target.fill();
        target.strokeStyle = `${color}68`;
        target.lineWidth = 3;
        target.beginPath();
        target.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2);
        target.stroke();
        const fortAsset: FieldAssetId =
          team === 'blue' ? 'fortRed' : 'fortGreen';
        if (!field.structuresInBackground)
          drawFieldAsset(
            target,
            fortAsset,
            b.x - fortWidth / 2,
            b.y - fortAnchorY,
            fortWidth,
            fortHeight,
            false,
            0.96,
          );
      });

      if (!field.structuresInBackground)
        (['blue', 'red'] as Team[]).forEach((team) => {
          const prison = field.prisons[team];
          drawFieldAsset(
            target,
            prison.floorAsset ?? 'prisonFloor',
            prison.x,
            prison.y,
            prison.w,
            prison.h,
            prison.flip ?? team === 'red',
            0.96,
          );
        });

      drawSceneryLayer(false);

      if (!field.background) {
        target.fillStyle = 'rgba(20,31,23,.94)';
        target.fillRect(0, 32, worldWidth, 34);
        target.fillRect(0, worldHeight - 32, worldWidth, 32);
        target.strokeStyle = 'rgba(255,241,205,.24)';
        target.lineWidth = 2;
        target.beginPath();
        target.moveTo(0, 66);
        target.lineTo(worldWidth, 66);
        target.stroke();
        target.font = '800 15px var(--font-heading)';
        target.fillStyle = '#fff0cf';
        target.textAlign = 'center';
        target.fillText(
          `${field.name.toUpperCase()} · ${field.difficulty.toUpperCase()} · ARENA 5v5`,
          worldWidth / 2,
          55,
        );
      }
    };
    const drawMap = () => {
      if (staticLayerContext && staticMapDirty) {
        staticLayerContext.setTransform(
          staticMapScale,
          0,
          0,
          staticMapScale,
          0,
          0,
        );
        drawStaticMap(staticLayerContext);
        staticMapDirty = false;
      }
      if (staticLayerContext)
        ctx.drawImage(
          staticLayer,
          0,
          0,
          staticLayer.width,
          staticLayer.height,
          0,
          0,
          worldWidth,
          worldHeight,
        );
      else {
        ctx.fillStyle = '#667556';
        ctx.fillRect(0, 0, worldWidth, worldHeight);
      }
    };
    const drawNearbyFieldDetails = (me: Player, activeCamera: CameraMode) => {
      if (activeCamera === 'overview' || mode !== 'playing') return;
      const radiusSquared = NEAR_FIELD_DETAIL_RADIUS * NEAR_FIELD_DETAIL_RADIUS;
      const isNearby = (x: number, y: number, w: number, h: number) => {
        const dx = x + w / 2 - me.x,
          dy = y + h / 2 - me.y;
        return dx * dx + dy * dy <= radiusSquared;
      };
      field.decorations.forEach((item) => {
        if (!item.underlay && isNearby(item.x, item.y, item.w, item.h))
          drawFieldAsset(
            ctx,
            item.asset,
            item.x,
            item.y,
            item.w,
            item.h,
            item.flip,
            item.opacity,
          );
      });
      obstacles.forEach((item) => {
        if (
          item.hidden ||
          item.underlay ||
          !isNearby(item.x, item.y, item.w, item.h)
        )
          return;
        drawFieldAsset(
          ctx,
          item.asset,
          item.x + item.w / 2 - item.visualW / 2,
          item.y + item.h - item.visualH,
          item.visualW,
          item.visualH,
          item.flip,
        );
      });
      (['blue', 'red'] as Team[]).forEach((team) => {
        const base = bases[team];
        if (
          !field.structuresInBackground &&
          isNearby(
            base.x - fortWidth / 2,
            base.y - fortAnchorY,
            fortWidth,
            fortHeight,
          )
        )
          drawFieldAsset(
            ctx,
            team === 'blue' ? 'fortRed' : 'fortGreen',
            base.x - fortWidth / 2,
            base.y - fortAnchorY,
            fortWidth,
            fortHeight,
            false,
            0.96,
          );
        const prison = field.prisons[team];
        if (
          !field.structuresInBackground &&
          isNearby(prison.x, prison.y, prison.w, prison.h)
        )
          drawFieldAsset(
            ctx,
            prison.floorAsset ?? 'prisonFloor',
            prison.x,
            prison.y,
            prison.w,
            prison.h,
            prison.flip ?? team === 'red',
            0.96,
          );
      });
    };
    const drawFieldAnimations = (now: number) =>
      field.animated.forEach((item) =>
        drawAnimatedAsset(
          ctx,
          item.animation,
          item.x,
          item.y,
          item.w,
          item.h,
          now,
          item.flip,
          item.opacity,
        ),
      );
    const drawPrisonOverlays = (now: number) => {
      if (field.structuresInBackground) return;
      (['blue', 'red'] as Team[]).forEach((team) => {
        const prison = field.prisons[team];
        drawFieldAsset(
          ctx,
          prison.overlayAsset ?? 'prisonOverlay',
          prison.x,
          prison.y,
          prison.w,
          prison.h,
          prison.flip ?? team === 'red',
          0.98,
        );
      });
    };
    const drawBase = (team: Team) => {
      const b = bases[team],
        color = TEAM_COLOR[team],
        occupant = fortOccupant(team);
      ctx.strokeStyle = occupant ? '#f5cf45' : color;
      ctx.lineWidth = occupant ? 7 : 4;
      ctx.setLineDash(occupant ? [3, 5] : [8, 7]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff3d0';
      ctx.font = '800 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        team === 'blue' ? 'BENTENG MERAH' : 'BENTENG HIJAU',
        b.x,
        b.y + 130,
      );
      if (occupant) {
        ctx.fillStyle = '#f5cf45';
        ctx.font = '900 9px Arial';
        ctx.fillText(`TERKUNCI · ${occupant.name}`, b.x, b.y + 144);
      }
    };
    const drawRefill = (item: Refill, now: number) => {
      const animation: FieldAnimatedId =
        item.grade === 100
          ? 'boost100'
          : item.grade === 75
            ? 'boost75'
            : item.grade === 40
              ? 'boost40'
              : 'boost25';
      const pulse = 1 + Math.sin(now / 220 + item.id) * 0.08;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(pulse, pulse);
      drawAnimatedAsset(ctx, animation, -27, -30, 54, 58, now + item.id * 37);
      ctx.restore();
    };
    const relationColor = (p: Player, me: Player, now: number) => {
      if (p.team === me.team) return '#9fd0ff';
      if (p.state === 'PRISONER') return '#8f8d84';
      if (p.state === 'RETURNING' && now < p.rescueShieldUntil)
        return '#60e6ff';
      if (me.state !== 'ACTIVE') return '#f1d46c';
      if (
        (p.state === 'ACTIVE' || p.state === 'RETURNING') &&
        me.exitOrder > p.exitOrder
      )
        return '#b9ee3d';
      return p.state === 'ACTIVE' && p.exitOrder > me.exitOrder
        ? '#ff544b'
        : '#f1d46c';
    };
    const drawPlayer = (p: Player, me: Player, now: number) => {
      const color = TEAM_COLOR[p.team],
        outline = relationColor(p, me, now),
        bob = now < p.parkourUntil ? -15 : 0;
      const stats = CHARACTER_BY_ID[p.characterId],
        image = getSpriteImage(p.characterId),
        speed = Math.hypot(p.vx, p.vy);
      const animation = characterAnimationMapping(p.characterId);
      const dust = getSprintDustImage();
      const direction = directionFromVelocity(p.vx, p.vy);
      const sprinting = speed > stats.speed * 1.16;
      const kakaUltimateActive =
        p.characterId === 'kaka' &&
        p.action === 'ultimate' &&
        now < p.actionUntil;
      const dedicatedEast =
        p.characterId === 'raja'
          ? animation.dedicatedEast
          : characterUsesDedicatedEast(p.characterId);
      let row = animation.directionRows[direction] ?? directionalRow(direction),
        columns: readonly number[] = [0];
      let mirror =
        p.characterId === 'raja'
          ? direction === 'west'
          : shouldMirrorSprite(direction, dedicatedEast);
      let oneShotColumn: number | undefined;
      if (phase === 'ROUND_OVER' || phase === 'MATCH_OVER') {
        const result =
          roundWinner === p.team ? animation.victory : animation.defeat;
        row = result.row;
        columns = result.columns;
        mirror = false;
      } else if (p.state === 'PRISONER') {
        row = animation.prisoner.row;
        columns = animation.prisoner.columns;
        mirror = false;
      } else if (p.action && now < p.actionUntil) {
        if (kakaUltimateActive) {
          mirror = false;
        } else if (p.action === 'ultimate' && animation.ultimate) {
          row = animation.ultimate.row;
          columns = animation.ultimate.columns;
          const elapsed = clamp(
            now - (p.actionUntil - RAJA_ULTIMATE_CAST_MS),
            0,
            RAJA_ULTIMATE_CAST_MS - 1,
          );
          oneShotColumn =
            columns[
              Math.min(
                columns.length - 1,
                Math.floor(elapsed / (RAJA_ULTIMATE_CAST_MS / columns.length)),
              )
            ];
        } else if (p.action === 'tag' && animation.tagByDirection) {
          row = animation.tag.row;
          columns = [animation.tagByDirection[direction]];
        } else {
          const action = p.action === 'tag' ? animation.tag : animation.rescue;
          row = action.row;
          columns = action.columns;
        }
        mirror = false;
      } else if (
        p.characterId === 'raja' &&
        now < p.parkourUntil &&
        animation.parkour
      ) {
        row = animation.parkour.row;
        columns = animation.parkour.columns;
        mirror = direction === 'west';
      } else if (speed > 8)
        columns = sprinting ? animation.boostColumns : animation.runColumns;
      const frameDuration = sprinting ? 62 : columns.length > 1 ? 92 : 180;
      let renderImage = image;
      let frame = spriteFrame(
        image.naturalWidth || 896,
        image.naturalHeight || 816,
        oneShotColumn ??
          columns[Math.floor(now / frameDuration) % columns.length],
        row,
      );
      if (kakaUltimateActive) {
        renderImage = getKakaUltimateImage();
        const stripWidth = renderImage.naturalWidth || 4608;
        const stripHeight = renderImage.naturalHeight || 424;
        const cellWidth = stripWidth / KAKA_ULTIMATE_FRAME_COUNT;
        const elapsed = clamp(
          now - (p.actionUntil - KAKA_ULTIMATE_CAST_MS),
          0,
          KAKA_ULTIMATE_CAST_MS - 1,
        );
        const frameIndex = Math.min(
          KAKA_ULTIMATE_FRAME_COUNT - 1,
          Math.floor(
            elapsed /
              (KAKA_ULTIMATE_CAST_MS / KAKA_ULTIMATE_FRAME_COUNT),
          ),
        );
        frame = {
          x: Math.round(frameIndex * cellWidth),
          y: 0,
          width: Math.round(cellWidth),
          height: stripHeight,
        };
      }

      if (p.state !== 'PRISONER' && teamCombos[p.team].surgeUntil > now) {
        const pulse = 25 + Math.sin(now / 95 + p.aiSeed) * 4;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#f5cf45';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4 + bob, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4 + bob, pulse + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (
        p.state === 'ACTIVE' &&
        p.team === me.team &&
        now < ultimateBuffUntil
      ) {
        const trailLength = 20 + Math.min(28, speed * 0.08);
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = '#ff263f';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.lineTo(
          p.x - p.vx * 0.04 - trailLength,
          p.y - p.vy * 0.04 + Math.sin(now / 45 + p.aiSeed) * 7,
        );
        ctx.stroke();
        ctx.globalAlpha = 0.34;
        ctx.strokeStyle = '#ffb0a0';
        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y - 4 + bob,
          24 + Math.sin(now / 70) * 3,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }

      if (now < p.ultimateShieldUntil) {
        const pulse = 31 + Math.sin(now / 90 + p.aiSeed) * 3;
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#39f57a';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 7 + bob, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = '#63ff93';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 7 + bob, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (sprinting && dust.complete && dust.naturalWidth) {
        const dustColumn = Math.floor(now / 78) % 4;
        ctx.save();
        ctx.globalAlpha = 0.58;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.translate(p.x, p.y + 3);
        ctx.rotate(sprintEffectRotation(direction));
        ctx.drawImage(dust, dustColumn * 256, 0, 256, 192, -78, -29, 92, 69);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 15, 22 * stats.visualScale, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = p.controlled ? 5 : 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 10, 21 * stats.visualScale, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 10, 16 * stats.visualScale, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (p.state === 'PRISONER') {
        ctx.strokeStyle = '#d5d0c4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - 20, p.y + 2);
        ctx.lineTo(p.x + 20, p.y + 2);
        ctx.stroke();
      }

      if (renderImage.complete && renderImage.naturalWidth) {
        const height = kakaUltimateActive
            ? 238 * stats.visualScale * (frame.height / frame.width)
            : (74 * stats.visualScale * frame.height) / 136,
          width = kakaUltimateActive
            ? 238 * stats.visualScale
            : (height * frame.width) / frame.height;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (mirror) {
          ctx.translate(p.x * 2, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(
          renderImage,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          p.x - width / 2,
          p.y + 18 - height + bob,
          width,
          height,
        );
        ctx.restore();
      } else {
        ctx.fillStyle = color;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 2 + bob, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (now < p.ultimateShieldUntil) {
        const shieldX = p.x - 24;
        const shieldY = p.y - 49 + bob;
        ctx.save();
        ctx.fillStyle = 'rgba(10,54,25,.9)';
        ctx.strokeStyle = '#86ffab';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shieldX, shieldY - 9);
        ctx.lineTo(shieldX + 8, shieldY - 5);
        ctx.lineTo(shieldX + 7, shieldY + 4);
        ctx.quadraticCurveTo(shieldX, shieldY + 12, shieldX - 7, shieldY + 4);
        ctx.lineTo(shieldX - 8, shieldY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (p.controlled) {
        ctx.fillStyle = '#fff4d1';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 58 + bob);
        ctx.lineTo(p.x - 7, p.y - 69 + bob);
        ctx.lineTo(p.x + 7, p.y - 69 + bob);
        ctx.fill();
      }
      const label = p.controlled ? `★ ${p.name}` : p.name;
      ctx.font = '900 9px Arial';
      const labelWidth = Math.max(38, ctx.measureText(label).width + 14);
      ctx.fillStyle = 'rgba(13,18,14,.92)';
      rounded(p.x - labelWidth / 2, p.y + 23, labelWidth, 17, 5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = p.controlled ? 2.5 : 1.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(label, p.x, p.y + 35);
      if (p.state === 'ACTIVE') {
        ctx.fillStyle = '#141a15';
        ctx.beginPath();
        ctx.arc(p.x + 23, p.y - 35 + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '800 9px Arial';
        ctx.fillText(String(p.exitOrder), p.x + 23, p.y - 32 + bob);
      }
      if (p.state === 'RETURNING') {
        ctx.fillStyle = now < p.rescueShieldUntil ? '#60e6ff' : '#f5cf45';
        ctx.font = '800 8px Arial';
        ctx.fillText(
          now < p.rescueShieldUntil ? 'GHOST' : 'KEMBALI',
          p.x,
          p.y - 55,
        );
      }
      if (now < p.fallNoticeUntil) {
        const noticeY = p.y - 78 + bob;
        ctx.font = '900 10px Arial';
        const noticeWidth = ctx.measureText('OOOPSS... HATI-HATI').width + 18;
        ctx.fillStyle = 'rgba(18,25,20,.94)';
        rounded(p.x - noticeWidth / 2, noticeY - 15, noticeWidth, 21, 7);
        ctx.fill();
        ctx.strokeStyle = '#f5cf45';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff4d1';
        ctx.textAlign = 'center';
        ctx.fillText('OOOPSS... HATI-HATI', p.x, noticeY);
      }
      if (p.state === 'IN_BASE' && p.baseCharge < stats.baseChargeTime) {
        ctx.fillStyle = '#9b9d91';
        ctx.fillRect(p.x - 18, p.y + 40, 36, 4);
        ctx.fillStyle = '#60e6ff';
        ctx.fillRect(
          p.x - 18,
          p.y + 40,
          (36 * p.baseCharge) / stats.baseChargeTime,
          4,
        );
      }
      if (p.fortCharge > 0) {
        ctx.fillStyle = '#f5cf45';
        ctx.fillRect(
          p.x - 18,
          p.y + 40,
          36 * Math.min(1, p.fortCharge / 1.5),
          4,
        );
      }
    };
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        cw = rect.width,
        ch = rect.height;
      if (
        canvas.width !== Math.round(cw * dpr) ||
        canvas.height !== Math.round(ch * dpr)
      ) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      const me = players[0];
      const activeCamera = cameraModeRef.current;
      const scale =
        mode !== 'playing' || activeCamera === 'overview'
          ? Math.min(cw / worldWidth, ch / worldHeight)
          : activeCamera === 'tactical'
            ? Math.max(cw / 1220, ch / 720)
            : Math.max(cw / 980, ch / 620);
      const halfW = cw / (2 * scale),
        halfH = ch / (2 * scale);
      const followsPlayer = mode === 'playing' && activeCamera !== 'overview';
      const camX = followsPlayer
        ? clamp(me.x, halfW, worldWidth - halfW)
        : worldWidth / 2;
      const camY = followsPlayer
        ? clamp(me.y, halfH, worldHeight - halfH)
        : worldHeight / 2;
      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(scale, scale);
      ctx.translate(-camX, -camY);
      drawMap();
      drawNearbyFieldDetails(me, activeCamera);
      drawBase('blue');
      drawBase('red');
      if (mode === 'playing') {
        drawFieldAnimations(now);
        refills.forEach((item) => drawRefill(item, now));
        players
          .slice()
          .sort((a, b) => a.y - b.y)
          .forEach((p) => drawPlayer(p, me, now));
        drawPrisonOverlays(now);
        particles.forEach((p) => {
          ctx.globalAlpha = Math.max(0, p.life / 0.65);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (mode === 'playing') {
        const marker = (
          point: { x: number; y: number },
          label: string,
          color: string,
        ) => {
          const sx = (point.x - camX) * scale + cw / 2,
            sy = (point.y - camY) * scale + ch / 2;
          if (sx > 36 && sx < cw - 36 && sy > 70 && sy < ch - 36) return;
          const x = clamp(sx, 28, cw - 28),
            y = clamp(sy, 72, ch - 28);
          ctx.fillStyle = '#111812dd';
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = '900 9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(label, x, y + 3);
        };
        marker(bases.blue, 'M', TEAM_COLOR.blue);
        marker(bases.red, 'H', TEAM_COLOR.red);
        const outerPrisoner = players
          .filter((p) => p.team === me.team && p.state === 'PRISONER')
          .sort((a, b) => b.prisonIndex - a.prisonIndex)[0];
        if (outerPrisoner) marker(outerPrisoner, 'P', '#b9ee3d');
      }
      if (phase !== 'PLAYING') {
        ctx.fillStyle = 'rgba(12,17,13,.52)';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#fff4d1';
        ctx.font = `800 ${phase === 'COUNTDOWN' ? 90 : 54}px var(--font-heading)`;
        ctx.textAlign = 'center';
        ctx.fillText(announcement, cw / 2, ch / 2);
      }
    };
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      update(dt, now);
      draw(now);
      if (now - lastHud > 100) {
        lastHud = now;
        const me = players[0],
          blueLock = fortOccupant('blue'),
          redLock = fortOccupant('red');
        canvas.dataset.playerPosition = `${me.x.toFixed(1)},${me.y.toFixed(1)}`;
        canvas.dataset.embeddedPlayers = String(
          players.filter(
            (p) => p.state !== 'PRISONER' && hitsObstacle(p.x, p.y),
          ).length,
        );
        canvas.dataset.aiMoving = String(
          players
            .slice(1)
            .filter((p) => p.state !== 'PRISONER' && Math.hypot(p.vx, p.vy) > 8)
            .length,
        );
        canvas.dataset.enemyCaptures = String(
          players
            .filter((p) => p.team !== me.team)
            .reduce((sum, p) => sum + p.captures, 0),
        );
        canvas.dataset.teamCombo = `${teamCombos[me.team].step}:${teamComboSeconds(teamCombos[me.team], now)}`;
        const playerCombo = teamCombos[me.team];
        setSnapshot({
          blue: score.blue,
          red: score.red,
          round,
          timer,
          boost: (me.boost / selected.boost) * 100,
          boostCountdown:
            me.boost >= selected.boost || !me.boostReadyAt
              ? 0
              : Math.max(0, Math.ceil((me.boostReadyAt - now) / 1000)),
          order: me.exitOrder,
          state: me.state,
          paused,
          logs,
          mission: { ...mission },
          team: players
            .filter((p) => p.team === me.team)
            .map((p) => ({
              name: p.name,
              characterId: p.characterId,
              state: p.state,
              boost: (p.boost / CHARACTER_BY_ID[p.characterId].boost) * 100,
            })),
          blueHeld: players.filter(
            (p) => p.team === 'red' && p.state === 'PRISONER',
          ).length,
          redHeld: players.filter(
            (p) => p.team === 'blue' && p.state === 'PRISONER',
          ).length,
          pickupCount: refills.length,
          fortLock: blueLock
            ? `Merah dikunci ${blueLock.name}`
            : redLock
              ? `Hijau dikunci ${redLock.name}`
              : 'Benteng terbuka',
          baseGrace:
            me.state === 'IN_BASE' && me.exitDeadline
              ? Math.max(0, Math.ceil((me.exitDeadline - now) / 1000))
              : 0,
          suddenDeath,
          fieldWins: completedMatchesRef.current,
          comboLevel: playerCombo.step,
          comboRemaining:
            playerCombo.surgeUntil > now
              ? 0
              : teamComboSeconds(playerCombo, now),
          comboSurgeRemaining:
            playerCombo.surgeUntil > now
              ? teamComboSeconds(playerCombo, now)
              : 0,
          comboCallout: now < comboCalloutUntil ? comboCallout : '',
          ultimateMeter: ULTIMATE_CHARACTER_IDS.has(me.characterId)
            ? ultimateMeter
            : 0,
          ultimateBuffRemaining:
            now <
            (me.characterId === 'kaka'
              ? ultimateShieldUntil
              : ultimateBuffUntil)
              ? Math.ceil(
                  ((me.characterId === 'kaka'
                    ? ultimateShieldUntil
                    : ultimateBuffUntil) -
                    now) /
                    1000,
                )
              : 0,
          ultimateCasting:
            ULTIMATE_CHARACTER_IDS.has(me.characterId) &&
            me.action === 'ultimate' &&
            now < me.actionUntil,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      audio?.close();
      window.clearTimeout(bannerTimeout);
      fieldObjectAtlas.removeEventListener('load', invalidateStaticMap);
      fieldGroundAtlas.removeEventListener('load', invalidateStaticMap);
      fieldBackground?.removeEventListener('load', invalidateStaticMap);
      fieldWaterMask?.removeEventListener('load', cacheWaterMask);
    };
  }, [mode, run, selected, selectedFaction, selectedFieldId, selectedId]);

  const missionCount = useMemo(
    () => Object.values(snapshot.mission).filter(Boolean).length,
    [snapshot.mission],
  );
  const start = () => {
    if (!selectedFaction) return;
    playAudioCue('press-play.mp3', 0.64);
    completedMatchesRef.current = 0;
    setSnapshot(initialSnapshot);
    setMissionOpen(false);
    setMode('playing');
    setRun((v) => v + 1);
  };
  const quit = () => {
    keys.current.clear();
    completedMatchesRef.current = 0;
    setSnapshot(initialSnapshot);
    setMode('menu');
    setMenuStep('splash');
    setRulesOpen(false);
    setMissionOpen(false);
    setSelectedFaction(null);
    setSelectedId('raja');
    setSelectedFieldId('kampung');
    setCameraMode('follow');
    setRun((v) => v + 1);
  };
  const cycleCharacter = (direction: -1 | 1) => {
    if (!selectedFaction) return;
    const roster = FIXED_ROSTERS[selectedFaction];
    const index = roster.indexOf(selectedId);
    setSelectedId(roster[(index + direction + roster.length) % roster.length]);
  };
  const goBack = () => {
    if (rulesOpen) return setRulesOpen(false);
    if (menuStep === 'field') return setMenuStep('character');
    if (menuStep === 'character') return setMenuStep('team');
    if (menuStep === 'team') return setMenuStep('splash');
  };

  useEffect(() => {
    if (mode !== 'menu' || view !== 'game') return;
    const navigate = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (rulesOpen) {
        if (key === 'escape') setRulesOpen(false);
        return;
      }
      if (menuStep === 'splash' && (key === ' ' || key === 'enter')) {
        event.preventDefault();
        playAudioCue('press-play.mp3', 0.64);
        setMenuStep('team');
        return;
      }
      if (key === 'escape') {
        goBack();
        return;
      }
      if (
        menuStep === 'team' &&
        (key === 'arrowleft' || key === 'arrowright')
      ) {
        event.preventDefault();
        setHoveredFaction(key === 'arrowleft' ? 'red' : 'green');
        return;
      }
      if (menuStep === 'team' && key === 'enter' && hoveredFaction) {
        chooseFaction(hoveredFaction);
        setMenuStep('character');
        return;
      }
      if (
        menuStep === 'character' &&
        (key === 'arrowleft' || key === 'arrowright')
      ) {
        event.preventDefault();
        cycleCharacter(key === 'arrowleft' ? -1 : 1);
        return;
      }
      if (menuStep === 'character' && key === 'enter') {
        setMenuStep('field');
        return;
      }
      if (
        menuStep === 'field' &&
        (key === 'arrowleft' || key === 'arrowright')
      ) {
        event.preventDefault();
        const index = FIELD_CONFIGS.findIndex(
          (field) => field.id === selectedFieldId,
        );
        setSelectedFieldId(
          FIELD_CONFIGS[
            (index + (key === 'arrowleft' ? -1 : 1) + FIELD_CONFIGS.length) %
              FIELD_CONFIGS.length
          ].id,
        );
      }
      if (menuStep === 'field' && key === 'enter') start();
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [
    hoveredFaction,
    menuStep,
    mode,
    rulesOpen,
    selectedFaction,
    selectedFieldId,
    selectedId,
    view,
  ]);

  const touchKey = (key: string, pressed: boolean) =>
    pressed ? keys.current.add(key) : keys.current.delete(key);
  const tapKey = (key: string) => {
    keys.current.add(key);
    window.setTimeout(() => keys.current.delete(key), 120);
  };
  const touchControl = (key: string) => {
    const release = () => touchKey(key, false);
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        touchKey(key, true);
      },
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
      onLostPointerCapture: release,
    };
  };
  if (view === 'workshop')
    return (
      <main className="game-shell">
        <CharacterWorkshop onClose={() => setView('game')} />
      </main>
    );
  if (mode === 'menu') {
    const activeFaction = hoveredFaction;
    return (
      <main
        className={`pregame-shell step-${menuStep}`}
        style={
          {
            '--button-normal': `url(${uiAsset('controls/primary.webp')})`,
            '--button-hover': `url(${uiAsset('controls/primary-hover.webp')})`,
          } as React.CSSProperties
        }
      >
        <div className="ink-noise" />
        {menuStep === 'splash' && (
          <section className="splash-screen" aria-labelledby="game-title">
            <img
              className="splash-hero splash-red"
              src={uiAsset('heroes/red-active.webp')}
              alt="Raja dari Tim Merah"
            />
            <img
              className="splash-hero splash-green"
              src={uiAsset('heroes/green-active.webp')}
              alt="Kaka dari Tim Hijau"
            />
            <div className="splash-center">
              <img
                className="splash-logo"
                src={publicAsset('brand/benteng-tag-logo.webp?v=9')}
                alt="Benteng Squad Tag"
                id="game-title"
              />
              <button
                className="enter-game"
                onClick={() => {
                  playAudioCue('press-play.mp3', 0.64);
                  setMenuStep('team');
                }}
              >
                <span>PRESS</span> SPACE <small>atau klik untuk masuk</small>
              </button>
            </div>
          </section>
        )}

        {menuStep === 'team' && (
          <section className="team-screen" aria-labelledby="team-title">
            <h1 id="team-title" className="sr-only">
              Pilih tim
            </h1>
            <img
              className="ghost-logo"
              src={publicAsset('brand/benteng-tag-logo.webp?v=9')}
              alt=""
            />
            {(['red', 'green'] as Faction[]).map((faction) => (
              <button
                key={faction}
                className={`team-pick team-pick-${faction} ${activeFaction === faction ? 'active' : ''}`}
                onPointerEnter={() => setHoveredFaction(faction)}
                onPointerLeave={() => setHoveredFaction(null)}
                onFocus={() => setHoveredFaction(faction)}
                onClick={() => {
                  chooseFaction(faction);
                  setMenuStep('character');
                }}
                aria-label={`Pilih ${factionName(faction)}`}
              >
                <img
                  className="team-hero"
                  src={uiAsset(
                    `heroes/${faction}-${activeFaction === faction ? 'active' : 'inactive'}.webp`,
                  )}
                  alt=""
                />
                <img
                  className="team-banner"
                  src={uiAsset(
                    `controls/team-${faction}-${activeFaction === faction ? 'active' : 'normal'}.webp`,
                  )}
                  alt={factionName(faction)}
                />
              </button>
            ))}
            <div className="team-hint">
              Arah kiri/kanan untuk memilih · Enter untuk lanjut
            </div>
          </section>
        )}

        {menuStep === 'character' && selectedFaction && (
          <section
            className={`roster-screen faction-${selectedFaction}`}
            aria-labelledby="roster-title"
          >
            <video
              className="roster-video"
              src={characterSelectionVideo(selectedFaction)}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
            <header className="roster-branding">
              <img
                className="roster-team-main"
                src={uiAsset(`controls/team-${selectedFaction}-active.webp`)}
                alt={factionName(selectedFaction)}
              />
              <button
                className="roster-team-swap"
                onClick={() => {
                  const next = selectedFaction === 'red' ? 'green' : 'red';
                  chooseFaction(next);
                }}
                aria-label="Ganti tim"
              >
                <img
                  src={uiAsset(
                    `controls/team-${selectedFaction === 'red' ? 'green' : 'red'}-normal.webp`,
                  )}
                  alt={factionName(selectedFaction === 'red' ? 'green' : 'red')}
                />
              </button>
            </header>
            <h1 id="roster-title" className="sr-only">
              Pilih karakter {factionName(selectedFaction)}
            </h1>
            <div className="roster-stage">
              <button
                className="carousel-arrow left"
                onClick={() => cycleCharacter(-1)}
                aria-label="Karakter sebelumnya"
              >
                ‹
              </button>
              <div className="character-carousel">
                {availableCharacters.map((character, index) => (
                  <button
                    key={character.id}
                    className={`carousel-character ${selectedId === character.id ? 'selected' : ''}`}
                    style={
                      {
                        '--offset':
                          index -
                          availableCharacters.findIndex(
                            (item) => item.id === selectedId,
                          ),
                      } as React.CSSProperties
                    }
                    onClick={() => setSelectedId(character.id)}
                    aria-pressed={selectedId === character.id}
                  >
                    <CharacterPreview
                      id={character.id}
                      alt={character.name}
                      eager={selectedId === character.id}
                      variant="full"
                    />
                    <span>{character.name}</span>
                  </button>
                ))}
              </div>
              <button
                className="carousel-arrow right"
                onClick={() => cycleCharacter(1)}
                aria-label="Karakter berikutnya"
              >
                ›
              </button>
            </div>
            <aside className="ability-panel">
              <span>
                {factionName(selectedFaction)} · {selected.role}
              </span>
              <h2>{selected.name}</h2>
              <p>{selected.copy}</p>
              <div className="passive-card">
                <small>KEMAMPUAN KHUSUS</small>
                <b>{selected.passiveName}</b>
                <em>{selected.passiveCopy}</em>
              </div>
              <dl>
                <div>
                  <dt>
                    Speed <b>{selected.speed}</b>
                  </dt>
                  <dd>
                    <i
                      style={{ width: statPercent(selected.speed, 188, 240) }}
                    />
                  </dd>
                </div>
                <div>
                  <dt>
                    Boost <b>{selected.boost}</b>
                  </dt>
                  <dd>
                    <i
                      style={{ width: statPercent(selected.boost, 84, 128) }}
                    />
                  </dd>
                </div>
                <div>
                  <dt>
                    Agility <b>{selected.agility.toFixed(2)}</b>
                  </dt>
                  <dd>
                    <i
                      style={{
                        width: statPercent(selected.agility, 0.82, 1.25),
                      }}
                    />
                  </dd>
                </div>
              </dl>
              <button
                className="graffiti-primary"
                onClick={() => setMenuStep('field')}
              >
                <span>PILIH {selected.name}</span>
              </button>
            </aside>
          </section>
        )}

        {menuStep === 'field' && selectedFaction && (
          <section
            className={`field-select-screen faction-${selectedFaction}`}
            aria-labelledby="field-title"
          >
            <header>
              <span>LANGKAH TERAKHIR</span>
              <h1 id="field-title">Pilih arena pertarungan</h1>
              <p>
                Setiap arena punya kepadatan jalur berbeda. Rotasi otomatis
                terjadi setelah tiga kemenangan.
              </p>
            </header>
            <div className="field-card-row">
              {FIELD_CONFIGS.map((field, index) => (
                <button
                  key={field.id}
                  className={`field-card field-${field.id} difficulty-${field.difficulty} ${selectedFieldId === field.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFieldId(field.id)}
                  aria-pressed={selectedFieldId === field.id}
                >
                  <img
                    className="field-card-preview"
                    src={uiAsset(`fields/${field.id}.webp`)}
                    alt=""
                    aria-hidden="true"
                  />
                  <small>0{index + 1}</small>
                  <em>{field.difficulty}</em>
                  <strong>{field.name}</strong>
                  <span>{field.kicker}</span>
                  <i>
                    {selectedFieldId === field.id
                      ? 'ARENA AKTIF'
                      : 'PILIH ARENA'}
                  </i>
                </button>
              ))}
            </div>
            <div className="match-lineup">
              <div>
                {squad.map((id, index) => (
                  <figure key={id} className={index === 0 ? 'controlled' : ''}>
                    <CharacterPreview
                      id={id}
                      alt={CHARACTER_BY_ID[id].name}
                      eager={index === 0}
                    />
                    <figcaption>
                      {index === 0 ? 'KAMU' : CHARACTER_BY_ID[id].name}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <b>VS</b>
              <div>
                {opponentSquad.map((id) => (
                  <figure key={id}>
                    <CharacterPreview id={id} alt={CHARACTER_BY_ID[id].name} />
                    <figcaption>{CHARACTER_BY_ID[id].name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <button
              className={`graffiti-primary launch-${selectedFaction}`}
              onClick={start}
            >
              <span>
                <Play size={19} fill="currentColor" /> MULAI MATCH
              </span>
            </button>
          </section>
        )}

        {menuStep !== 'splash' && (
          <button
            className="graffiti-back"
            onClick={goBack}
            aria-label="Kembali"
          >
            <img src={uiAsset('controls/back.webp')} alt="Kembali" />
          </button>
        )}
        <div className={`pregame-actions step-${menuStep}`}>
          <button
            className="rules-button graffiti-primary"
            onClick={() => setRulesOpen(true)}
          >
            <span>GAME RULES</span>
          </button>
          <button className="workshop-link" onClick={() => setView('workshop')}>
            <Wrench size={14} /> Workshop
          </button>
        </div>
        {rulesOpen && (
          <div
            className="rules-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-title"
          >
            <div className="rules-dialog">
              <button
                className="rules-close"
                onClick={() => setRulesOpen(false)}
                aria-label="Tutup"
              >
                ×
              </button>
              <span>BENTENGAN 5V5</span>
              <h2 id="rules-title">Cara merebut kemenangan</h2>
              <ol>
                <li>
                  <b>Keluar dari benteng.</b> Urutan keluar menentukan siapa
                  yang boleh menangkap siapa.
                </li>
                <li>
                  <b>Tag lawan yang keluar lebih dulu.</b> Mereka masuk penjara
                  timmu.
                </li>
                <li>
                  <b>Sentuh rekan terluar di penjara</b> untuk membebaskan
                  seluruh rantai.
                </li>
                <li>
                  <b>Rangkai combo aksi tim.</b> Tag atau rescue dari rekan
                  berbeda dalam 6,5 detik memberi boost tim dan Squad Surge.
                </li>
                <li>
                  <b>Serbu benteng lawan.</b> Isi meter benteng tanpa tertangkap
                  untuk menang.
                </li>
              </ol>
              <p>
                WASD gerak · Space sprint · Shift parkour · Caps Lock Ultimate
                Raja · P jeda
              </p>
            </div>
          </div>
        )}
      </main>
    );
  }
  return (
    <main className="game-shell playing-shell">
      <header className="game-topbar">
        <div className="brand-lockup">
          <img
            className="game-logo"
            src={publicAsset('brand/benteng-tag-logo.webp?v=9')}
            alt="Benteng Squad Tag"
          />
          <span className="brand-kicker">
            <i /> Playable rules prototype
            <br />
            Field compact · guarded
          </span>
        </div>
        <div className="top-actions">
          <button
            className="icon-button hud-menu-button"
            onClick={() => setMissionOpen((value) => !value)}
            aria-label="Buka menu misi"
          >
            <Menu size={19} />
          </button>
          <button
            className="icon-button"
            onClick={() => keys.current.add('p')}
            aria-label="Jeda"
          >
            <Pause size={18} />
          </button>
        </div>
      </header>
      <section className="prototype-grid">
        <div className="stage-card">
          <canvas
            ref={canvasRef}
            aria-label={`Arena ${FIELD_BY_ID[selectedFieldId].name} 5 lawan 5 yang dapat dimainkan`}
          />
          <div className="stage-hud">
            <div className="hud-red">
              <span>{snapshot.blue}</span>
              <b>
                TIM MERAH<small>{snapshot.blueHeld}/5 TAHANAN</small>
              </b>
            </div>
            <time>
              {snapshot.suddenDeath ? 'SD' : formatTime(snapshot.timer)}
              <small>WAKTU</small>
            </time>
            <div className="hud-green">
              <b>
                HIJAU<small>{snapshot.redHeld}/5 TAHANAN</small>
              </b>
              <span>{snapshot.red}</span>
            </div>
          </div>
          {false && (
            <div className="start-panel character-select">
              <div className="character-select-heading">
                <div>
                  <p>LANGKAH 1 · PILIH TIM</p>
                  <h1>
                    Merah atau Hijau.
                    <br />
                    Tentukan pihakmu.
                  </h1>
                </div>
                <span>
                  Tim Merah bertahan dari kiri. Tim Hijau bertahan dari kanan.
                  Setiap tim memiliki tujuh karakter tetap dan membawa lima
                  pemain ke field.
                </span>
              </div>
              <div className="team-chooser" aria-label="Pilih tim">
                {(['red', 'green'] as Faction[]).map((faction) => (
                  <button
                    key={faction}
                    className={`${faction} ${selectedFaction === faction ? 'selected' : ''}`}
                    onClick={() => chooseFaction(faction)}
                    aria-pressed={selectedFaction === faction}
                  >
                    <span>
                      <b>{factionName(faction)}</b>
                      <small>
                        {GAME_RULES.teams[faction].side} · 7 karakter
                      </small>
                    </span>
                    <span className="team-mini-roster">
                      {FIXED_ROSTERS[faction].map((id) => (
                        <CharacterPreview
                          key={id}
                          id={id}
                          alt={CHARACTER_BY_ID[id].name}
                        />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
              {selectedFaction && (
                <div className={`selection-step ${selectedFaction}`}>
                  <div className="selection-step-head">
                    <span>
                      LANGKAH 2 · PILIH KARAKTER{' '}
                      {factionName(selectedFaction!).toUpperCase()}
                    </span>
                    <b>2 cadangan · 5 turun ke field</b>
                  </div>
                  <div className="character-row">
                    {availableCharacters.map((character) => (
                      <button
                        key={character.id}
                        className={
                          selectedId === character.id ? 'selected' : ''
                        }
                        onClick={() => setSelectedId(character.id)}
                        aria-pressed={selectedId === character.id}
                      >
                        <CharacterPreview
                          id={character.id}
                          alt={`Portrait ${character.name}`}
                          eager={selectedId === character.id}
                        />
                        <span>
                          <b>{character.name}</b>
                          <small>{character.role}</small>
                          <em>{character.passiveName}</em>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div
                    className="selected-character"
                    style={{ borderColor: selected.accent }}
                  >
                    <CharacterPreview
                      id={selected.id}
                      alt={`Portrait ${selected.name}`}
                      eager
                    />
                    <div className="selected-summary">
                      <span>
                        {factionName(selectedFaction!)} · {selected.role}
                      </span>
                      <b>{selected.name}</b>
                      <small>{selected.copy}</small>
                      <div className="character-passive">
                        <strong>{selected.passiveName}</strong>
                        <i>{selected.passiveCopy}</i>
                      </div>
                    </div>
                    <dl>
                      <div>
                        <dt>
                          Speed <b>{selected.speed}</b>
                        </dt>
                        <dd>
                          <i>
                            <span
                              style={{
                                width: statPercent(selected.speed, 188, 240),
                              }}
                            />
                          </i>
                        </dd>
                      </div>
                      <div>
                        <dt>
                          Boost <b>{selected.boost}</b>
                        </dt>
                        <dd>
                          <i>
                            <span
                              style={{
                                width: statPercent(selected.boost, 84, 128),
                              }}
                            />
                          </i>
                        </dd>
                      </div>
                      <div>
                        <dt>
                          Agility <b>{selected.agility.toFixed(2)}</b>
                        </dt>
                        <dd>
                          <i>
                            <span
                              style={{
                                width: statPercent(
                                  selected.agility,
                                  0.82,
                                  1.25,
                                ),
                              }}
                            />
                          </i>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
              <div className="field-row">
                <span>LANGKAH 3 · PILIH FIELD</span>
                {FIELD_CONFIGS.map((field) => (
                  <button
                    key={field.id}
                    className={selectedFieldId === field.id ? 'selected' : ''}
                    onClick={() => setSelectedFieldId(field.id)}
                    aria-pressed={selectedFieldId === field.id}
                  >
                    <b>{field.name}</b>
                    <small>{field.kicker}</small>
                  </button>
                ))}
              </div>
              {selectedFaction ? (
                <div className={`squad-preview ${selectedFaction}`}>
                  <span>
                    {factionName(selectedFaction!).toUpperCase()} · LINEUP 5v5
                  </span>
                  <div>
                    {squad.map((id, index) => (
                      <figure
                        key={`ally-${id}`}
                        className={`team-${selectedFaction} ${index === 0 ? 'controlled' : ''}`}
                      >
                        <CharacterPreview
                          id={id}
                          alt={CHARACTER_BY_ID[id].name}
                          eager={index === 0}
                        />
                        <figcaption>
                          {index === 0
                            ? 'KAMU'
                            : selectedFaction === 'red'
                              ? 'M'
                              : 'H'}
                        </figcaption>
                      </figure>
                    ))}
                    <i>VS</i>
                    {opponentSquad.map((id) => (
                      <figure
                        key={`enemy-${id}`}
                        className={`team-${selectedFaction === 'red' ? 'green' : 'red'}`}
                      >
                        <CharacterPreview
                          id={id}
                          alt={CHARACTER_BY_ID[id].name}
                        />
                        <figcaption>
                          {selectedFaction === 'red' ? 'H' : 'M'}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <button className="start-button" onClick={start}>
                    <Play size={18} fill="currentColor" /> Main sebagai{' '}
                    {selected.name}
                  </button>
                </div>
              ) : (
                <div className="choose-team-hint">
                  Pilih Tim Merah atau Tim Hijau untuk membuka roster karakter.
                </div>
              )}
            </div>
          )}
          {mode === 'playing' && (
            <>
              <div className="status-ribbon">
                <span className={`state-dot ${snapshot.state.toLowerCase()}`} />
                <span>
                  <b>{selected.name}</b>
                  {selectedFaction ? factionName(selectedFaction) : ''}
                </span>
                <strong>{snapshot.state.replace('_', ' ')}</strong>
                <em>PRIORITAS #{snapshot.order || '—'}</em>
              </div>
              <button
                className="active-objective"
                onClick={() => setMissionOpen(true)}
              >
                <Flag size={20} />
                <span>
                  <small>TUJUAN AKTIF · {missionCount}/6</small>
                  <b>
                    {missionCount === 6
                      ? 'Semua misi selesai'
                      : 'Buktikan core loop'}
                  </b>
                </span>
                <i>›</i>
              </button>
              <div className={`character-hud ${selectedFaction}`}>
                <CharacterPreview id={selected.id} eager />
                <span>
                  <b>{selected.name}</b>
                  <small>
                    {selectedFaction ? factionName(selectedFaction) : ''} ·{' '}
                    {selected.passiveName}
                  </small>
                </span>
              </div>
              <div
                className={`team-combo-hud ${selectedFaction} ${snapshot.comboSurgeRemaining ? 'surge' : ''}`}
                aria-label="Status combo aksi tim"
              >
                <Users size={17} />
                <span>
                  <small>
                    {snapshot.comboSurgeRemaining ? 'COMBO AKTIF' : 'AKSI TIM'}
                  </small>
                  <b>
                    {snapshot.comboSurgeRemaining
                      ? `SQUAD SURGE ${snapshot.comboSurgeRemaining}s`
                      : snapshot.comboLevel
                        ? `LINK ${snapshot.comboLevel}/3 · ${snapshot.comboRemaining}s`
                        : 'RANGKAI 3 AKSI'}
                  </b>
                </span>
                <i>
                  {[1, 2, 3].map((step) => (
                    <u
                      key={step}
                      className={
                        snapshot.comboSurgeRemaining ||
                        snapshot.comboLevel >= step
                          ? 'filled'
                          : ''
                      }
                    />
                  ))}
                </i>
              </div>
              {snapshot.comboCallout && (
                <div
                  className={`combo-callout ${snapshot.comboSurgeRemaining ? 'surge' : ''}`}
                >
                  <Users size={22} />
                  <span>{snapshot.comboCallout}</span>
                </div>
              )}
              <div
                className="camera-switcher camera-map"
                aria-label="Pilihan kamera"
              >
                <span>
                  <MapIcon size={13} /> PETA
                </span>
                {CAMERA_OPTIONS.map((camera) => (
                  <button
                    key={camera.id}
                    className={cameraMode === camera.id ? 'selected' : ''}
                    onClick={() => setCameraMode(camera.id)}
                    aria-pressed={cameraMode === camera.id}
                  >
                    {camera.label}
                  </button>
                ))}
              </div>
              <div className="boost-stack">
                <div className="boost-label">
                  <span>⚡ STAMINA</span>
                  <b>{Math.round(snapshot.boost)}%</b>
                  <em>
                    {snapshot.boostCountdown
                      ? `PULIH ${snapshot.boostCountdown}s`
                      : 'SIAP'}
                  </em>
                </div>
                <div className="stamina-bar">
                  <span style={{ width: `${snapshot.boost}%` }} />
                </div>
              </div>
              {ULTIMATE_CHARACTER_IDS.has(selectedId) && (
                <div
                  className={`ultimate-meter-hud ${selectedId === 'kaka' ? 'kaka-shield' : ''} ${snapshot.ultimateMeter >= 100 ? 'ready' : ''}`}
                  aria-label={`Meter Ultimate ${selected.name} ${Math.floor(snapshot.ultimateMeter)} persen`}
                >
                  <span>
                    {selectedId === 'kaka' ? <Shield size={14} /> : <Zap size={14} />}
                    {selectedId === 'kaka' ? ' PERISAI HIJAU' : ' TITAH HALILINTAR'}
                  </span>
                  <b>{Math.floor(snapshot.ultimateMeter)}%</b>
                  <i><u style={{ width: `${snapshot.ultimateMeter}%` }} /></i>
                  <small>{snapshot.ultimateMeter >= 100 ? 'TEKAN CAPS LOCK' : 'OTOMATIS · TAG +20 · RESCUE +30'}</small>
                </div>
              )}
              <div className="action-dock" aria-label="Aksi pemain">
                <span className="ready-action">
                  <Zap size={19} />
                  <b>1</b>
                  <small>SPRINT</small>
                </span>
                <span>
                  <Gauge size={19} />
                  <b>2</b>
                  <small>PARKOUR</small>
                </span>
                <span
                  className={snapshot.comboSurgeRemaining ? 'combo-ready' : ''}
                >
                  <Users size={19} />
                  <b>3</b>
                  <small>COMBO</small>
                </span>
                <span>
                  <Shield size={19} />
                  <b>4</b>
                  <small>RESCUE</small>
                </span>
                {ULTIMATE_CHARACTER_IDS.has(selectedId) ? (
                  <button
                    className={`ultimate-action ${selectedId === 'kaka' ? 'kaka-ultimate' : ''} ${snapshot.ultimateMeter >= 100 && !snapshot.ultimateCasting ? 'ultimate-ready' : ''}`}
                    onClick={() => tapKey('capslock')}
                    disabled={
                      snapshot.ultimateMeter < 100 || snapshot.ultimateCasting
                    }
                    aria-label={`${selectedId === 'kaka' ? 'Perisai Hijau' : 'Titah Halilintar'} ${Math.floor(snapshot.ultimateMeter)} persen`}
                  >
                    {selectedId === 'kaka' ? <Shield size={18} /> : <Zap size={18} />}
                    <b>CAPS</b>
                    <small>
                      {snapshot.ultimateCasting
                        ? 'CASTING'
                        : snapshot.ultimateMeter >= 100
                          ? 'ULT READY'
                          : `ULT ${Math.floor(snapshot.ultimateMeter)}%`}
                    </small>
                    <i style={{ width: `${snapshot.ultimateMeter}%` }} />
                  </button>
                ) : (
                  <span className="locked">
                    <Lock size={16} />
                    <b>—</b>
                  </span>
                )}
                <span className="locked">
                  <Lock size={16} />
                  <b>6</b>
                </span>
              </div>
              {snapshot.ultimateBuffRemaining > 0 && (
                <div className={`ultimate-buff-indicator ${selectedId === 'kaka' ? 'kaka-shield-indicator' : ''}`}>
                  {selectedId === 'kaka' ? <Shield size={13} /> : <Zap size={13} />}
                  {selectedId === 'kaka' ? ' KEBAL TAG · ' : ' TITAH +40% · '}
                  {snapshot.ultimateBuffRemaining}s
                </div>
              )}
              <div className="control-ribbon">
                <b>WASD</b> GERAK <b>SPACE</b> SPRINT <b>SHIFT</b> PARKOUR{' '}
                {ULTIMATE_CHARACTER_IDS.has(selectedId) && (
                  <>
                    <b>CAPS LOCK</b> ULTIMATE{' '}
                  </>
                )}
                <b>P</b> JEDA
              </div>
              <div className="mobile-controls" aria-label="Kontrol sentuh">
                <div className="touch-dpad">
                  <button aria-label="Gerak atas" {...touchControl('w')}>
                    ▲
                  </button>
                  <button aria-label="Gerak kiri" {...touchControl('a')}>
                    ◀
                  </button>
                  <button aria-label="Gerak kanan" {...touchControl('d')}>
                    ▶
                  </button>
                  <button aria-label="Gerak bawah" {...touchControl('s')}>
                    ▼
                  </button>
                </div>
                <div className="touch-actions">
                  <button
                    className="touch-boost"
                    aria-label="Sprint"
                    {...touchControl(' ')}
                  >
                    SPRINT
                  </button>
                  <button aria-label="Parkour" {...touchControl('shift')}>
                    PARKOUR
                  </button>
                  {ULTIMATE_CHARACTER_IDS.has(selectedId) && (
                    <button
                      className={`touch-ultimate ${selectedId === 'kaka' ? 'kaka-ultimate' : ''}`}
                      aria-label={selectedId === 'kaka' ? 'Perisai Hijau' : 'Titah Halilintar'}
                      disabled={
                        snapshot.ultimateMeter < 100 || snapshot.ultimateCasting
                      }
                      {...touchControl('capslock')}
                    >
                      ULT {Math.floor(snapshot.ultimateMeter)}%
                    </button>
                  )}
                </div>
              </div>
              {snapshot.paused && (
                <div className="pause-overlay">
                  <div>
                    <small>PERMAINAN DIJEDA</small>
                    <h2>
                      Ambil napas.
                      <br />
                      Lanjut saat siap.
                    </h2>
                    <button onClick={() => keys.current.add('p')}>
                      <Play size={17} fill="currentColor" /> Lanjutkan
                    </button>
                    <button onClick={() => setRun((value) => value + 1)}>
                      <RotateCcw size={17} /> Mulai ulang
                    </button>
                    <button onClick={quit}>
                      <LogOut size={17} /> Keluar ke menu
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {ultimateBannerVisible && ULTIMATE_CHARACTER_IDS.has(selectedId) && (
            <div
              className={`ultimate-banner ${selectedId === 'kaka' ? 'kaka-banner' : ''}`}
              role="status"
              aria-label={
                selectedId === 'kaka'
                  ? 'Kaka mengaktifkan Perisai Hijau'
                  : 'Raja mengaktifkan Titah Halilintar'
              }
            >
              <img
                src={
                  selectedId === 'kaka'
                    ? kakaUltimateBannerAsset()
                    : rajaUltimateBannerAsset()
                }
                alt={selectedId === 'kaka' ? 'ULTIMATE SKILL KAKA' : 'TITAH HALILINTAR'}
                decoding="async"
              />
            </div>
          )}
        </div>
        <aside
          className={`mission-panel ${missionOpen ? 'open' : ''}`}
          aria-hidden={!missionOpen}
        >
          <button
            className="mission-close"
            onClick={() => setMissionOpen(false)}
            aria-label="Tutup tujuan"
          >
            <X size={20} />
          </button>
          <div className="mission-head">
            <span>Rules test · {missionCount}/6</span>
            <h2>Buktikan core loop</h2>
          </div>
          <div className="mission-progress">
            <span style={{ width: `${missionCount * (100 / 6)}%` }} />
          </div>
          <ul className="mission-list">
            <li className={snapshot.mission.refresh ? 'done' : ''}>
              {snapshot.mission.refresh ? (
                <Check size={18} />
              ) : (
                <Flag size={18} />
              )}
              <div>
                <b>Refresh prioritas</b>
                <span>
                  Kembali ke benteng dan keluar lagi sebagai urutan terbaru.
                </span>
              </div>
            </li>
            <li className={snapshot.mission.boost ? 'done' : ''}>
              <BatteryCharging size={18} />
              <div>
                <b>Sprint terbatas</b>
                <span>
                  Tekan Space untuk ledakan lari{' '}
                  {GAME_RULES.boostDurationMs / 1000} detik. Pulih 20 detik atau
                  ambil refill.
                </span>
              </div>
            </li>
            <li className={snapshot.mission.parkour ? 'done' : ''}>
              <Gauge size={18} />
              <div>
                <b>Parkour kontekstual</b>
                <span>Tekan Shift di dekat rintangan.</span>
              </div>
            </li>
            <li className={snapshot.mission.tag ? 'done' : ''}>
              <Zap size={18} />
              <div>
                <b>Menangkap target</b>
                <span>
                  Outline hijau = keluar lebih dulu dan boleh ditangkap.
                </span>
              </div>
            </li>
            <li className={snapshot.mission.rescue ? 'done' : ''}>
              <Shield size={18} />
              <div>
                <b>Bebaskan penjara</b>
                <span>
                  Jangkau rekan terluar untuk membebaskan seluruh rantai.
                </span>
              </div>
            </li>
            <li className={snapshot.mission.combo ? 'done' : ''}>
              <Users size={18} />
              <div>
                <b>Combo aksi tim</b>
                <span>
                  Rangkai tag atau rescue dari rekan berbeda dalam 6,5 detik
                  untuk Squad Surge.
                </span>
              </div>
            </li>
          </ul>
          {mode === 'playing' ? (
            <>
              <div className={`team-status ${selectedFaction}`}>
                <span>
                  {selectedFaction
                    ? factionName(selectedFaction).toUpperCase()
                    : 'TIM'}{' '}
                  · 5 PEMAIN UNIK
                </span>
                {snapshot.team.map((member, index) => (
                  <div key={`${member.name}-${index}`}>
                    <CharacterPreview id={member.characterId} />
                    <b>{member.name}</b>
                    <i style={{ width: `${Math.min(100, member.boost)}%` }} />
                    <em>{member.state.replace('_', ' ')}</em>
                  </div>
                ))}
              </div>
              <div className="event-feed">
                {snapshot.logs.map((entry, index) => (
                  <p key={`${entry}-${index}`}>{entry}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="reference-card">
              <img
                src={publicAsset('characters.webp?v=8')}
                alt="Referensi karakter Benteng Squad Tag"
              />
              <div>
                <b>Empat belas sprite produksi terpasang</b>
                <span>
                  Tim tetap, atlas 7×6 anti-potong, portrait transparan, animasi
                  arah, tag, rescue, tahanan, menang, dan kalah.
                </span>
              </div>
            </div>
          )}
          <div className="audio-note">
            <Volume2 size={13} /> Musik menu dan pertandingan aktif setelah klik
            atau tekan tombol pertama.
          </div>
        </aside>
      </section>
    </main>
  );
}
