import type { CareerRun } from '../player/types.js';
import type { AppliedInjuryRiskSkillEffect } from '../skills/types.js';
import type { WeekEndPhaseV4 } from '../weekly/types.js';
import type {
  InjuryAvailabilityId,
  InjuryChoiceId,
  InjuryCommandFailureReason,
  InjuryOutcomeId,
  InjurySeverityId,
} from './ids.js';

export interface InjuryOutcomeMechanicsDefinition {
  readonly id: InjuryOutcomeId;
  readonly severityId: InjurySeverityId;
  readonly availabilityId: Exclude<InjuryAvailabilityId, 'injury_availability_full'>;
  readonly durationWeeks: number;
  readonly opportunityCap: number;
  readonly minimumRiskPermille: number;
  readonly weight: number;
}

export interface InjuryTuningDefinition {
  readonly model: 'injury_v1';
  readonly baseRiskPermille: number;
  readonly positionExposurePermille: number;
  readonly bodyDeficitWeightPermille: number;
  readonly durabilityDeficitWeightPermille: number;
  readonly workloadWeightPermille: number;
  readonly trainingLoadWeightPermille: number;
  readonly passiveRecoveryRiskWeightPermille: number;
  readonly maximumRiskPermille: number;
  readonly restBodyDelta: number;
  readonly restConfidenceDelta: number;
  readonly restRecoveryCreditWeeks: number;
  readonly playLimitedBodyDelta: number;
  readonly playLimitedCoachTrustDelta: number;
}

export interface InjuryRiskComponents {
  readonly baseRiskPermille: number;
  readonly body: number;
  readonly bodyRiskPermille: number;
  readonly durability: number;
  readonly durabilityRiskPermille: number;
  readonly workloadSnapPermille: number;
  readonly workloadRiskPermille: number;
  readonly recentTrainingLoad: number;
  readonly trainingRiskPermille: number;
  readonly positionExposurePermille: number;
  readonly passiveRecoveryDelta: number;
  readonly passiveRecoveryRiskPermille: number;
  readonly riskBeforeSkillPermille: number;
  readonly injuryRiskMultiplierPermille: number;
  readonly injuryRiskAdjustmentPermille: number;
  readonly appliedSkillEffects: readonly AppliedInjuryRiskSkillEffect[];
  readonly totalRiskPermille: number;
}

export interface NewInjuryEvidence {
  readonly outcomeId: InjuryOutcomeId;
  readonly severityId: InjurySeverityId;
  readonly startedWeekIndex: number;
  readonly originalDurationWeeks: number;
  readonly remainingWeeks: number;
  readonly defaultAvailabilityId: Exclude<InjuryAvailabilityId, 'injury_availability_full'>;
  readonly opportunityCap: number;
}

export interface InjuryRiskAssessmentEvidence {
  readonly model: 'injury_assessment_v1';
  readonly weekIndex: number;
  readonly outcome: 'NO_INJURY' | 'INJURY';
  readonly components: InjuryRiskComponents;
  readonly riskRoll: number;
  readonly selectedOutcomeId: InjuryOutcomeId | null;
  readonly outcomeSelectionRoll: number | null;
  readonly eligibleOutcomeIds: readonly InjuryOutcomeId[];
  readonly totalEligibleWeight: number;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface InjuryContinuationEvidence {
  readonly model: 'injury_assessment_v1';
  readonly weekIndex: number;
  readonly outcome: 'ONGOING';
  readonly currentOutcomeId: InjuryOutcomeId;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export type WeeklyInjuryAssessmentEvidence =
  InjuryRiskAssessmentEvidence | InjuryContinuationEvidence;

export interface InjuryAvailabilityEvidence {
  readonly weekIndex: number;
  readonly availabilityId: InjuryAvailabilityId;
  readonly opportunityCap: number;
  readonly choiceId: InjuryChoiceId | null;
  readonly recoveryCreditWeeks: number;
  readonly bodyBefore: number;
  readonly requestedBodyDelta: number;
  readonly actualBodyDelta: number;
  readonly bodyAfter: number;
  readonly confidenceBefore: number;
  readonly requestedConfidenceDelta: number;
  readonly actualConfidenceDelta: number;
  readonly confidenceAfter: number;
  readonly coachTrustBefore: number;
  readonly requestedCoachTrustDelta: number;
  readonly actualCoachTrustDelta: number;
  readonly coachTrustAfter: number;
}

export interface InjuryCareerState {
  readonly model: 'injury_v1';
  readonly currentInjury: NewInjuryEvidence | null;
  readonly history: readonly NewInjuryEvidence[];
  readonly lastAssessment: WeeklyInjuryAssessmentEvidence | null;
  readonly lastAvailability: InjuryAvailabilityEvidence | null;
}

export interface PendingInjuryChoiceEvidence {
  readonly outcomeId: InjuryOutcomeId;
  readonly choiceIds: readonly [InjuryChoiceId, InjuryChoiceId];
  readonly assessment: WeeklyInjuryAssessmentEvidence;
}

export interface InjuryChoicePhase {
  readonly type: 'INJURY_CHOICE';
  readonly pendingInjury: PendingInjuryChoiceEvidence;
  readonly completedWeek: WeekEndPhaseV4;
}

export type InjuryCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: InjuryCommandFailureReason;
    };
