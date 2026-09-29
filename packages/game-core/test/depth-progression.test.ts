import { describe, expect, it } from 'vitest';

import {
  advanceHistoricalDevelopmentWeek as advanceDevelopmentWeek,
  commitWeeklyActionPlan,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  resolveNextWeeklyAction,
  validateCareerRun,
  type CareerRun,
  type DevelopmentWeekConfig,
  type WeeklyActionDefinition,
} from '../src/index.js';
import { CAREER_RUN_V2_PHASE_FIXTURES } from './fixtures/career-run-v2.js';
import {
  TEST_OFFENSE_STYLE_DEFINITIONS,
  TEST_ROTATION_POLICY_DEFINITIONS,
  enrollTestCareer,
} from './helpers/enrolled-career.js';

const CONFIG = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const satisfies DevelopmentWeekConfig;

const HIGH_PRACTICE = {
  id: 'action_recovery',
  tagIds: ['action_focus_body'],
  attributeXp: [],
  bodyDelta: 40,
  gpaDelta: 0,
  practiceImpact: 25,
  preparationDelta: 0,
  confidenceDelta: 0,
  proficiencyId: null,
} as const satisfies WeeklyActionDefinition;

const POOR_PRACTICE = {
  id: 'action_extra_practice',
  tagIds: ['action_focus_multi_skill'],
  attributeXp: [],
  bodyDelta: -40,
  gpaDelta: 0,
  practiceImpact: -25,
  preparationDelta: 0,
  confidenceDelta: 0,
  proficiencyId: 'proficiency_extra_practice',
} as const satisfies WeeklyActionDefinition;

const FILM_FOCUS = {
  id: 'action_film_study',
  tagIds: ['action_focus_film_study'],
  attributeXp: [{ attributeId: 'attribute_football_iq', baseXp: 24 }],
  bodyDelta: -3,
  preparationDelta: 12,
  confidenceDelta: 1,
  gpaDelta: 0,
  practiceImpact: 5,
  proficiencyId: 'proficiency_film_study',
} as const satisfies WeeklyActionDefinition;

const RECOVERY_FOCUS = {
  id: 'action_recovery',
  tagIds: ['action_focus_body'],
  attributeXp: [],
  bodyDelta: 32,
  preparationDelta: -2,
  confidenceDelta: 2,
  gpaDelta: 0,
  practiceImpact: 2,
  proficiencyId: null,
} as const satisfies WeeklyActionDefinition;

function startingCareer(): CareerRun {
  const base = migrateCareerRunV6ToV7(
    migrateCareerRunV5ToV6(
      migrateCareerRunV4ToV5(
        migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(CAREER_RUN_V2_PHASE_FIXTURES.plan)),
      ),
    ),
  );
  return enrollTestCareer({
    ...base,
    player: {
      ...base.player,
      skillState: {
        ...base.player.skillState,
        acquisitions: [],
        equippedSkillIds: [null, null, null, null],
      },
    },
  });
}

function completeWeek(career: CareerRun, definition: WeeklyActionDefinition): CareerRun {
  const committed = commitWeeklyActionPlan(
    career,
    [definition.id, definition.id, definition.id],
    [definition.id],
  );
  if (!committed.ok) {
    throw new Error(committed.reason);
  }
  let current = committed.career;
  for (let index = 0; index < 3; index += 1) {
    const resolved = resolveNextWeeklyAction(
      current,
      definition,
      CONFIG,
      [],
      TEST_OFFENSE_STYLE_DEFINITIONS,
      TEST_ROTATION_POLICY_DEFINITIONS,
    );
    if (!resolved.ok) {
      throw new Error(resolved.reason);
    }
    current = resolved.career;
  }
  return current;
}

