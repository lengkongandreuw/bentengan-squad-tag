import mapConfig from '../../config/map-studio.json';

// Editor replacement IDs identify artwork/geometry, not a new progression tier.
// Include saved inactive/archived versions so historical statistics remain usable.
const replacements = new Map<string, string>(mapConfig.maps.flatMap(map =>
  'replaces' in map && typeof map.replaces === 'string' ? [[map.id, map.replaces]] : []));

export function getProgressionArenaId(arenaId: string): string {
  return replacements.get(arenaId) ?? arenaId;
}

export function getProgressionArenaIds(arenaId: string): string[] {
  const canonical = getProgressionArenaId(arenaId);
  return [canonical, ...[...replacements].filter(([, original]) => original === canonical).map(([id]) => id)];
}
