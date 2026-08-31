import type { PlayerTagId, PositionId, WrArchetypeId } from '../player/ids.js';
import type { WeeklyActionId, WeeklyActionTagId } from '../weekly/ids.js';
import type {
  SkillBehaviorTagId,
  SkillFamilyId,
  SkillGameHookId,
  SkillGradeId,
  SkillId,
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

export interface SkillBreakthroughOffer {
  readonly offerIndex: number;
  readonly weekIndex: number;
  readonly offeredSkillIds: OfferedSkillIds;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface SkillAcquisitionRecord extends SkillBreakthroughOffer {
  readonly selectedSkillId: SkillId;
}

export interface PlayerSkillState {
  readonly acquisitions: readonly SkillAcquisitionRecord[];
  readonly equippedSkillIds: EquippedSkillIds;
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

export interface PassiveBodyRecoveryFlatSkillEffect {
  readonly type: 'passive_body_recovery_flat';
  readonly delta: number;
}

export interface GameHookSkillEffect {
  readonly type: 'game_hook';
  readonly hookId: SkillGameHookId;
  readonly valueMilli: number;
}

export type ActionSkillEffect =
  | ActionXpMultiplierSkillEffect
  | ActionBodyCostMultiplierSkillEffect
  | ActionBodyDeltaFlatSkillEffect
  | ActionGpaDeltaMilliSkillEffect;

export type SkillEffect =
  ActionSkillEffect | PassiveBodyRecoveryFlatSkillEffect | GameHookSkillEffect;

export interface SkillEligibility {
  /** Empty means common to every supported position; otherwise the list is restrictive. */
  readonly positionIds: readonly PositionId[];
  readonly archetypeIds: readonly WrArchetypeId[];
  readonly requiredPlayerTagIds: readonly PlayerTagId[];
  readonly excludedPlayerTagIds: readonly PlayerTagId[];
  readonly minWeekIndex: number;
}

export type SkillBehaviorAffinityTagId = WeeklyActionTagId | SkillBehaviorTagId;

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

export type AppliedWeeklySkillEffect =
  | AppliedActionXpMultiplierSkillEffect
  | AppliedActionBodyCostMultiplierSkillEffect
  | AppliedActionBodyDeltaFlatSkillEffect
  | AppliedActionGpaDeltaMilliSkillEffect;

export interface WeeklySkillEffectAggregates {
  readonly xpMultiplierPermille: number;
  readonly bodyCostMultiplierPermille: number;
  readonly bodyDeltaFlat: number;
  readonly gpaDeltaMilli: number;
}

export interface CollectedGameHook {
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly effectIndex: number;
  readonly hookId: SkillGameHookId;
  readonly valueMilli: number;
}

export interface AppliedPassiveBodyRecoverySkillEffect {
  readonly type: 'passive_body_recovery_flat';
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly effectIndex: number;
  readonly delta: number;
}

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
