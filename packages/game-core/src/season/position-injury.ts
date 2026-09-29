import {
  isInjuryOutcomeMechanicsDefinitionCatalog,
  isInjuryTuningDefinition,
} from '../injuries/definitions.js';
import type { InjuryChoiceId, InjuryOutcomeId } from '../injuries/ids.js';
import { deriveInjuryChoiceAvailability, sampleInjuryOutcome } from '../injuries/resolution.js';
import type {
  InjuryAvailabilityEvidence,
  InjuryOutcomeMechanicsDefinition,
  InjuryTuningDefinition,
  NewInjuryEvidence,
} from '../injuries/types.js';
import { isNewInjuryEvidence } from '../injuries/validation.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { isRngState, type RngState } from '../random/rng.js';
import {
  derivePositionInjuryExposure,
  type PositionInjuryExposureInput,
  type PositionInjuryExposureProjectionV1,
  type PositionLifecycleMechanicsV1,
} from './position-lifecycle.js';

export interface PositionInjuryMechanics {
  readonly lifecycle: PositionLifecycleMechanicsV1;
  readonly outcomes: readonly InjuryOutcomeMechanicsDefinition[];
  readonly tuning: InjuryTuningDefinition;
}

/** A bounded pregame source, never a copy of the career or its history. */
export interface PositionInjuryWeekInput extends PositionInjuryExposureInput {
  readonly weekIndex: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly rng: RngState;
}

export interface PositionInjuryWeekV1 {
  readonly model: 'position_injury_week_v1';
  readonly source: PositionInjuryWeekInput;
  readonly exposure: PositionInjuryExposureProjectionV1;
  readonly outcome: 'NO_INJURY' | 'INJURY' | 'ONGOING';
  readonly riskRoll: number | null;
  readonly outcomeSelectionRoll: number | null;
  readonly eligibleOutcomeIds: readonly InjuryOutcomeId[];
  readonly totalEligibleWeight: number;
  readonly currentInjury: NewInjuryEvidence | null;
  /** Null means a required rest/limited choice remains unresolved. */
  readonly availability: InjuryAvailabilityEvidence | null;
  readonly rng: RngState;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function sameEvidence(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => sameEvidence(entry, right[index]))
    );
  }
  if (!record(left) || !record(right)) return false;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && sameEvidence(left[key], right[key]))
  );
}

function neutralAvailability(
  source: PositionInjuryWeekInput,
  out: boolean,
): InjuryAvailabilityEvidence {
  return {
    weekIndex: source.weekIndex,
    availabilityId: out ? 'injury_availability_out' : 'injury_availability_full',
    opportunityCap: out ? 0 : 12,
    choiceId: null,
    recoveryCreditWeeks: 0,
    bodyBefore: source.body,
    requestedBodyDelta: 0,
    actualBodyDelta: 0,
    bodyAfter: source.body,
    confidenceBefore: source.confidence,
    requestedConfidenceDelta: 0,
    actualConfidenceDelta: 0,
    confidenceAfter: source.confidence,
    coachTrustBefore: source.coachTrust,
    requestedCoachTrustDelta: 0,
    actualCoachTrustDelta: 0,
    coachTrustAfter: source.coachTrust,
  };
}

