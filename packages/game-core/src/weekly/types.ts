import type { PlayerAttributeId } from '../player/ids.js';
import type {
  AppliedWeeklySkillEffect,
  SkillBreakthroughOffer,
  WeeklySkillEffectAggregates,
} from '../skills/types.js';
import type {
  TrainingProficiencyId,
  WeeklyActionEffectId,
  WeeklyActionId,
  WeeklyActionTagId,
} from './ids.js';
import type { TrainingProficiencyLevel } from './tuning.js';

export type TrainingProficiencyUses = Readonly<Record<TrainingProficiencyId, number>>;

export interface WeeklyActionAttributeXpDefinition {
  readonly attributeId: PlayerAttributeId;
  readonly baseXp: number;
}

export interface WeeklyActionDefinition {
  readonly id: WeeklyActionId;
  readonly tagIds: readonly WeeklyActionTagId[];
  readonly attributeXp: readonly WeeklyActionAttributeXpDefinition[];
  readonly bodyDelta: number;
  readonly gpaDelta: number;
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
  readonly skillEffectAggregates: WeeklySkillEffectAggregates;
  readonly appliedSkillEffects: readonly AppliedWeeklySkillEffect[];
}
export type WeeklyActionResult = WeeklyActionResultV2;

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

export type ResolveActionsPhase = ResolveActionsPhaseV2;
export type WeekEndPhase = WeekEndPhaseV2;

export interface SkillBreakthroughPhase {
  readonly type: 'SKILL_BREAKTHROUGH';
  readonly offer: SkillBreakthroughOffer;
}

export type CareerPhaseV1 = PlanActionsPhase | ResolveActionsPhaseV1 | WeekEndPhaseV1;
export type CareerPhaseV2 =
  PlanActionsPhase | ResolveActionsPhaseV2 | WeekEndPhaseV2 | SkillBreakthroughPhase;
export type CareerPhase = CareerPhaseV2;
