import {
  BODY_BOUNDS,
  GPA_BOUNDS,
  PLAYER_ATTRIBUTE_IDS,
  TRAINING_PROFICIENCY_IDS,
  TRAINING_PROFICIENCY_USE_HARD_CAP,
  WEEKLY_ACTION_IDS,
  advanceDevelopmentWeek,
  commitWeeklyActionPlan,
  createWrCareer,
  deriveBodyXpEfficiencyPermille,
  deriveTrainingProficiencyLevel,
  getTrainingProficiencyUseCap,
  getTrainingProficiencyXpMultiplierPermille,
  isDevelopmentWeekConfig,
  isWeeklyActionDefinition,
  resolveNextWeeklyAction,
  validateCareerRun,
  type CareerRun,
  type CreateWrCareerInput,
  type DevelopmentWeekConfig,
  type InitialAttributeRatings,
  type WeeklyActionDefinition,
  type WeeklyActionId,
  type WeeklyCommandResult,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

const DEVELOPMENT_CONFIG = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const satisfies DevelopmentWeekConfig;

const ROUTE_DRILLS = {
  id: 'action_route_drills',
  tagIds: ['action_focus_route_running'],
  attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 26 }],
  bodyDelta: -8,
  gpaDelta: 0,
  proficiencyId: 'proficiency_route_drills',
} as const satisfies WeeklyActionDefinition;

const RECOVERY = {
  id: 'action_recovery',
  tagIds: ['action_focus_recovery'],
  attributeXp: [],
  bodyDelta: 32,
  gpaDelta: 0,
  proficiencyId: null,
} as const satisfies WeeklyActionDefinition;

const STUDY_HALL = {
  id: 'action_study_hall',
  tagIds: ['action_focus_academics'],
  attributeXp: [],
  bodyDelta: 0,
  gpaDelta: 0.15,
  proficiencyId: null,
} as const satisfies WeeklyActionDefinition;

function baseRatings(rating = 60): InitialAttributeRatings {
  return Object.fromEntries(
    PLAYER_ATTRIBUTE_IDS.map((attributeId) => [attributeId, rating]),
  ) as unknown as InitialAttributeRatings;
}

function creationInput(): CreateWrCareerInput {
  return {
    careerSeed: 'weekly-actions-fixture',
    identity: {
      displayName: 'Weekly Test',
      archetypeId: 'archetype_wr_route_technician',
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_competitive', 'personality_quiet'],
      appearance: {
        skinToneId: 'skin_tone_01',
        faceId: 'face_01',
        hairStyleId: 'hair_style_short',
        hairColorId: 'hair_color_black',
        bodyTypeId: 'body_type_balanced',
        eyeBlackId: null,
        armSleevesId: null,
        glovesId: null,
        visorId: null,
        wristTapeId: null,
        towelId: null,
        jerseyFitId: 'jersey_fit_standard',
        footwearId: 'footwear_standard',
      },
      heightCm: 188,
      weightKg: 88,
    },
    mechanics: {
      baseAttributeRatings: baseRatings(),
      baseState: {
        state_body: 80,
        state_confidence: 50,
        state_coach_trust: 10,
        state_brand: 5,
        state_gpa: 3,
      },
      archetypeProfile: {
        id: 'archetype_wr_route_technician',
        attributeModifiers: [
          { attributeId: 'attribute_wr_route_running', delta: 5 },
          { attributeId: 'attribute_speed', delta: -3 },
        ],
        stateModifiers: [],
        grantedTagIds: ['tag_role_precision_routes'],
      },
      backgroundProfile: {
        id: 'background_late_bloomer',
        attributeModifiers: [
          { attributeId: 'attribute_work_ethic', delta: 4 },
          { attributeId: 'attribute_wr_release', delta: -3 },
        ],
        stateModifiers: [],
        grantedTagIds: ['tag_recruiting_late_growth'],
      },
      personalityProfiles: [
        {
          id: 'personality_competitive',
          attributeModifiers: [{ attributeId: 'attribute_work_ethic', delta: 2 }],
          stateModifiers: [{ stateId: 'state_body', delta: -3 }],
          grantedTagIds: ['tag_event_seeks_challenge'],
          incompatibleTraitIds: [],
        },
        {
          id: 'personality_quiet',
          attributeModifiers: [{ attributeId: 'attribute_composure', delta: 2 }],
          stateModifiers: [{ stateId: 'state_brand', delta: -3 }],
          grantedTagIds: ['tag_media_reserved'],
          incompatibleTraitIds: ['personality_social'],
        },
      ],
    },
  };
}

