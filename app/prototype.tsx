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

import { CharacterWorkshop } from '../modules/ui/character-workshop/character-workshop.tsx';
import { MatchEventFeed } from '../modules/ui/match-event-feed.tsx';
import { RoundStatsOverlay } from '../modules/ui/round-stats-overlay.tsx';
import { MissionPanel } from '../modules/ui/mission-panel.tsx';
import { MatchProgressionSummary } from '../modules/ui/match-progression-summary.tsx';
import { UnlockNotificationPanel } from '../modules/ui/unlock-notification-panel.tsx';
import { ArenaUnlockPanel } from '../modules/ui/arena-unlock-panel.tsx';
import { RoundResultAnnouncementCard } from '../modules/ui/round-result-announcement.tsx';
import { SplashScreen } from '../modules/ui/splash-screen.tsx';
import { TeamScreen } from '../modules/ui/team-screen.tsx';
import { RulesOverlay } from '../modules/ui/rules-overlay.tsx';
import { FieldSelectScreen } from '../modules/ui/field-select-screen.tsx';
import { CharacterSelectScreen } from '../modules/ui/character-select-screen.tsx';
import { AssetLoadingScreen } from '../modules/ui/asset-loading-screen.tsx';
import { LoadingPanel } from '../modules/ui/loading-media.tsx';
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
import { OrientationHint } from '../modules/ui/orientation-hint.tsx';
import { UltimateBuffIndicator } from '../modules/ui/ultimate-buff-indicator.tsx';
import { ControlRibbon } from '../modules/ui/control-ribbon.tsx';
import { selectionPreviewUrls, loadSelectionPreview } from '../lib/selection-preview-assets.ts';






import { GameplayGuidance, useHudPreferences } from '../modules/ui/gameplay-guidance.tsx';

import { clickRoute, pointerWorld } from '../modules/gameplay/click-navigation.ts';
import type { RuntimeActor, ActorStats as PlayerStats, CanonicalGameState } from '../lib/game-core/types';
import { createEntityRegistry } from '../lib/game-core/entities.ts';
import { createLocalInputAdapter, type PlayerInputFrame } from '../lib/game-core/input.ts';
import { createBotAuthority } from '../modules/gameplay/ai-movement.ts';
import { presentGameEvents, fortEntryEvents, type GameEvent } from '../lib/game-core/events.ts';
import { createSimulationClock, advanceSimulationClock } from '../lib/game-core/tick.ts';
import { describeMatch } from '../lib/game-core/state.ts';
import { createRenderAdapter, type RenderFrame } from '../lib/game-core/render-state.ts';
import { createSnapshot, type GameSnapshot } from '../lib/game-core/snapshot.ts';
import type {MultiplayerSession} from '../lib/multiplayer/session';
import {createContentIdentity} from '../lib/multiplayer/content.ts';
import {parseInvite} from '../lib/multiplayer/invite.ts';
import {createRemoteInputBuffer,createRemoteHumanMovement} from '../lib/multiplayer/remote-input.ts';
import {createSnapshotBuffer,snapshotRenderState} from '../lib/multiplayer/interpolation.ts';
import {NETWORK_RATES} from '../lib/multiplayer/rates.ts';
import { createNetworkPump } from '../lib/multiplayer/pump.ts';
import {createMatchRoster,takeoverDisconnected} from '../lib/multiplayer/roster.ts';
import {createMatchResult,createResultHandoff,type MatchResultPacket} from '../lib/multiplayer/result.ts';
import {createNetworkUltimates} from '../lib/multiplayer/ultimates.ts';
import {toNetworkGameEvent,fromNetworkGameEvent,type ProtocolMessage} from '../lib/multiplayer/protocol.ts';
import { gainUltimate, stepUltimate, stepFlight, ultimateCasting as coreUltimateCasting, ultimateSpeed, freezeUltimateActors } from '../modules/gameplay/ultimate.ts';
import { endRound, stepMatchTimer, phaseTransition, suddenDeathTagWinner } from '../modules/game-core/match-control.ts';
import { moveActor, moveInputActor, movementBlocked, enterWaterFall, parkourLanding, drainBoost, type CollisionWorld } from '../modules/gameplay/movement.ts';
import { resolveTag, tagContacts, tagRelationship, resolveRescue, resolveBase, resolveAllHeld, layoutPrisoners, fortOccupant as coreFortOccupant } from '../modules/gameplay/tag-combat.ts';
import { createRouteScheduler } from '../lib/route-scheduler';
import { autoInitialPixelRatio, AUTO_PIXEL_RATIO, nextAutoPixelRatio, graphicsPreset, graphicsPixelRatio, GRAPHICS_PRESETS, GRAPHICS_SETTINGS_EVENT, type GraphicsPreset } from '../lib/graphics-settings.js';
import { studioImages, retainStudioImages, createStudioResolver, studioFlightClip } from '../lib/sprite-studio.ts';
import { spritePlacement } from '../lib/sprite-studio-model.js';
import { studioMaps, studioBuiltinStates, studioMapById, mapImages, retainMapImages, mapArtwork, drawMapTerrain, drawMapObject } from '../lib/map-studio.ts';
import { contains as studioContains, collisionRects } from '../lib/map-studio-model.js';
import { arenaRulesFor, prepareArenaMap, kanalColliderObjects, kanalPrisonWalls as createKanalPrisonWalls } from '../modules/world/map-arena-rules.ts';
import {createMapQueries,objectBounds,visibleBounds} from '../modules/world/map-runtime-index.ts';
import { flightConfig, isFlying, flightBusy, flightSlot, sequenceComplete, steerFlight, flightPassesObstacle } from '../modules/gameplay/flight-ultimate.ts';

import GAME_RULES from '../config/game-rules.json' with { type: 'json' };
import { audioLevels, AUDIO_SETTINGS_EVENT, MUSIC_PREVIEW_EVENT } from '../lib/audio-settings.ts';
import { GameplayAudio } from '../modules/audio/gameplay-audio.ts';
import { createMatchAudio } from '../modules/audio/audio-port.ts';
import { closeToneAudio } from '../modules/audio/audio-tone.ts';
import { playAudioCue as playAudioCueAt } from '../modules/audio/audio-cue.ts';
import { characterVoiceAsset } from '../modules/audio/character-voice.ts';



import { createFieldAssetDraw } from '../modules/ui/field-assets.ts';

import { createGroundTileCanvas } from '../modules/ui/ground-tiles.ts';

import { createStaticMapLayer } from '../modules/ui/static-map-layer.ts';






import { uiAsset as uiAssetAt, matchEventFrames, roundResultAssets, loadingUiFrame as loadingUiFrameAt, loadingUiFrames } from '../modules/ui/ui-assets.ts';
import { getSprintDustImage, getKakaUltimateImage, getFieldImage } from '../modules/ui/image-cache.ts';
import { interactiveTarget as interactiveTargetAt, handlePointerOut as handlePointerOutAt } from '../modules/ui/event-target.ts';
import { rosterCharacters, squadLineup } from '../modules/gameplay/roster.ts';
import { ArenaBackdrop, arenaImage } from '../modules/ui/arena-backdrop.tsx';
import { imageReady, videoReady } from '../lib/asset-ready.ts';
import { CHARACTER_BY_ID, CharacterId, characterFullBodyPortrait, characterPreviewIcon, characterRuntimeAsset, characterSelectionVideo, characterUsesDedicatedEast, kakaUltimateBannerAsset, publicAsset, rajaUltimateBannerAsset, uiAudioAsset, ULTIMATE_CHARACTER_IDS } from '../lib/characters.ts';
import { characterAnimationMapping } from '../lib/character-animation.js';
import { DeveloperCredits } from '../modules/ui/developer-credits.tsx';
import { PlayerProfileSetup } from '../modules/ui/player-profile/player-profile-setup.tsx';
import { loadPlayerProfile, PLAYER_PROFILE_CHANGED_EVENT, EMPTY_KDA, recordMatchProgression, createMatchId, snapshotUltimateStats, isCharacterUnlocked, getPlayableCharacterIds, getPlayableArenaIds, validatePlayableContent, resolvePlayableContent, type LocalPlayerProfile, type PlayerKdaStats, type ProgressionResult } from '../lib/player-profile/index.ts';
import { getArenaSelectionProgress } from '../lib/player-profile/arena-selection-progress.ts';
import { hasSpriteSeries, seriesFrame } from '../lib/series-animation.js';
import {
  directionFromVelocity,
  directionalRow,
  shouldMirrorSprite,
  sprintEffectRotation,
} from '../lib/sprite-motion.js';
import { fieldCycleDecision, nextLandingArenaId } from '../modules/game-core/match-control.ts';
import { FIELD_ANIMATED_ATLAS, FIELD_GROUND_ATLAS, FIELD_OBJECT_ATLAS, FieldAnimatedId } from '../lib/field-assets.generated.ts';
import { buildFieldConfigs, GUIDE_FIELD_CONFIGS, kanal2X } from '../modules/world/map-data/guide-fields.ts';
import { factionName, FIXED_ROSTERS, TEAM_COLOR, lineupFor, TEAM_FOR_FACTION, FACTION_FOR_TEAM, teamName } from '../modules/world/team-tables.ts';
import { isKanalField } from '../modules/world/field-flags.ts';
import { clamp, distance, other } from '../lib/math.ts';

import { createRectQuery, depenetrateFromRects, steerAroundRects } from '../modules/gameplay/collision-navigation.ts';






import { type Grade, type Refill } from '../modules/gameplay/spawn.ts';




import { clearKeys, handleKeyDown, handleKeyUp, handleVisibilityChange } from '../modules/gameplay/input-navigation.ts';

import type {
  MatchEvent,
  MatchEventKind,
  RescueRequest,
} from '../modules/game-core/match-types.ts';

import { buildStatsBoard as buildStatsBoardOf } from '../modules/game-core/stats-board.ts';

import type {
  DifficultyId,
  Faction,
  FieldConfig,
  FieldId,
  Obstacle,
  Team,
} from '../modules/world/map-data/field-types.ts';
import {
  BASE_RADIUS,
  BASES,
  fortGeometry,
  H,
  MAP4_GUIDE_HEIGHT,
  MAP4_GUIDE_WIDTH,
  W,
  worldX,
  worldY,
} from '../modules/world/map-data/scalars.ts';
import { decodeStudioWaterMask, extractWaterMask } from '../modules/world/water-mask.ts';
import { kanalObjectRects, kanalObjectPolygons, kanalFortPolygon, polygonToRects } from '../modules/world/kanal-footprints.ts';
import { loadMusicMuted, saveMusicMuted } from '../modules/storage/local-settings.ts';
import {
  advanceTeamCombo,
  createTeamComboState,
  teamComboSeconds,
  teamComboSpeedMultiplier,
} from '../modules/gameplay/team-combo.ts';
import type { Kampung3D } from '../lib/kampung-3d';
let Kampung3DRenderer: typeof Kampung3D | undefined;
const PlayerProfilePanel = lazy(async () => ({
  default: (await import('../modules/ui/player-profile/player-profile-panel')).PlayerProfilePanel,
}));
const MultiplayerPanel = lazy(async () => ({default:(await import('../modules/ui/multiplayer-panel')).MultiplayerPanel}));

import {
  initialSnapshot,
  type Mission,
  type Snapshot,
  type StatsBoard,
} from '../modules/game-core/snapshot-types.ts';

