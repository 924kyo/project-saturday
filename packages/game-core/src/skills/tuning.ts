import type { SkillGameHookId, SkillLifeHookId } from './ids.js';

export const SKILL_NEUTRAL_MULTIPLIER_PERMILLE = 1000 as const;

export const SKILL_BASE_OFFER_WEIGHT_BOUNDS = Object.freeze({ min: 1, max: 1_000_000 });
export const SKILL_BEHAVIOR_WEIGHT_BONUS_BOUNDS = Object.freeze({ min: 1, max: 1_000_000 });
export const SKILL_BEHAVIOR_WEIGHT_RULE_MAX = 8 as const;
export const SKILL_EFFECT_COUNT_BOUNDS = Object.freeze({ min: 1, max: 12 });
export const SKILL_APPLIED_WEEKLY_EFFECT_MAX = 48 as const;
export const SKILL_ELIGIBILITY_ID_LIST_MAX = 16 as const;
export const SKILL_ACTION_SCOPE_ID_LIST_MAX = 16 as const;
export const SKILL_BREAKTHROUGH_FIRST_COMPLETED_WEEK = 1 as const;
export const SKILL_BREAKTHROUGH_INTERVAL_WEEKS = 4 as const;
export const SKILL_BREAKTHROUGH_GAUGE_THRESHOLD = 100 as const;
export const SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX = 60 as const;
export const SKILL_BREAKTHROUGH_PROGRESS_SOURCE_COUNT_MAX = 6 as const;
export const SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX = 40 as const;
export const SKILL_BREAKTHROUGH_AFFINITY_POINTS_PER_UNIT = 4 as const;
export const SKILL_OFFER_TOTAL_WEIGHT_MAX = 0x1_0000_0000 as const;

export function isSkillBreakthroughCadenceWeek(completedWeekNumber: number): boolean {
  return (
    Number.isSafeInteger(completedWeekNumber) &&
    completedWeekNumber >= SKILL_BREAKTHROUGH_FIRST_COMPLETED_WEEK &&
    (completedWeekNumber - SKILL_BREAKTHROUGH_FIRST_COMPLETED_WEEK) %
      SKILL_BREAKTHROUGH_INTERVAL_WEEKS ===
      0
  );
}

export const SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS = Object.freeze({
  min: 500,
  max: 1500,
});
export const SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS = Object.freeze({ min: 250, max: 2000 });
export const SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS = Object.freeze({
  min: 250,
  max: 2000,
});

export const SKILL_BODY_DELTA_FLAT_BOUNDS = Object.freeze({ min: -20, max: 20 });
export const SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS = Object.freeze({ min: -40, max: 40 });
export const SKILL_EFFECTIVE_BODY_DELTA_BOUNDS = Object.freeze({ min: -120, max: 80 });

export const SKILL_GPA_DELTA_MILLI_BOUNDS = Object.freeze({ min: -250, max: 250 });
export const SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS = Object.freeze({ min: -500, max: 500 });
export const SKILL_EFFECTIVE_GPA_DELTA_MILLI_BOUNDS = Object.freeze({
  min: -1000,
  max: 1000,
});
export const SKILL_PREPARATION_DELTA_FLAT_BOUNDS = Object.freeze({ min: -20, max: 20 });
export const SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS = Object.freeze({ min: -30, max: 30 });
export const SKILL_EFFECTIVE_PREPARATION_DELTA_BOUNDS = Object.freeze({ min: -55, max: 55 });
export const SKILL_CONFIDENCE_DELTA_FLAT_BOUNDS = Object.freeze({ min: -20, max: 20 });
export const SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS = Object.freeze({ min: -30, max: 30 });
export const SKILL_EFFECTIVE_CONFIDENCE_DELTA_BOUNDS = Object.freeze({ min: -55, max: 55 });
export const SKILL_PRACTICE_IMPACT_FLAT_BOUNDS = Object.freeze({ min: -10, max: 10 });
export const SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS = Object.freeze({ min: -15, max: 15 });

export const SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS = Object.freeze({ min: -20, max: 20 });
export const SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS = Object.freeze({
  min: -40,
  max: 40,
});
export const SKILL_INJURY_RISK_MULTIPLIER_AGGREGATE_BOUNDS = Object.freeze({
  min: 500,
  max: 1500,
});

export const SKILL_GAME_HOOK_VALUE_MILLI_BOUNDS = Object.freeze({
  game_hook_coverage_clue_bonus: Object.freeze({ min: 1000, max: 1000 }),
  game_hook_contested_catch_success_bonus: Object.freeze({ min: 1, max: 500 }),
  game_hook_tipped_turnover_risk_bonus: Object.freeze({ min: 1, max: 500 }),
  game_hook_yac_yardage_multiplier: Object.freeze({ min: 1001, max: 1500 }),
  game_hook_fumble_risk_multiplier: Object.freeze({ min: 500, max: 1500 }),
  game_hook_assignment_reliability_bonus: Object.freeze({ min: 1, max: 500 }),
  game_hook_package_snap_bonus: Object.freeze({ min: 1, max: 250 }),
  game_hook_pressure_composure_bonus: Object.freeze({ min: 1, max: 500 }),
} satisfies Readonly<Record<SkillGameHookId, Readonly<{ min: number; max: number }>>>);

export const SKILL_LIFE_HOOK_VALUE_MILLI_BOUNDS = Object.freeze({
  life_hook_nil_reward_multiplier: Object.freeze({ min: 500, max: 1500 }),
  life_hook_event_option_access: Object.freeze({ min: 1000, max: 1000 }),
  life_hook_relationship_gain_multiplier: Object.freeze({ min: 1001, max: 1500 }),
} satisfies Readonly<Record<SkillLifeHookId, Readonly<{ min: number; max: number }>>>);
