'use client';

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { CharacterWorkshop } from '../modules/ui/character-workshop/character-workshop';
import { MatchEventFeed } from '../modules/ui/match-event-feed.tsx';
import { RoundStatsOverlay } from '../modules/ui/round-stats-overlay.tsx';
import { MissionPanel } from '../modules/ui/mission-panel.tsx';
import { RoundResultAnnouncementCard } from '../modules/ui/round-result-announcement.tsx';
import { SplashScreen } from '../modules/ui/splash-screen.tsx';
import { TeamScreen } from '../modules/ui/team-screen.tsx';
import { RulesOverlay } from '../modules/ui/rules-overlay.tsx';
import { FieldSelectScreen } from '../modules/ui/field-select-screen.tsx';
import { CharacterSelectScreen } from '../modules/ui/character-select-screen.tsx';
import { AssetLoadingScreen } from '../modules/ui/asset-loading-screen.tsx';
import { MenuActionsRow } from '../modules/ui/menu-actions-row.tsx';
import { BackButton } from '../modules/ui/back-button.tsx';
import { ProfileTriggerButton } from '../modules/ui/profile-trigger-button.tsx';
import { WorkshopLink } from '../modules/ui/workshop-link.tsx';
import { ArenaIntel } from '../modules/ui/arena-intel.tsx';
import { StageHud } from '../modules/ui/stage-hud.tsx';
import { PlayingTopbar } from '../modules/ui/playing-topbar.tsx';
import { PauseOverlay } from '../modules/ui/pause-overlay.tsx';
import { CameraSwitcher } from '../modules/ui/camera-switcher.tsx';
import { BoostStack } from '../modules/ui/boost-stack.tsx';
import { UltimateMeterHud } from '../modules/ui/ultimate-meter-hud.tsx';
import { CharacterHud } from '../modules/ui/character-hud.tsx';
import { UltimateBanner } from '../modules/ui/ultimate-banner.tsx';
import { PrisonerNotice } from '../modules/ui/prisoner-notice.tsx';
import { ActiveObjective } from '../modules/ui/active-objective.tsx';
import { TeamComboHud } from '../modules/ui/team-combo-hud.tsx';
import { MobileControls } from '../modules/ui/mobile-controls.tsx';
import { ActionDock } from '../modules/ui/action-dock.tsx';
import { RendererErrorNotice } from '../modules/ui/renderer-error-notice.tsx';
import { StatusRibbon } from '../modules/ui/status-ribbon.tsx';
import { ComboCallout } from '../modules/ui/combo-callout.tsx';
import { ControlRibbon } from '../modules/ui/control-ribbon.tsx';
import { selectionPreviewUrls, loadSelectionPreview } from '../lib/selection-preview-assets';
import { studioImages, createStudioResolver } from '../lib/sprite-studio';
import { studioMaps, studioBuiltinStates, studioMapById, mapImages, mapArtwork, drawMapTerrain, drawMapObject } from '../lib/map-studio';
import { solidAt as studioSolidAt, speedAt as studioSpeedAt } from '../lib/map-studio-model.js';
import { audioLevels, AUDIO_SETTINGS_EVENT, MUSIC_PREVIEW_EVENT } from '../lib/audio-settings';
import { createMatchAudio } from '../modules/audio/audio-port';
import { playTone, closeToneAudio } from '../modules/audio/audio-tone';
import { playAudioCue as playAudioCueAt } from '../modules/audio/audio-cue';
import { characterVoiceAsset } from '../modules/audio/character-voice';
import { startMatchLoop } from '../modules/game-core/match-runtime';
import { pushMatchEvent } from '../modules/game-core/match-state';
import { drawBase, drawPrisonOverlays as drawPrisonOverlaysAt, drawRescueBubble as drawRescueBubbleAt, drawPhaseOverlay as drawPhaseOverlayAt, drawRouteTarget as drawRouteTargetAt } from '../modules/ui/draw-base.ts';
import { createFieldAssetDraw, createDrawFieldAnimations } from '../modules/ui/field-assets.ts';
import { createDrawRefill } from '../modules/ui/draw-refill.ts';
import { createGroundTileCanvas } from '../modules/ui/ground-tiles.ts';
import { createColliderDebugDraw } from '../modules/ui/collider-debug.ts';
import { createStaticMapLayer } from '../modules/ui/static-map-layer.ts';
import { createDrawKanalWater } from '../modules/ui/draw-kanal-water.ts';
import { createDrawNearbyFieldDetails } from '../modules/ui/draw-nearby-details.ts';
import { createDrawPlayer } from '../modules/ui/draw-player.ts';
import { computeFrameView } from '../modules/ui/frame-view.ts';
import { burst as burstParticles, stepParticles, drawParticles as drawParticlesAt } from '../modules/ui/effects-particles.ts';
import { pushLog } from '../modules/ui/effects-log.ts';
import { uiAsset as uiAssetAt, matchEventFrames, roundResultAssets, loadingUiFrame as loadingUiFrameAt, loadingUiFrames } from '../modules/ui/ui-assets.ts';
import { getSprintDustImage, getKakaUltimateImage, getFieldImage } from '../modules/ui/image-cache.ts';
import { interactiveTarget as interactiveTargetAt, handlePointerOut as handlePointerOutAt } from '../modules/ui/event-target.ts';
import { makePlayers, cycleRosterId, rosterCharacters, squadLineup } from '../modules/gameplay/roster.ts';
import { ArenaBackdrop, arenaImage } from '../modules/ui/arena-backdrop';
import { imageReady, videoReady } from '../lib/asset-ready';
import {
  CHARACTER_BY_ID,
  CharacterId,
  characterFullBodyPortrait,
  characterPreviewIcon,
  characterRuntimeAsset,
  characterSelectionVideo,
  kakaUltimateBannerAsset,
  publicAsset,
  rajaUltimateBannerAsset,
  uiAudioAsset,
  ULTIMATE_BANNERS,
  ULTIMATE_CHARACTER_IDS,
  ultimateIcon,
} from '../lib/characters';
import { DeveloperCredits } from '../modules/ui/developer-credits';
import { PlayerProfileSetup } from '../modules/ui/player-profile/player-profile-setup';
import {
  loadPlayerProfile,
  PLAYER_PROFILE_CHANGED_EVENT,
  EMPTY_KDA,
  type LocalPlayerProfile,
  type PlayerKdaStats,
} from '../lib/player-profile';
import { hasSpriteSeries } from '../lib/series-animation.js';
import {
  FIELD_ANIMATED_ATLAS,
  FIELD_GROUND_ATLAS,
  FIELD_OBJECT_ATLAS,
} from '../lib/field-assets.generated';
import { buildFieldConfigs, GUIDE_FIELD_CONFIGS } from '../modules/world/map-data/guide-fields';
import { factionName, FIXED_ROSTERS, TEAM_COLOR } from '../modules/world/team-tables';
import { isKanalField } from '../modules/world/field-flags';
import { clamp, distance, other } from '../lib/math.ts';
import { fortOccupant } from '../modules/gameplay/base.ts';
import { baseVector as baseVectorAt, depenetrateFromRects, findParkourLanding as findParkourLandingAt, hasLineOfSight, hitsObstacle as hitsObstacleAt, isBlocked as isBlockedAt, isInsideFortCore as isInsideFortCoreAt, kanalWaterBlocks, movePlayer as movePlayerAt, navigateAroundHazardsForPlayer, recoverFromObstacle, resolvePlayerSpacing as resolvePlayerSpacingAt, tryParkourJump } from '../modules/gameplay/collision-navigation.ts';
import { expireRescueRequest, requestRescue } from '../modules/gameplay/rescue.ts';
import { registerTeamAction as registerTeamActionAt } from '../modules/gameplay/team-combo-actions.ts';
import { stepBots } from '../modules/gameplay/ai-movement.ts';
import { capture as captureAt, updateCaptureHold } from '../modules/gameplay/capture.ts';
import { tagCheck as tagCheckAt } from '../modules/gameplay/tag-check.ts';
import { rescueCheck as rescueCheckAt } from '../modules/gameplay/rescue-check.ts';
import { refillCheck as refillCheckAt } from '../modules/gameplay/refill-check.ts';
import {
  seedRefills,
  spawnGeo,
  tickRefills,
  type Refill,
} from '../modules/gameplay/spawn.ts';
import { riverFallCheck as riverFallCheckAt } from '../modules/gameplay/river-fall.ts';
import { stepMovementAudio } from '../modules/gameplay/movement-audio.ts';
import { applyExitOrder, baseCheck as baseCheckAt } from '../modules/gameplay/base-check.ts';
import { createWaterAt, beginKanal2WaterFall as beginKanal2WaterFallAt } from '../modules/gameplay/water.ts';
import {
  clearKeys,
  handleContextMenu as handleContextMenuAt,
  handleKeyDown,
  handleKeyUp,
  handlePointerDown,
  handleStopForMenu as handleStopForMenuAt,
  handleStopWhenHidden as handleStopWhenHiddenAt,
  handleVisibilityChange,
  stepMouseStuckTimeout,
  stepPauseGate,
} from '../modules/gameplay/input-navigation.ts';
import { createSnapshotWriter } from '../modules/game-core/snapshot-write.ts';
import { createResetRound, createWinRound, stepSuddenDeath, pendingFieldRotation, nextLandingArenaId, stepFieldId } from '../modules/game-core/match-control.ts';
import type {
  MatchEvent,
  MatchEventKind,
  PlayerAction,
  PlayerState,
  RescueRequest,
} from '../modules/game-core/match-types';
import {
  addStat,
  applyUltimateImpact,
  beginUltimateCast,
  chargeUltimateMeter,
  createStatsStore,
  freezeDuringUltimateCast,
  rajaUltimateMultiplier as rajaUltimateMultiplierAt,
  stepBoost,
  tickUltimateMeter,
} from '../modules/gameplay/bars-score';
import { buildStatsBoard as buildStatsBoardOf } from '../modules/game-core/stats-board.ts';
import { kanalPrisonWalls, layoutPrisons } from '../modules/gameplay/prison.ts';
import type {
  DifficultyId,
  Faction,
  FieldConfig,
  FieldId,
  Team,
} from '../modules/world/map-data/field-types';
import {
  BASE_RADIUS,
  BASES,
  fortGeometry,
  H,
  W,
} from '../modules/world/map-data/scalars';
import { extractWaterMask } from '../modules/world/water-mask.ts';
import { kanalObjectRects, kanalObjectPolygons, kanalFortPolygon, polygonToRects } from '../modules/world/kanal-footprints.ts';
import { loadMusicMuted, saveMusicMuted } from '../modules/storage/local-settings';
import {
  createTeamComboState,
  teamComboSeconds,
  teamComboSpeedMultiplier,
} from '../modules/gameplay/team-combo.ts';
import type { Kampung3D } from '../lib/kampung-3d';
let Kampung3DRenderer: typeof Kampung3D | undefined;
const PlayerProfilePanel = lazy(async () => ({
  default: (await import('../modules/ui/player-profile/player-profile-panel')).PlayerProfilePanel,
}));

import type {
  Mission,
  Snapshot,
  StatsBoard,
} from '../modules/game-core/snapshot-types';
import { initialSnapshot } from '../modules/game-core/snapshot-types';

