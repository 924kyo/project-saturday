import { createPendingOffFieldCareerState } from '../../off-field/state.js';
import { cloneSerializable, deepFreeze } from '../immutable.js';
import { CAREER_SCHEMA_VERSION_V6, type CareerRunV5, type CareerRunV6 } from '../types.js';
import { validateCareerRunV5, validateCareerRunV6 } from '../validation.js';

/**
 * Adds only neutral M6 state. Existing identity, gameplay evidence, phase,
 * revisions, completed-season outcome, and both deterministic RNG domains are
 * preserved without advancing the run.
 */
export function migrateCareerRunV5ToV6(career: CareerRunV5): CareerRunV6 {
  const sourceValidation = validateCareerRunV5(career);
  if (!sourceValidation.ok) {
    throw new TypeError('career_migration.invalid_v5');
  }

  const migrated: CareerRunV6 = {
    ...cloneSerializable(career),
    schemaVersion: CAREER_SCHEMA_VERSION_V6,
    offFieldCareerState: createPendingOffFieldCareerState(),
  };
  const validation = validateCareerRunV6(migrated);
  if (!validation.ok) {
    throw new TypeError('career_migration.invalid_v6');
  }
  return deepFreeze(migrated);
}
