import { describe, expect, it } from 'vitest';

import {
  beginRecruiting,
  commitProgramChoice,
  commitWeeklyActionPlan,
  advanceDevelopmentWeek,
  migrateCareerRunV1ToV2,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  validateCareerRun,
  type CareerRun,
  type RecruitingMechanicsConfig,
  type RecruitingOffenseStyleDefinition,
  type RecruitingProgramDefinition,
  type RosterNameMechanicsPool,
  type RotationPolicyMechanicsDefinition,
} from '../src/index.js';
import { CAREER_RUN_V2_PHASE_FIXTURES } from './fixtures/career-run-v2.js';
import { CAREER_RUN_V1_PHASE_FIXTURES } from './fixtures/career-run-v1.js';

const CONFIG = {
  abilityWeightsPermille: {
    attribute_speed: 125,
    attribute_burst: 125,
    attribute_agility: 125,
    attribute_strength: 125,
    attribute_wr_release: 125,
    attribute_wr_route_running: 125,
    attribute_wr_hands: 125,
    attribute_wr_catch_in_traffic: 125,
  },
  backgroundModifiers: {
    background_blue_chip_star: 12,
    background_late_bloomer: 0,
    background_small_town_star: 5,
    background_legacy_recruit: 4,
    background_under_recruited_athlete: -5,
  },
  offerCount: 5,
  projectedDepthGapThresholds: {
    starterCompetitionMin: 8,
    rotationPathMin: 0,
    reservePathMin: -8,
  },
  tierThresholds: {
    nationalMinScore: 62,
    priorityMinScore: 56,
  },
} as const satisfies RecruitingMechanicsConfig;

const DEVELOPMENT_CONFIG = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const;

const OFFENSE_STYLES = [
  {
    id: 'offense_style_fixture',
    attributeWeightsPermille: CONFIG.abilityWeightsPermille,
    schemeFitByArchetype: {
      archetype_wr_deep_threat: 70,
      archetype_wr_route_technician: 80,
      archetype_wr_possession_receiver: 90,
    },
  },
] as const satisfies readonly RecruitingOffenseStyleDefinition[];

function program(index: number): RecruitingProgramDefinition {
  return {
    id: `program_fixture_${index}`,
    strengthBandId:
      index <= 2
        ? 'program_strength_national'
        : index <= 4
          ? 'program_strength_contender'
          : 'program_strength_builder',
    offenseStyleId: 'offense_style_fixture',
    rotationPolicyId: 'rotation_policy_fixture',
    recruitingInterestByTier: {
      recruit_tier_national: 40 + index * 5,
      recruit_tier_priority: 45 + index * 5,
      recruit_tier_developmental: 50 + index * 5,
    },
    initialCoachTrustBonus: index,
    roomProfile: {
      experienceReadinessBase: 40,
      practiceFormBase: 50,
      talentMean: [0, 75, 70, 64, 60, 55, 50][index] ?? 50,
      talentSpread: 10,
      trustBase: 15,
    },
  };
}

const PROGRAMS = [1, 2, 3, 4, 5, 6].map(program);

const ROTATIONS = [
  {
    id: 'rotation_policy_fixture',
    rankSnapRanges: [
      { rank: 1, minSnapPermille: 800, maxSnapPermille: 900 },
      { rank: 2, minSnapPermille: 700, maxSnapPermille: 800 },
      { rank: 3, minSnapPermille: 500, maxSnapPermille: 650 },
      { rank: 4, minSnapPermille: 350, maxSnapPermille: 500 },
      { rank: 5, minSnapPermille: 200, maxSnapPermille: 350 },
      { rank: 6, minSnapPermille: 100, maxSnapPermille: 200 },
      { rank: 7, minSnapPermille: 40, maxSnapPermille: 100 },
      { rank: 8, minSnapPermille: 0, maxSnapPermille: 40 },
    ],
  },
] as const satisfies readonly RotationPolicyMechanicsDefinition[];

const NAMES = {
  givenNameIds: [
    'roster_given_name_a',
    'roster_given_name_b',
    'roster_given_name_c',
    'roster_given_name_d',
    'roster_given_name_e',
    'roster_given_name_f',
    'roster_given_name_g',
  ],
  familyNameIds: [
    'roster_family_name_a',
    'roster_family_name_b',
    'roster_family_name_c',
    'roster_family_name_d',
    'roster_family_name_e',
    'roster_family_name_f',
    'roster_family_name_g',
  ],
} as const satisfies RosterNameMechanicsPool;

