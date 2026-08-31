import { createEmptyPlayerSkillState } from '../../skills/state.js';
import { NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES } from '../../skills/effects.js';
import type { WeeklyActionId } from '../../weekly/ids.js';
import type {
  CareerPhaseV2,
  WeeklyActionResultV1,
  WeeklyActionResultV2,
} from '../../weekly/types.js';
import { cloneSerializable, deepFreeze } from '../immutable.js';
import {
  CAREER_SCHEMA_VERSION_V2,
  RECENT_WEEKLY_ACTION_ID_LIMIT,
  type CareerRunV1,
  type CareerRunV2,
} from '../types.js';
import { validateCareerRunV1, validateCareerRunV2 } from '../validation.js';

function deriveRecentWeeklyActionIds(career: CareerRunV1): readonly WeeklyActionId[] {
  if (career.phase.type === 'PLAN_ACTIONS') {
    return [];
  }

  return career.phase.results.map(({ actionId }) => actionId).slice(-RECENT_WEEKLY_ACTION_ID_LIMIT);
}

function migrateWeeklyActionResult(result: WeeklyActionResultV1): WeeklyActionResultV2 {
  return {
    ...cloneSerializable(result),
    baseBodyDelta: result.requestedBodyDelta,
    baseGpaDelta: result.requestedGpaDelta,
    skillEffectAggregates: cloneSerializable(NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES),
    appliedSkillEffects: [],
  };
}

function migratePhase(career: CareerRunV1): CareerPhaseV2 {
  if (career.phase.type === 'PLAN_ACTIONS') {
    return { type: 'PLAN_ACTIONS' };
  }
  const results = career.phase.results.map(migrateWeeklyActionResult);
  if (career.phase.type === 'RESOLVE_ACTIONS') {
    return {
      type: 'RESOLVE_ACTIONS',
      actionIds: [...career.phase.actionIds],
      nextActionIndex: career.phase.nextActionIndex,
      results,
    };
  }
  return {
    type: 'WEEK_END',
    results: [
      results[0] as WeeklyActionResultV2,
      results[1] as WeeklyActionResultV2,
      results[2] as WeeklyActionResultV2,
    ],
  };
}

/**
 * Performs the exact schema-v1 to schema-v2 migration without advancing the
 * simulation, consuming RNG, or changing revision. Only data persisted in the
 * active v1 phase is used to seed the bounded recent-action history.
 */
export function migrateCareerRunV1ToV2(career: CareerRunV1): CareerRunV2 {
  const sourceValidation = validateCareerRunV1(career);
  if (!sourceValidation.ok) {
    throw new TypeError('career_migration.invalid_v1');
  }

  const snapshot = cloneSerializable(career);
  const migrated: CareerRunV2 = {
    ...snapshot,
    schemaVersion: CAREER_SCHEMA_VERSION_V2,
    recentWeeklyActionIds: deriveRecentWeeklyActionIds(snapshot),
    lastPassiveBodyRecovery: null,
    phase: migratePhase(snapshot),
    player: {
      ...snapshot.player,
      skillState: createEmptyPlayerSkillState(),
    },
  };
  const validation = validateCareerRunV2(migrated);
  if (!validation.ok) {
    throw new TypeError('career_migration.invalid_v2');
  }

  return deepFreeze(migrated);
}
