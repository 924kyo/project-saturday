import type { ProgramId } from '../player/ids.js';
import type { PositionRoomContext } from '../programs/position-room.js';
import type { PlayerState } from '../player/types.js';
import { createRng, nextUint32 } from '../random/rng.js';
import { roleStatusVNext } from './roles.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  ContributorHonorIdVNext,
  EventEffectsVNext,
  PersonVNext,
  ReputationToneVNext,
  SeasonGoalIdVNext,
  SeasonReviewVNext,
  StoryBeatDefinitionVNext,
  StoryChoiceDefinitionVNext,
  StoryOutcomeVNext,
  StoryRoleVNext,
  StoryTriggerVNext,
  StoryVNext,
  WeeklyEventVNext,
} from './types.js';

/**
 * Relationships and narrative (M12 Phase 6, playtest report "small cast", "one-off events"). A
 * small persistent cast (the depth rival by roster ID, the position coach, a veteran captain and a
 * campus reporter), story beats that fire from saved facts and remember earlier choices, a
 * reputation tone from interviews, and a goal for every class year.
 *
 * Beats play in the weekly event slot (they replace that week's random event), so the week gains
 * no extra step. Triggers are queued when they happen (a depth move, a big game, a transfer) and
 * the next event slot plays the oldest.
 */
export const VNEXT_STORY_TUNING = Object.freeze({
  startValue: 50,
  historyLimit: 12,
  pendingLimit: 3,
  /** A depth beat needs this many weeks since the last story beat (one-off moves stay quiet). */
  depthBeatGapWeeks: 2,
  /** At most one beat in this many weeks (week 0 excepted); queued triggers wait. */
  beatGapWeeks: 2,
  interview: { bigGameGrade: 85, toughLossMargin: 17, gapWeeks: 4 },
  defendSpotGapWeeks: 4,
  mentorWeek: 3,
  /** Captain vote: relationship + locker room halves, a class-year term and trait bonuses. */
  captain: { threshold: 75, perClassYear: 6, leader: 15, social: 8 },
  /** Interviews leave a tone the NIL market reads (weekly offer chance, permille). */
  toneNilChancePermille: { confident: 40, humble: 0, fiery: 60 } satisfies Record<
    ReputationToneVNext,
    number
  >,
  /** Fiery words come back in the next rivalry beat. */
  fieryRivalDelta: -5,
  /** A vow kept: taking the spot back pays extra confidence. */
  vowKeptConfidence: 3,
  mostImprovedGain: 7,
});

const clamp = (value: number, low = 0, high = 100) => Math.min(high, Math.max(low, value));

export function storyOfVNext(career: Pick<CareerVNext, 'story'>): StoryVNext {
  return career.story ?? { people: [], pending: [], flags: [], tone: null, log: [] };
}

/** A program's staff member: the same name at that program in every career. */
function staffPerson(
  programId: ProgramId,
  role: Exclude<StoryRoleVNext, 'rival'>,
  mechanics: Pick<CareerVNextMechanics, 'roomNames'>,
): PersonVNext {
  const pick = nextUint32(createRng(`staff:${programId}:${role}`));
  const given = mechanics.roomNames.givenNameIds;
  const family = mechanics.roomNames.familyNameIds;
  return {
    id: `staff_${role}_${programId.slice('program_'.length)}`,
    role,
    givenNameId: given[pick.value % given.length]!,
    familyNameId: family[nextUint32(pick.nextRng).value % family.length]!,
    programId,
    value: VNEXT_STORY_TUNING.startValue,
    history: [],
  };
}

/** The teammate the athlete is fighting with: the one right above, else the one right below. */
export function rivalOfRoomVNext(room: PositionRoomContext): string | null {
  const index = room.evaluations.findIndex(({ participantId }) => participantId === room.playerId);
  return (
    room.evaluations[index - 1]?.participantId ?? room.evaluations[index + 1]?.participantId ?? null
  );
}

