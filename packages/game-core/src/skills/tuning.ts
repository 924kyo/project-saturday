import type { SkillGameHookId } from './ids.js';

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

export const SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS = Object.freeze({ min: -20, max: 20 });
export const SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS = Object.freeze({
  min: -40,
  max: 40,
});

export const SKILL_GAME_HOOK_VALUE_MILLI_BOUNDS = Object.freeze({
  game_hook_coverage_clue_bonus: Object.freeze({ min: 1000, max: 1000 }),
  game_hook_contested_catch_success_bonus: Object.freeze({ min: 1, max: 500 }),
  game_hook_tipped_turnover_risk_bonus: Object.freeze({ min: 1, max: 500 }),
  game_hook_yac_yardage_multiplier: Object.freeze({ min: 1001, max: 1500 }),
  game_hook_fumble_risk_multiplier: Object.freeze({ min: 500, max: 1500 }),
} satisfies Readonly<Record<SkillGameHookId, Readonly<{ min: number; max: number }>>>);