type CameraMode = 'follow' | 'tactical' | 'overview';
type MenuStep = 'splash' | 'team' | 'character' | 'field';
type Player = RuntimeActor;
const PLAYER_COLLISION_RADIUS = 13;
const BASE_REENTRY_COOLDOWN_MS = 1500;
const KANAL2_FALL_RESET_MS = 3000;
const NEAR_FIELD_DETAIL_RADIUS = 560;
const AI_SPEED_MULTIPLIER = 1;
const AI_BOOST_THRESHOLD = -0.15;
const AI_BOOST_DRAIN_MULTIPLIER = 0.66;
const RAJA_ULTIMATE_RECHARGE_SECONDS = 45;
const RAJA_ULTIMATE_TAG_BONUS = 20;
const RAJA_ULTIMATE_RESCUE_BONUS = 30;
const RAJA_ULTIMATE_SPEED_MULTIPLIER = 1.4;
const RAJA_ULTIMATE_CAST_MS = 3200;
const RAJA_ULTIMATE_BUFF_MS = 5000;
const KAKA_ULTIMATE_CAST_MS = 3600;
const KAKA_ULTIMATE_FRAME_COUNT = 9;
const KAKA_ULTIMATE_SHIELD_MS = 5000;
const ultimateName = (id:CharacterId) => id === 'bebe' ? 'JET FLIGHT' : id === 'ciici' ? 'VAMPIRE FLIGHT' : id === 'kaka' ? 'PERISAI HIJAU' : 'TITAH HALILINTAR';
const ultimateBannerAsset = (id:CharacterId) => flightConfig(id) ? publicAsset(flightConfig(id)!.icon) : id === 'kaka' ? kakaUltimateBannerAsset() : rajaUltimateBannerAsset();
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
  kicker: 'Arena eksperimental bergaya low-poly dengan gameplay dua dimensi dan jalur terbuka.',
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
const kanalReference = kanalColliderObjects(nativeFieldConfigs.kanal2.obstacles, kanalObjectPolygons);
const runtimeStudioMapById = Object.fromEntries(studioMaps.map(map=>[map.id,prepareArenaMap(map,kanalReference)]));
for (let index = FIELD_CONFIGS.length - 1; index >= 0; index--) {
  const id = FIELD_CONFIGS[index].id;
  if (replacedFields.has(id) || ['archived','deleted'].includes(studioBuiltinStates[id])) FIELD_CONFIGS.splice(index, 1);
}
FIELD_CONFIGS.push(...studioMaps.map((map): FieldConfig => ({
  id: map.id, name: map.name, kicker: map.description, difficulty: map.replaces ? nativeFieldConfigs[map.replaces].difficulty : 'normal',
  aiIntensity: map.replaces ? nativeFieldConfigs[map.replaces].aiIntensity : 1, objectScale: map.replaces ? nativeFieldConfigs[map.replaces].objectScale : undefined, baseRadius: map.replaces ? nativeFieldConfigs[map.replaces].baseRadius : undefined, ground: 'kampungGround', width: map.width, height: map.height,
  bases: map.bases, prisons: Object.fromEntries(Object.entries(map.prisons).map(([team,p])=>[team,{
    ...(map.replaces ? nativeFieldConfigs[map.replaces].prisons[team as Team] : arenaRulesFor(map)==='kanal2' ? nativeFieldConfigs.kanal2.prisons[team as Team] : {}),...p,
  }])) as FieldConfig['prisons'], paths: [], obstacles: [], decorations: [], animated: [],
  ...(arenaRulesFor(map)==='kanal2' ? {designWidth:nativeFieldConfigs.kanal2.designWidth,designHeight:nativeFieldConfigs.kanal2.designHeight,
    objectScale:map.replaces ? nativeFieldConfigs[map.replaces].objectScale : nativeFieldConfigs.kanal2.objectScale,
    baseRadius:map.replaces ? nativeFieldConfigs[map.replaces].baseRadius : nativeFieldConfigs.kanal2.baseRadius} : {}),
  structuresInBackground: !!(map.replaces && nativeFieldConfigs[map.replaces].structuresInBackground &&
    map.terrain?.asset === `field/${nativeFieldConfigs[map.replaces].background}`),
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
  const [hudPreferences,setHudPreferences]=useHudPreferences();
  const hudPreferencesRef=useRef(hudPreferences);
  hudPreferencesRef.current=hudPreferences;
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
  const [selectedId, setSelectedIdState] = useState<CharacterId>('raja');
  const [selectedFieldId, setSelectedFieldIdState] = useState<FieldId>(FIELD_CONFIGS[0].id);
  const [contentGateError, setContentGateError] = useState('');
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [mode, setMode] = useState<'menu' | 'playing'>('menu');
  const [menuStep, setMenuStep] = useState<MenuStep>('splash');
  const [multiplayerOpen,setMultiplayerOpen]=useState(false);
  const [view, setView] = useState<'game' | 'workshop'>('game');
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active&&parseInvite(window.location.href,FIELD_CONFIGS))setMultiplayerOpen(true);});return()=>{active=false;};},[]);
  const [networkSession,setNetworkSession]=useState<MultiplayerSession|null>(null);
  useEffect(()=>{
    if(!networkSession)return;
    const off=networkSession.subscribe(state=>{if(state.phase==='ended'){
      setNetworkSession(null);setMultiplayerOpen(false);setMode('menu');setMenuStep('splash');setContentGateError(state.error||'Room ditutup.');
    }});
    return ()=>{off();networkSession.close();};
  },[networkSession]);
  const [hoveredFaction, setHoveredFaction] = useState<Faction | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
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
  const playerProfileRef = useRef(playerProfile);
  const [matchProgressionResult, setMatchProgressionResult] = useState<ProgressionResult | null>(null);
  const [unlockNoticeDismissed, setUnlockNoticeDismissed] = useState(false);
  playerProfileRef.current = playerProfile;
  const fieldIds = FIELD_CONFIGS.map(field => field.id);
  const selectionGate = () => validatePlayableContent(loadPlayerProfile(), selectedId, selectedFieldId,
    selectedFaction ? FIXED_ROSTERS[selectedFaction] : [], fieldIds);
  const setSelectedId = (id: CharacterId) => {
    if (!playerProfileRef.current || !selectedFaction || !FIXED_ROSTERS[selectedFaction].includes(id) ||
        !isCharacterUnlocked(playerProfileRef.current, id)) {
      setContentGateError('Karakter belum terbuka atau tidak tersedia di tim ini.');
      return false;
    }
    setContentGateError('');
    setSelectedIdState(id);
    return true;
  };
  const setSelectedFieldId = (id: FieldId) => {
    if (!fieldIds.includes(id)) {
      setContentGateError('Arena tidak tersedia.');
      return false;
    }
    setContentGateError('');
    setSelectedFieldIdState(id);
    return true;
  };
  useEffect(() => {
    if (mode !== 'playing' || networkSession) return;
    if (!playerProfile || !selectedFaction) {
      setContentGateError('Profil atau tim tidak tersedia. Kembali ke menu.');
      setMode('menu');
      return;
    }
    const valid = resolvePlayableContent(playerProfile, selectedId, selectedFieldId,
      FIXED_ROSTERS[selectedFaction], FIELD_CONFIGS.map(field => field.id));
    if (!valid || valid.characterId !== selectedId || valid.arenaId !== selectedFieldId) {
      setContentGateError('Pilihan tidak tersedia. Kembali ke pilihan konten yang sudah terbuka.');
      setMode('menu');
      if (valid) {
        setSelectedIdState(valid.characterId);
        setSelectedFieldIdState(valid.arenaId as FieldId);
      }
    }
  }, [playerProfile, selectedFaction, selectedId, selectedFieldId, mode,networkSession]);
  const [profileOpen, setProfileOpen] = useState(false);
  const refreshPlayerProfile = () => {
    const profile = loadPlayerProfile();
    playerProfileRef.current = profile;
    setPlayerProfile(profile);
  };
  useEffect(() => {
    refreshPlayerProfile();
    window.addEventListener(PLAYER_PROFILE_CHANGED_EVENT, refreshPlayerProfile);
    window.addEventListener('storage', refreshPlayerProfile);
    return () => {
      window.removeEventListener(PLAYER_PROFILE_CHANGED_EVENT, refreshPlayerProfile);
      window.removeEventListener('storage', refreshPlayerProfile);
    };
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
        uiAsset('controls/back-inactive.png'), uiAsset('controls/back-hover.png'), uiAsset('controls/ultimate-label.png'),
        ...['doi-coin', 'label', 'close', 'accent'].map(name => publicAsset(`ui-v2/economy/${name}.png`)), ...LOADING_UI_FRAMES];
      for (const field of FIELD_CONFIGS) urls.push(arenaImage(field.id));
      if (gameLoading) {
        const faction=selectedFaction??'red';
        const matchCharacters=[...lineupFor(faction,selectedId),...lineupFor(faction==='red'?'green':'red')];
        retainStudioImages(matchCharacters);
        for (const id of matchCharacters) {
          images.push(getSpriteImage(id));
          images.push(...studioImages(id));
          if (hasSpriteSeries(id)) images.push(getSeriesImage(id));
          urls.push(characterPreviewIcon(id));
        }
        images.push(getSprintDustImage(), getKakaUltimateImage());
        for (const asset of ['objects.webp', 'animated.webp', 'grounds.webp']) images.push(getFieldImage(asset));
        if(isKanalField(selectedFieldId))images.push(getFieldImage('kanal-object-atlas.webp'));
        // Decode only the selected arena. Rotation uses the same readiness gate
        // instead of retaining all custom animated atlases throughout a match.
        retainMapImages(studioMapById[selectedFieldId] ? [studioMapById[selectedFieldId]] : []);
        for (const field of [FIELD_BY_ID[selectedFieldId]]) {
          if (studioMapById[field.id]) images.push(...mapImages(studioMapById[field.id]));
          if (field.background) images.push(getFieldImage(field.background));

          if (field.waterMask) images.push(getFieldImage(field.waterMask));

        }
        urls.push(
          rajaUltimateBannerAsset(),
          kakaUltimateBannerAsset(),
          ultimateBannerAsset('bebe'),
          ultimateBannerAsset('ciici'),
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
      // The team video is decoration: browsers without H.264 (e.g. plain Chromium) fall back to a static team backdrop.
      if (!gameLoading && selectedFaction) tasks.push(() => videoReady(characterSelectionVideo(selectedFaction), 10000).catch(error => { console.warn('Video tim dilewati; memakai latar statis.', error); }));
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
        const gate = selectionGate();
        if (gate) throw new Error(gate);
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
  }, [assetsLoading, gameLoading, selectedFaction, selectedFieldId, selectedId, loadAttempt]);
  const selected = CHARACTER_BY_ID[selectedId] ?? CHARACTER_BY_ID.raja;
  const availableCharacters = useMemo(
    () => rosterCharacters(selectedFaction),
    [selectedFaction],
  );
  const squad = useMemo(
    () => squadLineup(selectedFaction, selectedId),
    [selectedFaction, selectedId],
  );
  const selectedArena =
    FIELD_CONFIGS.find((field) => field.id === selectedFieldId) ??
    FIELD_CONFIGS[0];
  const selectedArenaUnlock = useMemo(() => {
    if (!playerProfile) {
      return { unlocked: false, requirement: 'Buat profil pemain untuk melihat progres pembukaan arena.' };
    }
    const progress = getArenaSelectionProgress(playerProfile, selectedArena.id, FIELD_CONFIGS);
    if (progress.unlocked) return { unlocked: true, requirement: '' };
    const requirements = progress.checks
      .filter(check => !check.met)
      .map(check => {
        if (check.kind === 'level') return `Level ${check.required}`;
        if (check.kind === 'totalWins') return `${check.required} kemenangan total`;
        if (check.kind === 'tags') return `${check.required} tag lawan`;
        if (check.kind === 'rescues') return `${check.required} rescue tim`;
        if (check.kind === 'arenaPlayed') return `${check.required} pertandingan di ${check.label.replace('Main di ', '')}`;
        if (check.kind === 'arenaWins' || check.kind === 'tierWins')
          return `${check.required} kemenangan di ${check.label.replace('Menang di ', '')}`;
        return check.label;
      });
    return {
      unlocked: false,
      requirement: requirements.length
        ? `Selesaikan syarat: ${requirements.join(', ')}.`
        : 'Arena ini belum dapat dimainkan.',
    };
  }, [playerProfile, selectedArena.id]);

  const chooseFaction = (faction: Faction) => {
    const first = getPlayableCharacterIds(playerProfileRef.current, FIXED_ROSTERS[faction])[0];
    if (!first) { setContentGateError('Tim ini belum memiliki karakter yang dapat dimainkan.'); return null; }
    setSelectedFaction(faction);
    setSelectedIdState(first);
    setContentGateError('');
    return first;
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
    if (setSelectedId(id)) playCharacterVoice(id);
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
    banner.src = ultimateBannerAsset(selectedId);
    if (selectedId === 'kaka') getKakaUltimateImage();
    if(process.env.NODE_ENV!=='production'&&flightConfig(selectedId)) {
      const missing=['ultimate_takeoff','ultimate_fly','ultimate_land'].filter(slot=>!studioFlightClip(selectedId,slot));
      if(missing.length)console.warn(`${selectedId}: animasi Flight belum lengkap (${missing.join(', ')}). Fallback sementara; unggah sequence final melalui Sprite Studio.`);
    }
    banner.src = ultimateBannerAsset(selectedId);
    if (selectedId === 'kaka') getKakaUltimateImage();
    if(process.env.NODE_ENV!=='production'&&flightConfig(selectedId)) {
      const missing=['ultimate_takeoff','ultimate_fly','ultimate_land'].filter(slot=>!studioFlightClip(selectedId,slot));
      if(missing.length)console.warn(`${selectedId}: animasi Flight belum lengkap (${missing.join(', ')}). Fallback sementara; unggah sequence final melalui Sprite Studio.`);
    }
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
    const network=mode==='playing'?networkSession:null;
    const clientOnly=network?.read().role==='client';
    if (mode === 'playing' && !network) {
      const gate = selectionGate();
      if (gate) { setContentGateError(gate); setMode('menu'); return; }
    }
    // Identity belongs to this initialized match, not to a render or round.
    const matchId = mode === 'playing' ? network?`${network.read().roomCode}:match`:createMatchId() : null;
    // Match-local immutable snapshot: profile refresh never restarts this effect.
    const playerUltimateStats = snapshotUltimateStats(mode==='playing'&&!network ? loadPlayerProfile() ?? playerProfileRef.current ?? null : null,selectedId);
    const ultimateCastMsFor = (player: Player) => {
      const base=player.characterId==='kaka'?KAKA_ULTIMATE_CAST_MS:RAJA_ULTIMATE_CAST_MS;
      return player.controlled ? playerUltimateStats?.castMs ?? base : base;
    };
    setMatchProgressionResult(null);
    // Result/notice are session-only. Reload never rehydrates consumed notices;
    // the unlocked content itself remains in the persisted player profile.
    setUnlockNoticeDismissed(false);
    pendingProfileStatsRef.current = { ...EMPTY_KDA };
    const mainContext = canvas.getContext('2d');
    if (!mainContext) return;
    let ctx: CanvasRenderingContext2D = mainContext;
    let raf = 0,
      last = performance.now(),
      lastHud = 0,
      lastDraw = -Infinity;
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
      audio: AudioContext | null = null,
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
    const studioMap = runtimeStudioMapById[selectedFieldId];
    const studioQueries = studioMap ? createMapQueries(studioMap) : null;
    const studioLayers = {
      background:studioMap?.objects.filter(o=>o.layer==='background').sort((a,b)=>a.z-b.z)??[],
      world:studioMap?.objects.filter(o=>o.layer==='world')??[],
      foreground:studioMap?.objects.filter(o=>o.layer==='foreground').sort((a,b)=>a.z-b.z)??[],
    };
    const studioBounds=new Map(studioMap?.objects.map(o=>[o,objectBounds(o)])??[]);
    let visibleWorld={left:0,right:0,top:0,bottom:0};
    const objectVisible=(o:typeof studioMap.objects[number])=>visibleBounds(studioBounds.get(o)!,visibleWorld);
    const development = process.env.NODE_ENV !== 'production';
    if(development)canvas.dataset.ultimateStats=JSON.stringify(playerUltimateStats);
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
    waterMaskCanvas.width = studioMap?.waterMask?.width ?? field.waterMaskWidth ?? 1;
    waterMaskCanvas.height = studioMap?.waterMask?.height ?? field.waterMaskHeight ?? 1;
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
      if (studioMap?.waterMask) {
        const result = decodeStudioWaterMask(studioMap.waterMask, { worldWidth, worldHeight, kanal: isKanalField(field.id) });
        if (!result) return;
        waterMaskPixels = result.pixels;
        kanalWaterGlints.length = 0;
        kanalWaterGlints.push(...result.glints);
      } else {
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
      }
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

    if (fieldWaterMask?.complete || studioMap?.waterMask) cacheWaterMask();


    const matchAudio = createMatchAudio();
    const gameplayAudio = new GameplayAudio();
    let countdownSoundPlayed = false;
    void gameplayAudio.unlock();
    window.addEventListener('pointerdown', gameplayAudio.unlock);
    window.addEventListener('keydown', gameplayAudio.unlock);
    let lastFootstep = 0;
    let wasDashing = false;
    const fortOccupancy = new Set<string>();
    let previousSoundPosition: { x: number; y: number } | null = null;
// Match boot: multiplayer roster, network plumbing, and stats stores. The
// frame loop reads these through closure; remote peers only exist when a
// session is active.
    const beep = (frequency: number, duration = 0.08) => {
      if (audioLevels().sfx === 0) return;
      try {
        audio ??= new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.value = Math.max(.0001, 0.05 * audioLevels().sfx);
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
    const entityRegistry = createEntityRegistry();
    const frozenRoster=network?createMatchRoster(network.read().lobby!):null;
    const disconnectedPeers=new Set<string>();
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
        entityId: entityRegistry.assign(id),
        controller: controlled ? 'local' : 'bot',
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
        waterEnteredAt: 0,
        waterFallUntil: 0,
        capturedIds: [],
        actionUntil: 0,
        lastX: b.x + offset.x * direction,
        lastY: b.y + offset.y,
        aiSeed: 0.35 + slot * 1.17 + (team === 'red' ? 5.3 : 0),
      };
    };
    const makePlayers = () => {
      if(network){
        const room=network.read();
        const result=frozenRoster!.map(({characterId,team,slot,peerId},index)=>{
          const owner=peerId&&!disconnectedPeers.has(peerId)?peerId:null;
          const local=owner===room.localPeerId;
          const p=makePlayer(index===0?'you':index<5?`ally${index+1}`:`enemy${index-4}`,characterId,TEAM_FOR_FACTION[team],slot,local);
          p.controller=owner?local?'local':'remote':'bot';if(owner)p.ownerPeerId=owner;
          return p;
        });
        // Stable IDs assigned in host order; camera/HUD put this peer's actor first.
        return [...result.filter(p=>p.ownerPeerId===room.localPeerId),...result.filter(p=>p.ownerPeerId!==room.localPeerId)];
      }
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
    const myEntityId=players[0].entityId;
    const humanIdentities=players.filter(p=>p.ownerPeerId).map(p=>({peerId:p.ownerPeerId!,entityId:p.entityId}));
    const networkUltimates=createNetworkUltimates(humanIdentities);
    const networkUltimateRules=(p:Player)=>({supported:ULTIMATE_CHARACTER_IDS,kanal2:isKanalField(field.id),
      rechargeSeconds:RAJA_ULTIMATE_RECHARGE_SECONDS,castMs:p.characterId==='kaka'?KAKA_ULTIMATE_CAST_MS:RAJA_ULTIMATE_CAST_MS,
      durationMs:p.characterId==='kaka'?KAKA_ULTIMATE_SHIELD_MS:RAJA_ULTIMATE_BUFF_MS,speedMultiplier:RAJA_ULTIMATE_SPEED_MULTIPLIER});
    let lastNetworkFrame:Extract<ProtocolMessage,{type:'MATCH_FRAME'}>|null=null,networkEventSerial=0;
    const receivedNetworkEvents:GameEvent[]=[];
    const publishNetworkFacts=(facts:readonly GameEvent[])=>{if(network&&!clientOnly)for(const event of facts)network.publishEvent({version:1,type:'GAME_EVENT',
      matchId:matchId!,tick:simulationClock.tick,eventId:`${matchId}:event:${++networkEventSerial}`,event:toNetworkGameEvent(event)});};
    const resultHandoff=network?createResultHandoff({matchId:matchId!,arenaId:field.id,peerId:network.read().localPeerId,
      entityId:myEntityId,team:FACTION_FOR_TEAM[players[0].team]},summary=>recordMatchProgression(summary)):null;
    let pendingMatchResult:MatchResultPacket|null=null;
    let lastResultAttempt=-Infinity;
    const remoteInputs=createRemoteInputBuffer(matchId??'menu-preview',new Map(players.filter(p=>p.controller==='remote').map(p=>[p.entityId,p.ownerPeerId!])),worldWidth,worldHeight);
    const remoteMovement=createRemoteHumanMovement();
    const snapshots=createSnapshotBuffer(matchId??'menu-preview',field.id,NETWORK_RATES.interpolationDelayMs);
    let clientPresentation:CanonicalGameState|null=null;
    const networkPump = network ? createNetworkPump({
      network,
      matchId: matchId ?? 'menu-preview',
      myEntityId,
      sampleInput: (entityId, keysSnapshot, boost, target) => localInput.sample(entityId, keysSnapshot, boost, target),
      keys: keys.current,
      mouseBoost: () => mouseBoost,
      setMouseBoost: (value) => { mouseBoost = value; },
      mouseRoute: () => mouseRoute,
      clearMouse,
      distance,
      me: () => players[0],
      publishSnapshot: (now, initial) => {
        const state=readCanonicalState(now),s=createSnapshot(state),rows=(stats:CanonicalGameState['matchStats'])=>
          Object.entries(stats).map(([entityId, counts]) => ({ entityId, ...counts }));
        network.publishSnapshot(initial
          ? { version: 1, type: 'MATCH_START', matchId: matchId!, arenaId: field.id, startAtMs: phaseUntil, snapshot: s }
          : { version: 1, type: 'MATCH_FRAME', matchId: matchId!, tick: s.tick, snapshot: s,
            matchStartedAtMs: matchStartedAt, rescueCooldownUntil: rescueRequestCooldownUntil,
            roundStats: rows(state.roundStats), matchStats: rows(state.matchStats) });
      },
    }) : null;
    const networkOff=network?.onGameplay((peer,m)=>{
      if(!clientOnly&&m.type==='INPUT')remoteInputs.accept(peer,m,performance.now());
      else if(clientOnly&&(m.type==='SNAPSHOT'||m.type==='MATCH_START'))snapshots.push(m.snapshot,performance.now());
      else if(clientOnly&&m.type==='MATCH_FRAME'){lastNetworkFrame=m;snapshots.push(m.snapshot,performance.now());}
      else if(clientOnly&&m.type==='MATCH_RESULT'){pendingMatchResult=m;snapshots.push(m.snapshot,performance.now());}
      else if(clientOnly&&m.type==='GAME_EVENT'){receivedNetworkEvents.push(fromNetworkGameEvent(m.event));if(receivedNetworkEvents.length>256)receivedNetworkEvents.shift();}
    });
    const networkStateOff=network?.subscribe(state=>{if(!clientOnly){
      for(const change of takeoverDisconnected(players,new Set(state.lobby?.participants.map(p=>p.peerId)),disconnectedPeers)){
        remoteInputs.disconnect(change.peerId);network.publishDeparture(change.peerId,change.entityId);
      }
    }});
    const localInput = createLocalInputAdapter();
    // Single simulation clock for single-player and multiplayer host: fixed 60 Hz steps,
    // so movement and timers run at real-time speed regardless of render FPS.
    const SIMULATION_HZ = 60, MAX_SIMULATION_STEPS = 4;
    const simulationClock = createSimulationClock(SIMULATION_HZ);
    const emptyStats = (): PlayerStats => ({ tags: 0, prisons: 0, rescues: 0 });
    const makeStatsStore = () =>
      Object.fromEntries(players.map((player) => [player.id, emptyStats()])) as Record<
        string,
        PlayerStats
      >;
    let roundStats = makeStatsStore();
    let matchStats = makeStatsStore();
    const ensureStats = (
      store: Record<string, PlayerStats>,
      player: Player,
    ) => (store[player.id] ??= emptyStats());
    const addStat = (player: Player, key: keyof PlayerStats, amount = 1) => {
      ensureStats(roundStats, player)[key] += amount;
      ensureStats(matchStats, player)[key] += amount;
    };
    const addMatchEvent = (
      event: Omit<MatchEvent, 'id' | 'priority' | 'expiresAt'>,
      now: number,
    ) => {
      const priority = event.kind === 'rescue' ? 2 : 1;
      const duration =
        event.kind === 'tag'
          ? 2100
          : event.kind === 'rescue'
            ? 2500
            : 1800;
      matchEvents = matchEvents.filter((item) => item.expiresAt > now);
      if (matchEvents.length > 0) {
        if (priority < matchEvents[0].priority) return;
        matchEvents = [];
      }
      matchEvents.push({
        ...event,
        id: ++matchEventId,
        priority,
        expiresAt: now + duration,
      });
      matchEvents.sort(
        (a, b) => b.priority - a.priority || b.id - a.id,
      );
    };
    const requestRescue = (now: number,requester=players[0]) => {
      if (
        requester.state !== 'PRISONER' ||
        rescueRequest ||
        now < rescueRequestCooldownUntil
      )
        return;
      const assignedRescuer = players
        .filter(
          (player) =>
            (network?player.controller==='bot':!player.controlled) &&
            player.team === requester.team &&
            player.state === 'ACTIVE' &&
            distance(player, bases[other(player.team)]) > baseRadius * 1.25,
        )
        .sort((a, b) => distance(a, requester) - distance(b, requester))[0];
      rescueRequest = {
        requesterId: requester.id,
        team: requester.team,
        expiresAt: now + 6000,
        assignedRescuerId: assignedRescuer?.id,
      };
      rescueRequestCooldownUntil = now + 10000;
      addMatchEvent(
        {
          kind: 'rescue-request',
          actorName: requester.name,
          actorTeam: requester.team,
        },
        now,
      );
      burst(requester.x, requester.y - 26, '#f5cf45', 18);
      gameplayAudio.play('rescue', 0.38);
      log(`${requester.name} meminta bantuan rescue.`);
    };
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
      logs = [text, ...logs].slice(0, 5);
    };
    const chargeUltimate = (actor: Player, amount: number) => {
      if(network)networkUltimates.gain(actor,amount,ULTIMATE_CHARACTER_IDS);
      else ultimateMeter = gainUltimate(ultimateMeter, actor, amount, ULTIMATE_CHARACTER_IDS);
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
          (!studioQueries || (!studioQueries.solidAt(x, y, 28) && !studioQueries.waterAt(x, y))) &&
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
      if(network)networkUltimates.reset();
      gameplayAudio.resetTagStreak();
      countdownSoundPlayed = false;
      clearMouse();
      players = makePlayers();
      roundStats = makeStatsStore();
      matchEvents = [];
      rescueRequest = null;
      rescueRequestCooldownUntil = 0;
      players.forEach((player) => ensureStats(matchStats, player));
      seedRefills();
      timer = 240;
      exitCounter = 0;
      totalCapture = { blue: 0, red: 0 };
      suddenDeath = false;
      roundWinner = undefined;
      roundEndReason = '';
      resultWinner = undefined;
      resultAnnouncementUntil = 0;
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
      const resultNow = performance.now();
      const outcome = endRound(players, score, phase, team, reason, resultNow);
      if (!outcome) return;
      roundWinner = team;
      roundEndReason = reason;
      phase = outcome.phase;
      matchEvents = [];
      resultWinner = team;
      resultAnnouncementUntil = resultNow + 1500;
      if (phase === 'MATCH_OVER') {
        try {
          const stats = pendingProfileStatsRef.current;
          if (matchId && !network) setMatchProgressionResult(recordMatchProgression({ matchId, arenaId: field.id, completed: true,
            won: team === players[0].team, tags: stats.tagMusuh, rescues: stats.rescueTeam,
            timesCaptured: stats.masukPenjara }));
        } catch (error) {
          setContentGateError(error instanceof Error ? error.message : 'Reward gagal disimpan.');
        }
        pendingProfileStatsRef.current = { ...EMPTY_KDA };
        if(!network)completedMatchesRef.current++;
        fieldRotationPending = completedMatchesRef.current >= 3;
      }
      phaseUntil = outcome.phaseUntil;
      if(network&&!clientOnly)publishNetworkFacts([{type:outcome.type,team,reason}]);
      if(network&&phase==='MATCH_OVER'){
        const packet=createMatchResult(readCanonicalState(resultNow),humanIdentities,disconnectedPeers);
        network.publishResult(packet);
        try{const handed=resultHandoff!(packet);if(handed.result)setMatchProgressionResult(handed.result);}
        catch(error){pendingMatchResult=packet;lastResultAttempt=resultNow;setContentGateError(error instanceof Error?error.message:'Reward multiplayer belum tersimpan.');}
      }
      // Persistence above is not a presentation subscriber; event payload omits
      // internal phaseUntil=Infinity so this boundary remains finite JSON data.
      presentGameEvents([{type:outcome.type,team:outcome.team,reason:outcome.reason}],event=>{
      if(event.type!=='ROUND_ENDED'&&event.type!=='MATCH_ENDED')return;
      gameplayAudio.resetTagStreak();
      if (reason === 'BENTENG DIREBUT') gameplayAudio.play('fort-captured', team === players[0].team ? 1 : .55);
      if(event.type==='MATCH_ENDED')gameplayAudio.play(team === players[0].team ? 'victory' : 'defeat');
      announcement =
        phase === 'MATCH_OVER'
          ? `${teamName(team).toUpperCase()} MENANG MATCH${fieldRotationPending ? ' · FIELD BERIKUTNYA' : ''}`
          : `${teamName(team).toUpperCase()} MENANG · ${reason}`;
      beep(team === 'blue' ? 720 : 320, 0.25);
      burst(worldWidth / 2, worldHeight / 2, TEAM_COLOR[team], 38);
      log(announcement);
      });
    };
    const fortOccupant = (baseTeam:Team,exceptId?:string) =>
      coreFortOccupant(players,bases,baseRadius,baseTeam,isKanalField(field.id),exceptId);
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
    // Kanal's prison uses a thin U-frame: walls block traversal, while the
    // wide front gate and entire interior remain open for rescues. No other
    // arena receives these additional collision rules.
    const kanalPrisonWalls: Obstacle[] = isKanalField(field.id) ? createKanalPrisonWalls(field.prisons) : [];
    const solidObstacles = [...obstacles, ...kanalPrisonWalls];
    const recoveryObstacles = studioMap ? [
      ...studioMap.objects.filter(o=>o.nativeCollision&&o.shape==='polygon'&&['solid','parkour'].includes(o.behavior)).flatMap(collisionRects),
      ...solidObstacles,
    ] : solidObstacles;
    const obstacleAt = createRectQuery(solidObstacles);
    const flightObstacleAt = createRectQuery(solidObstacles.filter(o=>!flightPassesObstacle(o)));
    const kanalFortPolygons = isKanalField(field.id)
      ? Object.values(bases).map(base => kanalFortPolygon(base, fortWidth, fortHeight, fortAnchorY))
      : [];
    const kanalFortRects = kanalFortPolygons.flatMap(polygon => polygonToRects(polygon));
    const fortRectAt = createRectQuery(kanalFortRects);



    const hasLineOfSight = (a: Player, b: Player) => {
      if (solidObstacles.some((o) => segmentHitsRect(a, b, o))) return false;
      if (studioMap) {
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
        for (let i = 0; i <= steps; i++) {
          if (studioQueries!.solidAt(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, 2)) return false;
        }
      }
      return true;
    };
    const hitsObstacle = (x: number, y: number) =>
      (studioQueries ? studioQueries.solidAt(x, y, PLAYER_COLLISION_RADIUS) : false) || obstacleAt(x,y,PLAYER_COLLISION_RADIUS);
    // The fort core is solid while its capture circle remains walkable. This
    // prevents walking through the tower but preserves the original base
    // entry, capture, and return rules.
    const isInsideFortCore = (x: number, y: number) =>
      isKanalField(field.id)
        ? fortRectAt(x,y,PLAYER_COLLISION_RADIUS)
        : Object.values(bases).some(
        (base) => Math.hypot(x - base.x, y - base.y) < Math.max(48, fortWidth * (isKanalField(field.id) ? 0.48 : 0.38)),
      );
    const isWaterAt = (x: number, y: number) => {
      if (studioQueries) return studioQueries.waterAt(x, y);
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
    const kanalWaterBlocks = (x: number, y: number) => {
      if (isWaterAt(x, y)) return true;
      for (let side = 0; side < 16; side++) {
        const angle = side * Math.PI / 8;
        if (isWaterAt(x + Math.cos(angle) * PLAYER_COLLISION_RADIUS, y + Math.sin(angle) * PLAYER_COLLISION_RADIUS)) return true;
      }
      return false;
    };
    const movementWorld: CollisionWorld = {
      width:worldWidth,height:worldHeight,bases,baseRadius,
      kanal:isKanalField(field.id),kanal2:isKanalField(field.id),obstacles:solidObstacles,
      studioSolidAt:studioQueries?.solidAt,waterAt:isWaterAt,waterBlocks:kanalWaterBlocks,
      studioFlightSolidAt:studioQueries?.flightSolidAt,
      obstacleAt,flightObstacleAt,
      fortCoreAt:isInsideFortCore,fortOccupied:(team,id)=>!!fortOccupant(team,id),
      baseChargeTime:p=>CHARACTER_BY_ID[p.characterId].baseChargeTime,
      speedAt:(x,y)=>studioQueries?.speedAt(x,y)??1,
    };
    const waterFallEffects = (p: Player) => {
      burst(p.x, p.y + 7, '#65e9ff', 12);
      if (p.controlled) {
        clearMouse();
        gameplayAudio.play('dash', 0.38);
        log('TERJATUH KE AIR · kembali ke benteng sebentar lagi.');
      }
    };
    const beginKanal2WaterFall = (p: Player, now: number, x: number, y: number) => {
      const fell = enterWaterFall(movementWorld,p,now,x,y);
      if(fell)waterFallEffects(p);
      return fell;
    };
    const isNearWater = (x: number, y: number) =>
      (field.waterMask || studioMap)
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
        isFlying(p) ||
        p.state === 'PRISONER' ||
        (isKanalField(field.id) && p.waterEnteredAt) ||
        now < p.parkourUntil ||
        !hitsObstacle(p.x, p.y)
      )
        return;
      const recovered = depenetrateFromRects(
        p,
        recoveryObstacles,
        PLAYER_COLLISION_RADIUS,
        { minX: 34, maxX: worldWidth - 34, minY: 58, maxY: worldHeight - 32 },
      );
      p.x = recovered.x;
      p.y = recovered.y;
    };
    const blocked = (x:number,y:number,p:Player,now:number) =>
      movementBlocked(movementWorld,x,y,p,now);
    const move = (p:Player,dx:number,dy:number,speed:number,dt:number,now:number,input?:PlayerInputFrame) => {
      const event=input?moveInputActor(movementWorld,p,input,{x:dx,y:dy},speed,dt,now):moveActor(movementWorld,p,dx,dy,speed,dt,now);
      if(event)waterFallEffects(p);
    };
    const spacingPositionAllowed = (p: Player, x: number, y: number) => {
      if (isKanalField(field.id) && (
        kanalWaterBlocks(x, y) || (!isInsideFortCore(p.x, p.y) && isInsideFortCore(x, y))
      )) return false;
      if ((isKanalField(field.id) && isWaterAt(x, y)) || hitsObstacle(x, y)) return false;
      if (
        p.state === 'IN_BASE' &&
        p.baseCharge < CHARACTER_BY_ID[p.characterId].baseChargeTime &&
        distance({ x, y }, bases[p.team]) >= baseRadius
      )
        return false;
      return true;
    };
    const resolvePlayerSpacing = (now: number) => {
      const visible = players.filter((p) => !flightBusy(p) && p.state !== 'PRISONER' && !(isKanalField(field.id) && p.waterEnteredAt));
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
    const directionIsTraversable = (
      p: Player,
      direction: { x: number; y: number },
      distanceToProbe: number,
      now: number,
    ) => {
      const magnitude = Math.hypot(direction.x, direction.y);
      if (magnitude < 0.01) return true;
      const unitX = direction.x / magnitude;
      const unitY = direction.y / magnitude;
      const samples = Math.max(5, Math.ceil(distanceToProbe / 14));
      for (let step = 1; step <= samples; step += 1) {
        const distanceAlong = (distanceToProbe * step) / samples;
        const x = p.x + unitX * distanceAlong;
        const y = p.y + unitY * distanceAlong;
        if (blocked(x, y, p, now) || isWaterAt(x, y)) return false;
      }
      return true;
    };
    const studioRoutes = new Map<string,{target:{x:number;y:number};route:Array<{x:number;y:number}>;until:number}>();
    const routeScheduler = createRouteScheduler();
    const navigateAroundHazards = (
      p: Player,
      desired: { x: number; y: number },
      now: number,
      probeDistance: number,
      turnBias: number,
    ) => {
      if (studioMap) {
        const target = { x: clamp(p.x + desired.x, 34, worldWidth - 34), y: clamp(p.y + desired.y, 58, worldHeight - 32) };
        const passable = (x: number, y: number) => x >= 34 && y >= 58 && x <= worldWidth-34 && y <= worldHeight-32 && !hitsObstacle(x,y) && (!isKanalField(field.id)||!isInsideFortCore(x,y)) && !studioQueries!.waterAt(x,y);
        const cached = studioRoutes.get(p.id);
        if (!cached || now > cached.until || distance(target,cached.target)>100) {
          routeScheduler.request(p.id,()=>{
            if(p.state==='PRISONER' || flightBusy(p)) {studioRoutes.delete(p.id);return;}
            const route = clickRoute(p,target,worldWidth,worldHeight,passable,40);
            studioRoutes.set(p.id,{target,route,until:performance.now()+1800});
          });
        } else {
          routeScheduler.cancel(p.id);
        }
        const route = studioRoutes.get(p.id)?.route;
        while(route?.length && distance(p,route[0])<18) route.shift();
        if(route?.[0]) return {x:route[0].x-p.x,y:route[0].y-p.y};
      }
      const magnitude = Math.hypot(desired.x, desired.y);
      if (magnitude < 0.01) return desired;
      const distanceToProbe = Math.min(probeDistance, Math.max(48, magnitude));
      if (directionIsTraversable(p, desired, distanceToProbe, now))
        return desired;
      const baseAngle = Math.atan2(desired.y, desired.x);
      const side = turnBias >= 0 ? 1 : -1;
      for (const offset of [0.38, -0.38, 0.7, -0.7, 1.02, -1.02, 1.42, -1.42]) {
        const angle = baseAngle + offset * side;
        const candidate = {
          x: Math.cos(angle) * magnitude,
          y: Math.sin(angle) * magnitude,
        };
        if (directionIsTraversable(p, candidate, distanceToProbe, now))
          return candidate;
      }
      const fallback = steerAroundRects(
        p,
        desired,
        obstacles,
        PLAYER_COLLISION_RADIUS,
        probeDistance,
        turnBias,
      );
      return directionIsTraversable(p, fallback, distanceToProbe, now)
        ? fallback
        : { x: 0, y: 0 };
    };
    const findParkourLanding = (p:Player,direction:{x:number;y:number},nominalDistance:number,now:number) =>
      parkourLanding(movementWorld,p,direction,nominalDistance,now);
    const resetFallenPlayer = (p: Player, now: number) => {
      p.flight = null;
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
      p.waterEnteredAt = 0;
      p.waterFallUntil = 0;
      burst(p.x, p.y, '#60e6ff', 14);
      if (p.controlled) {
        beep(210, 0.16);
        log('OOOPSS... HATI-HATI · kembali ke benteng.');
      }
    };
    const riverFallCheck = (now: number) => {
      if (!studioMap && (!field.waterMask || !waterMaskPixels)) return;
      if (isKanalField(field.id)) {
        players.forEach((p) => {
          if (p.waterEnteredAt) {
            if (now - p.waterEnteredAt >= KANAL2_FALL_RESET_MS) resetFallenPlayer(p, now);
            return;
          }
          if (isFlying(p) || p.state === 'PRISONER' || now < p.parkourUntil || now < p.fallSafeUntil || !isWaterAt(p.x, p.y)) return;
          beginKanal2WaterFall(p, now, p.x, p.y);
        });
        return;
      }
      players.forEach((p) => {
        if (
          isFlying(p) ||
          p.state === 'PRISONER' ||
          now < p.parkourUntil ||
          now < p.fallSafeUntil ||
          !isWaterAt(p.x, p.y)
        )
          return;
        resetFallenPlayer(p, now);
      });
    };
    const botAuthority = createBotAuthority();
    const simulationAuthority: 'host' | 'client' = clientOnly?'client':'host';
    const layoutPrisons = () => layoutPrisoners(players,field.prisons,isKanalField(field.id));
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
    const interactionRules = {
      kanal2:isKanalField(field.id),
      tagRange:(p:Player)=>CHARACTER_BY_ID[p.characterId].tagRange,
      tagCooldownMs:(p:Player)=>CHARACTER_BY_ID[p.characterId].tagCooldownMs,
      lineOfSight:hasLineOfSight,
    };
    const presentInteractionEvents = (events:readonly GameEvent[],now:number) => {
      if(network&&!clientOnly)publishNetworkFacts(events);
      presentGameEvents(events,event=>{
      if(event.type==='PLAYER_TAGGED'||event.type==='PLAYER_CAPTURED'){
        const winner=players.find(p=>p.entityId===event.actorId),loser=players.find(p=>p.entityId===event.targetId);
        if(!winner||!loser)return;
        if(event.type==='PLAYER_TAGGED'){
          addMatchEvent({kind:'tag',actorName:winner.name,actorTeam:winner.team,targetName:loser.name,targetTeam:loser.team},now);
          burst(event.x,event.y,TEAM_COLOR[winner.team]);
        } else {
          if(loser.controlled){gameplayAudio.resetTagStreak();gameplayAudio.play('caught');}
          else if (winner.controlled) gameplayAudio.playerTag(now);
          else if(distance(players[0],loser)<300)gameplayAudio.play('tag',.22);
          log(`${winner.name} #${winner.exitOrder} menangkap ${loser.name} #${loser.exitOrder}.`);
        }
      } else if(event.type==='PLAYER_RESCUED'){
        const rescuer=players.find(p=>p.entityId===event.actorId);
        const held=event.targetIds.map(id=>players.find(p=>p.entityId===id)).filter((p):p is Player=>!!p);
        if(!rescuer||!held.length)return;
        if(rescuer.controlled)gameplayAudio.play('rescue');
        addMatchEvent({kind:'rescue',actorName:rescuer.name,actorTeam:rescuer.team,
          targetName:held.length===1?held[0].name:undefined,targetTeam:held.length===1?held[0].team:undefined,rescuedCount:held.length},now);
        burst(event.x,event.y,'#b9ee3d',26);
        if(held.some(p=>p.controlled)||rescuer.controlled)gameplayAudio.play('rescued');
        else if(distance(players[0],rescuer)<300)gameplayAudio.play('rescued',.25);
        log(`${rescuer.name} membebaskan ${held.length} rekan.`);
      } else if(event.type==='FORCED_EXIT'||event.type==='BOOST_RECOVERED'){
        const p=players.find(p=>p.entityId===event.actorId);if(!p)return;
        if(event.type==='FORCED_EXIT')log(`${p.name} dipaksa keluar—grace 5 detik habis.`);
        else if(p.controlled){log(`Boost ${p.name} pulih penuh setelah 20 detik.`);beep(690,.13);}
      } else if(event.type==='FORT_ENTERED'){
        if(event.actorId===players[0].entityId)gameplayAudio.play('fort-enter');
      }
      });
    };
    const presentNetworkUltimate = (events:readonly GameEvent[])=>{
      for(const event of events){if(event.type!=='ULTIMATE_STARTED'&&event.type!=='ULTIMATE_APPLIED')continue;
        const actor=players.find(p=>p.entityId===event.actorId);if(!actor)continue;
        if(event.type==='ULTIMATE_STARTED'){
          gameplayAudio.play('ultimate');burst(actor.x,actor.y,TEAM_COLOR[actor.team],14);log(`${actor.name} mengaktifkan ${ultimateName(actor.characterId)}.`);
          if(actor.controlled){boostBurstUntil=0;clearMouse();setUltimateBannerVisible(true);window.clearTimeout(bannerTimeout);bannerTimeout=window.setTimeout(()=>setUltimateBannerVisible(false),1050);}
        }else {burst(actor.x,actor.y,event.effect==='shield'?'#35f477':'#ef233c',28);log(`${actor.name} · ${event.effect==='shield'?'PERISAI HIJAU':'TITAH HALILINTAR'} ${event.durationMs/1000} detik.`);}
      }
    };
    const capture = (winner:Player,loser:Player,now:number) => {
      const events:GameEvent[]=[];
      if(!resolveTag(players,winner.entityId,loser.entityId,now,interactionRules,facts=>events.push(...facts)))return;
      addStat(winner, 'tags');
      addStat(loser, 'prisons');
      if (winner.controlled) pendingProfileStatsRef.current.tagMusuh++;
      if (loser.controlled) pendingProfileStatsRef.current.masukPenjara++;
      presentInteractionEvents(events,now);
      registerTeamAction(winner, 'TAG', loser.x, loser.y, now);
      chargeUltimate(winner, RAJA_ULTIMATE_TAG_BONUS);
      if (winner.controlled) mission.tag = true;
      layoutPrisons();
      const tagOutcome=suddenDeathTagWinner(suddenDeath,winner.team);
      if(tagOutcome)winRound(tagOutcome.team,tagOutcome.reason);
    };
    const tagCheck = (now:number) => {
      const contacts=tagContacts(players,now,interactionRules);
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
        .filter((p) => !flightBusy(p) && p.state === 'ACTIVE' && !(isKanalField(field.id) && p.waterEnteredAt))
        .forEach((rescuer) => {
          const rescuerStats = CHARACTER_BY_ID[rescuer.characterId];
          const events:GameEvent[]=[];
          const event=resolveRescue(players,rescuer.entityId,now,{
            kanal2:isKanalField(field.id),range:rescuerStats.rescueRange,shieldMs:rescuerStats.rescueShieldMs,
          },facts=>events.push(...facts));
          if(event?.type==='rescue') {
            const held=event.targetIds.map(id=>players.find(p=>p.entityId===id)!);
            addStat(rescuer, 'rescues');
            if (rescuer.controlled) pendingProfileStatsRef.current.rescueTeam++;
            if (
              rescueRequest &&
              held.some((player) => player.id === rescueRequest?.requesterId)
            )
              rescueRequest = null;
            presentInteractionEvents(events,now);
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
            !flightBusy(p) &&
            p.state === 'ACTIVE' &&
            !(isKanalField(field.id) && p.waterEnteredAt) &&
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
    const baseCheck = (p:Player,dt:number,now:number,exitCandidates:Player[]) => {
      const stats=CHARACTER_BY_ID[p.characterId];
      const facts:GameEvent[]=[];
      const events=resolveBase(players,p,dt,now,exitCandidates,{
        bases,radius:baseRadius,kanal2:isKanalField(field.id),boost:stats.boost,
        chargeTime:stats.baseChargeTime,reentryMs:BASE_REENTRY_COOLDOWN_MS,tieHash,
      },events=>facts.push(...events));
      presentInteractionEvents(facts,now);
      for(const event of events) {
        if(event.type==='objective')winRound(event.team,event.reason);
      }
    };
    const update = (dt: number, now: number) => {
      const input = localInput.sample(players[0].entityId, keys.current, mouseBoost, mouseRoute.at(-1));
      if(network)input.pause=false;
      const humanFrames=new Map<string,PlayerInputFrame>();
      if(network){humanFrames.set(myEntityId,input);for(const p of players)if(p.controller==='remote')humanFrames.set(p.entityId,remoteInputs.sample(p.entityId,now));}
      gameplayAudio.expireTagStreak(now);
      if (input.pause) {
        keys.current.delete('p');
        paused = !paused;
      }
      if (paused || mode !== 'playing') { clearMouse(); return; }
      if (phase !== 'PLAYING') clearMouse();
      const transition = phaseTransition(phase, phaseUntil, now, postRoundActionRef.current === 'next-round');
      if (transition === 'countdown' || transition === 'start-round') {
        if (!countdownSoundPlayed && now < phaseUntil) countdownSoundPlayed = gameplayAudio.playCountdown((phaseUntil - now) / 1000);
        announcement = `${Math.max(1, Math.ceil((phaseUntil - now) / 1000))}`;
        if (transition === 'start-round') {
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
      if (transition === 'next-round') {
        postRoundActionRef.current = null;
        round++;
        resetRound();
        return;
      }
      if (transition === 'finished') {
        return;
      }
      if (
        rescueRequest &&
        (now >= rescueRequest.expiresAt ||
          players.find((player) => player.id === rescueRequest?.requesterId)
            ?.state !== 'PRISONER')
      )
        rescueRequest = null;
      if (input.rescue) {
        keys.current.delete('r');
        requestRescue(now);
      }
      if(network)for(const p of players)if(p.controller==='remote'&&humanFrames.get(p.entityId)?.rescue)requestRescue(now,p);
      const wasSuddenDeath = suddenDeath;
      const timerResult = stepMatchTimer(players, timer, suddenDeath, dt);
      timer = timerResult.timer;
      suddenDeath = timerResult.suddenDeath;
      if (timerResult.winner) winRound(timerResult.winner.team, timerResult.winner.reason);
      else if (!wasSuddenDeath && suddenDeath) {
          announcement = 'SUDDEN DEATH';
          log('Skor seri—tag atau rebut benteng berikutnya menang.');
          beep(760, 0.22);
      }
      if(network&&phase!=='PLAYING')return;
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
      const config = flightConfig(me.characterId);
      const flightGroundValid = (x:number,y:number) => x>=34 && x<=worldWidth-34 && y>=58 && y<=worldHeight-32 && !hitsObstacle(x,y) && !isInsideFortCore(x,y) && !kanalWaterBlocks(x,y);
      if(network){
        const stepped=networkUltimates.tick(players,humanFrames,dt,now,networkUltimateRules,
          (p,slot,elapsed,fallback)=>sequenceComplete(studioFlightClip(p.characterId,slot,p.flight?.direction),elapsed,fallback),flightGroundValid,p=>resetFallenPlayer(p,now));
        publishNetworkFacts(stepped.facts);presentNetworkUltimate(stepped.facts);
        const own=networkUltimates.get(myEntityId)!;ultimateMeter=own.meter;ultimateImpactAt=own.impactAt;ultimateImpactApplied=own.impactApplied;
        ultimateBuffUntil=own.buffUntil;ultimateShieldUntil=own.shieldUntil;
        if(input.ultimate)keys.current.delete('capslock');
        if(stepped.casting){clearMouse();freezeUltimateActors(players);return;}
      }
      const flightHook = (name:string, data:{stage:string;remaining:number;distance:number}|null|undefined=me.flight) => {
        if (development) console.debug(name, me.characterId, data?.stage, data?.remaining);
        window.dispatchEvent(new CustomEvent('benteng-flight',{detail:{name,characterId:me.characterId,stage:data?.stage,remaining:data?.remaining,distance:data?.distance}}));
        // Optional audio/VFX hooks: no final flight samples are supplied yet.
        if (name === 'flight_warning_sfx') beep(380,.08);
      };
      if (!network && me.flight && config) {
        const slot=flightSlot(me.flight,config)!;
        const completion=sequenceComplete(studioFlightClip(me.characterId,slot,me.flight.direction), (me.flight.elapsed+dt)*1000, me.flight.stage==='FLIGHT_TAKEOFF'?config.takeoffSeconds:config.landingSeconds);
        const flightResult=stepFlight(me,config,dt,completion,flightGroundValid);
        if(flightResult.landingFailed){resetFallenPlayer(me,now);me.flight=null;}
        for(const fact of flightResult.facts)flightHook(fact.name,fact);
      }
      let dx = 0,
        dy = 0;
      // Numeric match snapshot feeds authority; presentation consumes returned facts.
      const ultimateState = {meter:ultimateMeter,impactAt:ultimateImpactAt,impactApplied:ultimateImpactApplied,buffUntil:ultimateBuffUntil,shieldUntil:ultimateShieldUntil};
      const ultimateRules = {
        supported:ULTIMATE_CHARACTER_IDS,kanal2:isKanalField(field.id),
        rechargeSeconds:playerUltimateStats?.rechargeSeconds ?? RAJA_ULTIMATE_RECHARGE_SECONDS,
        castMs:ultimateCastMsFor(me),
        durationMs:playerUltimateStats?.durationMs ?? (me.characterId==='kaka'?KAKA_ULTIMATE_SHIELD_MS:RAJA_ULTIMATE_BUFF_MS),
        speedMultiplier:playerUltimateStats?.speedMultiplier ?? RAJA_ULTIMATE_SPEED_MULTIPLIER,
      };
      const ultimateFacts = network?[]:stepUltimate(players,me,ultimateState,dt,now,input.ultimate,ultimateRules);
      if(input.ultimate)keys.current.delete('capslock');
      ultimateMeter=ultimateState.meter;ultimateImpactAt=ultimateState.impactAt;ultimateImpactApplied=ultimateState.impactApplied;
      ultimateBuffUntil=ultimateState.buffUntil;ultimateShieldUntil=ultimateState.shieldUntil;
      presentGameEvents(ultimateFacts,fact=>{
        if(fact.type==='ULTIMATE_STARTED') {
          boostBurstUntil=0;gameplayAudio.play('ultimate');
          if(fact.flight){clearMouse();flightHook('onFlightTakeoff');flightHook('flight_takeoff_sfx');}
          setUltimateBannerVisible(true);window.clearTimeout(bannerTimeout);
          bannerTimeout=window.setTimeout(()=>setUltimateBannerVisible(false),!fact.flight&&me.characterId==='kaka'?1050:820);
          if(fact.flight)log(`${me.name} mengaktifkan ${ultimateName(me.characterId)}.`);
          else {
            const isKaka=me.characterId==='kaka';
            burst(me.x,me.y,isKaka?'#35f477':'#ef233c',14);
            log(isKaka?'KAKA membangkitkan PERISAI HIJAU.':'RAJA memanggil TITAH HALILINTAR.');
          }
        } else if(fact.type==='ULTIMATE_APPLIED'&&fact.effect==='shield') {
          burst(me.x,me.y,'#35f477',34);burst(me.x,me.y,'#baffc9',18);beep(540,.32);
          log(`PERISAI HIJAU · seluruh rekan kebal TAG selama ${fact.durationMs/1000} detik.`);
        } else if(fact.type==='ULTIMATE_APPLIED') {
          burst(me.x,me.y,'#ef233c',28);burst(me.x,me.y,'#b54a32',18);beep(118,.32);
          log(`TITAH HALILINTAR · seluruh rekan ACTIVE bergerak +${Math.round((fact.speedMultiplier-1)*100)}% selama ${fact.durationMs/1000} detik.`);
        }
      });
      const ultimateCasting = coreUltimateCasting(me,now,ULTIMATE_CHARACTER_IDS);
      const rajaUltimateMultiplier = (player:Player) =>
        network?networkUltimates.speed(player,players,now,networkUltimateRules):ultimateSpeed(player,me,now,ultimateBuffUntil,playerUltimateStats?.speedMultiplier ?? RAJA_ULTIMATE_SPEED_MULTIPLIER);
      const playerComboMultiplier = teamComboSpeedMultiplier(
        teamCombos[me.team],
        now,
      );
      if (ultimateCasting && !config) {
        clearMouse();
        freezeUltimateActors(players);
        boostLatch = input.keyboardSprint;
        parkourLatch = input.parkour;
        return;
      }
      dx = input.moveX;
      dy = input.moveY;
      if (flightBusy(me) && !isFlying(me)) {dx=0;dy=0;clearMouse();}
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
      const sprintPulse = input.sprintPulse && mouseBoost;
      const boostKey = input.keyboardSprint || sprintPulse;
      if (
        boostKey &&
        !flightBusy(me) &&
        (!boostLatch || sprintPulse) &&
        me.boost > 0 &&
        !(isKanalField(field.id) && me.waterEnteredAt) &&
        (me.state === 'ACTIVE' || me.state === 'IN_BASE')
      )
        boostBurstUntil = now + GAME_RULES.boostDurationMs;
      boostLatch = boostKey;
      mouseBoost = false;
      const boosting =
        !flightBusy(me) &&
        now < boostBurstUntil &&
        me.boost > 0 &&
        !(isKanalField(field.id) && me.waterEnteredAt) &&
        (dx || dy) &&
        (me.state === 'ACTIVE' || me.state === 'IN_BASE');
      if (boosting) {
        drainBoost(me, selected.boostDrain * (playerComboMultiplier > 1 ? 0.8 : 1), dt, now);
        mission.boost = true;
      }
      const parkourKey = input.parkour;
      const parkourCost = 8 / selected.agility;
      if (
        parkourKey &&
        !flightBusy(me) &&
        !parkourLatch &&
        me.boost >= parkourCost &&
        now > me.parkourUntil &&
        !(isKanalField(field.id) && me.waterEnteredAt) &&
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
          ) || isNearWater(me.x, me.y) || !!studioMap?.objects.some(o => o.behavior === 'parkour' && studioContains({...o,x:o.x-40,y:o.y-40,w:o.w+80,h:o.h+80},me.x,me.y));
        if (near) {
          const parkourDistance = 54 * selected.agility;
          const landing = findParkourLanding(
            me,
            { x: dx, y: dy },
            parkourDistance,
            now,
          );
          if (landing) {
            me.parkourUntil = now + 360;
            me.fallSafeUntil = now + (landing.crossedWater ? 620 : 430);
            me.boost = Math.max(0, me.boost - parkourCost);
            me.boostReadyAt = now + 20000;
            me.x = landing.x;
            me.y = landing.y;
            mission.parkour = true;
            burst(me.x, me.y, landing.crossedWater ? '#65e9ff' : '#f4df9a', 9);
            beep(460);
          }
        }
      }
      parkourLatch = parkourKey;
      const mouseBefore = { x: me.x, y: me.y };
      if(isFlying(me) && config) {
        const steering=steerFlight(me.flight!,dx,dy,dt,config.turnMultiplier);
        dx=steering.x;dy=steering.y;
      }
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
          input,
        );
      } else if ((dx || dy) && me.state !== 'PRISONER')
        move(
          me,
          dx,
          dy,
          Math.min(mouseDistance / Math.max(dt, .001), selected.speed *
            (isFlying(me) && config ? config.speedMultiplier : 1) *
            playerComboMultiplier *
            rajaUltimateMultiplier(me) *
            (boosting ? selected.boostMultiplier : 1)),
          dt,
          now,
          input,
        );
      else {
        me.vx = 0;
        me.vy = 0;
      }
      if (mouseRoute.length) {
        mouseStuckTime = distance(me, mouseBefore) < .1 ? mouseStuckTime + dt : 0;
        if (mouseStuckTime > .6) clearMouse();
      }
      if(me.flight){me.flight.distance+=distance(me,mouseBefore);if(isFlying(me)&&flightGroundValid(me.x,me.y))me.flight.lastGround={x:me.x,y:me.y};}
      for(const p of players)if(p.controller==='remote'||network&&p.controller==='bot'&&p.flight)remoteMovement(p,humanFrames.get(p.entityId)??localInput.sample(p.entityId,new Set()),CHARACTER_BY_ID[p.characterId],dt,now,{
        move,landing:findParkourLanding,near:p=>obstacles.some(o=>p.x+44>o.x&&p.x-44<o.x+o.w&&p.y+44>o.y&&p.y-44<o.y+o.h)||isNearWater(p.x,p.y)||!!studioMap?.objects.some(o=>o.behavior==='parkour'&&studioContains({...o,x:o.x-40,y:o.y-40,w:o.w+80,h:o.h+80},p.x,p.y)),
        returnVector:(p,now)=>navigateAroundHazards(p,baseVector(p),now,104,Math.sin(p.aiSeed+now/1700)),
        combo:(p,now)=>teamComboSpeedMultiplier(teamCombos[p.team],now)*rajaUltimateMultiplier(p),water:isKanalField(field.id),boostDurationMs:GAME_RULES.boostDurationMs,groundValid:flightGroundValid,
      });
      botAuthority.run(simulationAuthority,{
        players,bases,width:worldWidth,height:worldHeight,refills,request:rescueRequest,
        kanal2:isKanalField(field.id),localTeam:me.team,profile:aiProfile,boostThreshold:AI_BOOST_THRESHOLD,
        navigate:navigateAroundHazards,
      },now,(p,intent)=>{
        if(network&&p.flight)return;
        if(intent.blocked){p.vx=0;p.vy=0;return;}
        const stats=CHARACTER_BY_ID[p.characterId];
        if(intent.frame.sprint)drainBoost(p,stats.boostDrain*AI_BOOST_DRAIN_MULTIPLIER,dt,now);
        const comboMultiplier=teamComboSpeedMultiplier(teamCombos[p.team],now);
        move(p,intent.frame.moveX,intent.frame.moveY,
          stats.speed*comboMultiplier*rajaUltimateMultiplier(p)*AI_SPEED_MULTIPLIER*(intent.frame.sprint?stats.boostMultiplier:1),
          dt,now,intent.frame);
      });
      resolvePlayerSpacing(now);
      riverFallCheck(now);
      // Only actual grounded movement produces footsteps (not pressing into a wall).
      const travelled = previousSoundPosition ? distance(me, previousSoundPosition) : 0;
      previousSoundPosition = { x: me.x, y: me.y };
      const grounded = !flightBusy(me) && now >= me.parkourUntil && me.state !== 'PRISONER';
      const movingForSound = grounded && travelled > .15 && travelled < 35;
      if (movingForSound && now - lastFootstep > (boosting ? 170 : 270)) {
        gameplayAudio.play('step', boosting ? .8 : .6);
        lastFootstep = now;
      }
      if (boosting && !wasDashing && movingForSound) gameplayAudio.play('dash');
      wasDashing = Boolean(boosting && movingForSound);
      if (me.state === 'PRISONER') gameplayAudio.play('prison');
      presentInteractionEvents(fortEntryEvents(players,bases,baseRadius,fortOccupancy),now);
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
      for(const event of resolveAllHeld(players,totalCapture,dt)) {
        if(event.type==='objective')winRound(event.team,event.reason);
      }
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
    const drawNearbyFieldDetails = (me: Player, activeCamera: CameraMode) => {
      if (studioMap) {
        studioLayers.background.forEach(o=>{if(objectVisible(o))drawMapObject(ctx,o,performance.now());});
      }
      if (mode !== 'playing' && !isKanalField(field.id)) return;
      // Kanal has few props, so draw every one at native atlas resolution in
      // both cameras. This also prevents props vanishing at the view edge.
      const showEverything = activeCamera === 'overview' || isKanalField(field.id);
      const radiusSquared = NEAR_FIELD_DETAIL_RADIUS * NEAR_FIELD_DETAIL_RADIUS;
      const isNearby = (x: number, y: number, w: number, h: number) => {
        if(isKanalField(field.id))return x+w>=visibleWorld.left&&x<=visibleWorld.right&&y+h>=visibleWorld.top&&y<=visibleWorld.bottom;
        if (showEverything) return true;
        const dx = x + w / 2 - me.x,
          dy = y + h / 2 - me.y;
        return dx * dx + dy * dy <= radiusSquared;
      };
      field.decorations.forEach((item) => {
        if (
          !item.underlay &&
          (isKanalField(field.id) || !showEverything) &&
          isNearby(item.x, item.y, item.w, item.h)
        )
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
      visualObstacles.forEach((item) => {
        if (
          (!isKanalField(field.id) && showEverything) ||
          item.hidden ||
          item.underlay ||
          !isNearby(item.x+item.w/2-item.visualW/2, item.y+item.h-item.visualH, item.visualW, item.visualH)
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
          !field.basesInBackground &&
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
    const drawKanalWater = (now: number) => {
      if (!isKanalField(field.id) || !waterMaskPixels) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.3;
      ctx.strokeStyle = 'rgba(184, 243, 252, .46)';
      for (let glintIndex = 0; glintIndex < kanalWaterGlints.length; glintIndex += GRAPHICS_PRESETS[quality].waterStride) {
        const glint = kanalWaterGlints[glintIndex];
        if(glint.x<visibleWorld.left-24||glint.x>visibleWorld.right+24||glint.y<visibleWorld.top-24||glint.y>visibleWorld.bottom+24)continue;
        const upper = glint.y < worldHeight * 0.36;
        const lower = glint.y > worldHeight * 0.64;
        const sideways = upper ? 0.55 : lower ? -0.55 : 0;
        const dx = glint.x < worldWidth / 2 ? -sideways : sideways;
        const drift = ((now * 0.018 + glint.phase) % 18) - 9;
        const x = glint.x + dx * drift;
        const y = glint.y + drift;
        if (!isWaterAt(x, y)) continue;
        ctx.globalAlpha = 0.42 + 0.18 * Math.sin(now / 650 + glint.phase);
        ctx.beginPath();
        ctx.moveTo(x - dx * 4, y - 4);
        ctx.lineTo(x + dx * 4, y + 4);
        ctx.stroke();
      }
      // A translucent falling sheet, bright crest, and downstream foam make
      // the two canal drops readable even in the overview camera. This is
      // visual-only; the water mask and movement rules are untouched.
      const sx = worldWidth / (field.designWidth ?? MAP4_GUIDE_WIDTH);
      const sy = worldHeight / (field.designHeight ?? MAP4_GUIDE_HEIGHT);
      for (const drop of [{ y: 94, h: 22 }, { y: 798, h: 34 }]) {
        const x = (isKanalField(field.id) ? kanal2X(849) : 849) * sx;
        const y = drop.y * sy;
        if (!isWaterAt(x, y + 7 * sy)) continue;
        const width = 55 * sx;
        const fallHeight = drop.h * sy;
        const fallingWater = ctx.createLinearGradient(x, y, x, y + fallHeight);
        fallingWater.addColorStop(0, 'rgba(226, 253, 255, .8)');
        fallingWater.addColorStop(0.42, 'rgba(112, 218, 238, .55)');
        fallingWater.addColorStop(1, 'rgba(42, 143, 193, .2)');
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = fallingWater;
        ctx.beginPath();
        ctx.moveTo(x - width * 0.46, y + 2 * sy);
        ctx.lineTo(x + width * 0.46, y + 2 * sy);
        ctx.lineTo(x + width * 0.4, y + fallHeight);
        ctx.lineTo(x - width * 0.4, y + fallHeight);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.82;
        ctx.lineWidth = 3.2 * sx;
        ctx.strokeStyle = 'rgba(239, 255, 255, .9)';
        ctx.beginPath();
        ctx.ellipse(x, y, width / 2, 4 * sy, 0, 0, Math.PI);
        ctx.stroke();
        for (let index = -3; index <= 3; index++) {
          const ribbonX = x + index * 7 * sx;
          const fall = (now / 28 + index * 11) % fallHeight;
          ctx.globalAlpha = 0.3 + 0.12 * Math.sin(now / 330 + index);
          ctx.beginPath();
          ctx.moveTo(ribbonX, y + 3 * sy + fall * 0.42);
          ctx.lineTo(ribbonX + 1.5 * sx, y + 4 * sy + fall);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.62 + 0.08 * Math.sin(now / 260);
        ctx.beginPath();
        ctx.ellipse(x, y + fallHeight, width * 0.43, 5 * sy, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let bubble = -2; bubble <= 2; bubble++) {
          const bob = Math.sin(now / 310 + bubble * 1.7) * 2 * sy;
          ctx.globalAlpha = 0.38 + 0.12 * Math.sin(now / 270 + bubble);
          ctx.beginPath();
          ctx.arc(x + bubble * 10 * sx, y + fallHeight + 6 * sy + bob, 2.6 * sx, 0, Math.PI * 2);
          ctx.fillStyle = '#e7fcff';
          ctx.fill();
        }
      }
      ctx.restore();
    };
    const drawPrisonOverlays = (_now: number) => {
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
    const drawBase = (team: Team, render:RenderFrame) => {
      const b = bases[team],
        color = TEAM_COLOR[team],
        occupant = render.players.find(p=>p.team!==team&&!flightBusy(p)&&p.state==='ACTIVE'&&
          !(isKanalField(field.id)&&p.waterEnteredAt)&&distance(p,b)<baseRadius);
      ctx.strokeStyle = occupant ? '#f5cf45' : color;
      ctx.lineWidth = occupant ? 7 : 4;
      ctx.setLineDash(occupant ? [3, 5] : [8, 7]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const baseLabelY = isKanalField(field.id) ? b.y + baseRadius + 16 : b.y + 130;
      ctx.fillStyle = '#fff3d0';
      ctx.font = '800 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        team === 'blue' ? 'BENTENG MERAH' : 'BENTENG HIJAU',
        b.x,
        baseLabelY,
      );
      if (occupant) {
        ctx.fillStyle = '#f5cf45';
        ctx.font = '900 9px Arial';
        ctx.fillText(`TERKUNCI · ${occupant.name}`, b.x, baseLabelY + 14);
      }
    };
    let debugLayer: HTMLCanvasElement | null = null;
    let debugWaterSource: Uint8ClampedArray | null = null;
    const drawColliderDebug = () => {
      if (!debugColliders || (!isKanalField(field.id))) return;
      if (!debugLayer || debugWaterSource !== waterMaskPixels) {
        debugWaterSource = waterMaskPixels;
        debugLayer = document.createElement('canvas');
        debugLayer.width = Math.ceil(worldWidth);
        debugLayer.height = Math.ceil(worldHeight);
        const layer = debugLayer.getContext('2d')!;
        layer.fillStyle = '#fff';
        if (waterMaskPixels) layer.drawImage(waterMaskCanvas, 0, 0, worldWidth, worldHeight);
        for (const box of [...solidObstacles, ...kanalFortRects]) layer.fillRect(box.x, box.y, box.w, box.h);
        layer.fillRect(0, 0, 34, worldHeight);
        layer.fillRect(worldWidth-34, 0, 34, worldHeight);
        layer.fillRect(0, 0, worldWidth, 58);
        layer.fillRect(0, worldHeight-32, worldWidth, 32);
        const pixels = layer.getImageData(0, 0, debugLayer.width, debugLayer.height);
        const solid = new Uint8Array(debugLayer.width * debugLayer.height);
        for (let i=0; i<solid.length; i++) solid[i] = pixels.data[i*4] > 127 ? 1 : 0;
        for (let i=0; i<solid.length; i++) {
          const x=i%debugLayer.width, y=Math.floor(i/debugLayer.width);
          const edge = solid[i] && (x===0 || y===0 || x===debugLayer.width-1 || y===debugLayer.height-1 ||
            !solid[i-1] || !solid[i+1] || !solid[i-debugLayer.width] || !solid[i+debugLayer.width]);
          pixels.data[i*4] = solid[i] ? 255 : 70;
          pixels.data[i*4+1] = edge ? 242 : solid[i] ? 55 : 220;
          pixels.data[i*4+2] = edge ? 130 : solid[i] ? 60 : 135;
          pixels.data[i*4+3] = edge ? 255 : solid[i] ? 105 : 22;
        }
        layer.putImageData(pixels, 0, 0);
      }
      ctx.save();
      ctx.drawImage(debugLayer, 0, 0, worldWidth, worldHeight);
      ctx.restore();
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

    const relationColor = (p: Player, me: Player, now: number) => {
      if (p.team === me.team) return '#9fd0ff';
      if (p.state === 'PRISONER') return '#8f8d84';
      const relation=tagRelationship(me,p,now,isKanalField(field.id));
      return relation==='protected'?'#60e6ff':relation==='target'?'#b9ee3d':relation==='danger'?'#ff544b':'#f1d46c';
    };
    const studioResolve = createStudioResolver();
    const drawPlayer = (p: Player, me: Player, now: number, render:RenderFrame) => {
      const {phase,roundWinner,ultimateMeter,ultimateBuffUntil,teamCombos}=render;
      const color = TEAM_COLOR[p.team],
        outline = relationColor(p, me, now),
        sinking = isKanalField(field.id) && p.waterEnteredAt > 0,
        waterFall = now < p.waterFallUntil,
        fallProgress = sinking
          ? clamp((now - p.waterEnteredAt) / 720, 0, 1)
          : waterFall ? 1 - (p.waterFallUntil - now) / 720 : 0,
        bob = flightBusy(p)
          ? -(flightConfig(p.characterId)?.visualHeight ?? 24) * (isFlying(p) ? 1 : p.flight?.stage === 'FLIGHT_TAKEOFF' ? Math.min(1,p.flight.elapsed/(flightConfig(p.characterId)?.takeoffSeconds??.7)) : Math.max(0,1-p.flight!.elapsed/(flightConfig(p.characterId)?.landingSeconds??.4)))
          : now < p.parkourUntil
          ? -15
          : waterFall
            ? Math.sin(fallProgress * Math.PI / 2) * 12
            : 0;
      const stats = CHARACTER_BY_ID[p.characterId],
        image = getSpriteImage(p.characterId),
        speed = Math.hypot(p.vx, p.vy);
      const inWater =
        p.state !== 'PRISONER' &&
        !flightBusy(p) &&
        now >= p.parkourUntil &&
        isWaterAt(p.x, p.y);
      const animation = characterAnimationMapping(p.characterId);
      // Visual-only roster proportions; keep physics and the foot anchor unchanged.
      const headOffset = 74 * (stats.visualScale - 1);
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
        p.characterId === 'raja' || p.characterId === 'jago'
          ? direction === 'west'
          : shouldMirrorSprite(direction, dedicatedEast);
      let oneShotColumn: number | undefined;
      const actorUltimateCastMs=ultimateCastMsFor(p);
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
            now - (p.actionUntil - actorUltimateCastMs),
            0,
            actorUltimateCastMs - 1,
          );
          oneShotColumn =
            columns[
              Math.min(
                columns.length - 1,
                Math.floor(elapsed / (actorUltimateCastMs / columns.length)),
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
      } else if (now < p.parkourUntil && animation.parkour) {
        const parkour = animation.parkourByDirection?.[direction] ?? animation.parkour;
        row = parkour.row;
        columns = parkour.columns;
        mirror = p.characterId === 'raja' || p.characterId === 'jago'
          ? direction === 'west'
          : shouldMirrorSprite(direction, dedicatedEast);
      } else if (flightBusy(p)) {
        // Temporary compatibility pose until the three editor sequences exist.
        row = animation.directionRows[direction] ?? directionalRow(direction);
        columns = [0];
      } else if (speed > 8) {
        const directionalColumns = sprinting
          ? animation.boostColumnsByDirection?.[direction]
          : animation.runColumnsByDirection?.[direction];
        columns = directionalColumns ?? (sprinting ? animation.boostColumns : animation.runColumns);
      }
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
          now - (p.actionUntil - actorUltimateCastMs),
          0,
          actorUltimateCastMs - 1,
        );
        const frameIndex = Math.min(
          KAKA_ULTIMATE_FRAME_COUNT - 1,
          Math.floor(
            elapsed /
              (actorUltimateCastMs / KAKA_ULTIMATE_FRAME_COUNT),
          ),
        );
        frame = {
          x: Math.round(frameIndex * cellWidth),
          y: 0,
          width: Math.round(cellWidth),
          height: stripHeight,
        };
      }
      const series = seriesFrame(p.characterId, {
        vx: p.vx, vy: p.vy, now, sprinting, state: p.state,
        result: phase === 'ROUND_OVER' || phase === 'MATCH_OVER'
          ? roundWinner === p.team ? 'win' : 'lose' : null,
        action: now < p.actionUntil ? p.action : null,
        parkour: now < p.parkourUntil,
        tagX: p.visualTagVector?.x, tagY: p.visualTagVector?.y,
      });
      if (series) {
        renderImage = getSeriesImage(p.characterId);
        frame = series;
        mirror = series.mirror;
      }
      const studio = studioResolve(p.characterId, p.id, {
        vx: p.vx, vy: p.vy, now, state: p.state, ready: phase === 'COUNTDOWN',
        result: phase === 'ROUND_OVER' || phase === 'MATCH_OVER'
          ? roundWinner === p.team ? 'win' : 'lose' : null,
        action: now < p.actionUntil ? p.action ?? null : null,
        ultimateProgress: p.action==='ultimate' && (p.characterId==='raja'||p.characterId==='kaka')
          ? (now-(p.actionUntil-actorUltimateCastMs))/actorUltimateCastMs : undefined,
        parkour: now < p.parkourUntil,
        tagX: p.visualTagVector?.x, tagY: p.visualTagVector?.y,
        flightSlot:flightSlot(p.flight,flightConfig(p.characterId)??undefined),flightDirection:p.flight?.direction,flightElapsed:(p.flight?.elapsed??0)*1000,
      });
      if (studio) { renderImage = studio.image; frame = studio.frame; mirror = studio.clip.mirror; }

      if(isFlying(p)) {
        ctx.save();ctx.strokeStyle=p.characterId==='bebe'?'#65e9ff':'#c878ff';
        ctx.globalAlpha=p.flight!.remaining<=1?.25+.35*Math.abs(Math.sin(now/80)):.65;
        ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-12+bob,24,10,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      }

      if (!sinking && p.state !== 'PRISONER' && teamCombos[p.team].surgeUntil > now) {
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
        !sinking &&
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

      if (!sinking && now < p.ultimateShieldUntil) {
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

      if (!sinking && sprinting && dust.complete && dust.naturalWidth) {
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
      if (inWater) {
        const ripple = 19 + Math.sin(now / 130 + p.aiSeed) * 3;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#36c8f0';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, ripple + 7, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.86;
        ctx.strokeStyle = '#b8f8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, ripple, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.48;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, ripple + 12, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (waterFall) {
          ctx.globalAlpha = 0.86 - fallProgress * 0.34;
          ctx.lineWidth = 3;
          for (const offset of [-13, 0, 13]) {
            ctx.beginPath();
            ctx.moveTo(p.x + offset, p.y + 11);
            ctx.quadraticCurveTo(
              p.x + offset + (offset ? -offset / 2 : 0),
              p.y - 11 - Math.sin(fallProgress * Math.PI) * 13,
              p.x + offset / 2,
              p.y - 2,
            );
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      ctx.save();
      if (sinking) ctx.globalAlpha = Math.max(0, 1 - fallProgress);
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
            : (74 * stats.visualScale * frame.height) / 136 * (series ? 116 / 136 : 1),
          width = kakaUltimateActive
            ? 238 * stats.visualScale
            : (height * frame.width) / frame.height;
        const fallScale = sinking ? 1 - fallProgress * 0.8 : 1;
        const drawHeight = height * fallScale;
        const drawWidth = width * fallScale;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (studio) {
          const placement = spritePlacement(studio.clip, frame, 74 * stats.visualScale);
          ctx.translate(p.x + studio.clip.x, p.y + 18 + bob + studio.clip.y);
          if (mirror) ctx.scale(-1, 1);
          const packed=studio.packedFrame;
          if(packed) {
            const sx=placement.width/frame.width,sy=placement.height/frame.height;
            ctx.drawImage(renderImage,packed.x,packed.y,packed.width,packed.height,
              -placement.width*studio.clip.pivotX+packed.left*sx,-placement.height*studio.clip.pivotY+packed.top*sy,
              packed.width*sx,packed.height*sy);
          } else ctx.drawImage(renderImage, frame.x, frame.y, frame.width, frame.height,
              -placement.width * studio.clip.pivotX, -placement.height * studio.clip.pivotY,
              placement.width, placement.height);
        } else {
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
          p.x - drawWidth / 2,
          p.y + 18 - drawHeight + bob,
          drawWidth,
          drawHeight,
        );
        }
        ctx.restore();
      } else {
        ctx.fillStyle = color;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 2 + bob, 14 * (sinking ? 1 - fallProgress * 0.8 : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      if (inWater) {
        // A waterline over the lower body makes the character feel submerged,
        // while the ripple below communicates that movement is still possible.
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = '#159cc5';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 9 + bob, 19 * stats.visualScale, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (sinking) return;
      if (now < p.ultimateShieldUntil) {
        const shieldX = p.x - 24;
        const shieldY = p.y - 49 - headOffset + bob;
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
        const hasUltimate = ULTIMATE_CHARACTER_IDS.has(p.characterId);
        const hudWidth = 54;
        const hudX = p.x - hudWidth / 2;
        const hudY = p.y - 83 - headOffset + bob;
        const stamina = Math.max(0, Math.min(1, p.boost / stats.boost));
        const ultimate = Math.max(0, Math.min(1, ultimateMeter / 100));

        ctx.save();
        ctx.fillStyle = 'rgba(7,12,9,.9)';
        rounded(hudX - 3, hudY - 3, hudWidth + 6, hasUltimate ? 18 : 11, 4);
        ctx.fill();
        ctx.fillStyle = '#1b251d';
        rounded(hudX, hudY, hudWidth, 5, 2);
        ctx.fill();
        ctx.fillStyle = stamina > .3 ? '#f3ead4' : '#f5cf45';
        rounded(hudX, hudY, hudWidth * stamina, 5, 2);
        ctx.fill();
        if (hasUltimate) {
          const ultimateY = hudY + 8;
          ctx.fillStyle = p.characterId === 'kaka' ? '#082414' : '#2b2208';
          rounded(hudX, ultimateY, hudWidth, 4, 2);
          ctx.fill();
          ctx.fillStyle = p.characterId === 'kaka' ? '#47e97c' : '#f5cf45';
          rounded(hudX, ultimateY, hudWidth * ultimate, 4, 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = '#fff4d1';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 51 - headOffset + bob);
        ctx.lineTo(p.x - 7, p.y - 62 - headOffset + bob);
        ctx.lineTo(p.x + 7, p.y - 62 - headOffset + bob);
        ctx.fill();
      }
      const label = p.controlled ? `★ ${p.name}` : p.name;
      ctx.font = `900 ${11*hudPreferencesRef.current.scale}px Arial`;
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
      const relation=tagRelationship(me,p,now,isKanalField(field.id));
      if(relation!=='neutral') {
        const text=relation==='target'?'+ TAG':relation==='danger'?'! AWAS':'◇ KEBAL';
        ctx.save();ctx.font=`900 ${11*hudPreferencesRef.current.scale}px Arial`;
        const width=ctx.measureText(text).width+12;
        ctx.fillStyle='#08100ef2';rounded(p.x-width/2,p.y+42,width,20,4);ctx.fill();
        ctx.fillStyle=outline;ctx.textAlign='center';ctx.fillText(text,p.x,p.y+56);ctx.restore();
      }
      if (inWater) {
        ctx.fillStyle = '#b8f8ff';
        ctx.font = '900 7px Arial';
        ctx.fillText('AIR DALAM · PARKOUR', p.x, p.y + 49);
      }
      if (p.state === 'ACTIVE') {
        ctx.fillStyle = '#141a15';
        ctx.beginPath();
        ctx.arc(p.x + 23, p.y - 35 - headOffset + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '800 9px Arial';
        ctx.fillText(String(p.exitOrder), p.x + 23, p.y - 32 - headOffset + bob);
      }
      if (p.state === 'RETURNING') {
        ctx.fillStyle = now < p.rescueShieldUntil ? '#60e6ff' : '#f5cf45';
        ctx.font = '800 8px Arial';
        ctx.fillText(
          now < p.rescueShieldUntil ? 'GHOST' : 'KEMBALI',
          p.x,
          p.y - 55 - headOffset,
        );
      }
      if (now < p.fallNoticeUntil) {
        const noticeY = p.y - 78 - headOffset + bob;
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
    const renderAdapter = createRenderAdapter(players);
    let quality: GraphicsPreset = graphicsPreset();
    // Adaptive resolution for the auto preset: averaged over AUTO_PIXEL_RATIO.windowMs, one step per window.
    let autoPixelRatio = autoInitialPixelRatio(window.devicePixelRatio || 1),autoWindowStart=performance.now(),autoFrames=0,autoFrameMs=0,autoWorkMs=0;
    const resetAutoWindow=(at:number)=>{autoWindowStart=at;autoFrames=0;autoFrameMs=0;autoWorkMs=0;};
    const qualityChanged = (event: Event) => {
      quality = (event as CustomEvent<GraphicsPreset>).detail ?? graphicsPreset();
      autoPixelRatio=autoInitialPixelRatio(window.devicePixelRatio || 1);resetAutoWindow(performance.now());
    };
    window.addEventListener(GRAPHICS_SETTINGS_EVENT, qualityChanged);
    let pendingRenderFailure:string|null=null;
    const draw = (now: number, render:RenderFrame) => {
      const {players,refills,phase,rescueRequest}=render;
      const dpr = graphicsPixelRatio(quality, window.devicePixelRatio || 1, autoPixelRatio),
        cw = canvas.clientWidth,
        ch = canvas.clientHeight;
      if (
        canvas.width !== Math.round(cw * dpr) ||
        canvas.height !== Math.round(ch * dpr)
      ) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.dataset.graphicsPreset = quality;
      canvas.dataset.pixelRatio = String(dpr);
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
      view = { x: camX, y: camY, width: cw, height: ch, scale };
      visibleWorld={left:camX-halfW,right:camX+halfW,top:camY-halfH,bottom:camY+halfH};
      if (isKanalField(field.id) && !followsPlayer) {
        // Contain-fitting is already correct. Letterboxing is necessary when
        // the viewport and map ratios differ; give it an intentional matte.
        ctx.fillStyle = '#14211c';
        ctx.fillRect(0, 0, cw, ch);
        const mapLeft=(cw-worldWidth*scale)/2, mapTop=(ch-worldHeight*scale)/2;
        ctx.strokeStyle='rgba(210,195,143,.32)';
        ctx.lineWidth=1;
        ctx.strokeRect(mapLeft-1.5, mapTop-1.5, worldWidth*scale+3, worldHeight*scale+3);
      }
      if (scene3d) {
        try {
          for (const p of players) scene3d.updateActor(p.id, p.x, p.y, target => {
            const previous = ctx;
            try { ctx = target; drawPlayer(p, me, now, render); } finally { ctx = previous; }
          });
          ctx.drawImage(scene3d.render(cw, ch, scale, camX, camY, now), 0, 0, cw, ch);
        } catch (error) {
          pendingRenderFailure = error instanceof Error ? error.message : 'Grafis 3D terhenti. Kembali ke menu untuk mencoba lagi.';
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
      drawBase('blue',render);
      drawBase('red',render);
      if (mouseRoute.length) {
        const target = mouseRoute[mouseRoute.length - 1];
        ctx.strokeStyle = '#caff73'; ctx.lineWidth = 2 / scale;
        ctx.beginPath(); ctx.arc(target.x, target.y, 9, 0, Math.PI * 2); ctx.stroke();
      }
      drawColliderDebug();
      if (mode === 'playing') {
        drawFieldAnimations(now);
        refills.forEach((item) => drawRefill(item, now));
        if (!scene3d && studioMap) {
          const entries = [
            ...players.map(p=>({y:p.y,z:0,draw:()=>drawPlayer(p,me,now,render)})),
            ...studioLayers.world.filter(objectVisible).map(o=>({y:o.y+o.h,z:o.z,draw:()=>drawMapObject(ctx,o,now)})),
          ];
          entries.sort((a,b)=>a.z-b.z||a.y-b.y).forEach(item=>item.draw());
        }
        if (!scene3d && !studioMap) players
          .slice()
          .sort((a, b) => a.y - b.y)
          .forEach((p) => drawPlayer(p, me, now, render));
        if (selectedFieldId !== 'kampung3d') drawPrisonOverlays(now);
        if (studioMap) studioLayers.foreground.forEach(o=>{if(objectVisible(o))drawMapObject(ctx,o,now);});
        const rescueRequester = rescueRequest
          ? players.find((player) => player.id === rescueRequest?.requesterId)
          : undefined;
        if (rescueRequester?.state === 'PRISONER') {
          const pulse = 18 + Math.sin(now / 120) * 4;
          ctx.save();
          ctx.strokeStyle = '#f5cf45';
          ctx.fillStyle = '#15180f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(rescueRequester.x, rescueRequester.y - 42, pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff5be';
          ctx.font = '900 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('!', rescueRequester.x, rescueRequester.y - 35);
          ctx.restore();
        }
        particles.forEach((p, index) => {
          if(index % GRAPHICS_PRESETS[quality].particleStride !== 0) return;
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
        const activeRequest = rescueRequest
          ? players.find((player) => player.id === rescueRequest?.requesterId)
          : undefined;
        if (activeRequest?.state === 'PRISONER')
          marker(activeRequest, '!', '#f5cf45');
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
    let cachedStatsBoard = initialSnapshot.statsBoard;
    const profileRuntime = new URLSearchParams(window.location.search).get('performance') === '1';
    let profileFrames=0,profileUpdate=0,profileDraw=0,profileHud=0,profileWorst=0,profileStart=performance.now();
    const loop = (localNow: number) => {
      let now=localNow;
      const frameMs=localNow-last,workStart=performance.now();
      const dt = Math.min(0.033, (localNow - last) / 1000);
      last = localNow;
      const updateStart=profileRuntime?performance.now():0;
      if(!clientOnly&&!paused && phase==='PLAYING') routeScheduler.run();
      else routeScheduler.clear();
      if(clientOnly){
        networkPump?.tickClientInput(localNow);
        const s=snapshots.read(localNow);
        if(s){
          clientPresentation=snapshotRenderState(readCanonicalState(localNow,development),s);now=s.timeMs;
          // These are detached presentation values only: no collision, AI or rules run.
          for(const e of clientPresentation.entities)e.controller=e.entityId===myEntityId?'local':e.controller==='bot'?'bot':'remote';
          clientPresentation.entities=[...clientPresentation.entities.filter(e=>e.entityId===myEntityId),...clientPresentation.entities.filter(e=>e.entityId!==myEntityId)];
          players=renderAdapter(clientPresentation).players as Player[];
          const changedResult=phase!==s.phase&&(s.phase==='ROUND_OVER'||s.phase==='MATCH_OVER');
          phase=s.phase;round=s.round;timer=s.timer;paused=s.paused;score={blue:s.score.red,red:s.score.green};
          refills=structuredClone(s.refills);suddenDeath=s.suddenDeath;phaseUntil=s.phaseUntilMs??Infinity;
          const requester=s.rescueRequest?players.find(p=>p.entityId===s.rescueRequest!.requesterId):null;
          rescueRequest=requester&&s.rescueRequest?{requesterId:requester.id,team:s.rescueRequest.team==='red'?'blue':'red',expiresAt:s.rescueRequest.expiresAt,
            assignedRescuerId:players.find(p=>p.entityId===s.rescueRequest!.assignedRescuerId)?.id}:null;
          teamCombos={blue:{...teamCombos.blue,...s.combos.red},red:{...teamCombos.red,...s.combos.green}};
          ultimateBuffUntil=s.ultimate.buffUntil;ultimateShieldUntil=s.ultimate.shieldUntil;ultimateMeter=players[0]?s.entities.find(e=>e.id===myEntityId)?.ultimateMeter??0:0;
          roundWinner=s.result?.winner==='red'?'blue':s.result?.winner==='green'?'red':undefined;roundEndReason=s.result?.reason??'';
          resultWinner=roundWinner;if(changedResult)resultAnnouncementUntil=s.timeMs+1500;
          if(lastNetworkFrame){matchStartedAt=lastNetworkFrame.matchStartedAtMs;
            rescueRequestCooldownUntil=lastNetworkFrame.rescueCooldownUntil;clientPresentation.rescueRequestCooldownUntil=rescueRequestCooldownUntil;
            for(const [rows,store] of [[lastNetworkFrame.roundStats,roundStats],[lastNetworkFrame.matchStats,matchStats]] as const)for(const row of rows){const p=players.find(p=>p.entityId===row.entityId);if(p)store[p.id]={tags:row.tags,rescues:row.rescues,prisons:row.prisons};}
            clientPresentation.roundStats=Object.fromEntries(lastNetworkFrame.roundStats.map(({entityId,...stats})=>[entityId,stats]));
            clientPresentation.matchStats=Object.fromEntries(lastNetworkFrame.matchStats.map(({entityId,...stats})=>[entityId,stats]));
          }
          announcement=s.phase==='COUNTDOWN'?String(Math.max(1,Math.ceil(((s.phaseUntilMs??s.timeMs)-s.timeMs)/1000))):s.result?.reason??'';
        }else announcement='MENUNGGU SNAPSHOT HOST…';
        for(const event of receivedNetworkEvents.splice(0)){
          if(event.type==='ULTIMATE_STARTED'||event.type==='ULTIMATE_APPLIED')presentNetworkUltimate([event]);
          else if(event.type==='ROUND_ENDED'||event.type==='MATCH_ENDED'){
            gameplayAudio.resetTagStreak();if(event.type==='MATCH_ENDED')gameplayAudio.play(event.team===players[0].team?'victory':'defeat');
            burst(worldWidth/2,worldHeight/2,TEAM_COLOR[event.team],38);log(`${teamName(event.team)} · ${event.reason}`);
          }else presentInteractionEvents([event],now);
        }
        particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;p.life-=dt;});particles=particles.filter(p=>p.life>0);
      }else {
        // Drop backlog beyond MAX_SIMULATION_STEPS to avoid a spiral of death on very slow frames.
        const stepMs=simulationClock.fixedDeltaMs;
        const steps=advanceSimulationClock(simulationClock,Math.min(Math.max(0,frameMs),MAX_SIMULATION_STEPS*stepMs));
        for(let step=0;step<steps;step++)update(stepMs/1000,now-simulationClock.remainderMs-(steps-1-step)*stepMs);
        if(network)networkPump?.tickHostSnapshot(localNow, now);
      }
      if(pendingMatchResult&&localNow-lastResultAttempt>=5000){const packet=pendingMatchResult;lastResultAttempt=localNow;
        try{const handed=resultHandoff!(packet);if(handed.result)setMatchProgressionResult(handed.result);if(handed.ack){if(clientOnly)network!.ackResult(packet.matchId);pendingMatchResult=null;}}
        catch(error){setContentGateError(error instanceof Error?error.message:'Reward multiplayer belum tersimpan.');}
      }
      const drawStart=profileRuntime?performance.now():0;
      // The result overlay covers the arena; ~10 fps behind it is enough and keeps weak GPUs smooth.
      const resultOverlayShown=(phase==='ROUND_OVER'||phase==='MATCH_OVER')&&cachedStatsBoard.visible;
      if(!resultOverlayShown||localNow-lastDraw>=100){
        lastDraw=localNow;
        draw(now,renderAdapter(clientPresentation??readCanonicalState(now,development)));
        if(quality==='auto'&&phase==='PLAYING'&&!paused&&frameMs<250){
          autoFrames++;autoFrameMs+=frameMs;autoWorkMs+=performance.now()-workStart;
          if(localNow-autoWindowStart>=AUTO_PIXEL_RATIO.windowMs){
            autoPixelRatio=nextAutoPixelRatio(autoPixelRatio,autoFrameMs/autoFrames,autoWorkMs/autoFrames,window.devicePixelRatio || 1);
            resetAutoWindow(localNow);
          }
        }else resetAutoWindow(localNow);
      }
      if(pendingRenderFailure!==null){paused=true;setRendererError(pendingRenderFailure);pendingRenderFailure=null;}
      const hudStart=profileRuntime?performance.now():0;
      if (now - lastHud > 100) {
        lastHud = now;
        const me = players[0],
          blueLock = fortOccupant('blue'),
          redLock = fortOccupant('red');
        canvas.dataset.playerPosition = `${me.x.toFixed(1)},${me.y.toFixed(1)}`;
        if(development){canvas.dataset.flightStage=me.flight?.stage??'NORMAL';canvas.dataset.flightRemaining=String(me.flight?.remaining??0);}
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
        // The closed scoreboard has no visible consumers. Avoid sorting/building
        // twenty rows every HUD tick; rebuild immediately when opened/results show.
        if(leaderboardOpenRef.current || phase==='ROUND_OVER' || phase==='MATCH_OVER') {
          cachedStatsBoard=buildStatsBoard(now);
        } else if(cachedStatsBoard.visible) {
          cachedStatsBoard={...cachedStatsBoard,visible:false};
        }
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
          mission: { ...mission,tag:mission.tag||(matchStats[me.id]?.tags??0)>0,
            rescue:mission.rescue||(matchStats[me.id]?.rescues??0)>0 },
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
            isFlying(me) ? Math.ceil(me.flight!.remaining) : now <
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
            flightBusy(me) || ULTIMATE_CHARACTER_IDS.has(me.characterId) &&
            me.action === 'ultimate' &&
            now < me.actionUntil,
          flightFlying:isFlying(me),
          flightDebug:development && me.flight ? `${me.name} · ${me.flight.stage} · ${me.flight.remaining.toFixed(2)}s · Tag immune ${flightBusy(me)} · Parkour ignore ${isFlying(me)} · Interaction lock true · Speed x${isFlying(me)?flightConfig(me.characterId)?.speedMultiplier:1} · Turn x${isFlying(me)?flightConfig(me.characterId)?.turnMultiplier:1}` : '',
          matchEvents: matchEvents.filter((event) => event.expiresAt > now),
          rescueRequestActive:
            rescueRequest?.requesterId === me.id && now < rescueRequest.expiresAt,
          rescueRequestRemaining:
            rescueRequest?.requesterId === me.id
              ? Math.max(0, Math.ceil((rescueRequest.expiresAt - now) / 1000))
              : 0,
          rescueRequestCooldown: Math.max(
            0,
            Math.ceil((rescueRequestCooldownUntil - now) / 1000),
          ),
          roundResult: {
            visible: Boolean(resultWinner) && now < resultAnnouncementUntil,
            winner: resultWinner,
            final: phase === 'MATCH_OVER',
          },
          statsBoard: cachedStatsBoard,
        });
      }
      if(profileRuntime) {
        const end=performance.now();profileFrames++;
        profileUpdate+=drawStart-updateStart;profileDraw+=hudStart-drawStart;profileHud+=end-hudStart;
        profileWorst=Math.max(profileWorst,end-updateStart);
        if(end-profileStart>=1000) {
          canvas.dataset.runtimePerformance=JSON.stringify({frames:profileFrames,updateMs:+(profileUpdate/profileFrames).toFixed(2),drawMs:+(profileDraw/profileFrames).toFixed(2),hudMs:+(profileHud/profileFrames).toFixed(2),worstWorkMs:+profileWorst.toFixed(2),routeQueue:routeScheduler.size});
          profileFrames=0;profileUpdate=0;profileDraw=0;profileHud=0;profileWorst=0;profileStart=end;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => cancelAnimationFrame(raf);
    const pointerDown = (event: PointerEvent) => {
      const me = players[0], now = performance.now();
      if (event.pointerType !== 'mouse' || ![0, 2].includes(event.button) || mode !== 'playing' ||
        phase !== 'PLAYING' || paused || !['ACTIVE', 'IN_BASE'].includes(me.state) ||
        (isKanalField(field.id) && me.waterEnteredAt > 0) ||
        (flightBusy(me) && !isFlying(me)) ||
        players.some(player => player.action === 'ultimate' && now < player.actionUntil)) return;
      event.preventDefault();
      const shell = canvas.closest('.playing-shell');
      const matrix = shell ? new DOMMatrix(getComputedStyle(shell).transform) : new DOMMatrix();
      const target = pointerWorld({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect(), view, Math.abs(matrix.b - 1) < .01);
      if (event.button === 2) {
        if(flightBusy(me))return;
        mouseBoost = true;
        return;
      }
      const passable = (x: number, y: number) => x >= 34 && x <= worldWidth - 34 && y >= 58 && y <= worldHeight - 32 && !blocked(x, y, me, now) && (isFlying(me)||!isWaterAt(x, y));
      const route = clickRoute(me, target, worldWidth, worldHeight, passable);
      clearMouse();
      if (!route.length) { log('Tujuan tidak dapat dijangkau. Pilih tanah kosong atau jalur jembatan.'); return; }
      mouseRoute = route;
    };
    const contextMenu = (event: MouseEvent) => { if (mode === 'playing') event.preventDefault(); };
    const stopForMenu = (event: PointerEvent) => { if (event.target instanceof Element && event.target.closest('button,input,select,[role="button"]')) clearMouse(); };
    const stopWhenHidden = () => { if (document.hidden) clearMouse(); };
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
    // Shared detached read adapter for rendering and development inspection.
    const coreHost = window as Window & { __bentengGameCore?: { readState: () => CanonicalGameState; readSnapshot: () => GameSnapshot;readNetwork:()=>ReturnType<MultiplayerSession['metrics']>|null;readArena:()=>{width:number;height:number} } };
    const readCanonicalState = (observedAtMs=performance.now(),validate=true) => {const state=describeMatch({
      matchId:matchId??'menu-preview',arenaId:field.id,phase,paused,
      tick:simulationClock.tick,simulationTimeMs:simulationClock.simulationTimeMs,
      fixedDeltaMs:simulationClock.fixedDeltaMs,observedAtMs,round,timer,phaseUntil,
      suddenDeath,score,players,refills,nextRefillSpawn,exitCounter,teamCombos,totalCapture,
      rescueRequest,rescueRequestCooldownUntil,ultimateMeter,ultimateImpactAt,ultimateImpactApplied,
      ultimateBuffUntil,ultimateShieldUntil,
      ultimateStats:playerUltimateStats?Object.fromEntries(Object.entries(playerUltimateStats).filter((entry):entry is [string,number]=>typeof entry[1]==='number')):null,
      bases,baseRadius,roundStats,matchStats,winner:roundWinner,reason:roundEndReason,
      },{validate});
      if(network){for(const p of state.entities)p.ultimateMeter=networkUltimates.get(p.entityId)?.meter??0;
        const raja=players.find(p=>p.characterId==='raja'),rajaState=raja?networkUltimates.get(raja.entityId):null;
        state.ultimate.buffUntil=rajaState?.buffUntil??0;state.ultimate.effectiveStats={castMs:ultimateCastMsFor(players[0]),speedMultiplier:RAJA_ULTIMATE_SPEED_MULTIPLIER};
      }
      return state;
    };
    const coreProbe = { readState: () => structuredClone(clientPresentation??readCanonicalState()), readSnapshot: () => createSnapshot(clientPresentation??readCanonicalState()),readNetwork:()=>network?.metrics()??null,readArena:()=>({width:worldWidth,height:worldHeight}) };
    if(development)coreHost.__bentengGameCore=coreProbe;
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
        blocked: (x: number, y: number) => hitsObstacle(x,y) || isInsideFortCore(x,y) || kanalWaterBlocks(x, y),
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
    raf = requestAnimationFrame(loop);
    return () => {
      networkOff?.();networkStateOff?.();
      window.removeEventListener(GRAPHICS_SETTINGS_EVENT, qualityChanged);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('contextmenu', contextMenu);
      window.removeEventListener('blur', clearMouse);
      document.removeEventListener('visibilitychange', stopWhenHidden);
      document.removeEventListener('pointerdown', stopForMenu);
      stopLoop();
      scene3d?.dispose();
      window.removeEventListener('pointerdown', gameplayAudio.unlock);
      window.removeEventListener('keydown', gameplayAudio.unlock);
      gameplayAudio.close();
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
      if(coreHost.__bentengGameCore===coreProbe)delete coreHost.__bentengGameCore;
    };
  }, [mode, run, selected, selectedFaction, selectedFieldId, selectedId,networkSession]);

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
    const gate = selectionGate();
    if (gate) { setContentGateError(gate); return; }
    setContentGateError('');
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
    networkSession?.close();setNetworkSession(null);setMultiplayerOpen(false);
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
    setSelectedIdState('raja');
    setSelectedFieldIdState('kampung');
    setContentGateError('');
    setCameraMode('follow');
    setRun((v) => v + 1);
  };
  const applyPendingFieldRotation = () => {
    if (completedMatchesRef.current < 3) return false;
    const allowed = getPlayableArenaIds(loadPlayerProfile() ?? playerProfileRef.current,
      FIELD_CONFIGS.filter(item => item.id !== 'kampung3d').map(item => item.id));
    if (!allowed.length) { setContentGateError('Tidak ada arena terbuka untuk rotasi.'); return false; }
    const decision = fieldCycleDecision(
      selectedFieldId,
      completedMatchesRef.current,
      allowed,
    );
    if (!decision) return;
    completedMatchesRef.current = decision.wins;
    setSelectedFieldId(decision.fieldId as FieldId);
    return decision.fieldId !== selectedFieldId;
  };
  const rematch = () => {
    if(networkSession){quit();return;}
    const gate = selectionGate();
    if (gate) { setContentGateError(gate); setMode('menu'); setMenuStep('field'); return; }
    keys.current.clear();
    postRoundActionRef.current = null;
    setLeaderboardOpen(false);
    const rotated=applyPendingFieldRotation();
    setSnapshot(initialSnapshot);
    setMissionOpen(false);
    if(rotated){setMode('menu');setGameLoading(true);}
    else setRun((v) => v + 1);
  };
  const backToCharacterSelect = () => {
    if(networkSession){quit();return;}
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
    if(networkSession){quit();return;}
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
    const roster = getPlayableCharacterIds(playerProfileRef.current, FIXED_ROSTERS[selectedFaction]);
    if (!roster.length) return;
    const index = roster.indexOf(selectedId);
    const nextId = roster[(index + direction + roster.length) % roster.length];
    highlightCharacterWithVoice(nextId);
  };
  const cycleArena = (direction: -1 | 1) => {
    const roster = getPlayableArenaIds(playerProfileRef.current, fieldIds.filter(id => id !== 'kampung3d'));
    const pool = roster.length ? roster : fieldIds;
    const index = pool.indexOf(selectedFieldId);
    const nextId = pool[(index + direction + pool.length) % pool.length] as FieldId;
    setSelectedFieldId(nextId);
  };
  const confirmCharacter = () => {
    if (!playerProfileRef.current || !selectedFaction ||
        !FIXED_ROSTERS[selectedFaction].includes(selectedId) ||
        !isCharacterUnlocked(playerProfileRef.current, selectedId)) {
      setContentGateError('Karakter belum terbuka atau tidak tersedia di tim ini.'); return;
    }
    stopCharacterVoice();
    const playable=resolvePlayableContent(playerProfileRef.current,selectedId,selectedFieldId,
      FIXED_ROSTERS[selectedFaction],fieldIds);
    if(playable)setSelectedFieldIdState(playable.arenaId as FieldId);
    setMenuStep('field');
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
    if (mode !== 'menu' || assetsLoading) return;
    const navigate = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!playerProfile) return;
      if (profileOpen || multiplayerOpen) return;
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
        const firstId = chooseFaction(hoveredFaction);
        if (!firstId) return;
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
        confirmCharacter();
        return;
      }
      if (
        menuStep === 'field' &&
        (key === 'arrowleft' || key === 'arrowright')
      ) {
        event.preventDefault();
        cycleArena(key === 'arrowleft' ? -1 : 1);
      }
      if (menuStep === 'field' && key === 'enter' && selectedArenaUnlock.unlocked) start();
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
    selectedArenaUnlock.unlocked,
    selectedId,
    playerProfile,
    profileOpen,
    multiplayerOpen,
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
    if(networkSession?.read().role==='client'){setLeaderboardOpen(false);return;}
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
        {contentGateError && <div className="content-gate-notice" role="alert">
          {contentGateError}<button onClick={() => setContentGateError('')} aria-label="Tutup pesan">×</button>
        </div>}
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
            onStep={cycleArena}
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
        {playerProfile && menuStep === 'field' && (
          <ArenaUnlockPanel profile={playerProfile} catalog={FIELD_CONFIGS} selectedId={selectedFieldId} />
        )}
        {playerProfile === null && <PlayerProfileSetup onCreated={refreshPlayerProfile} />}
        {playerProfile && profileOpen && (
          <Suspense fallback={<LoadingPanel slot="profile" label="Memuat profil pemain…" />}>
            <PlayerProfilePanel
              profile={playerProfile}
              onClose={() => setProfileOpen(false)}
            />
          </Suspense>
        )}
        {multiplayerOpen&&playerProfile&&<Suspense fallback={<LoadingPanel slot="multiplayer" label="Memuat panel multiplayer…" />}><MultiplayerPanel
          initialName={playerProfile?.username}
          arenas={FIELD_CONFIGS.filter(f=>f.id!=='kampung3d')}
          prepareContent={async id=>{
            const field=FIELD_BY_ID[id as FieldId],map=runtimeStudioMapById[id];
            retainMapImages(map?[map]:[]);
            const images=[...['objects.webp','animated.webp','grounds.webp'].map(getFieldImage),
              ...(isKanalField(field.id)?[getFieldImage('kanal-object-atlas.webp')]:[]),
              ...(field.background?[getFieldImage(field.background)]:[]),...(field.waterMask?[getFieldImage(field.waterMask)]:[]),
              ...(map?mapImages(map):[])];
            await Promise.all(images.map(image=>imageReady(image)));
            return createContentIdentity(id,{field,studio:map??null});
          }}
          onLaunch={session=>{const state=session.read(),local=state.lobby!.participants.find(p=>p.peerId===state.localPeerId)!;
            keys.current.clear();setSelectedFaction(local.team);setSelectedIdState(local.characterId);setSelectedFieldIdState(session.content.arenaId as FieldId);
            setNetworkSession(session);setMultiplayerOpen(false);setSnapshot(initialSnapshot);setMode('playing');}}
          onClose={()=>setMultiplayerOpen(false)}/></Suspense>}
      </main>
    );
  }
  return (
    <main className={`game-shell playing-shell${hudPreferences.contrast ? ' hud-high-contrast' : ''}`}>
      <PlayingTopbar
        logoSrc={publicAsset('brand/benteng-tag-logo.webp?v=9')}
        hasProfile={Boolean(playerProfile)}
        musicMuted={musicMuted}
        hudPreferences={hudPreferences}
        onHudPreferences={setHudPreferences}
        onHudOpen={() => keys.current.clear()}
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
          <OrientationHint />
          {!showStatsBoard&&!snapshot.paused&&<GameplayGuidance key={`${selectedFieldId}-${run}`} order={snapshot.order}
            tagged={snapshot.mission.tag} rescued={snapshot.mission.rescue}
            captured={snapshot.statsBoard.reason==='BENTENG DIREBUT'&&snapshot.statsBoard.winner===(selectedFaction==='red'?'blue':'red')}
            state={snapshot.state}/>}
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
          {statsBoard.final && matchProgressionResult && (
            <MatchProgressionSummary result={matchProgressionResult} />
          )}
          {playerProfile && statsBoard.final && (
            <UnlockNotificationPanel
              result={matchProgressionResult}
              arenas={FIELD_CONFIGS}
              dismissed={unlockNoticeDismissed}
              onDismiss={() => setUnlockNoticeDismissed(true)}
            />
          )}
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
                <UltimateBuffIndicator ultimate={selected.ultimate} remaining={snapshot.ultimateBuffRemaining} />
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
        <Suspense fallback={<LoadingPanel slot="profile" label="Memuat profil pemain…" />}>
          <PlayerProfilePanel
            profile={playerProfile}
            onClose={() => setProfileOpen(false)}
          />
        </Suspense>
      )}
    </main>
  );
}
