import { BODY_BOUNDS, isIntegerWithinBounds } from '../player/bounds.js';
import { isPlayerTagId, isPositionId, isWrArchetypeId } from '../player/ids.js';
import { isWeeklyActionId, isWeeklyActionTagId } from '../weekly/ids.js';
import {
  isSkillBehaviorTagId,
  isSkillBreakthroughSourceId,
  isSkillFamilyId,
  isSkillGameHookId,
  isSkillLifeHookId,
  isSkillGradeId,
  isSkillId,
} from './ids.js';
import {
  SKILL_ACTION_SCOPE_ID_LIST_MAX,
  SKILL_BASE_OFFER_WEIGHT_BOUNDS,
  SKILL_BEHAVIOR_WEIGHT_BONUS_BOUNDS,
  SKILL_BEHAVIOR_WEIGHT_RULE_MAX,
  SKILL_BODY_DELTA_FLAT_BOUNDS,
  SKILL_EFFECT_COUNT_BOUNDS,
  SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS,
  SKILL_ELIGIBILITY_ID_LIST_MAX,
  SKILL_GAME_HOOK_VALUE_MILLI_BOUNDS,
  SKILL_GPA_DELTA_MILLI_BOUNDS,
  SKILL_PREPARATION_DELTA_FLAT_BOUNDS,
  SKILL_CONFIDENCE_DELTA_FLAT_BOUNDS,
  SKILL_PRACTICE_IMPACT_FLAT_BOUNDS,
  SKILL_LIFE_HOOK_VALUE_MILLI_BOUNDS,
  SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS,
} from './tuning.js';
import type {
  SkillActionScope,
  SkillBehaviorWeightRule,
  SkillEffect,
  SkillEffectCondition,
  SkillEligibility,
  SkillMechanicsDefinition,
} from './types.js';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: UnknownRecord, expectedKeys: readonly string[]): boolean {
  return (
    Object.keys(value).length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      return false;
    }
  }
  return true;
}

function isUniqueIdArray(
  value: unknown,
  minimumLength: number,
  maximumLength: number,
  isId: (candidate: unknown) => boolean,
): value is readonly string[] {
  if (!isDenseArray(value) || value.length < minimumLength || value.length > maximumLength) {
    return false;
  }
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!isId(candidate) || seen.has(candidate as string)) {
      return false;
    }
    seen.add(candidate as string);
  }
  return true;
}

export function isSkillActionScope(value: unknown): value is SkillActionScope {
  if (!isRecord(value)) {
    return false;
  }
  if (value['type'] === 'action_ids') {
    return (
      hasExactKeys(value, ['type', 'actionIds']) &&
      isUniqueIdArray(value['actionIds'], 1, SKILL_ACTION_SCOPE_ID_LIST_MAX, isWeeklyActionId)
    );
  }
  if (value['type'] === 'action_tags') {
    return (
      hasExactKeys(value, ['type', 'actionTagIds']) &&
      isUniqueIdArray(value['actionTagIds'], 1, SKILL_ACTION_SCOPE_ID_LIST_MAX, isWeeklyActionTagId)
    );
  }
  return false;
}

export function isSkillEffectCondition(value: unknown): value is SkillEffectCondition {
  if (!isRecord(value)) {
    return false;
  }
  switch (value['type']) {
    case 'always':
      return hasExactKeys(value, ['type']);
    case 'body_at_least':
    case 'body_at_most':
      return (
        hasExactKeys(value, ['type', 'body']) && isIntegerWithinBounds(value['body'], BODY_BOUNDS)
      );
    case 'action_occurrence_at_least':
    case 'plan_distinct_action_count_at_least':
      return (
        hasExactKeys(value, ['type', 'minimumCount']) &&
        Number.isInteger(value['minimumCount']) &&
        (value['minimumCount'] as number) >= 2 &&
        (value['minimumCount'] as number) <= 3
      );
    case 'previous_action_id':
      return hasExactKeys(value, ['type', 'actionId']) && isWeeklyActionId(value['actionId']);
    default:
      return false;
  }
}

