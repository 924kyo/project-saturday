import { isPlayerTagId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import {
  isEventCategoryId,
  isEventChoiceId,
  isEventId,
  isEventIntegerStateId,
  isEventPredicateOperatorId,
  isEventStatePredicateFieldId,
} from './ids.js';
import type {
  EventChoiceMechanicsDefinition,
  EventEffect,
  EventMechanicsDefinition,
  EventRequirements,
  EventSelectionTuning,
  EventStatePredicate,
} from './types.js';

const EVENT_CHOICE_COUNT_MINIMUM = 2;
const EVENT_CHOICE_COUNT_MAXIMUM = 3;
const EVENT_EFFECT_COUNT_MAXIMUM = 3;
const EVENT_REQUIREMENT_TAG_COUNT_MAXIMUM = 12;
const EVENT_STATE_PREDICATE_COUNT_MAXIMUM = 8;
const EVENT_DEFINITION_COUNT_MAXIMUM = 256;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return (
    JSON.stringify(Object.keys(value).sort(compareCodeUnits)) ===
    JSON.stringify([...keys].sort(compareCodeUnits))
  );
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function isUniquePlayerTagList(value: unknown): value is readonly `tag_${string}`[] {
  return (
    Array.isArray(value) &&
    value.length <= EVENT_REQUIREMENT_TAG_COUNT_MAXIMUM &&
    value.every(isPlayerTagId) &&
    new Set(value).size === value.length
  );
}

function isStatePredicate(value: unknown): value is EventStatePredicate {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['fieldId', 'operatorId', 'value']) &&
    isEventStatePredicateFieldId(value['fieldId']) &&
    isEventPredicateOperatorId(value['operatorId']) &&
    isIntegerInRange(value['value'], 0, 4_000)
  );
}

function isRequirements(value: unknown): value is EventRequirements {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['allTagIds', 'anyTagIds', 'excludedTagIds', 'statePredicates']) ||
    !isUniquePlayerTagList(value['allTagIds']) ||
    !isUniquePlayerTagList(value['anyTagIds']) ||
    !isUniquePlayerTagList(value['excludedTagIds']) ||
    !Array.isArray(value['statePredicates']) ||
    value['statePredicates'].length > EVENT_STATE_PREDICATE_COUNT_MAXIMUM ||
    !value['statePredicates'].every(isStatePredicate)
  )
    return false;
  const allTagIds = value['allTagIds'];
  const anyTagIds = value['anyTagIds'];
  const excludedTagIds = value['excludedTagIds'];
  return (
    !allTagIds.some((tagId) => excludedTagIds.includes(tagId)) &&
    !anyTagIds.some((tagId) => excludedTagIds.includes(tagId))
  );
}

export function isEventEffect(value: unknown): value is EventEffect {
  if (!isRecord(value)) return false;
  if (value['type'] === 'event_integer_state_delta') {
    return (
      hasExactKeys(value, ['type', 'stateId', 'delta']) &&
      isEventIntegerStateId(value['stateId']) &&
      isIntegerInRange(value['delta'], -20, 20) &&
      value['delta'] !== 0
    );
  }
  if (value['type'] === 'event_gpa_delta_milli') {
    return (
      hasExactKeys(value, ['type', 'deltaMilli']) &&
      isIntegerInRange(value['deltaMilli'], -500, 500) &&
      value['deltaMilli'] !== 0
    );
  }
  return (
    value['type'] === 'event_breakthrough_gauge_delta' &&
    hasExactKeys(value, ['type', 'points']) &&
    isIntegerInRange(value['points'], -30, 30) &&
    value['points'] !== 0
  );
}

function isChoice(value: unknown): value is EventChoiceMechanicsDefinition {
  if (!(
    isRecord(value) &&
    hasExactKeys(value, ['id', 'effects']) &&
    isEventChoiceId(value['id']) &&
    Array.isArray(value['effects']) &&
    value['effects'].length >= 1 &&
    value['effects'].length <= EVENT_EFFECT_COUNT_MAXIMUM &&
    value['effects'].every(isEventEffect)
  ))
    return false;
  const targets = value['effects'].map((effect) =>
    effect.type === 'event_integer_state_delta' ? effect.stateId : effect.type,
  );
  return new Set(targets).size === targets.length;
}

export function isEventMechanicsDefinition(value: unknown): value is EventMechanicsDefinition {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'id',
      'categoryIds',
      'weight',
      'cooldownWeeks',
      'requirements',
      'choices',
    ]) &&
    isEventId(value['id']) &&
    Array.isArray(value['categoryIds']) &&
    value['categoryIds'].length >= 1 &&
    value['categoryIds'].length <= 6 &&
    value['categoryIds'].every(isEventCategoryId) &&
    new Set(value['categoryIds']).size === value['categoryIds'].length &&
    isIntegerInRange(value['weight'], 1, 1_000) &&
    isIntegerInRange(value['cooldownWeeks'], 0, 52) &&
    isRequirements(value['requirements']) &&
    Array.isArray(value['choices']) &&
    value['choices'].length >= EVENT_CHOICE_COUNT_MINIMUM &&
    value['choices'].length <= EVENT_CHOICE_COUNT_MAXIMUM &&
    value['choices'].every(isChoice) &&
    new Set(value['choices'].map(({ id }) => id)).size === value['choices'].length
  );
}

export function isEventMechanicsDefinitionCatalog(
  value: unknown,
): value is readonly EventMechanicsDefinition[] {
  if (
    !Array.isArray(value) ||
    value.length > EVENT_DEFINITION_COUNT_MAXIMUM ||
    !value.every(isEventMechanicsDefinition)
  )
    return false;
  const eventIds = new Set<string>();
  const choiceIds = new Set<string>();
  for (const event of value) {
    if (eventIds.has(event.id)) return false;
    eventIds.add(event.id);
    for (const choice of event.choices) {
      if (choiceIds.has(choice.id)) return false;
      choiceIds.add(choice.id);
    }
  }
  return true;
}

export function isEventSelectionTuning(value: unknown): value is EventSelectionTuning {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['eventChancePermille']) &&
    isIntegerInRange(value['eventChancePermille'], 0, 1_000)
  );
}