function rivalPerson(
  room: PositionRoomContext,
  rosterId: string,
  programId: ProgramId,
  existing: readonly PersonVNext[],
): PersonVNext | null {
  const known = existing.find(({ id }) => id === rosterId);
  if (known !== undefined) return { ...known, role: 'rival' };
  const competitor = room.competitors.find(({ id }) => id === rosterId);
  if (competitor === undefined) return null;
  return {
    id: rosterId,
    role: 'rival',
    givenNameId: competitor.givenNameId,
    familyNameId: competitor.familyNameId,
    programId,
    value: VNEXT_STORY_TUNING.startValue,
    history: [],
  };
}

/**
 * The cast at a program: its coach, captain and reporter (kept from earlier seasons there) and
 * the current rival. A former rival keeps their history but is no longer "the" rival.
 */
export function withCastVNext(
  story: StoryVNext,
  programId: ProgramId,
  room: PositionRoomContext,
  mechanics: Pick<CareerVNextMechanics, 'roomNames'>,
  rivalId: string | null = rivalOfRoomVNext(room),
): StoryVNext {
  // Former rivals keep their history; the current one is named by the `rival:` flag.
  let people = story.people;
  for (const role of ['coach', 'captain', 'reporter'] as const) {
    const staff = staffPerson(programId, role, mechanics);
    if (!people.some(({ id }) => id === staff.id)) people = [...people, staff];
  }
  if (rivalId !== null) {
    const rival = rivalPerson(room, rivalId, programId, people);
    if (rival !== null)
      people = people.some(({ id }) => id === rival.id)
        ? people.map((person) => (person.id === rival.id ? rival : person))
        : [...people, rival];
  }
  return {
    ...story,
    people,
    flags: [
      ...story.flags.filter((flag) => !flag.startsWith('rival:')),
      ...(rivalId === null ? [] : [`rival:${rivalId}`]),
    ],
  };
}

/** The person playing `role` now (the rival is the one the cast currently names). */
export function castMemberVNext(
  story: StoryVNext,
  role: StoryRoleVNext,
  programId: ProgramId | null,
): PersonVNext | null {
  if (role === 'rival') {
    const id = story.flags.find((flag) => flag.startsWith('rival:'))?.slice('rival:'.length);
    return story.people.find((person) => person.id === id) ?? null;
  }
  return (
    story.people.find((person) => person.role === role && person.programId === programId) ?? null
  );
}

/** Queues a trigger (newest depth beat replaces an older one; the queue stays short). */
export function withTriggerVNext(story: StoryVNext, trigger: StoryTriggerVNext): StoryVNext {
  const depth = (id: string) =>
    id === 'rival_passed_you' || id === 'you_passed_rival' || id === 'defend_spot';
  const kept = story.pending.filter(
    (pending) => pending.id !== trigger.id && !(depth(pending.id) && depth(trigger.id)),
  );
  return { ...story, pending: [...kept, trigger].slice(-VNEXT_STORY_TUNING.pendingLimit) };
}

const weekKey = (seasonIndex: number, weekIndex: number) => seasonIndex * 100 + weekIndex;

function weeksSinceLastBeat(story: StoryVNext, seasonIndex: number, weekIndex: number): number {
  const last = story.log.at(-1);
  return last === undefined
    ? Number.POSITIVE_INFINITY
    : weekKey(seasonIndex, weekIndex) - weekKey(last.seasonIndex, last.weekIndex);
}

/** After a practice update: a promotion or demotion queues a depth beat about that teammate. */
export function storyAfterPracticeVNext(
  career: CareerVNext,
  movement: 'PROMOTED' | 'DEMOTED' | 'HELD',
  neighborId: string | null,
  room: PositionRoomContext,
  mechanics: Pick<CareerVNextMechanics, 'roomNames'>,
): StoryVNext | undefined {
  if (career.program === null || career.story === undefined) return career.story;
  if (movement === 'HELD' || neighborId === null) return career.story;
  let story = withCastVNext(career.story, career.program.programId, room, mechanics, neighborId);
  if (
    weeksSinceLastBeat(story, career.season.index, career.season.weekIndex) >=
    VNEXT_STORY_TUNING.depthBeatGapWeeks
  )
    story = withTriggerVNext(story, {
      id: movement === 'PROMOTED' ? 'you_passed_rival' : 'rival_passed_you',
      seasonIndex: career.season.index,
      weekIndex: career.season.weekIndex,
      subjectId: neighborId,
    });
  return story;
}

