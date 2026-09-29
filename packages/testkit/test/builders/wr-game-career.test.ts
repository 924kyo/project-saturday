import { validateCareerRun } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  advanceCompletedWrGameWeek,
  completeCurrentProgramPracticeWeek,
  createEnrolledWrCareerFixture,
  executeWrShippedGame,
} from '../../src/index.js';
import type { WrGameCareerBuilderError } from '../../src/index.js';

const fixture = {
  careerSeed: 'm4-builder-replay',
  archetypeId: 'archetype_wr_deep_threat',
  recruitingBackgroundId: 'background_legacy_recruit',
  personalityTraitIds: ['personality_competitive', 'personality_leader'],
} as const;

function createWeekEndCareer() {
  const enrolled = createEnrolledWrCareerFixture({
    scenarioId: 'm4_builder_enrollment',
    fixture,
    selectedProgramId: 'program_high_desert_state',
    serializationMode: 'every_transition',
  });
  return completeCurrentProgramPracticeWeek({
    actionPlan: ['action_extra_practice', 'action_film_study', 'action_recovery'],
    career: enrolled.career,
    scenarioId: 'm4_builder_practice',
    serializationMode: 'every_transition',
  });
}

describe('WR shipped-game career builders', () => {
  it('replays public practice, game, save boundaries, growth, and next-week advancement', () => {
    const week = createWeekEndCareer();
    const first = executeWrShippedGame({
      career: week.career,
      decisionStrategyId: 'best_fit',
      scenarioId: 'm4_builder_game',
      serializationMode: 'every_transition',
    });
    const replay = executeWrShippedGame({
      career: week.career,
      decisionStrategyId: 'best_fit',
      scenarioId: 'm4_builder_game',
      serializationMode: 'every_transition',
    });

    expect(replay).toEqual(first);
    expect(first.career.phase.type).toBe('POST_GAME');
    expect(first.summary.keySnapCount).toBe(first.decisions.length);
    expect(first.summary.keySnapCount).toBe(first.matchup.opportunityBudget);
    expect(first.keyPlayLog).toEqual(first.decisions.map(({ play }) => play));
    expect(first.growth.bodyAfter).toBe(first.career.player.state.body);
    expect(first.growth.confidenceAfter).toBe(first.career.player.state.confidence);
    expect(first.growth.coachTrustAfter).toBe(first.career.player.state.coachTrust);
    expect(first.career.gameCareerState.lastGame).toEqual(first.summary);
    expect(first.roundTripCount).toBe(first.summary.keySnapCount + 2);
    expect(validateCareerRun(first.career).ok).toBe(true);

    const advanced = advanceCompletedWrGameWeek({
      career: first.career,
      preferredSkillFamilyIds: [
        'skill_family_game_day',
        'skill_family_role_coach',
        'skill_family_development',
      ],
      scenarioId: 'm4_builder_advance',
      serializationMode: 'every_transition',
    });
    expect(advanced.career.phase.type).toBe('PLAN_ACTIONS');
    expect(advanced.career.weekIndex).toBe(1);
    expect(advanced.career.gameCareerState.gamesPlayed).toBe(1);
    expect(advanced.roundTripCount).toBeGreaterThanOrEqual(1);
    expect(validateCareerRun(advanced.career).ok).toBe(true);
  });

  it('produces strategy-dependent decisions from the same pending contexts', () => {
    const week = createWeekEndCareer();
    const bestFit = executeWrShippedGame({
      career: week.career,
      decisionStrategyId: 'best_fit',
      scenarioId: 'm4_builder_best_fit',
    });
    const riskSeeking = executeWrShippedGame({
      career: week.career,
      decisionStrategyId: 'risk_seeking',
      scenarioId: 'm4_builder_risk',
    });

    expect(riskSeeking.decisions.map(({ patternId }) => patternId)).toEqual(
      bestFit.decisions.map(({ patternId }) => patternId),
    );
    expect(
      riskSeeking.decisions.some(
        ({ decisionId }, index) => decisionId !== bestFit.decisions[index]?.decisionId,
      ),
    ).toBe(true);
  });

  it('fails with reproduction context outside a supported phase', () => {
    const enrolled = createEnrolledWrCareerFixture({
      scenarioId: 'm4_builder_invalid_enrollment',
      fixture,
      selectedProgramId: 'program_high_desert_state',
    });
    expect(() =>
      executeWrShippedGame({
        career: enrolled.career,
        decisionStrategyId: 'best_fit',
        scenarioId: 'm4_builder_invalid_phase',
      }),
    ).toThrowError(
      expect.objectContaining({
        name: 'WrGameCareerBuilderError',
        scenarioId: 'm4_builder_invalid_phase',
        stage: 'game_setup',
      }) as WrGameCareerBuilderError,
    );
  });
});
