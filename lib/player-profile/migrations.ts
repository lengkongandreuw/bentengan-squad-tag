import { PLAYER_PROFILE_SCHEMA_VERSION } from './defaults';
import { CHARACTERS, type CharacterId } from '../characters';
import type { LocalPlayerProfile, PlayerKdaStats } from './types';
import { parsePlayerProgression } from './progression';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nonNegativeNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;

const readKda = (value: unknown): PlayerKdaStats => {
  const data = isRecord(value) ? value : {};
  return {
    tagMusuh: nonNegativeNumber(data.tagMusuh) ?? 0,
    masukPenjara: nonNegativeNumber(data.masukPenjara) ?? 0,
    rescueTeam: nonNegativeNumber(data.rescueTeam) ?? 0,
  };
};

const characterId = (value: unknown): CharacterId | null =>
  typeof value === 'string' && CHARACTERS.some((character) => character.id === value)
    ? value as CharacterId
    : null;

export const parsePlayerProfile = (value: unknown): LocalPlayerProfile | null => {
  if (!isRecord(value) || value.schemaVersion !== PLAYER_PROFILE_SCHEMA_VERSION)
    return null;
  const menang = nonNegativeNumber(value.menang) ?? 0;
  const kalah = nonNegativeNumber(value.kalah) ?? 0;
  const kda = readKda(value.kda);
  const featuredCharacterId = characterId(value.featuredCharacterId) ?? 'raja';
  if (
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.username !== 'string' ||
    !value.username.trim() ||
    typeof value.firstJoin !== 'string' ||
    Number.isNaN(Date.parse(value.firstJoin))
  )
    return null;

  const progression = parsePlayerProgression(value.progression);
  const { progression: _rawProgression, ...existingFields } = value;
  return {
    ...existingFields,
    schemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    id: value.id,
    username: value.username.trim(),
    firstJoin: value.firstJoin,
    menang,
    kalah,
    featuredCharacterId,
    kda,
    ...(progression ? { progression } : {}),
  };
};