/** After a game: a big game, a tough loss or an upset win brings the campus reporter. */
export function storyAfterGameVNext(
  career: CareerVNext,
  game: {
    readonly weekIndex: number;
    readonly won: boolean;
    readonly margin: number;
    readonly coachGrade: number | null;
    readonly upset: boolean;
    readonly played: boolean;
  },
): StoryVNext | undefined {
  if (career.story === undefined || !game.played) return career.story;
  const tuning = VNEXT_STORY_TUNING.interview;
  const kind = game.upset
    ? 'upset_win'
    : game.won && game.coachGrade !== null && game.coachGrade >= tuning.bigGameGrade
      ? 'big_game'
      : !game.won && game.margin >= tuning.toughLossMargin
        ? 'tough_loss'
        : null;
  if (kind === null) return career.story;
  const lastInterview = [...career.story.log]
    .reverse()
    .find(({ beatId }) => beatId === 'beat_interview');
  if (
    lastInterview !== undefined &&
    weekKey(career.season.index, game.weekIndex) -
      weekKey(lastInterview.seasonIndex, lastInterview.weekIndex) <
      tuning.gapWeeks
  )
    return career.story;
  return withTriggerVNext(career.story, {
    id: 'interview',
    seasonIndex: career.season.index,
    weekIndex: game.weekIndex,
    gameKind: kind,
  });
}

/** The opening of a career at a program: the cast and the season opener. */
export function storyAtCommitVNext(
  career: Pick<CareerVNext, 'story'>,
  programId: ProgramId,
  room: PositionRoomContext,
  mechanics: Pick<CareerVNextMechanics, 'roomNames' | 'storyBeats'>,
): StoryVNext | undefined {
  if (mechanics.storyBeats === undefined) return career.story;
  const story = withCastVNext(storyOfVNext(career), programId, room, mechanics);
  return withTriggerVNext(story, { id: 'season_opener', seasonIndex: 0, weekIndex: 0 });
}

/** A new season: fresh start or loyalty, and from the junior year on a captain vote. */
export function storyAtNewSeasonVNext(
  career: CareerVNext,
  programId: ProgramId,
  room: PositionRoomContext,
  seasonIndex: number,
  mechanics: Pick<CareerVNextMechanics, 'roomNames' | 'storyBeats'>,
): StoryVNext | undefined {
  if (career.story === undefined || career.program === null) return career.story;
  const transferred = programId !== career.program.programId;
  let story = withCastVNext(career.story, programId, room, mechanics);
  story = withTriggerVNext(story, {
    id: transferred ? 'fresh_start' : 'loyalty',
    seasonIndex,
    weekIndex: 0,
    ...(transferred ? { previousProgramId: career.program.programId } : {}),
  });
  if (seasonIndex >= 2)
    story = withTriggerVNext(story, { id: 'captain_vote', seasonIndex, weekIndex: 0 });
  return story;
}

/** Whether the room elects the athlete captain (relationships, locker room, class year, traits). */
export function captainVotesVNext(career: CareerVNext): { votes: number; elected: boolean } {
  const tuning = VNEXT_STORY_TUNING.captain;
  const story = storyOfVNext(career);
  const captain = castMemberVNext(story, 'captain', career.program?.programId ?? null);
  const traits = career.athlete.profile.personalityTraitIds as readonly string[];
  const votes =
    Math.round((captain?.value ?? VNEXT_STORY_TUNING.startValue) / 2) +
    Math.round((career.nil?.lockerRoom ?? 50) / 2) +
    (career.season.index + 1) * tuning.perClassYear +
    (traits.includes('personality_leader') ? tuning.leader : 0) +
    (traits.includes('personality_social') ? tuning.social : 0);
  return { votes, elected: votes >= tuning.threshold };
}

