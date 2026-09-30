import {
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  parseCareerVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  serializeCareerVNext,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';
import { expect, it } from 'vitest';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

/**
 * M10 performance budgets. Every player command runs synchronously on the UI thread, so each must
 * stay far below a frame budget's worth of perceptible delay. Measured values in September 2026 on a
 * desktop were ~2–13 ms per command and ~5 ms per save round trip; the budgets leave wide margin
 * for slower mobile CPUs and CI.
 */
const COMMAND_BUDGET_MS = 100;
const CODEC_BUDGET_MS = 60;

it('keeps every command and save round trip of a full season within budget', () => {
  const identity = {
    displayName: 'Budget Probe',
    positionId: 'position_qb',
    archetypeId: 'archetype_qb_field_general',
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  } as PositionPlayerCreationIdentity;
  const mechanics = buildCareerVNextMechanics(identity)!;
  const slowest: Record<string, number> = {};
  let codecSlowest = 0;
  let largest = 0;
  const run = (name: string, command: () => CareerVNextResult): CareerVNext => {
    const started = performance.now();
    const result = command();
    slowest[name] = Math.max(slowest[name] ?? 0, performance.now() - started);
    if (!result.ok) throw new Error(`${name}: ${result.reason}`);
    const codecStarted = performance.now();
    const json = serializeCareerVNext(result.career)!;
    parseCareerVNext(json);
    codecSlowest = Math.max(codecSlowest, performance.now() - codecStarted);
    largest = Math.max(largest, json.length);
    return result.career;
  };
  let career = run('create', () => createCareerVNext({ seed: 'budget', identity }, mechanics));
  career = run('commit', () =>
    commitProgramVNext(career, career.recruiting.offers[0]!.programId, mechanics),
  );
  for (let guard = 0; guard < 3_000 && career.flow.type !== 'SEASON_REVIEW'; guard += 1) {
    const flow = career.flow;
    if (flow.type === 'WEEK_PLAN') {
      const open = focusDefinitionsVNext(career, mechanics)
        .map(({ id }) => id)
        .filter((id) => isFocusAvailableVNext(career, id, mechanics));
      career = run('plan', () => planWeekVNext(career, [open[0]!, open[1]!, open[2]!], mechanics));
    } else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      career = run('card', () => chooseBreakthroughVNext(career, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
      career = run('event', () => chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics));
    else if (flow.type === 'NIL' && flow.offer.decision === null)
      career = run('nil', () => chooseNilVNext(career, true, mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      career = run('injury', () =>
        chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics),
      );
    else if (flow.type === 'GAME')
      career =
        flow.game.stage === 'PREGAME'
          ? run('kickoff', () => kickoffVNext(career, mechanics))
          : flow.game.stage === 'SNAP'
            ? run('snap', () =>
                chooseSnapVNext(
                  career,
                  projectSnapBoardFrame(career, mechanics)!.decisionIds[0]!,
                  mechanics,
                ),
              )
            : run('continue', () => continueGameVNext(career, mechanics));
    else if (flow.type === 'POST_GAME')
      career = run('nextWeek', () => nextWeekVNext(career, mechanics));
    else career = run('toGameDay', () => toGameDayVNext(career, mechanics));
  }
  expect(career.flow.type).toBe('SEASON_REVIEW');
  for (const [name, milliseconds] of Object.entries(slowest))
    expect(milliseconds, name).toBeLessThan(
      name === 'create' ? COMMAND_BUDGET_MS * 3 : COMMAND_BUDGET_MS,
    );
  expect(codecSlowest).toBeLessThan(CODEC_BUDGET_MS);
  // A season's save stays far below the 1 MB envelope bound.
  expect(largest).toBeLessThan(600_000);
}, 120_000);
