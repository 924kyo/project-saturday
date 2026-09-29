import type { PlayerAttributeId, ProgramId } from '../player/ids.js';
import type { CareerRun } from '../player/types.js';
import type {
  DepthUpdateEvidenceV3,
  DepthUpdateEvidenceV4,
  SnapProjectionEvidence,
} from '../programs/types.js';
import type { CollectedGameHook } from '../skills/types.js';
import type { RelationshipFootballEffectsV1 } from '../off-field/types.js';
import type { WeeklyActionResultV3, WeeklyActionResultV4 } from '../weekly/types.js';
import type {
  GameCommandFailureReason,
  GameClueId,
  GameCoverageId,
  GameId,
  GameInformationTierId,
  GameLeverageId,
  GamePlayResultId,
  GamePossessionId,
  GameParticipationFeedbackId,
  GameResultId,
  KeySnapDecisionFamilyId,
  KeySnapDecisionId,
  KeySnapId,
  KeySnapPatternId,
  PerformanceGradeBandId,
} from './ids.js';

export interface GameCompletedWeekEvidenceV3 {
  readonly version: 1;
  readonly results: readonly [WeeklyActionResultV3, WeeklyActionResultV3, WeeklyActionResultV3];
  readonly depthUpdate: DepthUpdateEvidenceV3 | null;
}

export interface GameCompletedWeekEvidenceV4 {
  readonly version: 2;
  readonly results: readonly [WeeklyActionResultV4, WeeklyActionResultV4, WeeklyActionResultV4];
  readonly depthUpdate: DepthUpdateEvidenceV4 | null;
}

export type GameCompletedWeekEvidence = GameCompletedWeekEvidenceV3 | GameCompletedWeekEvidenceV4;

export interface WrGameStatLine {
  readonly targets: number;
  readonly receptions: number;
  readonly receivingYards: number;
  readonly receivingTouchdowns: number;
  readonly drops: number;
  readonly turnovers: number;
}

export interface GameScore {
  readonly playerTeam: number;
  readonly opponent: number;
}

export interface CompletedGameSummary {
  readonly gameId: GameId;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly score: GameScore;
  readonly resultId: GameResultId;
  readonly statLine: WrGameStatLine;
  readonly keySnapCount: number;
  readonly performanceGradeScore: number;
  readonly performanceGradeBandId: PerformanceGradeBandId;
  readonly participationFeedbackId: GameParticipationFeedbackId;
  readonly gameRngDrawCountBefore: number;
  readonly gameRngDrawCountAfter: number;
}

export interface GameCareerState {
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly cumulativeStats: WrGameStatLine;
  readonly cumulativeGradeScore: number;
  readonly lastGame: CompletedGameSummary | null;
}

export interface GameMatchupEvidence {
  readonly gameId: GameId;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly playerOffenseRating: number;
  readonly playerDefenseRating: number;
  readonly playerQbRating: number;
  readonly opponentOffenseRating: number;
  readonly opponentDefenseRating: number;
  readonly pregameProjection: SnapProjectionEvidence;
  readonly opportunityBudget: number;
  readonly opportunityGameHooks: readonly AppliedGameHookEvidence[];
  readonly completedWeek: GameCompletedWeekEvidence;
  readonly offFieldContext?: OffFieldGameContextEvidenceV1;
}

export interface OffFieldGameContextEvidenceV1 {
  readonly model: 'off_field_game_context_v1';
  readonly relationshipEffects: RelationshipFootballEffectsV1;
  readonly injuryMaximumOpportunities: number;
  readonly academicRestrictionGamesBefore: number;
  readonly academicRestrictionGamesAfter: number;
  readonly maximumOpportunities: number;
}

export interface ScheduledGameIdentity {
  readonly gameId: GameId;
  readonly isHome: boolean;
}

export interface GamePreviewPhase {
  readonly type: 'GAME_PREVIEW';
  readonly matchup: GameMatchupEvidence;
}

export interface GameClockState {
  readonly period: 1 | 2 | 3 | 4;
  readonly clockSecondsRemaining: number;
}

export interface GameSituation {
  readonly possessionId: GamePossessionId;
  readonly driveIndex: number;
  readonly down: 1 | 2 | 3 | 4;
  readonly distanceYards: number;
  readonly yardLine: number;
}

export interface AppliedGameHookEvidence extends CollectedGameHook {
  readonly appliedValue: number;
}