function choiceOpen(
  choice: StoryChoiceDefinitionVNext,
  career: CareerVNext,
  elected: boolean | undefined,
): boolean {
  const requires = choice.requires;
  if (requires === undefined) return true;
  const traits = career.athlete.profile.personalityTraitIds as readonly string[];
  if (requires.traitIds !== undefined && !requires.traitIds.some((id) => traits.includes(id)))
    return false;
  if (
    requires.backgroundIds !== undefined &&
    !requires.backgroundIds.includes(career.athlete.profile.recruitingBackgroundId)
  )
    return false;
  if (requires.elected !== undefined && requires.elected !== elected) return false;
  return true;
}

/** The text variant memory selects for a beat (null = the beat's plain text). */
function variantOf(career: CareerVNext, trigger: StoryTriggerVNext): string | null {
  const story = storyOfVNext(career);
  if (trigger.id === 'season_opener')
    return career.athlete.profile.recruitingBackgroundId.slice('background_'.length);
  if (trigger.id === 'you_passed_rival' && story.flags.includes(`vow:${trigger.subjectId}`))
    return 'vow';
  if (
    (trigger.id === 'rival_passed_you' || trigger.id === 'you_passed_rival') &&
    story.tone === 'fiery'
  )
    return 'fiery';
  if (trigger.id === 'fresh_start' && trigger.previousProgramId !== undefined) return 'farewell';
  if (trigger.id === 'interview') return trigger.gameKind ?? null;
  return null;
}

function beatFor(
  career: CareerVNext,
  trigger: StoryTriggerVNext,
  mechanics: Pick<CareerVNextMechanics, 'storyBeats'>,
): WeeklyEventVNext | null {
  const definition = mechanics.storyBeats?.find((beat) => beat.trigger === trigger.id);
  if (definition === undefined) return null;
  const elected = trigger.id === 'captain_vote' ? captainVotesVNext(career).elected : undefined;
  const choiceIds = definition.choices
    .filter((choice) => choiceOpen(choice, career, elected))
    .map(({ id }) => id);
  if (choiceIds.length === 0) return null;
  return {
    weekIndex: career.season.weekIndex,
    eventId: definition.id,
    choiceIds,
    chosenChoiceId: null,
    effects: null,
    beat: {
      trigger: { ...trigger, weekIndex: career.season.weekIndex },
      variant: variantOf(career, trigger),
      ...(elected === undefined ? {} : { elected }),
      outcome: null,
    },
  };
}

/**
 * The story beat for this week's event slot, if any: the oldest queued trigger, else a starter's
 * "defend the spot" when the role is contested, else (junior year on) mentoring a freshman.
 */
export function nextStoryBeatVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): { readonly event: WeeklyEventVNext; readonly story: StoryVNext } | null {
  if (career.story === undefined || career.program === null) return null;
  const seasonIndex = career.season.index;
  const weekIndex = career.season.weekIndex;
  // Beats are spaced out so the authored weekly events keep their place; the season's opening
  // beats (week 0) are never held back.
  if (
    weekIndex > 0 &&
    weeksSinceLastBeat(career.story, seasonIndex, weekIndex) < VNEXT_STORY_TUNING.beatGapWeeks
  )
    return null;
  // The oldest queued trigger that has a beat plays; triggers without one are dropped.
  let pending = career.story.pending;
  while (pending.length > 0) {
    const [first, ...rest] = pending;
    pending = rest;
    const event = beatFor(career, first!, mechanics);
    if (event !== null) return { event, story: { ...career.story, pending } };
  }
  const story = { ...career.story, pending };
  const room = career.program.room;
  const sinceLast = weeksSinceLastBeat(story, seasonIndex, weekIndex);
  const status = roleStatusVNext(room, mechanics);
  if (
    status !== null &&
    status.roleId === 'depth_role_starter' &&
    status.status !== 'SECURE' &&
    status.challengerId !== null &&
    sinceLast >= VNEXT_STORY_TUNING.defendSpotGapWeeks
  ) {
    const event = beatFor(
      career,
      { id: 'defend_spot', seasonIndex, weekIndex, subjectId: status.challengerId },
      mechanics,
    );
    if (event !== null)
      return {
        event,
        story: withCastVNext(story, career.program.programId, room, mechanics, status.challengerId),
      };
  }
  if (
    seasonIndex >= 2 &&
    weekIndex === VNEXT_STORY_TUNING.mentorWeek &&
    room.competitors.some(({ classYear }) => classYear === 1) &&
    !story.log.some(
      (entry) => entry.beatId === 'beat_mentor_freshman' && entry.seasonIndex === seasonIndex,
    )
  ) {
    const event = beatFor(career, { id: 'mentor_freshman', seasonIndex, weekIndex }, mechanics);
    if (event !== null) return { event, story };
  }
  return null;
}

