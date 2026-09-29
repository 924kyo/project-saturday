import { BODY_BOUNDS, isIntegerWithinBounds } from '../player/bounds.js';
import { deepFreeze } from '../player/immutable.js';
import type { WeeklyActionId, PositionTrainingActionId } from '../weekly/ids.js';
import { PASSIVE_BODY_RECOVERY_BOUNDS } from '../weekly/tuning.js';
import type { WeeklyActionDefinition } from '../weekly/types.js';
import { isSkillMechanicsDefinitionCatalog } from './definition.js';
import { isSkillId, type SkillId } from './ids.js';
import {
  SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS,
  SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS,
  SKILL_INJURY_RISK_MULTIPLIER_AGGREGATE_BOUNDS,
  SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS,
  SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS,
  SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS,
} from './tuning.js';
import type {
  AppliedWeeklySkillEffect,
  AppliedPassiveBodyRecoverySkillEffect,
  AppliedInjuryRiskMultiplierSkillEffect,
  CollectedGameHook,
  CollectEquippedGameHooksResult,
  CollectEquippedLifeHooksResult,
  DeriveInjuryRiskSkillEffectsResult,
  EquippedSkillSlotIndex,
  PlayerSkillState,
  PlayerSkillStateV2,
  PassiveBodyRecoveryEvidence,
  SkillActionScope,
  SkillEffectCondition,
  SkillMechanicsDefinition,
  SkillRegistryFailureReason,
  WeeklySkillEffectAggregates,
  WeeklySkillEffectAggregatesV2,
  CollectedLifeHook,
} from './types.js';

export const NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES_V2 = deepFreeze({
  xpMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  bodyCostMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  bodyDeltaFlat: 0,
  gpaDeltaMilli: 0,
} satisfies WeeklySkillEffectAggregatesV2);

export const NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES = deepFreeze({
  ...NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES_V2,
  preparationDeltaFlat: 0,
  confidenceDeltaFlat: 0,
  practiceImpactFlat: 0,
} satisfies WeeklySkillEffectAggregates);

interface EquippedSkillDefinitionEntry {
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly definition: SkillMechanicsDefinition;
}

type EquippedSkillDefinitionResult =
  | { readonly ok: true; readonly entries: readonly EquippedSkillDefinitionEntry[] }
  | { readonly ok: false; readonly reason: SkillRegistryFailureReason };

/** Explicit effect input. Owning commands validate acquisition/ownership separately. */
export interface SkillEffectLoadout {
  readonly model: 'skill_effect_loadout_v1';
  readonly equippedSkillIds: readonly (SkillId | null)[];
}
type SkillEffectSelection = PlayerSkillState | PlayerSkillStateV2 | SkillEffectLoadout;
type SkillFocusId = WeeklyActionId | PositionTrainingActionId;
export interface SkillActionTarget {
  readonly id: SkillFocusId;
  readonly tagIds: WeeklyActionDefinition['tagIds'];
  readonly attributeXp: readonly { readonly attributeId: string; readonly baseXp: number }[];
  readonly bodyDelta: number;
}

export interface WeeklySkillEffectContext {
  readonly body: number;
  readonly actionId: SkillFocusId;
  readonly actionIndex: 0 | 1 | 2;
  readonly planActionIds: readonly SkillFocusId[];
  readonly previousActionId: SkillFocusId | null;
}

export type CollectWeeklySkillEffectsResult =
  | {
      readonly ok: true;
      readonly aggregates: WeeklySkillEffectAggregates;
      readonly appliedSkillEffects: readonly AppliedWeeklySkillEffect[];
    }
  | { readonly ok: false; readonly reason: SkillRegistryFailureReason };

export type DerivePassiveBodyRecoveryResult =
  | { readonly ok: true; readonly evidence: PassiveBodyRecoveryEvidence }
  | { readonly ok: false; readonly reason: SkillRegistryFailureReason };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function registryFailure(reason: SkillRegistryFailureReason): {
  readonly ok: false;
  readonly reason: SkillRegistryFailureReason;
} {
  return deepFreeze({ ok: false as const, reason });
}

