import { PLAYER_PROFILE_STORAGE_KEY } from './defaults.ts';
import { parsePlayerProfile } from './migrations.ts';
import { migratePlayerProgression } from './progression-migration.ts';
import { migratePlayerEconomy } from './economy-migration.ts';
import {migratePlayerTutorial} from './tutorial.ts';
import type { LocalPlayerProfile } from './types';

export const loadPlayerProfile = (): LocalPlayerProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    const profile = parsePlayerProfile(value);
    if (!profile) return null;
    const migration = migratePlayerProgression(profile, value.progression);
    const economyMigration = migratePlayerEconomy(migration.profile,value.economy);
    const tutorialMigration=migratePlayerTutorial(economyMigration.profile,value.tutorial);
    if (migration.migrated || economyMigration.migrated || tutorialMigration.migrated) savePlayerProfile(tutorialMigration.profile);
    // A blocked write still returns the safe migrated profile in memory. Retry
    // on next load; never erase the old profile or claim durable persistence.
    return tutorialMigration.profile;
  } catch {
    return null;
  }
};

export const savePlayerProfile = (profile: LocalPlayerProfile): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    // Penyimpanan browser bersifat opsional dan dapat diblokir pengguna.
    return false;
  }
};