export interface ResolvedStoryChoiceVNext {
  readonly state: PlayerState;
  readonly lockerRoom: number;
  readonly story: StoryVNext;
  readonly event: WeeklyEventVNext;
}

/** Applies a beat choice: the athlete's state, the cast, the locker room, memory and tone. */
export function resolveStoryChoiceVNext(
  career: CareerVNext,
  event: WeeklyEventVNext,
  choiceId: string,
  mechanics: Pick<CareerVNextMechanics, 'storyBeats'>,
): ResolvedStoryChoiceVNext | null {
  const scene = event.beat;
  if (scene === undefined || event.chosenChoiceId !== null || !event.choiceIds.includes(choiceId))
    return null;
  const definition = mechanics.storyBeats?.find(({ id }) => id === event.eventId);
  const choice = definition?.choices.find(({ id }) => id === choiceId);
  if (definition === undefined || choice === undefined) return null;
  const tuning = VNEXT_STORY_TUNING;
  const story = storyOfVNext(career);
  const trigger = scene.trigger;
  const effects = choice.effects;
  const before = career.athlete.profile.state;
  const vowKept =
    trigger.id === 'you_passed_rival' && story.flags.includes(`vow:${trigger.subjectId}`);
  const confidence = (effects.confidence ?? 0) + (vowKept ? tuning.vowKeptConfidence : 0);
  const state: PlayerState = {
    ...before,
    body: clamp(before.body + (effects.body ?? 0)),
    preparation: clamp(before.preparation + (effects.preparation ?? 0)),
    confidence: clamp(before.confidence + confidence),
    coachTrust: clamp(before.coachTrust + (effects.coachTrust ?? 0)),
    brand: clamp(before.brand + (effects.brand ?? 0)),
  };
  const programId = career.program?.programId ?? null;
  // Relationship changes: by role, to the person the scene is about (the subject for the rival).
  const deltas = new Map<string, number>();
  const target = (role: StoryRoleVNext) =>
    role === 'rival' && trigger.subjectId !== undefined
      ? trigger.subjectId
      : castMemberVNext(story, role, programId)?.id;
  for (const { role, delta } of effects.relationships ?? []) {
    const id = target(role);
    if (id !== undefined) deltas.set(id, (deltas.get(id) ?? 0) + delta);
  }
  // Fiery words in the paper come back in the next rivalry beat.
  if (scene.variant === 'fiery') {
    const id = target('rival');
    if (id !== undefined) deltas.set(id, (deltas.get(id) ?? 0) + tuning.fieryRivalDelta);
  }
  if ((effects.coachTrust ?? 0) !== 0) {
    const coach = castMemberVNext(story, 'coach', programId);
    if (coach !== null)
      deltas.set(coach.id, (deltas.get(coach.id) ?? 0) + (effects.coachTrust ?? 0));
  }
  const people = story.people.map((person) => {
    const delta = deltas.get(person.id);
    if (delta === undefined || delta === 0) return person;
    return {
      ...person,
      value: clamp(person.value + delta),
      history: [
        ...person.history,
        {
          seasonIndex: career.season.index,
          weekIndex: event.weekIndex,
          delta,
          beatId: event.eventId,
        },
      ].slice(-tuning.historyLimit),
    };
  });
  const flag =
    effects.flag === 'vow'
      ? `vow:${trigger.subjectId ?? ''}`
      : effects.flag === 'captain'
        ? `captain:${career.season.index}`
        : effects.flag === 'mentor'
          ? `mentor:${career.season.index}`
          : null;
  const flags = [
    ...story.flags.filter((entry) => !(vowKept && entry === `vow:${trigger.subjectId}`)),
    ...(flag === null || story.flags.includes(flag) ? [] : [flag]),
  ];
  const lockerRoom = clamp((career.nil?.lockerRoom ?? 50) + (effects.lockerRoom ?? 0));
  const outcome: StoryOutcomeVNext = {
    relationships: [...deltas.entries()].map(([personId, delta]) => ({ personId, delta })),
    lockerRoom: effects.lockerRoom ?? 0,
    tone: effects.tone ?? null,
    flag,
  };
  const eventEffects: EventEffectsVNext = {
    body: state.body - before.body,
    preparation: state.preparation - before.preparation,
    confidence: state.confidence - before.confidence,
    coachTrust: state.coachTrust - before.coachTrust,
    brand: state.brand - before.brand,
    gpaMilli: 0,
    gauge: 0,
    modifiers: career.condition.nextGameModifiers,
  };
  return {
    state,
    lockerRoom,
    story: {
      ...story,
      people,
      flags,
      tone: effects.tone ?? story.tone,
      log: [
        ...story.log,
        {
          seasonIndex: career.season.index,
          weekIndex: event.weekIndex,
          beatId: event.eventId,
          choiceId,
        },
      ],
    },
    event: {
      ...event,
      chosenChoiceId: choiceId,
      effects: eventEffects,
      beat: { ...scene, outcome },
    },
  };
}

