import {
  CAREER_SCHEMA_VERSION_V4,
  advanceDevelopmentWeek,
  createEmptyGameCareerState,
  isCareerRunV3,
  isCareerRunV4,
  migrateCareerRunV1ToV2,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  parseCareerRun,
  parseCareerRunV3,
  parseCareerRunV4,
  validateCareerRunV3,
  validateCareerRunV4,
  type CareerRunV3,
  type CompletedGameSummary,
  type DevelopmentWeekConfig,
  type GameCareerState,
  type GameCompletedWeekEvidence,
  type GameMatchupEvidence,
  type PostGameGrowthEvidence,
  type SkillMechanicsDefinition,
  type WeeklyActionDefinition,
} from '../src/index.js';
import { validateCareerGameState } from '../src/games/validation.js';
import { describe, expect, it } from 'vitest';

import { CAREER_RUN_V1_PHASE_FIXTURES } from './fixtures/career-run-v1.js';
import { CAREER_RUN_V3_PHASE_FIXTURE_CASES } from './fixtures/career-run-v3.js';

const DEVELOPMENT_CONFIG = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const satisfies DevelopmentWeekConfig;

const FIXTURE_SKILL_DEFINITIONS = [
  {
    id: 'skill_fixture_a',
    gradeId: 'skill_grade_c',
    familyId: 'skill_family_body',
    baseOfferWeight: 100,
    eligibility: {
      positionIds: ['position_wr'],
      archetypeIds: [],
      requiredPlayerTagIds: [],
      excludedPlayerTagIds: [],
      minWeekIndex: 0,
    },
    behaviorWeightRules: [],
    effects: [
      {
        type: 'action_body_delta_flat',
        scope: { type: 'action_ids', actionIds: ['action_recovery'] },
        condition: { type: 'always' },
        delta: 2,
      },
    ],
  },
  {
    id: 'skill_fixture_d',
    gradeId: 'skill_grade_c',
    familyId: 'skill_family_development',
    baseOfferWeight: 100,
    eligibility: {
      positionIds: ['position_wr'],
      archetypeIds: [],
      requiredPlayerTagIds: [],
      excludedPlayerTagIds: [],
      minWeekIndex: 0,
    },
    behaviorWeightRules: [],
    effects: [
      {
        type: 'action_xp_multiplier',
        scope: { type: 'action_ids', actionIds: ['action_route_drills'] },
        condition: { type: 'always' },
        multiplierPermille: 1100,
      },
    ],
  },
] as const satisfies readonly SkillMechanicsDefinition[];

const FIXTURE_WEEKLY_DEFINITIONS = [
  {
    id: 'action_route_drills',
    tagIds: ['action_focus_route_running'],
    attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 26 }],
    bodyDelta: -8,
    preparationDelta: 0,
    confidenceDelta: 0,
    gpaDelta: 0,
    practiceImpact: 0,
    proficiencyId: 'proficiency_route_drills',
  },
  {
    id: 'action_recovery',
    tagIds: ['action_focus_body'],
    attributeXp: [],
    bodyDelta: 10,
    preparationDelta: 0,
    confidenceDelta: 0,
    gpaDelta: 0,
    practiceImpact: 0,
    proficiencyId: null,
  },
] as const satisfies readonly WeeklyActionDefinition[];

type DeepMutable<T> = T extends readonly (infer TItem)[]
  ? DeepMutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

function withoutV4Fields(value: unknown): unknown {
  const legacy = jsonClone(value) as Record<string, unknown>;
  delete legacy['gameCareerState'];
  delete legacy['weeklyExperienceVersion'];
  const player = legacy['player'] as Record<string, unknown>;
  const state = player['state'] as Record<string, unknown>;
  delete state['preparation'];
  const skillState = player['skillState'] as Record<string, unknown>;
  delete skillState['breakthroughGauge'];
  legacy['schemaVersion'] = 3;
  return legacy;
}

function completedWeekFixture(): GameCompletedWeekEvidence {
  const fixture = CAREER_RUN_V3_PHASE_FIXTURE_CASES.find(({ name }) => name === 'weekEnd');
  if (fixture?.career.phase.type !== 'WEEK_END') {
    throw new Error('Expected a strict v3 week-end fixture.');
  }
  return {
    version: 1,
    results: fixture.career.phase.results,
    depthUpdate: fixture.career.phase.depthUpdate,
  };
}

const COMPLETED_WEEK = completedWeekFixture();

