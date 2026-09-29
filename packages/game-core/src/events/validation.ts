import { isPlayerTagId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import { isEventChoiceId, isEventId, isEventIntegerStateId } from './ids.js';
import type {
  AppliedEventEffect,
  EventCareerState,
  PendingEventEvidence,
  WeeklyEventSelectionEvidence,
} from './types.js';

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: UnknownRecord, keys: readonly string[]): boolean {
  return (
    JSON.stringify(Object.keys(value).sort(compareCodeUnits)) ===
    JSON.stringify([...keys].sort(compareCodeUnits))
  );
}

function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

export function isWeeklyEventSelectionEvidence(
  value: unknown,
): value is WeeklyEventSelectionEvidence {
  if (
    !isRecord(value) ||
    !exact(value, [
      'model',
      'weekIndex',
      'contextTagIds',
      'eligibleEventIds',
      'outcome',
      'noEventReason',
      'densityRoll',
      'selectedEventId',
      'totalEligibleWeight',
      'selectionRoll',
      'rngDrawCountBefore',
      'rngDrawCountAfter',
    ]) ||
    value['model'] !== 'event_selection_v1' ||
    !integer(value['weekIndex']) ||
    !Array.isArray(value['contextTagIds']) ||
    !value['contextTagIds'].every(isPlayerTagId) ||
    new Set(value['contextTagIds']).size !== value['contextTagIds'].length ||
    value['contextTagIds'].some(
      (tagId, index, tags) => index > 0 && compareCodeUnits(tags[index - 1]!, tagId) >= 0,
    ) ||
    !Array.isArray(value['eligibleEventIds']) ||
    !value['eligibleEventIds'].every(isEventId) ||
    new Set(value['eligibleEventIds']).size !== value['eligibleEventIds'].length ||
    value['eligibleEventIds'].some(
      (eventId, index, eventIds) =>
        index > 0 && compareCodeUnits(eventIds[index - 1]!, eventId) >= 0,
    ) ||
    !integer(value['totalEligibleWeight'], 0, Number.MAX_SAFE_INTEGER) ||
    !integer(value['rngDrawCountBefore']) ||
    !integer(value['rngDrawCountAfter']) ||
    value['rngDrawCountAfter'] < value['rngDrawCountBefore']
  ) {
    return false;
  }
  if (value['outcome'] === 'NO_EVENT') {
    return (
      (value['noEventReason'] === 'NO_ELIGIBLE_EVENT' ||
        value['noEventReason'] === 'DENSITY_ROLL') &&
      value['selectedEventId'] === null &&
      value['selectionRoll'] === null &&
      (value['densityRoll'] === null || integer(value['densityRoll'], 0, 999)) &&
      (value['noEventReason'] === 'NO_ELIGIBLE_EVENT'
        ? value['eligibleEventIds'].length === 0 &&
          value['densityRoll'] === null &&
          value['rngDrawCountAfter'] === value['rngDrawCountBefore']
        : value['eligibleEventIds'].length > 0 &&
          value['densityRoll'] !== null &&
          value['rngDrawCountAfter'] > value['rngDrawCountBefore'])
    );
  }
  return (
    value['outcome'] === 'EVENT' &&
    value['noEventReason'] === null &&
    integer(value['densityRoll'], 0, 999) &&
    isEventId(value['selectedEventId']) &&
    value['eligibleEventIds'].includes(value['selectedEventId']) &&
    integer(value['selectionRoll'], 0, Math.max(0, value['totalEligibleWeight'] - 1)) &&
    value['totalEligibleWeight'] > 0 &&
    value['rngDrawCountAfter'] > value['rngDrawCountBefore']
  );
}

export function isPendingEventEvidence(value: unknown): value is PendingEventEvidence {
  return (
    isRecord(value) &&
    exact(value, ['eventId', 'choiceIds', 'selection']) &&
    isEventId(value['eventId']) &&
    Array.isArray(value['choiceIds']) &&
    value['choiceIds'].length >= 2 &&
    value['choiceIds'].length <= 3 &&
    value['choiceIds'].every(isEventChoiceId) &&
    new Set(value['choiceIds']).size === value['choiceIds'].length &&
    isWeeklyEventSelectionEvidence(value['selection']) &&
    value['selection'].outcome === 'EVENT' &&
    value['selection'].selectedEventId === value['eventId']
  );
}

