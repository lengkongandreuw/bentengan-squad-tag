'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BatteryCharging, Flag, Gauge, LogOut, Pause, Play, RotateCcw, Shield, Volume2, Wrench, Zap } from 'lucide-react';
import { CharacterWorkshop } from '../components/character-workshop';
import { CHARACTER_BY_ID, CharacterId, characterAsset, characterRuntimeAsset, characterUsesDedicatedEast, publicAsset } from '../lib/characters';
import { FIELD_ANIMATED_ATLAS, FIELD_ASSET_VERSION, FIELD_GROUND_ATLAS, FIELD_OBJECT_ATLAS, FieldAnimatedId, FieldAssetId, GroundTileId } from '../lib/field-assets.generated';
import { BOOST_COLUMNS, directionFromVelocity, directionalRow, RUN_COLUMNS, shouldMirrorSprite, sprintEffectRotation } from '../lib/sprite-motion.js';
import { fieldCycleDecision } from '../lib/field-cycle.js';
import { sweptContactDistance } from '../lib/tag-contact.js';
import GAME_RULES from '../config/game-rules.json';

type Team = 'blue' | 'red';
type Faction = 'red' | 'green';
type PlayerState = 'IN_BASE' | 'ACTIVE' | 'PRISONER' | 'RETURNING';
type PlayerAction = 'tag' | 'rescue';
type Grade = 25 | 40 | 75 | 100;
type FieldId = 'kampung' | 'pasar' | 'taman';
type CameraMode = 'follow' | 'tactical' | 'overview';
type Player = {
  id: string; name: string; team: Team; characterId: CharacterId; controlled?: boolean; x: number; y: number;
  vx: number; vy: number; state: PlayerState; exitOrder: number; boost: number;
  baseCharge: number; exitDeadline: number; tagCooldown: number; parkourUntil: number; boostReadyAt: number;
  fortCharge: number; prisonOwner?: Team; prisonIndex: number; captures: number; aiSeed: number;
  rescueShieldUntil: number; capturedIds: string[];
  action?: PlayerAction; actionUntil: number;
  lastX: number; lastY: number;
};
type Obstacle = { x: number; y: number; w: number; h: number; asset: FieldAssetId; visualW: number; visualH: number; flip?: boolean };
type FieldDecoration = { asset: FieldAssetId; x: number; y: number; w: number; h: number; flip?: boolean; opacity?: number };
type AnimatedDecoration = { animation: FieldAnimatedId; x: number; y: number; w: number; h: number; flip?: boolean; opacity?: number };
type FieldPath = { tile: GroundTileId; x: number; y: number; w: number; h: number; opacity: number; radius: number };
type FieldConfig = { id: FieldId; name: string; kicker: string; ground: GroundTileId; paths: FieldPath[]; obstacles: Obstacle[]; decorations: FieldDecoration[]; animated: AnimatedDecoration[] };
type Refill = { id: number; x: number; y: number; grade: Grade; lane: 0 | 1 | 2; expiresAt: number };
type Mission = { refresh: boolean; boost: boolean; parkour: boolean; tag: boolean; rescue: boolean };
type Snapshot = {
  blue: number; red: number; round: number; timer: number; boost: number; boostCountdown: number;
  order: number; state: PlayerState; paused: boolean; logs: string[]; mission: Mission;
  team: Array<{ name: string; characterId: CharacterId; state: PlayerState; boost: number }>;
  blueHeld: number; redHeld: number; pickupCount: number; fortLock: string; baseGrace: number; suddenDeath: boolean; fieldWins: number;
};

const WORLD_SCALE = 1.25;
const world = (value: number) => Math.round(value * WORLD_SCALE);
const W = world(1440);
const H = world(800);
const BASE_RADIUS = 118;
const BASES = { blue: { x: world(112), y: world(410) }, red: { x: world(1328), y: world(390) } };
const PRISONS = {
  blue: { x: world(244), y: world(472), w: 254, h: 190 },
  red: { x: world(942), y: world(154), w: 254, h: 190 },
};
const TEAM_COLOR = { blue: GAME_RULES.teams.red.color, red: GAME_RULES.teams.green.color };
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
    ? [selectedId, ...roster.filter(id => id !== selectedId)].slice(0, GAME_RULES.matchSize)
    : roster.slice(0, GAME_RULES.matchSize);
};
const RAW_FIELD_CONFIGS: FieldConfig[] = [
  {
    id: 'kampung', name: 'Kampung Merdeka', kicker: 'Jalan tanah · seimbang', ground: 'dirt',
    paths: [{ tile: 'paving', x: 214, y: 306, w: 1012, h: 184, opacity: .52, radius: 54 }],
    obstacles: [
      { x: 58, y: 166, w: 174, h: 54, asset: 'warung', visualW: 220, visualH: 183 },
      { x: 1160, y: 168, w: 176, h: 54, asset: 'hall', visualW: 230, visualH: 190 },
      { x: 1180, y: 610, w: 168, h: 52, asset: 'guardPost', visualW: 205, visualH: 184 },
      { x: 286, y: 190, w: 122, h: 26, asset: 'clothesline', visualW: 176, visualH: 142 },
      { x: 1032, y: 588, w: 122, h: 26, asset: 'clothesline', visualW: 166, visualH: 134, flip: true },
      { x: 402, y: 354, w: 168, h: 36, asset: 'drain', visualW: 190, visualH: 72 },
      { x: 870, y: 410, w: 168, h: 36, asset: 'drain', visualW: 190, visualH: 72 },
      { x: 650, y: 282, w: 88, h: 58, asset: 'crates', visualW: 100, visualH: 84 },
      { x: 704, y: 516, w: 74, h: 54, asset: 'crates', visualW: 88, visualH: 74, flip: true },
      { x: 534, y: 612, w: 42, h: 44, asset: 'bucket', visualW: 50, visualH: 54 },
      { x: 866, y: 142, w: 44, h: 60, asset: 'trash', visualW: 52, visualH: 78 },
      { x: 540, y: 582, w: 136, h: 44, asset: 'coffeeStall', visualW: 196, visualH: 188 },
      { x: 468, y: 150, w: 92, h: 46, asset: 'snackCart', visualW: 132, visualH: 150 },
      { x: 934, y: 586, w: 98, h: 48, asset: 'foodCart', visualW: 138, visualH: 148 },
    ],
    decorations: [
      { asset: 'bunting', x: 602, y: 68, w: 236, h: 122, opacity: .94 },
      { asset: 'plant', x: 242, y: 650, w: 62, h: 78 }, { asset: 'bush', x: 1060, y: 86, w: 100, h: 66 },
    ],
    animated: [{ animation: 'flag', x: 690, y: 76, w: 66, h: 92 }],
  },
  {
    id: 'pasar', name: 'Pasar Senggol', kicker: 'Beton · jalur rapat', ground: 'concrete',
    paths: [
      { tile: 'paving', x: 226, y: 116, w: 988, h: 126, opacity: .54, radius: 38 },
      { tile: 'paving', x: 214, y: 338, w: 1012, h: 128, opacity: .54, radius: 38 },
      { tile: 'paving', x: 226, y: 560, w: 988, h: 126, opacity: .54, radius: 38 },
    ],
    obstacles: [
      { x: 54, y: 170, w: 176, h: 54, asset: 'warung', visualW: 220, visualH: 183 },
      { x: 260, y: 126, w: 98, h: 64, asset: 'crates', visualW: 112, visualH: 94 },
      { x: 1082, y: 610, w: 98, h: 64, asset: 'crates', visualW: 112, visualH: 94, flip: true },
      { x: 438, y: 254, w: 148, h: 30, asset: 'drain', visualW: 170, visualH: 60 },
      { x: 854, y: 516, w: 148, h: 30, asset: 'drain', visualW: 170, visualH: 60 },
      { x: 390, y: 390, w: 118, h: 58, asset: 'crates', visualW: 128, visualH: 106 },
      { x: 932, y: 390, w: 118, h: 58, asset: 'crates', visualW: 128, visualH: 106, flip: true },
      { x: 636, y: 162, w: 48, h: 66, asset: 'trash', visualW: 56, visualH: 84 },
      { x: 758, y: 564, w: 48, h: 54, asset: 'bucket', visualW: 54, visualH: 58 },
      { x: 630, y: 378, w: 180, h: 38, asset: 'drain', visualW: 204, visualH: 72 },
      { x: 236, y: 150, w: 146, h: 42, asset: 'marketStallA', visualW: 190, visualH: 152 },
      { x: 608, y: 132, w: 150, h: 42, asset: 'marketStallB', visualW: 194, visualH: 154 },
      { x: 1018, y: 570, w: 146, h: 42, asset: 'marketStallC', visualW: 190, visualH: 152 },
      { x: 470, y: 548, w: 94, h: 46, asset: 'snackCart', visualW: 134, visualH: 152 },
      { x: 780, y: 188, w: 98, h: 46, asset: 'foodCart', visualW: 140, visualH: 150 },
    ],
    decorations: [
      { asset: 'bunting', x: 600, y: 66, w: 240, h: 124 },
      { asset: 'lamp', x: 344, y: 588, w: 46, h: 96 }, { asset: 'lamp', x: 1046, y: 106, w: 46, h: 96 },
      { asset: 'plant', x: 1188, y: 670, w: 58, h: 74 },
    ],
    animated: [{ animation: 'vendor', x: 690, y: 360, w: 122, h: 100 }, { animation: 'flag', x: 1188, y: 92, w: 62, h: 88, flip: true }],
  },
  {
    id: 'taman', name: 'Taman Kota', kicker: 'Rumput · ruang terbuka', ground: 'grass',
    paths: [
      { tile: 'paving', x: 624, y: 72, w: 192, h: 656, opacity: .52, radius: 58 },
      { tile: 'paving', x: 224, y: 324, w: 992, h: 152, opacity: .52, radius: 58 },
    ],
    obstacles: [
      { x: 302, y: 188, w: 70, h: 56, asset: 'parkTree', visualW: 124, visualH: 158 },
      { x: 1068, y: 556, w: 70, h: 56, asset: 'parkTree', visualW: 124, visualH: 158, flip: true },
      { x: 500, y: 604, w: 100, h: 42, asset: 'flowerBedSmall', visualW: 126, visualH: 88 },
      { x: 840, y: 218, w: 100, h: 42, asset: 'flowerBedSmall', visualW: 126, visualH: 88, flip: true },
      { x: 544, y: 344, w: 112, h: 34, asset: 'drain', visualW: 132, visualH: 50 },
      { x: 784, y: 424, w: 112, h: 34, asset: 'drain', visualW: 132, visualH: 50 },
      { x: 666, y: 154, w: 48, h: 56, asset: 'plant', visualW: 66, visualH: 84 },
      { x: 726, y: 598, w: 48, h: 56, asset: 'plant', visualW: 66, visualH: 84, flip: true },
      { x: 1180, y: 158, w: 150, h: 48, asset: 'hall', visualW: 214, visualH: 178 },
      { x: 202, y: 354, w: 154, h: 44, asset: 'gardenMedium', visualW: 188, visualH: 142 },
      { x: 1080, y: 390, w: 154, h: 44, asset: 'gardenMedium', visualW: 188, visualH: 142, flip: true },
      { x: 566, y: 176, w: 182, h: 34, asset: 'plantFence', visualW: 218, visualH: 70 },
      { x: 698, y: 592, w: 182, h: 34, asset: 'flowerFence', visualW: 218, visualH: 74 },
      { x: 660, y: 366, w: 120, h: 48, asset: 'flowerBedSmall', visualW: 138, visualH: 94 },
    ],
    decorations: [
      { asset: 'lamp', x: 498, y: 612, w: 48, h: 100 }, { asset: 'lamp', x: 894, y: 88, w: 48, h: 100 },
      { asset: 'bunting', x: 606, y: 68, w: 228, h: 118, opacity: .86 },
      { asset: 'bush', x: 228, y: 92, w: 92, h: 60 }, { asset: 'bush', x: 1118, y: 650, w: 92, h: 60, flip: true },
    ],
    animated: [{ animation: 'fountain', x: 674, y: 332, w: 92, h: 90 }, { animation: 'flag', x: 690, y: 82, w: 64, h: 90 }],
  },
];
const FIELD_CONFIGS: FieldConfig[] = RAW_FIELD_CONFIGS.map(field => ({
  ...field,
  paths: field.paths.map(path => ({ ...path, x: world(path.x), y: world(path.y), w: world(path.w), h: world(path.h), radius: world(path.radius) })),
  obstacles: field.obstacles.map(item => ({ ...item, x: world(item.x), y: world(item.y) })),
  decorations: field.decorations.map(item => ({ ...item, x: world(item.x), y: world(item.y) })),
  animated: field.animated.map(item => ({ ...item, x: world(item.x), y: world(item.y) })),
}));
const prisonClearance = 12;
for (const field of FIELD_CONFIGS) for (const obstacle of field.obstacles) for (const prison of Object.values(PRISONS)) {
  const overlapsPrison = obstacle.x < prison.x + prison.w + prisonClearance && obstacle.x + obstacle.w > prison.x - prisonClearance && obstacle.y < prison.y + prison.h + prisonClearance && obstacle.y + obstacle.h > prison.y - prisonClearance;
  if (overlapsPrison) throw new Error(`${field.id}: obstacle ${obstacle.asset} masuk zona penjara`);
}
const FIELD_BY_ID = Object.fromEntries(FIELD_CONFIGS.map(field => [field.id, field])) as Record<FieldId, FieldConfig>;
const CAMERA_OPTIONS: Array<{ id: CameraMode; label: string }> = [{ id: 'follow', label: 'Dekat' }, { id: 'tactical', label: 'Taktis' }, { id: 'overview', label: 'Overall' }];
const initialSnapshot: Snapshot = {
  blue: 0, red: 0, round: 1, timer: 240, boost: 100, boostCountdown: 0, order: 0,
  state: 'IN_BASE', paused: false, logs: ['Prototype 5v5 siap.'],
  mission: { refresh: false, boost: false, parkour: false, tag: false, rescue: false }, team: [],
  blueHeld: 0, redHeld: 0, pickupCount: 0, fortLock: 'Benteng terbuka', baseGrace: 0, suddenDeath: false, fieldWins: 0,
};