const MATCHUP = Object.freeze({
  gameId: 'game_week_0',
  weekIndex: 0,
  playerProgramId: 'program_alpha',
  opponentProgramId: 'program_beta',
  isHome: true,
  playerOffenseRating: 72,
  playerDefenseRating: 68,
  playerQbRating: 74,
  opponentOffenseRating: 70,
  opponentDefenseRating: 67,
  pregameProjection: {
    rank: 3,
    roleId: 'depth_role_rotation',
    minSnapPermille: 300,
    maxSnapPermille: 500,
  } as const,
  opportunityBudget: 3,
  opportunityGameHooks: [],
  completedWeek: COMPLETED_WEEK,
}) satisfies GameMatchupEvidence;

const SUMMARY = Object.freeze({
  gameId: 'game_week_0',
  weekIndex: 0,
  playerProgramId: 'program_alpha',
  opponentProgramId: 'program_beta',
  isHome: true,
  score: { playerTeam: 24, opponent: 17 },
  resultId: 'game_result_win',
  statLine: {
    targets: 2,
    receptions: 1,
    receivingYards: 18,
    receivingTouchdowns: 0,
    drops: 0,
    turnovers: 0,
  },
  keySnapCount: 2,
  performanceGradeScore: 75,
  performanceGradeBandId: 'performance_grade_strong',
  participationFeedbackId: 'game_participation_offensive_role',
  gameRngDrawCountBefore: 10,
  gameRngDrawCountAfter: 30,
}) satisfies CompletedGameSummary;

const GROWTH = Object.freeze({
  bodyBefore: 80,
  requestedBodyDelta: -5,
  actualBodyDelta: -5,
  bodyAfter: 75,
  confidenceBefore: 50,
  requestedConfidenceDelta: 2,
  actualConfidenceDelta: 2,
  confidenceAfter: 52,
  coachTrustBefore: 50,
  requestedCoachTrustDelta: 3,
  actualCoachTrustDelta: 3,
  coachTrustAfter: 53,
  attributeXp: [],
}) satisfies PostGameGrowthEvidence;

const COMPLETED_STATE = Object.freeze({
  gamesPlayed: 1,
  wins: 1,
  losses: 0,
  ties: 0,
  cumulativeStats: SUMMARY.statLine,
  cumulativeGradeScore: 75,
  lastGame: SUMMARY,
}) satisfies GameCareerState;

const KEY_PLAY_LOG = [
  {
    keySnapId: 'key_snap_week_0_1',
    patternId: 'key_snap_pattern_choice',
    familyId: 'key_snap_family_route',
    decisionId: 'key_snap_decision_break_inside',
    decisionFit: 10,
    resolution: {
      attributeScore: 60,
      attributeContributionMilli: 15_000,
      matchupScore: 50,
      matchupContributionMilli: 7_500,
      decisionFitScore: 60,
      decisionFitContributionMilli: 15_000,
      teamContextScore: 67,
      teamContextContributionMilli: 5_000,
      bodyScore: 80,
      bodyContributionMilli: 6_000,
      preparationScore: 50,
      preparationContributionMilli: 6_250,
      confidenceScore: 50,
      confidenceContributionMilli: 3_750,
      weightedScoreMilli: 58_500,
      skillAdjustment: 0,
      rngRoll: 0,
      finalScore: 59,
      targetChancePermille: 800,
      catchChancePermille: 600,
      dropRiskPermille: 50,
      turnoverRiskPermille: 20,
      touchdownChancePermille: 100,
      receivingYardsBeforeHooks: 18,
      receivingYardsAfterHooks: 18,
    },
    resultId: 'game_play_result_reception',
    targetDelta: 1,
    receptionDelta: 1,
    receivingYardsDelta: 18,
    receivingTouchdownDelta: 0,
    dropDelta: 0,
    turnoverDelta: 0,
    scoreBefore: { playerTeam: 0, opponent: 0 },
    scoreAfter: { playerTeam: 0, opponent: 0 },
    rngDrawCountBefore: 12,
    rngDrawCountAfter: 18,
    appliedGameHooks: [],
  },
  {
    keySnapId: 'key_snap_week_0_2',
    patternId: 'key_snap_pattern_choice',
    familyId: 'key_snap_family_route',
    decisionId: 'key_snap_decision_settle_space',
    decisionFit: 6,
    resolution: {
      attributeScore: 60,
      attributeContributionMilli: 15_000,
      matchupScore: 50,
      matchupContributionMilli: 7_500,
      decisionFitScore: 56,
      decisionFitContributionMilli: 14_000,
      teamContextScore: 67,
      teamContextContributionMilli: 5_000,
      bodyScore: 80,
      bodyContributionMilli: 6_000,
      preparationScore: 50,
      preparationContributionMilli: 6_250,
      confidenceScore: 50,
      confidenceContributionMilli: 3_750,
      weightedScoreMilli: 57_500,
      skillAdjustment: 0,
      rngRoll: 0,
      finalScore: 58,
      targetChancePermille: 800,
      catchChancePermille: 600,
      dropRiskPermille: 50,
      turnoverRiskPermille: 20,
      touchdownChancePermille: 100,
      receivingYardsBeforeHooks: 0,
      receivingYardsAfterHooks: 0,
    },
    resultId: 'game_play_result_incomplete',
    targetDelta: 1,
    receptionDelta: 0,
    receivingYardsDelta: 0,
    receivingTouchdownDelta: 0,
    dropDelta: 0,
    turnoverDelta: 0,
    scoreBefore: { playerTeam: 0, opponent: 0 },
    scoreAfter: { playerTeam: 0, opponent: 0 },
    rngDrawCountBefore: 18,
    rngDrawCountAfter: 24,
    appliedGameHooks: [],
  },
] as const;

