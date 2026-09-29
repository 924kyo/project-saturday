import {
  CAREER_SCHEMA_VERSION_V3,
  DEPTH_EVALUATION_WEIGHTS_PERMILLE,
  DEPTH_HYSTERESIS_THRESHOLD_MILLI,
  commitWeeklyActionPlan,
  isCareerRunV1,
  isCareerRunV2,
  isCareerRunV3,
  migrateCareerRunV1ToV2,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  parseCareerRun,
  parseCareerRunV1,
  parseCareerRunV2,
  parseCareerRunV3,
  validateCareerRun,
  validateCareerRunV2,
  validateCareerRunV3,
  type CareerRunV2,
  type CareerRunV3,
  type DepthEvaluationComponents,
  type DepthEvaluationEvidence,
  type DepthParticipantId,
  type ProgramCareerState,
  type RecruitingCommittedState,
  type RecruitingOfferTuple,
  type WeeklyActionId,
  type WrRoomCompetitor,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

import { CAREER_RUN_V1_PHASE_FIXTURES } from './fixtures/career-run-v1.js';
import {
  CAREER_RUN_V2_PHASE_FIXTURE_CASES,
  CAREER_RUN_V2_PHASE_FIXTURES,
} from './fixtures/career-run-v2.js';

type DeepMutable<T> = T extends readonly (infer TItem)[]
  ? DeepMutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) {
    expectDeepFrozen(nested);
  }
}

function stripV3Fields(career: CareerRunV3): unknown {
  const legacy = jsonClone(career) as unknown as Record<string, unknown>;
  delete legacy['recruitingState'];
  delete legacy['programContext'];
  legacy['schemaVersion'] = 2;
  const phase = legacy['phase'] as Record<string, unknown>;
  delete phase['depthUpdate'];
  if (Array.isArray(phase['results'])) {
    for (const result of phase['results']) {
      delete (result as Record<string, unknown>)['practiceImpact'];
    }
  }
  return legacy;
}

function contribution(
  components: DepthEvaluationComponents,
): DepthEvaluationEvidence['contributions'] {
  return {
    talentFitMilli: components.talentFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.talentFit,
    coachTrustMilli: components.coachTrust * DEPTH_EVALUATION_WEIGHTS_PERMILLE.coachTrust,
    practiceFormMilli: components.practiceForm * DEPTH_EVALUATION_WEIGHTS_PERMILLE.practiceForm,
    schemeFitMilli: components.schemeFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.schemeFit,
    experienceReadinessMilli:
      components.experienceReadiness * DEPTH_EVALUATION_WEIGHTS_PERMILLE.experienceReadiness,
  };
}

function evaluation(
  participantId: DepthParticipantId,
  rank: number,
  components: DepthEvaluationComponents,
): DepthEvaluationEvidence {
  const contributions = contribution(components);
  return {
    participantId,
    rank,
    roleId:
      rank <= 2
        ? 'depth_role_starter'
        : rank <= 4
          ? 'depth_role_rotation'
          : rank <= 6
            ? 'depth_role_reserve'
            : 'depth_role_developmental',
    components,
    contributions,
    totalScoreMilli: Object.values(contributions).reduce((total, value) => total + value, 0),
  };
}

const OFFERS = [
  {
    programId: 'program_alpha',
    interest: 100,
    schemeFit: 90,
    priority: 290,
    projectedDepthBandId: 'projected_depth_band_starter_competition',
  },
  {
    programId: 'program_beta',
    interest: 90,
    schemeFit: 85,
    priority: 265,
    projectedDepthBandId: 'projected_depth_band_rotation_path',
  },
  {
    programId: 'program_gamma',
    interest: 80,
    schemeFit: 80,
    priority: 240,
    projectedDepthBandId: 'projected_depth_band_rotation_path',
  },
  {
    programId: 'program_delta',
    interest: 70,
    schemeFit: 75,
    priority: 215,
    projectedDepthBandId: 'projected_depth_band_reserve_path',
  },
  {
    programId: 'program_epsilon',
    interest: 60,
    schemeFit: 70,
    priority: 190,
    projectedDepthBandId: 'projected_depth_band_developmental',
  },
] as const satisfies RecruitingOfferTuple;

