import {
  BODY_BOUNDS,
  BRAND_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  PREPARATION_BOUNDS,
  type NumericBounds,
} from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { isPlayerTagId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import type { CareerRun } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import { nextInt, restoreRngState } from '../random/rng.js';
import { WEEKLY_EXPERIENCE_VERSION_CURRENT, type WeekEndPhaseV4 } from '../weekly/types.js';
import { isEventMechanicsDefinitionCatalog, isEventSelectionTuning } from './definitions.js';
import type { EventChoiceId, EventCommandFailureReason, EventIntegerStateId } from './ids.js';
import { isEventChoiceId } from './ids.js';
import type {
  AppliedEventEffect,
  EventCareerState,
  EventCommandResult,
  EventEffect,
  EventMechanicsDefinition,
  EventSelectionTuning,
  EventStatePredicate,
  WeeklyEventContext,
  WeeklyEventSelectionEvidence,
} from './types.js';

type DeepMutable<T> = T extends readonly unknown[]
  ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

function failure(career: CareerRun, reason: EventCommandFailureReason): EventCommandResult {
  return deepFreeze({ ok: false as const, career, reason });
}

function success(previous: CareerRun, career: CareerRun): EventCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(previous, 'event.internal_invariant_failure');
  }
  return deepFreeze({ ok: true, career });
}

function validContext(context: WeeklyEventContext): boolean {
  return (
    typeof context === 'object' &&
    context !== null &&
    !Array.isArray(context) &&
    Object.keys(context).length === 1 &&
    Object.hasOwn(context, 'additionalTagIds') &&
    Array.isArray(context.additionalTagIds) &&
    context.additionalTagIds.length <= 32 &&
    context.additionalTagIds.every(isPlayerTagId) &&
    new Set(context.additionalTagIds).size === context.additionalTagIds.length
  );
}

function activeEventState(career: CareerRun): EventCareerState | null {
  return career.seasonCareerState.bootstrapStatus === 'ACTIVE'
    ? career.seasonCareerState.eventState
    : null;
}

function playerDepthRank(career: CareerRun): number {
  return (
    career.programContext?.evaluations.find(
      (evaluation) => evaluation.participantId === career.player.id,
    )?.rank ?? 8
  );
}

function predicateValue(career: CareerRun, predicate: EventStatePredicate): number {
  switch (predicate.fieldId) {
    case 'event_state_body':
      return career.player.state.body;
    case 'event_state_preparation':
      return career.player.state.preparation;
    case 'event_state_confidence':
      return career.player.state.confidence;
    case 'event_state_coach_trust':
      return career.player.state.coachTrust;
    case 'event_state_brand':
      return career.player.state.brand;
    case 'event_state_gpa_milli':
      return Math.round(career.player.state.gpa * 1_000);
    case 'event_state_depth_rank':
      return playerDepthRank(career);
    case 'event_state_week_index':
      return career.weekIndex;
  }
}

function predicateMatches(career: CareerRun, predicate: EventStatePredicate): boolean {
  const actual = predicateValue(career, predicate);
  switch (predicate.operatorId) {
    case 'event_predicate_eq':
      return actual === predicate.value;
    case 'event_predicate_gte':
      return actual >= predicate.value;
    case 'event_predicate_lte':
      return actual <= predicate.value;
  }
}

function isEligible(
  career: CareerRun,
  event: EventMechanicsDefinition,
  tags: ReadonlySet<string>,
  eventState: EventCareerState,
): boolean {
  const requirements = event.requirements;
  const cooldown = eventState.cooldowns.find(({ eventId }) => eventId === event.id);
  return (
    (cooldown === undefined || career.weekIndex >= cooldown.eligibleAfterWeekIndex) &&
    requirements.allTagIds.every((tagId) => tags.has(tagId)) &&
    (requirements.anyTagIds.length === 0 ||
      requirements.anyTagIds.some((tagId) => tags.has(tagId))) &&
    requirements.excludedTagIds.every((tagId) => !tags.has(tagId)) &&
    requirements.statePredicates.every((predicate) => predicateMatches(career, predicate))
  );
}

function selectionEvidence(
  input: Omit<WeeklyEventSelectionEvidence, 'model' | 'weekIndex'> & {
    readonly weekIndex: number;
  },
): WeeklyEventSelectionEvidence {
  return {
    model: 'event_selection_v1',
    ...input,
  };
}

