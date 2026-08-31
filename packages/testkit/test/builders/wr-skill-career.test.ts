import {
  developmentWeekConfig,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import { validateCareerRun, type SkillId } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  createWrCareerFixture,
  executeWrSkillDevelopmentWeek,
  selectPreferredOfferedSkill,
  type SkillAwareWeeklyActionPlan,
} from '../../src/index.js';
import type { WrSkillCareerBuilderError } from '../../src/index.js';

const AVAILABLE_ACTION_IDS = weeklyActionDefinitions.map(({ id }) => id);
const FILM_REPEAT = [
  'action_film_study',
  'action_film_study',
  'action_film_study',
] as const satisfies SkillAwareWeeklyActionPlan;

function executeFirstWeek(serializationMode: 'none' | 'every_transition') {
  return executeWrSkillDevelopmentWeek({
    scenarioId: 'builder_first_breakthrough',
    career: createWrCareerFixture({ careerSeed: 'builder-first-breakthrough' }),
    actionPlan: FILM_REPEAT,
    availableActionIds: AVAILABLE_ACTION_IDS,
    actionDefinitions: weeklyActionDefinitions,
    skillDefinitions: skillMechanicsDefinitions,
    config: developmentWeekConfig,
    serializationMode,
    choicePolicy: ({ offer }) =>
      selectPreferredOfferedSkill(offer.offeredSkillIds, ['skill_coverage_ledger_b']),
  });
}

describe('WR skill-career production-command builder', () => {
  it('selects explicit preferences and otherwise uses locale-independent code-unit order', () => {
    const offered = [
      'skill_route_notebook_c',
      'skill_coverage_ledger_b',
      'skill_late_set_engine_b',
    ] as const;

    expect(selectPreferredOfferedSkill(offered, ['skill_late_set_engine_b'])).toBe(
      'skill_late_set_engine_b',
    );
    expect(selectPreferredOfferedSkill(offered, [])).toBe('skill_coverage_ledger_b');
  });

  it('round-trips every authoritative transition and reproduces the exact persisted offer choice', () => {
    const uninterrupted = executeFirstWeek('none');
    const serialized = executeFirstWeek('every_transition');
    const breakthrough = uninterrupted.breakthrough;

    expect(serialized).toEqual(uninterrupted);
    expect(breakthrough).not.toBeNull();
    if (breakthrough === null) {
      throw new Error('Expected first-week breakthrough.');
    }
    expect(uninterrupted.career.weekIndex).toBe(1);
    expect(uninterrupted.career.revision).toBe(6);
    expect(uninterrupted.career.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(validateCareerRun(uninterrupted.career)).toEqual({ ok: true, issues: [] });
    expect(breakthrough.offer.rngDrawCountBefore).toBe(breakthrough.rngBeforeAdvance.drawCount);
    expect(breakthrough.offer.rngDrawCountAfter).toBe(breakthrough.rngAfterOffer.drawCount);
    expect(breakthrough.offer.rngDrawCountAfter).toBeGreaterThanOrEqual(
      breakthrough.offer.rngDrawCountBefore + 3,
    );
    expect(breakthrough.rngAfterChoice).toEqual(breakthrough.rngAfterOffer);
    expect(breakthrough.rngDrawCountAfterChoice).toBe(breakthrough.rngDrawCountBeforeChoice);
    expect(breakthrough.acquisition).toEqual({
      ...breakthrough.offer,
      selectedSkillId: breakthrough.selectedSkillId,
    });
    expect(new Set(breakthrough.offer.offeredSkillIds).size).toBe(3);
    expect(
      breakthrough.offer.offeredSkillIds.every(
        (skillId) => !breakthrough.ownedSkillIdsBefore.includes(skillId),
      ),
    ).toBe(true);
    expect(breakthrough.equippedSkillIdsAfter).toEqual([
      breakthrough.selectedSkillId,
      null,
      null,
      null,
    ]);
    expect(breakthrough.behaviorCounts).toEqual(
      expect.arrayContaining([
        { affinityTagId: 'action_focus_film_study', count: 3 },
        { affinityTagId: 'behavior_repeat_action', count: 2 },
      ]),
    );
    expect(
      breakthrough.weightedCandidates.find(({ skillId }) => skillId === 'skill_coverage_ledger_b')
        ?.weight,
    ).toBe(112);
  });

  it('does not invoke the choice policy on a non-cadence week', () => {
    const firstWeek = executeFirstWeek('none').career;
    const secondWeek = executeWrSkillDevelopmentWeek({
      scenarioId: 'builder_non_cadence',
      career: firstWeek,
      actionPlan: FILM_REPEAT,
      availableActionIds: AVAILABLE_ACTION_IDS,
      actionDefinitions: weeklyActionDefinitions,
      skillDefinitions: skillMechanicsDefinitions,
      config: developmentWeekConfig,
      serializationMode: 'every_transition',
      choicePolicy: () => {
        throw new Error('Choice policy must not run without an offer.');
      },
    });

    expect(secondWeek.breakthrough).toBeNull();
    expect(secondWeek.career.weekIndex).toBe(2);
    expect(secondWeek.career.revision).toBe(firstWeek.revision + 5);
    expect(secondWeek.career.rng).toEqual(firstWeek.rng);
  });

  it('surfaces an invalid deterministic choice with scenario and stage context', () => {
    expect(() =>
      executeWrSkillDevelopmentWeek({
        scenarioId: 'builder_bad_choice',
        career: createWrCareerFixture({ careerSeed: 'builder-bad-choice' }),
        actionPlan: FILM_REPEAT,
        availableActionIds: AVAILABLE_ACTION_IDS,
        actionDefinitions: weeklyActionDefinitions,
        skillDefinitions: skillMechanicsDefinitions,
        config: developmentWeekConfig,
        choicePolicy: () => 'skill_not_offered' as SkillId,
      }),
    ).toThrowError(
      expect.objectContaining({
        name: 'WrSkillCareerBuilderError',
        scenarioId: 'builder_bad_choice',
        stage: 'choose_skill',
      }) as WrSkillCareerBuilderError,
    );
  });
});
