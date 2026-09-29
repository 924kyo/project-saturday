import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { CareerRun } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import { deriveInjuryRiskSkillEffects, derivePassiveBodyRecovery } from '../skills/effects.js';
import type { SkillMechanicsDefinition } from '../skills/types.js';
import type { WeeklyActionId } from '../weekly/ids.js';
import type { WeekEndPhaseV4 } from '../weekly/types.js';
import { INJURY_CHOICE_IDS, type InjuryChoiceId, type InjuryCommandFailureReason } from './ids.js';
import {
  isInjuryOutcomeMechanicsDefinitionCatalog,
  isInjuryTuningDefinition,
} from './definitions.js';
import {
  sampleInjuryOutcome,
  deriveInjuryChoiceAvailability,
  advanceInjuryDuration,
} from './resolution.js';
import type {
  InjuryAvailabilityEvidence,
  InjuryCommandResult,
  InjuryOutcomeMechanicsDefinition,
  InjuryRiskComponents,
  InjuryTuningDefinition,
  NewInjuryEvidence,
  WeeklyInjuryAssessmentEvidence,
} from './types.js';

function failure(career: CareerRun, reason: InjuryCommandFailureReason): InjuryCommandResult {
  return Object.freeze({ ok: false, career, reason });
}

function success(previous: CareerRun, next: CareerRun): InjuryCommandResult {
  return validateCareerRun(next).ok
    ? deepFreeze({ ok: true, career: next })
    : failure(previous, 'injury.internal_invariant_failure');
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function neutralAvailability(
  career: CareerRun,
  availabilityId: InjuryAvailabilityEvidence['availabilityId'],
  opportunityCap: number,
): InjuryAvailabilityEvidence {
  const { body, confidence, coachTrust } = career.player.state;
  return {
    weekIndex: career.weekIndex,
    availabilityId,
    opportunityCap,
    choiceId: null,
    recoveryCreditWeeks: 0,
    bodyBefore: body,
    requestedBodyDelta: 0,
    actualBodyDelta: 0,
    bodyAfter: body,
    confidenceBefore: confidence,
    requestedConfidenceDelta: 0,
    actualConfidenceDelta: 0,
    confidenceAfter: confidence,
    coachTrustBefore: coachTrust,
    requestedCoachTrustDelta: 0,
    actualCoachTrustDelta: 0,
    coachTrustAfter: coachTrust,
  };
}

export function deriveInjuryRiskComponents(
  career: CareerRun,
  tuning: InjuryTuningDefinition,
  skillDefinitions: readonly SkillMechanicsDefinition[],
): InjuryRiskComponents | null {
  if (career.phase.type !== 'WEEK_END' || career.programContext === null) return null;
  const body = career.player.state.body;
  const durability = career.player.attributes.physical.attribute_durability.rating;
  const workloadSnapPermille = Math.floor(
    (career.programContext.projection.minSnapPermille +
      career.programContext.projection.maxSnapPermille) /
      2,
  );
  const recentTrainingLoad = career.phase.results.reduce(
    (total, result) => total + Math.max(0, -result.baseBodyDelta),
    0,
  );
  const passive = derivePassiveBodyRecovery(
    body,
    0,
    career.player.skillState,
    skillDefinitions,
    career.weekIndex,
  );
  if (!passive.ok) return null;
  const passiveRecoveryDelta = passive.evidence.requestedBodyDelta;
  const injurySkillEffects = deriveInjuryRiskSkillEffects(
    career.player.skillState,
    skillDefinitions,
  );
  if (!injurySkillEffects.ok) return null;
  const bodyRiskPermille = Math.floor(((100 - body) * tuning.bodyDeficitWeightPermille) / 1_000);
  const durabilityRiskPermille = Math.floor(
    ((100 - durability) * tuning.durabilityDeficitWeightPermille) / 1_000,
  );
  const workloadRiskPermille = Math.floor(
    (workloadSnapPermille * tuning.workloadWeightPermille) / 1_000,
  );
  const trainingRiskPermille = Math.floor(
    (recentTrainingLoad * tuning.trainingLoadWeightPermille) / 1_000,
  );
  const passiveRecoveryRiskPermille = Math.max(
    0,
    Math.floor((-passiveRecoveryDelta * tuning.passiveRecoveryRiskWeightPermille) / 1_000),
  );
  const riskBeforeSkillPermille = clamp(
    tuning.baseRiskPermille +
      tuning.positionExposurePermille +
      bodyRiskPermille +
      durabilityRiskPermille +
      workloadRiskPermille +
      trainingRiskPermille +
      passiveRecoveryRiskPermille,
    0,
    tuning.maximumRiskPermille,
  );
  const totalRiskPermille = clamp(
    Math.round((riskBeforeSkillPermille * injurySkillEffects.multiplierPermille) / 1_000),
    0,
    tuning.maximumRiskPermille,
  );
  return {
    baseRiskPermille: tuning.baseRiskPermille,
    body,
    bodyRiskPermille,
    durability,
    durabilityRiskPermille,
    workloadSnapPermille,
    workloadRiskPermille,
    recentTrainingLoad,
    trainingRiskPermille,
    positionExposurePermille: tuning.positionExposurePermille,
    passiveRecoveryDelta,
    passiveRecoveryRiskPermille,
    riskBeforeSkillPermille,
    injuryRiskMultiplierPermille: injurySkillEffects.multiplierPermille,
    injuryRiskAdjustmentPermille: totalRiskPermille - riskBeforeSkillPermille,
    appliedSkillEffects: cloneSerializable([
      ...passive.evidence.appliedSkillEffects,
      ...injurySkillEffects.appliedSkillEffects,
    ]),
    totalRiskPermille,
  };
}

function pendingChoiceCareer(
  career: CareerRun,
  assessment: WeeklyInjuryAssessmentEvidence,
  injury: NewInjuryEvidence,
  history: readonly NewInjuryEvidence[],
  rng: CareerRun['rng'],
): CareerRun {
  if (
    career.phase.type !== 'WEEK_END' ||
    career.weeklyExperienceVersion !== 2 ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE'
  ) {
    return career;
  }
  const seasonCareerState = career.seasonCareerState;
  return {
    ...cloneSerializable(career),
    rng,
    revision: career.revision + 1,
    seasonCareerState: {
      ...cloneSerializable(seasonCareerState),
      injuryState: {
        model: 'injury_v1',
        currentInjury: injury,
        history,
        lastAssessment: assessment,
        lastAvailability: null,
      },
    },
    phase: {
      type: 'INJURY_CHOICE',
      pendingInjury: {
        outcomeId: injury.outcomeId,
        choiceIds: INJURY_CHOICE_IDS,
        assessment,
      },
      completedWeek: cloneSerializable(career.phase) as WeekEndPhaseV4,
    },
  };
}

export function assessWeeklyInjury(
  career: CareerRun,
  definitions: readonly InjuryOutcomeMechanicsDefinition[],
  tuning: InjuryTuningDefinition,
  skillDefinitions: readonly SkillMechanicsDefinition[],
): InjuryCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'injury.invalid_career');
  if (!isInjuryOutcomeMechanicsDefinitionCatalog(definitions)) {
    return failure(career, 'injury.invalid_definitions');
  }
  if (!isInjuryTuningDefinition(tuning)) return failure(career, 'injury.invalid_tuning');
  if (
    career.phase.type !== 'WEEK_END' ||
    career.weeklyExperienceVersion !== 2 ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    career.seasonCareerState.eventState.lastSelection?.weekIndex !== career.weekIndex ||
    career.seasonCareerState.injuryState.lastAssessment?.weekIndex === career.weekIndex
  ) {
    return failure(career, 'injury.invalid_phase');
  }
  if (career.revision === Number.MAX_SAFE_INTEGER) {
    return failure(career, 'injury.revision_exhausted');
  }
  const state = career.seasonCareerState.injuryState;
  if (state.currentInjury !== null) {
    const assessment: WeeklyInjuryAssessmentEvidence = {
      model: 'injury_assessment_v1',
      weekIndex: career.weekIndex,
      outcome: 'ONGOING',
      currentOutcomeId: state.currentInjury.outcomeId,
      rngDrawCountBefore: career.rng.drawCount,
      rngDrawCountAfter: career.rng.drawCount,
    };
    if (state.currentInjury.defaultAvailabilityId === 'injury_availability_limited') {
      return success(
        career,
        pendingChoiceCareer(
          career,
          assessment,
          state.currentInjury,
          state.history,
          cloneSerializable(career.rng),
        ),
      );
    }
    const next: CareerRun = {
      ...cloneSerializable(career),
      revision: career.revision + 1,
      seasonCareerState: {
        ...cloneSerializable(career.seasonCareerState),
        injuryState: {
          ...cloneSerializable(state),
          lastAssessment: assessment,
          lastAvailability: neutralAvailability(career, 'injury_availability_out', 0),
        },
      },
    };
    return success(career, next);
  }

  const components = deriveInjuryRiskComponents(career, tuning, skillDefinitions);
  if (components === null) return failure(career, 'injury.invalid_skill_definitions');
  try {
    const sampled = sampleInjuryOutcome(components.totalRiskPermille, definitions, career.rng);
    if (!sampled.ok)
      return failure(
        career,
        sampled.reason === 'injury.invalid_risk'
          ? 'injury.internal_invariant_failure'
          : sampled.reason,
      );
    const sample = sampled.sample;
    if (sample.selectedOutcome === null) {
      const assessment: WeeklyInjuryAssessmentEvidence = {
        model: 'injury_assessment_v1',
        weekIndex: career.weekIndex,
        outcome: 'NO_INJURY',
        components,
        riskRoll: sample.riskRoll,
        selectedOutcomeId: null,
        outcomeSelectionRoll: null,
        eligibleOutcomeIds: sample.eligibleOutcomeIds,
        totalEligibleWeight: sample.totalEligibleWeight,
        rngDrawCountBefore: career.rng.drawCount,
        rngDrawCountAfter: sample.rng.drawCount,
      };
      const next: CareerRun = {
        ...cloneSerializable(career),
        rng: sample.rng,
        revision: career.revision + 1,
        seasonCareerState: {
          ...cloneSerializable(career.seasonCareerState),
          injuryState: {
            ...cloneSerializable(state),
            lastAssessment: assessment,
            lastAvailability: neutralAvailability(career, 'injury_availability_full', 12),
          },
        },
      };
      return success(career, next);
    }
    const selected = sample.selectedOutcome;
    const injury: NewInjuryEvidence = {
      outcomeId: selected.id,
      severityId: selected.severityId,
      startedWeekIndex: career.weekIndex,
      originalDurationWeeks: selected.durationWeeks,
      remainingWeeks: selected.durationWeeks,
      defaultAvailabilityId: selected.availabilityId,
      opportunityCap: selected.opportunityCap,
    };
    const assessment: WeeklyInjuryAssessmentEvidence = {
      model: 'injury_assessment_v1',
      weekIndex: career.weekIndex,
      outcome: 'INJURY',
      components,
      riskRoll: sample.riskRoll,
      selectedOutcomeId: selected.id,
      outcomeSelectionRoll: sample.outcomeSelectionRoll,
      eligibleOutcomeIds: sample.eligibleOutcomeIds,
      totalEligibleWeight: sample.totalEligibleWeight,
      rngDrawCountBefore: career.rng.drawCount,
      rngDrawCountAfter: sample.rng.drawCount,
    };
    const history = [...state.history.map((entry) => cloneSerializable(entry)), injury];
    if (selected.availabilityId === 'injury_availability_limited') {
      return success(career, pendingChoiceCareer(career, assessment, injury, history, sample.rng));
    }
    const next: CareerRun = {
      ...cloneSerializable(career),
      rng: sample.rng,
      revision: career.revision + 1,
      seasonCareerState: {
        ...cloneSerializable(career.seasonCareerState),
        injuryState: {
          model: 'injury_v1',
          currentInjury: injury,
          history,
          lastAssessment: assessment,
          lastAvailability: neutralAvailability(career, 'injury_availability_out', 0),
        },
      },
    };
    return success(career, next);
  } catch {
    return failure(career, 'injury.rng_exhausted');
  }
}

