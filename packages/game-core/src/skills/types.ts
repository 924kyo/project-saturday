import type { PlayerTagId, PositionId, WrArchetypeId } from '../player/ids.js';
import type { WeeklyActionId, WeeklyActionTagId } from '../weekly/ids.js';
import type {
  SkillBehaviorTagId,
  SkillFamilyId,
  SkillGameHookId,
  SkillGradeId,
  SkillId,
  SkillBreakthroughSourceId,
  SkillLifeHookId,
} from './ids.js';

export const EQUIPPED_SKILL_SLOT_COUNT = 4 as const;
export const SKILL_BREAKTHROUGH_OFFER_SIZE = 3 as const;

export type EquippedSkillSlotIndex = 0 | 1 | 2 | 3;

export type EquippedSkillIds = readonly [
  SkillId | null,
  SkillId | null,
  SkillId | null,
  SkillId | null,
];

export type OfferedSkillIds = readonly [SkillId, SkillId, SkillId];

export interface SkillBreakthroughOfferV2 {
  readonly offerIndex: number;
  readonly weekIndex: number;
  readonly offeredSkillIds: OfferedSkillIds;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface SkillBreakthroughProgressSource {
  readonly sourceId: SkillBreakthroughSourceId;
  readonly points: number;
}

export interface SkillBreakthroughProgressEvidence {
  readonly model: 'gauge_v1';
  readonly weekIndex: number;
  readonly progressBefore: number;
  readonly pointsEarned: number;
  readonly progressAfter: number;
  readonly threshold: number;
  readonly triggeredOffer: boolean;
  readonly sources: readonly SkillBreakthroughProgressSource[];
}

export interface SkillBreakthroughGaugeState {
  readonly model: 'gauge_v1';
  readonly progress: number;
  readonly threshold: number;
  readonly lastProgress: SkillBreakthroughProgressEvidence | null;
}

export interface SkillBreakthroughOfferV4 extends SkillBreakthroughOfferV2 {
  readonly trigger: SkillBreakthroughProgressEvidence;
}

export type SkillBreakthroughOffer = SkillBreakthroughOfferV2 | SkillBreakthroughOfferV4;

export interface SkillAcquisitionRecordV2 extends SkillBreakthroughOfferV2 {
  readonly selectedSkillId: SkillId;
}

export interface SkillAcquisitionRecordV4 extends SkillBreakthroughOfferV4 {
  readonly selectedSkillId: SkillId;
}

export type SkillAcquisitionRecord = SkillAcquisitionRecordV2 | SkillAcquisitionRecordV4;

export interface PlayerSkillStateV2 {
  readonly acquisitions: readonly SkillAcquisitionRecordV2[];
  readonly equippedSkillIds: EquippedSkillIds;
}

export interface PlayerSkillState extends Omit<PlayerSkillStateV2, 'acquisitions'> {
  readonly acquisitions: readonly SkillAcquisitionRecord[];
  readonly breakthroughGauge: SkillBreakthroughGaugeState;
}

export type SkillActionScope =
  | {
      readonly type: 'action_ids';
      readonly actionIds: readonly WeeklyActionId[];
    }
  | {
      readonly type: 'action_tags';
      readonly actionTagIds: readonly WeeklyActionTagId[];
    };

export type SkillEffectCondition =
  | { readonly type: 'always' }
  | { readonly type: 'body_at_least'; readonly body: number }
  | { readonly type: 'body_at_most'; readonly body: number }
  | {
      readonly type: 'action_occurrence_at_least';
      readonly minimumCount: number;
    }
  | {
      readonly type: 'plan_distinct_action_count_at_least';
      readonly minimumCount: number;
    }
  | { readonly type: 'previous_action_id'; readonly actionId: WeeklyActionId };

interface ScopedConditionalSkillEffect {
  readonly scope: SkillActionScope;
  readonly condition: SkillEffectCondition;
}

export interface ActionXpMultiplierSkillEffect extends ScopedConditionalSkillEffect {
  readonly type: 'action_xp_multiplier';
  readonly multiplierPermille: number;
}

export interface ActionBodyCostMultiplierSkillEffect extends ScopedConditionalSkillEffect {
  readonly type: 'action_body_cost_multiplier';
  readonly multiplierPermille: number;
}

export interface ActionBodyDeltaFlatSkillEffect extends ScopedConditionalSkillEffect {
  readonly type: 'action_body_delta_flat';
  readonly delta: number;
}

export interface ActionGpaDeltaMilliSkillEffect extends ScopedConditionalSkillEffect {
  readonly type: 'action_gpa_delta_milli';
  readonly deltaMilli: number;
}

export interface ActionPreparationDeltaFlatSkillEffect extends ScopedConditionalSkillEffect {
  readonly type: 'action_preparation_delta_flat';
  readonly delta: number;
}

export interface ActionConfidenceDeltaFlatSkillEffect extends ScopedConditionalSkillEffect {
  readonly type: 'action_confidence_delta_flat';
  readonly delta: number;
}

export interface ActionPracticeImpactFlatSkillEffect extends ScopedConditionalSkillEffect {
  readonly type: 'action_practice_impact_flat';
  readonly delta: number;
}

export interface PassiveBodyRecoveryFlatSkillEffect {
  readonly type: 'passive_body_recovery_flat';
  readonly delta: number;
}

export interface InjuryRiskMultiplierSkillEffect {
  readonly type: 'injury_risk_multiplier';
  readonly multiplierPermille: number;
}

export interface GameHookSkillEffect {
  readonly type: 'game_hook';
  readonly hookId: SkillGameHookId;
  readonly valueMilli: number;
}

export interface LifeHookSkillEffect {
  readonly type: 'life_hook';
  readonly hookId: SkillLifeHookId;
  readonly valueMilli: number;
}

export type ActionSkillEffect =
  | ActionXpMultiplierSkillEffect
  | ActionBodyCostMultiplierSkillEffect
  | ActionBodyDeltaFlatSkillEffect
  | ActionGpaDeltaMilliSkillEffect
  | ActionPreparationDeltaFlatSkillEffect
  | ActionConfidenceDeltaFlatSkillEffect
  | ActionPracticeImpactFlatSkillEffect;

export type SkillEffect =
  | ActionSkillEffect
  | PassiveBodyRecoveryFlatSkillEffect
  | InjuryRiskMultiplierSkillEffect
  | GameHookSkillEffect
  | LifeHookSkillEffect;

export interface SkillEligibility {
  /** Empty means common to every supported position; otherwise the list is restrictive. */
  readonly positionIds: readonly PositionId[];
  readonly archetypeIds: readonly WrArchetypeId[];
  readonly requiredPlayerTagIds: readonly PlayerTagId[];
  readonly excludedPlayerTagIds: readonly PlayerTagId[];
  readonly minWeekIndex: number;
}

export type SkillBehaviorAffinityTagId =
  WeeklyActionTagId | SkillBehaviorTagId | SkillBreakthroughSourceId;

export interface SkillBehaviorWeightRule {
  readonly affinityTagId: SkillBehaviorAffinityTagId;
  readonly weightBonus: number;
}

export interface SkillMechanicsDefinition {
  readonly id: SkillId;
  readonly gradeId: SkillGradeId;
  readonly familyId: SkillFamilyId;
  readonly baseOfferWeight: number;
  readonly eligibility: SkillEligibility;
  readonly behaviorWeightRules: readonly SkillBehaviorWeightRule[];
  readonly effects: readonly SkillEffect[];
}

interface AppliedWeeklySkillEffectBase {
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly effectIndex: number;
}

export interface AppliedActionXpMultiplierSkillEffect extends AppliedWeeklySkillEffectBase {
  readonly type: 'action_xp_multiplier';
  readonly multiplierPermille: number;
}

export interface AppliedActionBodyCostMultiplierSkillEffect extends AppliedWeeklySkillEffectBase {
  readonly type: 'action_body_cost_multiplier';
  readonly multiplierPermille: number;
}

export interface AppliedActionBodyDeltaFlatSkillEffect extends AppliedWeeklySkillEffectBase {
  readonly type: 'action_body_delta_flat';
  readonly delta: number;
}

export interface AppliedActionGpaDeltaMilliSkillEffect extends AppliedWeeklySkillEffectBase {
  readonly type: 'action_gpa_delta_milli';
  readonly deltaMilli: number;
}

export interface AppliedActionPreparationDeltaFlatSkillEffect extends AppliedWeeklySkillEffectBase {
  readonly type: 'action_preparation_delta_flat';
  readonly delta: number;
}

export interface AppliedActionConfidenceDeltaFlatSkillEffect extends AppliedWeeklySkillEffectBase {
  readonly type: 'action_confidence_delta_flat';
  readonly delta: number;
}

export interface AppliedActionPracticeImpactFlatSkillEffect extends AppliedWeeklySkillEffectBase {
  readonly type: 'action_practice_impact_flat';
  readonly delta: number;
}

export type AppliedWeeklySkillEffectV2 =
  | AppliedActionXpMultiplierSkillEffect
  | AppliedActionBodyCostMultiplierSkillEffect
  | AppliedActionBodyDeltaFlatSkillEffect
  | AppliedActionGpaDeltaMilliSkillEffect;

export type AppliedWeeklySkillEffect =
  | AppliedWeeklySkillEffectV2
  | AppliedActionPreparationDeltaFlatSkillEffect
  | AppliedActionConfidenceDeltaFlatSkillEffect
  | AppliedActionPracticeImpactFlatSkillEffect;

export interface WeeklySkillEffectAggregatesV2 {
  readonly xpMultiplierPermille: number;
  readonly bodyCostMultiplierPermille: number;
  readonly bodyDeltaFlat: number;
  readonly gpaDeltaMilli: number;
}

export interface WeeklySkillEffectAggregates extends WeeklySkillEffectAggregatesV2 {
  readonly preparationDeltaFlat: number;
  readonly confidenceDeltaFlat: number;
  readonly practiceImpactFlat: number;
}

export interface CollectedGameHook {
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly effectIndex: number;
  readonly hookId: SkillGameHookId;
  readonly valueMilli: number;
}

export interface CollectedLifeHook {
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly effectIndex: number;
  readonly hookId: SkillLifeHookId;
  readonly valueMilli: number;
}

export type CollectEquippedLifeHooksResult =
  | { readonly ok: true; readonly hooks: readonly CollectedLifeHook[] }
  | { readonly ok: false; readonly reason: SkillRegistryFailureReason };

export interface AppliedPassiveBodyRecoverySkillEffect {
  readonly type: 'passive_body_recovery_flat';
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly effectIndex: number;
  readonly delta: number;
}

export interface AppliedInjuryRiskMultiplierSkillEffect {
  readonly type: 'injury_risk_multiplier';
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly effectIndex: number;
  readonly multiplierPermille: number;
}

export type AppliedInjuryRiskSkillEffect =
  AppliedPassiveBodyRecoverySkillEffect | AppliedInjuryRiskMultiplierSkillEffect;

export type DeriveInjuryRiskSkillEffectsResult =
  | {
      readonly ok: true;
      readonly multiplierPermille: number;
      readonly appliedSkillEffects: readonly AppliedInjuryRiskMultiplierSkillEffect[];
    }
  | { readonly ok: false; readonly reason: SkillRegistryFailureReason };

export interface PassiveBodyRecoveryEvidence {
  readonly weekIndex: number;
  readonly bodyBefore: number;
  readonly baseBodyDelta: number;
  readonly requestedBodyDelta: number;
  readonly actualBodyDelta: number;
  readonly bodyAfter: number;
  readonly appliedSkillEffects: readonly AppliedPassiveBodyRecoverySkillEffect[];
}

export const SKILL_REGISTRY_FAILURE_REASONS = Object.freeze([
  'skill_registry.invalid_definitions',
  'skill_registry.missing_equipped_definition',
  'skill_registry.invalid_context',
] as const);

export type SkillRegistryFailureReason = (typeof SKILL_REGISTRY_FAILURE_REASONS)[number];

export type CollectEquippedGameHooksResult =
  | { readonly ok: true; readonly hooks: readonly CollectedGameHook[] }
  | { readonly ok: false; readonly reason: SkillRegistryFailureReason };