type CameraMode = 'follow' | 'tactical' | 'overview';
type MenuStep = 'splash' | 'team' | 'character' | 'field';
type Player = {
  visualTagVector?: { x: number; y: number };
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
  waterEnteredAt: number;
  waterFallUntil: number;
  capturedIds: string[];
  action?: PlayerAction;
  actionUntil: number;
  lastX: number;
  lastY: number;
};
const PLAYER_COLLISION_RADIUS = 13;
const AI_SPEED_MULTIPLIER = 1;
const AI_BOOST_THRESHOLD = -0.15;
const AI_BOOST_DRAIN_MULTIPLIER = 0.66;
const RAJA_ULTIMATE_RECHARGE_SECONDS = 45;
const RAJA_ULTIMATE_CAST_MS = 3200;
const RAJA_ULTIMATE_BUFF_MS = 5000;
const KAKA_ULTIMATE_CAST_MS = 3600;
const KAKA_ULTIMATE_FRAME_COUNT = 9;
const KAKA_ULTIMATE_SHIELD_MS = 5000;
const DIFFICULTY_PROFILES = {
  easy: {
    enemySpeed: 1,
    steerDistance: 70,
    boostThreshold: AI_BOOST_THRESHOLD,
    prediction: 0.08,
    playerBias: 0,
    threatRadius: 145,
    rescueCutoff: 0.9,
    boostDrain: AI_BOOST_DRAIN_MULTIPLIER,
  },
  normal: {
    enemySpeed: 1,
    steerDistance: 86,
    boostThreshold: AI_BOOST_THRESHOLD,
    prediction: 0.18,
    playerBias: 0,
    threatRadius: 165,
    rescueCutoff: 1.55,
    boostDrain: AI_BOOST_DRAIN_MULTIPLIER,
  },
  hard: {
    enemySpeed: 1,
    steerDistance: 100,
    boostThreshold: AI_BOOST_THRESHOLD,
    prediction: 0.28,
    playerBias: 0,
    threatRadius: 185,
    rescueCutoff: 2.2,
    boostDrain: AI_BOOST_DRAIN_MULTIPLIER,
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
const FIELD_CONFIGS: FieldConfig[] = buildFieldConfigs(GUIDE_FIELD_CONFIGS);

// Clone AFTER normalization: no second scaling and no change to live arena rules.
FIELD_CONFIGS.push({
  ...structuredClone(FIELD_CONFIGS[0]),
  id: 'kampung3d',
  name: 'Kampung Merdeka 3D',
  kicker: 'EKSPERIMENTAL · low-poly / gameplay 2D',
});
const prisonClearance = 12;
const arenaValidationErrors: string[] = [];
for (const field of FIELD_CONFIGS) {
  const fieldWidth = field.width ?? W;
  const fieldHeight = field.height ?? H;
  const fieldBases = field.bases ?? BASES;
  const fieldBaseRadius = field.baseRadius ?? BASE_RADIUS;
  // Kanal deliberately uses only visual, solid footprints. Its broad border
  // art lives on the background layer and must not be padded with invisible
  // navigation boxes just to satisfy the denser-map guideline.
  if (!isKanalField(field.id) && field.obstacles.length < 26)
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
      if (Math.hypot(base.x - nearestX, base.y - nearestY) < fieldBaseRadius + 28)
        arenaValidationErrors.push(
          `${field.id}: obstacle ${obstacle.asset} (${obstacle.x},${obstacle.y}) menutup akses benteng`,
        );
    }
  }
}
if (arenaValidationErrors.length > 0)
  throw new Error(arenaValidationErrors.join('\n'));
// Custom maps are already in world coordinates. Existing arena definitions remain untouched.
const replacedFields = new Set(studioMaps.map(map => map.replaces));
const nativeFieldConfigs = Object.fromEntries(FIELD_CONFIGS.map(field => [field.id, field]));
for (let index = FIELD_CONFIGS.length - 1; index >= 0; index--) {
  const id = FIELD_CONFIGS[index].id;
  if (replacedFields.has(id) || ['archived','deleted'].includes(studioBuiltinStates[id])) FIELD_CONFIGS.splice(index, 1);
}
FIELD_CONFIGS.push(...studioMaps.map((map): FieldConfig => ({
  id: map.id, name: map.name, kicker: map.description, difficulty: map.replaces ? nativeFieldConfigs[map.replaces].difficulty : 'normal',
  aiIntensity: map.replaces ? nativeFieldConfigs[map.replaces].aiIntensity : 1, objectScale: map.replaces ? nativeFieldConfigs[map.replaces].objectScale : undefined, baseRadius: map.replaces ? nativeFieldConfigs[map.replaces].baseRadius : undefined, ground: 'kampungGround', width: map.width, height: map.height,
  bases: map.bases, prisons: map.prisons, paths: [], obstacles: [], decorations: [], animated: [],
})));
const FIELD_BY_ID = Object.fromEntries(
  FIELD_CONFIGS.map((field) => [field.id, field]),
) as Record<FieldId, FieldConfig>;
const CAMERA_OPTIONS: Array<{ id: CameraMode; label: string }> = [
  { id: 'follow', label: 'Dekat' },
  { id: 'tactical', label: 'Taktis' },
  { id: 'overview', label: 'Overall' },
];
const uiAssetSources = { mapArtwork, publicAsset };
const uiAsset = (file: string) => uiAssetAt(file, uiAssetSources);
const MATCH_EVENT_FRAME: Record<MatchEventKind, string> = matchEventFrames(uiAssetSources);
const ROUND_RESULT_ASSET: Record<Team, string> = roundResultAssets(uiAssetSources);
const loadingUiFrame = (faction: Faction, progress: number) => loadingUiFrameAt(faction, progress, uiAssetSources);

const LOADING_UI_FRAMES = loadingUiFrames(uiAssetSources);

