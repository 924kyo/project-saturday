import type { PlayerAttributeId } from '../player/ids.js';
import type { DepthUpdateEvidenceV3, DepthUpdateEvidenceV4 } from '../programs/types.js';
import type {
  AppliedWeeklySkillEffect,
  AppliedWeeklySkillEffectV2,
  SkillBreakthroughOffer,
  WeeklySkillEffectAggregates,
  WeeklySkillEffectAggregatesV2,
} from '../skills/types.js';
import type {
  TrainingProficiencyId,
  WeeklyActionEffectId,
  WeeklyActionId,
  WeeklyActionTagId,
} from './ids.js';
import type { TrainingProficiencyLevel } from './tuning.js';
import type { GamePreviewPhase, KeySnapPhase, PostGamePhase } from '../games/types.js';
import type { PendingEventEvidence } from '../events/types.js';
import type { AlumniId, SeasonOutcomeId } from '../season/types.js';
import type { InjuryChoicePhase } from '../injuries/types.js';

export type TrainingProficiencyUses = Readonly<Record<TrainingProficiencyId, number>>;

export const WEEKLY_EXPERIENCE_VERSION_LEGACY = 1 as const;
export const WEEKLY_EXPERIENCE_VERSION_CURRENT = 2 as const;
export type WeeklyExperienceVersion =
  typeof WEEKLY_EXPERIENCE_VERSION_LEGACY | typeof WEEKLY_EXPERIENCE_VERSION_CURRENT;

export interface WeeklyActionAttributeXpDefinition {
  readonly attributeId: PlayerAttributeId;
  readonly baseXp: number;
}

export interface WeeklyActionDefinition {
  readonly id: WeeklyActionId;
  readonly tagIds: readonly WeeklyActionTagId[];
  readonly attributeXp: readonly WeeklyActionAttributeXpDefinition[];
  readonly bodyDelta: number;
  readonly preparationDelta: number;
  readonly confidenceDelta: number;
  readonly gpaDelta: number;
  readonly practiceImpact: number;
  readonly proficiencyId: TrainingProficiencyId | null;
}

export interface WeeklyAttributeXpResult {
  readonly attributeId: PlayerAttributeId;
  readonly baseXp: number;
  readonly awardedXp: number;
  readonly appliedXp: number;
  readonly ratingBefore: number;
  readonly xpBefore: number;
  readonly ratingAfter: number;
  readonly xpAfter: number;
}

export interface WeeklyProficiencyResult {
  readonly proficiencyId: TrainingProficiencyId;
  readonly usesBefore: number;
  readonly usesAfter: number;
  readonly levelBefore: TrainingProficiencyLevel;
  readonly levelAfter: TrainingProficiencyLevel;
  readonly xpMultiplierPermille: number;
}

export interface WeeklyActionResultV1 {
  readonly actionId: WeeklyActionId;
  readonly actionIndex: number;
  readonly weekIndex: number;
  readonly effectIds: readonly WeeklyActionEffectId[];
  readonly bodyBefore: number;
  readonly requestedBodyDelta: number;
  readonly actualBodyDelta: number;
  readonly bodyAfter: number;
  readonly bodyXpEfficiencyPermille: number;
  readonly gpaBefore: number;
  readonly requestedGpaDelta: number;
  readonly actualGpaDelta: number;
  readonly gpaAfter: number;
  readonly attributeXp: readonly WeeklyAttributeXpResult[];
  readonly proficiency: WeeklyProficiencyResult | null;
}

export interface WeeklyActionResultV2 {
  readonly actionId: WeeklyActionId;
  readonly actionIndex: number;
  readonly weekIndex: number;
  readonly effectIds: readonly WeeklyActionEffectId[];
  readonly bodyBefore: number;
  readonly baseBodyDelta: number;
  readonly requestedBodyDelta: number;
  readonly actualBodyDelta: number;
  readonly bodyAfter: number;
  readonly bodyXpEfficiencyPermille: number;
  readonly gpaBefore: number;
  readonly baseGpaDelta: number;
  readonly requestedGpaDelta: number;
  readonly actualGpaDelta: number;
  readonly gpaAfter: number;
  readonly attributeXp: readonly WeeklyAttributeXpResult[];
  readonly proficiency: WeeklyProficiencyResult | null;
  readonly skillEffectAggregates: WeeklySkillEffectAggregatesV2;
  readonly appliedSkillEffects: readonly AppliedWeeklySkillEffectV2[];
}

export interface WeeklyActionResultV3 extends WeeklyActionResultV2 {
  readonly practiceImpact: number;
}

export interface WeeklyActionResultV4 extends Omit<
  WeeklyActionResultV3,
  'skillEffectAggregates' | 'appliedSkillEffects'