function isAppliedEffect(value: unknown): value is AppliedEventEffect {
  if (!isRecord(value)) return false;
  if (value['type'] === 'event_integer_state_delta') {
    return (
      exact(value, ['type', 'stateId', 'before', 'requestedDelta', 'actualDelta', 'after']) &&
      isEventIntegerStateId(value['stateId']) &&
      integer(value['before'], 0, 100) &&
      integer(value['requestedDelta'], -20, 20) &&
      integer(value['actualDelta'], -20, 20) &&
      integer(value['after'], 0, 100) &&
      value['after'] - value['before'] === value['actualDelta']
    );
  }
  if (value['type'] === 'event_gpa_delta_milli') {
    return (
      exact(value, [
        'type',
        'beforeMilli',
        'requestedDeltaMilli',
        'actualDeltaMilli',
        'afterMilli',
      ]) &&
      integer(value['beforeMilli'], 0, 4_000) &&
      integer(value['requestedDeltaMilli'], -500, 500) &&
      integer(value['actualDeltaMilli'], -500, 500) &&
      integer(value['afterMilli'], 0, 4_000) &&
      value['afterMilli'] - value['beforeMilli'] === value['actualDeltaMilli']
    );
  }
  return (
    value['type'] === 'event_breakthrough_gauge_delta' &&
    exact(value, ['type', 'before', 'requestedPoints', 'actualPoints', 'after']) &&
    integer(value['before'], 0, 99) &&
    integer(value['requestedPoints'], -30, 30) &&
    integer(value['actualPoints'], -30, 30) &&
    integer(value['after'], 0, 99) &&
    value['after'] - value['before'] === value['actualPoints']
  );
}

export function isEventCareerState(
  value: unknown,
  currentWeekIndex: number,
  currentRngDrawCount: number,
): value is EventCareerState {
  if (
    !isRecord(value) ||
    !exact(value, ['model', 'lastSelection', 'history', 'cooldowns']) ||
    value['model'] !== 'event_v1' ||
    (value['lastSelection'] !== null && !isWeeklyEventSelectionEvidence(value['lastSelection'])) ||
    !Array.isArray(value['history']) ||
    !Array.isArray(value['cooldowns'])
  ) {
    return false;
  }
  if (
    value['lastSelection'] !== null &&
    (value['lastSelection'].weekIndex > currentWeekIndex ||
      value['lastSelection'].rngDrawCountAfter > currentRngDrawCount)
  ) {
    return false;
  }
  let previousHistoryWeek = -1;
  for (const record of value['history']) {
    if (
      !isRecord(record) ||
      !exact(record, [
        'eventId',
        'choiceId',
        'weekIndex',
        'appliedEffects',
        'selectionRngDrawCountBefore',
        'selectionRngDrawCountAfter',
      ]) ||
      !isEventId(record['eventId']) ||
      !isEventChoiceId(record['choiceId']) ||
      !integer(record['weekIndex']) ||
      record['weekIndex'] < previousHistoryWeek ||
      record['weekIndex'] > currentWeekIndex ||
      !Array.isArray(record['appliedEffects']) ||
      record['appliedEffects'].length < 1 ||
      record['appliedEffects'].length > 3 ||
      !record['appliedEffects'].every(isAppliedEffect) ||
      !integer(record['selectionRngDrawCountBefore']) ||
      !integer(record['selectionRngDrawCountAfter']) ||
      record['selectionRngDrawCountAfter'] < record['selectionRngDrawCountBefore'] ||
      record['selectionRngDrawCountAfter'] > currentRngDrawCount
    ) {
      return false;
    }
    previousHistoryWeek = record['weekIndex'];
  }
  let previousEventId: string | undefined;
  for (const cooldown of value['cooldowns']) {
    if (
      !isRecord(cooldown) ||
      !exact(cooldown, ['eventId', 'eligibleAfterWeekIndex']) ||
      !isEventId(cooldown['eventId']) ||
      !integer(cooldown['eligibleAfterWeekIndex']) ||
      (previousEventId !== undefined && compareCodeUnits(previousEventId, cooldown['eventId']) >= 0)
    ) {
      return false;
    }
    previousEventId = cooldown['eventId'];
  }
  return true;
}

export function createEmptyEventCareerState(): EventCareerState {
  return Object.freeze({ model: 'event_v1', lastSelection: null, history: [], cooldowns: [] });
}
