import { isStableDomainId } from '../player/ids.js';

export const SKILL_ID_PREFIX = 'skill_' as const;

export const SKILL_GRADE_IDS = Object.freeze([
  'skill_grade_c',
  'skill_grade_b',
  'skill_grade_a',
  'skill_grade_s',
] as const);

export const SKILL_FAMILY_IDS = Object.freeze([
  'skill_family_development',
  'skill_family_role_coach',
  'skill_family_game_day',
  'skill_family_body',
  'skill_family_mindset',
  'skill_family_life',
] as const);

export const SKILL_EFFECT_TYPES = Object.freeze([
  'action_xp_multiplier',
  'action_body_cost_multiplier',
  'action_body_delta_flat',
  'action_gpa_delta_milli',
  'action_preparation_delta_flat',
  'action_confidence_delta_flat',
  'action_practice_impact_flat',
  'passive_body_recovery_flat',
  'injury_risk_multiplier',
  'game_hook',
  'life_hook',
] as const);

export const SKILL_EFFECT_CONDITION_TYPES = Object.freeze([
  'always',
  'body_at_least',
  'body_at_most',
  'action_occurrence_at_least',
  'plan_distinct_action_count_at_least',
  'previous_action_id',
] as const);

export const SKILL_GAME_HOOK_IDS = Object.freeze([
  'game_hook_coverage_clue_bonus',
  'game_hook_contested_catch_success_bonus',
  'game_hook_tipped_turnover_risk_bonus',
  'game_hook_yac_yardage_multiplier',
  'game_hook_fumble_risk_multiplier',
  'game_hook_assignment_reliability_bonus',
  'game_hook_package_snap_bonus',
  'game_hook_pressure_composure_bonus',
] as const);

export const SKILL_LIFE_HOOK_IDS = Object.freeze([
  'life_hook_nil_reward_multiplier',
  'life_hook_event_option_access',
  'life_hook_relationship_gain_multiplier',
] as const);

export const SKILL_BEHAVIOR_TAG_IDS = Object.freeze([
  'behavior_repeat_action',
  'behavior_varied_actions',
  'behavior_study_then_training',
] as const);

export const SKILL_BREAKTHROUGH_SOURCE_IDS = Object.freeze([
  'breakthrough_source_development',
  'breakthrough_source_role_coach',
  'breakthrough_source_game_day',
  'breakthrough_source_mindset',
  'breakthrough_source_body',
  'breakthrough_source_life',
] as const);

export type SkillId = `${typeof SKILL_ID_PREFIX}${string}`;
export type SkillGradeId = (typeof SKILL_GRADE_IDS)[number];
export type SkillFamilyId = (typeof SKILL_FAMILY_IDS)[number];
export type SkillEffectType = (typeof SKILL_EFFECT_TYPES)[number];
export type SkillEffectConditionType = (typeof SKILL_EFFECT_CONDITION_TYPES)[number];
export type SkillGameHookId = (typeof SKILL_GAME_HOOK_IDS)[number];
export type SkillLifeHookId = (typeof SKILL_LIFE_HOOK_IDS)[number];
export type SkillBehaviorTagId = (typeof SKILL_BEHAVIOR_TAG_IDS)[number];
export type SkillBreakthroughSourceId = (typeof SKILL_BREAKTHROUGH_SOURCE_IDS)[number];

function isOneOf<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): value is TValues[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export function isSkillId(value: unknown): value is SkillId {
  return (
    isStableDomainId(value) &&
    value.startsWith(SKILL_ID_PREFIX) &&
    !value.startsWith('skill_grade_') &&
    !value.startsWith('skill_family_')
  );
}

export function isSkillGradeId(value: unknown): value is SkillGradeId {
  return isOneOf(value, SKILL_GRADE_IDS);
}

export function isSkillFamilyId(value: unknown): value is SkillFamilyId {
  return isOneOf(value, SKILL_FAMILY_IDS);
}

export function isSkillEffectType(value: unknown): value is SkillEffectType {
  return isOneOf(value, SKILL_EFFECT_TYPES);
}

export function isSkillEffectConditionType(value: unknown): value is SkillEffectConditionType {
  return isOneOf(value, SKILL_EFFECT_CONDITION_TYPES);
}

export function isSkillGameHookId(value: unknown): value is SkillGameHookId {
  return isOneOf(value, SKILL_GAME_HOOK_IDS);
}

export function isSkillLifeHookId(value: unknown): value is SkillLifeHookId {
  return isOneOf(value, SKILL_LIFE_HOOK_IDS);
}

export function isSkillBehaviorTagId(value: unknown): value is SkillBehaviorTagId {
  return isOneOf(value, SKILL_BEHAVIOR_TAG_IDS);
}

export function isSkillBreakthroughSourceId(value: unknown): value is SkillBreakthroughSourceId {
  return isOneOf(value, SKILL_BREAKTHROUGH_SOURCE_IDS);
}