> {
  readonly skillEffectAggregates: WeeklySkillEffectAggregates;
  readonly appliedSkillEffects: readonly AppliedWeeklySkillEffect[];
  readonly preparationBefore: number;
  readonly basePreparationDelta: number;
  readonly requestedPreparationDelta: number;
  readonly actualPreparationDelta: number;
  readonly preparationAfter: number;
  readonly confidenceBefore: number;
  readonly baseConfidenceDelta: number;
  readonly requestedConfidenceDelta: number;
  readonly actualConfidenceDelta: number;
  readonly confidenceAfter: number;
}

export type WeeklyActionResult = WeeklyActionResultV3 | WeeklyActionResultV4;

export interface PlanActionsPhase {
  readonly type: 'PLAN_ACTIONS';
}

export interface ResolveActionsPhaseV1 {
  readonly type: 'RESOLVE_ACTIONS';
  readonly actionIds: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly nextActionIndex: 0 | 1 | 2;
  readonly results: readonly WeeklyActionResultV1[];
}

export interface WeekEndPhaseV1 {
  readonly type: 'WEEK_END';
  readonly results: readonly [WeeklyActionResultV1, WeeklyActionResultV1, WeeklyActionResultV1];
}

export interface ResolveActionsPhaseV2 {
  readonly type: 'RESOLVE_ACTIONS';
  readonly actionIds: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly nextActionIndex: 0 | 1 | 2;
  readonly results: readonly WeeklyActionResultV2[];
}

export interface WeekEndPhaseV2 {
  readonly type: 'WEEK_END';
  readonly results: readonly [WeeklyActionResultV2, WeeklyActionResultV2, WeeklyActionResultV2];
}

export interface ResolveActionsPhaseV3 {
  readonly type: 'RESOLVE_ACTIONS';
  readonly actionIds: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly nextActionIndex: 0 | 1 | 2;
  readonly results: readonly WeeklyActionResultV3[];
}

export interface WeekEndPhaseV3 {
  readonly type: 'WEEK_END';
  readonly results: readonly [WeeklyActionResultV3, WeeklyActionResultV3, WeeklyActionResultV3];
  readonly depthUpdate: DepthUpdateEvidenceV3 | null;
}

export interface ResolveActionsPhaseV4 {
  readonly type: 'RESOLVE_ACTIONS';
  readonly actionIds: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly nextActionIndex: 0 | 1 | 2;
  readonly results: readonly WeeklyActionResultV4[];
}

export interface WeekEndPhaseV4 {
  readonly type: 'WEEK_END';
  readonly results: readonly [WeeklyActionResultV4, WeeklyActionResultV4, WeeklyActionResultV4];
  readonly depthUpdate: DepthUpdateEvidenceV4 | null;
}

export type ResolveActionsPhase = ResolveActionsPhaseV4;
export type WeekEndPhase = WeekEndPhaseV4;

export interface SkillBreakthroughPhase {
  readonly type: 'SKILL_BREAKTHROUGH';
  readonly offer: SkillBreakthroughOffer;
}

export interface EventChoicePhase {
  readonly type: 'EVENT_CHOICE';
  readonly pendingEvent: PendingEventEvidence;
  readonly completedWeek: WeekEndPhaseV4;
}

export interface SeasonReviewPhase {
  readonly type: 'SEASON_REVIEW';
  readonly seasonId: `season_${string}`;
  readonly outcomeId: SeasonOutcomeId;
}

export interface CareerCompletePhase {
  readonly type: 'CAREER_COMPLETE';
  readonly seasonId: `season_${string}`;
  readonly outcomeId: SeasonOutcomeId;
  readonly alumniId: AlumniId;
}

export type CareerPhaseV1 = PlanActionsPhase | ResolveActionsPhaseV1 | WeekEndPhaseV1;
export type CareerPhaseV2 =
  PlanActionsPhase | ResolveActionsPhaseV2 | WeekEndPhaseV2 | SkillBreakthroughPhase;
export type CareerPhaseV3 =
  PlanActionsPhase | ResolveActionsPhaseV3 | WeekEndPhaseV3 | SkillBreakthroughPhase;
export type CareerPhaseV4 =
  | CareerPhaseV3
  | ResolveActionsPhaseV4
  | WeekEndPhaseV4
  | GamePreviewPhase
  | KeySnapPhase
  | PostGamePhase;
export type CareerPhaseV5 =
  CareerPhaseV4 | EventChoicePhase | InjuryChoicePhase | SeasonReviewPhase | CareerCompletePhase;
export type CareerPhase = CareerPhaseV5;