describe('weekly Practice Form, Coach Trust, and depth hysteresis', () => {
  it('makes a lower-Body preparation strategy outperform Body-only recovery in Practice Grade', () => {
    const filmWeek = completeWeek(startingCareer(), FILM_FOCUS);
    const recoveryWeek = completeWeek(startingCareer(), RECOVERY_FOCUS);
    if (
      filmWeek.phase.type !== 'WEEK_END' ||
      recoveryWeek.phase.type !== 'WEEK_END' ||
      filmWeek.phase.depthUpdate === null ||
      recoveryWeek.phase.depthUpdate === null
    ) {
      throw new Error('Expected completed committed weeks.');
    }
    expect(filmWeek.player.state.body).toBe(41);
    expect(recoveryWeek.player.state.body).toBe(100);
    expect(filmWeek.player.state.preparation).toBe(86);
    expect(recoveryWeek.player.state.preparation).toBe(44);
    expect(filmWeek.phase.depthUpdate.weeklyPracticeScore).toBe(67);
    expect(recoveryWeek.phase.depthUpdate.weeklyPracticeScore).toBe(63);
    expect(filmWeek.phase.depthUpdate.weeklyPracticeScore).toBeGreaterThan(
      recoveryWeek.phase.depthUpdate.weeklyPracticeScore,
    );
    expect(filmWeek.rng).toEqual(recoveryWeek.rng);
  });

  it('persists exact high-practice evidence and promotes at most one rank with a larger snap range', () => {
    const initial = startingCareer();
    expect(initial.programContext?.projection.rank).toBe(6);
    const weekEnd = completeWeek(initial, HIGH_PRACTICE);
    expect(weekEnd.phase.type).toBe('WEEK_END');
    if (weekEnd.phase.type !== 'WEEK_END' || weekEnd.programContext === null) {
      return;
    }
    expect(weekEnd.phase.results.map(({ practiceImpact }) => practiceImpact)).toEqual([25, 25, 25]);
    expect(weekEnd.phase.depthUpdate).toEqual({
      weekIndex: 9,
      practiceFormBefore: 50,
      practiceGrade: {
        model: 'experience_v1',
        baseScore: 50,
        focusImpact: 75,
        bodyAfterFocus: 100,
        bodyContribution: 8,
        preparationAfterFocus: 50,
        preparationTarget: 55,
        preparationContribution: -1,
        confidenceAfterFocus: 50,
        confidenceContribution: 0,
      },
      weeklyPracticeScore: 100,
      practiceFormAfter: 80,
      coachTrustBefore: 10,
      requestedCoachTrustDelta: 4,
      actualCoachTrustDelta: 4,
      coachTrustAfter: 14,
      rankBefore: 6,
      rankAfter: 5,
      roleBefore: 'depth_role_reserve',
      roleAfter: 'depth_role_reserve',
      snapProjectionBefore: {
        rank: 6,
        roleId: 'depth_role_reserve',
        minSnapPermille: 200,
        maxSnapPermille: 300,
      },
      snapProjectionAfter: {
        rank: 5,
        roleId: 'depth_role_reserve',
        minSnapPermille: 300,
        maxSnapPermille: 400,
      },
      hysteresisThresholdMilli: 2000,
      movement: 'PROMOTED',
      neighborParticipantId: 'roster_player_test_05',
    });
    expect(weekEnd.programContext.latestDepthUpdate).toEqual(weekEnd.phase.depthUpdate);
    expect(weekEnd.programContext.playerPracticeForm).toBe(80);
    expect(weekEnd.player.state.coachTrust).toBe(14);
    expect(weekEnd.programContext.projection).toEqual(
      weekEnd.phase.depthUpdate?.snapProjectionAfter,
    );
    expect(weekEnd.rng).toEqual(initial.rng);
    expect(validateCareerRun(weekEnd)).toEqual({ issues: [], ok: true });
  });

  it('surfaces a sub-threshold blocked change, then allows one explainable demotion', () => {
    const initial = startingCareer();
    const firstWeek = completeWeek(initial, POOR_PRACTICE);
    expect(firstWeek.phase.type).toBe('WEEK_END');
    if (firstWeek.phase.type !== 'WEEK_END') {
      return;
    }
    expect(firstWeek.phase.depthUpdate).toEqual(
      expect.objectContaining({
        weeklyPracticeScore: 0,
        practiceFormBefore: 50,
        practiceFormAfter: 20,
        requestedCoachTrustDelta: -4,
        actualCoachTrustDelta: -4,
        rankBefore: 6,
        rankAfter: 6,
        movement: 'HELD',
        neighborParticipantId: 'roster_player_test_06',
      }),
    );
    const advanced = advanceDevelopmentWeek(firstWeek, CONFIG);
    expect(advanced.ok).toBe(true);
    if (!advanced.ok || advanced.career.phase.type !== 'PLAN_ACTIONS') {
      return;
    }
    const secondWeek = completeWeek(advanced.career, POOR_PRACTICE);
    expect(secondWeek.phase.type).toBe('WEEK_END');
    if (secondWeek.phase.type !== 'WEEK_END') {
      return;
    }
    expect(secondWeek.phase.depthUpdate).toEqual(
      expect.objectContaining({
        practiceFormBefore: 20,
        practiceFormAfter: 8,
        coachTrustBefore: 6,
        coachTrustAfter: 2,
        rankBefore: 6,
        rankAfter: 7,
        movement: 'DEMOTED',
        neighborParticipantId: 'roster_player_test_06',
      }),
    );
    expect(validateCareerRun(secondWeek)).toEqual({ issues: [], ok: true });
  });

  it('rejects missing selected scheme or rotation mechanics on the final action without mutation', () => {
    const initial = startingCareer();
    const committed = commitWeeklyActionPlan(
      initial,
      ['action_recovery', 'action_recovery', 'action_recovery'],
      ['action_recovery'],
    );
    if (!committed.ok) {
      throw new Error(committed.reason);
    }
    let current = committed.career;
    for (let index = 0; index < 2; index += 1) {
      const resolved = resolveNextWeeklyAction(current, HIGH_PRACTICE, CONFIG);
      if (!resolved.ok) {
        throw new Error(resolved.reason);
      }
      current = resolved.career;
    }
    const missingOffense = resolveNextWeeklyAction(
      current,
      HIGH_PRACTICE,
      CONFIG,
      [],
      [],
      TEST_ROTATION_POLICY_DEFINITIONS,
    );
    const missingRotation = resolveNextWeeklyAction(
      current,
      HIGH_PRACTICE,
      CONFIG,
      [],
      TEST_OFFENSE_STYLE_DEFINITIONS,
      [],
    );
    expect(missingOffense).toEqual({
      career: current,
      ok: false,
      reason: 'weekly.invalid_offense_definitions',
    });
    expect(missingRotation).toEqual({
      career: current,
      ok: false,
      reason: 'weekly.invalid_rotation_definitions',
    });
    expect(missingOffense.career).toBe(current);
    expect(missingRotation.career).toBe(current);
  });

  it('rejects tampered movement bounds and divergent phase/context evidence', () => {
    const weekEnd = completeWeek(startingCareer(), HIGH_PRACTICE);
    const excessiveMove = JSON.parse(JSON.stringify(weekEnd)) as CareerRun;
    if (excessiveMove.phase.type !== 'WEEK_END' || excessiveMove.phase.depthUpdate === null) {
      throw new Error('Expected persisted depth evidence.');
    }
    (excessiveMove.phase.depthUpdate as { rankAfter: number }).rankAfter =
      excessiveMove.phase.depthUpdate.rankBefore - 2;
    expect(validateCareerRun(excessiveMove).ok).toBe(false);

    const divergent = JSON.parse(JSON.stringify(weekEnd)) as CareerRun;
    if (divergent.phase.type !== 'WEEK_END' || divergent.phase.depthUpdate === null) {
      throw new Error('Expected persisted depth evidence.');
    }
    (divergent.phase.depthUpdate as { weeklyPracticeScore: number }).weeklyPracticeScore = 99;
    const result = validateCareerRun(divergent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ path }) => path)).toContain('career.phase.depthUpdate');
    }
  });
});