export function resolveInjuryChoice(
  career: CareerRun,
  choiceId: InjuryChoiceId,
  definitions: readonly InjuryOutcomeMechanicsDefinition[],
  tuning: InjuryTuningDefinition,
): InjuryCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'injury.invalid_career');
  if (!isInjuryOutcomeMechanicsDefinitionCatalog(definitions)) {
    return failure(career, 'injury.invalid_definitions');
  }
  if (!isInjuryTuningDefinition(tuning)) return failure(career, 'injury.invalid_tuning');
  if (
    career.phase.type !== 'INJURY_CHOICE' ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    !career.phase.pendingInjury.choiceIds.includes(choiceId) ||
    career.seasonCareerState.injuryState.currentInjury?.outcomeId !==
      career.phase.pendingInjury.outcomeId
  ) {
    return failure(career, 'injury.invalid_choice');
  }
  if (career.revision === Number.MAX_SAFE_INTEGER) {
    return failure(career, 'injury.revision_exhausted');
  }
  const pendingInjury = career.phase.pendingInjury;
  const definition = definitions.find(({ id }) => id === pendingInjury.outcomeId);
  if (definition === undefined || definition.availabilityId !== 'injury_availability_limited') {
    return failure(career, 'injury.invalid_definitions');
  }
  const state = career.player.state;
  const availability = deriveInjuryChoiceAvailability(
    state,
    career.weekIndex,
    definition,
    choiceId,
    tuning,
  );
  if (availability === null) return failure(career, 'injury.internal_invariant_failure');
  const { bodyAfter, confidenceAfter, coachTrustAfter } = availability;
  const next: CareerRun = {
    ...cloneSerializable(career),
    revision: career.revision + 1,
    player: {
      ...cloneSerializable(career.player),
      state: {
        ...cloneSerializable(state),
        body: bodyAfter,
        confidence: confidenceAfter,
        coachTrust: coachTrustAfter,
      },
    },
    seasonCareerState: {
      ...cloneSerializable(career.seasonCareerState),
      injuryState: {
        ...cloneSerializable(career.seasonCareerState.injuryState),
        lastAvailability: availability,
      },
    },
    phase: cloneSerializable(career.phase.completedWeek),
  };
  return success(career, next);
}

