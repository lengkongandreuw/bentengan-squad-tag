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

const readKda = (value: unknown): PlayerKdaStats | null => {
  if (!isRecord(value)) return null;
  const tagMusuh = nonNegativeNumber(value.tagMusuh);
  const masukPenjara = nonNegativeNumber(value.masukPenjara);
  const rescueTeam = nonNegativeNumber(value.rescueTeam);
  if (tagMusuh === null || masukPenjara === null || rescueTeam === null) return null;
  return { tagMusuh, masukPenjara, rescueTeam };
};

const characterId = (value: unknown): CharacterId | null =>
  typeof value === 'string' && CHARACTERS.some((character) => character.id === value)
    ? value as CharacterId
    : null;

export const parsePlayerProfile = (value: unknown): LocalPlayerProfile | null => {
  if (!isRecord(value) || value.schemaVersion !== PLAYER_PROFILE_SCHEMA_VERSION)
    return null;
  const menang = nonNegativeNumber(value.menang);
  const kalah = nonNegativeNumber(value.kalah);
  const kda = readKda(value.kda);
  const featuredCharacterId = characterId(value.featuredCharacterId) ?? 'raja';
  if (
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.username !== 'string' ||
    !value.username.trim() ||
    typeof value.firstJoin !== 'string' ||
    Number.isNaN(Date.parse(value.firstJoin)) ||
    menang === null ||
    kalah === null ||
    !kda
  )
    return null;

  const progression = parsePlayerProgression(value.progression);
  return {
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
