import { relationshipTagsVNext } from './nil.js';
import { programAlumniVNext, VNEXT_LEGACY_TUNING } from './legacy.js';
import type { EventMechanicsDefinition, EventStatePredicate } from '../events/types.js';
import type { InjuryChoiceId } from '../injuries/ids.js';
import {
  advanceInjuryDuration,
  deriveInjuryChoiceAvailability,
  sampleInjuryOutcome,
} from '../injuries/resolution.js';
import type { InjuryAvailabilityEvidence, NewInjuryEvidence } from '../injuries/types.js';
import { cloneSerializable } from '../player/immutable.js';
import type { PlayerState } from '../player/types.js';
import { createRng, nextUint32, type RngState } from '../random/rng.js';
import { selectCbEvent, getAvailableCbEventChoices } from '../games/cb-events.js';
import {
  getAvailableDefenderEventChoices,
  resolveDefenderEventChoice,
  selectDefenderEvent,
} from '../games/defender-events.js';
import { selectQbEvent, getAvailableQbEventChoices } from '../games/qb-events.js';
import { selectRbEvent, getAvailableRbEventChoices } from '../games/rb-events.js';
import { resolvePositionAlphaEventChoiceResult } from '../season/position-alpha-session.js';
import { derivePositionInjuryExposure } from '../season/position-lifecycle.js';
import { isPositionFocusAvailable, type PositionFocusId } from '../weekly/position-focus.js';
import { hasLifeHookVNext, injuryRiskMultiplierVNext } from './build.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  ConditionVNext,
  EventEffectsVNext,
  GameModifiersVNext,
  WeeklyEventVNext,
} from './types.js';

/**
 * Weekly lifecycle rules between practice and kickoff: one optional off-field event, then the
 * pregame injury check. Each draws from its own named stream, so neither perturbs the career RNG
 * or the other, and a week replays identically from the same save.
 */
export const VNEXT_EVENT_CHANCE_PERMILLE = 450;
/** Cooldowns and injury dates use a monotonic career week, not the season-local index. */
export const VNEXT_CAREER_WEEK_STRIDE = 16;
const RECENT_EVENT_MEMORY = 8;
const GAUGE_MAXIMUM = 160;

export const NEUTRAL_GAME_MODIFIERS: GameModifiersVNext = Object.freeze({
  clueBonus: 0,
  decisionScoreFlat: 0,
  exposureReductionPermille: 0,
});

export function createConditionVNext(): ConditionVNext {
  return {
    injury: null,
    injuryHistory: [],
    availability: null,
    recentEvents: [],
    eventHistory: [],
    nextGameModifiers: NEUTRAL_GAME_MODIFIERS,
  };
}

export function careerWeekIndexVNext(career: Pick<CareerVNext, 'season'>): number {
  return career.season.index * VNEXT_CAREER_WEEK_STRIDE + career.season.weekIndex;
}

function weekStream(
  career: CareerVNext,
  purpose: 'event' | 'injury' | 'life' | 'mentor',
): RngState {
  return createRng(
    `${String(career.seed)}:vnext:${purpose}:${career.season.index}:${career.season.weekIndex}`,
  );
}

function equipped(career: CareerVNext) {
  return career.build.equippedSkillIds.filter((id) => id !== null);
}

/** Focus workload policy under the current injury (rest-only while out, no heavy load while limited). */
export function isFocusAvailableVNext(
  career: CareerVNext,
  focusId: string,
  mechanics: CareerVNextMechanics,
): boolean {
  return isPositionFocusAvailable(
    focusId as PositionFocusId,
    career.condition.injury,
    mechanics.focusInjuryPolicies,
  );
}