function validateGamePhase(gameCareerState: unknown, phase: unknown) {
  return validateCareerGameState({
    gameCareerState,
    phase,
    careerWeekIndex: 0,
    careerProgramId: 'program_alpha',
    careerRngDrawCount: 30,
  });
}

describe('CareerRun schema v4 persistence foundation', () => {
  it('keeps deterministic strict-v3 fixtures for every previously shipped phase', () => {
    expect(CAREER_RUN_V3_PHASE_FIXTURE_CASES.map(({ name }) => name)).toEqual([
      'plan',
      'resolve0',
      'resolve1',
      'resolve2',
      'weekEnd',
      'skillBreakthrough',
    ]);
    for (const { career } of CAREER_RUN_V3_PHASE_FIXTURE_CASES) {
      expect(validateCareerRunV3(career)).toEqual({ ok: true, issues: [] });
      expect(isCareerRunV3(career)).toBe(true);
      expect(validateCareerRunV4(career).ok).toBe(false);
      expectDeepFrozen(career);
    }
  });

  it('migrates every v3 phase with neutral preparation/game history and no gameplay transition', () => {
    expect(CAREER_SCHEMA_VERSION_V4).toBe(4);
    for (const { career } of CAREER_RUN_V3_PHASE_FIXTURE_CASES) {
      const before = JSON.stringify(career);
      const migrated = migrateCareerRunV3ToV4(career);
      expect(migrated.schemaVersion).toBe(4);
      expect(withoutV4Fields(migrated)).toEqual(career);
      expect(migrated.gameCareerState).toEqual(createEmptyGameCareerState());
      expect(migrated.player.state.preparation).toBe(50);
      expect(migrated.weeklyExperienceVersion).toBe(
        career.phase.type === 'RESOLVE_ACTIONS' || career.phase.type === 'WEEK_END' ? 1 : 2,
      );
      expect(migrated.phase).toEqual(career.phase);
      expect(migrated.revision).toBe(career.revision);
      expect(migrated.rng).toEqual(career.rng);
      expect(JSON.stringify(career)).toBe(before);
      expect(validateCareerRunV4(migrated)).toEqual({ ok: true, issues: [] });
      expectDeepFrozen(migrated);
    }
  });

  it('keeps strict v3/v4 readers separate while every legacy chain converges', () => {
    const v1 = CAREER_RUN_V1_PHASE_FIXTURES.resolve2;
    const v2 = migrateCareerRunV1ToV2(v1);
    const v3 = migrateCareerRunV2ToV3(v2);
    const v4 = migrateCareerRunV3ToV4(v3);
    const v5 = migrateCareerRunV4ToV5(v4);
    const v6 = migrateCareerRunV5ToV6(v5);
    const v7 = migrateCareerRunV6ToV7(v6);
    for (const legacy of [v1, v2, v3]) {
      expect(parseCareerRun(legacy)).toEqual({ ok: true, career: v7 });
    }
    expect(parseCareerRun(v4)).toEqual({ ok: true, career: v7 });
    expect(parseCareerRunV3(v4)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(parseCareerRunV4(v3)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(isCareerRunV3(v4)).toBe(false);
    expect(isCareerRunV4(v4)).toBe(true);
  });

  it('finishes a migrated legacy week literally, then activates the current weekly model', () => {
    const source = jsonClone(CAREER_RUN_V3_PHASE_FIXTURE_CASES[4]!.career);
    expect(validateCareerRunV3(source)).toEqual({ ok: true, issues: [] });
    const migrated = migrateCareerRunV3ToV4(source as unknown as CareerRunV3);
    expect(migrated.weeklyExperienceVersion).toBe(1);
    expect(migrated.phase).toEqual(source.phase);
    const advanced = advanceDevelopmentWeek(
      migrateCareerRunV6ToV7(migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrated))),
      DEVELOPMENT_CONFIG,
      FIXTURE_SKILL_DEFINITIONS,
      FIXTURE_WEEKLY_DEFINITIONS,
    );
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) {
      return;
    }
    expect(advanced.career.weeklyExperienceVersion).toBe(2);
    expect(advanced.career.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(advanced.career.player.state.preparation).toBe(50);
    expect(advanced.career.rng).toEqual(migrated.rng);
  });

  it('strictly requires the v4 weekly-model discriminator to agree with persisted results', () => {
    const plan = migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career);
    const missing = jsonClone(plan) as unknown as Record<string, unknown>;
    delete missing['weeklyExperienceVersion'];
    expect(validateCareerRunV4(missing)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.missing_field', path: 'career.weeklyExperienceVersion' },
        ]),
      }),
    );

    const legacyResolve = jsonClone(
      migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[2]!.career),
    );
    legacyResolve.weeklyExperienceVersion = 2;
    expect(validateCareerRunV4(legacyResolve).ok).toBe(false);

    const impossibleLegacyPlan = jsonClone(plan);
    impossibleLegacyPlan.weeklyExperienceVersion = 1;
    expect(validateCareerRunV4(impossibleLegacyPlan)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          {
            code: 'invariant.invalid_combination',
            path: 'career.weeklyExperienceVersion',
          },
        ]),
      }),
    );
  });

  it('clones/freezes independently and rejects malformed v3 without touching its caller', () => {
    const source = jsonClone(CAREER_RUN_V3_PHASE_FIXTURE_CASES[1]!.career);
    const before = jsonClone(source);
    const first = migrateCareerRunV3ToV4(source as unknown as CareerRunV3);
    const second = migrateCareerRunV3ToV4(source as unknown as CareerRunV3);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.player).not.toBe(second.player);
    expect(source).toEqual(before);
    expect(Object.isFrozen(source)).toBe(false);

    source.revision = -1;
    const invalidBefore = jsonClone(source);
    expect(() => migrateCareerRunV3ToV4(source as unknown as CareerRunV3)).toThrow(
      'career_migration.invalid_v3',
    );
    expect(source).toEqual(invalidBefore);
    expect(Object.isFrozen(source)).toBe(false);
  });

  it('rejects missing, extra, and inconsistent game-history fields strictly', () => {
    const valid = migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career);
    const missing = jsonClone(valid) as unknown as Record<string, unknown>;
    delete missing['gameCareerState'];
    expect(validateCareerRunV4(missing)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.missing_field', path: 'career.gameCareerState' },
        ]),
      }),
    );

    const extra = jsonClone(valid) as unknown as { gameCareerState: Record<string, unknown> };
    extra.gameCareerState['futureField'] = 1;
    expect(validateCareerRunV4(extra)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.unknown_field', path: 'career.gameCareerState.futureField' },
        ]),
      }),
    );

    const inconsistent = jsonClone(valid);
    inconsistent.gameCareerState.gamesPlayed = 1;
    expect(validateCareerRunV4(inconsistent)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.invalid_combination', path: 'career.gameCareerState.gamesPlayed' },
          { code: 'invariant.invalid_combination', path: 'career.gameCareerState.lastGame' },
        ]),
      }),
    );
  });

  it('keeps legacy player-state shapes strict and validates bounded v4 preparation', () => {
    const v3 = CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career;
    const legacyExtra = jsonClone(v3);
    (legacyExtra.player.state as Record<string, unknown>)['preparation'] = 50;
    expect(validateCareerRunV3(legacyExtra)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.unknown_field', path: 'career.player.state.preparation' },
        ]),
      }),
    );

    const current = jsonClone(migrateCareerRunV3ToV4(v3));
    delete (current.player.state as Partial<typeof current.player.state>).preparation;
    expect(validateCareerRunV4(current)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.missing_field', path: 'career.player.state.preparation' },
          { code: 'invariant.out_of_bounds', path: 'career.player.state.preparation' },
        ]),
      }),
    );

    const outOfBounds = jsonClone(migrateCareerRunV3ToV4(v3));
    outOfBounds.player.state.preparation = 101;
    expect(validateCareerRunV4(outOfBounds)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.out_of_bounds', path: 'career.player.state.preparation' },
        ]),
      }),
    );
  });

  it('accepts strict preview, key-snap, and postgame persistence contracts', () => {
    expect(
      validateGamePhase(createEmptyGameCareerState(), {
        type: 'GAME_PREVIEW',
        matchup: MATCHUP,
      }),
    ).toEqual([]);

    expect(
      validateGamePhase(createEmptyGameCareerState(), {
        type: 'KEY_SNAP',
        game: {
          matchup: MATCHUP,
          clock: { period: 1, clockSecondsRemaining: 720 },
          situation: {
            possessionId: 'game_possession_player_team',
            driveIndex: 1,
            down: 3,
            distanceYards: 6,
            yardLine: 42,
          },
          score: { playerTeam: 0, opponent: 0 },
          opportunitiesPresented: 1,
          statLine: createEmptyGameCareerState().cumulativeStats,
          keyPlayLog: [],
          gameRngDrawCountBefore: 10,
        },
        pendingSnap: {
          keySnapId: 'key_snap_week_0_1',
          patternId: 'key_snap_pattern_choice',
          familyId: 'key_snap_family_route',
          decisionIds: [
            'key_snap_decision_break_inside',
            'key_snap_decision_settle_space',
            'key_snap_decision_take_vertical',
          ],
          coverageId: 'game_coverage_zone',
          leverageId: 'game_leverage_outside',
          matchupRating: 72,
          information: {
            footballIqScore: 60,
            footballIqContributionMilli: 39_000,
            preparationScore: 50,
            preparationContributionMilli: 17_500,
            baseScore: 57,
            filmStudyApplied: true,
            filmStudyBonus: 20,
            hookScoreBonus: 3,
            finalScore: 80,
          },
          informationScore: 80,
          informationTierId: 'game_information_partial',
          revealedClueIds: ['game_clue_safety_depth'],
          informationGameHooks: [],
          rngDrawCountBefore: 12,
        },
      }),
    ).toEqual([]);

    expect(
      validateGamePhase(COMPLETED_STATE, {
        type: 'POST_GAME',
        summary: jsonClone(SUMMARY),
        growth: GROWTH,
        keyPlayLog: KEY_PLAY_LOG,
        completedWeek: COMPLETED_WEEK,
      }),
    ).toEqual([]);
  });

  it('reports malformed nested game data without throwing or relying on key order', () => {
    const reorderedSummary = {
      performanceGradeBandId: SUMMARY.performanceGradeBandId,
      performanceGradeScore: SUMMARY.performanceGradeScore,
      keySnapCount: SUMMARY.keySnapCount,
      participationFeedbackId: SUMMARY.participationFeedbackId,
      statLine: { ...SUMMARY.statLine },
      resultId: SUMMARY.resultId,
      score: { opponent: 17, playerTeam: 24 },
      isHome: SUMMARY.isHome,
      opponentProgramId: SUMMARY.opponentProgramId,
      playerProgramId: SUMMARY.playerProgramId,
      weekIndex: SUMMARY.weekIndex,
      gameId: SUMMARY.gameId,
      gameRngDrawCountAfter: SUMMARY.gameRngDrawCountAfter,
      gameRngDrawCountBefore: SUMMARY.gameRngDrawCountBefore,
    };
    expect(
      validateGamePhase(COMPLETED_STATE, {
        type: 'POST_GAME',
        summary: reorderedSummary,
        growth: GROWTH,
        keyPlayLog: KEY_PLAY_LOG,
        completedWeek: COMPLETED_WEEK,
      }),
    ).toEqual([]);

    const malformed = jsonClone(reorderedSummary) as unknown as Record<string, unknown>;
    delete malformed['score'];
    expect(() =>
      validateGamePhase(COMPLETED_STATE, {
        type: 'POST_GAME',
        summary: malformed,
        growth: GROWTH,
        keyPlayLog: KEY_PLAY_LOG,
        completedWeek: COMPLETED_WEEK,
      }),
    ).not.toThrow();
    expect(
      validateGamePhase(COMPLETED_STATE, {
        type: 'POST_GAME',
        summary: malformed,
        growth: GROWTH,
        keyPlayLog: KEY_PLAY_LOG,
        completedWeek: COMPLETED_WEEK,
      }),
    ).toEqual(
      expect.arrayContaining([
        { code: 'invariant.missing_field', path: 'career.phase.summary.score' },
        { code: 'invariant.invalid_type', path: 'career.phase.summary.score' },
        { code: 'invariant.invalid_combination', path: 'career.gameCareerState.lastGame' },
      ]),
    );
  });
});