function isUsablePlayerSkillState(value: unknown): value is PlayerSkillState | PlayerSkillStateV2 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const state = value as Readonly<Record<string, unknown>>;
  if (Object.hasOwn(state, 'model') && state['model'] === 'skill_effect_loadout_v1') return false;
  if (!Array.isArray(state['acquisitions']) || !Array.isArray(state['equippedSkillIds'])) {
    return false;
  }
  const owned = new Set<string>();
  for (let index = 0; index < state['acquisitions'].length; index += 1) {
    const acquisition = state['acquisitions'][index];
    if (
      !Object.hasOwn(state['acquisitions'], index) ||
      typeof acquisition !== 'object' ||
      acquisition === null ||
      Array.isArray(acquisition)
    ) {
      return false;
    }
    const selectedSkillId = (acquisition as Readonly<Record<string, unknown>>)['selectedSkillId'];
    if (!isSkillId(selectedSkillId) || owned.has(selectedSkillId)) {
      return false;
    }
    owned.add(selectedSkillId);
  }
  if (state['equippedSkillIds'].length !== 4) {
    return false;
  }
  const equipped = new Set<string>();
  for (let index = 0; index < state['equippedSkillIds'].length; index += 1) {
    const skillId = state['equippedSkillIds'][index];
    if (!Object.hasOwn(state['equippedSkillIds'], index)) {
      return false;
    }
    if (skillId === null) {
      continue;
    }
    if (!isSkillId(skillId) || !owned.has(skillId) || equipped.has(skillId)) {
      return false;
    }
    equipped.add(skillId);
  }
  return true;
}

function isUsableEffectLoadout(value: unknown): value is SkillEffectLoadout {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const state = value as Readonly<Record<string, unknown>>;
  if (
    Object.keys(state).sort().join('|') !== 'equippedSkillIds|model' ||
    state['model'] !== 'skill_effect_loadout_v1' ||
    !Array.isArray(state['equippedSkillIds']) ||
    state['equippedSkillIds'].length !== 4
  )
    return false;
  const equipped = new Set<string>();
  for (const id of state['equippedSkillIds']) {
    if (id === null) continue;
    if (!isSkillId(id) || equipped.has(id)) return false;
    equipped.add(id);
  }
  return true;
}

function resolveEquippedSkillDefinitions(
  skillState: SkillEffectSelection,
  definitions: readonly SkillMechanicsDefinition[],
): EquippedSkillDefinitionResult {
  if (!isUsablePlayerSkillState(skillState) && !isUsableEffectLoadout(skillState)) {
    return registryFailure('skill_registry.invalid_context');
  }
  if (!isSkillMechanicsDefinitionCatalog(definitions)) {
    return registryFailure('skill_registry.invalid_definitions');
  }
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const entries: EquippedSkillDefinitionEntry[] = [];
  for (const [rawSlotIndex, skillId] of skillState.equippedSkillIds.entries()) {
    if (skillId === null) {
      continue;
    }
    const definition = byId.get(skillId);
    if (definition === undefined) {
      return registryFailure('skill_registry.missing_equipped_definition');
    }
    entries.push({
      skillId,
      slotIndex: rawSlotIndex as EquippedSkillSlotIndex,
      definition,
    });
  }
  // Internal borrowed readonly definitions never escape into published evidence.
  // Freezing this lookup would freeze a caller-owned content catalog.
  return { ok: true, entries };
}

export function doesSkillActionScopeApply(
  scope: SkillActionScope,
  action: Pick<SkillActionTarget, 'id' | 'tagIds'>,
): boolean {
  return scope.type === 'action_ids'
    ? scope.actionIds.some((actionId) => actionId === action.id)
    : scope.actionTagIds.some((tagId) => action.tagIds.some((candidate) => candidate === tagId));
}

export function doesSkillEffectConditionApply(
  condition: SkillEffectCondition,
  context: WeeklySkillEffectContext,
): boolean {
  switch (condition.type) {
    case 'always':
      return true;
    case 'body_at_least':
      return context.body >= condition.body;
    case 'body_at_most':
      return context.body <= condition.body;
    case 'action_occurrence_at_least':
      return (
        context.planActionIds
          .slice(0, context.actionIndex + 1)
          .filter((actionId) => actionId === context.actionId).length >= condition.minimumCount
      );
    case 'plan_distinct_action_count_at_least':
      return new Set(context.planActionIds).size >= condition.minimumCount;
    case 'previous_action_id':
      return context.previousActionId === condition.actionId;
  }
}