const other = (team: Team): Team => team === 'blue' ? 'red' : 'blue';
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const statPercent = (value: number, min: number, max: number) => `${Math.round(clamp((value - min) / (max - min), 0, 1) * 100)}%`;

const spriteImages = new Map<CharacterId, HTMLImageElement>();
const fieldImages = new Map<string, HTMLImageElement>();
let sprintDustImage: HTMLImageElement | null = null;
const spriteFrame = (width: number, height: number, column: number, row: number) => {
  const x = Math.round(column * width / 7), y = Math.round(row * height / 6);
  const right = Math.round((column + 1) * width / 7), bottom = Math.round((row + 1) * height / 6);
  return { x, y, width: right - x, height: bottom - y };
};

const getSpriteImage = (id: CharacterId) => {
  const cached = spriteImages.get(id);
  if (cached) return cached;
  const image = new Image(); image.decoding = 'async'; image.src = characterRuntimeAsset(id); spriteImages.set(id, image); return image;
};

const getSprintDustImage = () => {
  if (sprintDustImage) return sprintDustImage;
  sprintDustImage = new Image(); sprintDustImage.decoding = 'async'; sprintDustImage.src = publicAsset('vfx/sprint-dust.webp?v=7'); return sprintDustImage;
};

const getFieldImage = (asset: string) => {
  const url = publicAsset(`field/${asset}?v=${FIELD_ASSET_VERSION}`);
  const cached = fieldImages.get(url);
  if (cached) return cached;
  const image = new Image(); image.decoding = 'async'; image.src = url; fieldImages.set(url, image); return image;
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
  const [view, setView] = useState<'game' | 'workshop'>('game');
  const [run, setRun] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const selected = CHARACTER_BY_ID[selectedId];
  const availableCharacters = useMemo(() => selectedFaction ? FIXED_ROSTERS[selectedFaction].map(id => CHARACTER_BY_ID[id]) : [], [selectedFaction]);
  const squad = useMemo(() => selectedFaction ? lineupFor(selectedFaction, selectedId) : [], [selectedFaction, selectedId]);
  const opponentSquad = useMemo(() => selectedFaction ? lineupFor(selectedFaction === 'red' ? 'green' : 'red') : [], [selectedFaction]);

  const chooseFaction = (faction: Faction) => {
    setSelectedFaction(faction);
    setSelectedId(FIXED_ROSTERS[faction][0]);
  };

  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key)) event.preventDefault();
      keys.current.add(key);
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0, last = performance.now(), lastHud = 0;
    let phase: 'COUNTDOWN' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER' = 'COUNTDOWN';
    let phaseUntil = performance.now() + 3000, timer = 240, round = 1, exitCounter = 0;
    let score = { blue: 0, red: 0 }, paused = false, announcement = mode === 'playing' ? 'BERSIAP!' : '', roundWinner: Team | undefined;
    let fieldRotationPending = false;
    let logs = ['5v5 · pemain yang keluar terakhir memiliki prioritas tangkap tertinggi.'];
    let mission: Mission = { refresh: false, boost: false, parkour: false, tag: false, rescue: false };
    let totalCapture = { blue: 0, red: 0 }, nextRefillSpawn = performance.now() + 8000, refillId = 0, suddenDeath = false;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    let refills: Refill[] = [], audio: AudioContext | null = null, parkourLatch = false, boostLatch = false, boostBurstUntil = 0;
    const field = FIELD_BY_ID[selectedFieldId], obstacles = field.obstacles;
    const fieldObjectAtlas = getFieldImage('objects.webp');
    const fieldAnimatedAtlas = getFieldImage('animated.webp');
    const fieldGroundAtlas = getFieldImage('grounds.webp');
    const staticLayer = document.createElement('canvas'); staticLayer.width = W; staticLayer.height = H;
    const staticLayerContext = staticLayer.getContext('2d');
    let staticMapDirty = true;
    const invalidateStaticMap = () => { staticMapDirty = true; };
    fieldObjectAtlas.addEventListener('load', invalidateStaticMap);
    fieldGroundAtlas.addEventListener('load', invalidateStaticMap);

    const beep = (frequency: number, duration = .08) => {
      try {
        audio ??= new AudioContext(); const oscillator = audio.createOscillator(); const gain = audio.createGain();
        oscillator.frequency.value = frequency; gain.gain.value = .035; oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
        oscillator.stop(audio.currentTime + duration);
      } catch { /* optional */ }
    };
    const makePlayer = (id: string, characterId: CharacterId, team: Team, slot: number, controlled = false): Player => {
      const b = BASES[team];
      const character = CHARACTER_BY_ID[characterId];
      const offset = GAME_RULES.spawnOffsets[slot] ?? GAME_RULES.spawnOffsets[0];
      const direction = team === 'blue' ? 1 : -1;
      return {
        id, name: character.name.toUpperCase(), team, characterId, controlled, x: b.x + offset.x * direction, y: b.y + offset.y,
        vx: 0, vy: 0, state: 'IN_BASE', exitOrder: 0, boost: character.boost,
        baseCharge: 0, exitDeadline: 0, tagCooldown: 0, parkourUntil: 0, boostReadyAt: 0, fortCharge: 0,
        prisonIndex: 0, captures: 0, rescueShieldUntil: 0, capturedIds: [], actionUntil: 0,
        lastX: b.x + offset.x * direction, lastY: b.y + offset.y,
        aiSeed: .35 + slot * 1.17 + (team === 'red' ? 5.3 : 0),
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
        ...userRoster.map((characterId, slot) => makePlayer(slot === 0 ? 'you' : `ally${slot + 1}`, characterId, userTeam, slot, slot === 0)),
        ...opponentRoster.map((characterId, slot) => makePlayer(`enemy${slot + 1}`, characterId, opponentTeam, slot)),
      ];
    };
    let players = makePlayers();
    const log = (text: string) => { logs = [text, ...logs].slice(0, 5); };
    const burst = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({ x, y, vx: Math.cos(a) * (30 + Math.random() * 80), vy: Math.sin(a) * (30 + Math.random() * 80), life: .65, color });
      }
    };
    const randomGrade = (): Grade => { const roll = Math.random(); return roll < .52 ? 25 : roll < .78 ? 40 : roll < .95 ? 75 : 100; };
    const spawnRefill = (now = performance.now()) => {
      const laneCounts = ([0, 1, 2] as const).map(lane => refills.filter(item => item.lane === lane).length);
      const minimum = Math.min(...laneCounts); const lane = laneCounts.indexOf(minimum) as 0 | 1 | 2;
      const laneBounds = [[world(92), world(292)], [world(300), world(516)], [world(524), world(712)]] as const;
      for (let tries = 0; tries < 30; tries++) {
        const x = 236 + Math.random() * (W - 472), y = laneBounds[lane][0] + Math.random() * (laneBounds[lane][1] - laneBounds[lane][0]);
        if (obstacles.every(o => x < o.x - 28 || x > o.x + o.w + 28 || y < o.y - 28 || y > o.y + o.h + 28)) {
          refills.push({ id: ++refillId, x, y, grade: randomGrade(), lane, expiresAt: now + 25000 }); return;
        }
      }
    };
    const seedRefills = () => { refills = []; const now = performance.now(); for (let i = 0; i < 6; i++) spawnRefill(now); };
    seedRefills();
    const resetRound = () => {
      players = makePlayers(); seedRefills(); timer = 240; exitCounter = 0; totalCapture = { blue: 0, red: 0 }; suddenDeath = false; roundWinner = undefined;
      phase = 'COUNTDOWN'; phaseUntil = performance.now() + 2800; announcement = `RONDE ${round}`;
      log(`Ronde ${round}: 10 pemain menyusun urutan keluar.`);
    };
    const winRound = (team: Team, reason: string) => {
      if (phase !== 'PLAYING') return;
      score[team]++; roundWinner = team; phase = score[team] >= 2 ? 'MATCH_OVER' : 'ROUND_OVER';
      if (phase === 'MATCH_OVER') { completedMatchesRef.current++; fieldRotationPending = completedMatchesRef.current >= 3; }
      phaseUntil = performance.now() + (phase === 'MATCH_OVER' ? 7000 : 3800);
      announcement = phase === 'MATCH_OVER'
        ? `${teamName(team).toUpperCase()} MENANG MATCH${fieldRotationPending ? ' · FIELD BERIKUTNYA' : ''}`
        : `${teamName(team).toUpperCase()} MENANG · ${reason}`;
      beep(team === 'blue' ? 720 : 320, .25); burst(W / 2, H / 2, TEAM_COLOR[team], 38); log(announcement);
    };
    const fortOccupant = (baseTeam: Team, exceptId?: string) =>
      players.find(p => p.id !== exceptId && p.state === 'ACTIVE' && p.team !== baseTeam && distance(p, BASES[baseTeam]) < BASE_RADIUS);
    const tieHash = (id: string) => {
      let value = (2166136261 ^ round) >>> 0;
      for (let i = 0; i < id.length; i++) { value ^= id.charCodeAt(i); value = Math.imul(value, 16777619) >>> 0; }
      value ^= value >>> 16; value = Math.imul(value, 0x7feb352d) >>> 0; value ^= value >>> 15;
      return value >>> 0;
    };
    const segmentHitsRect = (a: Player, b: Player, o: Obstacle) => {
      const steps = 8;
      for (let i = 1; i < steps; i++) {
        const t = i / steps, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return true;
      }
      return false;
    };
    const hasLineOfSight = (a: Player, b: Player) => !obstacles.some(o => segmentHitsRect(a, b, o));
    const blocked = (x: number, y: number, p: Player, now: number) => {
      if (now >= p.parkourUntil && obstacles.some(o => x + 13 > o.x && x - 13 < o.x + o.w && y + 13 > o.y && y - 13 < o.y + o.h)) return true;
      if (p.state === 'IN_BASE' && p.baseCharge < CHARACTER_BY_ID[p.characterId].baseChargeTime && distance(p, BASES[p.team]) < BASE_RADIUS && distance({ x, y }, BASES[p.team]) >= BASE_RADIUS) return true;
      for (const team of ['blue', 'red'] as Team[]) {
        const entering = distance({ x, y }, BASES[team]) < BASE_RADIUS && distance(p, BASES[team]) >= BASE_RADIUS;
        if (entering && p.team !== team && fortOccupant(team, p.id)) return true;
      }
      return false;
    };
    const move = (p: Player, dx: number, dy: number, speed: number, dt: number, now: number) => {
      const len = Math.hypot(dx, dy) || 1; p.vx = dx / len * speed; p.vy = dy / len * speed;
      const nx = clamp(p.x + p.vx * dt, 34, W - 34), ny = clamp(p.y + p.vy * dt, 58, H - 32);
      if (!blocked(nx, p.y, p, now)) p.x = nx; if (!blocked(p.x, ny, p, now)) p.y = ny;
    };
    const resolvePlayerSpacing = () => {
      const visible = players.filter(p => p.state !== 'PRISONER');
      for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i], b = visible[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        const minimum = a.state === 'IN_BASE' && b.state === 'IN_BASE' ? 42 : 30;
        if (d >= minimum) continue;
        const nx = d > .01 ? dx / d : (tieHash(a.id) % 2 ? 1 : -1), ny = d > .01 ? dy / d : 0;
        const push = (minimum - d) * .52;
        a.x = clamp(a.x - nx * push, 34, W - 34); a.y = clamp(a.y - ny * push, 58, H - 32);
        b.x = clamp(b.x + nx * push, 34, W - 34); b.y = clamp(b.y + ny * push, 58, H - 32);
      }
    };
    const baseVector = (p: Player) => ({ x: BASES[p.team].x - p.x, y: BASES[p.team].y - p.y });
    const aiVector = (p: Player, now: number) => {
      if (p.state === 'RETURNING') return baseVector(p);
      if (p.state === 'IN_BASE') return { x: W / 2 - p.x, y: H / 2 + Math.sin(now / 920 + p.aiSeed) * 230 - p.y };
      const held = players.filter(q => q.team === p.team && q.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex);
      if (held.length && (p.aiSeed % 3 < 2.2 || held.length >= 3)) return { x: held[0].x - p.x, y: held[0].y - p.y };
      if (p.boost < 34) {
        const item = refills.slice().sort((a, b) => distance(p, a) - distance(p, b))[0];
        if (item && distance(p, item) < 360) return { x: item.x - p.x, y: item.y - p.y };
      }
      const threat = players.filter(q => q.team !== p.team && q.state === 'ACTIVE' && q.exitOrder > p.exitOrder).sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (threat && distance(p, threat) < 175) return { x: p.x - threat.x, y: p.y - threat.y };
      const target = players.filter(q => q.team !== p.team && q.state === 'ACTIVE' && q.exitOrder < p.exitOrder).sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (target) return { x: target.x - p.x, y: target.y - p.y };
      if (p.boost < 18 || Math.sin(now / 4300 + p.aiSeed) > .86) return baseVector(p);
      const enemy = BASES[other(p.team)]; return { x: enemy.x - p.x, y: enemy.y - p.y + Math.sin(now / 740 + p.aiSeed) * 150 };
    };
    const layoutPrisons = () => {
      (['blue', 'red'] as Team[]).forEach(owner => {
        const prison = PRISONS[owner];
        players.filter(p => p.state === 'PRISONER' && p.prisonOwner === owner).forEach((p, i) => {
          p.prisonIndex = i;
          p.x = owner === 'blue' ? prison.x + 62 + i * 31 : prison.x + prison.w - 62 - i * 31;
          p.y = owner === 'blue' ? prison.y + 116 + i * 6 : prison.y + 82 - i * 6;
          p.lastX = p.x; p.lastY = p.y;
        });
      });
    };
    const capture = (winner: Player, loser: Player, now: number) => {
      const targetable = loser.state === 'ACTIVE' || (loser.state === 'RETURNING' && now >= loser.rescueShieldUntil);
      if (winner.state !== 'ACTIVE' || now < winner.parkourUntil || now < loser.parkourUntil || winner.tagCooldown > now || !targetable || winner.exitOrder <= loser.exitOrder) return;
      winner.tagCooldown = now + CHARACTER_BY_ID[winner.characterId].tagCooldownMs; winner.captures++; if (!winner.capturedIds.includes(loser.id)) winner.capturedIds.push(loser.id);
      winner.action = 'tag'; winner.actionUntil = now + 420;
      loser.state = 'PRISONER'; loser.prisonOwner = winner.team; loser.fortCharge = 0; loser.rescueShieldUntil = 0;
      burst(loser.x, loser.y, TEAM_COLOR[winner.team]); beep(winner.controlled ? 820 : 250);
      log(`${winner.name} #${winner.exitOrder} menangkap ${loser.name} #${loser.exitOrder}.`);
      if (winner.controlled) mission.tag = true; layoutPrisons();
      if (suddenDeath) winRound(winner.team, 'SUDDEN DEATH TAG');
    };
    const tagCheck = (now: number) => {
      const contacts: Array<{ attacker: Player; target: Player }> = [];
      for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j], contactDistance = Math.min(distance(a, b), sweptContactDistance(a, b));
        if (a.team === b.team || !hasLineOfSight(a, b) || now < a.parkourUntil || now < b.parkourUntil) continue;
        const aTargetable = a.state === 'ACTIVE' || (a.state === 'RETURNING' && now >= a.rescueShieldUntil);
        const bTargetable = b.state === 'ACTIVE' || (b.state === 'RETURNING' && now >= b.rescueShieldUntil);
        if (a.state === 'ACTIVE' && bTargetable && a.exitOrder > b.exitOrder && contactDistance <= CHARACTER_BY_ID[a.characterId].tagRange + 4) contacts.push({ attacker: a, target: b });
        else if (b.state === 'ACTIVE' && aTargetable && b.exitOrder > a.exitOrder && contactDistance <= CHARACTER_BY_ID[b.characterId].tagRange + 4) contacts.push({ attacker: b, target: a });
      }
      contacts.sort((a, b) => b.attacker.exitOrder - a.attacker.exitOrder || b.target.exitOrder - a.target.exitOrder || a.attacker.id.localeCompare(b.attacker.id));
      const resolved = new Set<string>();
      contacts.forEach(({ attacker, target }) => {
        if (resolved.has(attacker.id) || resolved.has(target.id)) return;
        const before = target.state; capture(attacker, target, now);
        if (before !== 'PRISONER' && target.state === 'PRISONER') { resolved.add(attacker.id); resolved.add(target.id); }
      });
    };
    const rescueCheck = (now: number) => {
      players.filter(p => p.state === 'ACTIVE').forEach(rescuer => {
        const held = players.filter(p => p.team === rescuer.team && p.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex);
        const rescuerStats = CHARACTER_BY_ID[rescuer.characterId];
        if (held[0] && distance(rescuer, held[0]) < rescuerStats.rescueRange) {
          held.forEach(p => { p.state = 'RETURNING'; p.prisonOwner = undefined; p.rescueShieldUntil = now + rescuerStats.rescueShieldMs; p.x += rescuer.team === 'blue' ? -22 : 22; });
          rescuer.action = 'rescue'; rescuer.actionUntil = now + 460;
          burst(held[0].x, held[0].y, '#b9ee3d', 26); beep(620, .16); log(`${rescuer.name} membebaskan ${held.length} rekan.`);
          if (rescuer.controlled) mission.rescue = true;
        }
      });
    };
    const refillCheck = () => {
      players.filter(p => p.state === 'ACTIVE' && p.boost < CHARACTER_BY_ID[p.characterId].boost).forEach(p => {
        const item = refills.find(i => distance(p, i) < 27); if (!item) return;
        const maxBoost = CHARACTER_BY_ID[p.characterId].boost;
        p.boost = Math.min(maxBoost, p.boost + maxBoost * item.grade / 100); refills = refills.filter(i => i.id !== item.id);
        const refillColor = item.grade === 100 ? '#60e6ff' : item.grade === 75 ? '#ef75ff' : item.grade === 40 ? '#f5cf45' : '#b9ee3d';
        burst(item.x, item.y, refillColor, 18);
        beep(560 + item.grade * 2, .12); if (p.controlled) mission.boost = true; log(`${p.name} mengambil refill boost ${item.grade}%.`);
      });
    };
    const baseCheck = (p: Player, dt: number, now: number, exitCandidates: Player[]) => {
      if (p.state === 'PRISONER') return;
      const stats = CHARACTER_BY_ID[p.characterId], insideOwn = distance(p, BASES[p.team]) < BASE_RADIUS, maxBoost = stats.boost, chargeTime = stats.baseChargeTime;
      const contested = Boolean(fortOccupant(p.team));
      if (insideOwn) {
        if (contested) {
          if (p.state === 'IN_BASE' || p.state === 'RETURNING') exitCandidates.push(p);
        } else {
          if (p.state !== 'IN_BASE') { p.state = 'IN_BASE'; p.baseCharge = 0; p.exitDeadline = 0; p.fortCharge = 0; }
          const charging = players
            .filter(q => q.team === p.team && q.state === 'IN_BASE' && distance(q, BASES[q.team]) < BASE_RADIUS)
            .sort((a, b) => b.baseCharge - a.baseCharge || tieHash(a.id) - tieHash(b.id)).slice(0, 3);
          if (charging.some(q => q.id === p.id) && p.baseCharge < chargeTime) {
            p.baseCharge = Math.min(chargeTime, p.baseCharge + dt);
            if (p.baseCharge >= chargeTime && !p.exitDeadline) p.exitDeadline = now + 5000;
          }
          p.boost = maxBoost; p.boostReadyAt = 0;
          if (p.baseCharge >= chargeTime && p.exitDeadline > 0 && now >= p.exitDeadline) {
            p.x = BASES[p.team].x + (p.team === 'blue' ? BASE_RADIUS + 5 : -BASE_RADIUS - 5);
            exitCandidates.push(p); log(`${p.name} dipaksa keluar—grace 5 detik habis.`);
          }
        }
      } else if (p.state === 'IN_BASE' && p.baseCharge >= chargeTime) {
        exitCandidates.push(p);
      }
      if (p.state === 'ACTIVE' && distance(p, BASES[other(p.team)]) < BASE_RADIUS) {
        const defending = players.some(q => q.team !== p.team && q.state === 'ACTIVE' && distance(q, BASES[other(p.team)]) < BASE_RADIUS);
        p.fortCharge = defending ? 0 : p.fortCharge + dt;
        if (p.fortCharge >= 1.5) winRound(p.team, 'BENTENG DIREBUT');
      } else p.fortCharge = 0;
      if (p.boost < maxBoost && p.boostReadyAt > 0 && now >= p.boostReadyAt) {
        p.boost = maxBoost; p.boostReadyAt = 0; if (p.controlled) { log(`Boost ${p.name} pulih penuh setelah 20 detik.`); beep(690, .13); }
      }
    };
    const update = (dt: number, now: number) => {
      if (keys.current.has('p')) { keys.current.delete('p'); paused = !paused; }
      if (paused || mode !== 'playing') return;
      if (phase === 'COUNTDOWN') {
        announcement = `${Math.max(1, Math.ceil((phaseUntil - now) / 1000))}`;
        if (now >= phaseUntil) { phase = 'PLAYING'; announcement = 'MULAI!'; setTimeout(() => { if (phase === 'PLAYING') announcement = ''; }, 800); }
        return;
      }
      if (phase === 'ROUND_OVER' && now >= phaseUntil) { round++; resetRound(); return; }
      if (phase === 'MATCH_OVER') {
        if (now >= phaseUntil) {
          if (fieldRotationPending) {
            const decision = fieldCycleDecision(selectedFieldId, completedMatchesRef.current, FIELD_CONFIGS.map(item => item.id));
            completedMatchesRef.current = decision.wins;
            setSelectedFieldId(decision.fieldId);
          } else { score = { blue: 0, red: 0 }; round = 1; resetRound(); }
        }
        return;
      }
      if (!suddenDeath) timer -= dt;
      if (!suddenDeath && timer <= 0) {
        const blueHeld = players.filter(p => p.team === 'red' && p.state === 'PRISONER').length;
        const redHeld = players.filter(p => p.team === 'blue' && p.state === 'PRISONER').length;
        const blueUnique = new Set(players.filter(p => p.team === 'blue').flatMap(p => p.capturedIds)).size;
        const redUnique = new Set(players.filter(p => p.team === 'red').flatMap(p => p.capturedIds)).size;
        if (blueHeld !== redHeld) winRound(blueHeld > redHeld ? 'blue' : 'red', 'WAKTU HABIS');
        else if (blueUnique !== redUnique) winRound(blueUnique > redUnique ? 'blue' : 'red', 'TANGKAPAN UNIK');
        else { suddenDeath = true; timer = 0; announcement = 'SUDDEN DEATH'; log('Skor seri—tag atau rebut benteng berikutnya menang.'); beep(760, .22); }
      }
      refills = refills.filter(item => item.expiresAt > now);
      if (now >= nextRefillSpawn && refills.length < 9) { spawnRefill(now); nextRefillSpawn = now + 8000 + Math.random() * 4000; }
      players.forEach(player => { player.lastX = player.x; player.lastY = player.y; });
      const me = players[0]; let dx = 0, dy = 0;
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx--;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx++;
      if (keys.current.has('w') || keys.current.has('arrowup')) dy--;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dy++;
      const boostKey = keys.current.has(' ');
      if (boostKey && !boostLatch && me.boost > 0 && (me.state === 'ACTIVE' || me.state === 'IN_BASE')) boostBurstUntil = now + GAME_RULES.boostDurationMs;
      boostLatch = boostKey;
      const boosting = now < boostBurstUntil && me.boost > 0 && (dx || dy) && (me.state === 'ACTIVE' || me.state === 'IN_BASE');
      if (boosting) { me.boost = Math.max(0, me.boost - selected.boostDrain * dt); me.boostReadyAt = now + 20000; mission.boost = true; }
      const parkourKey = keys.current.has('shift');
      const parkourCost = 8 / selected.agility;
      if (parkourKey && !parkourLatch && me.boost >= parkourCost && now > me.parkourUntil && (dx || dy) && (me.state === 'ACTIVE' || me.state === 'IN_BASE')) {
        const near = obstacles.some(o => me.x + 44 > o.x && me.x - 44 < o.x + o.w && me.y + 44 > o.y && me.y - 44 < o.y + o.h);
        if (near) {
          const parkourDistance = 54 * selected.agility;
          me.parkourUntil = now + 320; me.boost = Math.max(0, me.boost - parkourCost); me.boostReadyAt = now + 20000;
          me.x = clamp(me.x + dx * parkourDistance, 34, W - 34); me.y = clamp(me.y + dy * parkourDistance, 58, H - 32);
          mission.parkour = true; burst(me.x, me.y, '#f4df9a', 9); beep(460);
        }
      }
      parkourLatch = parkourKey;
      if (me.state === 'RETURNING') { const vector = baseVector(me); move(me, vector.x, vector.y, selected.speed, dt, now); }
      else if ((dx || dy) && me.state !== 'PRISONER') move(me, dx, dy, selected.speed * (boosting ? selected.boostMultiplier : 1), dt, now);
      else { me.vx = 0; me.vy = 0; }
      players.slice(1).forEach(p => {
        if (p.state === 'PRISONER') { p.vx = 0; p.vy = 0; return; }
        const stats = CHARACTER_BY_ID[p.characterId];
        const vector = aiVector(p, now), far = Math.hypot(vector.x, vector.y) > 165;
        const boostAi = p.state === 'ACTIVE' && p.boost > 12 && far && Math.sin(now / 950 + p.aiSeed) > -.15;
        if (boostAi) { p.boost = Math.max(0, p.boost - stats.boostDrain * .66 * dt); p.boostReadyAt = now + 20000; }
        move(p, vector.x, vector.y, stats.speed * .89 * (boostAi ? stats.boostMultiplier : 1), dt, now);
      });
      resolvePlayerSpacing();
      const exitCandidates: Player[] = [];
      players.forEach(p => baseCheck(p, dt, now, exitCandidates));
      Array.from(new Map(exitCandidates.map(p => [p.id, p])).values()).sort((a, b) => tieHash(a.id) - tieHash(b.id)).forEach(p => {
        p.state = 'ACTIVE'; p.exitOrder = ++exitCounter; p.baseCharge = 0; p.exitDeadline = 0; p.rescueShieldUntil = 0;
        if (p.controlled && p.exitOrder > 5) mission.refresh = true;
        log(`${p.name} keluar sebagai urutan #${p.exitOrder}.`); beep(p.controlled ? 520 : 380);
      });
      refillCheck(); tagCheck(now); rescueCheck(now); layoutPrisons();
      (['blue', 'red'] as Team[]).forEach(team => {
        const allHeld = players.filter(p => p.team === other(team)).every(p => p.state === 'PRISONER' && p.prisonOwner === team);
        totalCapture[team] = allHeld ? totalCapture[team] + dt : 0;
        if (totalCapture[team] >= 2) winRound(team, 'SEMUA LAWAN DITANGKAP');
      });
      particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; p.vy *= .94; p.life -= dt; });
      particles = particles.filter(p => p.life > 0);
    };

    const roundedOn = (target: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { target.beginPath(); target.roundRect(x, y, w, h, r); };
    const rounded = (x: number, y: number, w: number, h: number, r: number) => roundedOn(ctx, x, y, w, h, r);
    const drawFieldAsset = (target: CanvasRenderingContext2D, asset: FieldAssetId, x: number, y: number, w: number, h: number, flip = false, opacity = 1) => {
      const source = FIELD_OBJECT_ATLAS.assets[asset];
      if (!fieldObjectAtlas.complete || !fieldObjectAtlas.naturalWidth) {
        target.fillStyle = 'rgba(28,43,31,.34)'; roundedOn(target, x, y, w, h, Math.min(12, w / 5)); target.fill(); return;
      }
      target.save(); target.globalAlpha = opacity; target.imageSmoothingEnabled = true; target.imageSmoothingQuality = 'high';
      if (flip) { target.translate(x * 2 + w, 0); target.scale(-1, 1); }
      target.drawImage(fieldObjectAtlas, source.x, source.y, source.width, source.height, x, y, w, h);
      target.restore();
    };
    const drawAnimatedAsset = (target: CanvasRenderingContext2D, animationId: FieldAnimatedId, x: number, y: number, w: number, h: number, now: number, flip = false, opacity = 1) => {
      const animation = FIELD_ANIMATED_ATLAS.animations[animationId];
      const frame = animation.frames[Math.floor(now * animation.fps / 1000) % animation.frames.length];
      if (!fieldAnimatedAtlas.complete || !fieldAnimatedAtlas.naturalWidth) return;
      target.save(); target.globalAlpha = opacity; target.imageSmoothingEnabled = true; target.imageSmoothingQuality = 'high';
      if (flip) { target.translate(x * 2 + w, 0); target.scale(-1, 1); }
      target.drawImage(fieldAnimatedAtlas, frame.x, frame.y, frame.width, frame.height, x, y, w, h);
      target.restore();
    };
    const groundTileCanvas = (tile: GroundTileId) => {
      const source = FIELD_GROUND_ATLAS.tiles[tile];
      const surface = document.createElement('canvas'); surface.width = source.width; surface.height = source.height;
      const surfaceContext = surface.getContext('2d');
      if (surfaceContext && fieldGroundAtlas.complete && fieldGroundAtlas.naturalWidth) {
        surfaceContext.drawImage(fieldGroundAtlas, source.x, source.y, source.width, source.height, 0, 0, source.width, source.height);
      }
      return surface;
    };
    const drawStaticMap = (target: CanvasRenderingContext2D) => {
      target.clearRect(0, 0, W, H); target.imageSmoothingEnabled = true; target.imageSmoothingQuality = 'high';
      const primaryPattern = target.createPattern(groundTileCanvas(field.ground), 'repeat');
      target.fillStyle = primaryPattern ?? '#7f815a'; target.fillRect(0, 0, W, H);
      target.fillStyle = 'rgba(19,27,21,.08)'; target.fillRect(0, 0, W, H);
      field.paths.forEach(pathConfig => {
        const pattern = target.createPattern(groundTileCanvas(pathConfig.tile), 'repeat');
        target.save(); target.globalAlpha = pathConfig.opacity; roundedOn(target, pathConfig.x, pathConfig.y, pathConfig.w, pathConfig.h, pathConfig.radius); target.clip();
        target.fillStyle = pattern ?? '#88877a'; target.fillRect(pathConfig.x, pathConfig.y, pathConfig.w, pathConfig.h); target.restore();
        target.strokeStyle = 'rgba(255,245,211,.18)'; target.lineWidth = 3; roundedOn(target, pathConfig.x, pathConfig.y, pathConfig.w, pathConfig.h, pathConfig.radius); target.stroke();
      });
      target.strokeStyle = 'rgba(255,255,255,.13)'; target.lineWidth = 2; target.setLineDash([16, 18]);
      [296, 506].forEach(y => { target.beginPath(); target.moveTo(238, y); target.lineTo(W - 238, y); target.stroke(); }); target.setLineDash([]);

      (['blue', 'red'] as Team[]).forEach(team => {
        const b = BASES[team], color = TEAM_COLOR[team];
        target.fillStyle = `${color}20`; target.beginPath(); target.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2); target.fill();
        target.strokeStyle = `${color}68`; target.lineWidth = 3; target.beginPath(); target.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2); target.stroke();
        const fortAsset: FieldAssetId = team === 'blue' ? 'fortRed' : 'fortGreen';
        drawFieldAsset(target, fortAsset, b.x - 84, b.y - 130, 168, 188, false, .96);
      });

      (['blue', 'red'] as Team[]).forEach(team => {
        const prison = PRISONS[team];
        drawFieldAsset(target, 'prisonFloor', prison.x, prison.y, prison.w, prison.h, team === 'red', .96);
      });

      const scenery = [
        ...field.decorations.map(item => ({ baseline: item.y + item.h, draw: () => drawFieldAsset(target, item.asset, item.x, item.y, item.w, item.h, item.flip, item.opacity) })),
        ...obstacles.map(item => ({ baseline: item.y + item.h, draw: () => drawFieldAsset(target, item.asset, item.x + item.w / 2 - item.visualW / 2, item.y + item.h - item.visualH, item.visualW, item.visualH, item.flip) })),
      ].sort((a, b) => a.baseline - b.baseline);
      scenery.forEach(item => item.draw());

      target.fillStyle = 'rgba(20,31,23,.94)'; target.fillRect(0, 32, W, 34); target.fillRect(0, H - 32, W, 32);
      target.strokeStyle = 'rgba(255,241,205,.24)'; target.lineWidth = 2; target.beginPath(); target.moveTo(0, 66); target.lineTo(W, 66); target.stroke();
      target.font = '800 15px var(--font-heading)'; target.fillStyle = '#fff0cf'; target.textAlign = 'center'; target.fillText(`${field.name.toUpperCase()} · ARENA 5v5`, W / 2, 55);
    };
    const drawMap = () => {
      if (staticLayerContext && staticMapDirty) { drawStaticMap(staticLayerContext); staticMapDirty = false; }
      if (staticLayerContext) ctx.drawImage(staticLayer, 0, 0); else { ctx.fillStyle = '#667556'; ctx.fillRect(0, 0, W, H); }
    };
    const drawFieldAnimations = (now: number) => field.animated.forEach(item =>
      drawAnimatedAsset(ctx, item.animation, item.x, item.y, item.w, item.h, now, item.flip, item.opacity));
    const drawPrisonOverlays = (now: number) => {
      (['blue', 'red'] as Team[]).forEach(team => {
        const prison = PRISONS[team];
        drawFieldAsset(ctx, 'prisonOverlay', prison.x, prison.y, prison.w, prison.h, team === 'red', .98);
      });
    };
    const drawBase = (team: Team) => {
      const b = BASES[team], color = TEAM_COLOR[team], occupant = fortOccupant(team);
      ctx.strokeStyle = occupant ? '#f5cf45' : color; ctx.lineWidth = occupant ? 7 : 4; ctx.setLineDash(occupant ? [3, 5] : [8, 7]);
      ctx.beginPath(); ctx.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff3d0'; ctx.font = '800 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(team === 'blue' ? 'BENTENG MERAH' : 'BENTENG HIJAU', b.x, b.y + 130);
      if (occupant) { ctx.fillStyle = '#f5cf45'; ctx.font = '900 9px Arial'; ctx.fillText(`TERKUNCI · ${occupant.name}`, b.x, b.y + 144); }
    };
    const drawRefill = (item: Refill, now: number) => {
      const animation: FieldAnimatedId = item.grade === 100 ? 'boost100' : item.grade === 75 ? 'boost75' : item.grade === 40 ? 'boost40' : 'boost25';
      const pulse = 1 + Math.sin(now / 220 + item.id) * .08;
      ctx.save(); ctx.translate(item.x, item.y); ctx.scale(pulse, pulse);
      drawAnimatedAsset(ctx, animation, -27, -30, 54, 58, now + item.id * 37);
      ctx.restore();
    };
    const relationColor = (p: Player, me: Player, now: number) => {
      if (p.team === me.team) return '#9fd0ff'; if (p.state === 'PRISONER') return '#8f8d84';
      if (p.state === 'RETURNING' && now < p.rescueShieldUntil) return '#60e6ff';
      if (me.state !== 'ACTIVE') return '#f1d46c';
      if ((p.state === 'ACTIVE' || p.state === 'RETURNING') && me.exitOrder > p.exitOrder) return '#b9ee3d';
      return p.state === 'ACTIVE' && p.exitOrder > me.exitOrder ? '#ff544b' : '#f1d46c';
    };
    const drawPlayer = (p: Player, me: Player, now: number) => {
      const color = TEAM_COLOR[p.team], outline = relationColor(p, me, now), bob = now < p.parkourUntil ? -15 : 0;
      const stats = CHARACTER_BY_ID[p.characterId], image = getSpriteImage(p.characterId), speed = Math.hypot(p.vx, p.vy);
      const dust = getSprintDustImage();
      const direction = directionFromVelocity(p.vx, p.vy);
      const sprinting = speed > stats.speed * 1.16;
      let row = directionalRow(direction), columns: readonly number[] = [0], mirror = shouldMirrorSprite(direction, characterUsesDedicatedEast(p.characterId));
      if (phase === 'ROUND_OVER' || phase === 'MATCH_OVER') { row = 5; columns = roundWinner === p.team ? [2, 3, 4] : [5, 6]; mirror = false; }
      else if (p.state === 'PRISONER') { row = 5; columns = [0, 1]; mirror = false; }
      else if (p.action && now < p.actionUntil) { row = 4; columns = p.action === 'tag' ? [0, 1, 2, 3] : [3, 4, 5, 6]; mirror = false; }
      else if (speed > 8) columns = sprinting ? BOOST_COLUMNS : RUN_COLUMNS;
      const frameDuration = sprinting ? 62 : columns.length > 1 ? 92 : 180;
      const frame = spriteFrame(image.naturalWidth || 896, image.naturalHeight || 816, columns[Math.floor(now / frameDuration) % columns.length], row);

      if (sprinting && dust.complete && dust.naturalWidth) {
        const dustColumn = Math.floor(now / 78) % 4;
        ctx.save(); ctx.globalAlpha = .58; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.translate(p.x, p.y + 3); ctx.rotate(sprintEffectRotation(direction));
        ctx.drawImage(dust, dustColumn * 256, 0, 256, 192, -78, -29, 92, 69);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 15, 22 * stats.visualScale, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = p.controlled ? 5 : 3; ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 21 * stats.visualScale, 10, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 16 * stats.visualScale, 7, 0, 0, Math.PI * 2); ctx.stroke();
      if (p.state === 'PRISONER') { ctx.strokeStyle = '#d5d0c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 20, p.y + 2); ctx.lineTo(p.x + 20, p.y + 2); ctx.stroke(); }

      if (image.complete && image.naturalWidth) {
        const height = 74 * stats.visualScale * frame.height / 136, width = height * frame.width / frame.height;
        ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        if (mirror) { ctx.translate(p.x * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, p.x - width / 2, p.y + 18 - height + bob, width, height);
        ctx.restore();
      } else {
        ctx.fillStyle = color; ctx.strokeStyle = outline; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - 2 + bob, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (p.controlled) { ctx.fillStyle = '#fff4d1'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 58 + bob); ctx.lineTo(p.x - 7, p.y - 69 + bob); ctx.lineTo(p.x + 7, p.y - 69 + bob); ctx.fill(); }
      const label = p.controlled ? `★ ${p.name}` : p.name;
      ctx.font = '900 9px Arial';
      const labelWidth = Math.max(38, ctx.measureText(label).width + 14);
      ctx.fillStyle = 'rgba(13,18,14,.92)'; rounded(p.x - labelWidth / 2, p.y + 23, labelWidth, 17, 5); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = p.controlled ? 2.5 : 1.5; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(label, p.x, p.y + 35);
      if (p.state === 'ACTIVE') {
        ctx.fillStyle = '#141a15'; ctx.beginPath(); ctx.arc(p.x + 23, p.y - 35 + bob, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 9px Arial'; ctx.fillText(String(p.exitOrder), p.x + 23, p.y - 32 + bob);
      }
      if (p.state === 'RETURNING') { ctx.fillStyle = now < p.rescueShieldUntil ? '#60e6ff' : '#f5cf45'; ctx.font = '800 8px Arial'; ctx.fillText(now < p.rescueShieldUntil ? 'GHOST' : 'KEMBALI', p.x, p.y - 55); }
      if (p.state === 'IN_BASE' && p.baseCharge < stats.baseChargeTime) { ctx.fillStyle = '#9b9d91'; ctx.fillRect(p.x - 18, p.y + 40, 36, 4); ctx.fillStyle = '#60e6ff'; ctx.fillRect(p.x - 18, p.y + 40, 36 * p.baseCharge / stats.baseChargeTime, 4); }
      if (p.fortCharge > 0) { ctx.fillStyle = '#f5cf45'; ctx.fillRect(p.x - 18, p.y + 40, 36 * Math.min(1, p.fortCharge / 1.5), 4); }
    };
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1)), cw = rect.width, ch = rect.height;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
      const me = players[0];
      const activeCamera = cameraModeRef.current;
      const scale = mode !== 'playing' || activeCamera === 'overview'
        ? Math.min(cw / W, ch / H)
        : activeCamera === 'tactical' ? Math.max(cw / 1220, ch / 720) : Math.max(cw / 980, ch / 620);
      const halfW = cw / (2 * scale), halfH = ch / (2 * scale);
      const followsPlayer = mode === 'playing' && activeCamera !== 'overview';
      const camX = followsPlayer ? clamp(me.x, halfW, W - halfW) : W / 2;
      const camY = followsPlayer ? clamp(me.y, halfH, H - halfH) : H / 2;
      ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.scale(scale, scale); ctx.translate(-camX, -camY);
      drawMap(); drawBase('blue'); drawBase('red');
      if (mode === 'playing') {
        drawFieldAnimations(now);
        refills.forEach(item => drawRefill(item, now));
        players.slice().sort((a, b) => a.y - b.y).forEach(p => drawPlayer(p, me, now));
        drawPrisonOverlays(now);
        particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / .65); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (mode === 'playing') {
        const marker = (point: { x: number; y: number }, label: string, color: string) => {
          const sx = (point.x - camX) * scale + cw / 2, sy = (point.y - camY) * scale + ch / 2;
          if (sx > 36 && sx < cw - 36 && sy > 70 && sy < ch - 36) return;
          const x = clamp(sx, 28, cw - 28), y = clamp(sy, 72, ch - 28);
          ctx.fillStyle = '#111812dd'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = color; ctx.font = '900 9px Arial'; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 3);
        };
        marker(BASES.blue, 'M', TEAM_COLOR.blue); marker(BASES.red, 'H', TEAM_COLOR.red);
        const outerPrisoner = players.filter(p => p.team === me.team && p.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex)[0];
        if (outerPrisoner) marker(outerPrisoner, 'P', '#b9ee3d');
      }
      if (phase !== 'PLAYING') {
        ctx.fillStyle = 'rgba(12,17,13,.52)'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#fff4d1';
        ctx.font = `800 ${phase === 'COUNTDOWN' ? 90 : 54}px var(--font-heading)`; ctx.textAlign = 'center'; ctx.fillText(announcement, cw / 2, ch / 2);
      }
    };
    const loop = (now: number) => {
      const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt, now); draw(now);
      if (now - lastHud > 100) {
        lastHud = now; const me = players[0], blueLock = fortOccupant('blue'), redLock = fortOccupant('red');
        setSnapshot({
          blue: score.blue, red: score.red, round, timer, boost: me.boost / selected.boost * 100,
          boostCountdown: me.boost >= selected.boost || !me.boostReadyAt ? 0 : Math.max(0, Math.ceil((me.boostReadyAt - now) / 1000)),
          order: me.exitOrder, state: me.state, paused, logs, mission: { ...mission },
          team: players.filter(p => p.team === me.team).map(p => ({ name: p.name, characterId: p.characterId, state: p.state, boost: p.boost / CHARACTER_BY_ID[p.characterId].boost * 100 })),
          blueHeld: players.filter(p => p.team === 'red' && p.state === 'PRISONER').length,
          redHeld: players.filter(p => p.team === 'blue' && p.state === 'PRISONER').length,
          pickupCount: refills.length,
          fortLock: blueLock ? `Merah dikunci ${blueLock.name}` : redLock ? `Hijau dikunci ${redLock.name}` : 'Benteng terbuka',
          baseGrace: me.state === 'IN_BASE' && me.exitDeadline ? Math.max(0, Math.ceil((me.exitDeadline - now) / 1000)) : 0,
          suddenDeath, fieldWins: completedMatchesRef.current,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); audio?.close();
      fieldObjectAtlas.removeEventListener('load', invalidateStaticMap);
      fieldGroundAtlas.removeEventListener('load', invalidateStaticMap);
    };
  }, [mode, run, selected, selectedFaction, selectedFieldId, selectedId]);

  const missionCount = useMemo(() => Object.values(snapshot.mission).filter(Boolean).length, [snapshot.mission]);
  const start = () => {
    if (!selectedFaction) return;
    completedMatchesRef.current = 0;
    setSnapshot(initialSnapshot); setMode('playing'); setRun(v => v + 1);
  };
  const quit = () => {
    keys.current.clear(); completedMatchesRef.current = 0;
    setSnapshot(initialSnapshot); setMode('menu'); setSelectedFaction(null); setSelectedId('raja'); setSelectedFieldId('kampung'); setCameraMode('follow'); setRun(v => v + 1);
  };
  const touchKey = (key: string, pressed: boolean) => pressed ? keys.current.add(key) : keys.current.delete(key);
  if (view === 'workshop') return <main className="game-shell"><CharacterWorkshop onClose={() => setView('game')} /></main>;
  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="brand-lockup"><img className="game-logo" src={publicAsset('brand/benteng-tag-logo.webp?v=7')} alt="Benteng Squad Tag" /><span className="brand-kicker">Playable rules prototype</span></div>
        <div className="top-actions"><div className="build-chip"><span /> Characters v7 · Fields v2 · guarded</div><button className="tool-button" onClick={() => setView('workshop')}><Wrench size={15} /> Character Workshop</button>{mode === 'playing' && <><button className="quit-button" onClick={quit}><LogOut size={15} /> Quit</button><button className="icon-button" onClick={() => keys.current.add('p')} aria-label="Jeda"><Pause size={16} /></button><button className="icon-button" onClick={() => setRun(v => v + 1)} aria-label="Mulai ulang"><RotateCcw size={16} /></button></>}</div>
      </header>
      <section className="prototype-grid">
        <div className="stage-card">
          <canvas ref={canvasRef} aria-label={`Arena ${FIELD_BY_ID[selectedFieldId].name} 5 lawan 5 yang dapat dimainkan`} />
          <div className="stage-hud"><div className="hud-red"><b>MERAH · KIRI</b><span>{snapshot.blue}</span><small>{snapshot.blueHeld}/5 ditahan</small></div><time>{snapshot.suddenDeath ? 'SD' : formatTime(snapshot.timer)}</time><div className="hud-green"><small>{snapshot.redHeld}/5 ditahan</small><span>{snapshot.red}</span><b>HIJAU · KANAN</b></div></div>
          {mode === 'menu' && <div className="start-panel character-select">
            <div className="character-select-heading"><div><p>LANGKAH 1 · PILIH TIM</p><h1>Merah atau Hijau.<br />Tentukan pihakmu.</h1></div><span>Tim Merah bertahan dari kiri. Tim Hijau bertahan dari kanan. Setiap tim memiliki enam karakter tetap dan membawa lima pemain ke field.</span></div>
            <div className="team-chooser" aria-label="Pilih tim">
              {(['red', 'green'] as Faction[]).map(faction => <button key={faction} className={`${faction} ${selectedFaction === faction ? 'selected' : ''}`} onClick={() => chooseFaction(faction)} aria-pressed={selectedFaction === faction}>
                <span><b>{factionName(faction)}</b><small>{GAME_RULES.teams[faction].side} · 6 karakter</small></span>
                <span className="team-mini-roster">{FIXED_ROSTERS[faction].map(id => <img key={id} src={characterAsset(id, 'portrait.webp')} alt={CHARACTER_BY_ID[id].name} />)}</span>
              </button>)}
            </div>
            {selectedFaction && <div className={`selection-step ${selectedFaction}`}>
              <div className="selection-step-head"><span>LANGKAH 2 · PILIH KARAKTER {factionName(selectedFaction).toUpperCase()}</span><b>1 cadangan · 5 turun ke field</b></div>
              <div className="character-row">{availableCharacters.map(character => <button key={character.id} className={selectedId === character.id ? 'selected' : ''} onClick={() => setSelectedId(character.id)} aria-pressed={selectedId === character.id}><img src={characterAsset(character.id, 'portrait.webp')} alt={`Portrait ${character.name}`} /><span><b>{character.name}</b><small>{character.role}</small><em>{character.passiveName}</em></span></button>)}</div>
              <div className="selected-character" style={{ borderColor: selected.accent }}>
                <img src={characterAsset(selected.id, 'portrait.webp')} alt={`Portrait ${selected.name}`} />
                <div className="selected-summary"><span>{factionName(selectedFaction)} · {selected.role}</span><b>{selected.name}</b><small>{selected.copy}</small><div className="character-passive"><strong>{selected.passiveName}</strong><i>{selected.passiveCopy}</i></div></div>
                <dl>
                  <div><dt>Speed <b>{selected.speed}</b></dt><dd><i><span style={{ width: statPercent(selected.speed, 188, 240) }} /></i></dd></div>
                  <div><dt>Boost <b>{selected.boost}</b></dt><dd><i><span style={{ width: statPercent(selected.boost, 84, 128) }} /></i></dd></div>
                  <div><dt>Agility <b>{selected.agility.toFixed(2)}</b></dt><dd><i><span style={{ width: statPercent(selected.agility, .82, 1.25) }} /></i></dd></div>
                </dl>
              </div>
            </div>}
            <div className="field-row"><span>LANGKAH 3 · PILIH FIELD</span>{FIELD_CONFIGS.map(field => <button key={field.id} className={selectedFieldId === field.id ? 'selected' : ''} onClick={() => setSelectedFieldId(field.id)} aria-pressed={selectedFieldId === field.id}><b>{field.name}</b><small>{field.kicker}</small></button>)}</div>
            {selectedFaction ? <div className={`squad-preview ${selectedFaction}`}><span>{factionName(selectedFaction).toUpperCase()} · LINEUP 5v5</span><div>{squad.map((id, index) => <figure key={`ally-${id}`} className={`team-${selectedFaction} ${index === 0 ? 'controlled' : ''}`}><img src={characterAsset(id, 'portrait.webp')} alt={CHARACTER_BY_ID[id].name} /><figcaption>{index === 0 ? 'KAMU' : selectedFaction === 'red' ? 'M' : 'H'}</figcaption></figure>)}<i>VS</i>{opponentSquad.map(id => <figure key={`enemy-${id}`} className={`team-${selectedFaction === 'red' ? 'green' : 'red'}`}><img src={characterAsset(id, 'portrait.webp')} alt={CHARACTER_BY_ID[id].name} /><figcaption>{selectedFaction === 'red' ? 'H' : 'M'}</figcaption></figure>)}</div><button className="start-button" onClick={start}><Play size={18} fill="currentColor" /> Main sebagai {selected.name}</button></div> : <div className="choose-team-hint">Pilih Tim Merah atau Tim Hijau untuk membuka roster karakter.</div>}
          </div>}
          {mode === 'playing' && <><div className="status-ribbon"><span className={`state-dot ${snapshot.state.toLowerCase()}`} />{snapshot.state.replace('_', ' ')}<b>PRIORITAS #{snapshot.order || '—'}</b><strong>ROTASI {snapshot.fieldWins}/3</strong>{snapshot.baseGrace > 0 && <strong>KELUAR {snapshot.baseGrace}s</strong>}<em>{snapshot.fortLock}</em></div><div className={`character-hud ${selectedFaction}`}><img src={characterAsset(selected.id, 'portrait.webp')} alt="" /><span><b>{selected.name}</b><small>{selectedFaction ? factionName(selectedFaction) : ''} · {selected.passiveName}</small></span></div><div className="camera-switcher" aria-label="Pilihan kamera">{CAMERA_OPTIONS.map(camera => <button key={camera.id} className={cameraMode === camera.id ? 'selected' : ''} onClick={() => setCameraMode(camera.id)} aria-pressed={cameraMode === camera.id}>{camera.label}</button>)}</div><div className="boost-stack"><div className="boost-label"><span>SPRINT SPACE</span><b>{Math.round(snapshot.boost)}%</b><em>{snapshot.boostCountdown ? `PULIH ${snapshot.boostCountdown}s` : 'SIAP'}</em></div><div className="stamina-bar"><span style={{ width: `${snapshot.boost}%` }} /></div></div><div className="pickup-legend"><span className="grade-25">+25%</span><span className="grade-40">+40%</span><span className="grade-75">+75%</span><span className="grade-100">+100%</span><em>{snapshot.pickupCount} item</em></div><div className="control-ribbon"><b>WASD</b> gerak <b>SPACE</b> sprint <b>SHIFT</b> parkour <b>P</b> jeda</div><div className="mobile-controls" aria-label="Kontrol sentuh"><div className="touch-dpad"><button aria-label="Gerak atas" onPointerDown={e => { e.preventDefault(); touchKey('w', true); }} onPointerUp={() => touchKey('w', false)} onPointerCancel={() => touchKey('w', false)}>▲</button><button aria-label="Gerak kiri" onPointerDown={e => { e.preventDefault(); touchKey('a', true); }} onPointerUp={() => touchKey('a', false)} onPointerCancel={() => touchKey('a', false)}>◀</button><button aria-label="Gerak kanan" onPointerDown={e => { e.preventDefault(); touchKey('d', true); }} onPointerUp={() => touchKey('d', false)} onPointerCancel={() => touchKey('d', false)}>▶</button><button aria-label="Gerak bawah" onPointerDown={e => { e.preventDefault(); touchKey('s', true); }} onPointerUp={() => touchKey('s', false)} onPointerCancel={() => touchKey('s', false)}>▼</button></div><div className="touch-actions"><button className="touch-boost" aria-label="Sprint" onPointerDown={e => { e.preventDefault(); touchKey(' ', true); }} onPointerUp={() => touchKey(' ', false)} onPointerCancel={() => touchKey(' ', false)}>SPRINT</button><button aria-label="Parkour" onPointerDown={e => { e.preventDefault(); touchKey('shift', true); }} onPointerUp={() => touchKey('shift', false)} onPointerCancel={() => touchKey('shift', false)}>PARKOUR</button></div></div></>}
        </div>
        <aside className="mission-panel">
          <div className="mission-head"><span>Rules test · {missionCount}/5</span><h2>{mode === 'menu' ? 'Kuasai aturan baru' : 'Buktikan core loop'}</h2></div>
          <div className="mission-progress"><span style={{ width: `${missionCount * 20}%` }} /></div>
          <ul className="mission-list">
            <li className={snapshot.mission.refresh ? 'done' : ''}><Flag size={18} /><div><b>Refresh prioritas</b><span>Kembali ke benteng dan keluar lagi sebagai urutan terbaru.</span></div></li>
            <li className={snapshot.mission.boost ? 'done' : ''}><BatteryCharging size={18} /><div><b>Sprint terbatas</b><span>Tekan Space untuk ledakan lari {GAME_RULES.boostDurationMs / 1000} detik. Pulih 20 detik atau ambil refill.</span></div></li>
            <li className={snapshot.mission.parkour ? 'done' : ''}><Gauge size={18} /><div><b>Parkour kontekstual</b><span>Tekan Shift di dekat rintangan.</span></div></li>
            <li className={snapshot.mission.tag ? 'done' : ''}><Zap size={18} /><div><b>Menangkap target</b><span>Outline hijau = keluar lebih dulu dan boleh ditangkap.</span></div></li>
            <li className={snapshot.mission.rescue ? 'done' : ''}><Shield size={18} /><div><b>Bebaskan penjara</b><span>Jangkau rekan terluar untuk membebaskan seluruh rantai.</span></div></li>
          </ul>
          {mode === 'playing' ? <><div className={`team-status ${selectedFaction}`}><span>{selectedFaction ? factionName(selectedFaction).toUpperCase() : 'TIM'} · 5 PEMAIN UNIK</span>{snapshot.team.map((member, index) => <div key={`${member.name}-${index}`}><img src={characterAsset(member.characterId, 'portrait.webp')} alt="" /><b>{member.name}</b><i style={{ width: `${Math.min(100, member.boost)}%` }} /><em>{member.state.replace('_', ' ')}</em></div>)}</div><div className="event-feed">{snapshot.logs.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}</div></> : <div className="reference-card"><img src={publicAsset('characters.webp?v=7')} alt="Referensi karakter Benteng Squad Tag" /><div><b>Dua belas sprite produksi terpasang</b><span>Tim tetap, atlas 7×6 anti-potong, portrait transparan, animasi arah, tag, rescue, tahanan, menang, dan kalah.</span></div></div>}
          <div className="audio-note"><Volume2 size={13} /> Cue audio aktif setelah game dimulai.</div>
        </aside>
      </section>
    </main>
  );
}
