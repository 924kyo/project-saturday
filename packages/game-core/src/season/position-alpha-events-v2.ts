import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  positionAlphaSourceCareerWeekIndexV2,
  type PositionAlphaCalendarSourceV2,
} from './position-alpha-calendar-v2.js';
import type { PlayerState } from '../player/types.js';
import type { RngState } from '../random/rng.js';
import {
  selectQbEvent,
  getAvailableQbEventChoices,
  type QbEventContext,
  type QbEventSelectionEvidence,
} from '../games/qb-events.js';
import {
  selectRbEvent,
  getAvailableRbEventChoices,
  type RbEventContext,
} from '../games/rb-events.js';
import {
  selectCbEvent,
  getAvailableCbEventChoices,
  type CbEventContext,
} from '../games/cb-events.js';
import {
  POSITION_STAT_IDS,
  derivePositionEligibilityContext,
  type PositionStatLineV1,
} from './position-lifecycle.js';
import {
  resolvePositionAlphaEventChoiceResult,
  type PositionAlphaEventStateV1,
  type PositionAlphaGameContext,
  type PositionAlphaSessionV1,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaEventResolutionEvidence,
} from './position-alpha-session.js';
import type { PositionAlphaPreparationV2 } from './position-alpha-focus-v2.js';

export type PositionAlphaEventSourceV2 = PositionAlphaGameContext &
  PositionAlphaCalendarSourceV2 & {
    readonly events: PositionAlphaEventStateV1;
    readonly previousStats: PositionStatLineV1;
  };
export interface PositionAlphaEventWeekV2 {
  readonly model: 'position_alpha_event_week_v2';
  readonly context: Omit<QbEventContext, 'recentEvents'> & {
    readonly recentEvents: PositionAlphaEventStateV1['recentEvents'];
  };
  readonly selection:
    | QbEventSelectionEvidence
    | ReturnType<typeof selectRbEvent>['evidence']
    | ReturnType<typeof selectCbEvent>['evidence'];
  readonly choiceIds: readonly string[];
  readonly selectedChoiceId: string | null;
  readonly resolution: PositionAlphaEventResolutionEvidence | null;
  readonly afterState: PlayerState;
  readonly afterEvents: PositionAlphaEventStateV1;
  readonly rng: RngState;
}

export function previousPositionAlphaFootballStats(
  source: Pick<PositionAlphaSessionV1, 'player' | 'lifecycle'> & {
    readonly weekHistory: readonly { readonly stats: PositionStatLineV1 }[];
    readonly postseasonHistory?: readonly { readonly stats: PositionStatLineV1 }[];
  },
): PositionStatLineV1 {
  return (
    source.postseasonHistory?.at(-1)?.stats ??
    source.weekHistory.at(-1)?.stats ??
    source.lifecycle.completedSeasons.at(-1)?.stats ??
    ({
      model: 'position_stat_line_v1',
      positionId: source.player.positionId,
      entries: POSITION_STAT_IDS[source.player.positionId].map((statId) => ({ statId, value: 0 })),
    } as PositionStatLineV1)
  );
}