const spriteImages = new Map<CharacterId, HTMLImageElement>();
const seriesImages = new Map<CharacterId, HTMLImageElement>();
const getSeriesImage = (id: CharacterId) => {
  let image = seriesImages.get(id);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.src = publicAsset(`characters/${id}/series-runtime.webp?v=1`);
    seriesImages.set(id, image);
  }
  return image;
};
const presentationImages = new Map<string, HTMLImageElement>();
const getPresentationImage = (url: string) => {
  let image = presentationImages.get(url);
  if (!image) {
    image = new Image();
    image.src = url;
    presentationImages.set(url, image);
  }
  return image;
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

export function BentenganPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Set<string>>(new Set());
  const characterVoiceRef = useRef<HTMLAudioElement | null>(null); // === CHARACTER SELECTION VOICE ===
  const characterVoiceIdRef = useRef<CharacterId | null>(null);
  const cameraModeRef = useRef<CameraMode>('follow');
  const completedMatchesRef = useRef(0);
  const pendingProfileStatsRef = useRef<PlayerKdaStats>({ ...EMPTY_KDA });
  const leaderboardOpenRef = useRef(false);
  const postRoundActionRef = useRef<'next-round' | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [selectedId, setSelectedId] = useState<CharacterId>('raja');
  const [selectedFieldId, setSelectedFieldId] = useState<FieldId>(FIELD_CONFIGS[0].id);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [mode, setMode] = useState<'menu' | 'playing'>('menu');
  const [menuStep, setMenuStep] = useState<MenuStep>('splash');
  const [hoveredFaction, setHoveredFaction] = useState<Faction | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [view, setView] = useState<'game' | 'workshop'>('game');
  const [run, setRun] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [ultimateBannerVisible, setUltimateBannerVisible] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [landingArena, setLandingArena] = useState<FieldId>('kampung');
  const [playerProfile, setPlayerProfile] = useState<
    LocalPlayerProfile | null | undefined
  >(undefined);
  const [profileOpen, setProfileOpen] = useState(false);
  const refreshPlayerProfile = () => setPlayerProfile(loadPlayerProfile());
  useEffect(() => {
    refreshPlayerProfile();
    window.addEventListener(PLAYER_PROFILE_CHANGED_EVENT, refreshPlayerProfile);
    return () =>
      window.removeEventListener(PLAYER_PROFILE_CHANGED_EVENT, refreshPlayerProfile);
  }, []);
  useEffect(() => {
    setLandingArena(FIELD_CONFIGS[Math.floor(Math.random() * FIELD_CONFIGS.length)].id);
    // Warm the small loading posters while the user navigates the menus.
    for (const team of ['red', 'green']) getPresentationImage(arenaImage(`${team}-loading`));
    LOADING_UI_FRAMES.forEach(getPresentationImage);
  }, []);
  const nextLandingArena = () => setLandingArena(current =>
    nextLandingArenaId(current, FIELD_CONFIGS.map(field => field.id), (count) => Math.floor(Math.random() * count)),
  );
  const [readyFaction, setReadyFaction] = useState<Faction | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [rendererError, setRendererError] = useState('');
  const selectionLoading = mode === 'menu' && menuStep === 'character' &&
    !!selectedFaction && readyFaction !== selectedFaction;
  const assetsLoading = selectionLoading || gameLoading;

  useEffect(() => {
    if (!assetsLoading) return;
    let cancelled = false;
    setLoadProgress(0);
    setLoadError('');
    keys.current.clear();
    const prepare = async () => {
      const images: HTMLImageElement[] = [];
      const urls = [uiAsset('controls/primary.webp'), uiAsset('controls/primary-hover.webp'),
        uiAsset('controls/back.webp'), ...LOADING_UI_FRAMES];
      for (const field of FIELD_CONFIGS) urls.push(arenaImage(field.id));
      if (gameLoading) {
        for (const id of Object.keys(CHARACTER_BY_ID) as CharacterId[]) {
          images.push(getSpriteImage(id));
          images.push(...studioImages(id));
          if (hasSpriteSeries(id)) images.push(getSeriesImage(id));
          urls.push(characterPreviewIcon(id));
        }
        images.push(getSprintDustImage(), getKakaUltimateImage());
        for (const asset of ['objects.webp', 'animated.webp', 'grounds.webp']) images.push(getFieldImage(asset));
        // Preload the rotation too, so later rounds cannot expose an unloaded map.
        for (const field of FIELD_CONFIGS) {
          if (studioMapById[field.id]) images.push(...mapImages(studioMapById[field.id]));
          if (field.background) images.push(getFieldImage(field.background));

          if (field.waterMask) images.push(getFieldImage(field.waterMask));

        }
        urls.push(
          rajaUltimateBannerAsset(),
          kakaUltimateBannerAsset(),
          ...new Set([
            ...Object.values(MATCH_EVENT_FRAME),
            ...Object.values(ROUND_RESULT_ASSET),
          ]),
        );
      } else if (selectedFaction) {
        for (const id of FIXED_ROSTERS[selectedFaction]) {
          urls.push(characterFullBodyPortrait(id), characterPreviewIcon(id));
        }
        for (const faction of ['red', 'green']) {
          urls.push(uiAsset(`controls/team-${faction}-active.webp`), uiAsset(`controls/team-${faction}-normal.webp`));
        }
        for (const field of FIELD_CONFIGS) urls.push(uiAsset(`fields/${field.id}.webp`));
      }
      images.push(...[...new Set(urls)].map(getPresentationImage));
      const tasks = [...new Set(images)].map(image => () => imageReady(image));
      if (!gameLoading && selectedFaction) {
        for (const url of new Set(FIXED_ROSTERS[selectedFaction].flatMap(selectionPreviewUrls))) {
          tasks.push(() => loadSelectionPreview(url));
        }
      }
      if (!gameLoading && selectedFaction) tasks.push(() => videoReady(characterSelectionVideo(selectedFaction)));
      tasks.push(() => document.fonts.ready.then(() => undefined));
      let done = 0;
      // A bounded batch avoids flooding mobile connections with atlas requests.
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, tasks.length) }, async () => {
        while (!cancelled && next < tasks.length) {
          const task = tasks[next++];
          await task();

          // === PERUBAHAN: 100% hanya boleh berarti seluruh loading benar-benar selesai ===
          // Selama masih menyelesaikan task satu per satu, progres ditahan maksimal 99%.
          // Dengan begitu layar tidak pernah menampilkan 100% sementara proses lanjutan masih berjalan.
          const completed = ++done;
          const progress = Math.round((completed / tasks.length) * 100);
          if (!cancelled) setLoadProgress(Math.min(99, progress));
          // === AKHIR PERUBAHAN ===
        }
      }));
      if (cancelled) return;
      if (gameLoading && selectedFieldId === 'kampung3d') {
        const module = await import('../lib/kampung-3d');
        Kampung3DRenderer = module.Kampung3D;
        let probe: Kampung3D | undefined;
        try {
          probe = new module.Kampung3D(FIELD_BY_ID.kampung3d, getFieldImage('kampung-map.webp'));
          await probe.warmup();
        } catch {
          throw new Error('Map 3D membutuhkan WebGL2 yang aktif. Aktifkan akselerasi grafis atau pilih Kampung Merdeka asli.');
        } finally { probe?.dispose(); }
        if (cancelled) return;
      }
      keys.current.clear();

      // === PERUBAHAN: 100% adalah readiness gate final ===
      // Barulah setelah seluruh image/GIF/video/font dan warmup tambahan selesai,
      // progres boleh menjadi 100%. Tidak ada delay buatan setelah titik ini:
      // langsung lanjut ke gameplay atau Character Selection.
      setLoadProgress(100);
      // === AKHIR PERUBAHAN ===

      if (gameLoading) {
        setGameLoading(false);
        setMode('playing');
        setRun(v => v + 1);
      } else {
        setReadyFaction(selectedFaction);
      }
    };
    void prepare().catch(error => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Aset gagal dimuat.');
      cancelled = true;
    });
    return () => { cancelled = true; };
  }, [assetsLoading, gameLoading, selectedFaction, selectedFieldId, loadAttempt]);
  const selected = CHARACTER_BY_ID[selectedId];
  const availableCharacters = useMemo(
    () => rosterCharacters(selectedFaction),
    [selectedFaction],
  );
  const squad = useMemo(
    () => squadLineup(selectedFaction, selectedId),
    [selectedFaction, selectedId],
  );

  const chooseFaction = (faction: Faction) => {
    setSelectedFaction(faction);
    setSelectedId(FIXED_ROSTERS[faction][0]);
  };

  const playAudioCue = (file: string, volume = 0.55) => playAudioCueAt(file, volume);

  // === CHARACTER SELECTION VOICE: loop selama karakter masih disorot ===
  const stopCharacterVoice = () => {
    const voice = characterVoiceRef.current;
    if (voice) {
      voice.pause();
      voice.loop = false;
      voice.currentTime = 0;
    }
    characterVoiceRef.current = null;
    characterVoiceIdRef.current = null;
  };

  const playCharacterVoice = (id: CharacterId) => {
    // Pointer/focus/click pada karakter yang sama tidak boleh me-restart loop.
    if (
      characterVoiceIdRef.current === id &&
      characterVoiceRef.current &&
      !characterVoiceRef.current.paused
    ) {
      return;
    }

    // Saat sorotan pindah, voice lama harus langsung berhenti.
    stopCharacterVoice();

    const src = characterVoiceAsset(id, uiAudioAsset);
    if (!src) return;

    const voice = new Audio(src);
    voice.preload = 'auto';
    voice.loop = true;
    voice.volume = 0.85 * audioLevels().sfx;
    characterVoiceRef.current = voice;
    characterVoiceIdRef.current = id;

    void voice.play().catch((error) => {
      // Jika browser menolak autoplay pada hover pertama, click/focus berikutnya
      // akan mencoba lagi karena elemen yang gagal tetap dianggap paused.
      console.warn(`[character voice] gagal memutar ${id}`, error);
    });
  };

  const highlightCharacterWithVoice = (id: CharacterId) => {
    setSelectedId(id);
    playCharacterVoice(id);
  };
  // === END CHARACTER SELECTION VOICE ===

  const toggleBackgroundMusic = () => {
    setMusicMuted((muted) => {
      const next = !muted;
      saveMusicMuted(next);
      return next;
    });
  };

  useEffect(() => {
    setMusicMuted(loadMusicMuted());
  }, []);

  useEffect(() => {
    const unlock = () => setAudioUnlocked(true);
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // Voice karakter mengikuti volume SFX dan berhenti ketika Character Selection ditinggalkan.
  useEffect(() => {
    const updateVoiceVolume = () => {
      if (characterVoiceRef.current) {
        characterVoiceRef.current.volume = 0.85 * audioLevels().sfx;
      }
    };
    window.addEventListener(AUDIO_SETTINGS_EVENT, updateVoiceVolume);
    return () => {
      window.removeEventListener(AUDIO_SETTINGS_EVENT, updateVoiceVolume);
      const voice = characterVoiceRef.current;
      if (voice) {
        voice.pause();
        voice.loop = false;
        voice.currentTime = 0;
      }
      characterVoiceRef.current = null;
      characterVoiceIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode === 'menu' && menuStep === 'character' && view === 'game') return;
    const voice = characterVoiceRef.current;
    if (voice) {
      voice.pause();
      voice.loop = false;
      voice.currentTime = 0;
    }
    characterVoiceRef.current = null;
    characterVoiceIdRef.current = null;
  }, [mode, menuStep, view]);

  useEffect(() => {
    if (!audioUnlocked || musicMuted) return;
    const music = new Audio(
      uiAudioAsset(
        mode === 'playing' ? 'ingame-music.mp3' : 'opening-title.mp3',
      ),
    );
    music.loop = true;
    let previewing = false;
    const updateVolume = () => { music.volume = previewing ? 0 : audioLevels().music; };
    const preview = (event: Event) => { previewing = Boolean((event as CustomEvent).detail); updateVolume(); };
    updateVolume();
    window.addEventListener(AUDIO_SETTINGS_EVENT, updateVolume);
    window.addEventListener(MUSIC_PREVIEW_EVENT, preview);
    void music.play().catch(() => undefined);
    return () => {
      music.pause();
      window.removeEventListener(AUDIO_SETTINGS_EVENT, updateVolume);
      window.removeEventListener(MUSIC_PREVIEW_EVENT, preview);
      music.removeAttribute('src');
      music.load();
    };
  }, [audioUnlocked, mode, musicMuted]);

  useEffect(() => {
    if (!audioUnlocked || mode !== 'playing') return;
    const ambience = new Audio(uiAudioAsset('ingame-ambience.mp3'));
    ambience.loop = true;
    const updateVolume = () => { ambience.volume = .12 * audioLevels().sfx; };
    updateVolume();
    window.addEventListener(AUDIO_SETTINGS_EVENT, updateVolume);
    void ambience.play().catch(() => undefined);
    return () => {
      ambience.pause();
      window.removeEventListener(AUDIO_SETTINGS_EVENT, updateVolume);
      ambience.removeAttribute('src');
      ambience.load();
    };
  }, [audioUnlocked, mode]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    leaderboardOpenRef.current = leaderboardOpen;
  }, [leaderboardOpen]);

  useEffect(() => {
    const ultimate = CHARACTER_BY_ID[selectedId]?.ultimate;
    if (!ultimate) return;
    const banner = new Image();
    banner.decoding = 'async';
    banner.src = ULTIMATE_BANNERS[ultimate.icon]();
    if (ultimate.strip) getKakaUltimateImage();
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
      if (audioLevels().sfx === 0) return;
      try {
        uiAudio ??= new AudioContext();
        if (uiAudio.state !== 'running') void uiAudio.resume();
        const oscillator = uiAudio.createOscillator();
        const gain = uiAudio.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, uiAudio.currentTime);
        gain.gain.setValueAtTime(Math.max(.0001, gainValue * audioLevels().sfx), uiAudio.currentTime);
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
      sample.volume = 0.48 * audioLevels().sfx;
      void sample.play().catch(() => undefined);
    };
    const interactive = (target: EventTarget | null) => interactiveTargetAt(target);
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
    const onPointerOut = (event: PointerEvent) =>
      handlePointerOutAt(event.target, lastHoverTarget, () => {
        lastHoverTarget = null;
      });
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
    const down = (event: KeyboardEvent) =>
      handleKeyDown(event, keys.current, mode, profileOpen, setLeaderboardOpen);
    const up = (event: KeyboardEvent) =>
      handleKeyUp(event, keys.current, setLeaderboardOpen);
    const releaseAll = () => clearKeys(keys.current);
    const visibility = () => handleVisibilityChange(keys.current, document.hidden);
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
  }, [mode, profileOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pendingProfileStatsRef.current = { ...EMPTY_KDA };
    const mainContext = canvas.getContext('2d');
    if (!mainContext) return;
    let ctx: CanvasRenderingContext2D = mainContext;
    let lastHud = 0;
    let phase: 'COUNTDOWN' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER' =
      'COUNTDOWN';
    let phaseUntil = performance.now() + 3000,
      matchStartedAt = performance.now(),
      timer = 240,
      round = 1,
      exitCounter = 0;
    let score = { blue: 0, red: 0 },
      paused = false,
      announcement = mode === 'playing' ? 'BERSIAP!' : '',
      roundWinner: Team | undefined,
      roundEndReason = '';
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
    let matchEvents: MatchEvent[] = [];
    let matchEventId = 0;
    let rescueRequest: RescueRequest | null = null;
    let rescueRequestCooldownUntil = 0;
    let resultWinner: Team | undefined;
    let resultAnnouncementUntil = 0;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }> = [];
    let refills: Refill[] = [],
      parkourLatch = false,
      boostLatch = false,
      boostBurstUntil = 0;
    let ultimateMeter = 0,
      ultimateImpactAt = 0,
      ultimateBuffUntil = 0,
      ultimateShieldUntil = 0,
      ultimateImpactApplied = false;
    let mouseRoute: Array<{ x: number; y: number }> = [];
    let mouseBoost = false;
    let mouseStuckTime = 0;
    let view = { x: 0, y: 0, width: 1, height: 1, scale: 1 };
    const clearMouse = () => { mouseRoute = []; mouseBoost = false; mouseStuckTime = 0; };
    let bannerTimeout = 0;
    const field = FIELD_BY_ID[selectedFieldId];
    const studioMap = studioMapById[selectedFieldId];
    const development = process.env.NODE_ENV !== 'production';
    let debugColliders = development && new URLSearchParams(window.location.search).has('debugColliders');
    const worldWidth = field.width ?? W;
    const worldHeight = field.height ?? H;
    const bases = field.bases ?? BASES;
    const baseRadius = field.baseRadius ?? BASE_RADIUS;
    const visualObstacles = field.obstacles;
    const obstacles = isKanalField(field.id)
      ? visualObstacles.flatMap(item => kanalObjectRects(item).map((rect: { x: number; y: number; w: number; h: number }) => ({ ...item, ...rect, hidden: true })))
      : visualObstacles;
    const fieldObjectScale = field.objectScale ?? 1;
    const { fortWidth, fortHeight, fortAnchorY } = fortGeometry(fieldObjectScale);
    const aiProfile = DIFFICULTY_PROFILES[field.difficulty];
    const fieldObjectAtlas = getFieldImage('objects.webp');
    const kanalObjectAtlas = isKanalField(field.id)
      ? getFieldImage('kanal-object-atlas.webp')
      : null;
    const fieldAnimatedAtlas = getFieldImage('animated.webp');
    const fieldGroundAtlas = getFieldImage('grounds.webp');
    const fieldBackground = field.background
      ? getFieldImage(field.background)
      : null;

    let scene3d: Kampung3D | undefined;
    if (selectedFieldId === 'kampung3d' && mode === 'playing') {
      try {
        if (!Kampung3DRenderer) throw new Error('Renderer 3D belum siap. Kembali ke menu lalu coba lagi.');
        scene3d = new Kampung3DRenderer(field, fieldBackground!);
      } catch (error) {
        paused = true;
        setRendererError(error instanceof Error ? error.message : 'Renderer 3D gagal dimulai.');
      }
    }
    const fieldWaterMask = field.waterMask
      ? getFieldImage(field.waterMask)
      : null;

    const waterMaskCanvas = document.createElement('canvas');
    waterMaskCanvas.width = field.waterMaskWidth ?? 1;
    waterMaskCanvas.height = field.waterMaskHeight ?? 1;
    const waterMaskContext = waterMaskCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    const waterDebugCanvas = development && isKanalField(field.id)
      ? document.createElement('canvas')
      : null;
    if (waterDebugCanvas) {
      waterDebugCanvas.width = waterMaskCanvas.width;
      waterDebugCanvas.height = waterMaskCanvas.height;
    }
    const waterDebugContext = waterDebugCanvas?.getContext('2d');




    let waterMaskPixels: Uint8ClampedArray | null = null;

    const kanalWaterGlints: { x: number; y: number; phase: number }[] = [];
    const cacheWaterMask = () => {
      const result = extractWaterMask({
        image: fieldWaterMask,
        context: waterMaskContext,
        canvas: waterMaskCanvas,
        debugContext: waterDebugContext,
        worldWidth,
        worldHeight,
        kanal: isKanalField(field.id),
      });
      if (!result) return;
      waterMaskPixels = result.pixels;
      kanalWaterGlints.length = 0;
      kanalWaterGlints.push(...result.glints);
    };

    const { drawFieldAsset, drawAnimatedAsset } = createFieldAssetDraw({
      kanal: isKanalField(field.id),
      objectAssets: FIELD_OBJECT_ATLAS.assets,
      animations: FIELD_ANIMATED_ATLAS.animations,
      baseAtlas: fieldObjectAtlas,
      kanalAtlas: kanalObjectAtlas,
      animatedAtlas: fieldAnimatedAtlas,
    });
    const groundTileCanvas = createGroundTileCanvas(fieldGroundAtlas, FIELD_GROUND_ATLAS.tiles);
    const staticMapLayer = createStaticMapLayer({
      getContext: () => ctx,
      field,
      fieldBackground,
      studioMap: studioMap ?? null,
      kanal: isKanalField(field.id),
      worldWidth,
      worldHeight,
      bases,
      fortWidth,
      fortHeight,
      fortAnchorY,
      groundTile: groundTileCanvas,
      drawFieldAsset,
      drawMapTerrain,
    });
    const invalidateStaticMap = staticMapLayer.invalidate;
    fieldObjectAtlas.addEventListener('load', invalidateStaticMap);
    kanalObjectAtlas?.addEventListener('load', invalidateStaticMap);
    fieldGroundAtlas.addEventListener('load', invalidateStaticMap);
    fieldBackground?.addEventListener('load', invalidateStaticMap);

    fieldWaterMask?.addEventListener('load', cacheWaterMask);

    if (fieldWaterMask?.complete) cacheWaterMask();


    const matchAudio = createMatchAudio();
    let lastFootstep = 0;
    let wasDashing = false;
    let wasInEnemyFort = false;
    let previousSoundPosition: { x: number; y: number } | null = null;
    let players: Player[] = makePlayers({ faction: selectedFaction, selectedId, bases });
    let roundStats = createStatsStore(players.map((player) => player.id));
    let matchStats = createStatsStore(players.map((player) => player.id));
    const buildStatsBoard = (now: number): StatsBoard =>
      buildStatsBoardOf(now, {
        phase,
        round,
        roundWinner,
        roundEndReason,
        resultAnnouncementUntil,
        phaseUntil,
        matchStartedAt,
        fieldName: field.name,
        score,
        players,
        roundStats,
        matchStats,
        isLeaderboardOpen: () => leaderboardOpenRef.current,
      });
    const log = (text: string) => {
      logs = pushLog(logs, text);
    };
    const burst = (x: number, y: number, color: string, count = 12) => {
      particles.push(...burstParticles(x, y, color, count));
    };
    ({ refills, nextId: refillId } = seedRefills(spawnGeo(worldWidth, obstacles, studioMap ?? null)));
    const resetRound = createResetRound({
      clearMouse,
      getBases: () => bases,
      getSelectedFaction: () => selectedFaction,
      getSelectedId: () => selectedId,
      getWorldWidth: () => worldWidth,
      getObstacles: () => obstacles,
      getStudioMap: () => studioMap ?? null,
      getRound: () => round,
      setPlayers: (value) => { players = value as Player[]; },
      getPlayers: () => players,
      setRoundStats: (value) => { roundStats = value; },
      getMatchStats: () => matchStats,
      setMatchEvents: (value) => { matchEvents = value; },
      setRescueRequest: (value) => { rescueRequest = value; },
      setRescueRequestCooldownUntil: (value) => { rescueRequestCooldownUntil = value; },
      setRefills: (value) => { refills = value; },
      setRefillId: (value) => { refillId = value; },
      setTimer: (value) => { timer = value; },
      setExitCounter: (value) => { exitCounter = value; },
      setTotalCapture: (value) => { totalCapture = value; },
      setSuddenDeath: (value) => { suddenDeath = value; },
      setRoundWinner: (value) => { roundWinner = value; },
      setRoundEndReason: (value) => { roundEndReason = value; },
      setResultWinner: (value) => { resultWinner = value; },
      setResultAnnouncementUntil: (value) => { resultAnnouncementUntil = value; },
      setUltimateImpactAt: (value) => { ultimateImpactAt = value; },
      setUltimateBuffUntil: (value) => { ultimateBuffUntil = value; },
      setUltimateShieldUntil: (value) => { ultimateShieldUntil = value; },
      setUltimateImpactApplied: (value) => { ultimateImpactApplied = value; },
      setUltimateBannerVisible,
      setTeamCombos: (value) => { teamCombos = value; },
      setComboCallout: (value) => { comboCallout = value; },
      setComboCalloutUntil: (value) => { comboCalloutUntil = value; },
      setPhase: (value) => { phase = value as typeof phase; },
      setPhaseUntil: (value) => { phaseUntil = value; },
      setAnnouncement: (value) => { announcement = value; },
      log,
      now: () => performance.now(),
    });
    const winRound = createWinRound({
      getPhase: () => phase,
      playFortCaptured: (team, volume) => matchAudio.play('fort-captured', volume),
      getPlayers: () => players,
      score,
      setRoundWinner: (value) => { roundWinner = value; },
      setRoundEndReason: (value) => { roundEndReason = value; },
      setPhase: (value) => { phase = value as typeof phase; },
      setMatchEvents: (value) => { matchEvents = value; },
      setResultWinner: (value) => { resultWinner = value; },
      setResultAnnouncementUntil: (value) => { resultAnnouncementUntil = value; },
      getPendingProfile: () => pendingProfileStatsRef.current,
      setPendingProfile: (value) => { pendingProfileStatsRef.current = value as never; },
      getCompletedMatches: () => completedMatchesRef.current,
      setCompletedMatches: (value) => { completedMatchesRef.current = value; },
      getFieldRotationPending: () => fieldRotationPending,
      setFieldRotationPending: (value) => { fieldRotationPending = value; },
      playAudioCue,
      setPhaseUntil: (value) => { phaseUntil = value; },
      setAnnouncement: (value) => { announcement = value; },
      playTone,
      burst: (x, y, color, count) => burst(x, y, color, count),
      getWorldWidth: () => worldWidth,
      getWorldHeight: () => worldHeight,
      log,
      now: () => performance.now(),
      emptyKda: EMPTY_KDA,
    });
    const solidObstacles = [
      ...obstacles,
      ...kanalPrisonWalls(field.prisons, isKanalField(field.id)),
    ];
    const kanalFortPolygons = isKanalField(field.id)
      ? Object.values(bases).map(base => kanalFortPolygon(base, fortWidth, fortHeight, fortAnchorY))
      : [];
    const kanalFortRects = kanalFortPolygons.flatMap(polygon => polygonToRects(polygon));



    const obstacleWorld = {
      studioMap: studioMap ?? null,
      rects: solidObstacles,
      radius: PLAYER_COLLISION_RADIUS,
    };
    const hitsObstacle = (x: number, y: number) => hitsObstacleAt(x, y, obstacleWorld);
    // The fort core is solid while its capture circle remains walkable. This
    // prevents walking through the tower but preserves the original base
    // entry, capture, and return rules.
    const fortCoreWorld = {
      kanal: isKanalField(field.id),
      fortRects: kanalFortRects,
      bases,
      radius: PLAYER_COLLISION_RADIUS,
      minCore: 48,
      fortWidth,
    };
    const isInsideFortCore = (x: number, y: number) => isInsideFortCoreAt(x, y, fortCoreWorld);
    const isWaterAt = createWaterAt({
      studioMap: studioMap ?? null,
      pixels: () => waterMaskPixels,
      canvas: waterMaskCanvas,
      worldWidth,
      worldHeight,
    });
    const beginKanal2WaterFall = (p: Player, now: number, x: number, y: number) =>
      beginKanal2WaterFallAt(p, now, x, y, {
        kanal: field.id === 'kanal2',
        radius: PLAYER_COLLISION_RADIUS,
        isWaterAt,
        onBurst: (bx, by, color, count) => burst(bx, by, color, count),
        onClearMouse: () => clearMouse(),
        onAudio: (name, volume) => matchAudio.play(name, volume),
        onLog: (text) => log(text),
      });
    const collisionWorld = {
      kanal: isKanalField(field.id),
      collides: (x: number, y: number) => hitsObstacle(x, y),
      pushOut: (x: number, y: number) =>
        depenetrateFromRects({ x, y }, solidObstacles, PLAYER_COLLISION_RADIUS, {
          minX: 34, maxX: worldWidth - 34, minY: 58, maxY: worldHeight - 32,
        }),
    };
    // The canal's actual water mask is the collision source for its stone
    // banks. This blocks the visible canal instead of inventing rectangles
    // on clear ground, and bridges remain open because they are not water.
    const blockedWorld = {
      kanal: isKanalField(field.id),
      studioSolidAt: (x: number, y: number, jumping: boolean) =>
        studioMap ? studioSolidAt(studioMap, x, y, PLAYER_COLLISION_RADIUS, jumping) : false,
      waterBlocksAt: (x: number, y: number) => kanalWaterBlocks(x, y, isWaterAt, PLAYER_COLLISION_RADIUS),
      fortCoreAt: (x: number, y: number) => isInsideFortCore(x, y),
      obstacleAt: (x: number, y: number) => hitsObstacle(x, y),
      waterAt: (x: number, y: number) => isWaterAt(x, y),
      chargeTimeOf: (characterId: string) => CHARACTER_BY_ID[characterId as CharacterId].baseChargeTime,
      bases,
      baseRadius,
      occupantAt: (team: Team, exceptId: string) =>
        Boolean(fortOccupant(players, bases, baseRadius, isKanalField(field.id), team, exceptId)),
    };
    const blocked = (
      x: number,
      y: number,
      p: Player,
      now: number,
    ) => isBlockedAt(x, y, p, now, blockedWorld);
    const move = (
      p: Player,
      dx: number,
      dy: number,
      speed: number,
      dt: number,
      now: number,
    ) =>
      movePlayerAt(p, dx, dy, speed, dt, now, {
        kanalSwim: field.id === 'kanal2' && Boolean(p.waterEnteredAt),
        speedAt: (x, y, s) => (studioMap ? s * studioSpeedAt(studioMap, x, y) : s),
        bounds: { minX: 34, maxX: worldWidth - 34, minY: 58, maxY: worldHeight - 32 },
        isBlocked: (x, y, t) => blocked(x, y, p, t),
        onWaterFall: (x, y, t) => beginKanal2WaterFall(p, t, x, y),
      });
    const resolvePlayerSpacing = (now: number) =>
      resolvePlayerSpacingAt(now, {
        players,
        kanal: field.id === 'kanal2',
        round,
        worldWidth,
        worldHeight,
        waterBlocksAt: (x, y) => kanalWaterBlocks(x, y, isWaterAt, PLAYER_COLLISION_RADIUS),
        waterAt: (x, y) => isWaterAt(x, y),
        fortCoreAt: (x, y) => isInsideFortCore(x, y),
        obstacleAt: (x, y) => hitsObstacle(x, y),
        bases,
        baseRadius,
        onRecover: (p, t) => recoverFromObstacle(p as Player, t, collisionWorld),
      });
    const baseVector = (p: Player) => baseVectorAt(p, bases);
    const studioRoutes = new Map<string,{target:{x:number;y:number};route:Array<{x:number;y:number}>;until:number}>();
    const navigateAroundHazards = (
      p: Player,
      desired: { x: number; y: number },
      now: number,
      probeDistance: number,
      turnBias: number,
    ) =>
      navigateAroundHazardsForPlayer(
        { id: p.id, x: p.x, y: p.y, team: p.team, characterId: p.characterId, baseCharge: p.baseCharge, parkourUntil: p.parkourUntil, state: p.state },
        desired,
        now,
        probeDistance,
        turnBias,
        {
          studioMap,
          worldWidth,
          worldHeight,
          radius: PLAYER_COLLISION_RADIUS,
          isBlocked: (x, y, pl, t) => blocked(x, y, pl as Player, t),
          isWaterAt,
          rects: obstacles,
          cache: studioRoutes,
        },
      );
    const findParkourLanding = (
      p: Player,
      direction: { x: number; y: number },
      nominalDistance: number,
      now: number,
    ) =>
      findParkourLandingAt({ x: p.x, y: p.y }, direction, nominalDistance, {
        isWaterAt: (x, y) => isWaterAt(x, y),
        isBlocked: (x, y) => blocked(x, y, p, now),
        worldWidth,
        worldHeight,
      });
    const riverFallCheck = (now: number) =>
      riverFallCheckAt(now, {
        players,
        waterSource:
          Boolean(studioMap) || Boolean(field.waterMask && waterMaskPixels),
        kanal: field.id === 'kanal2',
        round,
        bases,
        isWaterAt,
        onWaterFall: (p, fallNow, x, y) =>
          beginKanal2WaterFall(p as Player, fallNow, x, y),
        fx: {
          onBurst: (x, y, color, count) => burst(x, y, color, count),
          onTone: (frequency, duration) => playTone(frequency, duration),
          onLog: (text) => log(text),
        },
      });
    const registerTeamAction = (
      actor: Player,
      actionLabel: 'TAG' | 'RESCUE',
      x: number,
      y: number,
      now: number,
    ) => {
      teamCombos[actor.team] = registerTeamActionAt(
        { id: actor.id, team: actor.team, name: actor.name },
        actionLabel,
        x,
        y,
        now,
        {
          comboState: teamCombos[actor.team],
          playerTeam: players[0].team,
          players,
          onComboCallout: (text, until) => {
            comboCallout = text;
            comboCalloutUntil = until;
          },
          onPlayerBoost: (teammates, fraction) => {
            teammates.forEach((p) => {
              const maximum = CHARACTER_BY_ID[p.characterId].boost;
              p.boost = Math.min(maximum, p.boost + maximum * fraction);
            });
          },
          onBurst: (bx, by, color, count) => burst(bx, by, color, count),
          onTone: (frequency, duration) => playTone(frequency, duration),
          onLog: (text) => log(text),
          onMissionCombo: () => {
            mission.combo = true;
          },
        },
      );
    };
    const capture = (winner: Player, loser: Player, now: number) =>
      captureAt(winner, loser, now, {
        suddenDeath,
        loserAudible: distance(players[0], loser) < 300,
        onStat: (p, key) => addStat({ round: roundStats, match: matchStats }, p, key),
        onProfileStat: (key) => {
          if (key === 'tagMusuh') pendingProfileStatsRef.current.tagMusuh++;
          else pendingProfileStatsRef.current.masukPenjara++;
        },
        onMatchEvent: (event) => {
          const next = pushMatchEvent({ events: matchEvents, nextId: matchEventId }, event, now);
          matchEvents = next.events;
          matchEventId = next.nextId;
        },
        onBurst: (x, y, color) => burst(x, y, color),
        onAudio: (name, volume) => matchAudio.play(name, volume),
        onLog: (text) => log(text),
        onTeamAction: (x, y) => registerTeamAction(winner, 'TAG', x, y, now),
        onChargeUltimate: (controlled, characterId, amount) => {
          ultimateMeter = chargeUltimateMeter(ultimateMeter, controlled, characterId, amount);
        },
        onMissionTag: () => {
          mission.tag = true;
        },
        onLayoutPrisons: () => layoutPrisons(field.prisons, players, isKanalField(field.id)),
        onWinRound: (team, reason) => winRound(team, reason),
      });
    const tagCheck = (now: number) =>
      tagCheckAt(now, {
        players,
        kanal: field.id === 'kanal2',
        lineOfSight: (a, b) => hasLineOfSight(a, b, solidObstacles, studioMap ?? null),
        onCapture: (attacker, target) =>
          capture(attacker as Player, target as Player, now),
      });
    const rescueCheck = (now: number) =>
      rescueCheckAt(now, {
        players,
        kanal: field.id === 'kanal2',
        rescueRequest,
        audible: (rescuer) => distance(players[0], rescuer) < 300,
        onStat: (p, key) => addStat({ round: roundStats, match: matchStats }, p, key),
        onProfileStat: () => {
          pendingProfileStatsRef.current.rescueTeam++;
        },
        onClearRescueRequest: () => {
          rescueRequest = null;
        },
        onMatchEvent: (event) => {
          const next = pushMatchEvent({ events: matchEvents, nextId: matchEventId }, event, now);
          matchEvents = next.events;
          matchEventId = next.nextId;
        },
        onBurst: (x, y, color, count) => burst(x, y, color, count),
        onAudio: (name, volume) => matchAudio.play(name, volume),
        onLog: (text) => log(text),
        onTeamAction: (rescuer, x, y) =>
          registerTeamAction(rescuer as Player, 'RESCUE', x, y, now),
        onChargeUltimate: (controlled, characterId, amount) => {
          ultimateMeter = chargeUltimateMeter(ultimateMeter, controlled, characterId, amount);
        },
        onMissionRescue: () => {
          mission.rescue = true;
        },
      });
    const refillCheck = () =>
      refillCheckAt({
        players,
        refills,
        kanal: field.id === 'kanal2',
        onRefills: (next) => {
          refills = next;
        },
        onBurst: (x, y, color, count) => burst(x, y, color, count),
        onTone: (frequency, duration) => playTone(frequency, duration),
        onLog: (text) => log(text),
        onMissionBoost: () => {
          mission.boost = true;
        },
      });
    const baseCheck = (
      p: Player,
      dt: number,
      now: number,
      exitCandidates: Player[],
    ) =>
      baseCheckAt(p, dt, now, {
        players,
        bases,
        baseRadius,
        kanal: field.id === 'kanal2',
        round,
        onExitCandidate: (q) => exitCandidates.push(q as Player),
        onLog: (text) => log(text),
        onTone: (frequency, duration) => playTone(frequency, duration),
        onWinRound: (team, reason) => winRound(team, reason),
      });
    const update = (dt: number, now: number) => {
      const pause = stepPauseGate(keys.current, paused, mode, clearMouse);
      paused = pause.paused;
      if (pause.halted) return;
      if (phase !== 'PLAYING') clearMouse();
      if (phase === 'COUNTDOWN') {
        announcement = `${Math.max(1, Math.ceil((phaseUntil - now) / 1000))}`;
        if (now >= phaseUntil) {
          phase = 'PLAYING';
          if (round === 1 && score.blue === 0 && score.red === 0)
            matchStartedAt = now;
          announcement = 'MULAI!';
          setTimeout(() => {
            if (phase === 'PLAYING') announcement = '';
          }, 800);
        }
        return;
      }
      if (
        phase === 'ROUND_OVER' &&
        (now >= phaseUntil || postRoundActionRef.current === 'next-round')
      ) {
        postRoundActionRef.current = null;
        round++;
        resetRound();
        return;
      }
      if (phase === 'MATCH_OVER') {
        return;
      }
      rescueRequest = expireRescueRequest(rescueRequest, players, now);
      if (keys.current.has('r')) {
        keys.current.delete('r');
        const rescueEffects = requestRescue(players, rescueRequest, rescueRequestCooldownUntil, { bases, baseRadius }, now);
        rescueRequest = rescueEffects.request;
        rescueRequestCooldownUntil = rescueEffects.cooldownUntil;
        if (rescueEffects.event) {
          const next = pushMatchEvent({ events: matchEvents, nextId: matchEventId }, rescueEffects.event, now);
          matchEvents = next.events;
          matchEventId = next.nextId;
        }
        for (const sound of rescueEffects.sounds) matchAudio.play(sound.name, sound.volume);
        for (const effect of rescueEffects.bursts) burst(effect.x, effect.y, effect.color, effect.count);
        for (const line of rescueEffects.logs) log(line);
      }
      ({ timer, suddenDeath, announcement } = stepSuddenDeath(
        players,
        { timer, suddenDeath, announcement },
        dt,
        { onWinRound: winRound, onLog: log, onTone: playTone },
      ));
      ({
        refills,
        nextId: refillId,
        nextSpawn: nextRefillSpawn,
      } = tickRefills(refills, refillId, nextRefillSpawn, spawnGeo(worldWidth, obstacles, studioMap ?? null), now));
      players.forEach((player) => recoverFromObstacle(player, now, collisionWorld));
      players.forEach((player) => {
        player.lastX = player.x;
        player.lastY = player.y;
      });
      const me = players[0];
      let dx = 0,
        dy = 0;
      ultimateMeter = tickUltimateMeter(
        ultimateMeter,
        ULTIMATE_CHARACTER_IDS.has(me.characterId),
        dt,
        RAJA_ULTIMATE_RECHARGE_SECONDS,
      );
      if (keys.current.has('capslock')) {
        keys.current.delete('capslock');
        const cast = beginUltimateCast(
          me,
          ultimateMeter,
          now,
          RAJA_ULTIMATE_CAST_MS,
          {
            isKanal: isKanalField(field.id),
            onBanner: (durationMs) => {
              setUltimateBannerVisible(true);
              window.clearTimeout(bannerTimeout);
              bannerTimeout = window.setTimeout(
                () => setUltimateBannerVisible(false),
                durationMs,
              );
            },
            onBurst: (x, y, color, count) => burst(x, y, color, count),
            onTone: (frequency, duration) => playTone(frequency, duration),
            onLog: (text) => log(text),
          },
        );
        if (cast) {
          ultimateMeter = cast.meter;
          ultimateImpactAt = cast.ultimateImpactAt;
          ultimateImpactApplied = cast.ultimateImpactApplied;
          boostBurstUntil = cast.boostBurstUntil;
        }
      }
      const ultimateCasting =
        ULTIMATE_CHARACTER_IDS.has(me.characterId) &&
        me.action === 'ultimate' &&
        now < me.actionUntil;
      ({
        ultimateImpactAt,
        ultimateImpactApplied,
        ultimateShieldUntil,
        ultimateBuffUntil,
      } = applyUltimateImpact(
        me,
        players,
        { ultimateImpactAt, ultimateImpactApplied, ultimateShieldUntil, ultimateBuffUntil },
        now,
        {
          shieldMs: KAKA_ULTIMATE_SHIELD_MS,
          buffMs: RAJA_ULTIMATE_BUFF_MS,
          onBurst: (x, y, color, count) => burst(x, y, color, count),
          onTone: (frequency, duration) => playTone(frequency, duration),
          onLog: (text) => log(text),
        },
      ));
      const rajaUltimateMultiplier = (player: Player) =>
        rajaUltimateMultiplierAt(player.team, player.state, me.team, now, ultimateBuffUntil);
      const playerComboMultiplier = teamComboSpeedMultiplier(
        teamCombos[me.team],
        now,
      );
      if (ultimateCasting) {
        const castFreeze = freezeDuringUltimateCast(players, keys.current, ultimateCasting, clearMouse);
        if (castFreeze) {
          boostLatch = castFreeze.boostLatch;
          parkourLatch = castFreeze.parkourLatch;
          return;
        }
      }
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx--;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx++;
      if (keys.current.has('w') || keys.current.has('arrowup')) dy--;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dy++;
      if (!['ACTIVE', 'IN_BASE'].includes(me.state)) clearMouse();
      if (dx || dy) { mouseRoute = []; mouseStuckTime = 0; }
      let mouseDistance = Infinity;
      if (mouseRoute.length) {
        while (mouseRoute.length && distance(me, mouseRoute[0]) <= 5) mouseRoute.shift();
        const waypoint = mouseRoute[0];
        if (waypoint) {
          dx = waypoint.x - me.x; dy = waypoint.y - me.y;
          mouseDistance = Math.hypot(dx, dy);
        }
      }
      const boostKey = keys.current.has(' ') || mouseBoost;
      const boostTick = stepBoost(me, {
        now,
        dx,
        dy,
        isKanal: isKanalField(field.id),
        boostKey,
        boostLatch,
        mouseBoost,
        boostBurstUntil,
        boostDrain: selected.boostDrain,
        comboBoosted: playerComboMultiplier > 1,
        dt,
        onMissionBoost: () => { mission.boost = true; },
      });
      boostBurstUntil = boostTick.boostBurstUntil;
      boostLatch = boostTick.boostLatch;
      mouseBoost = boostTick.mouseBoost;
      const boosting = boostTick.boosting;
      const parkourKey = keys.current.has('shift');
      tryParkourJump(me, dx, dy, now, {
        parkourKey,
        parkourLatch,
        agility: selected.agility,
        isKanal: isKanalField(field.id),
        obstacles,
        hasWater: Boolean(field.waterMask || studioMap),
        waterAt: (x, y) => isWaterAt(x, y),
        studioMap: studioMap ?? null,
        findLanding: (direction, distance) => findParkourLanding(me, direction, distance, now),
        onMissionParkour: () => { mission.parkour = true; },
        onBurst: (x, y, color, count) => burst(x, y, color, count),
        onTone: (frequency) => playTone(frequency),
      });
      parkourLatch = parkourKey;
      const mouseBefore = { x: me.x, y: me.y };
      if (me.state === 'RETURNING') {
        const vector = navigateAroundHazards(
          me,
          baseVector(me),
          now,
          104,
          Math.sin(me.aiSeed + now / 1700),
        );
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
          Math.min(mouseDistance / Math.max(dt, .001), selected.speed *
            playerComboMultiplier *
            rajaUltimateMultiplier(me) *
            (boosting ? selected.boostMultiplier : 1)),
          dt,
          now,
        );
      else {
        me.vx = 0;
        me.vy = 0;
      }
      mouseStuckTime = stepMouseStuckTimeout(
        mouseRoute.length > 0,
        me,
        mouseBefore,
        mouseStuckTime,
        dt,
        clearMouse,
      );
      stepBots(me, now, dt, {
        players,
        rescueRequest,
        refills,
        bases,
        worldWidth,
        worldHeight,
        aiProfile,
        isKanal: isKanalField(field.id),
        teamCombos,
        speedMultiplier: AI_SPEED_MULTIPLIER,
        boostThreshold: AI_BOOST_THRESHOLD,
        boostDrainMultiplier: AI_BOOST_DRAIN_MULTIPLIER,
        move: (p, x, y, speed, stepDt, stepNow) => move(p as Player, x, y, speed, stepDt, stepNow),
        navigate: (p, desired, stepNow, steerDistance, turnBias) =>
          navigateAroundHazards(p as Player, desired, stepNow, steerDistance, turnBias),
        rajaMultiplier: (p) => rajaUltimateMultiplier(p as Player),
      });
      resolvePlayerSpacing(now);
      riverFallCheck(now);
      // Only actual grounded movement produces footsteps (not pressing into a wall).
      ({
        previousSoundPosition,
        lastFootstep,
        wasDashing,
        wasInEnemyFort,
      } = stepMovementAudio(
        me,
        { previousSoundPosition, lastFootstep, wasDashing, wasInEnemyFort },
        now,
        boosting,
        {
          enemyBase: bases[other(me.team)],
          baseRadius,
          onStep: (volume) => matchAudio.play('step', volume),
          onDash: () => matchAudio.play('dash'),
          onPrison: () => matchAudio.play('prison'),
          onFortEnter: () => matchAudio.play('fort-enter'),
        },
      ));
      const exitCandidates: Player[] = [];
      players.forEach((p) => baseCheck(p, dt, now, exitCandidates));
      applyExitOrder(exitCandidates, now, {
        round,
        nextExitOrder: () => ++exitCounter,
        onMissionRefresh: () => {
          mission.refresh = true;
        },
        onLog: (text) => log(text),
        onTone: (frequency) => playTone(frequency),
      });
      refillCheck();
      tagCheck(now);
      rescueCheck(now);
      layoutPrisons(field.prisons, players, isKanalField(field.id));
      updateCaptureHold(totalCapture, players, dt, (team, reason) =>
        winRound(team, reason),
      );
      particles = stepParticles(particles, dt);
    };

    const drawNearbyFieldDetails = createDrawNearbyFieldDetails({
      ctx,
      field,
      studioMap: studioMap ?? null,
      drawMapObject,
      isPlaying: () => mode === 'playing',
      kanal: isKanalField(field.id),
      bases,
      fortWidth,
      fortHeight,
      fortAnchorY,
      drawFieldAsset,
    });
    const drawFieldAnimations = createDrawFieldAnimations(ctx, drawAnimatedAsset, field.animated);
    const drawKanalWater = createDrawKanalWater({
      ctx,
      kanal: isKanalField(field.id),
      waterMaskPixels: () => waterMaskPixels,
      glints: kanalWaterGlints,
      worldWidth,
      worldHeight,
      field,
      isWaterAt,
    });
    const drawColliderDebug = createColliderDebugDraw({
      enabled: () => debugColliders,
      kanal: isKanalField(field.id),
      waterMaskPixels: () => waterMaskPixels,
      waterMaskCanvas,
      worldWidth,
      worldHeight,
      obstacles: solidObstacles,
      fortRects: kanalFortRects,
      ctx,
    });
    const drawRefill = createDrawRefill(ctx, drawAnimatedAsset);
    const drawPlayer = createDrawPlayer({
      getContext: () => ctx,
      kanal: field.id === 'kanal2',
      isWaterAt,
      getPhase: () => phase,
      getRoundWinner: () => roundWinner,
      getTeamCombos: () => teamCombos,
      getUltimateBuffUntil: () => ultimateBuffUntil,
      getUltimateMeter: () => ultimateMeter,
      rajaCastMs: RAJA_ULTIMATE_CAST_MS,
      kakaCastMs: KAKA_ULTIMATE_CAST_MS,
      kakaFrames: KAKA_ULTIMATE_FRAME_COUNT,
      getSpriteImage,
      getSeriesImage,
      getSprintDustImage,
      getKakaUltimateImage,
      studioResolve: createStudioResolver(),
    });

    const draw = (now: number) => {
      const me = players[0];
      const activeCamera = cameraModeRef.current;
      const { cw, ch, scale, camX, camY } = computeFrameView({
        canvas,
        ctx,
        mode,
        activeCamera,
        me,
        worldWidth,
        worldHeight,
        kanal: isKanalField(field.id),
        setView: (v) => {
          view = v;
        },
      });
      if (scene3d) {
        try {
          for (const p of players) scene3d.updateActor(p.id, p.x, p.y, target => {
            const previous = ctx;
            try { ctx = target; drawPlayer(p, me, now); } finally { ctx = previous; }
          });
          ctx.drawImage(scene3d.render(cw, ch, scale, camX, camY, now), 0, 0, cw, ch);
        } catch (error) {
          paused = true;
          setRendererError(error instanceof Error ? error.message : 'Grafis 3D terhenti. Kembali ke menu untuk mencoba lagi.');
          scene3d.dispose(); scene3d = undefined;
        }
      }
      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(scale, scale);
      ctx.translate(-camX, -camY);
      if (selectedFieldId !== 'kampung3d' || mode !== 'playing') {
        staticMapLayer.drawMap();
        drawKanalWater(now);
        drawNearbyFieldDetails(me, activeCamera);
      }
      drawBase(ctx, bases.blue, baseRadius, isKanalField(field.id), 'blue', TEAM_COLOR.blue, fortOccupant(players, bases, baseRadius, isKanalField(field.id), 'blue')?.name);
      drawBase(ctx, bases.red, baseRadius, isKanalField(field.id), 'red', TEAM_COLOR.red, fortOccupant(players, bases, baseRadius, isKanalField(field.id), 'red')?.name);
      drawRouteTargetAt(ctx, mouseRoute, scale);
      drawColliderDebug();
      if (mode === 'playing') {
        drawFieldAnimations(now);
        refills.forEach((item) => drawRefill(item, now));
        if (!scene3d && studioMap) {
          const entries = [
            ...players.map(p=>({y:p.y,z:0,draw:()=>drawPlayer(p,me,now)})),
            ...studioMap.objects.filter(o=>o.layer==='world').map(o=>({y:o.y+o.h,z:o.z,draw:()=>drawMapObject(ctx,o,now)})),
          ];
          entries.sort((a,b)=>a.z-b.z||a.y-b.y).forEach(item=>item.draw());
        }
        if (!scene3d && !studioMap) players
          .slice()
          .sort((a, b) => a.y - b.y)
          .forEach((p) => drawPlayer(p, me, now));
        if (selectedFieldId !== 'kampung3d')
          drawPrisonOverlaysAt(ctx, field.prisons, drawFieldAsset, field.structuresInBackground);
        if (studioMap) studioMap.objects.filter(o=>o.layer==='foreground').sort((a,b)=>a.z-b.z).forEach(o=>drawMapObject(ctx,o,now));
        drawRescueBubbleAt(ctx, players, rescueRequest?.requesterId, now);
        drawParticlesAt(ctx, particles);
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
        const activeRequest = rescueRequest
          ? players.find((player) => player.id === rescueRequest?.requesterId)
          : undefined;
        if (activeRequest?.state === 'PRISONER')
          marker(activeRequest, '!', '#f5cf45');
      }
      drawPhaseOverlayAt(ctx, cw, ch, phase, announcement);
    };
    const writeSnapshot = createSnapshotWriter({
      canvas,
      getLastHud: () => lastHud,
      setLastHud: (value: number) => { lastHud = value; },
      getPlayers: () => players,
      bases,
      baseRadius,
      getFieldId: () => field.id,
      hitsObstacle,
      fortOccupant,
      getTeamCombos: () => teamCombos,
      teamComboSeconds,
      getScore: () => score,
      getRound: () => round,
      getTimer: () => timer,
      getLogs: () => logs,
      getMission: () => mission,
      getSelected: () => selected,
      getCharacterBoost: (id: CharacterId) => CHARACTER_BY_ID[id].boost,
      getUltimateMeter: () => ultimateMeter,
      getUltimateShieldUntil: () => ultimateShieldUntil,
      getUltimateBuffUntil: () => ultimateBuffUntil,
      getUltimateKind: (id: CharacterId) => CHARACTER_BY_ID[id]?.ultimate?.kind,
      getMatchEvents: () => matchEvents,
      getRescueRequest: () => rescueRequest,
      getRescueRequestCooldownUntil: () => rescueRequestCooldownUntil,
      getResultWinner: () => resultWinner,
      getResultAnnouncementUntil: () => resultAnnouncementUntil,
      getPhase: () => phase,
      getRoundEndReason: () => roundEndReason,
      getPhaseUntil: () => phaseUntil,
      getMatchStartedAt: () => matchStartedAt,
      getFieldName: () => field.name,
      getCompletedMatches: () => completedMatchesRef.current,
      getComboCallout: () => comboCallout,
      getComboCalloutUntil: () => comboCalloutUntil,
      isLeaderboardOpen: () => leaderboardOpenRef.current,
      buildStatsBoard,
      getRefills: () => refills,
      getPaused: () => paused,
      getSuddenDeath: () => suddenDeath,
      setSnapshot: (updater: (prev: Snapshot) => Snapshot) => setSnapshot((prev) => updater(prev)),
      getSnapshot: () => snapshot,
    });
    const stopLoop = startMatchLoop({
      tick: (dt, now) => update(dt, now),
      render: (now) => draw(now),
      commit: (now) => writeSnapshot(now),
    });
    const pointerDown = (event: PointerEvent) =>
      handlePointerDown(event, {
        canvas,
        getView: () => view,
        getPlayers: () => players,
        getMode: () => mode,
        getPhase: () => phase,
        getPaused: () => paused,
        getFieldId: () => field.id,
        isBlocked: (x, y, p, now) => blocked(x, y, p as Player, now),
        isWaterAt,
        worldWidth,
        worldHeight,
        clearMouse,
        log,
        setMouseRoute: (route) => { mouseRoute = route; },
        setMouseBoost: () => { mouseBoost = true; },
        now: () => performance.now(),
      });
    const contextMenu = (event: MouseEvent) => handleContextMenuAt(event, mode);
    const stopForMenu = (event: PointerEvent) => handleStopForMenuAt(event, clearMouse);
    const stopWhenHidden = () => handleStopWhenHiddenAt(document.hidden, clearMouse);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('contextmenu', contextMenu);
    window.addEventListener('blur', clearMouse);
    document.addEventListener('visibilitychange', stopWhenHidden);
    document.addEventListener('pointerdown', stopForMenu);
    let collisionToggle: HTMLButtonElement | null = null;
    const toggleCollision = () => {
      debugColliders = !debugColliders;
      if (collisionToggle) collisionToggle.textContent = `COLLISION ${debugColliders ? 'ON' : 'OFF'} · F8`;
    };
    const collisionKey = (event: KeyboardEvent) => {
      if (event.key === 'F8') { event.preventDefault(); toggleCollision(); }
    };
    const debugHost = window as Window & { __kanalCollision?: unknown };
    if (development && isKanalField(field.id)) {
      collisionToggle = document.createElement('button');
      collisionToggle.type = 'button';
      collisionToggle.textContent = `COLLISION ${debugColliders ? 'ON' : 'OFF'} · F8`;
      collisionToggle.title = 'Development: merah = solid, hijau = terbuka, kuning = batas. F8 untuk toggle.';
      collisionToggle.style.cssText = 'position:absolute;z-index:50;left:12px;top:100px;padding:7px 10px;color:#fff0bb;background:#19241fee;border:1px solid #e5cc7e;border-radius:5px;font:700 10px monospace;cursor:pointer';
      collisionToggle.addEventListener('click', toggleCollision);
      canvas.parentElement?.appendChild(collisionToggle);
      window.addEventListener('keydown', collisionKey);
      // Development probes use a detached player and the actual move/blocked
      // functions. They never change the live actors, timers, or game rules.
      debugHost.__kanalCollision = {
        geometry: () => ({
          width: worldWidth, height: worldHeight, radius: PLAYER_COLLISION_RADIUS,
          props: visualObstacles.map((item, index) => ({ id: `${item.asset}-${index}`, polygons: kanalObjectPolygons(item) })),
          rects: solidObstacles,
          forts: kanalFortPolygons,
          prisons: field.prisons,
          prisonWalls: kanalPrisonWalls,
          bridges: field.decorations.filter(item => item.asset === 'kanalNusaBridgeH'),
          waterReady: Boolean(waterMaskPixels),
        }),
        blocked: (x: number, y: number) => hitsObstacle(x,y) || isInsideFortCore(x,y) || kanalWaterBlocks(x, y, isWaterAt, PLAYER_COLLISION_RADIUS),
        water: isWaterAt,
        probe: (from: {x:number;y:number}, to: {x:number;y:number}, team: Team = players[0].team) => {
          const probe: Player = { ...players[0], ...from, team, id: '__collision_probe__', state: 'ACTIVE', parkourUntil: 0, baseCharge: 1e6 };
          const trace = [{ x: probe.x, y: probe.y }];
          const steps = Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/2)+12;
          for (let i=0;i<steps;i++) {
            const dx=to.x-probe.x, dy=to.y-probe.y;
            if (Math.hypot(dx,dy)<1.9) break;
            move(probe,dx,dy,120,1/60,performance.now());
            trace.push({x:probe.x,y:probe.y});
          }
          return trace;
        },
        toggle: toggleCollision,
      };
    }
    return () => {
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('contextmenu', contextMenu);
      window.removeEventListener('blur', clearMouse);
      document.removeEventListener('visibilitychange', stopWhenHidden);
      document.removeEventListener('pointerdown', stopForMenu);
      stopLoop();
      scene3d?.dispose();
      matchAudio.close();
      closeToneAudio();
      window.clearTimeout(bannerTimeout);
      fieldObjectAtlas.removeEventListener('load', invalidateStaticMap);
      kanalObjectAtlas?.removeEventListener('load', invalidateStaticMap);
      fieldGroundAtlas.removeEventListener('load', invalidateStaticMap);
      fieldBackground?.removeEventListener('load', invalidateStaticMap);

      fieldWaterMask?.removeEventListener('load', cacheWaterMask);

      collisionToggle?.remove();
      window.removeEventListener('keydown', collisionKey);
      if (isKanalField(field.id)) delete debugHost.__kanalCollision;
    };
  }, [mode, run, selected, selectedFaction, selectedFieldId, selectedId]);

  const missionCount = useMemo(
    () => Object.values(snapshot.mission).filter(Boolean).length,
    [snapshot.mission],
  );
  const playerMechanicsLocked =
    snapshot.state === 'PRISONER' ||
    snapshot.ultimateCasting ||
    snapshot.paused;
  const start = () => {
    if (!playerProfile || !selectedFaction || assetsLoading) return;
    stopCharacterVoice();
    setRendererError('');
    playAudioCue('press-play.mp3', 0.64);
    completedMatchesRef.current = 0;
    setSnapshot(initialSnapshot);
    setMissionOpen(false);
    setMode('menu');
    setGameLoading(true);
  };
  const quit = () => {
    stopCharacterVoice();
    keys.current.clear();
    setLeaderboardOpen(false);
    postRoundActionRef.current = null;
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
  const applyPendingFieldRotation = () => {
    const decision = pendingFieldRotation(
      completedMatchesRef.current,
      selectedFieldId,
      selectedFieldId === 'kampung3d' ? ['kampung3d'] : FIELD_CONFIGS.filter(item => item.id !== 'kampung3d').map((item) => item.id),
    );
    if (!decision) return;
    completedMatchesRef.current = decision.wins;
    setSelectedFieldId(decision.fieldId as FieldId);
  };
  const rematch = () => {
    keys.current.clear();
    postRoundActionRef.current = null;
    setLeaderboardOpen(false);
    applyPendingFieldRotation();
    setSnapshot(initialSnapshot);
    setMissionOpen(false);
    setRun((v) => v + 1);
  };
  const backToCharacterSelect = () => {
    keys.current.clear();
    postRoundActionRef.current = null;
    setLeaderboardOpen(false);
    applyPendingFieldRotation();
    setSnapshot(initialSnapshot);
    setMode('menu');
    setMenuStep(selectedFaction ? 'character' : 'team');
    if (selectedFaction) playCharacterVoice(selectedId);
    setRulesOpen(false);
    setMissionOpen(false);
    setRun((v) => v + 1);
  };
  const backToFieldSelect = () => {
    keys.current.clear();
    postRoundActionRef.current = null;
    setLeaderboardOpen(false);
    applyPendingFieldRotation();
    setSnapshot(initialSnapshot);
    setMode('menu');
    setMenuStep(selectedFaction ? 'field' : 'team');
    setRulesOpen(false);
    setMissionOpen(false);
    setRun((v) => v + 1);
  };
  const cycleCharacter = (direction: -1 | 1) => {
    if (!selectedFaction) return;
    const nextId = cycleRosterId(FIXED_ROSTERS[selectedFaction], selectedId, direction);
    highlightCharacterWithVoice(nextId);
  };
  const goBack = () => {
    if (rulesOpen) return setRulesOpen(false);
    if (menuStep === 'field') {
      setMenuStep('character');
      playCharacterVoice(selectedId);
      return;
    }
    if (menuStep === 'character') {
      stopCharacterVoice();
      setMenuStep('team');
      return;
    }
    if (menuStep === 'team') return setMenuStep('splash');
  };

  useEffect(() => {
    if (mode !== 'menu' || view !== 'game' || assetsLoading) return;
    const navigate = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!playerProfile) return;
      if (profileOpen) return;
      if (creditsOpen) return;
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
        const firstId = FIXED_ROSTERS[hoveredFaction][0];
        chooseFaction(hoveredFaction);
        setMenuStep('character');
        playCharacterVoice(firstId);
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
        stopCharacterVoice();
        setMenuStep('field');
        return;
      }
      if (
        menuStep === 'field' &&
        (key === 'arrowleft' || key === 'arrowright')
      ) {
        event.preventDefault();
        setSelectedFieldId(
          stepFieldId(
            selectedFieldId,
            key === 'arrowleft' ? -1 : 1,
            FIELD_CONFIGS.map((field) => field.id),
          ),
        );
      }
      if (menuStep === 'field' && key === 'enter') start();
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [
    hoveredFaction,
    assetsLoading,
    menuStep,
    mode,
    rulesOpen,
    creditsOpen,
    selectedFaction,
    selectedFieldId,
    selectedId,
    playerProfile,
    profileOpen,
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
        event.currentTarget.setPointerCapture(event.pointerId);
        touchKey(key, true);
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
    };
  };
  const statsBoard = snapshot.statsBoard;
  const showStatsBoard =
    mode === 'playing' && (leaderboardOpen || statsBoard.visible);
  const closeLeaderboard = () => setLeaderboardOpen(false);
  const requestNextRound = () => {
    postRoundActionRef.current = 'next-round';
    setLeaderboardOpen(false);
  };
  if (assetsLoading) return (
    <AssetLoadingScreen
      selectionLoading={selectionLoading}
      gameLoading={gameLoading}
      faction={selectedFaction ?? 'red'}
      fieldId={selectedFieldId}
      frameSrc={loadingUiFrame(selectedFaction ?? 'red', loadProgress)}
      loadError={loadError}
      loadProgress={loadProgress}
      onRetry={() => setLoadAttempt(v => v + 1)}
      onBack={() => {
        setGameLoading(false);
        setMenuStep('team');
        setLoadError('');
      }}
    />
  );
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
        {playerProfile && menuStep === 'splash' && (
          <ProfileTriggerButton
            onOpen={() => {
              keys.current.clear();
              setProfileOpen(true);
            }}
          />
        )}
        {menuStep === 'splash' && <ArenaBackdrop id={landingArena} video onEnded={nextLandingArena} />}
        {menuStep === 'field' && <ArenaBackdrop id={selectedFieldId} />}
        {menuStep === 'splash' && (
          <SplashScreen
            resolveAsset={uiAsset}
            onEnter={() => {
              playAudioCue('press-play.mp3', 0.64);
              setMenuStep('team');
            }}
          />
        )}

        {menuStep === 'team' && (
          <TeamScreen
            activeFaction={activeFaction}
            logoSrc={publicAsset('brand/benteng-tag-logo.webp?v=9')}
            resolveAsset={uiAsset}
            onHover={(faction) => setHoveredFaction(faction)}
            onPick={(faction) => {
              const firstId = FIXED_ROSTERS[faction][0];
              chooseFaction(faction);
              setMenuStep('character');
              playCharacterVoice(firstId);
            }}
          />
        )}

        {menuStep === 'character' && selectedFaction && (
          <CharacterSelectScreen
            faction={selectedFaction}
            videoSrc={characterSelectionVideo(selectedFaction)}
            characters={availableCharacters}
            selectedId={selectedId}
            selected={selected}
            resolveAsset={uiAsset}
            onCycle={cycleCharacter}
            onHighlight={highlightCharacterWithVoice}
            onSwapTeam={() => {
              const next = selectedFaction === 'red' ? 'green' : 'red';
              const nextId = FIXED_ROSTERS[next][0];
              chooseFaction(next);
              playCharacterVoice(nextId);
            }}
            onSelect={() => {
              stopCharacterVoice();
              setMenuStep('field');
            }}
          />
        )}

        {menuStep === 'field' && selectedFaction && (
          <FieldSelectScreen
            faction={selectedFaction}
            selectedFieldId={selectedFieldId}
            fields={FIELD_CONFIGS}
            squad={squad}
            resolveAsset={uiAsset}
            onSelect={setSelectedFieldId}
            onStep={(direction) =>
              setSelectedFieldId(
                stepFieldId(
                  selectedFieldId,
                  direction,
                  FIELD_CONFIGS.map((field) => field.id),
                ),
              )
            }
            onStart={start}
          />
        )}

        {menuStep !== 'splash' && (
          <BackButton resolveAsset={uiAsset} onBack={goBack} />
        )}
        <MenuActionsRow
          menuStep={menuStep}
          musicMuted={musicMuted}
          resolveAsset={uiAsset}
          onAbout={() => setCreditsOpen(true)}
          onToggleMusic={toggleBackgroundMusic}
          onOpenRules={() => setRulesOpen(true)}
          onAudioOpen={() => keys.current.clear()}
        />
        {menuStep === 'character' && (
          <WorkshopLink
            onOpen={() => {
              stopCharacterVoice();
              setView('workshop');
            }}
          />
        )}
        {creditsOpen && <DeveloperCredits onClose={() => setCreditsOpen(false)} />}
        {rulesOpen && <RulesOverlay onClose={() => setRulesOpen(false)} />}
        {playerProfile === null && <PlayerProfileSetup onCreated={refreshPlayerProfile} />}
        {playerProfile && profileOpen && (
          <Suspense fallback={null}>
            <PlayerProfilePanel
              profile={playerProfile}
              onClose={() => setProfileOpen(false)}
            />
          </Suspense>
        )}
      </main>
    );
  }
  return (
    <main className="game-shell playing-shell">
      <PlayingTopbar
        logoSrc={publicAsset('brand/benteng-tag-logo.webp?v=9')}
        hasProfile={Boolean(playerProfile)}
        musicMuted={musicMuted}
        onOpenProfile={() => {
          keys.current.clear();
          setProfileOpen(true);
        }}
        onAudioOpen={() => keys.current.clear()}
        onToggleMusic={toggleBackgroundMusic}
        onToggleMission={() => setMissionOpen((value) => !value)}
        onPause={() => keys.current.add('p')}
      />
      <section className="prototype-grid">
        <div className="stage-card">
          <canvas
            ref={canvasRef}
            aria-label={`Arena ${FIELD_BY_ID[selectedFieldId].name} 5 lawan 5 yang dapat dimainkan`}
          />
          {rendererError && (
            <RendererErrorNotice
              error={rendererError}
              onBack={() => { setRendererError(''); quit(); }}
            />
          )}
          <StageHud
            snapshot={snapshot}
            onToggle={() => setLeaderboardOpen((value) => !value)}
          />
          <MatchEventFeed events={snapshot.matchEvents} frames={MATCH_EVENT_FRAME} />
          <RoundResultAnnouncementCard result={snapshot.roundResult} assets={ROUND_RESULT_ASSET} />
          {showStatsBoard && (
            <RoundStatsOverlay
              statsBoard={statsBoard}
              leaderboardOpen={leaderboardOpen}
              onCloseLeaderboard={closeLeaderboard}
              onRequestNextRound={requestNextRound}
              onRematch={rematch}
              onBackToCharacterSelect={backToCharacterSelect}
              onBackToFieldSelect={backToFieldSelect}
              onQuit={quit}
            />
          )}
          <ArenaIntel
            baseGrace={snapshot.baseGrace}
            fortLock={snapshot.fortLock}
            pickupCount={snapshot.pickupCount}
            fieldWins={snapshot.fieldWins}
          />
          {mode === 'playing' && (
            <>
              <StatusRibbon
                playerName={selected.name}
                factionLabel={selectedFaction ? factionName(selectedFaction) : ''}
                state={snapshot.state}
                order={snapshot.order}
              />
              <PrisonerNotice
                prisoner={snapshot.state === 'PRISONER'}
                paused={snapshot.paused}
                requestActive={snapshot.rescueRequestActive}
                requestRemaining={snapshot.rescueRequestRemaining}
                requestCooldown={snapshot.rescueRequestCooldown}
                onRequest={() => tapKey('r')}
              />
              <ActiveObjective
                missionCount={missionCount}
                onOpen={() => setMissionOpen(true)}
              />
              <CharacterHud
                characterId={selected.id}
                playerName={selected.name}
                faction={selectedFaction}
                factionLabel={selectedFaction ? factionName(selectedFaction) : ''}
                passiveName={selected.passiveName}
                state={snapshot.state}
                meter={snapshot.ultimateMeter}
                ultimate={
                  ULTIMATE_CHARACTER_IDS.has(selectedId)
                    ? selected.ultimate
                    : undefined
                }
              />
              <TeamComboHud
                faction={selectedFaction}
                surgeRemaining={snapshot.comboSurgeRemaining}
                comboLevel={snapshot.comboLevel}
                comboRemaining={snapshot.comboRemaining}
              />
              <ComboCallout
                callout={snapshot.comboCallout}
                surge={Boolean(snapshot.comboSurgeRemaining)}
              />
              <CameraSwitcher
                options={CAMERA_OPTIONS}
                cameraMode={cameraMode}
                onSelect={(id) => setCameraMode(id as CameraMode)}
              />
              <BoostStack boost={snapshot.boost} boostCountdown={snapshot.boostCountdown} />
              {snapshot.state !== 'PRISONER' && ULTIMATE_CHARACTER_IDS.has(selectedId) && (
                <UltimateMeterHud
                  playerName={selected.name}
                  icon={selected.ultimate?.icon ?? 'zap'}
                  hudTitle={selected.ultimate?.hudTitle ?? 'TITAH HALILINTAR'}
                  shieldClass={selected.ultimate?.shieldClass}
                  meter={snapshot.ultimateMeter}
                />
              )}
              <ActionDock
                mechanicsLocked={playerMechanicsLocked}
                state={snapshot.state}
                intel={{
                  baseGrace: snapshot.baseGrace,
                  fortLock: snapshot.fortLock,
                  pickupCount: snapshot.pickupCount,
                  fieldWins: snapshot.fieldWins,
                }}
                comboSurge={Boolean(snapshot.comboSurgeRemaining)}
                hasUltimate={ULTIMATE_CHARACTER_IDS.has(selectedId)}
                meter={snapshot.ultimateMeter}
                casting={snapshot.ultimateCasting}
                ultimateActionClass={selected.ultimate?.actionClass ?? ''}
                ultimateTitle={selected.ultimate?.hudTitle ?? 'Titah Halilintar'}
                ultimateIconId={selected.ultimate?.icon ?? 'zap'}
                onTapUltimate={() => tapKey('capslock')}
              />
              {snapshot.state !== 'PRISONER' && snapshot.ultimateBuffRemaining > 0 && (
                <div className={`ultimate-buff-indicator ${selected.ultimate?.indicatorClass ?? ''}`}>
                  {ultimateIcon(selected.ultimate?.icon ?? 'zap', 13)}
                  {selected.ultimate?.buffText ?? ' TITAH +40% · '}
                  {snapshot.ultimateBuffRemaining}s
                </div>
              )}
              <ControlRibbon
                state={snapshot.state}
                hasUltimate={ULTIMATE_CHARACTER_IDS.has(selectedId)}
              />
              <MobileControls
                state={snapshot.state}
                playerMechanicsLocked={playerMechanicsLocked}
                hasUltimate={ULTIMATE_CHARACTER_IDS.has(selectedId)}
                meter={snapshot.ultimateMeter}
                ultimateActionClass={selected.ultimate?.actionClass ?? ''}
                ultimateTitle={selected.ultimate?.hudTitle ?? 'Titah Halilintar'}
                touch={touchControl}
              />
              {snapshot.paused && (
                <PauseOverlay
                  musicMuted={musicMuted}
                  onResume={() => keys.current.add('p')}
                  onToggleMusic={toggleBackgroundMusic}
                  onRestart={() => setRun((value) => value + 1)}
                  onQuit={quit}
                />
              )}
            </>
          )}
          {ultimateBannerVisible && ULTIMATE_CHARACTER_IDS.has(selectedId) && (
            <UltimateBanner
              playerName={selected.name}
              icon={selected.ultimate?.icon ?? 'zap'}
              hudTitle={selected.ultimate?.hudTitle ?? 'Titah Halilintar'}
              bannerAlt={selected.ultimate?.bannerAlt ?? 'TITAH HALILINTAR'}
              bannerClass={selected.ultimate?.bannerClass}
            />
          )}
        </div>
        <MissionPanel
          open={missionOpen}
          onClose={() => setMissionOpen(false)}
          missionCount={missionCount}
          snapshot={snapshot}
          mode={mode}
          selectedFaction={selectedFaction}
          musicMuted={musicMuted}
        />
      </section>
      {playerProfile && profileOpen && (
        <Suspense fallback={null}>
          <PlayerProfilePanel
            profile={playerProfile}
            onClose={() => setProfileOpen(false)}
          />
        </Suspense>
      )}
    </main>
  );
}
