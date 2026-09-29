import type { ProgramId, PlayerId, RecruitingBackgroundId, WrArchetypeId } from '../player/ids.js';
import type {
  DepthRoleId,
  ProgramOffenseStyleId,
  ProgramCommitCommandFailureReason,
  ProjectedDepthBandId,
  ProgramStrengthBandId,
  RecruitingCommandFailureReason,
  RecruitTierId,
  RosterFamilyNameId,
  RosterGivenNameId,
  RosterPlayerId,
  RotationPolicyId,
} from './ids.js';
import type { CareerRun } from '../player/types.js';

export const RECRUIT_ABILITY_ATTRIBUTE_IDS = Object.freeze([
  'attribute_speed',
  'attribute_burst',
  'attribute_agility',
  'attribute_strength',
  'attribute_wr_release',
  'attribute_wr_route_running',
  'attribute_wr_hands',
  'attribute_wr_catch_in_traffic',
] as const);

export type RecruitAbilityAttributeId = (typeof RECRUIT_ABILITY_ATTRIBUTE_IDS)[number];

export interface RecruitingMechanicsConfig {
  readonly abilityWeightsPermille: Readonly<Record<RecruitAbilityAttributeId, number>>;
  readonly backgroundModifiers: Readonly<Record<RecruitingBackgroundId, number>>;
  readonly offerCount: 5;
  readonly projectedDepthGapThresholds: {
    readonly starterCompetitionMin: number;
    readonly rotationPathMin: number;
    readonly reservePathMin: number;
  };
  readonly tierThresholds: {
    readonly nationalMinScore: number;
    readonly priorityMinScore: number;
  };
}

export interface RecruitingProgramRoomProfile {
  readonly talentMean: number;
  readonly talentSpread: number;
  readonly trustBase: number;
  readonly practiceFormBase: number;
  readonly experienceReadinessBase: number;
}

export interface RecruitingProgramDefinition {
  readonly id: ProgramId;
  readonly strengthBandId: ProgramStrengthBandId;
  readonly offenseStyleId: ProgramOffenseStyleId;
  readonly rotationPolicyId: RotationPolicyId;
  readonly recruitingInterestByTier: Readonly<Record<RecruitTierId, number>>;
  readonly initialCoachTrustBonus: number;
  readonly roomProfile: RecruitingProgramRoomProfile;
}

export interface RecruitingOffenseStyleDefinition {
  readonly id: ProgramOffenseStyleId;
  readonly attributeWeightsPermille: Readonly<Record<RecruitAbilityAttributeId, number>>;
  readonly schemeFitByArchetype: Readonly<Record<WrArchetypeId, number>>;
}

export interface RosterNameMechanicsPool {
  readonly givenNameIds: readonly RosterGivenNameId[];
  readonly familyNameIds: readonly RosterFamilyNameId[];
}

export type RecruitingCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: RecruitingCommandFailureReason;
    };

export type ProgramCommitCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: ProgramCommitCommandFailureReason;
    };

export interface RotationRankSnapRange {
  readonly rank: number;
  readonly minSnapPermille: number;
  readonly maxSnapPermille: number;
}

export type RotationRankSnapRangeTuple = readonly [
  RotationRankSnapRange,
  RotationRankSnapRange,
  RotationRankSnapRange,
  RotationRankSnapRange,
  RotationRankSnapRange,
  RotationRankSnapRange,
  RotationRankSnapRange,
  RotationRankSnapRange,
];

export interface RotationPolicyMechanicsDefinition {
  readonly id: RotationPolicyId;
  readonly rankSnapRanges: RotationRankSnapRangeTuple;
}

export interface RecruitingOfferEvidence {
  readonly programId: ProgramId;
  readonly interest: number;
  readonly schemeFit: number;
  readonly priority: number;
  readonly projectedDepthBandId: ProjectedDepthBandId;
}

export type RecruitingOfferTuple = readonly [
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
];

export interface RecruitingNotStartedState {
  readonly type: 'NOT_STARTED';
}

export interface RecruitingProfileEvidence {
  readonly recruitAbilityScore: number;
  readonly backgroundModifier: number;
  readonly recruitScore: number;
  readonly recruitTierId: RecruitTierId;
  readonly offers: RecruitingOfferTuple;
}

export interface RecruitingChoosingState extends RecruitingProfileEvidence {
  readonly type: 'CHOOSING';
}