export function attemptPositionAlphaEventV2(
  source: PositionAlphaEventSourceV2,
  preparation: PositionAlphaPreparationV2,
  weekIndex: number,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaEventWeekV2 | null {
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(source, weekIndex);
  if (source.events.pending !== null || careerWeekIndex === null) return null;
  const state = preparation.player.state;
  const eligibility = derivePositionEligibilityContext(
    source.player.positionId,
    preparation.room.projection.roleId,
    state.brand,
    Math.round(state.gpa * 1000),
    source.previousStats,
    preparation.relationships.tracksAfter,
  );
  if (eligibility === null) return null;
  const context = {
    weekIndex: careerWeekIndex,
    body: state.body,
    preparation: state.preparation,
    confidence: state.confidence,
    coachTrust: state.coachTrust,
    gpaMilli: Math.round(state.gpa * 1000),
    brand: state.brand,
    contextTags: [...new Set([...source.player.tagIds, ...eligibility.tagIds])].sort(),
    recentEvents: source.events.recentEvents,
  };
  let selection: PositionAlphaEventWeekV2['selection'];
  let rng: RngState;
  let choiceIds: readonly string[] = [];
  const equipped = source.skills.equippedSkillIds;
  // Empty-pool selectors freeze their returned RNG. Do not let validation or an
  // attempted command freeze the caller's still-owned source object.
  const selectionRng = { ...source.careerRng };
  try {
    if (source.player.positionId === 'position_qb') {
      const result = selectQbEvent(
        context as QbEventContext,
        mechanics.qb.events,
        450,
        selectionRng,
      );
      selection = result.evidence;
      rng = result.rng;
      if (result.event !== undefined)
        choiceIds = getAvailableQbEventChoices(
          result.event,
          mechanics.qb.skills.filter(({ id }) => equipped.includes(id)),
        ).map(({ id }) => id);
    } else if (source.player.positionId === 'position_rb') {
      const result = selectRbEvent(
        context as RbEventContext,
        mechanics.rb.events,
        450,
        selectionRng,
      );
      selection = result.evidence;
      rng = result.rng;
      if (result.event !== undefined)
        choiceIds = getAvailableRbEventChoices(
          result.event,
          mechanics.rb.skills.filter(({ id }) => equipped.includes(id)),
        ).map(({ id }) => id);
    } else {
      const result = selectCbEvent(
        context as CbEventContext,
        mechanics.cb.events,
        450,
        selectionRng,
      );
      selection = result.evidence;
      rng = result.rng;
      if (result.event !== undefined)
        choiceIds = getAvailableCbEventChoices(
          result.event,
          mechanics.cb.skills.filter(({ id }) => equipped.includes(id)),
        ).map(({ id }) => id);
    }
  } catch {
    return null;
  }
  const selectedEventId = 'selectedEventId' in selection ? selection.selectedEventId : undefined;
  const pending =
    selectedEventId === undefined
      ? null
      : { eventId: selectedEventId, choiceIds, weekIndex: context.weekIndex };
  return deepFreeze(
    cloneSerializable({
      model: 'position_alpha_event_week_v2',
      context,
      selection,
      choiceIds,
      selectedChoiceId: null,
      resolution: null,
      afterState: state,
      afterEvents: { ...source.events, pending },
      rng,
    }),
  );
}

export function choosePositionAlphaWeeklyEventV2(
  source: PositionAlphaEventSourceV2,
  preparation: PositionAlphaPreparationV2,
  attempt: PositionAlphaEventWeekV2,
  choiceId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaEventWeekV2 | null {
  if (attempt.selectedChoiceId !== null || attempt.afterEvents.pending === null) return null;
  const result = resolvePositionAlphaEventChoiceResult(
    { ...source, ...preparation, events: attempt.afterEvents },
    choiceId,
    mechanics,
  );
  if (result === null || typeof choiceId !== 'string') return null;
  return deepFreeze(
    cloneSerializable({
      ...attempt,
      selectedChoiceId: choiceId,
      resolution: result.evidence,
      afterState: result.playerState,
      afterEvents: result.events,
    }),
  );
}

export function positionAlphaPreparationAfterEvent(
  preparation: PositionAlphaPreparationV2,
  event: PositionAlphaEventWeekV2,
): PositionAlphaPreparationV2 | null {
  if (event.afterEvents.pending !== null) return null;
  return {
    ...preparation,
    player: { ...preparation.player, state: event.afterState },
    room: { ...preparation.room, playerCoachTrust: event.afterState.coachTrust },
    training: {
      ...preparation.training,
      state: {
        body: event.afterState.body,
        preparation: event.afterState.preparation,
        confidence: event.afterState.confidence,
      },
    },
  };
}

export function replayPositionAlphaEventV2(
  source: PositionAlphaEventSourceV2,
  preparation: PositionAlphaPreparationV2,
  weekIndex: number,
  choiceId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaEventWeekV2 | null {
  const attempt = attemptPositionAlphaEventV2(source, preparation, weekIndex, mechanics);
  if (attempt === null || choiceId === null) return attempt;
  return choosePositionAlphaWeeklyEventV2(source, preparation, attempt, choiceId, mechanics);
}