// WR: the shipped weekly-event catalog with the same eligibility semantics as the WR career.
function wrPredicateValue(career: CareerVNext, predicate: EventStatePredicate): number {
  const state = career.athlete.profile.state;
  switch (predicate.fieldId) {
    case 'event_state_body':
      return state.body;
    case 'event_state_preparation':
      return state.preparation;
    case 'event_state_confidence':
      return state.confidence;
    case 'event_state_coach_trust':
      return state.coachTrust;
    case 'event_state_brand':
      return state.brand;
    case 'event_state_gpa_milli':
      return Math.round(state.gpa * 1_000);
    case 'event_state_depth_rank':
      return career.program?.room.projection.rank ?? 8;
    case 'event_state_week_index':
      return career.season.weekIndex;
  }
}

function wrEligible(
  career: CareerVNext,
  event: EventMechanicsDefinition,
  tags: ReadonlySet<string>,
) {
  const week = careerWeekIndexVNext(career);
  const last = career.condition.recentEvents
    .filter(({ eventId }) => eventId === event.id)
    .reduce((latest, entry) => Math.max(latest, entry.weekIndex), -Infinity);
  const { allTagIds, anyTagIds, excludedTagIds, statePredicates } = event.requirements;
  return (
    week - last > event.cooldownWeeks &&
    allTagIds.every((tag) => tags.has(tag)) &&
    (anyTagIds.length === 0 || anyTagIds.some((tag) => tags.has(tag))) &&
    excludedTagIds.every((tag) => !tags.has(tag)) &&
    statePredicates.every((predicate) => {
      const actual = wrPredicateValue(career, predicate);
      return predicate.operatorId === 'event_predicate_eq'
        ? actual === predicate.value
        : predicate.operatorId === 'event_predicate_gte'
          ? actual >= predicate.value
          : actual <= predicate.value;
    })
  );
}