export interface RecruitingCommittedState extends RecruitingProfileEvidence {
  readonly type: 'COMMITTED';
  readonly selectedProgramId: ProgramId;
  readonly selectedAtWeekIndex: number;
  readonly rosterRngDrawCountBefore: number;
  readonly rosterRngDrawCountAfter: number;
}

export type RecruitingState =
  RecruitingNotStartedState | RecruitingChoosingState | RecruitingCommittedState;

export interface WrRoomCompetitor {
  readonly id: RosterPlayerId;
  readonly givenNameId: RosterGivenNameId;
  readonly familyNameId: RosterFamilyNameId;
  readonly archetypeId: WrArchetypeId;
  readonly classYear: 1 | 2 | 3 | 4;
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
}

export type WrRoomCompetitorTuple = readonly [
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
];

export type DepthParticipantId = PlayerId | RosterPlayerId;

export interface DepthEvaluationComponents {
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
}

export interface DepthEvaluationContributions {
  readonly talentFitMilli: number;
  readonly coachTrustMilli: number;
  readonly practiceFormMilli: number;
  readonly schemeFitMilli: number;
  readonly experienceReadinessMilli: number;
}

export interface DepthEvaluationEvidence {
  readonly participantId: DepthParticipantId;
  readonly rank: number;
  readonly roleId: DepthRoleId;
  readonly components: DepthEvaluationComponents;
  readonly contributions: DepthEvaluationContributions;
  readonly totalScoreMilli: number;
}

export type DepthEvaluationTuple = readonly [
  DepthEvaluationEvidence,
  DepthEvaluationEvidence,
  DepthEvaluationEvidence,
  DepthEvaluationEvidence,
  DepthEvaluationEvidence,
  DepthEvaluationEvidence,
  DepthEvaluationEvidence,
  DepthEvaluationEvidence,
];

export type DepthOrderTuple = readonly [
  DepthParticipantId,
  DepthParticipantId,
  DepthParticipantId,
  DepthParticipantId,
  DepthParticipantId,
  DepthParticipantId,
  DepthParticipantId,
  DepthParticipantId,
];

export interface SnapProjectionEvidence {
  readonly rank: number;
  readonly roleId: DepthRoleId;
  readonly minSnapPermille: number;
  readonly maxSnapPermille: number;
}

export type DepthMovement = 'PROMOTED' | 'DEMOTED' | 'HELD';

export interface DepthUpdateEvidenceV3 {
  readonly weekIndex: number;
  readonly practiceFormBefore: number;
  readonly weeklyPracticeScore: number;
  readonly practiceFormAfter: number;
  readonly coachTrustBefore: number;
  readonly requestedCoachTrustDelta: number;
  readonly actualCoachTrustDelta: number;
  readonly coachTrustAfter: number;
  readonly rankBefore: number;
  readonly rankAfter: number;
  readonly roleBefore: DepthRoleId;
  readonly roleAfter: DepthRoleId;
  readonly snapProjectionBefore: SnapProjectionEvidence;
  readonly snapProjectionAfter: SnapProjectionEvidence;
  readonly hysteresisThresholdMilli: number;
  readonly movement: DepthMovement;
  readonly neighborParticipantId: DepthParticipantId | null;
}

export interface PracticeGradeEvidence {
  readonly model: 'experience_v1';
  readonly baseScore: number;
  readonly focusImpact: number;
  readonly bodyAfterFocus: number;
  readonly bodyContribution: number;
  readonly preparationAfterFocus: number;
  readonly preparationTarget: number;
  readonly preparationContribution: number;
  readonly confidenceAfterFocus: number;
  readonly confidenceContribution: number;
}

export interface DepthUpdateEvidenceV4 extends DepthUpdateEvidenceV3 {
  readonly practiceGrade: PracticeGradeEvidence;
}

export type DepthUpdateEvidence = DepthUpdateEvidenceV3 | DepthUpdateEvidenceV4;

export interface ProgramCareerState {
  readonly programId: ProgramId;
  readonly offenseStyleId: ProgramOffenseStyleId;
  readonly rotationPolicyId: RotationPolicyId;
  readonly playerPracticeForm: number;
  readonly competitors: WrRoomCompetitorTuple;
  readonly depthOrderIds: DepthOrderTuple;
  readonly evaluations: DepthEvaluationTuple;
  readonly projection: SnapProjectionEvidence;
  readonly latestDepthUpdate: DepthUpdateEvidence | null;
}
