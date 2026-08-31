import { isIntegerWithinBounds, isWithinBounds } from '../player/bounds.js';
import { isPlayerAttributeId } from '../player/ids.js';
import { WEEKLY_ACTION_PROFICIENCY_IDS, isWeeklyActionId, isWeeklyActionTagId } from './ids.js';
import {
  WEEKLY_ACTION_ATTRIBUTE_TARGET_MAX,
  WEEKLY_ACTION_BASE_XP_BOUNDS,
  WEEKLY_ACTION_BODY_DELTA_BOUNDS,
  WEEKLY_ACTION_GPA_DELTA_BOUNDS,
  WEEKLY_ACTION_TAG_ID_MAX,
} from './tuning.js';
import type { WeeklyActionDefinition } from './types.js';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

export function isWeeklyActionDefinition(value: unknown): value is WeeklyActionDefinition {
  if (!isRecord(value)) {
    return false;
  }
  const expectedKeys = ['id', 'tagIds', 'attributeXp', 'bodyDelta', 'gpaDelta', 'proficiencyId'];
  if (
    Object.keys(value).length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(value, key)) ||
    !isWeeklyActionId(value['id']) ||
    !Array.isArray(value['tagIds']) ||
    value['tagIds'].length > WEEKLY_ACTION_TAG_ID_MAX ||
    !isIntegerWithinBounds(value['bodyDelta'], WEEKLY_ACTION_BODY_DELTA_BOUNDS) ||
    !isWithinBounds(value['gpaDelta'], WEEKLY_ACTION_GPA_DELTA_BOUNDS) ||
    value['proficiencyId'] !== WEEKLY_ACTION_PROFICIENCY_IDS[value['id']] ||
    !Array.isArray(value['attributeXp']) ||
    value['attributeXp'].length > WEEKLY_ACTION_ATTRIBUTE_TARGET_MAX
  ) {
    return false;
  }

  const seenTagIds = new Set<string>();
  for (let index = 0; index < value['tagIds'].length; index += 1) {
    if (
      !Object.hasOwn(value['tagIds'], index) ||
      !isWeeklyActionTagId(value['tagIds'][index]) ||
      seenTagIds.has(value['tagIds'][index] as string)
    ) {
      return false;
    }
    seenTagIds.add(value['tagIds'][index] as string);
  }

  if (
    value['attributeXp'].length === 0 &&
    value['bodyDelta'] === 0 &&
    value['gpaDelta'] === 0 &&
    value['proficiencyId'] === null
  ) {
    return false;
  }

  const seenAttributeIds = new Set<string>();
  for (const entry of value['attributeXp']) {
    if (
      !isRecord(entry) ||
      Object.keys(entry).length !== 2 ||
      !Object.hasOwn(entry, 'attributeId') ||
      !Object.hasOwn(entry, 'baseXp') ||
      !isPlayerAttributeId(entry['attributeId']) ||
      !isIntegerWithinBounds(entry['baseXp'], WEEKLY_ACTION_BASE_XP_BOUNDS) ||
      seenAttributeIds.has(entry['attributeId'])
    ) {
      return false;
    }
    seenAttributeIds.add(entry['attributeId']);
  }

  return true;
}

export function isWeeklyActionDefinitionCatalog(
  value: unknown,
): value is readonly WeeklyActionDefinition[] {
  if (!Array.isArray(value)) {
    return false;
  }
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const definition = value[index];
    if (
      !Object.hasOwn(value, index) ||
      !isWeeklyActionDefinition(definition) ||
      seen.has(definition.id)
    ) {
      return false;
    }
    seen.add(definition.id);
  }
  return true;
}