function planCareer(): CareerRun {
  return migrateCareerRunV6ToV7(
    migrateCareerRunV5ToV6(
      migrateCareerRunV4ToV5(
        migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(CAREER_RUN_V2_PHASE_FIXTURES.plan)),
      ),
    ),
  );
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectDeepFrozen(child);
  }
}

describe('deterministic recruiting profile and offer shortlist', () => {
  it('derives exact fixed-point evidence, orders five offers canonically, and consumes no RNG', () => {
    const career = planCareer();
    const result = beginRecruiting(career, CONFIG, PROGRAMS, OFFENSE_STYLES);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.career).not.toBe(career);
    expect(result.career.revision).toBe(career.revision + 1);
    expect(result.career.rng).toEqual(career.rng);
    expect(result.career.programId).toBeNull();
    expect(result.career.programContext).toBeNull();
    expect(result.career.recruitingState).toEqual({
      type: 'CHOOSING',
      recruitAbilityScore: 60,
      backgroundModifier: 0,
      recruitScore: 60,
      recruitTierId: 'recruit_tier_priority',
      offers: [
        {
          programId: 'program_fixture_6',
          interest: 75,
          schemeFit: 80,
          priority: 230,
          projectedDepthBandId: 'projected_depth_band_starter_competition',
        },
        {
          programId: 'program_fixture_5',
          interest: 70,
          schemeFit: 80,
          priority: 220,
          projectedDepthBandId: 'projected_depth_band_rotation_path',
        },
        {
          programId: 'program_fixture_4',
          interest: 65,
          schemeFit: 80,
          priority: 210,
          projectedDepthBandId: 'projected_depth_band_rotation_path',
        },
        {
          programId: 'program_fixture_3',
          interest: 60,
          schemeFit: 80,
          priority: 200,
          projectedDepthBandId: 'projected_depth_band_reserve_path',
        },
        {
          programId: 'program_fixture_2',
          interest: 55,
          schemeFit: 80,
          priority: 190,
          projectedDepthBandId: 'projected_depth_band_developmental',
        },
      ],
    });
    expect(validateCareerRun(result.career)).toEqual({ ok: true, issues: [] });
    expectDeepFrozen(result);
  });

  it('is independent of caller catalog order and breaks exact ties by program ID code units', () => {
    const career = planCareer();
    const shuffled = [
      PROGRAMS[3]!,
      PROGRAMS[0]!,
      PROGRAMS[5]!,
      PROGRAMS[2]!,
      PROGRAMS[1]!,
      PROGRAMS[4]!,
    ];
    const first = beginRecruiting(career, CONFIG, PROGRAMS, OFFENSE_STYLES);
    const second = beginRecruiting(career, CONFIG, shuffled, OFFENSE_STYLES);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));

    const tiedPrograms = PROGRAMS.map((definition) => ({
      ...definition,
      recruitingInterestByTier: {
        recruit_tier_national: 60,
        recruit_tier_priority: 60,
        recruit_tier_developmental: 60,
      },
    }));
    const tied = beginRecruiting(career, CONFIG, [...tiedPrograms].reverse(), OFFENSE_STYLES);
    expect(tied.ok).toBe(true);
    if (tied.ok && tied.career.recruitingState.type === 'CHOOSING') {
      expect(tied.career.recruitingState.offers.map(({ programId }) => programId)).toEqual([
        'program_fixture_1',
        'program_fixture_2',
        'program_fixture_3',
        'program_fixture_4',
        'program_fixture_5',
      ]);
    }
  });

  it('rejects invalid state and catalogs without mutation or RNG consumption', () => {
    const career = planCareer();
    const choosing = beginRecruiting(career, CONFIG, PROGRAMS, OFFENSE_STYLES);
    expect(choosing.ok).toBe(true);
    if (!choosing.ok) {
      return;
    }
    const invalidConfig = JSON.parse(JSON.stringify(CONFIG)) as Record<string, unknown>;
    invalidConfig['offerCount'] = 4;
    const zeroInterest = PROGRAMS.map((definition) => ({
      ...definition,
      recruitingInterestByTier: {
        ...definition.recruitingInterestByTier,
        recruit_tier_priority: 0,
      },
    }));
    const invalidPhase = {
      ...career,
      phase: { type: 'WEEK_END', actionIds: [], results: [] },
    } as unknown as CareerRun;

    const failures = [
      beginRecruiting(choosing.career, CONFIG, PROGRAMS, OFFENSE_STYLES),
      beginRecruiting(invalidPhase, CONFIG, PROGRAMS, OFFENSE_STYLES),
      beginRecruiting(
        career,
        invalidConfig as unknown as RecruitingMechanicsConfig,
        PROGRAMS,
        OFFENSE_STYLES,
      ),
      beginRecruiting(career, CONFIG, PROGRAMS.slice(0, 4), OFFENSE_STYLES),
      beginRecruiting(career, CONFIG, PROGRAMS, []),
      beginRecruiting(career, CONFIG, zeroInterest, OFFENSE_STYLES),
    ];
    expect(failures.map((result) => (result.ok ? 'ok' : result.reason))).toEqual([
      'recruiting.already_started',
      'recruiting.invalid_career',
      'recruiting.invalid_config',
      'recruiting.invalid_program_catalog',
      'recruiting.invalid_offense_catalog',
      'recruiting.insufficient_offers',
    ]);
    for (const failure of failures) {
      expect(failure.ok).toBe(false);
      if (!failure.ok) {
        expect(failure.career.rng).toEqual(
          failure.career === choosing.career ? choosing.career.rng : career.rng,
        );
      }
    }
    expect(career.recruitingState).toEqual({ type: 'NOT_STARTED' });
  });

  it('blocks a new weekly plan until program commitment', () => {
    const career = planCareer();
    const result = commitWeeklyActionPlan(
      career,
      ['action_recovery', 'action_recovery', 'action_recovery'],
      ['action_recovery'],
    );
    expect(result).toEqual({ career, ok: false, reason: 'weekly.recruiting_required' });
  });

  it('lets a migrated in-flight week finish neutrally and begins recruiting only at planning', () => {
    const migratedWeekEnd = migrateCareerRunV6ToV7(
      migrateCareerRunV5ToV6(
        migrateCareerRunV4ToV5(
          migrateCareerRunV3ToV4(
            migrateCareerRunV2ToV3(migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.weekEnd)),
          ),
        ),
      ),
    );
    expect(migratedWeekEnd.recruitingState).toEqual({ type: 'NOT_STARTED' });
    expect(migratedWeekEnd.phase.type).toBe('WEEK_END');
    if (migratedWeekEnd.phase.type === 'WEEK_END') {
      expect(migratedWeekEnd.phase.depthUpdate).toBeNull();
      expect(migratedWeekEnd.phase.results.map(({ practiceImpact }) => practiceImpact)).toEqual([
        0, 0, 0,
      ]);
    }
    const advanced = advanceDevelopmentWeek(migratedWeekEnd, DEVELOPMENT_CONFIG);
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) {
      return;
    }
    expect(advanced.career.phase.type).toBe('PLAN_ACTIONS');
    expect(advanced.career.recruitingState).toEqual({ type: 'NOT_STARTED' });
    const choosing = beginRecruiting(advanced.career, CONFIG, PROGRAMS, OFFENSE_STYLES);
    expect(choosing.ok).toBe(true);
    if (choosing.ok) {
      expect(choosing.career.recruitingState.type).toBe('CHOOSING');
      expect(choosing.career.rng).toEqual(advanced.career.rng);
    }
  });
});

