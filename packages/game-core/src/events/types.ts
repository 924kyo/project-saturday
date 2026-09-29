import type { PlayerTagId } from '../player/ids.js';
import type { CareerRun } from '../player/types.js';
import type {
  EventCategoryId,
  EventChoiceId,
  EventCommandFailureReason,
  EventId,
  EventIntegerStateId,
  EventPredicateOperatorId,
  EventStatePredicateFieldId,
} from './ids.js';

export interface EventStatePredicate {
  readonly fieldId: EventStatePredicateFieldId;
  readonly operatorId: EventPredicateOperatorId;
  readonly value: number;
}

export interface EventRequirements {
  readonly allTagIds: readonly PlayerTagId[];
  readonly anyTagIds: readonly PlayerTagId[];
  readonly excludedTagIds: readonly PlayerTagId[];
  readonly statePredicates: readonly EventStatePredicate[];
}

export interface EventIntegerStateDeltaEffect {
  readonly type: 'event_integer_state_delta';
  readonly stateId: EventIntegerStateId;
  readonly delta: number;
}

export interface EventGpaDeltaEffect {
  readonly type: 'event_gpa_delta_milli';
  readonly deltaMilli: number;
}

export interface EventBreakthroughGaugeDeltaEffect {
  readonly type: 'event_breakthrough_gauge_delta';
  readonly points: number;
}

export type EventEffect =
  EventIntegerStateDeltaEffect | EventGpaDeltaEffect | EventBreakthroughGaugeDeltaEffect;

export interface EventChoiceMechanicsDefinition {
  readonly id: EventChoiceId;
  readonly effects: readonly EventEffect[];
}

export interface EventMechanicsDefinition {
  readonly id: EventId;
  readonly categoryIds: readonly EventCategoryId[];
  readonly weight: number;
  readonly cooldownWeeks: number;
  readonly requirements: EventRequirements;
  readonly choices: readonly EventChoiceMechanicsDefinition[];
}

export interface EventSelectionTuning {
  readonly eventChancePermille: number;
}

export interface WeeklyEventContext {
  readonly additionalTagIds: readonly PlayerTagId[];
}

export type WeeklyEventNoEventReason = 'NO_ELIGIBLE_EVENT' | 'DENSITY_ROLL';

export interface WeeklyEventSelectionEvidence {
  readonly model: 'event_selection_v1';
  readonly weekIndex: number;
  readonly contextTagIds: readonly PlayerTagId[];
  readonly eligibleEventIds: readonly EventId[];
  readonly outcome: 'NO_EVENT' | 'EVENT';
  readonly noEventReason: WeeklyEventNoEventReason | null;
  readonly densityRoll: number | null;
  readonly selectedEventId: EventId | null;
  readonly totalEligibleWeight: number;
  readonly selectionRoll: number | null;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface PendingEventEvidence {
  readonly eventId: EventId;
  readonly choiceIds: readonly EventChoiceId[];
  readonly selection: WeeklyEventSelectionEvidence;
}

export interface AppliedEventIntegerStateDelta {
  readonly type: 'event_integer_state_delta';
  readonly stateId: EventIntegerStateId;
  readonly before: number;
  readonly requestedDelta: number;
  readonly actualDelta: number;
  readonly after: number;
}

export interface AppliedEventGpaDelta {
  readonly type: 'event_gpa_delta_milli';
  readonly beforeMilli: number;
  readonly requestedDeltaMilli: number;
  readonly actualDeltaMilli: number;
  readonly afterMilli: number;
}

export interface AppliedEventBreakthroughGaugeDelta {
  readonly type: 'event_breakthrough_gauge_delta';
  readonly before: number;
  readonly requestedPoints: number;
  readonly actualPoints: number;
  readonly after: number;
}

export type AppliedEventEffect =
  AppliedEventIntegerStateDelta | AppliedEventGpaDelta | AppliedEventBreakthroughGaugeDelta;

export interface EventResolutionRecord {
  readonly eventId: EventId;
  readonly choiceId: EventChoiceId;
  readonly weekIndex: number;
  readonly appliedEffects: readonly AppliedEventEffect[];
  readonly selectionRngDrawCountBefore: number;
  readonly selectionRngDrawCountAfter: number;
}

export interface EventCooldownState {
  readonly eventId: EventId;
  readonly eligibleAfterWeekIndex: number;
}

export interface EventCareerState {
  readonly model: 'event_v1';
  readonly lastSelection: WeeklyEventSelectionEvidence | null;
  readonly history: readonly EventResolutionRecord[];
  readonly cooldowns: readonly EventCooldownState[];
}

export type EventCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: EventCommandFailureReason;
    };
