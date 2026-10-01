import { describe, expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  chooseBreakthroughVNext,
  chooseCampVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitOffseasonVNext,
  commitProgramVNext,
  continueCampVNext,
  continueGameVNext,
  continueSeasonReviewVNext,
  createCareerVNext,
  decideMidseasonVNext,
  focusDefinitionsVNext,
  informationBaseScore,
  informationOutlookVNext,
  injuryRiskBreakdownVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  parseCareerVNext,
  planWeekVNext,
  potentialPermilleVNext,
  previewWeekPlanVNext,
  projectSnapBoardFrame,
  recommendedCampVNext,
  serializeCareerVNext,
  toGameDayVNext,
  VNEXT_BACKGROUND_PROFILES,
  VNEXT_DEVELOPMENT_CALENDAR,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type InformationPositionId,
  type PositionPlayerCreationIdentity,
  type VNextPositionId,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

const ok = (result: CareerVNextResult): CareerVNext => {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
};

function identity(
  positionId: VNextPositionId = 'position_cb',
  archetypeId = 'archetype_cb_press_man',
  recruitingBackgroundId = 'background_late_bloomer',
): PositionPlayerCreationIdentity {
  return {
    displayName: 'Calendar Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 186,
    weightKg: 88,
  } as PositionPlayerCreationIdentity;
}

function start(seed: string, id = identity()) {
  const mechanics = buildCareerVNextMechanics(id)!;
  const created = ok(createCareerVNext({ seed, identity: id }, mechanics));
  const committed = ok(
    commitProgramVNext(created, created.recruiting.offers[1]!.programId, mechanics),
  );
  return { mechanics, created, committed };
}

function plan(career: CareerVNext, mechanics: CareerVNextMechanics, include?: string): string[] {
  const open: readonly string[] = focusDefinitionsVNext(career, mechanics)
    .map(({ id }) => id)
    .filter((id) => isFocusAvailableVNext(career, id, mechanics));
  const drills = focusDefinitionsVNext(career, mechanics)
    .filter((entry) => 'positionId' in entry)
    .map(({ id }) => id as string)
    .filter((id) => open.includes(id));
  const picks = [include, drills[0], 'action_recovery'].filter(
    (id): id is string => id !== undefined && open.includes(id),
  );
  while (picks.length < 3) picks.push(open.find((id) => !picks.includes(id))!);
  return picks.slice(0, 3);
}

/** Plays forward with default choices until `stop` holds (or the season review). */
function drive(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  stop: (career: CareerVNext) => boolean,
  options: { readonly focus?: string; readonly acceptMidseason?: boolean } = {},
): CareerVNext {
  let current = career;
  for (let guard = 0; guard < 4_000 && !stop(current); guard += 1) {
    const flow = current.flow;
    if (flow.type === 'CAMP') current = ok(advanceCalendarVNext(current, mechanics)!);
    else if (flow.type === 'MIDSEASON')
      current = ok(decideMidseasonVNext(current, options.acceptMidseason ?? true));
    else if (flow.type === 'WEEK_PLAN')
      current = ok(planWeekVNext(current, plan(current, mechanics, options.focus), mechanics));
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
    else if (flow.type === 'OFFSEASON') break;
    else current = ok(toGameDayVNext(current, mechanics));
  }
  return current;
}

describe('M12 potential: what a recruiting background means after creation', () => {
  it('sets the first offers by recruit standing and the XP curve by season', () => {
    const blue = start('potential', identity(undefined, undefined, 'background_blue_chip_star'));
    const under = start(
      'potential',
      identity(undefined, undefined, 'background_under_recruited_athlete'),
    );
    const mean = (career: CareerVNext) =>
      career.recruiting.offers.reduce((sum, offer) => sum + offer.programRating, 0) / 4;
    // Same seed and nearly the same attributes: the blue-chip standing draws stronger suitors.
    expect(mean(blue.created)).toBeGreaterThan(mean(under.created));
    const late = VNEXT_BACKGROUND_PROFILES['background_late_bloomer']!.potentialPermille;
    expect(late[3]).toBeGreaterThan(late[0]);
    expect(potentialPermilleVNext(blue.committed)).toBe(1000);
    expect(potentialPermilleVNext(under.committed)).toBe(1100);
  });
});

describe('M12 preseason camp', () => {
  it('opens every season, trains at camp XP and starts the role battle', () => {
    const { mechanics, committed } = start('camp');
    expect(committed.flow).toEqual({ type: 'CAMP', report: null });
    // Recovery and study hall are not camp work.
    expect(
      chooseCampVNext(
        committed,
        ['action_recovery', 'action_film_study', 'action_film_study'],
        mechanics,
      ).ok,
    ).toBe(false);
    const picks = recommendedCampVNext(committed, mechanics);
    const camped = ok(chooseCampVNext(committed, picks, mechanics));
    expect(camped.flow.type).toBe('CAMP');
    if (camped.flow.type !== 'CAMP' || camped.flow.report === null) throw new Error('no report');
    const report = camped.flow.report;
    // Late bloomer freshman potential 95% × camp 150%.
    expect(report.xpPermille).toBe(
      Math.round((950 * VNEXT_DEVELOPMENT_CALENDAR.campXpPermille) / 1000),
    );
    expect(
      report.focuses.flatMap((focus) => focus.attributeXp).some(({ appliedXp }) => appliedXp > 0),
    ).toBe(true);
    // Camp includes its own recovery.
    expect(camped.athlete.profile.state.body).toBe(committed.athlete.profile.state.body);
    expect(camped.season.startRank).toBe(report.depth.rankAfter);
    expect(camped.development?.camps).toHaveLength(1);
    const week = ok(continueCampVNext(camped));
    expect(week.flow.type).toBe('WEEK_PLAN');
  });
});

describe('M12 midseason checkpoint and the coach’s focus', () => {
  it('stops after week six, and a met focus pays trust, XP and gauge on the settling week', () => {
    const { mechanics, committed } = start('midseason');
    const atMid = drive(committed, mechanics, (career) => career.flow.type === 'MIDSEASON');
    expect(atMid.flow.type).toBe('MIDSEASON');
    if (atMid.flow.type !== 'MIDSEASON') throw new Error('no review');
    expect(atMid.season.weekIndex).toBe(VNEXT_DEVELOPMENT_CALENDAR.midseasonWeek);
    const suggestion = atMid.flow.review.suggestion;
    const accepted = ok(decideMidseasonVNext(atMid, true));
    expect(accepted.development?.focus).toMatchObject({
      ...suggestion,
      outcome: 'ACTIVE',
      done: 0,
    });
    // Run the focus twice: the second week settles it.
    const first = ok(
      planWeekVNext(accepted, plan(accepted, mechanics, suggestion.focusId), mechanics),
    );
    if (first.flow.type !== 'PRACTICE_REPORT') throw new Error('no report');
    expect(first.flow.report.coachFocus).toMatchObject({
      counted: true,
      done: 1,
      outcome: 'ACTIVE',
    });
    const second = drive(
      first,
      mechanics,
      (career) => career.flow.type === 'PRACTICE_REPORT' && career.season.weekIndex === 7,
      { focus: suggestion.focusId },
    );
    if (second.flow.type !== 'PRACTICE_REPORT') throw new Error('no report');
    const settled = second.flow.report.coachFocus!;
    expect(settled.outcome).toBe('MET');
    expect(settled.trustDelta).toBe(VNEXT_DEVELOPMENT_CALENDAR.focusReward.trust);
    expect(second.development?.focus).toBeNull();
    expect(second.development?.focusHistory.at(-1)?.outcome).toBe('MET');
  }, 300_000);

  it('a declined focus changes nothing, and a missed one costs a point of trust', () => {
    const { mechanics, committed } = start('midseason-miss');
    const atMid = drive(committed, mechanics, (career) => career.flow.type === 'MIDSEASON');
    const declined = ok(decideMidseasonVNext(atMid, false));
    expect(declined.development?.focus).toBeNull();
    expect(declined.development?.reviews.at(-1)?.decision).toBe('DECLINED');
    // Accept, then never run it.
    if (atMid.flow.type !== 'MIDSEASON') throw new Error('no review');
    const avoid = atMid.flow.review.suggestion.focusId;
    const accepted = ok(decideMidseasonVNext(atMid, true));
    let career = accepted;
    let missed = null;
    for (let guard = 0; guard < 500 && missed === null; guard += 1) {
      if (career.flow.type === 'WEEK_PLAN') {
        const open: readonly string[] = focusDefinitionsVNext(career, mechanics)
          .map(({ id }) => id)
          .filter((id) => id !== avoid && isFocusAvailableVNext(career, id, mechanics));
        career = ok(planWeekVNext(career, [open[0]!, open[1]!, open[2]!], mechanics));
        if (
          career.flow.type === 'PRACTICE_REPORT' &&
          career.flow.report.coachFocus?.outcome === 'MISSED'
        )
          missed = career.flow.report.coachFocus;
      } else career = drive(career, mechanics, (next) => next.flow.type === 'WEEK_PLAN');
    }
    expect(missed).toMatchObject({
      outcome: 'MISSED',
      trustDelta: VNEXT_DEVELOPMENT_CALENDAR.focusMissTrust,
    });
  }, 300_000);
});

describe('M12 offseason programs', () => {
  it('trade XP for where next season starts, and the old two-argument commit still works', () => {
    const { mechanics, committed } = start(
      'offseason',
      identity('position_rb', 'archetype_rb_power_back'),
    );
    const offseason = drive(committed, mechanics, (career) => career.flow.type === 'OFFSEASON');
    expect(offseason.flow.type).toBe('OFFSEASON');
    if (offseason.flow.type !== 'OFFSEASON') throw new Error('no offseason');
    const stay = offseason.flow.options[0]!.programId;
    const plain = ok(commitOffseasonVNext(offseason, stay, mechanics));
    const strength = ok(commitOffseasonVNext(offseason, stay, mechanics, 'offseason_strength'));
    expect(plain.flow).toEqual({ type: 'CAMP', report: null });
    expect(plain.athlete.profile.state.body).toBe(100);
    expect(strength.athlete.profile.state.body).toBe(90);
    const total = (career: CareerVNext, id: string) => {
      const entry = (
        career.athlete.profile.attributes as Record<string, { rating: number; xp: number }>
      )[id]!;
      return entry.rating * 100 + entry.xp;
    };
    expect(total(strength, 'attribute_strength')).toBeGreaterThan(
      total(plain, 'attribute_strength'),
    );
    expect(strength.development?.offseason.at(-1)?.programId).toBe('offseason_strength');
    expect(commitOffseasonVNext(offseason, stay, mechanics, 'offseason_bogus' as never).ok).toBe(
      false,
    );
  }, 300_000);
});

describe('M12 explanations agree with the rules', () => {
  it('the plan preview is the planning command, and the risk parts add up to the risk', () => {
    const { mechanics, committed } = start('preview');
    const week = drive(committed, mechanics, (career) => career.flow.type === 'WEEK_PLAN');
    const picks = plan(week, mechanics);
    const preview = previewWeekPlanVNext(week, picks, mechanics)!;
    const planned = ok(planWeekVNext(week, picks, mechanics));
    if (planned.flow.type !== 'PRACTICE_REPORT') throw new Error('no report');
    expect(preview.focuses).toEqual(planned.flow.report.focuses);
    expect(preview.body.after).toBe(planned.athlete.profile.state.body);
    const breakdown = injuryRiskBreakdownVNext(week, 30, mechanics)!;
    const sum =
      breakdown.base +
      breakdown.bodyDeficit +
      breakdown.durability +
      breakdown.workload +
      breakdown.trainingLoad +
      breakdown.positionExposure;
    expect(breakdown.total).toBe(
      Math.min(350, Math.round((sum * breakdown.cardMultiplierPermille) / 1000)),
    );
  }, 300_000);

  it('the next-tell requirement is exactly what the kernels need', () => {
    for (const [positionId, archetypeId] of [
      ['position_qb', 'archetype_qb_field_general'],
      ['position_cb', 'archetype_cb_press_man'],
      ['position_wr', 'archetype_wr_deep_threat'],
      ['position_edge', 'archetype_edge_speed_rusher'],
    ] as const) {
      const { committed } = start(`tell-${positionId}`, identity(positionId, archetypeId));
      for (const preparation of [0, 20, 40, 60, 80]) {
        const career = {
          ...committed,
          athlete: {
            ...committed.athlete,
            profile: {
              ...committed.athlete.profile,
              state: { ...committed.athlete.profile.state, preparation },
            },
          },
        };
        const outlook = informationOutlookVNext(career);
        if (outlook.nextAt === null || outlook.preparationNeeded === null) continue;
        const score = (prep: number) =>
          informationBaseScore(
            positionId as InformationPositionId,
            career.athlete.profile.attributes,
            prep,
          );
        expect(score(preparation + outlook.preparationNeeded)).toBeGreaterThanOrEqual(
          outlook.nextAt,
        );
        expect(score(preparation + outlook.preparationNeeded - 1)).toBeLessThan(outlook.nextAt);
      }
    }
  });
});

describe('M12 compatibility: a pre-M12 save continues', () => {
  it('a save without development reaches its midseason checkpoint and round-trips', () => {
    const { mechanics, committed } = start('legacy-save');
    const week = drive(committed, mechanics, (career) => career.flow.type === 'WEEK_PLAN');
    // A pre-M12 save: no development state and no saved looks.
    const { development: _omit, ...rest } = week;
    void _omit;
    const old = parseCareerVNext(JSON.stringify(rest))!;
    expect(old).not.toBeNull();
    expect(old.development).toBeUndefined();
    const atMid = drive(old, mechanics, (career) => career.flow.type === 'MIDSEASON');
    expect(atMid.flow.type).toBe('MIDSEASON');
    expect(atMid.development).toBeDefined();
    const json = serializeCareerVNext(atMid)!;
    expect(parseCareerVNext(json)).toEqual(atMid);
  }, 300_000);
});
