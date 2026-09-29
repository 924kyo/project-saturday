import { describe, expect, it } from 'vitest';

import { createEnrolledWrCareerFixture, executeWrProgramDevelopmentWeek } from '../../src/index.js';
import type { WrProgramCareerBuilderError } from '../../src/index.js';

const fixture = {
  careerSeed: 'm3-builder-replay',
  archetypeId: 'archetype_wr_possession_receiver',
  recruitingBackgroundId: 'background_late_bloomer',
  personalityTraitIds: ['personality_competitive', 'personality_leader'],
} as const;

describe('WR program career builders', () => {
  it('uses public recruiting commands, exact room RNG, and replay-safe transition round trips', () => {
    const first = createEnrolledWrCareerFixture({
      scenarioId: 'builder_enrollment',
      fixture,
      selectedProgramId: 'program_ember_peak_polytechnic',
      serializationMode: 'every_transition',
    });
    const replay = createEnrolledWrCareerFixture({
      scenarioId: 'builder_enrollment',
      fixture,
      selectedProgramId: 'program_ember_peak_polytechnic',
      serializationMode: 'every_transition',
    });

    expect(replay).toEqual(first);
    expect(first.roundTripCount).toBe(2);
    expect(first.roomRngBefore.drawCount).toBe(0);
    expect(first.roomRngAfter.drawCount).toBe(35);
    expect(first.career.rng).toEqual(first.roomRngAfter);
    expect(first.career.recruitingState.type).toBe('COMMITTED');
    expect(first.career.programContext?.competitors).toHaveLength(7);
    expect(first.career.programContext?.depthOrderIds).toHaveLength(8);

    const week = executeWrProgramDevelopmentWeek({
      scenarioId: 'builder_week',
      career: first.career,
      actionPlan: ['action_extra_practice', 'action_route_drills', 'action_recovery'],
      serializationMode: 'every_transition',
    });
    expect(week.actionResults.map(({ practiceImpact }) => practiceImpact)).toEqual([11, 7, 2]);
    expect(week.depthUpdate.weekIndex).toBe(0);
    expect(week.depthUpdate.rankAfter - week.depthUpdate.rankBefore).toBeGreaterThanOrEqual(-1);
    expect(week.depthUpdate.rankAfter - week.depthUpdate.rankBefore).toBeLessThanOrEqual(1);
    expect(week.career.programContext?.latestDepthUpdate).toEqual(week.depthUpdate);
    expect(week.selectedSkillId).not.toBeNull();
    expect(week.roundTripCount).toBe(6);
    expect(week.career.phase.type).toBe('PLAN_ACTIONS');
  });

  it('fails with reproduction context when a selected program is not in the shortlist', () => {
    expect(() =>
      createEnrolledWrCareerFixture({
        scenarioId: 'builder_unoffered',
        fixture,
        selectedProgramId: 'program_ironwood',
      }),
    ).toThrowError(
      expect.objectContaining({
        name: 'WrProgramCareerBuilderError',
        scenarioId: 'builder_unoffered',
        stage: 'select_program',
      }) as WrProgramCareerBuilderError,
    );
  });
});
