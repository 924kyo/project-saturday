import { describe, expect, it } from 'vitest';

import { executeWrSeasonCareer, type ExecuteWrSeasonCareerInput } from '../../src/index.js';

const PREFERRED_FAMILIES = [
  'skill_family_development',
  'skill_family_role_coach',
  'skill_family_game_day',
  'skill_family_body',
  'skill_family_mindset',
  'skill_family_life',
] as const;

function input(
  seed: string,
  programSelectionPolicy: ExecuteWrSeasonCareerInput['programSelectionPolicy'],
): ExecuteWrSeasonCareerInput {
  return {
    scenarioId: `season_builder:${seed}`,
    fixture: { careerSeed: seed, displayName: 'Season Builder Athlete' },
    actionPlan: ['action_recovery', 'action_film_study', 'action_route_drills'],
    decisionStrategyId: 'best_fit',
    eventChoicePolicy: 'alternate',
    injuryChoicePolicy: 'play_limited',
    preferredSkillFamilyIds: PREFERRED_FAMILIES,
    skillChoicePolicy: 'preferred_family',
    programSelectionPolicy,
    serializationMode: 'every_transition',
  };
}

describe('WR full-season career builder', () => {
  it('completes and reloads a postseason qualifier through public commands', () => {
    const result = executeWrSeasonCareer(input('season-career-close-1', 'strongest_offer'));

    expect(result.qualifiedForPostseason).toBe(true);
    expect(result.weeks.filter(({ stageId }) => stageId === 'CAMP')).toHaveLength(3);
    expect(result.weeks.filter(({ stageId }) => stageId === 'REGULAR_SEASON')).toHaveLength(12);
    expect(result.weeks.filter(({ stageId }) => stageId === 'POSTSEASON').length).toBeGreaterThan(
      0,
    );
    expect(result.seasonSummary.gamesPlayed).toBeGreaterThan(12);
    expect(result.session.career.phase.type).toBe('CAREER_COMPLETE');
    expect(result.meta.alumni).toEqual([result.alumni]);
    expect(result.legacyVisibility.alumnus).toEqual(result.alumni);
    expect(result.legacyVisibility.unlockedOptionIds).toContain('legacy_option_alumni_history');
    expect(result.totalRoundTripCount).toBeGreaterThan(100);
    expect(result.allRoundTripsEquivalent).toBe(true);
  });

  it('closes a non-qualifier without adding a fictional player playoff week', () => {
    const result = executeWrSeasonCareer({
      ...input('season-career-close', 'strongest_offer'),
      eventChoicePolicy: 'first',
      skillChoicePolicy: 'first_offered',
    });

    expect(result.qualifiedForPostseason).toBe(false);
    expect(result.weeks).toHaveLength(15);
    expect(result.weeks.some(({ stageId }) => stageId === 'POSTSEASON')).toBe(false);
    expect(result.seasonSummary.gamesPlayed).toBe(12);
    expect(result.seasonSummary.postseasonSeed).toBeNull();
    expect(result.seasonSummary.outcomeId).toBe('season_outcome_regular_season_complete');
    expect(result.alumni.gamesPlayed).toBe(12);
    expect(result.allRoundTripsEquivalent).toBe(true);
  });
});
