import { createEmptyGameCareerState } from '../../games/types.js';
import { SKILL_BREAKTHROUGH_GAUGE_THRESHOLD } from '../../skills/tuning.js';
import { INITIAL_PREPARATION } from '../bounds.js';
import { cloneSerializable, deepFreeze } from '../immutable.js';
import { CAREER_SCHEMA_VERSION_V4, type CareerRunV3, type CareerRunV4 } from '../types.js';
import { validateCareerRunV3, validateCareerRunV4 } from '../validation.js';
import {
  WEEKLY_EXPERIENCE_VERSION_CURRENT,
  WEEKLY_EXPERIENCE_VERSION_LEGACY,
} from '../../weekly/types.js';

/**
 * Migrates schema v3 without advancing gameplay, preparing a matchup,
 * consuming RNG, changing phase, or changing revision.
 */
export function migrateCareerRunV3ToV4(career: CareerRunV3): CareerRunV4 {
  const sourceValidation = validateCareerRunV3(career);
  if (!sourceValidation.ok) {
    throw new TypeError('career_migration.invalid_v3');
  }

  const snapshot = cloneSerializable(career);
  const migrated: CareerRunV4 = {
    ...snapshot,
    schemaVersion: CAREER_SCHEMA_VERSION_V4,
    gameCareerState: createEmptyGameCareerState(),
    weeklyExperienceVersion:
      snapshot.phase.type === 'RESOLVE_ACTIONS' || snapshot.phase.type === 'WEEK_END'
        ? WEEKLY_EXPERIENCE_VERSION_LEGACY
        : WEEKLY_EXPERIENCE_VERSION_CURRENT,
    player: {
      ...snapshot.player,
      skillState: {
        ...snapshot.player.skillState,
        breakthroughGauge: {
          model: 'gauge_v1',
          progress: 0,
          threshold: SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
          lastProgress: null,
        },
      },
      state: {
        ...snapshot.player.state,
        preparation: INITIAL_PREPARATION,
      },
    },
  };
  const validation = validateCareerRunV4(migrated);
  if (!validation.ok) {
    throw new TypeError('career_migration.invalid_v4');
  }
  return deepFreeze(migrated);
}