/** The position projection owns risk; the established shared catalog owns sampling. */
export function assessPositionInjuryWeek(
  source: PositionInjuryWeekInput,
  mechanics: PositionInjuryMechanics,
): PositionInjuryWeekV1 | null {
  if (
    !record(source) ||
    Object.keys(source).sort().join('|') !==
      'body|coachTrust|confidence|currentInjury|durability|positionId|recentTrainingLoad|rng|weekIndex|workloadSnapPermille' ||
    !integer(source.weekIndex, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(source.confidence, 0, 100) ||
    !integer(source.coachTrust, 0, 100) ||
    !isRngState(source.rng) ||
    !isInjuryOutcomeMechanicsDefinitionCatalog(mechanics.outcomes) ||
    !isInjuryTuningDefinition(mechanics.tuning)
  )
    return null;
  if (source.currentInjury !== null) {
    const injury = source.currentInjury;
    if (!isNewInjuryEvidence(injury) || injury.startedWeekIndex > source.weekIndex) return null;
    const definition = mechanics.outcomes.find(({ id }) => id === injury.outcomeId);
    if (
      definition === undefined ||
      definition.severityId !== injury.severityId ||
      definition.durationWeeks !== injury.originalDurationWeeks ||
      definition.availabilityId !== injury.defaultAvailabilityId ||
      definition.opportunityCap !== injury.opportunityCap
    )
      return null;
  }
  const exposure = derivePositionInjuryExposure(source, mechanics.lifecycle);
  if (exposure === null) return null;
  let currentInjury = source.currentInjury;
  let outcome: PositionInjuryWeekV1['outcome'] = 'ONGOING';
  let rng = source.rng;
  let riskRoll: number | null = null;
  let outcomeSelectionRoll: number | null = null;
  let eligibleOutcomeIds: readonly InjuryOutcomeId[] = [];
  let totalEligibleWeight = 0;
  if (currentInjury === null) {
    const sampled = sampleInjuryOutcome(exposure.totalRiskPermille, mechanics.outcomes, rng);
    if (!sampled.ok) return null;
    const sample = sampled.sample;
    rng = sample.rng;
    riskRoll = sample.riskRoll;
    outcomeSelectionRoll = sample.outcomeSelectionRoll;
    eligibleOutcomeIds = sample.eligibleOutcomeIds;
    totalEligibleWeight = sample.totalEligibleWeight;
    const selected = sample.selectedOutcome;
    outcome = selected === null ? 'NO_INJURY' : 'INJURY';
    if (selected !== null) {
      currentInjury = {
        outcomeId: selected.id,
        severityId: selected.severityId,
        startedWeekIndex: source.weekIndex,
        originalDurationWeeks: selected.durationWeeks,
        remainingWeeks: selected.durationWeeks,
        defaultAvailabilityId: selected.availabilityId,
        opportunityCap: selected.opportunityCap,
      };
    }
  }
  return deepFreeze(
    cloneSerializable({
      model: 'position_injury_week_v1' as const,
      source,
      exposure,
      outcome,
      riskRoll,
      outcomeSelectionRoll,
      eligibleOutcomeIds,
      totalEligibleWeight,
      currentInjury,
      availability:
        currentInjury?.defaultAvailabilityId === 'injury_availability_limited'
          ? null
          : neutralAvailability(source, currentInjury !== null),
      rng,
    }),
  );
}

function withChoice(
  week: PositionInjuryWeekV1,
  choiceId: InjuryChoiceId,
  mechanics: PositionInjuryMechanics,
): PositionInjuryWeekV1 | null {
  if (week.availability !== null || week.currentInjury === null) return null;
  const definition = mechanics.outcomes.find(({ id }) => id === week.currentInjury?.outcomeId);
  if (definition === undefined) return null;
  const availability = deriveInjuryChoiceAvailability(
    week.source,
    week.source.weekIndex,
    definition,
    choiceId,
    mechanics.tuning,
  );
  return availability === null ? null : deepFreeze({ ...cloneSerializable(week), availability });
}

/** Replays only the bounded assessment/choice against copied RNG, never authoritative state. */
export function validatePositionInjuryWeek(
  value: unknown,
  mechanics: PositionInjuryMechanics,
): value is PositionInjuryWeekV1 {
  if (!record(value) || !record(value['source'])) return false;
  try {
    let expected = assessPositionInjuryWeek(
      value['source'] as unknown as PositionInjuryWeekInput,
      mechanics,
    );
    if (expected === null) return false;
    const availability = value['availability'];
    if (expected.availability === null && record(availability)) {
      expected = withChoice(expected, availability['choiceId'] as InjuryChoiceId, mechanics);
    }
    return expected !== null && sameEvidence(expected, value);
  } catch {
    return false;
  }
}

export function resolvePositionInjuryWeekChoice(
  week: PositionInjuryWeekV1,
  choiceId: InjuryChoiceId,
  mechanics: PositionInjuryMechanics,
): PositionInjuryWeekV1 | null {
  return validatePositionInjuryWeek(week, mechanics) ? withChoice(week, choiceId, mechanics) : null;
}
