import { parseCareerSession, validateCareerSession } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { executeWrOffFieldCareer, type M6OperationProfileSample } from '../../src/index.js';

describe('WR off-field career builder', () => {
  it('uses public commands to reload a transferred career through the season-two opener', () => {
    const operationSamples: M6OperationProfileSample[] = [];
    const result = executeWrOffFieldCareer({
      scenarioId: 'builder:off_field_transfer',
      fixture: {
        careerSeed: 'off-field-builder-transfer',
        archetypeId: 'archetype_wr_route_technician',
        recruitingBackgroundId: 'background_under_recruited_athlete',
        baseStateOverrides: { state_brand: 70, state_gpa: 3.2 },
      },
      actionPlan: ['action_film_study', 'action_extra_practice', 'action_recovery'],
      decisionStrategyId: 'best_fit',
      eventChoicePolicy: 'alternate',
      injuryChoicePolicy: 'rest',
      preferredSkillFamilyIds: [
        'skill_family_life',
        'skill_family_role_coach',
        'skill_family_game_day',
        'skill_family_development',
        'skill_family_mindset',
        'skill_family_body',
      ],
      skillChoicePolicy: 'preferred_family',
      programSelectionPolicy: 'weakest_offer',
      nilDecisionPolicy: 'accept_fulfill',
      offseasonChoicePolicy: 'first_transfer',
      serializationMode: 'every_transition',
      operationObserver: (sample) => operationSamples.push(sample),
    });

    expect(result.selectedProgramId).not.toBe(result.initialProgramId);
    expect(result.academicCheckpoints).toHaveLength(2);
    expect(result.nilHistory.length).toBeGreaterThan(0);
    expect(result.weeks.filter(({ seasonIndex }) => seasonIndex === 1)).toHaveLength(4);
    expect(result.openingGame.playerProgramId).toBe(result.selectedProgramId);
    expect(result.session.world.completedSeasonHistory).toHaveLength(1);
    expect(result.session.career.gameCareerState.gamesPlayed).toBe(
      result.completedSeason.gamesPlayed + 1,
    );
    expect(result.totalRoundTripCount).toBeGreaterThan(100);
    expect(result.allRoundTripsEquivalent).toBe(true);
    expect(validateCareerSession(result.session)).toEqual({ issues: [], ok: true });
    expect(parseCareerSession(JSON.stringify(result.session))).toEqual({
      ok: true,
      session: result.session,
    });
    expect([...new Set(operationSamples.map(({ operationId }) => operationId))].sort()).toEqual([
      'next_season_bootstrap',
      'offseason_decision',
      'offseason_projection',
      'weekly_boundary',
      'world_round',
    ]);
    expect(
      operationSamples.filter(({ operationId }) => operationId === 'weekly_boundary').length,
    ).toBeGreaterThanOrEqual(19);
    expect(operationSamples.every(({ elapsedMs }) => elapsedMs >= 0)).toBe(true);
  }, 20_000);
});
