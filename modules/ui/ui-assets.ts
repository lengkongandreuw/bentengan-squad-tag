// UI asset path routing. lib/map-studio is extensionless and unloadable in
// plain node tests, so both asset resolvers are injected (keeps this module
// free of the lib runtime chain).
import type { MatchEventKind } from '../game-core/match-types';
import type { Faction, Team } from '../world/map-data/field-types';

export type UiAssetSources = {
  mapArtwork: (id: string) => string | null;
  publicAsset: (file: string) => string;
};

export const uiAsset = (file: string, sources: UiAssetSources) => {
  const customId = file.match(/^fields\/(studio-[a-z0-9-]+)\.webp$/)?.[1];
  if (customId) return sources.mapArtwork(customId) ?? sources.publicAsset('ui-v2/fields/kampung.webp');
  file = file.replace('fields/kampung3d.', 'fields/kampung.');
  return sources.publicAsset(`ui-v2/${file}?v=${file.startsWith('controls/team-red-') ? 9 : 8}`);
};

export const matchEventFrames = (sources: UiAssetSources): Record<MatchEventKind, string> => ({
  tag: sources.publicAsset('arena-ui/match-events/notification-tag.png.PNG?v=3'),
  rescue: sources.publicAsset('arena-ui/match-events/notification-rescue.png.PNG?v=3'),
  'rescue-request': sources.publicAsset('arena-ui/match-events/notification-rescue.png.PNG?v=3'),
});

export const roundResultAssets = (sources: UiAssetSources): Record<Team, string> => ({
  blue: sources.publicAsset('arena-ui/match-events/merah-menang.png?v=3'),
  red: sources.publicAsset('arena-ui/match-events/hijau-menang.png?v=3'),
});

export const loadingUiFrame = (faction: Faction, progress: number, sources: UiAssetSources) => {
  // === PERUBAHAN: artwork 100% hanya tampil saat progress benar-benar 100% ===
  // Sebelumnya Math.ceil() membuat progress 81-99% langsung memakai gambar 100%.
  // Sekarang milestone dibulatkan ke bawah, sehingga 80-99% tetap memakai frame 80.
  const milestone =
    progress >= 100
      ? 100
      : Math.max(20, Math.floor(progress / 20) * 20);

  const suffix = faction === 'red' && progress < 20 ? '00' : String(milestone);
  const team = faction === 'red' ? 'MERAH' : 'HIJAU';

  return sources.publicAsset(`loading-ui/TEAM ${team} LOADING ${suffix}_.png?v=1`);
};

export const loadingUiFrames = (sources: UiAssetSources) =>
  (['red', 'green'] as Faction[]).flatMap((faction) =>
    [0, 20, 40, 60, 80, 100]
      .filter((progress) => faction === 'red' || progress > 0)
      .map((progress) => loadingUiFrame(faction, progress, sources)),
  );
