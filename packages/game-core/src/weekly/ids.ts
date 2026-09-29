import { isStableDomainId } from '../player/ids.js';

export const WEEKLY_ACTION_IDS = Object.freeze([
  'action_route_drills',
  'action_release_drills',
  'action_hands_catch_work',
  'action_weight_room',
  'action_speed_work',
  'action_film_study',
  'action_extra_practice',
  'action_recovery',
  'action_study_hall',
] as const);

export const TRAINING_PROFICIENCY_IDS = Object.freeze([
  'proficiency_route_drills',
  'proficiency_release_drills',
  'proficiency_hands_catch_work',
  'proficiency_weight_room',
  'proficiency_speed_work',
  'proficiency_film_study',
  'proficiency_extra_practice',
] as const);

/** Staged M7 position training IDs; current WR save tuples remain unchanged until activation. */
export const POSITION_TRAINING_ACTION_IDS = Object.freeze([
  'action_qb_delivery_work',
  'action_qb_coverage_recognition',
  'action_qb_pressure_movement',
  'action_rb_vision_tracks',
  'action_rb_security_contact',
  'action_rb_third_down_work',
  'action_cb_mirror_press',
  'action_cb_zone_recognition',
  'action_cb_tackle_recovery',
  'action_wr_route_craft',
  'action_wr_separation',
  'action_wr_catch_point',
] as const);

export const POSITION_TRAINING_PROFICIENCY_IDS = Object.freeze([
  'proficiency_qb_delivery_work',
  'proficiency_qb_coverage_recognition',
  'proficiency_qb_pressure_movement',
  'proficiency_rb_vision_tracks',
  'proficiency_rb_security_contact',
  'proficiency_rb_third_down_work',
  'proficiency_cb_mirror_press',
  'proficiency_cb_zone_recognition',
  'proficiency_cb_tackle_recovery',
  'proficiency_wr_route_craft',
  'proficiency_wr_separation',
  'proficiency_wr_catch_point',
] as const);

export const WEEKLY_ACTION_EFFECT_IDS = Object.freeze([
  'effect_attribute_progress',
  'effect_body_change',
  'effect_preparation_change',
  'effect_confidence_change',
  'effect_gpa_change',
  'effect_proficiency_progress',
] as const);

export const WEEKLY_ACTION_TAG_ID_PREFIX = 'action_' as const;

export const WEEKLY_COMMAND_FAILURE_REASONS = Object.freeze([
  'weekly.invalid_career',
  'weekly.invalid_phase',
  'weekly.recruiting_required',
  'weekly.invalid_plan_length',
  'weekly.invalid_action_id',
  'weekly.action_unavailable',
  'weekly.off_field_obligation_required',
  'weekly.invalid_available_actions',
  'weekly.invalid_action_definition',
  'weekly.action_definition_mismatch',
  'weekly.invalid_development_config',
  'weekly.invalid_skill_definitions',
  'weekly.invalid_action_definitions',
  'weekly.invalid_offense_definitions',
  'weekly.invalid_rotation_definitions',
  'weekly.invalid_skill_offer_weights',
  'weekly.missing_equipped_skill_definition',
  'weekly.rng_exhausted',
  'weekly.revision_exhausted',
  'weekly.week_index_exhausted',
  'weekly.internal_invariant_failure',
] as const);

export type WeeklyActionId = (typeof WEEKLY_ACTION_IDS)[number];
export type WeeklyActionTagId = `${typeof WEEKLY_ACTION_TAG_ID_PREFIX}${string}`;
export type TrainingProficiencyId = (typeof TRAINING_PROFICIENCY_IDS)[number];
export type WeeklyActionEffectId = (typeof WEEKLY_ACTION_EFFECT_IDS)[number];
export type PositionTrainingActionId = (typeof POSITION_TRAINING_ACTION_IDS)[number];
export type PositionTrainingProficiencyId = (typeof POSITION_TRAINING_PROFICIENCY_IDS)[number];
export type WeeklyCommandFailureReason = (typeof WEEKLY_COMMAND_FAILURE_REASONS)[number];

export const WEEKLY_ACTION_PROFICIENCY_IDS = Object.freeze({
  action_route_drills: 'proficiency_route_drills',
  action_release_drills: 'proficiency_release_drills',
  action_hands_catch_work: 'proficiency_hands_catch_work',
  action_weight_room: 'proficiency_weight_room',
  action_speed_work: 'proficiency_speed_work',
  action_film_study: 'proficiency_film_study',
  action_extra_practice: 'proficiency_extra_practice',
  action_recovery: null,
  action_study_hall: null,
} as const satisfies Readonly<Record<WeeklyActionId, TrainingProficiencyId | null>>);

function isOneOf<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): value is TValues[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export function isWeeklyActionId(value: unknown): value is WeeklyActionId {
  return isOneOf(value, WEEKLY_ACTION_IDS);
}

export function isWeeklyActionTagId(value: unknown): value is WeeklyActionTagId {
  return (
    isStableDomainId(value) &&
    value.startsWith(WEEKLY_ACTION_TAG_ID_PREFIX) &&
    !isWeeklyActionId(value)
  );
}

export function isTrainingProficiencyId(value: unknown): value is TrainingProficiencyId {
  return isOneOf(value, TRAINING_PROFICIENCY_IDS);
}

export function isWeeklyActionEffectId(value: unknown): value is WeeklyActionEffectId {
  return isOneOf(value, WEEKLY_ACTION_EFFECT_IDS);
}

export function isPositionTrainingActionId(value: unknown): value is PositionTrainingActionId {
  return isOneOf(value, POSITION_TRAINING_ACTION_IDS);
}

export function isPositionTrainingProficiencyId(
  value: unknown,
): value is PositionTrainingProficiencyId {
  return isOneOf(value, POSITION_TRAINING_PROFICIENCY_IDS);
}