describe('seeded program commitment and initial WR room', () => {
  function choosingCareer(): CareerRun {
    const result = beginRecruiting(planCareer(), CONFIG, PROGRAMS, OFFENSE_STYLES);
    if (!result.ok) {
      throw new Error(result.reason);
    }
    return result.career;
  }

  it('generates only the chosen seven-player room with exact RNG and depth evidence', () => {
    const choosing = choosingCareer();
    const result = commitProgramChoice(
      choosing,
      'program_fixture_6',
      PROGRAMS,
      OFFENSE_STYLES,
      ROTATIONS,
      NAMES,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const { career } = result;
    expect(career.revision).toBe(choosing.revision + 1);
    expect(career.rng.drawCount - choosing.rng.drawCount).toBe(35);
    expect(career.programId).toBe('program_fixture_6');
    expect(career.recruitingState.type).toBe('COMMITTED');
    expect(career.programContext?.competitors).toHaveLength(7);
    expect(career.programContext?.depthOrderIds).toHaveLength(8);
    expect(career.programContext?.evaluations).toHaveLength(8);
    expect(
      career.programContext?.depthOrderIds.filter((id) => id === career.player.id),
    ).toHaveLength(1);
    expect(
      new Set(
        career.programContext?.competitors.map(
          ({ givenNameId, familyNameId }) => `${givenNameId}|${familyNameId}`,
        ),
      ).size,
    ).toBe(7);
    expect(career.programContext?.competitors.map(({ id }) => id)).toEqual([
      'roster_player_fixture_6_01',
      'roster_player_fixture_6_02',
      'roster_player_fixture_6_03',
      'roster_player_fixture_6_04',
      'roster_player_fixture_6_05',
      'roster_player_fixture_6_06',
      'roster_player_fixture_6_07',
    ]);
    expect(career.programContext?.evaluations.map(({ rank }) => rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(
      career.programContext?.evaluations.map(({ totalScoreMilli }) => totalScoreMilli),
    ).toEqual(
      [...(career.programContext?.evaluations ?? [])]
        .map(({ totalScoreMilli }) => totalScoreMilli)
        .sort((left, right) => right - left),
    );
    const playerEvaluation = career.programContext?.evaluations.find(
      ({ participantId }) => participantId === career.player.id,
    );
    expect(career.programContext?.projection.rank).toBe(playerEvaluation?.rank);
    expect(career.programContext?.projection.roleId).toBe(playerEvaluation?.roleId);
    expect(validateCareerRun(career)).toEqual({ ok: true, issues: [] });
    expectDeepFrozen(result);
  });

  it('replays byte-identically and normalizes all caller catalog orders', () => {
    const choosing = choosingCareer();
    const first = commitProgramChoice(
      choosing,
      'program_fixture_6',
      PROGRAMS,
      OFFENSE_STYLES,
      ROTATIONS,
      NAMES,
    );
    const reordered = commitProgramChoice(
      choosing,
      'program_fixture_6',
      [...PROGRAMS].reverse(),
      [...OFFENSE_STYLES].reverse(),
      [...ROTATIONS].reverse(),
      {
        givenNameIds: [...NAMES.givenNameIds].reverse(),
        familyNameIds: [...NAMES.familyNameIds].reverse(),
      },
    );
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(first));
  });

  it('rejects repeated, non-offer, malformed, and exhausted commands without draws', () => {
    const choosing = choosingCareer();
    const committed = commitProgramChoice(
      choosing,
      'program_fixture_6',
      PROGRAMS,
      OFFENSE_STYLES,
      ROTATIONS,
      NAMES,
    );
    expect(committed.ok).toBe(true);
    if (!committed.ok) {
      return;
    }
    const exhausted = {
      ...choosing,
      rng: { ...choosing.rng, drawCount: Number.MAX_SAFE_INTEGER - 34 },
    };
    const failures = [
      commitProgramChoice(
        committed.career,
        'program_fixture_6',
        PROGRAMS,
        OFFENSE_STYLES,
        ROTATIONS,
        NAMES,
      ),
      commitProgramChoice(
        choosing,
        'program_fixture_1',
        PROGRAMS,
        OFFENSE_STYLES,
        ROTATIONS,
        NAMES,
      ),
      commitProgramChoice(
        choosing,
        'program_fixture_6',
        PROGRAMS.slice(0, 5),
        OFFENSE_STYLES,
        ROTATIONS,
        NAMES,
      ),
      commitProgramChoice(choosing, 'program_fixture_6', PROGRAMS, [], ROTATIONS, NAMES),
      commitProgramChoice(choosing, 'program_fixture_6', PROGRAMS, OFFENSE_STYLES, [], NAMES),
      commitProgramChoice(choosing, 'program_fixture_6', PROGRAMS, OFFENSE_STYLES, ROTATIONS, {
        givenNameIds: [],
        familyNameIds: [],
      }),
      commitProgramChoice(
        exhausted,
        'program_fixture_6',
        PROGRAMS,
        OFFENSE_STYLES,
        ROTATIONS,
        NAMES,
      ),
    ];
    expect(failures.map((result) => (result.ok ? 'ok' : result.reason))).toEqual([
      'program_commit.not_choosing',
      'program_commit.invalid_program_selection',
      'program_commit.invalid_program_catalog',
      'program_commit.invalid_offense_catalog',
      'program_commit.invalid_rotation_catalog',
      'program_commit.invalid_name_pool',
      'program_commit.rng_exhausted',
    ]);
    expect(failures[0]?.career).toBe(committed.career);
    for (const failure of failures.slice(1, 6)) {
      expect(failure?.career).toBe(choosing);
      expect(failure?.career.rng).toEqual(choosing.rng);
    }
    expect(failures[6]?.career).toBe(exhausted);
  });
});
