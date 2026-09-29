import type { PlayerTagId, ProgramId } from '../player/ids.js';
import type {
  DepthRoleId,
  ProgramOffenseStyleId,
  ProgramStrengthBandId,
  RotationPolicyId,
} from '../programs/ids.js';
import type { GameId } from '../games/ids.js';
import type { CollectedLifeHook } from '../skills/types.js';
import type { WeeklyActionId } from '../weekly/ids.js';
import type {
  AcademicCheckpointId,
  AcademicStatusId,
  NilCategoryId,
  NilObligationId,
  NilObligationTypeId,
  NilEffectSourceId,
  NilOfferDecisionId,
  NilOfferId,
  NilObligationResolutionId,
  OffFieldBenefitId,
  OffseasonCoachChangeId,
  RelationshipActorId,
  RelationshipContextTagId,
  TransferConfidenceTierId,
  TransferProjectionFactorId,
} from './ids.js';

export type AcademicEligibilityStatus = 'PENDING' | 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE';

export interface PendingAcademicCareerStateV1 {
  readonly model: 'academic_v1';
  readonly bootstrapStatus: 'PENDING';
  readonly termIndex: 0;
  readonly eligibilityStatus: 'PENDING';
  readonly lastCheckpoint: null;
  readonly checkpointHistory: readonly [];
}

export interface PendingRelationshipCareerStateV1 {
  readonly model: 'relationships_v1';
  readonly bootstrapStatus: 'PENDING';
  readonly tracks: readonly [];
  readonly history: readonly [];
}

export interface AcademicCheckpointEvidenceV1 {
  readonly model: 'academic_checkpoint_v1';
  readonly checkpointId: AcademicCheckpointId;
  readonly termIndex: number;
  readonly weekIndex: number;
  readonly gpaMilli: number;
  readonly obligationGpaDeltaMilli: number;
  readonly eligibleGpaMilli: number;
  readonly warningGpaMilli: number;
  readonly statusBefore: Exclude<AcademicEligibilityStatus, 'PENDING'>;
  readonly statusAfter: Exclude<AcademicEligibilityStatus, 'PENDING'>;
  readonly restrictionGamesBefore: number;
  readonly requestedRestrictionGames: number;
  readonly actualRestrictionGames: number;
  readonly restrictionGamesAfter: number;
}

export interface AcademicGameRestrictionEvidenceV1 {
  readonly model: 'academic_game_restriction_v1';
  readonly gameId: GameId;
  readonly weekIndex: number;
  readonly restrictionGamesBefore: number;
  readonly restrictionGamesAfter: number;
}

export interface ActiveAcademicCareerStateV1 {
  readonly model: 'academic_v1';
  readonly bootstrapStatus: 'ACTIVE';
  readonly termIndex: number;
  readonly eligibilityStatus: Exclude<AcademicEligibilityStatus, 'PENDING'>;
  readonly nextCheckpointIndex: number;
  readonly restrictionGamesRemaining: number;
  readonly lastCheckpoint: AcademicCheckpointEvidenceV1 | null;
  readonly checkpointHistory: readonly AcademicCheckpointEvidenceV1[];
  readonly lastGameRestriction: AcademicGameRestrictionEvidenceV1 | null;
  readonly gameRestrictionHistory: readonly AcademicGameRestrictionEvidenceV1[];
}

export interface RelationshipTrackV1 {
  readonly actorId: RelationshipActorId;
  readonly value: number;
}

export interface RelationshipTrackChangeEvidenceV1 {
  readonly actorId: RelationshipActorId;
  readonly valueBefore: number;
  readonly baseDelta: number;
  readonly gainMultiplierPermille: number;
  readonly requestedDelta: number;
  readonly actualDelta: number;
  readonly valueAfter: number;
}

export interface RelationshipFootballEffectsV1 {
  readonly coachTrustModifier: number;
  readonly informationScoreModifier: number;
  readonly opportunitySnapBonusPermille: number;
}

