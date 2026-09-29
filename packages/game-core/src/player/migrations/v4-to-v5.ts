import { cloneSerializable, deepFreeze } from '../immutable.js';
import { CAREER_SCHEMA_VERSION_V5, type CareerRunV4, type CareerRunV5 } from '../types.js';
import { validateCareerRunV4, validateCareerRunV5 } from '../validation.js';

/**
 * Adds only the neutral season bootstrap marker. Existing gameplay evidence,
 * revision, phase, and career RNG are preserved without advancing the run.
 */
export function migrateCareerRunV4ToV5(career: CareerRunV4): CareerRunV5 {
  const sourceValidation = validateCareerRunV4(career);
  if (!sourceValidation.ok) {
    throw new TypeError('career_migration.invalid_v4');
  }

  const snapshot = cloneSerializable(career);
  const migrated: CareerRunV5 = {
    ...snapshot,
    schemaVersion: CAREER_SCHEMA_VERSION_V5,
    seasonCareerState: {
      model: 'season_v1',
      bootstrapStatus: 'PENDING',
      seasonsCompleted: 0,
      activeSeasonId: null,
      lastCompletedSeason: null,
    },
  };
  const validation = validateCareerRunV5(migrated);
  if (!validation.ok) {
    throw new TypeError('career_migration.invalid_v5');
  }
  return deepFreeze(migrated);
}