const COMPETITORS = [
  ['a', 'archetype_wr_deep_threat', 90, 70, 70, 90, 90],
  ['b', 'archetype_wr_route_technician', 82, 65, 65, 85, 80],
  ['c', 'archetype_wr_possession_receiver', 50, 30, 45, 60, 40],
  ['d', 'archetype_wr_deep_threat', 45, 25, 40, 55, 30],
  ['e', 'archetype_wr_route_technician', 40, 20, 40, 50, 25],
  ['f', 'archetype_wr_possession_receiver', 35, 15, 35, 45, 20],
  ['g', 'archetype_wr_deep_threat', 30, 10, 30, 40, 15],
] as const;

function competitor(entry: (typeof COMPETITORS)[number], index: number): WrRoomCompetitor {
  const [suffix, archetypeId, talentFit, coachTrust, practiceForm, schemeFit, experienceReadiness] =
    entry;
  return {
    id: `roster_player_${suffix}`,
    givenNameId: `roster_given_name_${suffix}`,
    familyNameId: `roster_family_name_${suffix}`,
    archetypeId,
    classYear: ((index % 4) + 1) as 1 | 2 | 3 | 4,
    talentFit,
    coachTrust,
    practiceForm,
    schemeFit,
    experienceReadiness,
  };
}

function committedCareer(): CareerRunV3 {
  const career = jsonClone(migrateCareerRunV2ToV3(CAREER_RUN_V2_PHASE_FIXTURES.plan));
  career.rng.drawCount = 44;
  const competitors = COMPETITORS.map(competitor) as unknown as ProgramCareerState['competitors'];
  const depthOrderIds = [
    'roster_player_a',
    'roster_player_b',
    career.player.id,
    'roster_player_c',
    'roster_player_d',
    'roster_player_e',
    'roster_player_f',
    'roster_player_g',
  ] as const;
  const evaluations = [
    evaluation('roster_player_a', 1, {
      talentFit: 90,
      coachTrust: 70,
      practiceForm: 70,
      schemeFit: 90,
      experienceReadiness: 90,
    }),
    evaluation('roster_player_b', 2, {
      talentFit: 82,
      coachTrust: 65,
      practiceForm: 65,
      schemeFit: 85,
      experienceReadiness: 80,
    }),
    evaluation(career.player.id, 3, {
      talentFit: 65,
      coachTrust: 10,
      practiceForm: 50,
      schemeFit: 85,
      experienceReadiness: 20,
    }),
    ...COMPETITORS.slice(2).map((entry, index) =>
      evaluation(`roster_player_${entry[0]}`, index + 4, {
        talentFit: entry[2],
        coachTrust: entry[3],
        practiceForm: entry[4],
        schemeFit: entry[5],
        experienceReadiness: entry[6],
      }),
    ),
  ] as unknown as ProgramCareerState['evaluations'];
  const recruitingState: RecruitingCommittedState = {
    type: 'COMMITTED',
    recruitAbilityScore: 60,
    backgroundModifier: 0,
    recruitScore: 60,
    recruitTierId: 'recruit_tier_priority',
    offers: OFFERS,
    selectedProgramId: 'program_alpha',
    selectedAtWeekIndex: 9,
    rosterRngDrawCountBefore: 9,
    rosterRngDrawCountAfter: 44,
  };
  career.programId = 'program_alpha';
  career.recruitingState = jsonClone(recruitingState);
  career.programContext = jsonClone({
    programId: 'program_alpha',
    offenseStyleId: 'offense_style_precision',
    rotationPolicyId: 'rotation_policy_balanced',
    playerPracticeForm: 50,
    competitors,
    depthOrderIds,
    evaluations,
    projection: {
      rank: 3,
      roleId: 'depth_role_rotation',
      minSnapPermille: 300,
      maxSnapPermille: 500,
    },
    latestDepthUpdate: null,
  } satisfies ProgramCareerState);
  const parsed = parseCareerRunV3(career);
  if (!parsed.ok) {
    throw new Error(`Committed v3 fixture invalid: ${JSON.stringify(parsed.issues)}`);
  }
  return parsed.career;
}

