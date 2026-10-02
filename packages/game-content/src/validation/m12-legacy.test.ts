import { describe, expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  claimLegacyVNext,
  combineVNext,
  commitProgramVNext,
  continueGameVNext,
  continueSeasonReviewVNext,
  createCareerVNext,
  decideMidseasonVNext,
  emptyLegacyStoreVNext,
  focusDefinitionsVNext,
  hallOfFameScoreVNext,
  inductsHallOfFameVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  legacyBalanceVNext,
  legacyPointsVNext,
  legacyTotalVNext,
  nextWeekVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  retireVNext,
  runDraftVNext,
  toGameDayVNext,
  unlockPerkVNext,
  VNEXT_COMBINE_TUNING,
  VNEXT_COMMEMORATIVE_GEAR,
  VNEXT_LEGACY_PERKS,
  VNEXT_LEGACY_POINT_TUNING,
  type AlumniVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type LegacyStoreVNext,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

const ok = (result: CareerVNextResult): CareerVNext => {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
};

const id = {
  displayName: 'Legacy Probe',
  positionId: 'position_cb',
  archetypeId: 'archetype_cb_press_man',
  recruitingBackgroundId: 'background_late_bloomer',
  personalityTraitIds: ['personality_disciplined', 'personality_quiet'],
  appearance: defaultWrAppearance,
  heightCm: 186,
  weightKg: 88,
} as unknown as PositionPlayerCreationIdentity;
const mechanics = buildCareerVNextMechanics(id)!;

function plan(career: CareerVNext, m: CareerVNextMechanics): string[] {
  const open = focusDefinitionsVNext(career, m)
    .map(({ id: focus }) => focus as string)
    .filter((focus) => isFocusAvailableVNext(career, focus, m));
  const picks = ['action_film_study', 'action_recovery', 'action_study_hall'].filter((focus) =>
    open.includes(focus),
  );
  while (picks.length < 3) picks.push(open.find((focus) => !picks.includes(focus))!);
  return picks;
}

/** Plays until `stop`, choosing the first option everywhere. */
function drive(career: CareerVNext, stop: (career: CareerVNext) => boolean): CareerVNext {
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
      current = ok(chooseEventVNext(current, flow.event.choiceIds[0]!, mechanics));
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

const plaque = (patch: Partial<AlumniVNext>): AlumniVNext => ({
  careerId: 'career_probe',
  displayName: 'Probe',
  positionId: 'position_cb',
  archetypeId: 'archetype_cb_press_man',
  programIds: ['program_ironwood'] as AlumniVNext['programIds'],
  seasons: 4,
  championships: 0,
  bestFinish: 'MISSED',
  record: { wins: 20, losses: 28, ties: 0 },
  liveGames: 30,
  statTotals: [],
  finalOverall: 72,
  bestDepthRank: 4,
  ...patch,
});

describe('LEG-01 and LEG-03: legacy points and the Hall of Fame', () => {
  it('scores each category from the plaque, within its cap, with its reason', () => {
    const decorated = plaque({
      bestDepthRank: 1,
      awards: [
        'award_all_conference_first',
        'award_all_conference_second',
        'award_position_cb',
        'award_all_american',
      ] as never,
      championships: 2,
      conferenceTitles: 2,
      finalGpa: 3.4,
      goalsMet: 4,
      honors: ['honor_captain'],
      draft: { round: 1, pick: 9, stockScore: 84 },
    });
    const caps = VNEXT_LEGACY_POINT_TUNING.categories;
    const rows = Object.fromEntries(
      legacyPointsVNext(decorated).map((row) => [row.categoryId, row]),
    );
    expect(rows['role']?.points).toBe(caps.role.starter);
    expect(rows['honors']?.points).toBe(caps.honors.cap);
    expect(rows['team']?.points).toBe(caps.team.cap);
    expect(rows['academics']?.points).toBe(caps.academics.points);
    expect(rows['relationships']?.points).toBe(caps.relationships.cap);
    expect(rows['draft']?.points).toBe(caps.draft.earlyRounds);
    // The Hall of Fame is deterministic from the plaque.
    expect(inductsHallOfFameVNext(decorated)).toBe(true);
    expect(hallOfFameScoreVNext(decorated)).toBe(hallOfFameScoreVNext({ ...decorated }));
    const quiet = plaque({});
    expect(inductsHallOfFameVNext(quiet)).toBe(false);
    expect(legacyPointsVNext(quiet)).toEqual([]);
  });

  it('claims a career once, never twice', () => {
    const earned = plaque({ bestDepthRank: 1, finalGpa: 3.2 });
    const once = claimLegacyVNext(emptyLegacyStoreVNext(), earned);
    expect(once.earned).toBe(legacyTotalVNext(earned));
    expect(claimLegacyVNext(once, earned)).toBe(once);
    expect(claimLegacyVNext(once, { ...earned, careerId: 'career_other' }).earned).toBe(
      once.earned * 2,
    );
  });
});

describe('LEG-02: perks for later careers, capped', () => {
  const rich: LegacyStoreVNext = { ...emptyLegacyStoreVNext(), earned: 40 };
  it('costs points, stops at each perk’s top level, and never overdraws', () => {
    let store = rich;
    for (let level = 1; level <= VNEXT_LEGACY_PERKS.perk_head_start.maxLevel; level += 1) {
      const next = unlockPerkVNext(store, 'perk_head_start');
      if (typeof next === 'string') throw new Error(next);
      store = next;
    }
    expect(store.perks.perk_head_start).toBe(3);
    expect(unlockPerkVNext(store, 'perk_head_start')).toBe('max_level');
    expect(legacyBalanceVNext(store)).toBe(40 - 3 * VNEXT_LEGACY_PERKS.perk_head_start.cost);
    expect(unlockPerkVNext(emptyLegacyStoreVNext(), 'perk_mentor_choice')).toBe(
      'not_enough_points',
    );
  });

  it('a fresh career needs no perks, and the head start is capped at +3', () => {
    expect(createCareerVNext({ seed: 'fresh', identity: id }, mechanics).ok).toBe(true);
    expect(createCareerVNext({ seed: 'fresh', identity: id, bonusBudget: 3 }, mechanics).ok).toBe(
      true,
    );
    expect(createCareerVNext({ seed: 'fresh', identity: id, bonusBudget: 4 }, mechanics).ok).toBe(
      false,
    );
  });

  it('a mentor or a legacy offer must come from the career’s own Alumni Wall', () => {
    const legacy = [plaque({ programIds: ['program_ironwood'] as AlumniVNext['programIds'] })];
    expect(
      createCareerVNext({ seed: 'x', identity: id, legacy, mentorCareerId: 'nobody' }, mechanics)
        .ok,
    ).toBe(false);
    expect(
      createCareerVNext(
        { seed: 'x', identity: id, legacy, legacyOfferProgramId: 'program_capital_commonwealth' },
        mechanics,
      ).ok,
    ).toBe(false);
  });
});

describe('CAR-02: the Pro Combine', () => {
  it('measures from ratings, moves stock a little, and the draft carries it', () => {
    const career = ok(createCareerVNext({ seed: 'combine', identity: id }, mechanics));
    const combine = combineVNext(career);
    expect(combineVNext(career)).toEqual(combine);
    expect(Math.abs(combine.stockDelta)).toBeLessThanOrEqual(VNEXT_COMBINE_TUNING.maxStockDelta);
    expect(combine.footballTest).toBe(
      (career.athlete.profile.attributes as unknown as Record<string, { rating: number }>)[
        'attribute_football_iq'
      ]!.rating,
    );
    const drafted = runDraftVNext({ ...career, history: [] });
    expect(drafted.combine).toEqual(combine);
  });
});

describe('LEG-05 and LEG-06: a finished career carries into the next', () => {
  it('claims the plaque, unlocks perks and starts a new career that uses them', () => {
    // A real career: one season, then the athlete retires (the plaque is written).
    const first = ok(createCareerVNext({ seed: 'carry-1', identity: id }, mechanics));
    const offseason = drive(
      ok(commitProgramVNext(first, first.recruiting.offers[1]!.programId, mechanics)),
      (career) => career.flow.type === 'OFFSEASON',
    );
    const retired = ok(retireVNext(offseason));
    if (retired.flow.type !== 'CAREER_COMPLETE') throw new Error(retired.flow.type);
    const wall = [retired.flow.alumni];
    expect(retired.flow.alumni.goalsMet).toBeTypeOf('number');
    expect(retired.flow.alumni.finalGpa).toBeTypeOf('number');
    // Claimed once; unlock with points banked (topped up here so every perk can be tried).
    let store = claimLegacyVNext(emptyLegacyStoreVNext(), retired.flow.alumni);
    expect(claimLegacyVNext(store, retired.flow.alumni)).toBe(store);
    store = { ...store, earned: store.earned + 20 };
    for (const perk of [
      'perk_head_start',
      'perk_mentor_choice',
      'perk_legacy_offer',
      'perk_commemorative_gear',
    ] as const) {
      const next = unlockPerkVNext(store, perk);
      if (typeof next === 'string') throw new Error(next);
      store = next;
    }
    const mentorId = wall[0]!.careerId;
    const legacyProgram = wall[0]!.programIds[0]!;
    const next = ok(
      createCareerVNext(
        {
          seed: 'carry-2',
          identity: id,
          legacy: wall,
          bonusBudget: store.perks.perk_head_start!,
          mentorCareerId: mentorId,
          legacyOfferProgramId: legacyProgram,
          startGearIds: [VNEXT_COMMEMORATIVE_GEAR],
        },
        mechanics,
      ),
    );
    expect(next.athlete.creation).toMatchObject({
      bonusBudget: 1,
      mentorCareerId: mentorId,
      legacyOfferProgramId: legacyProgram,
    });
    expect(next.recruiting.offers.some(({ programId }) => programId === legacyProgram)).toBe(true);
    expect(next.shop?.equippedGearIds).toEqual([VNEXT_COMMEMORATIVE_GEAR]);
    // The chosen mentor checks in even at a school they never played for.
    const elsewhere = next.recruiting.offers.find(({ programId }) => programId !== legacyProgram)!;
    const career = ok(commitProgramVNext(next, elsewhere.programId, mechanics));
    let mentorVisits = 0;
    drive(career, (current) => {
      if (
        current.flow.type === 'EVENT' &&
        current.flow.event.mentorCareerId !== undefined &&
        current.flow.event.chosenChoiceId === null
      ) {
        expect(current.flow.event.mentorCareerId).toBe(mentorId);
        mentorVisits += 1;
      }
      return current.flow.type === 'OFFSEASON';
    });
    expect(mentorVisits).toBeGreaterThan(0);
  });
});
