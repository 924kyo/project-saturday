import { compareCodeUnits } from '../player/order.js';
import { isInjuryAvailabilityId, isInjuryOutcomeId, isInjurySeverityId } from './ids.js';
import type { InjuryOutcomeMechanicsDefinition, InjuryTuningDefinition } from './types.js';

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: UnknownRecord, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

export function isInjuryOutcomeMechanicsDefinition(
  value: unknown,
): value is InjuryOutcomeMechanicsDefinition {
  return (
    isRecord(value) &&
    exact(value, [
      'id',
      'severityId',
      'availabilityId',
      'durationWeeks',
      'opportunityCap',
      'minimumRiskPermille',
      'weight',
    ]) &&
    isInjuryOutcomeId(value['id']) &&
    isInjurySeverityId(value['severityId']) &&
    isInjuryAvailabilityId(value['availabilityId']) &&
    value['availabilityId'] !== 'injury_availability_full' &&
    integer(value['durationWeeks'], 1, 12) &&
    integer(value['opportunityCap'], 0, 4) &&
    integer(value['minimumRiskPermille'], 0, 1_000) &&
    integer(value['weight'], 1, 1_000) &&
    (value['availabilityId'] === 'injury_availability_out'
      ? value['opportunityCap'] === 0
      : value['opportunityCap'] >= 1)
  );
}

export function isInjuryOutcomeMechanicsDefinitionCatalog(
  value: unknown,
): value is readonly InjuryOutcomeMechanicsDefinition[] {
  if (
    !Array.isArray(value) ||
    value.length < 8 ||
    value.length > 12 ||
    !value.every(isInjuryOutcomeMechanicsDefinition)
  ) {
    return false;
  }
  const ids = value.map(({ id }) => id);
  return (
    new Set(ids).size === ids.length &&
    value.some(({ minimumRiskPermille }) => minimumRiskPermille === 0)
  );
}

export function canonicalizeInjuryOutcomeDefinitions(
  definitions: readonly InjuryOutcomeMechanicsDefinition[],
): readonly InjuryOutcomeMechanicsDefinition[] {
  return [...definitions]
    .map((definition) => ({ ...definition }))
    .sort((left, right) => compareCodeUnits(left.id, right.id));
}

export function isInjuryTuningDefinition(value: unknown): value is InjuryTuningDefinition {
  if (
    !isRecord(value) ||
    !exact(value, [
      'model',
      'baseRiskPermille',
      'positionExposurePermille',
      'bodyDeficitWeightPermille',
      'durabilityDeficitWeightPermille',
      'workloadWeightPermille',
      'trainingLoadWeightPermille',
      'passiveRecoveryRiskWeightPermille',
      'maximumRiskPermille',
      'restBodyDelta',
      'restConfidenceDelta',
      'restRecoveryCreditWeeks',
      'playLimitedBodyDelta',
      'playLimitedCoachTrustDelta',
    ]) ||
    value['model'] !== 'injury_v1'
  ) {
    return false;
  }
  for (const key of [
    'baseRiskPermille',
    'positionExposurePermille',
    'bodyDeficitWeightPermille',
    'durabilityDeficitWeightPermille',
    'workloadWeightPermille',
    'trainingLoadWeightPermille',
    'passiveRecoveryRiskWeightPermille',
  ] as const) {
    if (!integer(value[key], 0, 2_000)) return false;
  }
  return (
    integer(value['baseRiskPermille'], 0, 2_000) &&
    integer(value['maximumRiskPermille'], 1, 500) &&
    value['baseRiskPermille'] <= value['maximumRiskPermille'] &&
    integer(value['restBodyDelta'], 0, 20) &&
    integer(value['restConfidenceDelta'], -20, 0) &&
    integer(value['restRecoveryCreditWeeks'], 1, 3) &&
    integer(value['playLimitedBodyDelta'], -20, 0) &&
    integer(value['playLimitedCoachTrustDelta'], 0, 20)
  );
}