export function selectWeeklyEvent(
  career: CareerRun,
  context: WeeklyEventContext,
  definitions: readonly EventMechanicsDefinition[],
  tuning: EventSelectionTuning,
): EventCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'event.invalid_career');
  if (!validContext(context)) return failure(career, 'event.invalid_context');
  if (!isEventMechanicsDefinitionCatalog(definitions)) {
    return failure(career, 'event.invalid_definitions');
  }
  if (!isEventSelectionTuning(tuning)) return failure(career, 'event.invalid_tuning');
  const eventState = activeEventState(career);
  if (
    eventState === null ||
    career.phase.type !== 'WEEK_END' ||
    career.weeklyExperienceVersion !== WEEKLY_EXPERIENCE_VERSION_CURRENT ||
    eventState.lastSelection?.weekIndex === career.weekIndex
  ) {
    return failure(career, 'event.invalid_phase');
  }
  if (career.revision === Number.MAX_SAFE_INTEGER) {
    return failure(career, 'event.revision_exhausted');
  }
  if (career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
    return failure(career, 'event.internal_invariant_failure');
  }
  const activeSeasonCareerState = career.seasonCareerState;

  const contextTagIds = [...new Set([...career.player.tagIds, ...context.additionalTagIds])].sort(
    compareCodeUnits,
  );
  const contextTags = new Set<string>(contextTagIds);
  const eligible = [...definitions]
    .filter((event) => isEligible(career, event, contextTags, eventState))
    .sort((left, right) => compareCodeUnits(left.id, right.id));
  const rngDrawCountBefore = career.rng.drawCount;
  if (eligible.length === 0) {
    const selection = selectionEvidence({
      weekIndex: career.weekIndex,
      contextTagIds,
      eligibleEventIds: [],
      outcome: 'NO_EVENT',
      noEventReason: 'NO_ELIGIBLE_EVENT',
      densityRoll: null,
      selectedEventId: null,
      totalEligibleWeight: 0,
      selectionRoll: null,
      rngDrawCountBefore,
      rngDrawCountAfter: rngDrawCountBefore,
    });
    return success(career, {
      ...cloneSerializable(career),
      revision: career.revision + 1,
      seasonCareerState: {
        ...cloneSerializable(activeSeasonCareerState),
        eventState: {
          ...cloneSerializable(eventState),
          lastSelection: selection,
        },
      },
    });
  }

  try {
    const densitySample = nextInt(restoreRngState(career.rng), 0, 1_000);
    const totalEligibleWeight = eligible.reduce((sum, event) => sum + event.weight, 0);
    if (densitySample.value >= tuning.eventChancePermille) {
      const selection = selectionEvidence({
        weekIndex: career.weekIndex,
        contextTagIds,
        eligibleEventIds: eligible.map(({ id }) => id),
        outcome: 'NO_EVENT',
        noEventReason: 'DENSITY_ROLL',
        densityRoll: densitySample.value,
        selectedEventId: null,
        totalEligibleWeight,
        selectionRoll: null,
        rngDrawCountBefore,
        rngDrawCountAfter: densitySample.nextRng.drawCount,
      });
      return success(career, {
        ...cloneSerializable(career),
        rng: densitySample.nextRng,
        revision: career.revision + 1,
        seasonCareerState: {
          ...cloneSerializable(activeSeasonCareerState),
          eventState: {
            ...cloneSerializable(eventState),
            lastSelection: selection,
          },
        },
      });
    }
    const weightedSample = nextInt(densitySample.nextRng, 0, totalEligibleWeight);
    let cursor = weightedSample.value;
    const selected = eligible.find((event) => {
      cursor -= event.weight;
      return cursor < 0;
    });
    if (selected === undefined) return failure(career, 'event.internal_invariant_failure');
    const selection = selectionEvidence({
      weekIndex: career.weekIndex,
      contextTagIds,
      eligibleEventIds: eligible.map(({ id }) => id),
      outcome: 'EVENT',
      noEventReason: null,
      densityRoll: densitySample.value,
      selectedEventId: selected.id,
      totalEligibleWeight,
      selectionRoll: weightedSample.value,
      rngDrawCountBefore,
      rngDrawCountAfter: weightedSample.nextRng.drawCount,
    });
    const completedWeek = cloneSerializable(career.phase) as WeekEndPhaseV4;
    return success(career, {
      ...cloneSerializable(career),
      rng: weightedSample.nextRng,
      revision: career.revision + 1,
      phase: {
        type: 'EVENT_CHOICE',
        pendingEvent: {
          eventId: selected.id,
          choiceIds: [...selected.choices]
            .sort((left, right) => compareCodeUnits(left.id, right.id))
            .map(({ id }) => id),
          selection,
        },
        completedWeek,
      },
      seasonCareerState: {
        ...cloneSerializable(activeSeasonCareerState),
        eventState: {
          ...cloneSerializable(eventState),
          lastSelection: selection,
        },
      },
    });
  } catch {
    return failure(career, 'event.rng_exhausted');
  }
}

