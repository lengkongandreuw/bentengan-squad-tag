import mapConfig from '../../config/map-studio.json' with { type: 'json' };

// Editor replacement IDs identify artwork/geometry, not a new progression tier.
// Include saved inactive/archived versions so historical statistics remain usable.
const replacements = new Map<string, string>(mapConfig.maps.flatMap(map =>
  'replaces' in map && typeof map.replaces === 'string' ? [[map.id, map.replaces]] : []));

// A newly activated standalone editor map is free-play until a campaign rule
// is explicitly configured. Unknown IDs and inactive/deleted drafts stay gated.
export function getStandaloneStudioArenaIds(): string[] {
  return mapConfig.maps.filter(map => map.enabled && !('archived' in map && map.archived) &&
    !('deleted' in map && map.deleted) && !('replaces' in map && map.replaces)).map(map => map.id);
}

export function getProgressionArenaId(arenaId: string): string {
  return replacements.get(arenaId) ?? arenaId;
}

export function getProgressionArenaIds(arenaId: string): string[] {
  const canonical = getProgressionArenaId(arenaId);
  return [canonical, ...[...replacements].filter(([, original]) => original === canonical).map(([id]) => id)];
}