function mappedDraw(rng: RngState, maximumExclusive: number) {
  const sample = nextUint32(rng);
  return {
    value: Math.floor((sample.value * maximumExclusive) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function selectWrEvent(
  career: CareerVNext,
  catalog: readonly EventMechanicsDefinition[],
  optionAccess: boolean,
): EventMechanicsDefinition | null {
  const tags = new Set<string>([
    ...career.athlete.profile.tagIds,
    ...relationshipTagsVNext(career),
    'tag_season_regular',
    ...(optionAccess ? ['tag_skill_event_option_access'] : []),
  ]);
  const eligible = catalog
    .filter((event) => wrEligible(career, event, tags))
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  if (eligible.length === 0) return null;
  const chance = mappedDraw(weekStream(career, 'event'), 1_000);
  if (chance.value >= VNEXT_EVENT_CHANCE_PERMILLE) return null;
  const total = eligible.reduce((sum, event) => sum + event.weight, 0);
  let cursor = mappedDraw(chance.rng, total).value;
  for (const event of eligible) {
    cursor -= event.weight;
    if (cursor < 0) return event;
  }
  return eligible[eligible.length - 1]!;
}

/** Chance a campus-life event fills a week without a position event. */
export const VNEXT_LIFE_EVENT_CHANCE_PERMILLE = 250;

function eventContextVNext(career: CareerVNext, weekIndex: number) {
  const state = career.athlete.profile.state;
  return {
    weekIndex,
    body: state.body,
    preparation: state.preparation,
    confidence: state.confidence,
    coachTrust: state.coachTrust,
    gpaMilli: Math.round(state.gpa * 1_000),
    brand: state.brand,
    recentEvents: career.condition.recentEvents,
  };
}

/**
 * Draws this week's event, or null for a quiet week: the position's own catalog first, then the
 * shared campus-life catalog on its own stream. Pure: same save, same answer.
 */
export function attemptWeeklyEventVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): WeeklyEventVNext | null {
  const positionEvent = attemptPositionEventVNext(career, mechanics);
  if (positionEvent !== null) return positionEvent;
  const weekIndex = careerWeekIndexVNext(career);
  const mentor = attemptMentorVNext(career, mechanics, weekIndex);
  if (mentor !== null) return mentor;
  const selected = selectDefenderEvent(
    eventContextVNext(career, weekIndex),
    mechanics.life.events,
    VNEXT_LIFE_EVENT_CHANCE_PERMILLE,
    weekStream(career, 'life'),
  );
  if (selected.event === undefined) return null;
  return {
    weekIndex,
    eventId: selected.event.id,
    choiceIds: getAvailableDefenderEventChoices(selected.event, []).map(({ id }) => id),
    chosenChoiceId: null,
    effects: null,
  };
}

/**
 * The legacy mentor scene: an alumnus of the current program checks in, on its own stream, at most
 * once per cooldown. Only the career's saved snapshot is read.
 */
function attemptMentorVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  weekIndex: number,
): WeeklyEventVNext | null {
  const programId = career.program?.programId;
  if (programId === undefined) return null;
  const mentors = programAlumniVNext(career, programId);
  const definition = mechanics.legacyEvents.mentor;
  const recent = career.condition.recentEvents.some(
    ({ eventId, weekIndex: week }) =>
      eventId === definition.id && weekIndex - week <= VNEXT_LEGACY_TUNING.mentorCooldownWeeks,
  );
  if (mentors.length === 0 || recent) return null;
  const roll = nextUint32(weekStream(career, 'mentor'));
  if (roll.value % 1_000 >= VNEXT_LEGACY_TUNING.mentorChancePermille) return null;
  const mentor = mentors[nextUint32(roll.nextRng).value % mentors.length]!;
  return {
    weekIndex,
    eventId: definition.id,
    choiceIds: getAvailableDefenderEventChoices(definition, []).map(({ id }) => id),
    chosenChoiceId: null,
    effects: null,
    mentorCareerId: mentor.careerId,
  };
}

function attemptPositionEventVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): WeeklyEventVNext | null {
  const profile = career.athlete.profile;
  const weekIndex = careerWeekIndexVNext(career);
  const pending = (eventId: string, choiceIds: readonly string[]): WeeklyEventVNext => ({
    weekIndex,
    eventId,
    choiceIds,
    chosenChoiceId: null,
    effects: null,
  });
  if (profile.positionId === 'position_wr') {
    const event = selectWrEvent(
      career,
      mechanics.wr.events,
      hasLifeHookVNext(career, mechanics, 'life_hook_event_option_access'),
    );
    return event === null
      ? null
      : pending(
          event.id,
          event.choices.map(({ id }) => id),
        );
  }
  const state = profile.state;
  if (profile.positionId === 'position_lb' || profile.positionId === 'position_edge') {
    const catalog = mechanics.defenders[profile.positionId];
    const selected = selectDefenderEvent(
      {
        weekIndex,
        body: state.body,
        preparation: state.preparation,
        confidence: state.confidence,
        coachTrust: state.coachTrust,
        gpaMilli: Math.round(state.gpa * 1_000),
        brand: state.brand,
        recentEvents: career.condition.recentEvents,
      },
      catalog.events,
      VNEXT_EVENT_CHANCE_PERMILLE,
      weekStream(career, 'event'),
    );
    if (selected.event === undefined) return null;
    const owned = catalog.skills.filter(({ id }) => equipped(career).includes(id));
    return pending(
      selected.event.id,
      getAvailableDefenderEventChoices(selected.event, owned).map(({ id }) => id),
    );
  }
  const context = {
    weekIndex,
    body: state.body,
    preparation: state.preparation,
    confidence: state.confidence,
    coachTrust: state.coachTrust,
    gpaMilli: Math.round(state.gpa * 1_000),
    brand: state.brand,
    contextTags: [...profile.tagIds, ...relationshipTagsVNext(career)].sort(),
    recentEvents: career.condition.recentEvents as never,
  };
  const rng = weekStream(career, 'event');
  const skills = equipped(career);
  try {
    if (profile.positionId === 'position_qb') {
      const result = selectQbEvent(context, mechanics.qb.events, VNEXT_EVENT_CHANCE_PERMILLE, rng);
      if (result.event === undefined) return null;
      const owned = mechanics.qb.skills.filter(({ id }) => skills.includes(id));
      return pending(
        result.event.id,
        getAvailableQbEventChoices(result.event, owned).map(({ id }) => id),
      );
    }
    if (profile.positionId === 'position_rb') {
      const result = selectRbEvent(context, mechanics.rb.events, VNEXT_EVENT_CHANCE_PERMILLE, rng);
      if (result.event === undefined) return null;
      const owned = mechanics.rb.skills.filter(({ id }) => skills.includes(id));
      return pending(
        result.event.id,
        getAvailableRbEventChoices(result.event, owned).map(({ id }) => id),
      );
    }
    const result = selectCbEvent(context, mechanics.cb.events, VNEXT_EVENT_CHANCE_PERMILLE, rng);
    if (result.event === undefined) return null;
    const owned = mechanics.cb.skills.filter(({ id }) => skills.includes(id));
    return pending(
      result.event.id,
      getAvailableCbEventChoices(result.event, owned).map(({ id }) => id),
    );
  } catch {
    return null;
  }
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function effectsBetween(
  before: PlayerState,
  after: PlayerState,
  gauge: number,
  modifiers: GameModifiersVNext,
): EventEffectsVNext {
  return {
    body: after.body - before.body,
    preparation: after.preparation - before.preparation,
    confidence: after.confidence - before.confidence,
    coachTrust: after.coachTrust - before.coachTrust,
    brand: after.brand - before.brand,
    gpaMilli: Math.round(after.gpa * 1_000) - Math.round(before.gpa * 1_000),
    gauge,
    modifiers,
  };
}

export interface ResolvedEventChoiceVNext {
  readonly state: PlayerState;
  readonly gaugeAfter: number;
  readonly event: WeeklyEventVNext;
  readonly modifiers: GameModifiersVNext;
}

/** Applies a pending event choice through the owning position's event rules. */
export function resolveWeeklyEventChoiceVNext(
  career: CareerVNext,
  event: WeeklyEventVNext,
  choiceId: string,
  mechanics: CareerVNextMechanics,
): ResolvedEventChoiceVNext | null {
  if (event.chosenChoiceId !== null || !event.choiceIds.includes(choiceId)) return null;
  const profile = career.athlete.profile;
  const before = profile.state;
  const gaugeBefore = career.athlete.breakthroughGauge;
  if (event.eventId.startsWith('event_life_') || event.eventId.startsWith('event_legacy_')) {
    const definition = [...mechanics.life.events, mechanics.legacyEvents.mentor].find(
      ({ id }) => id === event.eventId,
    );
    if (definition === undefined) return null;
    const resolved = resolveDefenderEventChoice(
      eventContextVNext(career, event.weekIndex),
      definition,
      choiceId,
      [],
    );
    if (resolved === null) return null;
    const next = resolved.nextContext;
    const state: PlayerState = {
      ...before,
      body: next.body,
      preparation: next.preparation,
      confidence: next.confidence,
      coachTrust: next.coachTrust,
      gpa: next.gpaMilli / 1_000,
      brand: next.brand,
    };
    return {
      state,
      gaugeAfter: gaugeBefore,
      event: {
        ...event,
        chosenChoiceId: choiceId,
        effects: effectsBetween(before, state, 0, resolved.gameModifiers),
      },
      modifiers: resolved.gameModifiers,
    };
  }
  if (profile.positionId === 'position_wr') {
    const definition = mechanics.wr.events.find(({ id }) => id === event.eventId);
    const choice = definition?.choices.find(({ id }) => id === choiceId);
    if (choice === undefined) return null;
    const state = cloneSerializable(before) as {
      -readonly [K in keyof PlayerState]: PlayerState[K];
    };
    let gauge = gaugeBefore;
    for (const effect of choice.effects) {
      if (effect.type === 'event_integer_state_delta') {
        const key = (
          {
            event_state_body: 'body',
            event_state_preparation: 'preparation',
            event_state_confidence: 'confidence',
            event_state_coach_trust: 'coachTrust',
            event_state_brand: 'brand',
          } as const
        )[effect.stateId];
        state[key] = clamp(state[key] + effect.delta, 0, 100);
      } else if (effect.type === 'event_gpa_delta_milli') {
        state.gpa = clamp(Math.round(state.gpa * 1_000) + effect.deltaMilli, 0, 4_000) / 1_000;
      } else {
        gauge = clamp(gauge + effect.points, 0, GAUGE_MAXIMUM);
      }
    }
    const effects = effectsBetween(before, state, gauge - gaugeBefore, NEUTRAL_GAME_MODIFIERS);
    return {
      state,
      gaugeAfter: gauge,
      event: { ...event, chosenChoiceId: choiceId, effects },
      modifiers: NEUTRAL_GAME_MODIFIERS,
    };
  }
  if (profile.positionId === 'position_lb' || profile.positionId === 'position_edge') {
    const catalog = mechanics.defenders[profile.positionId];
    const definition = catalog.events.find(({ id }) => id === event.eventId);
    if (definition === undefined) return null;
    const resolved = resolveDefenderEventChoice(
      {
        weekIndex: event.weekIndex,
        body: before.body,
        preparation: before.preparation,
        confidence: before.confidence,
        coachTrust: before.coachTrust,
        gpaMilli: Math.round(before.gpa * 1_000),
        brand: before.brand,
        recentEvents: career.condition.recentEvents,
      },
      definition,
      choiceId,
      catalog.skills.filter(({ id }) => equipped(career).includes(id)),
    );
    if (resolved === null) return null;
    const next = resolved.nextContext;
    const state: PlayerState = {
      ...before,
      body: next.body,
      preparation: next.preparation,
      confidence: next.confidence,
      coachTrust: next.coachTrust,
      gpa: next.gpaMilli / 1_000,
      brand: next.brand,
    };
    return {
      state,
      gaugeAfter: gaugeBefore,
      event: {
        ...event,
        chosenChoiceId: choiceId,
        effects: effectsBetween(before, state, 0, resolved.gameModifiers),
      },
      modifiers: resolved.gameModifiers,
    };
  }
  const result = resolvePositionAlphaEventChoiceResult(
    {
      player: profile,
      skills: { equippedSkillIds: career.build.equippedSkillIds },
      events: {
        model: 'position_alpha_event_state_v1',
        pending: { eventId: event.eventId, choiceIds: event.choiceIds, weekIndex: event.weekIndex },
        recentEvents: career.condition.recentEvents,
        history: [],
        nextGameModifiers: NEUTRAL_GAME_MODIFIERS,
      },
    } as never,
    choiceId,
    mechanics,
  );
  if (result === null) return null;
  const modifiers = result.events.nextGameModifiers;
  const state = { ...before, ...result.playerState };
  return {
    state,
    gaugeAfter: gaugeBefore,
    event: {
      ...event,
      chosenChoiceId: choiceId,
      effects: effectsBetween(before, state, 0, modifiers),
    },
    modifiers,
  };
}

export function rememberEventVNext(
  condition: ConditionVNext,
  event: WeeklyEventVNext,
  modifiers: GameModifiersVNext,
): ConditionVNext {
  return {
    ...condition,
    recentEvents: [
      ...condition.recentEvents,
      { eventId: event.eventId, weekIndex: event.weekIndex },
    ].slice(-RECENT_EVENT_MEMORY),
    eventHistory: [
      ...condition.eventHistory,
      { eventId: event.eventId, choiceId: event.chosenChoiceId ?? '', weekIndex: event.weekIndex },
    ],
    nextGameModifiers: modifiers,
  };
}

/**
 * VNext injury pacing over the shared exposure components: risk is convex in Body, so a rested
 * player sees rare, minor knocks while a player who grinds Body to zero courts real absences.
 * Outcomes still come from the shared catalog (minimum-risk gates decide how severe they can be).
 */
export const VNEXT_INJURY_TUNING = Object.freeze({
  basePermille: 4,
  /** (100 - body)^2 / divisor. */
  bodyCurveDivisor: 50,
  durabilityWeightPermille: 150,
  workloadWeightPermille: 150,
  trainingWeightPermille: 250,
  positionWeightPermille: 250,
  maximumPermille: 350,
});

export interface InjuryWeekVNext {
  readonly outcome: 'NO_INJURY' | 'INJURY' | 'ONGOING';
  readonly riskPermille: number;
  readonly injury: NewInjuryEvidence | null;
  /** Null means a rest / play-limited choice is required. */
  readonly availability: InjuryAvailabilityEvidence | null;
}

export function injuryRiskVNext(
  career: CareerVNext,
  trainingLoad: number,
  mechanics: CareerVNextMechanics,
): number | null {
  const profile = career.athlete.profile;
  const projection = career.program?.room.projection;
  if (projection === undefined) return null;
  const exposure = derivePositionInjuryExposure(
    {
      positionId: profile.positionId,
      body: profile.state.body,
      durability: profile.attributes.attribute_durability?.rating ?? 50,
      workloadSnapPermille: Math.min(5, projection.interactiveSnapMaximum) * 180,
      recentTrainingLoad: clamp(trainingLoad, 0, 120),
      currentInjury: career.condition.injury,
    },
    mechanics.lifecycle,
  );
  if (exposure === null) return null;
  const tuning = VNEXT_INJURY_TUNING;
  const weighted = (value: number, permille: number) => Math.floor((value * permille) / 1_000);
  const deficit = 100 - profile.state.body;
  const base =
    tuning.basePermille +
    Math.floor((deficit * deficit) / tuning.bodyCurveDivisor) +
    weighted(exposure.durabilityRiskPermille, tuning.durabilityWeightPermille) +
    weighted(exposure.workloadRiskPermille, tuning.workloadWeightPermille) +
    weighted(exposure.trainingRiskPermille, tuning.trainingWeightPermille) +
    weighted(exposure.positionExposurePermille, tuning.positionWeightPermille);
  // Body cards with an injury-risk multiplier scale the whole pregame risk.
  return clamp(
    Math.round((base * injuryRiskMultiplierVNext(career, mechanics)) / 1_000),
    0,
    tuning.maximumPermille,
  );
}

function neutralAvailability(career: CareerVNext, out: boolean): InjuryAvailabilityEvidence {
  const state = career.athlete.profile.state;
  return {
    weekIndex: careerWeekIndexVNext(career),
    availabilityId: out ? 'injury_availability_out' : 'injury_availability_full',
    opportunityCap: out ? 0 : 12,
    choiceId: null,
    recoveryCreditWeeks: 0,
    bodyBefore: state.body,
    requestedBodyDelta: 0,
    actualBodyDelta: 0,
    bodyAfter: state.body,
    confidenceBefore: state.confidence,
    requestedConfidenceDelta: 0,
    actualConfidenceDelta: 0,
    confidenceAfter: state.confidence,
    coachTrustBefore: state.coachTrust,
    requestedCoachTrustDelta: 0,
    actualCoachTrustDelta: 0,
    coachTrustAfter: state.coachTrust,
  };
}

/** Pregame injury check on post-practice, post-event state. */
export function assessInjuryWeekVNext(
  career: CareerVNext,
  trainingLoad: number,
  mechanics: CareerVNextMechanics,
): InjuryWeekVNext | null {
  const riskPermille = injuryRiskVNext(career, trainingLoad, mechanics);
  if (riskPermille === null) return null;
  let injury = career.condition.injury;
  let outcome: InjuryWeekVNext['outcome'] = 'ONGOING';
  if (injury === null) {
    const sampled = sampleInjuryOutcome(
      riskPermille,
      mechanics.injuries.outcomes,
      weekStream(career, 'injury'),
    );
    if (!sampled.ok) return null;
    const selected = sampled.sample.selectedOutcome;
    if (selected === null)
      return { outcome: 'NO_INJURY', riskPermille, injury: null, availability: null };
    outcome = 'INJURY';
    injury = {
      outcomeId: selected.id,
      severityId: selected.severityId,
      startedWeekIndex: careerWeekIndexVNext(career),
      originalDurationWeeks: selected.durationWeeks,
      remainingWeeks: selected.durationWeeks,
      defaultAvailabilityId: selected.availabilityId,
      opportunityCap: selected.opportunityCap,
    };
  }
  return {
    outcome,
    riskPermille,
    injury,
    availability:
      injury.defaultAvailabilityId === 'injury_availability_limited'
        ? null
        : neutralAvailability(career, true),
  };
}

export function injuryChoiceAvailabilityVNext(
  career: CareerVNext,
  choiceId: string,
  mechanics: CareerVNextMechanics,
): InjuryAvailabilityEvidence | null {
  const injury = career.condition.injury;
  if (injury === null) return null;
  const definition = mechanics.injuries.outcomes.find(({ id }) => id === injury.outcomeId);
  if (definition === undefined) return null;
  const availability = deriveInjuryChoiceAvailability(
    career.athlete.profile.state,
    careerWeekIndexVNext(career),
    definition,
    choiceId as InjuryChoiceId,
    mechanics.injuries.tuning,
  );
  // Rest credit can only shorten weeks that remain after this one (M10: truthful evidence, so a
  // one-week knock never advertises a credit it cannot use).
  return availability === null
    ? null
    : {
        ...availability,
        recoveryCreditWeeks: Math.min(
          availability.recoveryCreditWeeks,
          Math.max(0, injury.remainingWeeks - 1),
        ),
      };
}

/** Weekly recovery: one week passes (plus any rest credit); a healed injury clears. */
export function recoverConditionVNext(condition: ConditionVNext): ConditionVNext {
  const injury =
    condition.injury === null
      ? null
      : advanceInjuryDuration(condition.injury, condition.availability?.recoveryCreditWeeks ?? 0);
  return { ...condition, injury, availability: null };
}

export type AcademicStatusVNext = 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE';

/** The shipped academic rule: at a checkpoint week, GPA below the floor sits the next game. */
export function academicStatusVNext(
  gpa: number,
  mechanics: Pick<CareerVNextMechanics, 'academics'>,
): AcademicStatusVNext {
  const gpaMilli = Math.round(gpa * 1_000);
  const tuning = mechanics.academics;
  return gpaMilli >= tuning.eligibleGpaMilli
    ? 'ELIGIBLE'
    : gpaMilli >= tuning.warningGpaMilli
      ? 'WARNING'
      : 'INELIGIBLE';
}

export function academicCheckpointWeekVNext(
  weekIndex: number,
  mechanics: Pick<CareerVNextMechanics, 'academics'>,
): boolean {
  return mechanics.academics.checkpoints.some((checkpoint) => checkpoint.weekIndex === weekIndex);
}

/** The next checkpoint at or after this week in the regular season, if any. */
export function nextAcademicCheckpointVNext(
  career: Pick<CareerVNext, 'season'>,
  mechanics: Pick<CareerVNextMechanics, 'academics'>,
): number | null {
  const upcoming = mechanics.academics.checkpoints
    .map(({ weekIndex }) => weekIndex)
    .filter((weekIndex) => weekIndex >= career.season.weekIndex)
    .sort((left, right) => left - right);
  return upcoming[0] ?? null;
}