export interface WeeklyRelationshipResolutionEvidenceV1 {
  readonly model: 'relationship_week_v1';
  readonly sourceId: 'relationship_source_weekly_action';
  readonly weekIndex: number;
  readonly actionIds: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly changes: readonly RelationshipTrackChangeEvidenceV1[];
  readonly appliedSkillEffects: readonly CollectedLifeHook[];
  readonly footballEffectsBefore: RelationshipFootballEffectsV1;
  readonly footballEffectsAfter: RelationshipFootballEffectsV1;
  readonly coachTrustBefore: number;
  readonly requestedCoachTrustDelta: number;
  readonly actualCoachTrustDelta: number;
  readonly coachTrustAfter: number;
}

export interface ActiveRelationshipCareerStateV1 {
  readonly model: 'relationships_v1';
  readonly bootstrapStatus: 'ACTIVE';
  readonly tracks: readonly RelationshipTrackV1[];
  readonly lastProcessedWeekIndex: number | null;
  readonly history: readonly WeeklyRelationshipResolutionEvidenceV1[];
}

export interface PendingNilCareerStateV1 {
  readonly model: 'nil_v1';
  readonly fictionalFundsUsd: 0;
  readonly pendingOffers: readonly [];
  readonly activeObligation: null;
  readonly history: readonly [];
}

export interface NilBenefitStackV1 {
  readonly benefitId: OffFieldBenefitId;
  readonly quantity: number;
}

export interface NilOfferEligibilityContextV1 {
  readonly brand: number;
  readonly depthRank: number;
  readonly gpaMilli: number;
  readonly programStrengthBandId: ProgramStrengthBandId;
  readonly tagIds: readonly PlayerTagId[];
}