function hasScopedCondition(value: UnknownRecord): boolean {
  return isSkillActionScope(value['scope']) && isSkillEffectCondition(value['condition']);
}

export function isSkillEffect(value: unknown): value is SkillEffect {
  if (!isRecord(value)) {
    return false;
  }
  switch (value['type']) {
    case 'action_xp_multiplier':
    case 'action_body_cost_multiplier':
      return (
        hasExactKeys(value, ['type', 'scope', 'condition', 'multiplierPermille']) &&
        hasScopedCondition(value) &&
        isIntegerWithinBounds(
          value['multiplierPermille'],
          SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS,
        ) &&
        value['multiplierPermille'] !== SKILL_NEUTRAL_MULTIPLIER_PERMILLE
      );
    case 'action_body_delta_flat':
      return (
        hasExactKeys(value, ['type', 'scope', 'condition', 'delta']) &&
        hasScopedCondition(value) &&
        isIntegerWithinBounds(value['delta'], SKILL_BODY_DELTA_FLAT_BOUNDS) &&
        value['delta'] !== 0
      );
    case 'action_gpa_delta_milli':
      return (
        hasExactKeys(value, ['type', 'scope', 'condition', 'deltaMilli']) &&
        hasScopedCondition(value) &&
        isIntegerWithinBounds(value['deltaMilli'], SKILL_GPA_DELTA_MILLI_BOUNDS) &&
        value['deltaMilli'] !== 0
      );
    case 'action_preparation_delta_flat':
      return (
        hasExactKeys(value, ['type', 'scope', 'condition', 'delta']) &&
        hasScopedCondition(value) &&
        isIntegerWithinBounds(value['delta'], SKILL_PREPARATION_DELTA_FLAT_BOUNDS) &&
        value['delta'] !== 0
      );
    case 'action_confidence_delta_flat':
      return (
        hasExactKeys(value, ['type', 'scope', 'condition', 'delta']) &&
        hasScopedCondition(value) &&
        isIntegerWithinBounds(value['delta'], SKILL_CONFIDENCE_DELTA_FLAT_BOUNDS) &&
        value['delta'] !== 0
      );
    case 'action_practice_impact_flat':
      return (
        hasExactKeys(value, ['type', 'scope', 'condition', 'delta']) &&
        hasScopedCondition(value) &&
        isIntegerWithinBounds(value['delta'], SKILL_PRACTICE_IMPACT_FLAT_BOUNDS) &&
        value['delta'] !== 0
      );
    case 'passive_body_recovery_flat':
      return (
        hasExactKeys(value, ['type', 'delta']) &&
        isIntegerWithinBounds(value['delta'], SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS) &&
        value['delta'] !== 0
      );
    case 'injury_risk_multiplier':
      return (
        hasExactKeys(value, ['type', 'multiplierPermille']) &&
        isIntegerWithinBounds(
          value['multiplierPermille'],
          SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS,
        ) &&
        value['multiplierPermille'] !== SKILL_NEUTRAL_MULTIPLIER_PERMILLE
      );
    case 'game_hook':
      return (
        hasExactKeys(value, ['type', 'hookId', 'valueMilli']) &&
        isSkillGameHookId(value['hookId']) &&
        isIntegerWithinBounds(
          value['valueMilli'],
          SKILL_GAME_HOOK_VALUE_MILLI_BOUNDS[
            value['hookId'] as keyof typeof SKILL_GAME_HOOK_VALUE_MILLI_BOUNDS
          ],
        ) &&
        !(
          value['hookId'] === 'game_hook_fumble_risk_multiplier' &&
          value['valueMilli'] === SKILL_NEUTRAL_MULTIPLIER_PERMILLE
        )
      );
    case 'life_hook':
      return (
        hasExactKeys(value, ['type', 'hookId', 'valueMilli']) &&
        isSkillLifeHookId(value['hookId']) &&
        isIntegerWithinBounds(
          value['valueMilli'],
          SKILL_LIFE_HOOK_VALUE_MILLI_BOUNDS[
            value['hookId'] as keyof typeof SKILL_LIFE_HOOK_VALUE_MILLI_BOUNDS
          ],
        ) &&
        !(
          (value['hookId'] === 'life_hook_nil_reward_multiplier' ||
            value['hookId'] === 'life_hook_relationship_gain_multiplier') &&
          value['valueMilli'] === SKILL_NEUTRAL_MULTIPLIER_PERMILLE
        )
      );
    default:
      return false;
  }
}

