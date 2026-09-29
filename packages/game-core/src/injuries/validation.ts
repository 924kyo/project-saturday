import { compareCodeUnits } from '../player/order.js';
import {
  INJURY_CHOICE_IDS,
  isInjuryAvailabilityId,
  isInjuryChoiceId,
  isInjuryOutcomeId,
  isInjurySeverityId,
} from './ids.js';
import type {
  InjuryAvailabilityEvidence,
  InjuryCareerState,
  NewInjuryEvidence,
  PendingInjuryChoiceEvidence,
  WeeklyInjuryAssessmentEvidence,
} from './types.js';

type UnknownRecord = Readonly<Record<string, unknown>>;

function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: UnknownRecord, keys: readonly string[]): boolean {
  return (
    JSON.stringify(Object.keys(value).sort(compareCodeUnits)) ===
    JSON.stringify([...keys].sort(compareCodeUnits))
  );
}

function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

export function isNewInjuryEvidence(value: unknown): value is NewInjuryEvidence {
  return (
    record(value) &&
    exact(value, [
      'outcomeId',
      'severityId',
      'startedWeekIndex',
      'originalDurationWeeks',
      'remainingWeeks',
      'defaultAvailabilityId',
      'opportunityCap',
    ]) &&
    isInjuryOutcomeId(value['outcomeId']) &&
    isInjurySeverityId(value['severityId']) &&
    integer(value['startedWeekIndex']) &&
    integer(value['originalDurationWeeks'], 1, 12) &&
    integer(value['remainingWeeks'], 1, value['originalDurationWeeks']) &&
    isInjuryAvailabilityId(value['defaultAvailabilityId']) &&
    value['defaultAvailabilityId'] !== 'injury_availability_full' &&
    integer(value['opportunityCap'], 0, 4) &&
    (value['defaultAvailabilityId'] === 'injury_availability_out'
      ? value['opportunityCap'] === 0
      : value['opportunityCap'] >= 1)
  );
}

function isAppliedSkillEffect(value: unknown): boolean {
  if (
    !record(value) ||
    typeof value['skillId'] !== 'string' ||
    !value['skillId'].startsWith('skill_') ||
    !integer(value['slotIndex'], 0, 3) ||
    !integer(value['effectIndex'], 0, 11)
  ) {
    return false;
  }
  if (value['type'] === 'passive_body_recovery_flat') {
    return (
      exact(value, ['type', 'skillId', 'slotIndex', 'effectIndex', 'delta']) &&
      integer(value['delta'], -20, 20) &&
      value['delta'] !== 0
    );
  }
  return (
    value['type'] === 'injury_risk_multiplier' &&
    exact(value, ['type', 'skillId', 'slotIndex', 'effectIndex', 'multiplierPermille']) &&
    integer(value['multiplierPermille'], 500, 1500) &&
    value['multiplierPermille'] !== 1000
  );
}