describe('CareerRun schema v3 persistence foundation', () => {
  it('keeps every checked-in literal v2 phase strict, valid, and deeply frozen', () => {
    expect(CAREER_RUN_V2_PHASE_FIXTURE_CASES.map(({ name }) => name)).toEqual([
      'plan',
      'resolve0',
      'resolve1',
      'resolve2',
      'weekEnd',
      'skillBreakthrough',
    ]);
    for (const { career } of CAREER_RUN_V2_PHASE_FIXTURE_CASES) {
      expect(validateCareerRunV2(career)).toEqual({ ok: true, issues: [] });
      expect(isCareerRunV2(career)).toBe(true);
      expect(validateCareerRunV3(career).ok).toBe(false);
      expectDeepFrozen(career);
    }
  });

  it('migrates every v2 phase exactly with neutral nested M3 evidence and no RNG/revision change', () => {
    expect(CAREER_SCHEMA_VERSION_V3).toBe(3);
    for (const { career } of CAREER_RUN_V2_PHASE_FIXTURE_CASES) {
      const before = JSON.stringify(career);
      const migrated = migrateCareerRunV2ToV3(career);
      expect(migrated.schemaVersion).toBe(CAREER_SCHEMA_VERSION_V3);
      expect(stripV3Fields(migrated)).toEqual(career);
      expect(migrated.programId).toBeNull();
      expect(migrated.recruitingState).toEqual({ type: 'NOT_STARTED' });
      expect(migrated.programContext).toBeNull();
      expect(migrated.revision).toBe(career.revision);
      expect(migrated.rng).toEqual(career.rng);
      if (migrated.phase.type === 'RESOLVE_ACTIONS' || migrated.phase.type === 'WEEK_END') {
        expect(migrated.phase.results.every(({ practiceImpact }) => practiceImpact === 0)).toBe(
          true,
        );
      }
      if (migrated.phase.type === 'WEEK_END') {
        expect(migrated.phase.depthUpdate).toBeNull();
      }
      expect(validateCareerRunV3(migrated)).toEqual({ ok: true, issues: [] });
      expect(JSON.stringify(career)).toBe(before);
      expectDeepFrozen(migrated);
    }
  });

  it('chains v1 through v3 to the same current result and keeps all strict readers separate', () => {
    const v1 = CAREER_RUN_V1_PHASE_FIXTURES.weekEnd;
    const v2 = migrateCareerRunV1ToV2(v1);
    const v3 = migrateCareerRunV2ToV3(v2);
    const current = migrateCareerRunV6ToV7(
      migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(v3))),
    );
    expect(parseCareerRun(v1)).toEqual({ ok: true, career: current });
    expect(parseCareerRun(v2)).toEqual({ ok: true, career: current });
    expect(parseCareerRun(v3)).toEqual({ ok: true, career: current });
    expect(parseCareerRunV1(v2)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(parseCareerRunV2(v3)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(parseCareerRunV3(v2)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(isCareerRunV1(v3)).toBe(false);
    expect(isCareerRunV2(v3)).toBe(false);
    expect(isCareerRunV3(v3)).toBe(true);
    for (const schemaVersion of [0, 8]) {
      const unsupported = jsonClone(v3) as unknown as Record<string, unknown>;
      unsupported['schemaVersion'] = schemaVersion;
      expect(parseCareerRun(unsupported)).toEqual({
        ok: false,
        reason: 'career_parse.unsupported_version',
        issues: [],
      });
    }
  });

  it('clones and deeply freezes independent v2 migration and current parser outputs', () => {
    const source = jsonClone(CAREER_RUN_V2_PHASE_FIXTURES.resolve2);
    const before = jsonClone(source);
    const first = migrateCareerRunV2ToV3(source as unknown as CareerRunV2);
    const second = migrateCareerRunV2ToV3(source as unknown as CareerRunV2);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.player).not.toBe(second.player);
    expect(source).toEqual(before);
    expect(Object.isFrozen(source)).toBe(false);
    const parsed = parseCareerRun(JSON.stringify(source));
    expect(parsed).toEqual({
      ok: true,
      career: migrateCareerRunV6ToV7(
        migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(first))),
      ),
    });
    expectDeepFrozen(first);
    expectDeepFrozen(parsed);
  });

  it('rejects an invalid v2 migration source without freezing or mutating caller data', () => {
    const source = jsonClone(CAREER_RUN_V2_PHASE_FIXTURES.resolve1);
    source.revision = -1;
    const before = jsonClone(source);

    expect(() => migrateCareerRunV2ToV3(source as unknown as CareerRunV2)).toThrow(
      'career_migration.invalid_v2',
    );
    expect(source).toEqual(before);
    expect(Object.isFrozen(source)).toBe(false);
    source.revision = 1;
    expect(source.revision).toBe(1);
  });

  it('snapshots accessor-backed legacy input once before selecting and validating its version', () => {
    const source = jsonClone(CAREER_RUN_V2_PHASE_FIXTURES.plan) as unknown as Record<
      string,
      unknown
    >;
    let schemaVersionReads = 0;
    Object.defineProperty(source, 'schemaVersion', {
      enumerable: true,
      get: () => {
        schemaVersionReads += 1;
        return 2;
      },
    });

    const parsed = parseCareerRun(source);
    expect(parsed.ok).toBe(true);
    expect(schemaVersionReads).toBe(1);
    expect(Object.isFrozen(source)).toBe(false);
  });

  it('accepts a fully referential committed program/room/depth skeleton', () => {
    const career = committedCareer();
    expect(validateCareerRunV3(career)).toEqual({ ok: true, issues: [] });
    expect(isCareerRunV3(career)).toBe(true);
    expect(career.programContext?.depthOrderIds).toContain(career.player.id);
    expect(career.programContext?.competitors).toHaveLength(7);
    expect(career.programContext?.evaluations).toHaveLength(8);
  });

  it.each([
    {
      name: 'recruit score arithmetic',
      path: 'career.recruitingState.recruitScore',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        if (career.recruitingState.type === 'COMMITTED') {
          career.recruitingState.recruitScore = 61;
        }
      },
    },
    {
      name: 'offer priority arithmetic',
      path: 'career.recruitingState.offers.0.priority',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        if (career.recruitingState.type === 'COMMITTED') {
          career.recruitingState.offers[0]!.priority = 289;
        }
      },
    },
    {
      name: 'selected/program ID agreement',
      path: 'career.programId',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        career.programId = 'program_beta';
      },
    },
    {
      name: 'exact seven unique competitors',
      path: 'career.programContext.competitors.1.id',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        if (career.programContext !== null) {
          career.programContext.competitors[1]!.id = 'roster_player_a';
        }
      },
    },
    {
      name: 'depth order room coverage',
      path: 'career.programContext.depthOrderIds.7',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        if (career.programContext !== null) {
          career.programContext.depthOrderIds[7] = 'roster_player_a';
        }
      },
    },
    {
      name: 'evaluation contribution sum',
      path: 'career.programContext.evaluations.0.totalScoreMilli',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        if (career.programContext !== null) {
          career.programContext.evaluations[0]!.totalScoreMilli -= 1;
        }
      },
    },
    {
      name: 'evaluation score order',
      path: 'career.programContext.evaluations.1',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        if (career.programContext !== null) {
          const competitor = career.programContext.competitors[1]!;
          competitor.talentFit = 100;
          competitor.coachTrust = 100;
          competitor.practiceForm = 100;
          competitor.schemeFit = 100;
          competitor.experienceReadiness = 100;
          career.programContext.evaluations[1] = jsonClone(
            evaluation('roster_player_b', 2, {
              talentFit: 100,
              coachTrust: 100,
              practiceForm: 100,
              schemeFit: 100,
              experienceReadiness: 100,
            }),
          );
        }
      },
    },
    {
      name: 'roster RNG evidence',
      path: 'career.recruitingState.rosterRngDrawCountAfter',
      mutate: (career: DeepMutable<CareerRunV3>) => {
        if (career.recruitingState.type === 'COMMITTED') {
          career.recruitingState.rosterRngDrawCountAfter = 43;
        }
      },
    },
  ])('rejects malformed committed $name', ({ path, mutate }) => {
    const career = jsonClone(committedCareer());
    mutate(career);
    const result = validateCareerRunV3(career);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toContain(path);
    }
    expect(parseCareerRunV3(career).ok).toBe(false);
  });

  it('enforces the recruiting/program iff matrix and strict nested keys', () => {
    const choosing = jsonClone(migrateCareerRunV2ToV3(CAREER_RUN_V2_PHASE_FIXTURES.plan));
    choosing.recruitingState = {
      type: 'CHOOSING',
      recruitAbilityScore: 60,
      backgroundModifier: 0,
      recruitScore: 60,
      recruitTierId: 'recruit_tier_priority',
      offers: jsonClone(OFFERS) as unknown as DeepMutable<RecruitingOfferTuple>,
    };
    expect(validateCareerRunV3(choosing)).toEqual({ ok: true, issues: [] });

    const partial = jsonClone(choosing);
    partial.programContext = jsonClone(committedCareer().programContext);
    expect(validateCareerRunV3(partial)).toEqual(expect.objectContaining({ ok: false }));

    const missing = jsonClone(committedCareer()) as unknown as Record<string, unknown>;
    delete missing['programContext'];
    const missingResult = validateCareerRunV3(missing);
    expect(missingResult.ok).toBe(false);
    if (!missingResult.ok) {
      expect(missingResult.issues.map(({ path }) => path)).toContain('career.programContext');
    }

    const extra = jsonClone(choosing) as unknown as {
      recruitingState: Record<string, unknown>;
    };
    extra.recruitingState['extra'] = true;
    const extraResult = validateCareerRunV3(extra);
    expect(extraResult.ok).toBe(false);
    if (!extraResult.ok) {
      expect(extraResult.issues.map(({ path }) => path)).toContain('career.recruitingState.extra');
    }
  });

  it('keeps neutral migrated planning state unchanged behind the recruiting gate', () => {
    const plan = migrateCareerRunV2ToV3(CAREER_RUN_V2_PHASE_FIXTURES.plan);
    const actionIds = [
      'action_recovery',
      'action_recovery',
      'action_recovery',
    ] as const satisfies readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
    const current = migrateCareerRunV6ToV7(
      migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(plan))),
    );
    const committed = commitWeeklyActionPlan(current, actionIds, ['action_recovery']);
    expect(committed).toEqual({
      career: current,
      ok: false,
      reason: 'weekly.recruiting_required',
    });
    expect(committed.career).toBe(current);
    expect(validateCareerRunV3(plan)).toEqual({ ok: true, issues: [] });
  });

  it('preserves a committed program skeleton through existing M2 planning commands', () => {
    const plan = migrateCareerRunV6ToV7(
      migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(committedCareer()))),
    );
    const actionIds = [
      'action_recovery',
      'action_recovery',
      'action_recovery',
    ] as const satisfies readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
    const committed = commitWeeklyActionPlan(plan, actionIds, ['action_recovery']);
    expect(committed.ok).toBe(true);
    if (committed.ok) {
      expect(committed.career.recruitingState).toEqual(plan.recruitingState);
      expect(committed.career.programContext).toEqual(plan.programContext);
      expect(committed.career.programId).toBe(plan.programId);
      expect(validateCareerRun(committed.career)).toEqual({ ok: true, issues: [] });
    }
  });

  it('rejects v2 result shapes with v3 evidence and v3 result shapes without it', () => {
    const legacy = jsonClone(CAREER_RUN_V2_PHASE_FIXTURES.resolve1);
    const legacyResult = (legacy.phase as unknown as { results: Array<Record<string, unknown>> })
      .results[0]!;
    legacyResult['practiceImpact'] = 0;
    expect(validateCareerRunV2(legacy).ok).toBe(false);
    expect(parseCareerRunV2(legacy).ok).toBe(false);

    const current = jsonClone(migrateCareerRunV2ToV3(CAREER_RUN_V2_PHASE_FIXTURES.resolve1));
    const currentResult = (current.phase as unknown as { results: Array<Record<string, unknown>> })
      .results[0]!;
    delete currentResult['practiceImpact'];
    expect(validateCareerRunV3(current).ok).toBe(false);
    expect(parseCareerRunV3(current).ok).toBe(false);
  });

  it('uses the fixed hysteresis value in persisted update evidence', () => {
    expect(DEPTH_HYSTERESIS_THRESHOLD_MILLI).toBe(2_000);
  });
});
