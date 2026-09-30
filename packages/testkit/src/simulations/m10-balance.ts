import {
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
  type CareerVNextMechanics,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';
import {
  buildCareerVNextMechanics,
  defaultWrAppearance,
} from '@project-saturday/game-content/content';

/**
 * M10 balance at scale: full four-year Career VNext careers for all six positions under three
 * weekly strategies and two seeds (36 careers). Every career is deterministic from its seed; the
 * report is the checked evidence for the release balance bands.
 */
export const M10_BALANCE_POSITIONS = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_wr', 'archetype_wr_deep_threat'],
  ['position_cb', 'archetype_cb_press_man'],
  ['position_lb', 'archetype_lb_run_stopper'],
  ['position_edge', 'archetype_edge_speed_rusher'],
] as const;
export const M10_BALANCE_STRATEGIES = ['balanced', 'grind', 'study'] as const;
export type M10BalanceStrategy = (typeof M10_BALANCE_STRATEGIES)[number];
export const M10_BALANCE_SEEDS = ['m10-balance-a', 'm10-balance-b'] as const;

export interface M10BalanceSeason {
  readonly wins: number;
  readonly losses: number;
  readonly finish: string;
  readonly finalRank: number | null;
  readonly depthEnd: number;
  readonly overallEnd: number;
  readonly averageGrade: number | null;
  readonly awards: number;
  readonly injuries: number;
  readonly conferenceChampion: boolean;
}

export interface M10BalanceCareer {
  readonly positionId: string;
  readonly strategy: M10BalanceStrategy;
  readonly seed: string;
  readonly seasons: readonly M10BalanceSeason[];
  readonly ending: string;
  readonly draftRound: number | null;
  readonly stockScore: number;
  readonly nilDeals: number;
  readonly nilFunds: number;
  readonly brandEnd: number;
  readonly meanKickoffConfidence: number;
  readonly meanKickoffBody: number;
  readonly events: number;
}

export interface M10BalanceSummary {
  readonly reportId: 'm10_balance_v1';
  readonly careers: number;
  readonly seasons: number;
  readonly bracketSeasonRate: number;
  readonly awardSeasonRate: number;
  readonly starterSeasonRate: number;
  readonly draftedRate: number;
  readonly firstRoundRate: number;
  readonly nilCareerRate: number;
  readonly meanBrandEnd: number;
  readonly meanKickoffConfidence: number;
  readonly meanOverallGrowthPerSeason: number;
  readonly injuriesPerSeasonByStrategy: Readonly<Record<M10BalanceStrategy, number>>;
  readonly meanKickoffBodyByStrategy: Readonly<Record<M10BalanceStrategy, number>>;
}

const permille = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part * 1_000) / whole);
const mean = (values: readonly number[]) =>
  values.length === 0
    ? 0
    : Math.round((values.reduce((sum, value) => sum + value, 0) * 10) / values.length) / 10;

function plan(career: CareerVNext, mechanics: CareerVNextMechanics, strategy: M10BalanceStrategy) {
  const open = focusDefinitionsVNext(career, mechanics).filter(({ id }) =>
    isFocusAvailableVNext(career, id, mechanics),
  );
  const ids: readonly string[] = open.map(({ id }) => id);
  const drills = open.filter((entry) => 'positionId' in entry).map(({ id }) => id);
  const wanted =
    strategy === 'balanced'
      ? [drills[0], drills[1], 'action_recovery']
      : strategy === 'grind'
        ? [drills[0], drills[1], drills[2]]
        : [drills[0], 'action_film_study', 'action_study_hall'];
  const chosen = wanted.filter((id): id is string => id !== undefined && ids.includes(id));
  while (chosen.length < 3) chosen.push(ids.find((id) => !chosen.includes(id))!);
  return chosen;
}