export function collectWeeklySkillEffects(
  skillState: SkillEffectSelection,
  definitions: readonly SkillMechanicsDefinition[],
  action: SkillActionTarget,
  context: WeeklySkillEffectContext,
): CollectWeeklySkillEffectsResult {
  const equipped = resolveEquippedSkillDefinitions(skillState, definitions);
  if (!equipped.ok) {
    return equipped;
  }

  const appliedSkillEffects: AppliedWeeklySkillEffect[] = [];
  for (const { definition, skillId, slotIndex } of equipped.entries) {
    for (const [effectIndex, effect] of definition.effects.entries()) {
      if (
        effect.type === 'passive_body_recovery_flat' ||
        effect.type === 'injury_risk_multiplier' ||
        effect.type === 'game_hook' ||
        effect.type === 'life_hook' ||
        !doesSkillActionScopeApply(effect.scope, action) ||
        !doesSkillEffectConditionApply(effect.condition, context)
      ) {
        continue;
      }
      if (effect.type === 'action_xp_multiplier' && action.attributeXp.length === 0) {
        continue;
      }
      if (effect.type === 'action_body_cost_multiplier' && action.bodyDelta >= 0) {
        continue;
      }
      const traceBase = { skillId, slotIndex, effectIndex };
      switch (effect.type) {
        case 'action_xp_multiplier':
        case 'action_body_cost_multiplier':
          appliedSkillEffects.push({
            ...traceBase,
            type: effect.type,
            multiplierPermille: effect.multiplierPermille,
          });
          break;
        case 'action_body_delta_flat':
        case 'action_preparation_delta_flat':
        case 'action_confidence_delta_flat':
        case 'action_practice_impact_flat':
          appliedSkillEffects.push({ ...traceBase, type: effect.type, delta: effect.delta });
          break;
        case 'action_gpa_delta_milli':
          appliedSkillEffects.push({
            ...traceBase,
            type: effect.type,
            deltaMilli: effect.deltaMilli,
          });
          break;
      }
    }
  }

  let xpMultiplierPermille = SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
  let bodyCostMultiplierPermille = SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
  let bodyDeltaFlat = 0;
  let gpaDeltaMilli = 0;
  let preparationDeltaFlat = 0;
  let confidenceDeltaFlat = 0;
  let practiceImpactFlat = 0;
  for (const effect of appliedSkillEffects) {
    switch (effect.type) {
      case 'action_xp_multiplier':
        xpMultiplierPermille += effect.multiplierPermille - SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
        break;
      case 'action_body_cost_multiplier':
        bodyCostMultiplierPermille += effect.multiplierPermille - SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
        break;
      case 'action_body_delta_flat':
        bodyDeltaFlat += effect.delta;
        break;
      case 'action_gpa_delta_milli':
        gpaDeltaMilli += effect.deltaMilli;
        break;
      case 'action_preparation_delta_flat':
        preparationDeltaFlat += effect.delta;
        break;
      case 'action_confidence_delta_flat':
        confidenceDeltaFlat += effect.delta;
        break;
      case 'action_practice_impact_flat':
        practiceImpactFlat += effect.delta;
        break;
    }
  }
  const aggregates: WeeklySkillEffectAggregates = {
    xpMultiplierPermille: clamp(
      xpMultiplierPermille,
      SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS.min,
      SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS.max,
    ),
    bodyCostMultiplierPermille: clamp(
      bodyCostMultiplierPermille,
      SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS.min,
      SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS.max,
    ),
    bodyDeltaFlat: clamp(
      bodyDeltaFlat,
      SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS.max,
    ),
    gpaDeltaMilli: clamp(
      gpaDeltaMilli,
      SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS.min,
      SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS.max,
    ),
    preparationDeltaFlat: clamp(
      preparationDeltaFlat,
      SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS.max,
    ),
    confidenceDeltaFlat: clamp(
      confidenceDeltaFlat,
      SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS.max,
    ),
    practiceImpactFlat: clamp(
      practiceImpactFlat,
      SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS.max,
    ),
  };
  return deepFreeze({ ok: true, aggregates, appliedSkillEffects });
}

export function deriveSkillModifiedBodyDelta(
  baseBodyDelta: number,
  aggregates: WeeklySkillEffectAggregates,
): number {
  const scaledBase =
    baseBodyDelta < 0
      ? -Math.round(
          (Math.abs(baseBodyDelta) * aggregates.bodyCostMultiplierPermille) /
            SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
        )
      : baseBodyDelta;
  return scaledBase + aggregates.bodyDeltaFlat;
}

export function deriveSkillModifiedGpaDelta(
  baseGpaDelta: number,
  aggregates: WeeklySkillEffectAggregates,
): number {
  return baseGpaDelta + aggregates.gpaDeltaMilli / 1000;
}

