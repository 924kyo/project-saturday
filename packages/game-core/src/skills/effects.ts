import { BODY_BOUNDS, isIntegerWithinBounds } from '../player/bounds.js';
import { deepFreeze } from '../player/immutable.js';
import type { WeeklyActionId } from '../weekly/ids.js';
import { PASSIVE_BODY_RECOVERY_BOUNDS } from '../weekly/tuning.js';
import type { WeeklyActionDefinition } from '../weekly/types.js';
import { isSkillMechanicsDefinitionCatalog } from './definition.js';
import { isSkillId, type SkillId } from './ids.js';
import {
  SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS,
  SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS,
  SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS,
  SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS,
} from './tuning.js';
import type {
  AppliedWeeklySkillEffect,
  AppliedPassiveBodyRecoverySkillEffect,
  CollectedGameHook,
  CollectEquippedGameHooksResult,
  EquippedSkillSlotIndex,
  PlayerSkillState,
  PassiveBodyRecoveryEvidence,
  SkillActionScope,
  SkillEffectCondition,
  SkillMechanicsDefinition,
  SkillRegistryFailureReason,
  WeeklySkillEffectAggregates,
} from './types.js';

export const NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES = deepFreeze({
  xpMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  bodyCostMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  bodyDeltaFlat: 0,
  gpaDeltaMilli: 0,
} satisfies WeeklySkillEffectAggregates);

interface EquippedSkillDefinitionEntry {
  readonly skillId: SkillId;
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly definition: SkillMechanicsDefinition;
}

type EquippedSkillDefinitionResult =
  | { readonly ok: true; readonly entries: readonly EquippedSkillDefinitionEntry[] }
  | { readonly ok: false; readonly reason: SkillRegistryFailureReason };

export interface WeeklySkillEffectContext {
  readonly body: number;
  readonly actionId: WeeklyActionId;
  readonly actionIndex: 0 | 1 | 2;
  readonly planActionIds: readonly WeeklyActionId[];
  readonly previousActionId: WeeklyActionId | null;
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

function isUsablePlayerSkillState(value: unknown): value is PlayerSkillState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const state = value as Readonly<Record<string, unknown>>;
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

function resolveEquippedSkillDefinitions(
  skillState: PlayerSkillState,
  definitions: readonly SkillMechanicsDefinition[],
): EquippedSkillDefinitionResult {
  if (!isUsablePlayerSkillState(skillState)) {
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
  return deepFreeze({ ok: true, entries });
}

export function doesSkillActionScopeApply(
  scope: SkillActionScope,
  action: WeeklyActionDefinition,
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
  skillState: PlayerSkillState,
  definitions: readonly SkillMechanicsDefinition[],
  action: WeeklyActionDefinition,
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
        effect.type === 'game_hook' ||
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
  skillState: PlayerSkillState,
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

export function collectEquippedGameHooks(
  skillState: PlayerSkillState,
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