export interface KeySnapPlayEvidence {
  readonly keySnapId: KeySnapId;
  readonly patternId: KeySnapPatternId;
  readonly familyId: KeySnapDecisionFamilyId;
  readonly decisionId: KeySnapDecisionId;
  readonly decisionFit: number;
  readonly resolution: KeySnapResolutionEvidence;
  readonly resultId: GamePlayResultId;
  readonly targetDelta: 0 | 1;
  readonly receptionDelta: 0 | 1;
  readonly receivingYardsDelta: number;
  readonly receivingTouchdownDelta: 0 | 1;
  readonly dropDelta: 0 | 1;
  readonly turnoverDelta: 0 | 1;
  readonly scoreBefore: GameScore;
  readonly scoreAfter: GameScore;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
  readonly appliedGameHooks: readonly AppliedGameHookEvidence[];
}

export interface KeySnapResolutionEvidence {
  readonly attributeScore: number;
  readonly attributeContributionMilli: number;
  readonly matchupScore: number;
  readonly matchupContributionMilli: number;
  readonly decisionFitScore: number;
  readonly decisionFitContributionMilli: number;
  readonly teamContextScore: number;
  readonly teamContextContributionMilli: number;
  readonly bodyScore: number;
  readonly bodyContributionMilli: number;
  readonly preparationScore: number;
  readonly preparationContributionMilli: number;
  readonly confidenceScore: number;
  readonly confidenceContributionMilli: number;
  readonly weightedScoreMilli: number;
  readonly skillAdjustment: number;
  readonly rngRoll: number;
  readonly finalScore: number;
  readonly targetChancePermille: number;
  readonly catchChancePermille: number;
  readonly dropRiskPermille: number;
  readonly turnoverRiskPermille: number;
  readonly touchdownChancePermille: number;
  readonly receivingYardsBeforeHooks: number;
  readonly receivingYardsAfterHooks: number;
}

export interface ActiveGameState {
  readonly matchup: GameMatchupEvidence;
  readonly clock: GameClockState;
  readonly situation: GameSituation;
  readonly score: GameScore;
  readonly opportunitiesPresented: number;
  readonly statLine: WrGameStatLine;
  readonly keyPlayLog: readonly KeySnapPlayEvidence[];
  readonly gameRngDrawCountBefore: number;
}

export interface PendingKeySnap {
  readonly keySnapId: KeySnapId;
  readonly patternId: KeySnapPatternId;
  readonly familyId: KeySnapDecisionFamilyId;
  readonly decisionIds: readonly [KeySnapDecisionId, KeySnapDecisionId, KeySnapDecisionId];
  readonly coverageId: GameCoverageId;
  readonly leverageId: GameLeverageId;
  readonly matchupRating: number;
  readonly information: KeySnapInformationEvidence;
  readonly informationScore: number;
  readonly informationTierId: GameInformationTierId;
  readonly revealedClueIds: readonly GameClueId[];
  readonly informationGameHooks: readonly AppliedGameHookEvidence[];
  readonly rngDrawCountBefore: number;
}

export interface KeySnapInformationEvidence {
  readonly footballIqScore: number;
  readonly footballIqContributionMilli: number;
  readonly preparationScore: number;
  readonly preparationContributionMilli: number;
  readonly baseScore: number;
  readonly filmStudyApplied: boolean;
  readonly filmStudyBonus: number;
  readonly hookScoreBonus: number;
  readonly relationshipScoreModifier?: number;
  readonly finalScore: number;
}

export interface KeySnapPhase {
  readonly type: 'KEY_SNAP';
  readonly game: ActiveGameState;
  readonly pendingSnap: PendingKeySnap;
}

export interface GameAttributeGrowthEvidence {
  readonly attributeId: PlayerAttributeId;
  readonly awardedXp: number;
  readonly appliedXp: number;
  readonly ratingBefore: number;
  readonly xpBefore: number;
  readonly ratingAfter: number;
  readonly xpAfter: number;
}

export interface PostGameGrowthEvidence {
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
  readonly attributeXp: readonly GameAttributeGrowthEvidence[];
}

export interface PostGamePhase {
  readonly type: 'POST_GAME';
  readonly summary: CompletedGameSummary;
  readonly growth: PostGameGrowthEvidence;
  readonly keyPlayLog: readonly KeySnapPlayEvidence[];
  readonly completedWeek: GameCompletedWeekEvidence;
}