function isSkillEligibility(value: unknown): value is SkillEligibility {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'positionIds',
      'archetypeIds',
      'requiredPlayerTagIds',
      'excludedPlayerTagIds',
      'minWeekIndex',
    ]) ||
    !isUniqueIdArray(value['positionIds'], 0, SKILL_ELIGIBILITY_ID_LIST_MAX, isPositionId) ||
    !isUniqueIdArray(value['archetypeIds'], 0, SKILL_ELIGIBILITY_ID_LIST_MAX, isWrArchetypeId) ||
    !isUniqueIdArray(
      value['requiredPlayerTagIds'],
      0,
      SKILL_ELIGIBILITY_ID_LIST_MAX,
      isPlayerTagId,
    ) ||
    !isUniqueIdArray(
      value['excludedPlayerTagIds'],
      0,
      SKILL_ELIGIBILITY_ID_LIST_MAX,
      isPlayerTagId,
    ) ||
    !Number.isSafeInteger(value['minWeekIndex']) ||
    (value['minWeekIndex'] as number) < 0
  ) {
    return false;
  }

  const excluded = new Set(value['excludedPlayerTagIds']);
  return !value['requiredPlayerTagIds'].some((tagId) => excluded.has(tagId));
}

function isSkillBehaviorWeightRule(value: unknown): value is SkillBehaviorWeightRule {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['affinityTagId', 'weightBonus']) &&
    (isSkillBehaviorTagId(value['affinityTagId']) ||
      isSkillBreakthroughSourceId(value['affinityTagId']) ||
      isWeeklyActionTagId(value['affinityTagId'])) &&
    isIntegerWithinBounds(value['weightBonus'], SKILL_BEHAVIOR_WEIGHT_BONUS_BOUNDS)
  );
}

export function isSkillMechanicsDefinition(value: unknown): value is SkillMechanicsDefinition {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'id',
      'gradeId',
      'familyId',
      'baseOfferWeight',
      'eligibility',
      'behaviorWeightRules',
      'effects',
    ]) ||
    !isSkillId(value['id']) ||
    !isSkillGradeId(value['gradeId']) ||
    !isSkillFamilyId(value['familyId']) ||
    !isIntegerWithinBounds(value['baseOfferWeight'], SKILL_BASE_OFFER_WEIGHT_BOUNDS) ||
    !isSkillEligibility(value['eligibility']) ||
    !isDenseArray(value['behaviorWeightRules']) ||
    value['behaviorWeightRules'].length > SKILL_BEHAVIOR_WEIGHT_RULE_MAX ||
    !value['behaviorWeightRules'].every(isSkillBehaviorWeightRule) ||
    !isDenseArray(value['effects']) ||
    !isIntegerWithinBounds(value['effects'].length, SKILL_EFFECT_COUNT_BOUNDS) ||
    !value['effects'].every(isSkillEffect)
  ) {
    return false;
  }
  const affinityTagIds = value['behaviorWeightRules'].map(
    (rule) => (rule as SkillBehaviorWeightRule).affinityTagId,
  );
  return new Set(affinityTagIds).size === affinityTagIds.length;
}

export function isSkillMechanicsDefinitionCatalog(
  value: unknown,
): value is readonly SkillMechanicsDefinition[] {
  if (!isDenseArray(value)) {
    return false;
  }
  const seen = new Set<string>();
  for (const definition of value) {
    if (!isSkillMechanicsDefinition(definition) || seen.has(definition.id)) {
      return false;
    }
    seen.add(definition.id);
  }
  return true;
}
