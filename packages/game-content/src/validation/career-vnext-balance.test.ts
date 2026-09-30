import { expect, it } from 'vitest';
import {
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseNilVNext,
  chooseInjuryVNext,
  chooseSnapVNext,
  commitProgramVNext,
  derivePositionOverall,
  continueGameVNext,
  createCareerVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextMechanics,
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

type Strategy = 'grind' | 'balanced' | 'coach' | 'study';

function plan(career: CareerVNext, mechanics: CareerVNextMechanics, strategy: Strategy): string[] {
  const all = focusDefinitionsVNext(career, mechanics);
  const open = all.filter(({ id }) => isFocusAvailableVNext(career, id, mechanics));
  const position = open.filter((entry) => 'positionId' in entry).map(({ id }) => id);
  const has = (id: string) => open.some((entry) => entry.id === id);
  const body = career.athlete.profile.state.body;
  const pick = (ids: (string | undefined)[]) => {
    const chosen = ids.filter((id): id is string => id !== undefined && has(id));
    while (chosen.length < 3) chosen.push(open[chosen.length]!.id);
    return chosen.slice(0, 3);
  };
  switch (strategy) {
    case 'grind':
      return pick([position[0], position[1], position[2]]);
    case 'balanced':
      return pick([position[0], position[1], 'action_recovery']);
    case 'coach':
      return pick([position[0], 'action_film_study', body < 60 ? 'action_recovery' : position[1]]);
    case 'study':
      return pick([position[0], 'action_film_study', 'action_study_hall']);
  }
}

/**
 * Balance harness (R1.6): batch seasons per position and focus strategy. The bands below are the
 * product intent; the printed table is the tuning evidence (see DECISION_LOG 2026-09-30).
 */
it('keeps Body a budget, trust recoverable, growth visible and Saturdays decisive', () => {
  const summary: Record<
    string,
    { body: number; injuries: number; trust: number; ovr: number; live: number }
  > = {};
  const out = (globalThis as unknown as { process: { stdout: { write: (t: string) => void } } })
    .process.stdout;
  const rows: string[] = [];
  for (const [positionId, archetypeId] of identities)
    for (const strategy of ['grind', 'balanced', 'coach', 'study'] as const) {
      const stats = {
        seasons: 0,
        kickoffBody: [] as number[],
        lowBodyWeeks: 0,
        weeks: 0,
        injuries: 0,
        trustEnd: [] as number[],
        rankStart: [] as number[],
        rankEnd: [] as number[],
        ovrGain: [] as number[],
        grades: [] as number[],
        liveGames: 0,
        games: 0,
        fGrades: 0,
        liveSnaps: 0,
        wins: 0,
        prepKick: [] as number[],
        confEnd: [] as number[],
        ratingGain: [] as number[],
        talentGain: [] as number[],
        derivedGain: [] as number[],
        attrCount: 0,
      };
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
        const ok = (result: CareerVNextResult) => {
          if (!result.ok) throw new Error(result.reason);
          return result.career;
        };
        let career = ok(
          createCareerVNext({ seed: `bal-${positionId}-${attempt}`, identity }, mechanics),
        );
        career = ok(
          commitProgramVNext(
            career,
            career.recruiting.offers[1 + (attempt % 3)]!.programId,
            mechanics,
          ),
        );
        stats.rankStart.push(career.program!.room.projection.rank);
        const ovrStart = career.season.startOverall;
        const ratingSum = (c: CareerVNext) =>
          Object.values(c.athlete.profile.attributes).reduce(
            (sum, entry) => sum + (entry?.rating ?? 0),
            0,
          );
        const ratingsStart = ratingSum(career);
        const talent = (c: CareerVNext) =>
          c.program!.room.evaluations.find(
            ({ participantId }) => participantId === c.program!.room.playerId,
          )!.components.talentFit;
        const talentStart = talent(career);
        const derivedStart = derivePositionOverall(
          career.athlete.profile.positionId,
          career.athlete.profile.attributes,
        );
        for (let guard = 0; guard < 2_000 && career.flow.type !== 'SEASON_REVIEW'; guard += 1) {
          const flow = career.flow;
          if (flow.type === 'WEEK_PLAN') {
            stats.weeks += 1;
            career = ok(planWeekVNext(career, plan(career, mechanics, strategy), mechanics));
          } else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
            career = ok(chooseBreakthroughVNext(career, flow.offer.skillIds[0]!));
          else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
            career = ok(chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics));
          else if (flow.type === 'NIL' && flow.offer.decision === null)
            career = ok(chooseNilVNext(career, true, mechanics));
          else if (flow.type === 'INJURY' && flow.report.availability === null)
            career = ok(chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics));
          else if (flow.type === 'GAME') {
            if (flow.game.stage === 'PREGAME') {
              stats.kickoffBody.push(career.athlete.profile.state.body);
              stats.prepKick.push(career.athlete.profile.state.preparation);
              if (career.athlete.profile.state.body < 30) stats.lowBodyWeeks += 1;
              career = ok(kickoffVNext(career, mechanics));
            } else if (flow.game.stage === 'SNAP') {
              const frame = projectSnapBoardFrame(career, mechanics)!;
              // A thoughtful player: sideline best read, live decisions rotate.
              const choice =
                frame.kind === 'SIDELINE' && career.flow.type === 'GAME'
                  ? career.flow.game.sideline[frame.repNumber - 1]!.bestDecisionId
                  : frame.decisionIds[frame.kind === 'LIVE' ? frame.snapNumber % 3 : 0]!;
              career = ok(chooseSnapVNext(career, choice, mechanics));
            } else career = ok(continueGameVNext(career, mechanics));
          } else if (flow.type === 'POST_GAME') {
            const recap = flow.recap;
            stats.games += 1;
            if (recap.liveSnapCount > 0) {
              stats.liveGames += 1;
              stats.liveSnaps += recap.liveSnapCount;
              if (recap.engine.game.type === 'COMPLETE') {
                const grade = recap.engine.game.summary.gradeScore;
                stats.grades.push(grade);
                if (grade < 50) stats.fGrades += 1;
              }
            }
            if (recap.resultId === 'game_result_win') stats.wins += 1;
            career = ok(nextWeekVNext(career, mechanics));
          } else career = ok(toGameDayVNext(career, mechanics));
        }
        stats.seasons += 1;
        stats.injuries += career.condition.injuryHistory.length;
        stats.trustEnd.push(career.athlete.profile.state.coachTrust);
        stats.confEnd.push(career.athlete.profile.state.confidence);
        stats.rankEnd.push(career.program!.room.projection.rank);
        if (career.flow.type === 'SEASON_REVIEW')
          stats.ovrGain.push(career.flow.review.overall.end - ovrStart);
        stats.ratingGain.push(ratingSum(career) - ratingsStart);
        stats.talentGain.push(talent(career) - talentStart);
        const derivedEnd = derivePositionOverall(
          career.athlete.profile.positionId,
          career.athlete.profile.attributes,
        );
        if (derivedStart.ok && derivedEnd.ok)
          stats.derivedGain.push(derivedEnd.overall - derivedStart.overall);
        stats.attrCount = Object.keys(career.athlete.profile.attributes).length;
      }
      const avg = (values: number[]) =>
        values.length === 0
          ? 'n/a'
          : (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
      const mean = (values: number[]) =>
        values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
      summary[`${positionId}:${strategy}`] = {
        body: mean(stats.kickoffBody),
        injuries: stats.injuries / stats.seasons,
        trust: mean(stats.trustEnd),
        ovr: mean(stats.ovrGain),
        live: stats.liveGames / Math.max(1, stats.games),
      };
      rows.push(
        [
          positionId.slice(9),
          strategy.padEnd(8),
          `body@kick ${avg(stats.kickoffBody)}`,
          `low ${((stats.lowBodyWeeks / Math.max(1, stats.kickoffBody.length)) * 100).toFixed(0)}%`,
          `prep ${avg(stats.prepKick)}`,
          `inj/s ${(stats.injuries / stats.seasons).toFixed(2)}`,
          `trust ${avg(stats.trustEnd)}`,
          `conf ${avg(stats.confEnd)}`,
          `rank ${avg(stats.rankStart)}->${avg(stats.rankEnd)}`,
          `ovr+ ${avg(stats.ovrGain)} (derived ${avg(stats.derivedGain)}, ratings+ ${avg(stats.ratingGain)}/${stats.attrCount}, talent+ ${avg(stats.talentGain)})`,
          `grade ${avg(stats.grades)}`,
          `F ${stats.fGrades}/${stats.grades.length}`,
          `live ${stats.liveGames}/${stats.games}`,
          `snaps/g ${(stats.liveSnaps / Math.max(1, stats.liveGames)).toFixed(1)}`,
        ].join(' | '),
      );
    }
  out.write(`BALANCE\n${rows.join('\n')}\n`);
  for (const [positionId] of identities) {
    const grind = summary[`${positionId}:grind`]!;
    const balanced = summary[`${positionId}:balanced`]!;
    const coach = summary[`${positionId}:coach`]!;
    // Body is a budget: grinding empties it, a balanced plan keeps it usable.
    expect(grind.body, positionId).toBeLessThan(30);
    expect(balanced.body, positionId).toBeGreaterThan(40);
    expect(coach.body, positionId).toBeGreaterThan(40);
    // Injuries follow Body.
    expect(grind.injuries, positionId).toBeGreaterThan(balanced.injuries);
    expect(balanced.injuries, positionId).toBeLessThanOrEqual(1.5);
    // Trust is recoverable with sensible plans; growth is visible in a season.
    expect(balanced.trust, positionId).toBeGreaterThanOrEqual(15);
    expect(coach.trust, positionId).toBeGreaterThanOrEqual(15);
    expect(balanced.ovr, positionId).toBeGreaterThanOrEqual(2);
    // Saturdays have live football for sensible plans most weeks.
    expect(balanced.live, positionId).toBeGreaterThan(0.75);
  }
}, 900_000);
