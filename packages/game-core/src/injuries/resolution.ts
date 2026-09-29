import { BODY_BOUNDS, COACH_TRUST_BOUNDS, CONFIDENCE_BOUNDS } from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { PlayerState } from '../player/types.js';
import { isRngState, nextInt, restoreRngState, type RngState } from '../random/rng.js';
import {
  canonicalizeInjuryOutcomeDefinitions,
  isInjuryOutcomeMechanicsDefinition,
  isInjuryOutcomeMechanicsDefinitionCatalog,
  isInjuryTuningDefinition,
} from './definitions.js';
import { INJURY_CHOICE_IDS, type InjuryChoiceId } from './ids.js';
import { isNewInjuryEvidence } from './validation.js';
import type {
  InjuryAvailabilityEvidence,
  InjuryOutcomeMechanicsDefinition,
  InjuryTuningDefinition,
  NewInjuryEvidence,
} from './types.js';

export interface InjuryOutcomeSample {
  readonly selectedOutcome: InjuryOutcomeMechanicsDefinition | null;
  readonly riskRoll: number;
  readonly outcomeSelectionRoll: number | null;
  readonly eligibleOutcomeIds: readonly InjuryOutcomeMechanicsDefinition['id'][];
  readonly totalEligibleWeight: number;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
  readonly rng: RngState;
}

export type SampleInjuryOutcomeResult =
  | { readonly ok: true; readonly sample: InjuryOutcomeSample }
  | {
      readonly ok: false;
      readonly reason:
        'injury.invalid_definitions' | 'injury.invalid_risk' | 'injury.rng_exhausted';
    };

