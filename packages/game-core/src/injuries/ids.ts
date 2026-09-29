import { isStableDomainId } from '../player/ids.js';

export const INJURY_SEVERITY_IDS = [
  'injury_severity_minor_restriction',
  'injury_severity_short_absence',
  'injury_severity_multiweek_absence',
  'injury_severity_season_impact',
] as const;

export const INJURY_AVAILABILITY_IDS = [
  'injury_availability_full',
  'injury_availability_limited',
  'injury_availability_out',
] as const;

export const INJURY_CHOICE_IDS = [
  'injury_choice_rest_rehab',
  'injury_choice_play_limited',
] as const;

export const INJURY_COMMAND_FAILURE_REASONS = [
  'injury.invalid_career',
  'injury.invalid_phase',
  'injury.invalid_definitions',
  'injury.invalid_tuning',
  'injury.invalid_choice',
  'injury.invalid_skill_definitions',
  'injury.revision_exhausted',
  'injury.rng_exhausted',
  'injury.internal_invariant_failure',
] as const;

export type InjuryOutcomeId = `injury_outcome_${string}`;
export type InjurySeverityId = (typeof INJURY_SEVERITY_IDS)[number];
export type InjuryAvailabilityId = (typeof INJURY_AVAILABILITY_IDS)[number];
export type InjuryChoiceId = (typeof INJURY_CHOICE_IDS)[number];
export type InjuryCommandFailureReason = (typeof INJURY_COMMAND_FAILURE_REASONS)[number];

export function isInjuryOutcomeId(value: unknown): value is InjuryOutcomeId {
  return (
    isStableDomainId(value) &&
    value.startsWith('injury_outcome_') &&
    value.length > 'injury_outcome_'.length
  );
}

export function isInjurySeverityId(value: unknown): value is InjurySeverityId {
  return INJURY_SEVERITY_IDS.some((candidate) => candidate === value);
}

export function isInjuryAvailabilityId(value: unknown): value is InjuryAvailabilityId {
  return INJURY_AVAILABILITY_IDS.some((candidate) => candidate === value);
}

export function isInjuryChoiceId(value: unknown): value is InjuryChoiceId {
  return INJURY_CHOICE_IDS.some((candidate) => candidate === value);
}