export function derivePassiveBodyRecovery(
  bodyBefore: number,
  basePassiveBodyRecovery: number,
  skillState: SkillEffectSelection,
  definitions: readonly SkillMechanicsDefinition[],
  weekIndex: number,
): DerivePassiveBodyRecoveryResult {
  if (
    !Number.isSafeInteger(weekIndex) ||
    weekIndex < 0 ||
    !isIntegerWithinBounds(bodyBefore, BODY_BOUNDS) ||
    !isIntegerWithinBounds(basePassiveBodyRecovery, PASSIVE_BODY_RECOVERY_BOUNDS)
  ) {
    return registryFailure('skill_registry.invalid_context');
  }
  const equipped = resolveEquippedSkillDefinitions(skillState, definitions);
  if (!equipped.ok) {
    return equipped;
  }
  let flat = 0;
  const appliedSkillEffects: AppliedPassiveBodyRecoverySkillEffect[] = [];
  for (const { definition, skillId, slotIndex } of equipped.entries) {
    for (const [effectIndex, effect] of definition.effects.entries()) {
      if (effect.type === 'passive_body_recovery_flat') {
        flat += effect.delta;
        appliedSkillEffects.push({
          type: effect.type,
          skillId,
          slotIndex,
          effectIndex,
          delta: effect.delta,
        });
      }
    }
  }
  const boundedFlat = clamp(
    flat,
    SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS.min,
    SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS.max,
  );
  const requestedBodyDelta = clamp(
    basePassiveBodyRecovery + boundedFlat,
    PASSIVE_BODY_RECOVERY_BOUNDS.min,
    PASSIVE_BODY_RECOVERY_BOUNDS.max,
  );
  const bodyAfter = clamp(bodyBefore + requestedBodyDelta, BODY_BOUNDS.min, BODY_BOUNDS.max);
  return deepFreeze({
    ok: true,
    evidence: {
      weekIndex,
      bodyBefore,
      baseBodyDelta: basePassiveBodyRecovery,
      requestedBodyDelta,
      actualBodyDelta: bodyAfter - bodyBefore,
      bodyAfter,
      appliedSkillEffects,
    },
  });
}

export function deriveInjuryRiskSkillEffects(
  skillState: SkillEffectSelection,
  definitions: readonly SkillMechanicsDefinition[],
): DeriveInjuryRiskSkillEffectsResult {
  const equipped = resolveEquippedSkillDefinitions(skillState, definitions);
  if (!equipped.ok) return equipped;
  let multiplierPermille = SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
  const appliedSkillEffects: AppliedInjuryRiskMultiplierSkillEffect[] = [];
  for (const { definition, skillId, slotIndex } of equipped.entries) {
    for (const [effectIndex, effect] of definition.effects.entries()) {
      if (effect.type !== 'injury_risk_multiplier') continue;
      multiplierPermille += effect.multiplierPermille - SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
      appliedSkillEffects.push({
        type: effect.type,
        skillId,
        slotIndex,
        effectIndex,
        multiplierPermille: effect.multiplierPermille,
      });
    }
  }
  return deepFreeze({
    ok: true,
    multiplierPermille: clamp(
      multiplierPermille,
      SKILL_INJURY_RISK_MULTIPLIER_AGGREGATE_BOUNDS.min,
      SKILL_INJURY_RISK_MULTIPLIER_AGGREGATE_BOUNDS.max,
    ),
    appliedSkillEffects,
  });
}

export function collectEquippedGameHooks(
  skillState: SkillEffectSelection,
  definitions: readonly SkillMechanicsDefinition[],
): CollectEquippedGameHooksResult {
  const equipped = resolveEquippedSkillDefinitions(skillState, definitions);
  if (!equipped.ok) {
    return equipped;
  }
  const hooks: CollectedGameHook[] = [];
  for (const { definition, skillId, slotIndex } of equipped.entries) {
    for (const [effectIndex, effect] of definition.effects.entries()) {
      if (effect.type === 'game_hook') {
        hooks.push({
          skillId,
          slotIndex,
          effectIndex,
          hookId: effect.hookId,
          valueMilli: effect.valueMilli,
        });
      }
    }
  }
  return deepFreeze({ ok: true, hooks });
}

export function collectEquippedLifeHooks(
  skillState: SkillEffectSelection,
  definitions: readonly SkillMechanicsDefinition[],
): CollectEquippedLifeHooksResult {
  const equipped = resolveEquippedSkillDefinitions(skillState, definitions);
  if (!equipped.ok) {
    return equipped;
  }
  const hooks: CollectedLifeHook[] = [];
  for (const { definition, skillId, slotIndex } of equipped.entries) {
    for (const [effectIndex, effect] of definition.effects.entries()) {
      if (effect.type === 'life_hook') {
        hooks.push({
          skillId,
          slotIndex,
          effectIndex,
          hookId: effect.hookId,
          valueMilli: effect.valueMilli,
        });
      }
    }
  }
  return deepFreeze({ ok: true, hooks });
}