/** Shared catalog sampler. Orchestration owns ongoing injuries and once-per-week publication. */
export function sampleInjuryOutcome(
  totalRiskPermille: number,
  definitions: readonly InjuryOutcomeMechanicsDefinition[],
  rng: RngState,
): SampleInjuryOutcomeResult {
  if (!isInjuryOutcomeMechanicsDefinitionCatalog(definitions))
    return deepFreeze({ ok: false as const, reason: 'injury.invalid_definitions' as const });
  if (
    !Number.isSafeInteger(totalRiskPermille) ||
    totalRiskPermille < 0 ||
    totalRiskPermille > 1_000 ||
    !isRngState(rng)
  ) {
    return deepFreeze({ ok: false as const, reason: 'injury.invalid_risk' as const });
  }
  const eligible = canonicalizeInjuryOutcomeDefinitions(definitions).filter(
    ({ minimumRiskPermille }) => minimumRiskPermille <= totalRiskPermille,
  );
  if (eligible.length === 0)
    return deepFreeze({ ok: false as const, reason: 'injury.invalid_definitions' as const });
  try {
    const risk = nextInt(restoreRngState(rng), 0, 1_000);
    const totalEligibleWeight = eligible.reduce((total, { weight }) => total + weight, 0);
    let nextRng = risk.nextRng;
    let outcomeSelectionRoll: number | null = null;
    let selectedOutcome: InjuryOutcomeMechanicsDefinition | null = null;
    if (risk.value < totalRiskPermille) {
      const selection = nextInt(nextRng, 0, totalEligibleWeight);
      nextRng = selection.nextRng;
      outcomeSelectionRoll = selection.value;
      let cursor = selection.value;
      for (const definition of eligible) {
        if (cursor < definition.weight) {
          selectedOutcome = definition;
          break;
        }
        cursor -= definition.weight;
      }
      selectedOutcome ??= eligible.at(-1)!;
    }
    return deepFreeze({
      ok: true as const,
      sample: cloneSerializable({
        selectedOutcome,
        riskRoll: risk.value,
        outcomeSelectionRoll,
        eligibleOutcomeIds: eligible.map(({ id }) => id),
        totalEligibleWeight,
        rngDrawCountBefore: rng.drawCount,
        rngDrawCountAfter: nextRng.drawCount,
        rng: nextRng,
      }),
    });
  } catch {
    return deepFreeze({ ok: false as const, reason: 'injury.rng_exhausted' as const });
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** The same rest/limited tradeoff for any position; no career adapter or RNG needed. */
export function deriveInjuryChoiceAvailability(
  state: Pick<PlayerState, 'body' | 'confidence' | 'coachTrust'>,
  weekIndex: number,
  definition: InjuryOutcomeMechanicsDefinition,
  choiceId: InjuryChoiceId,
  tuning: InjuryTuningDefinition,
): InjuryAvailabilityEvidence | null {
  if (
    !Number.isSafeInteger(weekIndex) ||
    weekIndex < 0 ||
    !isInjuryOutcomeMechanicsDefinition(definition) ||
    definition.availabilityId !== 'injury_availability_limited' ||
    !isInjuryTuningDefinition(tuning) ||
    !INJURY_CHOICE_IDS.includes(choiceId) ||
    ![state?.body, state?.confidence, state?.coachTrust].every(
      (value) => Number.isSafeInteger(value) && value >= 0 && value <= 100,
    )
  )
    return null;
  const requestedBodyDelta =
    choiceId === 'injury_choice_rest_rehab' ? tuning.restBodyDelta : tuning.playLimitedBodyDelta;
  const requestedConfidenceDelta =
    choiceId === 'injury_choice_rest_rehab' ? tuning.restConfidenceDelta : 0;
  const requestedCoachTrustDelta =
    choiceId === 'injury_choice_play_limited' ? tuning.playLimitedCoachTrustDelta : 0;
  const bodyAfter = clamp(state.body + requestedBodyDelta, BODY_BOUNDS.min, BODY_BOUNDS.max);
  const confidenceAfter = clamp(
    state.confidence + requestedConfidenceDelta,
    CONFIDENCE_BOUNDS.min,
    CONFIDENCE_BOUNDS.max,
  );
  const coachTrustAfter = clamp(
    state.coachTrust + requestedCoachTrustDelta,
    COACH_TRUST_BOUNDS.min,
    COACH_TRUST_BOUNDS.max,
  );
  return deepFreeze({
    weekIndex,
    availabilityId:
      choiceId === 'injury_choice_rest_rehab'
        ? 'injury_availability_out'
        : 'injury_availability_limited',
    opportunityCap: choiceId === 'injury_choice_rest_rehab' ? 0 : definition.opportunityCap,
    choiceId,
    recoveryCreditWeeks:
      choiceId === 'injury_choice_rest_rehab' ? tuning.restRecoveryCreditWeeks : 0,
    bodyBefore: state.body,
    requestedBodyDelta,
    actualBodyDelta: bodyAfter - state.body,
    bodyAfter,
    confidenceBefore: state.confidence,
    requestedConfidenceDelta,
    actualConfidenceDelta: confidenceAfter - state.confidence,
    confidenceAfter,
    coachTrustBefore: state.coachTrust,
    requestedCoachTrustDelta,
    actualCoachTrustDelta: coachTrustAfter - state.coachTrust,
    coachTrustAfter,
  });
}

/** Called once by a verified rollover; a recovered injury disappears, its onset history does not. */
export function advanceInjuryDuration(
  injury: NewInjuryEvidence,
  recoveryCreditWeeks: number,
): NewInjuryEvidence | null {
  if (
    !isNewInjuryEvidence(injury) ||
    !Number.isSafeInteger(recoveryCreditWeeks) ||
    recoveryCreditWeeks < 0 ||
    recoveryCreditWeeks > 3
  ) {
    throw new RangeError('Invalid injury recovery input.');
  }
  const remainingWeeks = injury.remainingWeeks - 1 - recoveryCreditWeeks;
  return remainingWeeks <= 0 ? null : deepFreeze({ ...cloneSerializable(injury), remainingWeeks });
}