export interface GameOpponentMechanicsProfile {
  readonly programId: ProgramId;
  readonly offenseRating: number;
  readonly defenseRating: number;
  readonly qbRating: number;
}

export interface GameOpportunityBand {
  readonly minimumSnapPermille: number;
  readonly opportunityBudget: number;
}

export interface GameOpportunityBoundsByDepthRank {
  readonly depthRank: number;
  readonly minimumOpportunities: number;
  readonly maximumOpportunities: number;
}

export interface GameTuningDefinition {
  readonly drive: {
    readonly fieldGoalBasePermille: number;
    readonly homeRatingBonus: number;
    readonly maxDriveCount: number;
    readonly maximumSecondsElapsed: number;
    readonly minimumSecondsElapsed: number;
    readonly ratingEdgePermillePerPoint: number;
    readonly touchdownBasePermille: number;
  };
  readonly grade: {
    readonly baseScore: number;
    readonly bands: readonly {
      readonly id: PerformanceGradeBandId;
      readonly minimumScore: number;
    }[];
    readonly dropPenalty: number;
    readonly fitDivisor: number;
    readonly opportunityNormalizationTarget: number;
    readonly receivingYardsDivisor: number;
    readonly receptionValue: number;
    readonly touchdownValue: number;
    readonly turnoverPenalty: number;
  };
  readonly growth: {
    readonly baseAttributeXpPerOpportunity: number;
    readonly baseBodyCost: number;
    readonly confidenceDeltaByBand: Readonly<Record<PerformanceGradeBandId, number>>;
    readonly fitXpDivisor: number;
    readonly trustDeltaByBand: Readonly<Record<PerformanceGradeBandId, number>>;
  };
  readonly information: {
    readonly diagnosticMinimumScore: number;
    readonly filmStudyBonus: number;
    readonly footballIqWeightPermille: number;
    readonly partialMinimumScore: number;
    readonly preparationWeightPermille: number;
  };
  readonly maxKeySnapOpportunities: 12;
  readonly opportunityBands: readonly GameOpportunityBand[];
  readonly opportunityBoundsByDepthRank: readonly GameOpportunityBoundsByDepthRank[];
  readonly periodCount: 4;
  readonly periodLengthSeconds: 900;
  readonly resolution: {
    readonly attributeWeightPermille: number;
    readonly bodyWeightPermille: number;
    readonly confidenceWeightPermille: number;
    readonly decisionFitWeightPermille: number;
    readonly matchupWeightPermille: number;
    readonly preparationWeightPermille: number;
    readonly rollMaximum: number;
    readonly rollMinimum: number;
    readonly teamContextWeightPermille: number;
  };
  readonly zeroOpportunityMaxSnapPermille: number;
}

export interface KeySnapFamilyMechanicsDefinition {
  readonly id: KeySnapDecisionFamilyId;
  readonly attributeWeights: readonly {
    readonly attributeId: PlayerAttributeId;
    readonly weightPermille: number;
  }[];
  readonly decisionIds: readonly [KeySnapDecisionId, KeySnapDecisionId, KeySnapDecisionId];
}

export interface KeySnapPatternMechanicsDefinition {
  readonly id: KeySnapPatternId;
  readonly familyId: KeySnapDecisionFamilyId;
  readonly clueIds: readonly [GameClueId, GameClueId];
  readonly coverageId: GameCoverageId;
  readonly leverageId: GameLeverageId;
  readonly decisionFits: readonly {
    readonly decisionId: KeySnapDecisionId;
    readonly fit: number;
  }[];
  readonly outcome: {
    readonly baseCatchPermille: number;
    readonly baseReceivingYards: number;
    readonly baseTargetPermille: number;
    readonly dropRiskPermille: number;
    readonly touchdownChancePermille: number;
    readonly turnoverRiskPermille: number;
  };
}

export type GameCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: GameCommandFailureReason;
    };

export function createEmptyWrGameStatLine(): WrGameStatLine {
  return Object.freeze({
    targets: 0,
    receptions: 0,
    receivingYards: 0,
    receivingTouchdowns: 0,
    drops: 0,
    turnovers: 0,
  });
}

export function createEmptyGameCareerState(): GameCareerState {
  return Object.freeze({
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    cumulativeStats: createEmptyWrGameStatLine(),
    cumulativeGradeScore: 0,
    lastGame: null,
  });
}
