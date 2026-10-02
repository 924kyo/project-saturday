import { describe, expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  castMemberVNext,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitOffseasonVNext,
  commitProgramVNext,
  continueGameVNext,
  continueSeasonReviewVNext,
  createCareerVNext,
  decideMidseasonVNext,
  focusDefinitionsVNext,
  gradeSeasonGoalVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextStoryBeatVNext,
  nextWeekVNext,
  parseCareerVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  resolveStoryChoiceVNext,
  roomMechanicsVNext,
  ROTATION_CONTEST_EVENT_IDS,
  serializeCareerVNext,
  storyOfVNext,
  toGameDayVNext,
  toneNilChancePermilleVNext,
  VNEXT_KEY_PLAYER_SNAPS,
  VNEXT_STORY_TUNING,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
  type SeasonReviewVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';

import {
  buildCareerVNextMechanics,
  defaultWrAppearance,
  STORY_VARIANTS_VNEXT,
  storyBeatsVNext,
  storyKeysVNext,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

const ok = (result: CareerVNextResult): CareerVNext => {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
};

function identity(
  overrides: Partial<{
    positionId: VNextPositionId;
    archetypeId: string;
    backgroundId: string;
    traits: readonly string[];
  }> = {},
): PositionPlayerCreationIdentity {
  return {
    displayName: 'Story Probe',
    positionId: overrides.positionId ?? 'position_cb',
    archetypeId: overrides.archetypeId ?? 'archetype_cb_press_man',
    recruitingBackgroundId: overrides.backgroundId ?? 'background_late_bloomer',
    personalityTraitIds: overrides.traits ?? ['personality_disciplined', 'personality_quiet'],
    appearance: defaultWrAppearance,
    heightCm: 186,
    weightKg: 88,
  } as unknown as PositionPlayerCreationIdentity;
}

function start(seed: string, id = identity()) {
  const mechanics = buildCareerVNextMechanics(id)!;
  const created = ok(createCareerVNext({ seed, identity: id }, mechanics));
  const committed = ok(
    commitProgramVNext(created, created.recruiting.offers[1]!.programId, mechanics),
  );
  return { mechanics, committed };
}

function plan(career: CareerVNext, mechanics: CareerVNextMechanics): string[] {
  const open = focusDefinitionsVNext(career, mechanics)
    .map(({ id }) => id as string)
    .filter((id) => isFocusAvailableVNext(career, id, mechanics));
  const drills = focusDefinitionsVNext(career, mechanics)
    .filter((entry) => 'positionId' in entry)
    .map(({ id }) => id as string)
    .filter((id) => open.includes(id));
  const picks = [drills[0] ?? open[0]!, 'action_film_study', 'action_recovery'].filter((id) =>
    open.includes(id),
  );
  while (picks.length < 3) picks.push(open.find((id) => !picks.includes(id))!);
  return picks;
}

/** Plays with default choices (the first beat choice) until `stop` holds. */
function drive(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  stop: (career: CareerVNext) => boolean,
  pickChoice: (career: CareerVNext) => string = (current) =>
    current.flow.type === 'EVENT' ? current.flow.event.choiceIds[0]! : '',
): CareerVNext {
  let current = career;
  for (let guard = 0; guard < 6_000 && !stop(current); guard += 1) {
    const flow = current.flow;
    if (flow.type === 'CAMP') current = ok(advanceCalendarVNext(current, mechanics)!);
    else if (flow.type === 'MIDSEASON') current = ok(decideMidseasonVNext(current, false));
    else if (flow.type === 'WEEK_PLAN')
      current = ok(planWeekVNext(current, plan(current, mechanics), mechanics));
    else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      current = ok(chooseBreakthroughVNext(current, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
      current = ok(chooseEventVNext(current, pickChoice(current), mechanics));
    else if (flow.type === 'NIL' && flow.offer.decision === null)
      current = ok(chooseNilVNext(current, false, mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      current = ok(chooseInjuryVNext(current, 'injury_choice_rest_rehab', mechanics));
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') current = ok(kickoffVNext(current, mechanics));
      else if (flow.game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(current, mechanics)!;
        current = ok(chooseSnapVNext(current, frame.decisionIds[0]!, mechanics));
      } else current = ok(continueGameVNext(current, mechanics));
    } else if (flow.type === 'POST_GAME') current = ok(nextWeekVNext(current, mechanics));
    else if (flow.type === 'SEASON_REVIEW')
      current = ok(continueSeasonReviewVNext(current, mechanics));
    else if (flow.type === 'OFFSEASON' || flow.type === 'CAREER_COMPLETE') break;
    else current = ok(toGameDayVNext(current, mechanics));
  }
  return current;
}

const beatEvents = (career: CareerVNext) =>
  career.condition.eventHistory.filter(({ eventId }) => eventId.startsWith('beat_'));

describe('REL-01: a persistent cast', () => {
  it('names the coach, captain, reporter and rival, and keeps them across weeks and seasons', () => {
    const { mechanics, committed } = start('cast');
    const programId = committed.program!.programId;
    const story = storyOfVNext(committed);
    const coach = castMemberVNext(story, 'coach', programId)!;
    const captain = castMemberVNext(story, 'captain', programId)!;
    const reporter = castMemberVNext(story, 'reporter', programId)!;
    expect([coach, captain, reporter].every((person) => person !== null)).toBe(true);
    // The rival is a real teammate, by roster ID.
    const rival = castMemberVNext(story, 'rival', programId)!;
    expect(committed.program!.room.competitors.some(({ id }) => id === rival.id)).toBe(true);
    const offseason = drive(committed, mechanics, (career) => career.flow.type === 'OFFSEASON');
    expect(offseason.flow.type).toBe('OFFSEASON');
    const later = storyOfVNext(offseason);
    // Staff names persist; values moved with the choices made.
    expect(castMemberVNext(later, 'coach', programId)).toMatchObject({
      id: coach.id,
      givenNameId: coach.givenNameId,
      familyNameId: coach.familyNameId,
    });
    expect(castMemberVNext(later, 'captain', programId)?.id).toBe(captain.id);
    expect(later.people.some((person) => person.history.length > 0)).toBe(true);
    // The first beat played was the season opener.
    expect(beatEvents(offseason)[0]?.eventId).toBe('beat_season_opener');
    // Staying keeps the same staff, and the next season opens with a loyalty beat.
    if (offseason.flow.type !== 'OFFSEASON') throw new Error('offseason');
    const stayId = offseason.flow.options.find(({ kind }) => kind === 'STAY')!.programId;
    const stayed = ok(commitOffseasonVNext(offseason, stayId, mechanics));
    expect(castMemberVNext(storyOfVNext(stayed), 'coach', stayId)?.id).toBe(coach.id);
    expect(storyOfVNext(stayed).pending.map(({ id }) => id)).toContain('loyalty');
    // Transferring brings a new staff, a fresh start that remembers the old school.
    const moveId = offseason.flow.options.find(({ kind }) => kind === 'TRANSFER')!.programId;
    const moved = ok(commitOffseasonVNext(offseason, moveId, mechanics));
    const fresh = storyOfVNext(moved).pending.find(({ id }) => id === 'fresh_start')!;
    expect(fresh.previousProgramId).toBe(programId);
    expect(castMemberVNext(storyOfVNext(moved), 'coach', moveId)?.id).not.toBe(coach.id);
    // The story round-trips through the save codec.
    expect(parseCareerVNext(serializeCareerVNext(moved)!)?.story).toEqual(moved.story);
  });
});

describe('REL-02: beats with memory and consequences', () => {
  it('a vow to take the spot back pays off when it happens, and the text remembers it', () => {
    const { mechanics, committed } = start('memory');
    const week = drive(committed, mechanics, (career) => career.flow.type === 'WEEK_PLAN');
    const subjectId = castMemberVNext(storyOfVNext(week), 'rival', week.program!.programId)!.id;
    const withTrigger = (id: 'rival_passed_you' | 'you_passed_rival', career: CareerVNext) => ({
      ...career,
      story: {
        ...storyOfVNext(career),
        pending: [{ id, seasonIndex: 0, weekIndex: career.season.weekIndex, subjectId }],
      },
    });
    const passed = nextStoryBeatVNext(withTrigger('rival_passed_you', week), mechanics)!;
    expect(passed.event.eventId).toBe('beat_rival_passed_you');
    const vowed = resolveStoryChoiceVNext(
      { ...week, story: passed.story },
      passed.event,
      'choice_vow_to_take_it_back',
      mechanics,
    )!;
    expect(vowed.story.flags).toContain(`vow:${subjectId}`);
    const after = { ...week, story: vowed.story };
    const back = nextStoryBeatVNext(withTrigger('you_passed_rival', after), mechanics)!;
    expect(back.event.beat?.variant).toBe('vow');
    const kept = resolveStoryChoiceVNext(
      { ...after, story: back.story },
      back.event,
      'choice_stay_humble',
      mechanics,
    )!;
    // Keeping the vow pays confidence and clears it.
    expect(kept.state.confidence - week.athlete.profile.state.confidence).toBe(
      Math.min(100 - week.athlete.profile.state.confidence, VNEXT_STORY_TUNING.vowKeptConfidence),
    );
    expect(kept.story.flags).not.toContain(`vow:${subjectId}`);
    // Relationships move with choices and keep a history.
    const rival = kept.story.people.find(({ id }) => id === subjectId)!;
    expect(rival.history.map(({ beatId }) => beatId)).toEqual([
      'beat_rival_passed_you',
      'beat_you_passed_rival',
    ]);
  });

  it('beats play in the event slot and their effects land on practice, trust, brand and NIL', () => {
    const { mechanics, committed } = start('slot');
    const played = drive(committed, mechanics, (career) => beatEvents(career).length >= 3);
    expect(beatEvents(played).length).toBeGreaterThanOrEqual(3);
    // An interview's tone feeds the NIL market.
    const fiery = { ...played, story: { ...storyOfVNext(played), tone: 'fiery' as const } };
    expect(toneNilChancePermilleVNext(fiery)).toBe(VNEXT_STORY_TUNING.toneNilChancePermille.fiery);
    expect(toneNilChancePermilleVNext({})).toBe(0);
  });
});

describe('REL-03: a goal for every class year, graded from facts', () => {
  const review = (patch: Partial<SeasonReviewVNext>) =>
    ({
      seasonIndex: 0,
      finish: 'MISSED',
      awards: [],
      depthRank: { start: 4, end: 4 },
      ...patch,
    }) as SeasonReviewVNext;
  it('grades each goal on its own facts', () => {
    expect(gradeSeasonGoalVNext(review({ depthRank: { start: 4, end: 2 } }), 0)).toEqual({
      goalId: 'goal_earn_role',
      met: true,
    });
    expect(gradeSeasonGoalVNext(review({}), 0).met).toBe(false);
    expect(gradeSeasonGoalVNext(review({ seasonIndex: 1 }), VNEXT_KEY_PLAYER_SNAPS).met).toBe(true);
    expect(gradeSeasonGoalVNext(review({ seasonIndex: 2, finish: 'FIRST_ROUND' }), 0).met).toBe(
      true,
    );
    expect(gradeSeasonGoalVNext(review({ seasonIndex: 3, finish: 'QUARTERFINAL' }), 0).met).toBe(
      false,
    );
  });

  it('writes the graded goal into the season review', () => {
    const { mechanics, committed } = start('goal');
    const done = drive(committed, mechanics, (career) => career.flow.type === 'OFFSEASON');
    const last = done.history.at(-1)!;
    const snaps = done.log
      .filter((recap) => (recap.seasonIndex ?? 0) === 0)
      .reduce((sum, { liveSnapCount }) => sum + liveSnapCount, 0);
    expect(last.goal).toEqual(gradeSeasonGoalVNext(last, snaps));
  });
});

describe('REL-05 and CRE-04: personality and background change the story', () => {
  it('two careers that differ only in background or personality get different choices', () => {
    const opener = (id: PositionPlayerCreationIdentity) => {
      const { mechanics, committed } = start('opener', id);
      return nextStoryBeatVNext(
        drive(committed, mechanics, (career) => career.flow.type === 'WEEK_PLAN'),
        mechanics,
      );
    };
    const small = opener(identity({ backgroundId: 'background_small_town_star' }))!;
    const legacy = opener(identity({ backgroundId: 'background_legacy_recruit' }))!;
    expect(small.event.beat?.variant).toBe('small_town_star');
    expect(legacy.event.beat?.variant).toBe('legacy_recruit');
    expect(small.event.choiceIds).toContain('choice_call_home');
    expect(legacy.event.choiceIds).toContain('choice_carry_the_name');
    expect(small.event.choiceIds).not.toEqual(legacy.event.choiceIds);
    const calm = opener(identity({ traits: ['personality_quiet', 'personality_disciplined'] }))!;
    const fierce = opener(identity({ traits: ['personality_competitive', 'personality_quiet'] }))!;
    expect(fierce.event.choiceIds).toContain('choice_mark_the_rival');
    expect(calm.event.choiceIds).not.toContain('choice_mark_the_rival');
  });
});

describe('REL-06 and REL-07: scheme fit explained, and a starter never contests rotation', () => {
  it('the scheme fit shown is the room’s own component', () => {
    const { mechanics, committed } = start('scheme');
    const room = committed.program!.room;
    const player = room.evaluations.find(({ participantId }) => participantId === room.playerId)!;
    expect(player.components.schemeFit).toBe(
      roomMechanicsVNext(
        mechanics,
        committed.seed,
        committed.program!.programId,
        committed.athlete.profile.positionId,
        0,
      ).schemeFitByArchetype[committed.athlete.profile.archetypeId],
    );
  });

  it('every rotation-contest event in the catalogs is filtered for starters', () => {
    const { mechanics } = start('catalogs');
    const ids = [
      ...mechanics.life.events.map(({ id }) => id as string),
      ...mechanics.wr.events.map(({ id }) => id as string),
      ...mechanics.defenders.position_lb.events.map(({ id }) => id as string),
      ...mechanics.defenders.position_edge.events.map(({ id }) => id as string),
    ];
    for (const id of ids)
      if (/rotation/.test(id)) expect(ROTATION_CONTEST_EVENT_IDS.has(id), id).toBe(true);
  });
});

describe('story copy', () => {
  it('ships every beat, choice and variant in both languages', () => {
    for (const locale of ['en-US', 'ko-KR'] as const) {
      const messages = localeMessages[locale] as Readonly<Record<string, string>>;
      for (const beat of storyBeatsVNext) {
        const keys = storyKeysVNext(beat.id);
        expect(messages[keys.title], keys.title).toBeTruthy();
        expect(messages[keys.body], keys.body).toBeTruthy();
        for (const choice of beat.choices)
          expect(messages[keys.choice(choice.id)], keys.choice(choice.id)).toBeTruthy();
        for (const variant of STORY_VARIANTS_VNEXT[beat.id] ?? [])
          expect(messages[keys.variant(variant)], keys.variant(variant)).toBeTruthy();
      }
      const vote = storyKeysVNext('beat_captain_vote');
      expect(messages[vote.variant('elected')]).toBeTruthy();
      expect(messages[vote.variant('not_elected')]).toBeTruthy();
    }
  });
});