function clamp(value: number, bounds: NumericBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

function stateBounds(stateId: EventIntegerStateId): NumericBounds {
  switch (stateId) {
    case 'event_state_body':
      return BODY_BOUNDS;
    case 'event_state_preparation':
      return PREPARATION_BOUNDS;
    case 'event_state_confidence':
      return CONFIDENCE_BOUNDS;
    case 'event_state_coach_trust':
      return COACH_TRUST_BOUNDS;
    case 'event_state_brand':
      return BRAND_BOUNDS;
  }
}

function playerStateKey(stateId: EventIntegerStateId) {
  switch (stateId) {
    case 'event_state_body':
      return 'body' as const;
    case 'event_state_preparation':
      return 'preparation' as const;
    case 'event_state_confidence':
      return 'confidence' as const;
    case 'event_state_coach_trust':
      return 'coachTrust' as const;
    case 'event_state_brand':
      return 'brand' as const;
  }
}

function applyEffect(career: DeepMutable<CareerRun>, effect: EventEffect): AppliedEventEffect {
  if (effect.type === 'event_integer_state_delta') {
    const key = playerStateKey(effect.stateId);
    const before = career.player.state[key];
    const after = clamp(before + effect.delta, stateBounds(effect.stateId));
    career.player.state[key] = after;
    return {
      type: effect.type,
      stateId: effect.stateId,
      before,
      requestedDelta: effect.delta,
      actualDelta: after - before,
      after,
    };
  }
  if (effect.type === 'event_gpa_delta_milli') {
    const beforeMilli = Math.round(career.player.state.gpa * 1_000);
    const afterMilli = clamp(beforeMilli + effect.deltaMilli, {
      min: GPA_BOUNDS.min * 1_000,
      max: GPA_BOUNDS.max * 1_000,
    });
    career.player.state.gpa = afterMilli / 1_000;
    return {
      type: effect.type,
      beforeMilli,
      requestedDeltaMilli: effect.deltaMilli,
      actualDeltaMilli: afterMilli - beforeMilli,
      afterMilli,
    };
  }
  const gauge = career.player.skillState.breakthroughGauge;
  const before = gauge.progress;
  const after = clamp(before + effect.points, { min: 0, max: gauge.threshold - 1 });
  gauge.progress = after;
  return {
    type: effect.type,
    before,
    requestedPoints: effect.points,
    actualPoints: after - before,
    after,
  };
}

export function resolveEventChoice(
  career: CareerRun,
  choiceId: EventChoiceId,
  definitions: readonly EventMechanicsDefinition[],
): EventCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'event.invalid_career');
  if (!isEventMechanicsDefinitionCatalog(definitions)) {
    return failure(career, 'event.invalid_definitions');
  }
  if (!isEventChoiceId(choiceId)) return failure(career, 'event.invalid_choice');
  const eventState = activeEventState(career);
  if (eventState === null || career.phase.type !== 'EVENT_CHOICE') {
    return failure(career, 'event.invalid_phase');
  }
  if (career.revision === Number.MAX_SAFE_INTEGER) {
    return failure(career, 'event.revision_exhausted');
  }
  const pending = career.phase.pendingEvent;
  const definition = definitions.find(({ id }) => id === pending.eventId);
  const expectedChoiceIds =
    definition === undefined
      ? []
      : [...definition.choices]
          .sort((left, right) => compareCodeUnits(left.id, right.id))
          .map(({ id }) => id);
  if (
    definition === undefined ||
    JSON.stringify(expectedChoiceIds) !== JSON.stringify(pending.choiceIds)
  ) {
    return failure(career, 'event.invalid_definitions');
  }
  const choice = definition.choices.find(({ id }) => id === choiceId);
  if (choice === undefined || !pending.choiceIds.includes(choiceId)) {
    return failure(career, 'event.invalid_choice');
  }
  const nextCareer = cloneSerializable(career) as DeepMutable<CareerRun>;
  if (
    nextCareer.phase.type !== 'EVENT_CHOICE' ||
    nextCareer.seasonCareerState.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(career, 'event.internal_invariant_failure');
  }
  const completedWeek = nextCareer.phase.completedWeek;
  const appliedEffects = choice.effects.map((effect) => applyEffect(nextCareer, effect));
  const record = {
    eventId: definition.id,
    choiceId,
    weekIndex: career.weekIndex,
    appliedEffects,
    selectionRngDrawCountBefore: pending.selection.rngDrawCountBefore,
    selectionRngDrawCountAfter: pending.selection.rngDrawCountAfter,
  } as const;
  const cooldowns = [
    ...nextCareer.seasonCareerState.eventState.cooldowns.filter(
      ({ eventId }) => eventId !== definition.id,
    ),
    {
      eventId: definition.id,
      eligibleAfterWeekIndex: career.weekIndex + definition.cooldownWeeks + 1,
    },
  ].sort((left, right) => compareCodeUnits(left.eventId, right.eventId));
  nextCareer.phase = completedWeek;
  nextCareer.revision += 1;
  nextCareer.seasonCareerState.eventState = {
    ...nextCareer.seasonCareerState.eventState,
    history: [...nextCareer.seasonCareerState.eventState.history, record],
    cooldowns,
  };
  return success(career, nextCareer);
}