export function isWeeklyInjuryAssessmentEvidence(
  value: unknown,
): value is WeeklyInjuryAssessmentEvidence {
  if (!record(value) || value['model'] !== 'injury_assessment_v1') return false;
  if (value['outcome'] === 'ONGOING') {
    return (
      exact(value, [
        'model',
        'weekIndex',
        'outcome',
        'currentOutcomeId',
        'rngDrawCountBefore',
        'rngDrawCountAfter',
      ]) &&
      integer(value['weekIndex']) &&
      isInjuryOutcomeId(value['currentOutcomeId']) &&
      integer(value['rngDrawCountBefore']) &&
      value['rngDrawCountAfter'] === value['rngDrawCountBefore']
    );
  }
  if (
    !exact(value, [
      'model',
      'weekIndex',
      'outcome',
      'components',
      'riskRoll',
      'selectedOutcomeId',
      'outcomeSelectionRoll',
      'eligibleOutcomeIds',
      'totalEligibleWeight',
      'rngDrawCountBefore',
      'rngDrawCountAfter',
    ]) ||
    !integer(value['weekIndex']) ||
    (value['outcome'] !== 'NO_INJURY' && value['outcome'] !== 'INJURY') ||
    !record(value['components']) ||
    !exact(value['components'], [
      'baseRiskPermille',
      'body',
      'bodyRiskPermille',
      'durability',
      'durabilityRiskPermille',
      'workloadSnapPermille',
      'workloadRiskPermille',
      'recentTrainingLoad',
      'trainingRiskPermille',
      'positionExposurePermille',
      'passiveRecoveryDelta',
      'passiveRecoveryRiskPermille',
      'riskBeforeSkillPermille',
      'injuryRiskMultiplierPermille',
      'injuryRiskAdjustmentPermille',
      'appliedSkillEffects',
      'totalRiskPermille',
    ]) ||
    !integer(value['riskRoll'], 0, 999) ||
    !Array.isArray(value['eligibleOutcomeIds']) ||
    !value['eligibleOutcomeIds'].every(isInjuryOutcomeId) ||
    new Set(value['eligibleOutcomeIds']).size !== value['eligibleOutcomeIds'].length ||
    value['eligibleOutcomeIds'].some(
      (id, index, ids) => index > 0 && compareCodeUnits(ids[index - 1]!, id) >= 0,
    ) ||
    !integer(value['totalEligibleWeight'], 0) ||
    !integer(value['rngDrawCountBefore']) ||
    !integer(value['rngDrawCountAfter']) ||
    value['rngDrawCountAfter'] < value['rngDrawCountBefore']
  ) {
    return false;
  }
  const components = value['components'];
  for (const key of [
    'baseRiskPermille',
    'bodyRiskPermille',
    'durabilityRiskPermille',
    'workloadSnapPermille',
    'workloadRiskPermille',
    'recentTrainingLoad',
    'trainingRiskPermille',
    'positionExposurePermille',
    'passiveRecoveryRiskPermille',
    'riskBeforeSkillPermille',
    'totalRiskPermille',
  ]) {
    if (!integer(components[key], 0, 4_000)) return false;
  }
  if (
    !integer(components['body'], 0, 100) ||
    !integer(components['durability'], 0, 100) ||
    !integer(components['passiveRecoveryDelta'], -40, 40) ||
    !integer(components['injuryRiskMultiplierPermille'], 500, 1500) ||
    !integer(components['injuryRiskAdjustmentPermille'], -500, 500) ||
    !Array.isArray(components['appliedSkillEffects']) ||
    !components['appliedSkillEffects'].every(isAppliedSkillEffect)
  ) {
    return false;
  }
  if (
    (components['totalRiskPermille'] as number) -
      (components['riskBeforeSkillPermille'] as number) !==
    components['injuryRiskAdjustmentPermille']
  ) {
    return false;
  }
  if (value['outcome'] === 'NO_INJURY') {
    return (
      value['selectedOutcomeId'] === null &&
      value['outcomeSelectionRoll'] === null &&
      value['rngDrawCountAfter'] === value['rngDrawCountBefore'] + 1
    );
  }
  return (
    isInjuryOutcomeId(value['selectedOutcomeId']) &&
    value['eligibleOutcomeIds'].includes(value['selectedOutcomeId']) &&
    integer(value['outcomeSelectionRoll'], 0, Math.max(0, value['totalEligibleWeight'] - 1)) &&
    value['totalEligibleWeight'] > 0 &&
    value['rngDrawCountAfter'] === value['rngDrawCountBefore'] + 2
  );
}

