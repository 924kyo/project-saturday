import { describe, expect, it } from 'vitest';
import {
  bestDecisionOfLook,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
  explainCurrentSnapVNext,
  explainLivePlayVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  livePlayFrame,
  nextWeekVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  selectGameHighlightsVNext,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
  type VNextPositionId,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

function identityFor(
  positionId: VNextPositionId,
  archetypeId: string,
): PositionPlayerCreationIdentity {
  return {
    displayName: 'Branch Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  } as PositionPlayerCreationIdentity;
}

const situation = {
  period: 3 as const,
  secondsRemaining: 400,
  offense: 'PLAYER' as const,
  down: 3 as const,
  distanceYards: 6,
  lineOfScrimmageYards: 40,
  firstDownYards: 46,
  score: { playerTeam: 10, opponent: 14 },
};

function syntheticExplain(
  positionId: VNextPositionId,
  mechanics: CareerVNextMechanics,
  play: Record<string, unknown>,
  fit: number,
  before: typeof situation = situation,
) {
  const tactical = {
    before: { revealedClueIds: ['a', 'b'], score: situation.score },
    scoreAfter: situation.score,
    ball: { endLineYards: 40, offenseYards: 0, outcome: 'STOPPED' },
    possessionOutcome: 'RETAINED',
  };
  const full = { decisionFit: fit, tacticalResult: tactical, ...play };
  const frame = livePlayFrame(positionId, full as never)!;
  return explainLivePlayVNext({
    positionId,
    play: full,
    frame,
    before,
    seenTells: 2,
    look: null,
    attributes: {},
    mechanics,
  });
}

describe('M12 the down, from the team point of view (regression report)', () => {
  const qb = () =>
    buildCareerVNextMechanics(identityFor('position_qb', 'archetype_qb_field_general'))!;
  const qbPlay = (
    mechanics: CareerVNextMechanics,
    playResult: string,
    yards: Record<string, number>,
  ) => ({
    decisionId: mechanics.qb.decisions[0]!.id,
    patternId: mechanics.qb.patterns[0]!.id,
    familyId: mechanics.qb.patterns[0]!.familyId,
    playResult,
    ...yards,
    resolution: { finalScore: 60 },
  });
  it('a 7-yard completion on 3rd & 15 is short of the sticks, and the down is lost', () => {
    const mechanics = qb();
    const explained = syntheticExplain(
      'position_qb',
      mechanics,
      qbPlay(mechanics, 'COMPLETION', { passingYardsDelta: 7 }),
      92,
      { ...situation, down: 3, distanceYards: 15, firstDownYards: 55 },
    );
    expect(explained.execution.verdict).toBe('WON');
    expect(explained.situation).toMatchObject({ kind: 'SHORT_OF_STICKS', team: 'LOST', yards: 7 });
  });
  it('a 4-yard gain on 1st & 10 keeps the series on schedule', () => {
    const mechanics = qb();
    const explained = syntheticExplain(
      'position_qb',
      mechanics,
      qbPlay(mechanics, 'COMPLETION', { passingYardsDelta: 4 }),
      92,
      { ...situation, down: 1, distanceYards: 10, firstDownYards: 50 },
    );
    expect(explained.situation).toMatchObject({ kind: 'SHORT_OF_STICKS', team: 'PARTIAL' });
  });
  it('a 5-yard slide on 3rd & 14 never becomes a play of the game', () => {
    const mechanics = qb();
    const slide = syntheticExplain(
      'position_qb',
      mechanics,
      qbPlay(mechanics, 'SCRAMBLE', { rushingYardsDelta: 5 }),
      40,
      { ...situation, down: 3, distanceYards: 14, firstDownYards: 54 },
    );
    expect(slide.situation.team).toBe('LOST');
    expect(selectGameHighlightsVNext([slide]).playOfGame).toBeNull();
  });
});

describe('M12 execution branches (regression report: unobserved branches)', () => {
  it('explains a throwaway, a catch fumble, a forced fumble and a strip that held or missed', () => {
    const qb = buildCareerVNextMechanics(identityFor('position_qb', 'archetype_qb_field_general'))!;
    const throwaway = syntheticExplain(
      'position_qb',
      qb,
      {
        decisionId: qb.qb.decisions[0]!.id,
        patternId: qb.qb.patterns[0]!.id,
        familyId: qb.qb.patterns[0]!.familyId,
        playResult: 'THROW_AWAY',
        resolution: { finalScore: 60 },
      },
      92,
    );
    expect(throwaway.execution.reasonId).toBe('qb_throwaway');
    expect(throwaway.execution.verdict).toBe('NEUTRAL');

    const rb = buildCareerVNextMechanics(identityFor('position_rb', 'archetype_rb_power_back'))!;
    const catchFumble = syntheticExplain(
      'position_rb',
      rb,
      {
        decisionId: rb.rb.decisions[0]!.id,
        patternId: rb.rb.patterns[0]!.id,
        familyId: rb.rb.patterns[0]!.familyId,
        playResult: 'RECEPTION',
        yardsDelta: 9,
        fumbleDelta: 1,
        resolution: { fumbleRiskPermille: 140, finalScore: 61 },
      },
      92,
    );
    expect(catchFumble.execution.reasonId).toBe('rb_catch_fumble');
    expect(catchFumble.execution.chancePermille).toBe(140);
    expect(catchFumble.situation.kind).toBe('TURNOVER');

    const cb = buildCareerVNextMechanics(identityFor('position_cb', 'archetype_cb_press_man'))!;
    const tacklePattern = cb.cb.patterns.find(
      ({ familyId }) => familyId === 'key_snap_family_cb_tackle',
    )!;
    const strip = (playResult: string) =>
      syntheticExplain(
        'position_cb',
        cb,
        {
          decisionId: 'key_snap_decision_cb_attack_strip',
          patternId: tacklePattern.id,
          familyId: tacklePattern.familyId,
          playResult,
          yardsAllowed: playResult === 'MISSED_TACKLE' ? 9 : 2,
          interception: 0,
          resolution: {
            takeawayChancePermille: 310,
            disruptionChancePermille: 640,
            finalScore: 72,
          },
        },
        92,
      );
    expect(strip('FORCED_FUMBLE').execution.verdict).toBe('WON');
    expect(strip('FORCED_FUMBLE').situation.kind).toBe('TURNOVER');
    expect(strip('TACKLE').execution.reasonId).toBe('cb_strip_held');
    const missed = strip('MISSED_TACKLE');
    expect(missed.read.basis).toBe('EXACT');
    expect(missed.execution).toMatchObject({
      verdict: 'LOST',
      reasonId: 'cb_strip_missed',
      chancePermille: 310,
    });
  });
});

function season(positionId: VNextPositionId, archetypeId: string, seed: string, readBest: boolean) {
  const identity = identityFor(positionId, archetypeId);
  const mechanics = buildCareerVNextMechanics(identity)!;
  const ok = (result: CareerVNextResult): CareerVNext => {
    if (!result.ok) throw new Error(result.reason);
    return result.career;
  };
  let career = ok(createCareerVNext({ seed, identity }, mechanics));
  const offer = [...career.recruiting.offers].sort((a, b) => a.programRating - b.programRating)[0]!;
  career = ok(commitProgramVNext(career, offer.programId, mechanics));
  const explained: { lost: boolean; reason: string | null; quality: string }[] = [];
  const gameLooks: string[][] = [];
  let twins = 0;
  for (let guard = 0; guard < 3_000 && career.flow.type !== 'SEASON_REVIEW'; guard += 1) {
    const flow = career.flow;
    if (flow.type === 'WEEK_PLAN') {
      const open = focusDefinitionsVNext(career, mechanics).filter(({ id }) =>
        isFocusAvailableVNext(career, id, mechanics),
      );
      const ids: readonly string[] = open.map(({ id }) => id);
      const drills = open.filter((entry) => 'positionId' in entry).map(({ id }) => id);
      const plan = [drills[0], 'action_film_study', 'action_recovery'].filter(
        (id): id is string => id !== undefined && ids.includes(id),
      );
      while (plan.length < 3) plan.push(ids.find((id) => !plan.includes(id))!);
      career = ok(planWeekVNext(career, plan, mechanics));
    } else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      career = ok(chooseBreakthroughVNext(career, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
      career = ok(chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics));
    else if (flow.type === 'NIL' && flow.offer.decision === null)
      career = ok(chooseNilVNext(career, false, mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      career = ok(chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics));
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') {
        career = ok(kickoffVNext(career, mechanics));
        gameLooks.push([]);
      } else if (flow.game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(career, mechanics)!;
        const look =
          frame.kind === 'LIVE' && frame.look !== null
            ? mechanics.looks.looks.find(({ id }) => id === frame.look!.lookId)
            : undefined;
        if (look !== undefined) {
          const previousId = gameLooks.at(-1)!.at(-1);
          const previous = mechanics.looks.looks.find(({ id }) => id === previousId);
          if (
            previous !== undefined &&
            previous.familyId === look.familyId &&
            previous.tellKeys[0] === look.tellKeys[0]
          )
            twins += 1;
          gameLooks.at(-1)!.push(look.id);
        }
        const choice =
          frame.kind === 'SIDELINE'
            ? flow.game.sideline[frame.repNumber - 1]!.bestDecisionId
            : look !== undefined && (readBest || frame.snapNumber % 2 === 0)
              ? bestDecisionOfLook(look)
              : frame.decisionIds[frame.snapNumber % frame.decisionIds.length]!;
        career = ok(chooseSnapVNext(career, choice, mechanics));
        const explanation = explainCurrentSnapVNext(career, mechanics);
        if (frame.kind === 'LIVE') {
          expect(explanation).not.toBeNull();
          explained.push({
            lost: explanation!.execution.verdict === 'LOST',
            reason: explanation!.execution.reasonId,
            quality: explanation!.read.quality,
          });
        }
      } else career = ok(continueGameVNext(career, mechanics));
    } else if (flow.type === 'POST_GAME') career = ok(nextWeekVNext(career, mechanics));
    else career = ok(toGameDayVNext(career, mechanics));
  }
  return { explained, gameLooks, twins, career };
}

describe('M12 match feedback across a season', () => {
  it('names an execution reason for every failed action, including right reads that failed', () => {
    for (const [positionId, archetypeId] of [
      ['position_cb', 'archetype_cb_press_man'],
      ['position_qb', 'archetype_qb_field_general'],
      ['position_rb', 'archetype_rb_power_back'],
      ['position_lb', 'archetype_lb_run_stopper'],
    ] as const) {
      const { explained } = season(positionId, archetypeId, `m12-${positionId}`, true);
      expect(explained.length, positionId).toBeGreaterThan(20);
      for (const entry of explained.filter(({ lost }) => lost))
        expect(entry.reason, positionId).not.toBeNull();
      // Right reads still fail sometimes: execution is not guaranteed (and is explained).
      expect(
        explained.some(({ lost, quality }) => lost && quality === 'SHARP'),
        positionId,
      ).toBe(true);
    }
  }, 600_000);

  it('varies looks across games and avoids back-to-back twin prompts', () => {
    const { gameLooks, twins } = season(
      'position_cb',
      'archetype_cb_press_man',
      'm12-variety',
      false,
    );
    let repeats = 0;
    let total = 0;
    for (let game = 2; game < gameLooks.length; game += 1) {
      const recent = new Set([...gameLooks[game - 1]!, ...gameLooks[game - 2]!]);
      for (const id of gameLooks[game]!) {
        total += 1;
        if (recent.has(id)) repeats += 1;
      }
    }
    expect(total).toBeGreaterThan(30);
    // Looks from the last two games come back only when the family has nothing fresher.
    expect(repeats / total).toBeLessThan(0.25);
    expect(twins).toBe(0);
    // No look repeats inside a game.
    for (const looks of gameLooks) expect(new Set(looks).size).toBe(looks.length);
  }, 600_000);
});