export interface NilOfferSelectionEvidenceV1 {
  readonly model: 'nil_offer_selection_v1';
  readonly weekIndex: number;
  readonly context: NilOfferEligibilityContextV1;
  readonly eligibleOfferIds: readonly NilOfferId[];
  readonly totalWeight: number;
  readonly roll: number | null;
  readonly selectedOfferId: NilOfferId | null;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface PendingNilOfferV1 {
  readonly offerId: NilOfferId;
  readonly offeredWeekIndex: number;
  readonly expiresAfterWeekIndex: number;
  readonly selection: NilOfferSelectionEvidenceV1;
}

export interface ActiveNilObligationV1 {
  readonly offerId: NilOfferId;
  readonly obligationId: NilObligationId;
  readonly acceptedWeekIndex: number;
  readonly remainingWeeks: number;
  readonly lastResolvedWeekIndex: number | null;
}

export interface NilEffectApplicationEvidenceV1 {
  readonly model: 'nil_effect_application_v1';
  readonly sourceId: NilEffectSourceId;
  readonly effectIndex: number;
  readonly effect: NilEffect;
  readonly rewardMultiplierPermille: number;
  readonly valueBefore: number;
  readonly baseDelta: number;
  readonly requestedDelta: number;
  readonly actualDelta: number;
  readonly valueAfter: number;
}

export interface NilOfferDecisionEvidenceV1 {
  readonly model: 'nil_offer_decision_v1';
  readonly weekIndex: number;
  readonly decisionId: NilOfferDecisionId;
  readonly offer: PendingNilOfferV1;
  readonly appliedSkillEffects: readonly CollectedLifeHook[];
  readonly rewardMultiplierPermille: number;
  readonly appliedEffects: readonly NilEffectApplicationEvidenceV1[];
}

export interface NilOfferExpirationEvidenceV1 {
  readonly model: 'nil_offer_expiration_v1';
  readonly weekIndex: number;
  readonly offer: PendingNilOfferV1;
}

export interface NilObligationResolutionEvidenceV1 {
  readonly model: 'nil_obligation_resolution_v1';
  readonly weekIndex: number;
  readonly resolutionId: NilObligationResolutionId;
  readonly offerId: NilOfferId;
  readonly obligationId: NilObligationId;
  readonly focusCost: number;
  readonly remainingWeeksBefore: number;
  readonly remainingWeeksAfter: number;
  readonly appliedEffects: readonly NilEffectApplicationEvidenceV1[];
}

export type NilHistoryEvidenceV1 =
  NilOfferDecisionEvidenceV1 | NilOfferExpirationEvidenceV1 | NilObligationResolutionEvidenceV1;

export interface ActiveNilCareerStateV1 {
  readonly model: 'nil_v1';
  readonly bootstrapStatus: 'ACTIVE';
  readonly fictionalFundsUsd: number;
  readonly benefitStacks: readonly NilBenefitStackV1[];
  readonly pendingOffers: readonly PendingNilOfferV1[];
  readonly activeObligation: ActiveNilObligationV1 | null;
  readonly lastOfferAttempt: NilOfferSelectionEvidenceV1 | null;
  readonly history: readonly NilHistoryEvidenceV1[];
}

export interface PendingOffseasonCareerStateV1 {
  readonly model: 'offseason_v1';
  readonly status: 'NOT_STARTED';
  readonly completedDecisionCount: 0;
  readonly lastDecision: null;
}

export interface OffseasonProgramProjectionV1 {
  readonly programId: ProgramId;
  readonly coachChangeId: OffseasonCoachChangeId;
  readonly offenseStyleIdBefore: ProgramOffenseStyleId;
  readonly offenseStyleIdAfter: ProgramOffenseStyleId;
  readonly roomTalentBefore: number;
  readonly departureRelief: number;
  readonly incomingPressure: number;
  readonly roomTalentAfter: number;
  readonly coachChangeTotalWeight: number;
  readonly coachChangeRoll: number;
  readonly pressureMaximumInclusive: number;
  readonly departureRoll: number;
  readonly incomingRoll: number;
  readonly worldRngDrawCountBefore: number;
  readonly worldRngDrawCountAfter: number;
}

export interface OffseasonWorldProjectionV1 {
  readonly model: 'offseason_world_projection_v1';
  readonly programs: readonly OffseasonProgramProjectionV1[];
  readonly worldRngDrawCountBefore: number;
  readonly worldRngDrawCountAfter: number;
}

export interface TransferShortlistCandidateWeightV1 {
  readonly programId: ProgramId;
  readonly weight: number;
}

export interface TransferShortlistSelectionEvidenceV1 {
  readonly selectionIndex: number;
  readonly candidateWeights: readonly TransferShortlistCandidateWeightV1[];
  readonly totalWeight: number;
  readonly roll: number;
  readonly selectedProgramId: ProgramId;
  readonly careerRngDrawCountBefore: number;
  readonly careerRngDrawCountAfter: number;
}

export interface TransferProjectionFactorEvidenceV1 {
  readonly factorId: TransferProjectionFactorId;
  readonly score: number;
  readonly weightPermille: number;
  readonly contributionMilli: number;
}

export interface TransferOptionProjectionV1 {
  readonly kind: 'STAY' | 'TRANSFER';
  readonly programId: ProgramId;
  readonly projectedDepthRank: number;
  readonly projectedRoleId: DepthRoleId;
  readonly projectedSnapMinPermille: number;
  readonly projectedSnapMaxPermille: number;
  readonly informationScore: number;
  readonly confidenceTierId: TransferConfidenceTierId;
  readonly uncertaintyPoints: number;
  readonly factors: readonly TransferProjectionFactorEvidenceV1[];
  readonly projectedScore: number;
  readonly projectedScoreMinimum: number;
  readonly projectedScoreMaximum: number;
}

export interface OffseasonTransferProjectionV1 {
  readonly model: 'offseason_transfer_projection_v1';
  readonly stayOption: TransferOptionProjectionV1;
  readonly transferOptions: readonly [
    TransferOptionProjectionV1,
    TransferOptionProjectionV1,
    TransferOptionProjectionV1,
  ];
  readonly shortlistSelections: readonly [
    TransferShortlistSelectionEvidenceV1,
    TransferShortlistSelectionEvidenceV1,
    TransferShortlistSelectionEvidenceV1,
  ];
  readonly careerRngDrawCountBefore: number;
  readonly careerRngDrawCountAfter: number;
}

export interface ProjectedOffseasonCareerStateV1 {
  readonly model: 'offseason_v1';
  readonly status: 'PROJECTED';
  readonly completedDecisionCount: 0;
  readonly lastDecision: null;
  readonly completedSeasonId: `season_${string}`;
  readonly completedSeasonIndex: number;
  readonly nextSeasonIndex: number;
  readonly academicTermIndexBefore: number;
  readonly academicTermIndexAfter: number;
  readonly worldProjection: OffseasonWorldProjectionV1;
  readonly transferProjection: OffseasonTransferProjectionV1;
}

export interface OffseasonRelationshipTransitionEvidenceV1 {
  readonly actorId: RelationshipActorId;
  readonly valueBefore: number;
  readonly resetToNeutral: boolean;
  readonly resetValue: number | null;
  readonly valueAfter: number;
}

export interface OffseasonDecisionEvidenceV1 {
  readonly model: 'offseason_decision_v1';
  readonly kind: 'STAY' | 'TRANSFER';
  readonly previousProgramId: ProgramId;
  readonly selectedProgramId: ProgramId;
  readonly selectedOption: TransferOptionProjectionV1;
  readonly coachChangeId: OffseasonCoachChangeId;
  readonly offenseStyleIdBefore: ProgramOffenseStyleId;
  readonly offenseStyleIdAfter: ProgramOffenseStyleId;
  readonly rotationPolicyIdAfter: RotationPolicyId;
  readonly roomTalentMeanAfter: number;
  readonly coachTrustBefore: number;
  readonly coachTrustRetentionPermille: number;
  readonly coachTrustBaseline: number;
  readonly coachTrustRequestedAfter: number;
  readonly coachTrustAfter: number;
  readonly playerPracticeFormBefore: number;
  readonly playerPracticeFormAfter: number;
  readonly playerExperienceReadiness: number;
  readonly relationshipTransitions: readonly OffseasonRelationshipTransitionEvidenceV1[];
  readonly rosterRngDrawCountBefore: number;
  readonly rosterRngDrawCountAfter: number;
  readonly actualDepthRank: number;
  readonly actualRoleId: DepthRoleId;
  readonly actualSnapMinPermille: number;
  readonly actualSnapMaxPermille: number;
}

export interface DecidedOffseasonCareerStateV1 extends Omit<
  ProjectedOffseasonCareerStateV1,
  'status' | 'completedDecisionCount' | 'lastDecision'
> {
  readonly status: 'DECIDED';
  readonly completedDecisionCount: 1;
  readonly lastDecision: OffseasonDecisionEvidenceV1;
}

export interface ProgramHistoryEntryV1 {
  readonly programId: ProgramId;
  readonly startSeasonIndex: number;
  readonly endSeasonIndex: number | null;
}

/**
 * M6's additive persistence boundary. Live variants are introduced by explicit
 * commands after the neutral state has been migrated and validated.
 */
export interface OffFieldCareerStateV1 {
  readonly model: 'off_field_v1';
  readonly academics: PendingAcademicCareerStateV1 | ActiveAcademicCareerStateV1;
  readonly relationships: PendingRelationshipCareerStateV1 | ActiveRelationshipCareerStateV1;
  readonly nil: PendingNilCareerStateV1 | ActiveNilCareerStateV1;
  readonly offseason:
    PendingOffseasonCareerStateV1 | ProjectedOffseasonCareerStateV1 | DecidedOffseasonCareerStateV1;
  readonly programHistory: readonly ProgramHistoryEntryV1[];
}

export interface RelationshipActorMechanicsDefinition {
  readonly id: RelationshipActorId;
  readonly initialValue: number;
  readonly lowThreshold: number;
  readonly highThreshold: number;
  readonly coachTrustWeightPermille: number;
  readonly informationWeightPermille: number;
  readonly opportunityWeightPermille: number;
}

export interface RelationshipWeeklyRuleEffectDefinition {
  readonly actorId: RelationshipActorId;
  readonly delta: number;
}

export interface RelationshipWeeklyRuleDefinition {
  readonly actionId: WeeklyActionId;
  readonly effects: readonly RelationshipWeeklyRuleEffectDefinition[];
}

export interface AcademicCheckpointMechanicsDefinition {
  readonly id: AcademicCheckpointId;
  readonly weekIndex: number;
}

export interface AcademicTuningDefinition {
  readonly model: 'academic_v1';
  readonly eligibleGpaMilli: number;
  readonly warningGpaMilli: number;
  readonly restrictionGames: number;
  readonly checkpoints: readonly AcademicCheckpointMechanicsDefinition[];
}

export interface OffFieldBenefitMechanicsDefinition {
  readonly id: OffFieldBenefitId;
  readonly maximumStack: number;
}

export interface NilOfferRequirements {
  readonly minimumBrand: number;
  readonly maximumDepthRank: number;
  readonly minimumGpaMilli: number;
  readonly programStrengthBandIds: readonly ProgramStrengthBandId[];
  readonly requiredTagIds: readonly `tag_${string}`[];
}

export type NilEffect =
  | Readonly<{
      type: 'nil_integer_state_delta';
      stateId:
        | 'nil_state_body'
        | 'nil_state_preparation'
        | 'nil_state_confidence'
        | 'nil_state_coach_trust'
        | 'nil_state_brand';
      delta: number;
    }>
  | Readonly<{ type: 'nil_gpa_delta_milli'; deltaMilli: number }>
  | Readonly<{ type: 'nil_funds_delta_usd'; deltaUsd: number }>
  | Readonly<{
      type: 'nil_relationship_delta';
      actorId: RelationshipActorId;
      delta: number;
    }>
  | Readonly<{
      type: 'nil_benefit_grant';
      benefitId: OffFieldBenefitId;
      quantity: number;
    }>;

export interface NilObligationMechanicsDefinition {
  readonly id: NilObligationId;
  readonly typeId: NilObligationTypeId;
  readonly durationWeeks: number;
  readonly focusCost: number;
  readonly weeklyEffects: readonly NilEffect[];
  readonly defaultEffects: readonly NilEffect[];
}

export interface NilOfferMechanicsDefinition {
  readonly id: NilOfferId;
  readonly categoryId: NilCategoryId;
  readonly weight: number;
  readonly expirationWeeks: number;
  readonly requirements: NilOfferRequirements;
  readonly rewardEffects: readonly NilEffect[];
  readonly obligation: NilObligationMechanicsDefinition;
}

export interface OffseasonCoachChangeMechanicsDefinition {
  readonly id: OffseasonCoachChangeId;
  readonly weight: number;
  readonly coachTrustRetentionPermille: number;
  readonly resetRelationshipActorIds: readonly RelationshipActorId[];
  readonly changesScheme: boolean;
}

export interface TransferProjectionFactorMechanicsDefinition {
  readonly id: TransferProjectionFactorId;
  readonly weightPermille: number;
}

export interface TransferConfidenceTierMechanicsDefinition {
  readonly id: TransferConfidenceTierId;
  readonly minimumInformationScore: number;
  readonly uncertaintyPoints: number;
}

export interface OffseasonTuningDefinition {
  readonly model: 'offseason_v1';
  readonly transferShortlistSize: 3;
  readonly stayFamiliarityBonus: number;
  readonly transferCoachTrustRetentionPermille: number;
  readonly relationshipResetValue: number;
  readonly pressureMaximumInclusive: number;
  readonly pressurePointsPerDepthRank: number;
  readonly neutralTransferDepthRank: number;
  readonly transferFamiliarityScore: number;
  readonly transferInformationBaseScore: number;
  readonly brandInformationDivisor: number;
  readonly advisorInsightInformationBonus: number;
  readonly projectionFactors: readonly TransferProjectionFactorMechanicsDefinition[];
  readonly confidenceTiers: readonly TransferConfidenceTierMechanicsDefinition[];
  readonly coachChanges: readonly OffseasonCoachChangeMechanicsDefinition[];
}

export interface OffseasonProgramMechanicsProfile {
  readonly programId: ProgramId;
  readonly offenseStyleId: ProgramOffenseStyleId;
  readonly schemeShiftOffenseStyleId: ProgramOffenseStyleId;
  readonly rotationPolicyId: RotationPolicyId;
  readonly roomTalentMean: number;
  readonly programOutlook: number;
  readonly playerDevelopment: number;
  readonly nilPower: number;
  readonly academics: number;
}

export interface OffFieldMechanicsCatalog {
  readonly model: 'off_field_v1';
  readonly relationshipActors: readonly RelationshipActorMechanicsDefinition[];
  readonly relationshipWeeklyRules: readonly RelationshipWeeklyRuleDefinition[];
  readonly academics: AcademicTuningDefinition;
  readonly benefits: readonly OffFieldBenefitMechanicsDefinition[];
  readonly nilOffers: readonly NilOfferMechanicsDefinition[];
  readonly offseason: OffseasonTuningDefinition;
}

export interface AcademicStatusPresentationContract {
  readonly id: AcademicStatusId;
}

export interface RelationshipContextProjectionV1 {
  readonly tagIds: readonly RelationshipContextTagId[];
  readonly footballEffects: RelationshipFootballEffectsV1;
}
