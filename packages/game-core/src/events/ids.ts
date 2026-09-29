import { isStableDomainId } from '../player/ids.js';

export const EVENT_COMMAND_FAILURE_REASONS = [
  'event.invalid_career',
  'event.invalid_phase',
  'event.invalid_context',
  'event.invalid_definitions',
  'event.invalid_tuning',
  'event.invalid_choice',
  'event.revision_exhausted',
  'event.rng_exhausted',
  'event.internal_invariant_failure',
] as const;

export const EVENT_STATE_PREDICATE_FIELD_IDS = [
  'event_state_body',
  'event_state_preparation',
  'event_state_confidence',
  'event_state_coach_trust',
  'event_state_brand',
  'event_state_gpa_milli',
  'event_state_depth_rank',
  'event_state_week_index',
] as const;

export const EVENT_INTEGER_STATE_IDS = [
  'event_state_body',
  'event_state_preparation',
  'event_state_confidence',
  'event_state_coach_trust',
  'event_state_brand',
] as const;

export const EVENT_PREDICATE_OPERATOR_IDS = [
  'event_predicate_eq',
  'event_predicate_gte',
  'event_predicate_lte',
] as const;

export type EventId = `event_${string}`;
export type EventChoiceId = `event_choice_${string}`;
export type EventCategoryId = `event_category_${string}`;
export type EventCommandFailureReason = (typeof EVENT_COMMAND_FAILURE_REASONS)[number];
export type EventStatePredicateFieldId = (typeof EVENT_STATE_PREDICATE_FIELD_IDS)[number];
export type EventIntegerStateId = (typeof EVENT_INTEGER_STATE_IDS)[number];
export type EventPredicateOperatorId = (typeof EVENT_PREDICATE_OPERATOR_IDS)[number];

function isPrefixedId(value: unknown, prefix: string): value is string {
  return isStableDomainId(value) && value.startsWith(prefix) && value.length > prefix.length;
}

export function isEventId(value: unknown): value is EventId {
  return (
    isPrefixedId(value, 'event_') &&
    !['event_choice_', 'event_category_', 'event_state_', 'event_predicate_'].some((prefix) =>
      String(value).startsWith(prefix),
    )
  );
}

export function isEventChoiceId(value: unknown): value is EventChoiceId {
  return isPrefixedId(value, 'event_choice_');
}

export function isEventCategoryId(value: unknown): value is EventCategoryId {
  return isPrefixedId(value, 'event_category_');
}

export function isEventStatePredicateFieldId(value: unknown): value is EventStatePredicateFieldId {
  return EVENT_STATE_PREDICATE_FIELD_IDS.some((candidate) => candidate === value);
}

export function isEventIntegerStateId(value: unknown): value is EventIntegerStateId {
  return EVENT_INTEGER_STATE_IDS.some((candidate) => candidate === value);
}

export function isEventPredicateOperatorId(value: unknown): value is EventPredicateOperatorId {
  return EVENT_PREDICATE_OPERATOR_IDS.some((candidate) => candidate === value);
}
