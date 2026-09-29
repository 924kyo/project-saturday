import type {
  CareerPhaseV2,
  CareerPhaseV3,
  WeeklyActionResultV2,
  WeeklyActionResultV3,
} from '../../weekly/types.js';
import { cloneSerializable, deepFreeze } from '../immutable.js';
import { CAREER_SCHEMA_VERSION_V3, type CareerRunV2, type CareerRunV3 } from '../types.js';
import { validateCareerRunV2, validateCareerRunV3 } from '../validation.js';

function migrateWeeklyActionResult(result: WeeklyActionResultV2): WeeklyActionResultV3 {
  return {
    ...cloneSerializable(result),
    practiceImpact: 0,
  };
}

function migratePhase(phase: CareerPhaseV2): CareerPhaseV3 {
  if (phase.type === 'PLAN_ACTIONS' || phase.type === 'SKILL_BREAKTHROUGH') {
    return cloneSerializable(phase);
  }

  const results = phase.results.map(migrateWeeklyActionResult);
  if (phase.type === 'RESOLVE_ACTIONS') {
    return {
      type: 'RESOLVE_ACTIONS',
      actionIds: [...phase.actionIds],
      nextActionIndex: phase.nextActionIndex,
      results,
    };
  }

  return {
    type: 'WEEK_END',
    results: [
      results[0] as WeeklyActionResultV3,
      results[1] as WeeklyActionResultV3,
      results[2] as WeeklyActionResultV3,
    ],
    depthUpdate: null,
  };
}

/**
 * Migrates schema v2 without advancing gameplay, consuming RNG, assigning a
 * placeholder program, or changing revision. Existing in-flight M2 work stays
 * authoritative and recruiting begins only through a later explicit command.
 */
export function migrateCareerRunV2ToV3(career: CareerRunV2): CareerRunV3 {
  const sourceValidation = validateCareerRunV2(career);
  if (!sourceValidation.ok) {
    throw new TypeError('career_migration.invalid_v2');
  }

  const snapshot = cloneSerializable(career);
  const migrated: CareerRunV3 = {
    ...snapshot,
    schemaVersion: CAREER_SCHEMA_VERSION_V3,
    programId: null,
    recruitingState: { type: 'NOT_STARTED' },
    programContext: null,
    phase: migratePhase(snapshot.phase),
  };
  const validation = validateCareerRunV3(migrated);
  if (!validation.ok) {
    throw new TypeError('career_migration.invalid_v3');
  }
  return deepFreeze(migrated);
}
