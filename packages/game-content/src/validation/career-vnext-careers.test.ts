import { expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  bestDecisionOfLook,
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
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

const identities = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_wr', 'archetype_wr_deep_threat'],
  ['position_cb', 'archetype_cb_press_man'],
  ['position_lb', 'archetype_lb_run_stopper'],
  ['position_edge', 'archetype_edge_speed_rusher'],
] as const;

/**
 * Six-position multi-season harness (M8 step 6): full four-year careers with a thoughtful player
 * (balanced plans, sideline best reads, accepts NIL, climbs to the strongest transfer option).
 * The printed table is the tuning evidence; the bands are the product intent at scale.
 */
it('plays full six-position careers inside the product bands', () => {
  const rows: string[] = [];
  // Variation evidence across careers (M9 gate).
  const firstPrograms = new Set<string>();
  const eventIds = new Set<string>();
  const records = new Set<string>();
  const draftOutcomes = new Set<string>();
  const outcome = {
    careers: 0,
    seasons: 0,
    postseasonSeasons: 0,
    ties: 0,
    nilCareers: 0,
    drafted: 0,
    stockScores: [] as number[],
    awardSeasons: 0,
    awards: [] as string[],
    grades: [] as number[],
    finalOverall: [] as number[],
  };
  for (const [positionId, archetypeId] of identities)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const identity = {
        displayName: 'Marcus Hale',
        positionId,
        archetypeId,
        recruitingBackgroundId: 'background_late_bloomer',
        personalityTraitIds: ['personality_disciplined', 'personality_leader'],
        appearance: defaultWrAppearance,
        heightCm: 188,
        weightKg: 92,
      } as PositionPlayerCreationIdentity;
      const mechanics = buildCareerVNextMechanics(identity)!;
      const ok = (result: CareerVNextResult): CareerVNext => {
        if (!result.ok) throw new Error(result.reason);
        return result.career;
      };
      let career = ok(
        createCareerVNext({ seed: `careers-${positionId}-${attempt}`, identity }, mechanics),
      );
      // The strongest program that offered.
      const best = [...career.recruiting.offers].sort(
        (a, b) => b.programRating - a.programRating,
      )[0]!;
      career = ok(commitProgramVNext(career, best.programId, mechanics));
      firstPrograms.add(best.programId);
      for (let guard = 0; guard < 6_000 && career.flow.type !== 'CAREER_COMPLETE'; guard += 1) {
        const flow = career.flow;
        if (flow.type === 'WEEK_PLAN') {
          const all = focusDefinitionsVNext(career, mechanics);
          const open = all.filter(({ id }) => isFocusAvailableVNext(career, id, mechanics));
          const drills = open.filter((entry) => 'positionId' in entry).map(({ id }) => id);
          const ids: readonly string[] = open.map(({ id }) => id);
          const plan = [drills[0], drills[1], 'action_recovery'].filter(
            (id): id is string => id !== undefined && ids.includes(id),
          );
          while (plan.length < 3) plan.push(ids.find((id) => !plan.includes(id))!);
          career = ok(planWeekVNext(career, plan, mechanics));
        } else if (flow.type === 'CAMP' || flow.type === 'MIDSEASON') {
          career = ok(advanceCalendarVNext(career, mechanics)!);
        } else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
          career = ok(chooseBreakthroughVNext(career, flow.offer.skillIds[0]!));
        else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
          career = ok(chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics));
        else if (flow.type === 'NIL' && flow.offer.decision === null)
          career = ok(chooseNilVNext(career, true, mechanics));
        else if (flow.type === 'INJURY' && flow.report.availability === null)
          career = ok(chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics));
        else if (flow.type === 'GAME') {
          if (flow.game.stage === 'PREGAME') career = ok(kickoffVNext(career, mechanics));
          else if (flow.game.stage === 'SNAP') {
            const frame = projectSnapBoardFrame(career, mechanics)!;
            // A decent player: reads two looks in three right (grades weigh the read).
            const look =
              frame.kind === 'LIVE' && frame.snapNumber % 3 !== 0 && frame.look !== null
                ? mechanics.looks.looks.find(({ id }) => id === frame.look!.lookId)
                : undefined;
            const choice =
              frame.kind === 'SIDELINE'
                ? flow.game.sideline[frame.repNumber - 1]!.bestDecisionId
                : look !== undefined
                  ? bestDecisionOfLook(look)
                  : frame.decisionIds[frame.snapNumber % 3]!;
            career = ok(chooseSnapVNext(career, choice, mechanics));
          } else career = ok(continueGameVNext(career, mechanics));
        } else if (flow.type === 'POST_GAME') career = ok(nextWeekVNext(career, mechanics));
        else if (flow.type === 'SEASON_REVIEW')
          career = ok(continueSeasonReviewVNext(career, mechanics));
        else if (flow.type === 'OFFSEASON') {
          const pick = [...flow.options].sort((a, b) => b.programRating - a.programRating)[0]!;
          career = ok(commitOffseasonVNext(career, pick.programId, mechanics));
        } else career = ok(toGameDayVNext(career, mechanics));
      }
      if (career.flow.type !== 'CAREER_COMPLETE') throw new Error('career did not complete');
      const alumni = career.flow.alumni;
      outcome.careers += 1;
      outcome.seasons += career.history.length;
      outcome.postseasonSeasons += career.history.filter(
        ({ finish }) => finish !== 'MISSED',
      ).length;
      outcome.ties += alumni.record.ties;
      if ((career.nil?.history ?? []).some(({ outcome: kind }) => kind === 'ACCEPTED'))
        outcome.nilCareers += 1;
      if (alumni.draft?.round !== null && alumni.draft !== undefined) outcome.drafted += 1;
      outcome.stockScores.push(career.history.at(-1)!.draftStock!.score);
      outcome.awardSeasons += career.history.filter(({ awards = [] }) => awards.length > 0).length;
      outcome.awards.push(...(alumni.awards ?? []));
      for (const { eventId } of career.condition.eventHistory) eventIds.add(eventId);
      records.add(JSON.stringify(career.history.map(({ record }) => record)));
      draftOutcomes.add(String(alumni.draft?.round ?? 'undrafted'));
      outcome.grades.push(...career.history.map(({ averageGrade }) => averageGrade ?? 0));
      outcome.finalOverall.push(alumni.finalOverall);
      rows.push(
        `${positionId.padEnd(13)} ${attempt} | ${career.history
          .map(
            ({ record, finish, finalRank }) =>
              `${record.wins}-${record.losses} ${finish}${finalRank !== null && finalRank <= 25 ? `#${finalRank}` : ''}`,
          )
          .join(
            ' / ',
          )} | ovr ${alumni.finalOverall} | stock ${career.history.at(-1)!.draftStock!.score} | draft ${alumni.draft?.round ?? 'UDFA'} | nil $${career.nil?.fundsUsd ?? 0} brand ${career.athlete.profile.state.brand}`,
      );
    }
  (
    globalThis as unknown as { process: { stdout: { write: (text: string) => void } } }
  ).process.stdout.write(`CAREERS\n${rows.join('\n')}\n${JSON.stringify(outcome)}\n`);
  expect(outcome.careers).toBe(12);
  expect(outcome.seasons).toBe(48);
  // Overtime: no ties at scale.
  expect(outcome.ties).toBe(0);
  // A climbing career reaches the bracket sometimes, but it is earned, not routine.
  expect(outcome.postseasonSeasons).toBeGreaterThan(0);
  expect(outcome.postseasonSeasons).toBeLessThan(outcome.seasons * 0.6);
  // NIL reaches most careers that play.
  expect(outcome.nilCareers).toBeGreaterThanOrEqual(6);
  // Awards are earned, not handed out: some seasons, far from all.
  expect(outcome.awardSeasons).toBeGreaterThan(0);
  expect(outcome.awardSeasons).toBeLessThan(outcome.seasons * 0.4);
  // The draft is a real outcome for some, not all.
  expect(outcome.drafted).toBeGreaterThan(0);
  expect(outcome.drafted).toBeLessThan(12);
  // Repeated careers vary: where they start, what happens to them, and how they end.
  expect(firstPrograms.size).toBeGreaterThanOrEqual(8);
  expect(records.size).toBe(12);
  expect(eventIds.size).toBeGreaterThanOrEqual(40);
  expect(draftOutcomes.size).toBeGreaterThanOrEqual(3);
}, 900_000);