function createCareer(): CareerRun {
  const result = createWrCareer(creationInput());
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.career;
}

function commandCareer(result: WeeklyCommandResult): CareerRun {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.career;
}

function commit(
  career: CareerRun,
  actionIds: readonly WeeklyActionId[] = [
    'action_route_drills',
    'action_route_drills',
    'action_route_drills',
  ],
): CareerRun {
  return commandCareer(commitWeeklyActionPlan(career, actionIds, WEEKLY_ACTION_IDS));
}

function resolveAll(
  career: CareerRun,
  definitions: readonly WeeklyActionDefinition[],
  config: DevelopmentWeekConfig = DEVELOPMENT_CONFIG,
): CareerRun {
  let current = career;
  for (const definition of definitions) {
    current = commandCareer(resolveNextWeeklyAction(current, definition, config));
  }
  return current;
}

type DeepMutable<T> = T extends object ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> } : T;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

describe('development tuning and definitions', () => {
  it('validates the data-driven smooth Body and diminishing proficiency curve', () => {
    expect(isDevelopmentWeekConfig(DEVELOPMENT_CONFIG)).toBe(true);
    expect(getTrainingProficiencyUseCap(DEVELOPMENT_CONFIG)).toBe(20);

    for (let body = BODY_BOUNDS.min; body <= BODY_BOUNDS.max; body += 1) {
      expect(deriveBodyXpEfficiencyPermille(body, DEVELOPMENT_CONFIG)).toBe(600 + body * 4);
    }
    for (const boundary of [19, 39, 59, 79]) {
      expect(
        deriveBodyXpEfficiencyPermille(boundary + 1, DEVELOPMENT_CONFIG) -
          deriveBodyXpEfficiencyPermille(boundary, DEVELOPMENT_CONFIG),
      ).toBe(4);
    }

    const expectedLevels = [
      [0, 0],
      [1, 0],
      [2, 1],
      [4, 1],
      [5, 2],
      [8, 2],
      [9, 3],
      [13, 3],
      [14, 4],
      [19, 4],
      [20, 5],
      [999, 5],
    ] as const;
    for (const [uses, level] of expectedLevels) {
      expect(deriveTrainingProficiencyLevel(uses, DEVELOPMENT_CONFIG)).toBe(level);
    }
    const multipliers = [0, 1, 2, 3, 4, 5].map((level) =>
      getTrainingProficiencyXpMultiplierPermille(
        level as 0 | 1 | 2 | 3 | 4 | 5,
        DEVELOPMENT_CONFIG,
      ),
    );
    const marginalBonuses = multipliers.slice(1).map((value, index) => value - multipliers[index]!);
    expect(marginalBonuses).toEqual([80, 60, 40, 30, 20]);
    expect(() =>
      getTrainingProficiencyXpMultiplierPermille(
        6 as unknown as 0 | 1 | 2 | 3 | 4 | 5,
        DEVELOPMENT_CONFIG,
      ),
    ).toThrow(RangeError);
  });

  it('rejects malformed, non-baseline, flat, and non-diminishing config curves', () => {
    const invalidConfigs: unknown[] = [
      { ...DEVELOPMENT_CONFIG, extra: true },
      { ...DEVELOPMENT_CONFIG, proficiencyUseThresholds: [1, 2, 5, 9, 14, 20] },
      { ...DEVELOPMENT_CONFIG, proficiencyUseThresholds: [0, 2, 2, 9, 14, 20] },
      {
        ...DEVELOPMENT_CONFIG,
        proficiencyXpMultipliersPermille: [999, 1080, 1140, 1180, 1210, 1230],
      },
      {
        ...DEVELOPMENT_CONFIG,
        proficiencyXpMultipliersPermille: [1000, 1080, 1080, 1180, 1210, 1230],
      },
      {
        ...DEVELOPMENT_CONFIG,
        proficiencyXpMultipliersPermille: [1000, 1020, 1060, 1090, 1110, 1120],
      },
      { ...DEVELOPMENT_CONFIG, bodyXpEfficiencyMinPermille: 700, bodyXpEfficiencyPerBodyPoint: 4 },
      { ...DEVELOPMENT_CONFIG, passiveBodyRecovery: 101 },
    ];
    for (const config of invalidConfigs) {
      expect(isDevelopmentWeekConfig(config)).toBe(false);
    }
  });

  it('strictly validates action mechanics and authoritative proficiency pairing', () => {
    expect(isWeeklyActionDefinition(ROUTE_DRILLS)).toBe(true);
    expect(isWeeklyActionDefinition(RECOVERY)).toBe(true);
    expect(isWeeklyActionDefinition(STUDY_HALL)).toBe(true);

    const invalidDefinitions: unknown[] = [
      { ...ROUTE_DRILLS, nameKey: 'not_core_mechanics' },
      { ...ROUTE_DRILLS, proficiencyId: 'proficiency_speed_work' },
      { ...RECOVERY, proficiencyId: 'proficiency_route_drills' },
      { ...RECOVERY, bodyDelta: 0 },
      { ...ROUTE_DRILLS, bodyDelta: -41 },
      { ...ROUTE_DRILLS, gpaDelta: 0.51 },
      { ...ROUTE_DRILLS, attributeXp: [{ attributeId: 'attribute_speed', baseXp: 0 }] },
      {
        ...ROUTE_DRILLS,
        attributeXp: [{ attributeId: 'attribute_speed', baseXp: 10, extra: true }],
      },
      {
        ...ROUTE_DRILLS,
        attributeXp: [
          { attributeId: 'attribute_speed', baseXp: 10 },
          { attributeId: 'attribute_speed', baseXp: 12 },
        ],
      },
    ];
    for (const definition of invalidDefinitions) {
      expect(isWeeklyActionDefinition(definition)).toBe(false);
    }
  });
});