export function isInjuryAvailabilityEvidence(value: unknown): value is InjuryAvailabilityEvidence {
  if (
    !record(value) ||
    !exact(value, [
      'weekIndex',
      'availabilityId',
      'opportunityCap',
      'choiceId',
      'recoveryCreditWeeks',
      'bodyBefore',
      'requestedBodyDelta',
      'actualBodyDelta',
      'bodyAfter',
      'confidenceBefore',
      'requestedConfidenceDelta',
      'actualConfidenceDelta',
      'confidenceAfter',
      'coachTrustBefore',
      'requestedCoachTrustDelta',
      'actualCoachTrustDelta',
      'coachTrustAfter',
    ]) ||
    !integer(value['weekIndex']) ||
    !isInjuryAvailabilityId(value['availabilityId']) ||
    !integer(value['opportunityCap'], 0, 12) ||
    (value['choiceId'] !== null && !isInjuryChoiceId(value['choiceId'])) ||
    !integer(value['recoveryCreditWeeks'], 0, 3)
  ) {
    return false;
  }
  for (const key of [
    'bodyBefore',
    'bodyAfter',
    'confidenceBefore',
    'confidenceAfter',
    'coachTrustBefore',
    'coachTrustAfter',
  ]) {
    if (!integer(value[key], 0, 100)) return false;
  }
  for (const key of [
    'requestedBodyDelta',
    'actualBodyDelta',
    'requestedConfidenceDelta',
    'actualConfidenceDelta',
    'requestedCoachTrustDelta',
    'actualCoachTrustDelta',
  ]) {
    if (!integer(value[key], -20, 20)) return false;
  }
  const bodyBefore = value['bodyBefore'] as number;
  const bodyAfter = value['bodyAfter'] as number;
  const confidenceBefore = value['confidenceBefore'] as number;
  const confidenceAfter = value['confidenceAfter'] as number;
  const coachTrustBefore = value['coachTrustBefore'] as number;
  const coachTrustAfter = value['coachTrustAfter'] as number;
  return (
    bodyAfter - bodyBefore === value['actualBodyDelta'] &&
    confidenceAfter - confidenceBefore === value['actualConfidenceDelta'] &&
    coachTrustAfter - coachTrustBefore === value['actualCoachTrustDelta'] &&
    (value['availabilityId'] !== 'injury_availability_out' || value['opportunityCap'] === 0)
  );
}

export function isPendingInjuryChoiceEvidence(
  value: unknown,
): value is PendingInjuryChoiceEvidence {
  return (
    record(value) &&
    exact(value, ['outcomeId', 'choiceIds', 'assessment']) &&
    isInjuryOutcomeId(value['outcomeId']) &&
    Array.isArray(value['choiceIds']) &&
    JSON.stringify(value['choiceIds']) === JSON.stringify(INJURY_CHOICE_IDS) &&
    isWeeklyInjuryAssessmentEvidence(value['assessment'])
  );
}

export function isInjuryCareerState(
  value: unknown,
  currentWeekIndex: number,
  currentRngDrawCount: number,
): value is InjuryCareerState {
  if (
    !record(value) ||
    !exact(value, ['model', 'currentInjury', 'history', 'lastAssessment', 'lastAvailability']) ||
    value['model'] !== 'injury_v1' ||
    (value['currentInjury'] !== null && !isNewInjuryEvidence(value['currentInjury'])) ||
    !Array.isArray(value['history']) ||
    !value['history'].every(isNewInjuryEvidence) ||
    (value['lastAssessment'] !== null &&
      !isWeeklyInjuryAssessmentEvidence(value['lastAssessment'])) ||
    (value['lastAvailability'] !== null && !isInjuryAvailabilityEvidence(value['lastAvailability']))
  ) {
    return false;
  }
  const history = value['history'] as readonly NewInjuryEvidence[];
  const currentInjury = value['currentInjury'] as NewInjuryEvidence | null;
  const weeks = history.map(({ startedWeekIndex }) => startedWeekIndex);
  if (
    weeks.some((week, index) => week > currentWeekIndex || (index > 0 && week <= weeks[index - 1]!))
  ) {
    return false;
  }
  if (
    value['lastAssessment'] !== null &&
    (value['lastAssessment'].weekIndex > currentWeekIndex ||
      value['lastAssessment'].rngDrawCountAfter > currentRngDrawCount)
  ) {
    return false;
  }
  if (
    value['lastAvailability'] !== null &&
    value['lastAvailability'].weekIndex > currentWeekIndex
  ) {
    return false;
  }
  if (currentInjury !== null) {
    const original = history.find(
      ({ outcomeId, startedWeekIndex }) =>
        outcomeId === currentInjury.outcomeId &&
        startedWeekIndex === currentInjury.startedWeekIndex,
    );
    if (original === undefined) return false;
  }
  return true;
}

export function createEmptyInjuryCareerState(): InjuryCareerState {
  return Object.freeze({
    model: 'injury_v1',
    currentInjury: null,
    history: [],
    lastAssessment: null,
    lastAvailability: null,
  });
}
