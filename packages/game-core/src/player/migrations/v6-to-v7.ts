import { cloneSerializable, deepFreeze } from '../immutable.js';
import { CAREER_SCHEMA_VERSION_V7, type CareerRunV6, type CareerRunV7 } from '../types.js';
import { validateCareerRunV6, validateCareerRunV7 } from '../validation.js';

/**
 * Establishes the M7 wire boundary without activating a new position. Every
 * v6 WR field, phase, evidence item, revision, and RNG value is preserved.
 */
export function migrateCareerRunV6ToV7(career: CareerRunV6): CareerRunV7 {
  const sourceValidation = validateCareerRunV6(career);
  if (!sourceValidation.ok) throw new TypeError('career_migration.invalid_v6');
  const migrated: CareerRunV7 = {
    ...cloneSerializable(career),
    schemaVersion: CAREER_SCHEMA_VERSION_V7,
  };
  const validation = validateCareerRunV7(migrated);
  if (!validation.ok) throw new TypeError('career_migration.invalid_v7');
  return deepFreeze(migrated);
}