describe('weekly phase commands', () => {
  it('initializes schema-v2 planning state, revision, history, skills, and proficiency uses', () => {
    const career = createCareer();
    expect(career.revision).toBe(0);
    expect(career.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(career.recentWeeklyActionIds).toEqual([]);
    expect(career.player.skillState).toEqual({
      acquisitions: [],
      equippedSkillIds: [null, null, null, null],
    });
    expect(career.player.trainingProficiencyUses).toEqual(
      Object.fromEntries(TRAINING_PROFICIENCY_IDS.map((proficiencyId) => [proficiencyId, 0])),
    );
    expect(validateCareerRun(career)).toEqual({ ok: true, issues: [] });
  });

  it('commits exactly three available IDs, including duplicates, without storing UI draft state', () => {
    const before = createCareer();
    const after = commit(before);

    expect(after).not.toBe(before);
    expect(after.revision).toBe(1);
    expect(after.phase).toEqual({
      type: 'RESOLVE_ACTIONS',
      actionIds: ['action_route_drills', 'action_route_drills', 'action_route_drills'],
      nextActionIndex: 0,
      results: [],
    });
    expect(before.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(Object.isFrozen(after.phase)).toBe(true);
  });

  it('rejects short, long, sparse, unknown, and unavailable plans without mutation', () => {
    const career = createCareer();
    const sparse = new Array<WeeklyActionId>(3);
    sparse[0] = 'action_route_drills';
    const cases = [
      commitWeeklyActionPlan(career, ['action_route_drills', 'action_recovery'], WEEKLY_ACTION_IDS),
      commitWeeklyActionPlan(
        career,
        ['action_route_drills', 'action_recovery', 'action_study_hall', 'action_speed_work'],
        WEEKLY_ACTION_IDS,
      ),
      commitWeeklyActionPlan(career, sparse, WEEKLY_ACTION_IDS),
      commitWeeklyActionPlan(
        career,
        ['action_route_drills', 'action_unknown' as WeeklyActionId, 'action_recovery'],
        WEEKLY_ACTION_IDS,
      ),
      commitWeeklyActionPlan(
        career,
        ['action_route_drills', 'action_recovery', 'action_study_hall'],
        ['action_route_drills'],
      ),
    ];
    expect(cases.map((result) => (result.ok ? undefined : result.reason))).toEqual([
      'weekly.invalid_plan_length',
      'weekly.invalid_plan_length',
      'weekly.invalid_action_id',
      'weekly.invalid_action_id',
      'weekly.action_unavailable',
    ]);
    for (const result of cases) {
      expect(result.career).toBe(career);
      expect(career.revision).toBe(0);
    }
  });

  it('resolves the committed queue in order using pre-action Body and level-before proficiency', () => {
    const initial = createCareer();
    const committed = commit(initial);
    const finished = resolveAll(committed, [ROUTE_DRILLS, ROUTE_DRILLS, ROUTE_DRILLS]);

    expect(finished.revision).toBe(4);
    expect(finished.recentWeeklyActionIds).toEqual([
      'action_route_drills',
      'action_route_drills',
      'action_route_drills',
    ]);
    expect(finished.phase.type).toBe('WEEK_END');
    if (finished.phase.type !== 'WEEK_END') {
      throw new Error('Expected WEEK_END.');
    }
    expect(finished.phase.results.map((result) => result.bodyBefore)).toEqual([77, 69, 61]);
    expect(finished.phase.results.map((result) => result.bodyAfter)).toEqual([69, 61, 53]);
    expect(finished.phase.results.map((result) => result.bodyXpEfficiencyPermille)).toEqual([
      908, 876, 844,
    ]);
    expect(finished.phase.results.map((result) => result.attributeXp[0]?.awardedXp)).toEqual([
      23, 22, 23,
    ]);
    expect(finished.phase.results.map((result) => result.proficiency?.levelBefore)).toEqual([
      0, 0, 1,
    ]);
    expect(finished.player.trainingProficiencyUses.proficiency_route_drills).toBe(3);
    expect(finished.player.state.body).toBe(53);
    expect(finished.rng).toEqual(initial.rng);
    expect(finished.rng.drawCount).toBe(0);
    expect(finished.phase.results[0].effectIds).toEqual([
      'effect_attribute_progress',
      'effect_body_change',
      'effect_proficiency_progress',
    ]);
  });

  it('rejects phase-invalid and mismatched commands without changing the career reference', () => {
    const plan = createCareer();
    const committed = commit(plan);
    const failures = [
      resolveNextWeeklyAction(plan, ROUTE_DRILLS, DEVELOPMENT_CONFIG),
      advanceDevelopmentWeek(plan, DEVELOPMENT_CONFIG),
      commitWeeklyActionPlan(
        committed,
        [ROUTE_DRILLS.id, ROUTE_DRILLS.id, ROUTE_DRILLS.id],
        WEEKLY_ACTION_IDS,
      ),
      resolveNextWeeklyAction(committed, RECOVERY, DEVELOPMENT_CONFIG),
    ];
    expect(failures.map((result) => (result.ok ? undefined : result.reason))).toEqual([
      'weekly.invalid_phase',
      'weekly.invalid_phase',
      'weekly.invalid_phase',
      'weekly.action_definition_mismatch',
    ]);
    expect(failures[0]?.career).toBe(plan);
    expect(failures[1]?.career).toBe(plan);
    expect(failures[2]?.career).toBe(committed);
    expect(failures[3]?.career).toBe(committed);
  });

  it('replays identical inputs exactly and preserves persisted RNG state/results', () => {
    const input = commit(createCareer(), [
      'action_recovery',
      'action_study_hall',
      'action_route_drills',
    ]);
    const first = resolveAll(input, [RECOVERY, STUDY_HALL, ROUTE_DRILLS]);
    const replay = resolveAll(input, [RECOVERY, STUDY_HALL, ROUTE_DRILLS]);

    expect(first).toEqual(replay);
    expect(first.rng).toEqual(input.rng);
    expect(first.phase.type).toBe('WEEK_END');
    expect(JSON.parse(JSON.stringify(first.phase))).toEqual(first.phase);
  });

  it('rolls XP into ratings, caps rating 100/xp 0, and records awarded versus applied XP', () => {
    const nearCap = jsonClone(createCareer());
    nearCap.player.state.body = 100;
    nearCap.player.attributes.wr.attribute_wr_route_running = { rating: 99, xp: 90 };
    const committed = commit(nearCap);
    const resolved = commandCareer(
      resolveNextWeeklyAction(
        committed,
        {
          ...ROUTE_DRILLS,
          attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 50 }],
        },
        DEVELOPMENT_CONFIG,
      ),
    );
    if (resolved.phase.type !== 'RESOLVE_ACTIONS') {
      throw new Error('Expected RESOLVE_ACTIONS.');
    }
    expect(resolved.phase.results[0]?.attributeXp[0]).toEqual(
      expect.objectContaining({
        awardedXp: 50,
        appliedXp: 10,
        ratingAfter: 100,
        xpAfter: 0,
      }),
    );

    const capped = jsonClone(createCareer());
    capped.player.state.body = 100;
    capped.player.attributes.wr.attribute_wr_route_running = { rating: 100, xp: 0 };
    const cappedResolved = commandCareer(
      resolveNextWeeklyAction(
        commit(capped),
        {
          ...ROUTE_DRILLS,
          attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 50 }],
        },
        DEVELOPMENT_CONFIG,
      ),
    );
    if (cappedResolved.phase.type !== 'RESOLVE_ACTIONS') {
      throw new Error('Expected RESOLVE_ACTIONS.');
    }
    expect(cappedResolved.phase.results[0]?.attributeXp[0]).toEqual(
      expect.objectContaining({ awardedXp: 50, appliedXp: 0, ratingAfter: 100, xpAfter: 0 }),
    );
  });

  it('clamps requested recovery/GPA deltas and records requested and actual values', () => {
    const raw = jsonClone(createCareer());
    raw.player.state.body = 90;
    raw.player.state.gpa = 3.95;
    const committed = commit(raw, ['action_recovery', 'action_study_hall', 'action_study_hall']);
    const recovered = commandCareer(
      resolveNextWeeklyAction(committed, RECOVERY, DEVELOPMENT_CONFIG),
    );
    const studied = commandCareer(
      resolveNextWeeklyAction(recovered, STUDY_HALL, DEVELOPMENT_CONFIG),
    );
    if (studied.phase.type !== 'RESOLVE_ACTIONS') {
      throw new Error('Expected RESOLVE_ACTIONS.');
    }
    expect(studied.phase.results[0]).toEqual(
      expect.objectContaining({ requestedBodyDelta: 32, actualBodyDelta: 10, bodyAfter: 100 }),
    );
    expect(studied.phase.results[1]).toEqual(
      expect.objectContaining({ requestedGpaDelta: 0.15, actualGpaDelta: 0.05, gpaAfter: 4 }),
    );
    expect(studied.player.state.body).toBe(100);
    expect(studied.player.state.gpa).toBe(4);
  });

  it('caps proficiency at the configured final threshold and never lowers prior uses', () => {
    const atCap = jsonClone(createCareer());
    atCap.player.trainingProficiencyUses.proficiency_route_drills = 20;
    const capped = commandCareer(
      resolveNextWeeklyAction(commit(atCap), ROUTE_DRILLS, DEVELOPMENT_CONFIG),
    );
    expect(capped.player.trainingProficiencyUses.proficiency_route_drills).toBe(20);

    const loweredConfig = {
      ...DEVELOPMENT_CONFIG,
      proficiencyUseThresholds: [0, 1, 3, 5, 7, 10],
    } as const satisfies DevelopmentWeekConfig;
    const aboveNewCap = commandCareer(
      resolveNextWeeklyAction(commit(atCap), ROUTE_DRILLS, loweredConfig),
    );
    expect(aboveNewCap.player.trainingProficiencyUses.proficiency_route_drills).toBe(20);
    expect(validateCareerRun(aboveNewCap).ok).toBe(true);
  });

  it('advances only from WEEK_END, applies tuneable passive recovery, and resets planning state', () => {
    const weekEnd = resolveAll(commit(createCareer()), [ROUTE_DRILLS, ROUTE_DRILLS, ROUTE_DRILLS]);
    const advanced = commandCareer(advanceDevelopmentWeek(weekEnd, DEVELOPMENT_CONFIG));

    expect(advanced.weekIndex).toBe(1);
    expect(advanced.revision).toBe(5);
    expect(advanced.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(advanced.player.state.body).toBe(63);
    expect(advanced.rng).toEqual(weekEnd.rng);
  });

  it('rejects invalid tuning and revision/week overflow with stable reasons', () => {
    const committed = commit(createCareer());
    const invalidConfig = {
      ...DEVELOPMENT_CONFIG,
      proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1190, 1240, 1300],
    } as unknown as DevelopmentWeekConfig;
    const invalid = resolveNextWeeklyAction(committed, ROUTE_DRILLS, invalidConfig);
    expect(invalid.ok ? undefined : invalid.reason).toBe('weekly.invalid_development_config');

    const weekEnd = resolveAll(committed, [ROUTE_DRILLS, ROUTE_DRILLS, ROUTE_DRILLS]);
    const revisionMax = jsonClone(weekEnd);
    revisionMax.revision = Number.MAX_SAFE_INTEGER;
    expect(advanceDevelopmentWeek(revisionMax, DEVELOPMENT_CONFIG)).toEqual(
      expect.objectContaining({ ok: false, reason: 'weekly.revision_exhausted' }),
    );
    const weekMax = jsonClone(weekEnd);
    weekMax.weekIndex = Number.MAX_SAFE_INTEGER;
    if (weekMax.phase.type === 'WEEK_END') {
      for (const result of weekMax.phase.results) {
        result.weekIndex = Number.MAX_SAFE_INTEGER;
      }
    }
    expect(advanceDevelopmentWeek(weekMax, DEVELOPMENT_CONFIG)).toEqual(
      expect.objectContaining({ ok: false, reason: 'weekly.week_index_exhausted' }),
    );
  });

  it('survives exact JSON round-trips in every authoritative phase', () => {
    const plan = createCareer();
    const resolveZero = commit(plan);
    const resolveOne = commandCareer(
      resolveNextWeeklyAction(resolveZero, ROUTE_DRILLS, DEVELOPMENT_CONFIG),
    );
    const weekEnd = resolveAll(resolveOne, [ROUTE_DRILLS, ROUTE_DRILLS]);

    for (const career of [plan, resolveZero, resolveOne, weekEnd]) {
      const restored = jsonClone(career);
      expect(validateCareerRun(restored)).toEqual({ ok: true, issues: [] });
      expect(restored).toEqual(career);
    }
  });

  it('maintains every player bound over many deterministic weeks', () => {
    let career = createCareer();
    for (let week = 0; week < 100; week += 1) {
      career = commit(career, ['action_route_drills', 'action_recovery', 'action_study_hall']);
      career = resolveAll(career, [ROUTE_DRILLS, RECOVERY, STUDY_HALL]);
      career = commandCareer(advanceDevelopmentWeek(career, DEVELOPMENT_CONFIG));
      expect(career.player.state.body).toBeGreaterThanOrEqual(BODY_BOUNDS.min);
      expect(career.player.state.body).toBeLessThanOrEqual(BODY_BOUNDS.max);
      expect(career.player.state.gpa).toBeGreaterThanOrEqual(GPA_BOUNDS.min);
      expect(career.player.state.gpa).toBeLessThanOrEqual(GPA_BOUNDS.max);
      expect(career.player.attributes.wr.attribute_wr_route_running.rating).toBeLessThanOrEqual(
        100,
      );
      expect(career.player.trainingProficiencyUses.proficiency_route_drills).toBeLessThanOrEqual(
        20,
      );
      expect(validateCareerRun(career).ok).toBe(true);
    }
    expect(career.rng.drawCount).toBe(0);
    expect(career.recentWeeklyActionIds).toEqual([
      'action_route_drills',
      'action_recovery',
      'action_study_hall',
      'action_route_drills',
      'action_recovery',
      'action_study_hall',
    ]);
  });
});