export function runM10BalanceCareer(
  positionId: string,
  archetypeId: string,
  strategy: M10BalanceStrategy,
  seed: string,
): M10BalanceCareer {
  const identity = {
    displayName: 'Balance Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  } as PositionPlayerCreationIdentity;
  const mechanics = buildCareerVNextMechanics(identity);
  if (mechanics === null) throw new Error('mechanics');
  const ok = (result: CareerVNextResult): CareerVNext => {
    if (!result.ok) throw new Error(`${positionId} ${strategy} ${seed}: ${result.reason}`);
    return result.career;
  };
  let career = ok(
    createCareerVNext({ seed: `${seed}:${positionId}:${strategy}`, identity }, mechanics),
  );
  const offer = [...career.recruiting.offers].sort((a, b) => b.programRating - a.programRating)[
    strategy === 'balanced' ? 0 : 1
  ]!;
  career = ok(commitProgramVNext(career, offer.programId, mechanics));
  const kickoffConfidence: number[] = [];
  const kickoffBody: number[] = [];
  let events = 0;
  for (let guard = 0; guard < 8_000 && career.flow.type !== 'CAREER_COMPLETE'; guard += 1) {
    const flow = career.flow;
    if (flow.type === 'WEEK_PLAN')
      career = ok(planWeekVNext(career, plan(career, mechanics, strategy), mechanics));
    else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      career = ok(chooseBreakthroughVNext(career, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null) {
      events += 1;
      career = ok(chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics));
    } else if (flow.type === 'NIL' && flow.offer.decision === null)
      career = ok(chooseNilVNext(career, strategy !== 'study', mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      career = ok(chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics));
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') {
        kickoffConfidence.push(career.athlete.profile.state.confidence);
        kickoffBody.push(career.athlete.profile.state.body);
        career = ok(kickoffVNext(career, mechanics));
      } else if (flow.game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(career)!;
        const choice =
          frame.kind === 'SIDELINE'
            ? flow.game.sideline[frame.repNumber - 1]!.bestDecisionId
            : frame.decisionIds[frame.snapNumber % 3]!;
        career = ok(chooseSnapVNext(career, choice));
      } else career = ok(continueGameVNext(career, mechanics));
    } else if (flow.type === 'POST_GAME') career = ok(nextWeekVNext(career, mechanics));
    else if (flow.type === 'SEASON_REVIEW')
      career = ok(continueSeasonReviewVNext(career, mechanics));
    else if (flow.type === 'OFFSEASON') {
      // Balanced climbs to the strongest option; the others stay.
      const pick =
        strategy === 'balanced'
          ? [...flow.options].sort((a, b) => b.programRating - a.programRating)[0]!
          : flow.options[0]!;
      career = ok(commitOffseasonVNext(career, pick.programId, mechanics));
    } else career = ok(toGameDayVNext(career, mechanics));
  }
  if (career.flow.type !== 'CAREER_COMPLETE') throw new Error('career did not complete');
  const alumni = career.flow.alumni;
  return {
    positionId,
    strategy,
    seed,
    seasons: career.history.map((review) => ({
      wins: review.record.wins,
      losses: review.record.losses,
      finish: review.finish,
      finalRank: review.finalRank,
      depthEnd: review.depthRank.end,
      overallEnd: review.overall.end,
      averageGrade: review.averageGrade ?? null,
      awards: review.awards?.length ?? 0,
      injuries: review.injuries,
      conferenceChampion: review.conferenceChampion === true,
    })),
    ending: alumni.ending ?? 'GRADUATED',
    draftRound: alumni.draft?.round ?? null,
    stockScore: career.history.at(-1)?.draftStock?.score ?? 0,
    nilDeals: (career.nil?.history ?? []).filter(({ outcome }) => outcome === 'ACCEPTED').length,
    nilFunds: career.nil?.fundsUsd ?? 0,
    brandEnd: career.athlete.profile.state.brand,
    meanKickoffConfidence: mean(kickoffConfidence),
    meanKickoffBody: mean(kickoffBody),
    events,
  };
}

export function runM10BalanceReport(): {
  readonly summary: M10BalanceSummary;
  readonly careers: readonly M10BalanceCareer[];
} {
  const careers: M10BalanceCareer[] = [];
  for (const [positionId, archetypeId] of M10_BALANCE_POSITIONS)
    for (const strategy of M10_BALANCE_STRATEGIES)
      for (const seed of M10_BALANCE_SEEDS)
        careers.push(runM10BalanceCareer(positionId, archetypeId, strategy, seed));
  const seasons = careers.flatMap(({ seasons: list }) => list);
  const byStrategy = (strategy: M10BalanceStrategy) =>
    careers.filter((entry) => entry.strategy === strategy);
  const injuriesPerSeason = (strategy: M10BalanceStrategy) => {
    const list = byStrategy(strategy).flatMap(({ seasons: entries }) => entries);
    return mean([list.reduce((sum, { injuries }) => sum + injuries, 0) / Math.max(1, list.length)]);
  };
  const summary: M10BalanceSummary = {
    reportId: 'm10_balance_v1',
    careers: careers.length,
    seasons: seasons.length,
    bracketSeasonRate: permille(
      seasons.filter(({ finish }) => finish !== 'MISSED').length,
      seasons.length,
    ),
    awardSeasonRate: permille(seasons.filter(({ awards }) => awards > 0).length, seasons.length),
    starterSeasonRate: permille(
      seasons.filter(({ depthEnd }) => depthEnd === 1).length,
      seasons.length,
    ),
    draftedRate: permille(
      careers.filter(({ draftRound }) => draftRound !== null).length,
      careers.length,
    ),
    firstRoundRate: permille(
      careers.filter(({ draftRound }) => draftRound === 1).length,
      careers.length,
    ),
    nilCareerRate: permille(careers.filter(({ nilDeals }) => nilDeals > 0).length, careers.length),
    meanBrandEnd: mean(careers.map(({ brandEnd }) => brandEnd)),
    meanKickoffConfidence: mean(careers.map(({ meanKickoffConfidence }) => meanKickoffConfidence)),
    meanOverallGrowthPerSeason: mean(
      careers.map(
        ({ seasons: list }) =>
          (list.at(-1)!.overallEnd - list[0]!.overallEnd) / Math.max(1, list.length - 1),
      ),
    ),
    injuriesPerSeasonByStrategy: {
      balanced: injuriesPerSeason('balanced'),
      grind: injuriesPerSeason('grind'),
      study: injuriesPerSeason('study'),
    },
    meanKickoffBodyByStrategy: {
      balanced: mean(byStrategy('balanced').map(({ meanKickoffBody }) => meanKickoffBody)),
      grind: mean(byStrategy('grind').map(({ meanKickoffBody }) => meanKickoffBody)),
      study: mean(byStrategy('study').map(({ meanKickoffBody }) => meanKickoffBody)),
    },
  };
  return { summary, careers };
}

/** JSONL: the summary line, then one line per career. */
export function formatM10BalanceReport(report: ReturnType<typeof runM10BalanceReport>): string {
  return [report.summary, ...report.careers].map((entry) => JSON.stringify(entry)).join('\n');
}