/** The weekly NIL chance a reputation tone adds (REL-04). */
export function toneNilChancePermilleVNext(career: Pick<CareerVNext, 'story'>): number {
  const tone = career.story?.tone ?? null;
  return tone === null ? 0 : VNEXT_STORY_TUNING.toneNilChancePermille[tone];
}

// ---------------------------------------------------------------------------------------------
// Year goals (REL-03) and contributor honors (CAR-05).

const GOALS: readonly SeasonGoalIdVNext[] = [
  'goal_earn_role',
  'goal_key_player',
  'goal_contender',
  'goal_senior_legacy',
];

export function seasonGoalIdVNext(seasonIndex: number): SeasonGoalIdVNext {
  return GOALS[Math.min(3, Math.max(0, seasonIndex))]!;
}

/** Live snaps that count as a key player's season (or a starter's role at the end). */
export const VNEXT_KEY_PLAYER_SNAPS = 20;

/** Grades the class year's goal from the season's facts. */
export function gradeSeasonGoalVNext(
  review: Pick<SeasonReviewVNext, 'seasonIndex' | 'finish' | 'awards' | 'draftStock' | 'depthRank'>,
  liveSnaps: number,
): { readonly goalId: SeasonGoalIdVNext; readonly met: boolean } {
  const goalId = seasonGoalIdVNext(review.seasonIndex);
  const awards = review.awards?.length ?? 0;
  const met =
    goalId === 'goal_earn_role'
      ? review.depthRank.end <= 2
      : goalId === 'goal_key_player'
        ? review.depthRank.end === 1 || liveSnaps >= VNEXT_KEY_PLAYER_SNAPS
        : goalId === 'goal_contender'
          ? review.finish !== 'MISSED' || awards > 0
          : ['CHAMPION', 'RUNNER_UP', 'SEMIFINAL'].includes(review.finish) ||
            awards > 0 ||
            (review.draftStock !== undefined && review.draftStock.band !== 'UNDRAFTED');
  return { goalId, met };
}

export function contributorHonorsVNext(
  career: Pick<CareerVNext, 'story' | 'season'>,
  review: Pick<SeasonReviewVNext, 'overall'>,
): readonly ContributorHonorIdVNext[] {
  const honors: ContributorHonorIdVNext[] = [];
  if (storyOfVNext(career).flags.includes(`captain:${career.season.index}`))
    honors.push('honor_captain');
  if (review.overall.end - review.overall.start >= VNEXT_STORY_TUNING.mostImprovedGain)
    honors.push('honor_most_improved');
  return honors;
}

export type { StoryBeatDefinitionVNext };