export function advanceInjuryRecovery(career: CareerRun): CareerRun {
  if (career.seasonCareerState.bootstrapStatus !== 'ACTIVE') return career;
  const state = career.seasonCareerState.injuryState;
  const injury = state.currentInjury;
  const completedWeekIndex = career.weekIndex - 1;
  if (injury === null || state.lastAssessment?.weekIndex !== completedWeekIndex) return career;
  const recoveryCreditWeeks =
    state.lastAvailability?.weekIndex === completedWeekIndex
      ? state.lastAvailability.recoveryCreditWeeks
      : 0;
  return {
    ...cloneSerializable(career),
    seasonCareerState: {
      ...cloneSerializable(career.seasonCareerState),
      injuryState: {
        ...cloneSerializable(state),
        currentInjury: advanceInjuryDuration(injury, recoveryCreditWeeks),
      },
    },
  };
}

export function currentInjuryOpportunityCap(career: CareerRun): number | null {
  if (career.seasonCareerState.bootstrapStatus !== 'ACTIVE') return null;
  const availability = career.seasonCareerState.injuryState.lastAvailability;
  return availability?.weekIndex === career.weekIndex ? availability.opportunityCap : null;
}

const OUT_ALLOWED_ACTION_IDS = new Set<WeeklyActionId>([
  'action_recovery',
  'action_film_study',
  'action_study_hall',
]);
const LIMITED_BLOCKED_ACTION_IDS = new Set<WeeklyActionId>([
  'action_weight_room',
  'action_speed_work',
  'action_extra_practice',
]);

export function isWeeklyActionAvailableForCurrentInjury(
  career: CareerRun,
  actionId: WeeklyActionId,
): boolean {
  if (career.seasonCareerState.bootstrapStatus !== 'ACTIVE') return true;
  const injury = career.seasonCareerState.injuryState.currentInjury;
  if (injury === null) return true;
  return injury.defaultAvailabilityId === 'injury_availability_out'
    ? OUT_ALLOWED_ACTION_IDS.has(actionId)
    : !LIMITED_BLOCKED_ACTION_IDS.has(actionId);
}