describe('strict persisted weekly invariants', () => {
  it('rejects phase/result/proficiency/revision tampering deterministically', () => {
    const weekEnd = resolveAll(commit(createCareer()), [ROUTE_DRILLS, ROUTE_DRILLS, ROUTE_DRILLS]);
    const mutations: Array<(career: DeepMutable<CareerRun>) => void> = [
      (career) => {
        career.revision = 1.5;
      },
      (career) => {
        (career.phase as unknown as Record<string, unknown>)['unknown'] = true;
      },
      (career) => {
        if (career.phase.type === 'WEEK_END') career.phase.results.pop();
      },
      (career) => {
        if (career.phase.type === 'WEEK_END') career.phase.results[0].actionIndex = 2;
      },
      (career) => {
        if (career.phase.type === 'WEEK_END') career.phase.results[1].bodyBefore += 1;
      },
      (career) => {
        if (career.phase.type === 'WEEK_END') career.phase.results[0].effectIds = [];
      },
      (career) => {
        if (career.phase.type === 'WEEK_END' && career.phase.results[0].proficiency !== null) {
          career.phase.results[0].proficiency.usesAfter += 2;
        }
      },
      (career) => {
        career.player.trainingProficiencyUses.proficiency_route_drills += 1;
      },
    ];

    for (const mutate of mutations) {
      const tampered = jsonClone(weekEnd);
      mutate(tampered);
      const result = validateCareerRun(tampered);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    }
  });

  it('accepts the hard proficiency safety cap but rejects values beyond it', () => {
    const within = jsonClone(createCareer());
    within.player.trainingProficiencyUses.proficiency_route_drills =
      TRAINING_PROFICIENCY_USE_HARD_CAP;
    expect(validateCareerRun(within).ok).toBe(true);

    const beyond = jsonClone(within);
    beyond.player.trainingProficiencyUses.proficiency_route_drills += 1;
    expect(validateCareerRun(beyond).ok).toBe(false);
  });
});
