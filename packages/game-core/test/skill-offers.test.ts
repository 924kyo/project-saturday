import {
  RECENT_WEEKLY_ACTION_ID_LIMIT,
  advanceDevelopmentWeek,
  chooseSkillBreakthrough,
  commitWeeklyActionPlan,
  createRng,
  deriveEligibleWeightedSkillOfferPool,
  deriveSkillBehaviorAffinityCounts,
  generateSkillBreakthroughOffer,
  isSkillBreakthroughCadenceWeek,
  migrateCareerRunV1ToV2,
  nextInt,
  nextUint32,
  parseCareerRunV2,
  resolveNextWeeklyAction,
  setEquippedSkillSlot,
  validateCareerRun,
  type CareerRun,
  type DevelopmentWeekConfig,
  type EquippedSkillIds,
  type GenerateSkillBreakthroughOfferInput,
  type RngState,
  type SkillAcquisitionRecord,
  type SkillBehaviorWeightRule,
  type SkillCommandResult,
  type SkillEffect,
  type SkillEligibility,
  type SkillId,
  type SkillMechanicsDefinition,
  type SkillOfferEligibilityContext,
  type WeeklyActionDefinition,
  type WeeklyActionId,
  type WeeklyCommandResult,
  type WeightedSkillOfferCandidate,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

import { CAREER_RUN_V1_PHASE_FIXTURES } from './fixtures/career-run-v1.js';

const DEVELOPMENT_CONFIG = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const satisfies DevelopmentWeekConfig;

const ROUTE_DRILLS = {
  id: 'action_route_drills',
  tagIds: ['action_family_training', 'action_focus_route_running'],
  attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 26 }],
  bodyDelta: -8,
  gpaDelta: 0,
  proficiencyId: 'proficiency_route_drills',
} as const satisfies WeeklyActionDefinition;

const RECOVERY = {
  id: 'action_recovery',
  tagIds: ['action_focus_body'],
  attributeXp: [],
  bodyDelta: 10,
  gpaDelta: 0,
  proficiencyId: null,
} as const satisfies WeeklyActionDefinition;

const STUDY_HALL = {
  id: 'action_study_hall',
  tagIds: ['action_focus_gpa'],
  attributeXp: [],
  bodyDelta: 0,
  gpaDelta: 0.1,
  proficiencyId: null,
} as const satisfies WeeklyActionDefinition;

const ACTION_DEFINITIONS = [ROUTE_DRILLS, RECOVERY, STUDY_HALL] as const;
const COMPLEX_HISTORY = [
  'action_study_hall',
  'action_route_drills',
  'action_route_drills',
  'action_recovery',
  'action_study_hall',
  'action_route_drills',
] as const satisfies readonly WeeklyActionId[];

const BASE_CONTEXT = {
  positionId: 'position_wr',
  archetypeId: 'archetype_wr_route_technician',
  playerTagIds: ['tag_competitive', 'tag_captain'],
  ownedSkillIds: [],
  weekIndex: 5,
  recentWeeklyActionIds: COMPLEX_HISTORY,
} as const satisfies SkillOfferEligibilityContext;

const PASSIVE_EFFECT = {
  type: 'passive_body_recovery_flat',
  delta: 1,
} as const satisfies SkillEffect;

type DeepMutable<T> = T extends object ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> } : T;

interface SkillDefinitionOptions {
  readonly gradeId?: SkillMechanicsDefinition['gradeId'];
  readonly baseOfferWeight?: number;
  readonly eligibility?: Partial<SkillEligibility>;
  readonly behaviorWeightRules?: readonly SkillBehaviorWeightRule[];
  readonly effects?: readonly SkillEffect[];
}

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const nestedValue of Object.values(value)) {
    expectDeepFrozen(nestedValue);
  }
}

function skillId(suffix: string): SkillId {
  return `skill_${suffix}` as SkillId;
}

function skillDefinition(
  id: SkillId,
  options: SkillDefinitionOptions = {},
): SkillMechanicsDefinition {
  return {
    id,
    gradeId: options.gradeId ?? 'skill_grade_c',
    familyId: 'skill_family_development',
    baseOfferWeight: options.baseOfferWeight ?? 100,
    eligibility: {
      positionIds: options.eligibility?.positionIds ?? [],
      archetypeIds: options.eligibility?.archetypeIds ?? [],
      requiredPlayerTagIds: options.eligibility?.requiredPlayerTagIds ?? [],
      excludedPlayerTagIds: options.eligibility?.excludedPlayerTagIds ?? [],
      minWeekIndex: options.eligibility?.minWeekIndex ?? 0,
    },
    behaviorWeightRules: options.behaviorWeightRules ?? [],
    effects: options.effects ?? [PASSIVE_EFFECT],
  };
}

function expectValid(career: CareerRun): CareerRun {
  expect(validateCareerRun(career)).toEqual({ ok: true, issues: [] });
  return career;
}

function weekEndAt(weekIndex: number, seed: string | number = 'skill-offer-week'): CareerRun {
  const career = jsonClone(migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.weekEnd));
  career.weekIndex = weekIndex;
  career.rng = jsonClone(createRng(seed));
  career.recentWeeklyActionIds = ['action_recovery', 'action_recovery', 'action_recovery'];
  if (career.phase.type !== 'WEEK_END') {
    throw new Error('Expected WEEK_END fixture.');
  }
  for (const result of career.phase.results) {
    result.weekIndex = weekIndex;
  }
  return expectValid(career);
}

function planAt(weekIndex = 17): CareerRun {
  const career = jsonClone(migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.plan));
  career.weekIndex = weekIndex;
  return expectValid(career);
}

function withOwnedSkills(
  base: CareerRun,
  ownedSkillIds: readonly SkillId[],
  equippedSkillIds?: EquippedSkillIds,
): CareerRun {
  const career = jsonClone(base);
  let rng: RngState = career.rng;
  const acquisitions: SkillAcquisitionRecord[] = [];
  for (const [index, selectedSkillId] of ownedSkillIds.entries()) {
    const before = rng.drawCount;
    for (let draw = 0; draw < 3; draw += 1) {
      rng = nextUint32(rng).nextRng;
    }
    acquisitions.push({
      offerIndex: index,
      weekIndex: 1 + index * 4,
      offeredSkillIds: [
        selectedSkillId,
        skillId(`history_${index}_alternate_a`),
        skillId(`history_${index}_alternate_b`),
      ],
      selectedSkillId,
      rngDrawCountBefore: before,
      rngDrawCountAfter: rng.drawCount,
    });
  }
  career.rng = jsonClone(rng);
  career.player.skillState = jsonClone({
    acquisitions,
    equippedSkillIds: equippedSkillIds ?? [
      ownedSkillIds[0] ?? null,
      ownedSkillIds[1] ?? null,
      ownedSkillIds[2] ?? null,
      ownedSkillIds[3] ?? null,
    ],
  });
  return expectValid(career);
}

function withPendingOffer(
  base: CareerRun,
  offeredSkillIds: readonly [SkillId, SkillId, SkillId],
): CareerRun {
  const career = jsonClone(base);
  const before = career.rng.drawCount;
  for (let draw = 0; draw < 3; draw += 1) {
    career.rng = jsonClone(nextUint32(career.rng).nextRng);
  }
  career.phase = {
    type: 'SKILL_BREAKTHROUGH',
    offer: {
      offerIndex: career.player.skillState.acquisitions.length,
      weekIndex: career.weekIndex,
      offeredSkillIds: [...offeredSkillIds],
      rngDrawCountBefore: before,
      rngDrawCountAfter: career.rng.drawCount,
    },
  };
  return expectValid(career);
}

function commandCareer(result: SkillCommandResult | WeeklyCommandResult): CareerRun {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.career;
}

function expectFailureUnchanged(
  result: SkillCommandResult | WeeklyCommandResult,
  career: CareerRun,
  reason: string,
): void {
  expect(result).toEqual({ ok: false, career, reason });
  expect(result.career).toBe(career);
}

function generationInput(
  rng: RngState = createRng('skill-offer-generation'),
): GenerateSkillBreakthroughOfferInput {
  return {
    ...BASE_CONTEXT,
    rng,
    offerIndex: 0,
  };
}

function independentlySampleWeightedIds(
  rng: RngState,
  candidates: readonly WeightedSkillOfferCandidate[],
): { readonly ids: readonly SkillId[]; readonly nextRng: RngState } {
  const remaining = candidates.map((candidate) => ({ ...candidate }));
  const ids: SkillId[] = [];
  let nextRng = rng;
  while (ids.length < 3) {
    const totalWeight = remaining.reduce((total, candidate) => total + candidate.weight, 0);
    const draw = nextInt(nextRng, 0, totalWeight);
    nextRng = draw.nextRng;
    let cumulative = 0;
    const index = remaining.findIndex(({ weight }) => {
      cumulative += weight;
      return draw.value < cumulative;
    });
    const [selected] = remaining.splice(index, 1);
    if (selected === undefined) {
      throw new Error('Independent sampler failed to select a candidate.');
    }
    ids.push(selected.skillId);
  }
  return { ids, nextRng };
}

describe('skill breakthrough eligibility and behavior affinity', () => {
  it('counts authored tags and derived repeat, varied, and adjacent study-to-training behavior', () => {
    expect(deriveSkillBehaviorAffinityCounts(COMPLEX_HISTORY, ACTION_DEFINITIONS)).toEqual({
      ok: true,
      counts: [
        { affinityTagId: 'action_family_training', count: 3 },
        { affinityTagId: 'action_focus_body', count: 1 },
        { affinityTagId: 'action_focus_gpa', count: 2 },
        { affinityTagId: 'action_focus_route_running', count: 3 },
        { affinityTagId: 'behavior_repeat_action', count: 3 },
        { affinityTagId: 'behavior_study_then_training', count: 2 },
        { affinityTagId: 'behavior_varied_actions', count: 1 },
      ],
    });
    expect(deriveSkillBehaviorAffinityCounts([], ACTION_DEFINITIONS)).toEqual({
      ok: true,
      counts: [],
    });
  });

  it('strictly rejects overlong history, missing action mappings, and malformed action catalogs', () => {
    expect(
      deriveSkillBehaviorAffinityCounts(
        [...COMPLEX_HISTORY, 'action_recovery'],
        ACTION_DEFINITIONS,
      ),
    ).toEqual({ ok: false, reason: 'skill_offer.invalid_input' });
    expect(deriveSkillBehaviorAffinityCounts(COMPLEX_HISTORY, [RECOVERY])).toEqual({
      ok: false,
      reason: 'skill_offer.missing_action_definition',
    });
    expect(
      deriveSkillBehaviorAffinityCounts(COMPLEX_HISTORY, [...ACTION_DEFINITIONS, ROUTE_DRILLS]),
    ).toEqual({ ok: false, reason: 'skill_offer.invalid_action_definitions' });
  });

  it('applies wildcard, WR position, archetype, all-required, any-excluded, inclusive week, and owned filters', () => {
    const definitions = [
      skillDefinition('skill_z_wildcard'),
      skillDefinition('skill_a_exact_match', {
        eligibility: {
          positionIds: ['position_wr'],
          archetypeIds: ['archetype_wr_route_technician'],
          requiredPlayerTagIds: ['tag_competitive', 'tag_captain'],
          excludedPlayerTagIds: ['tag_injured'],
          minWeekIndex: 5,
        },
      }),
      skillDefinition('skill_archetype_mismatch', {
        eligibility: { archetypeIds: ['archetype_wr_deep_threat'] },
      }),
      skillDefinition('skill_missing_required', {
        eligibility: { requiredPlayerTagIds: ['tag_competitive', 'tag_scholar'] },
      }),
      skillDefinition('skill_excluded', {
        eligibility: { excludedPlayerTagIds: ['tag_competitive'] },
      }),
      skillDefinition('skill_future', { eligibility: { minWeekIndex: 6 } }),
      skillDefinition('skill_already_owned'),
    ];
    const result = deriveEligibleWeightedSkillOfferPool(
      { ...BASE_CONTEXT, ownedSkillIds: ['skill_already_owned'] },
      definitions,
      ACTION_DEFINITIONS,
    );

    expect(result).toEqual({
      ok: true,
      behaviorCounts: expect.any(Array),
      candidates: [
        { skillId: 'skill_a_exact_match', weight: 100 },
        { skillId: 'skill_z_wildcard', weight: 100 },
      ],
    });

    const malformedFuturePosition = jsonClone(definitions[0] as SkillMechanicsDefinition);
    malformedFuturePosition.eligibility.positionIds = ['position_qb' as 'position_wr'];
    expect(
      deriveEligibleWeightedSkillOfferPool(
        BASE_CONTEXT,
        [malformedFuturePosition],
        ACTION_DEFINITIONS,
      ),
    ).toEqual({ ok: false, reason: 'skill_offer.invalid_skill_definitions' });
  });

  it('changes candidate weights by exact occurrence counts and preserves canonical ID order', () => {
    const definitions = [
      skillDefinition('skill_weight_varied', {
        baseOfferWeight: 10,
        behaviorWeightRules: [{ affinityTagId: 'behavior_varied_actions', weightBonus: 13 }],
      }),
      skillDefinition('skill_weight_route', {
        baseOfferWeight: 10,
        behaviorWeightRules: [{ affinityTagId: 'action_focus_route_running', weightBonus: 7 }],
      }),
      skillDefinition('skill_weight_repeat', {
        baseOfferWeight: 10,
        behaviorWeightRules: [{ affinityTagId: 'behavior_repeat_action', weightBonus: 5 }],
      }),
      skillDefinition('skill_weight_neutral', { baseOfferWeight: 10 }),
    ];
    const result = deriveEligibleWeightedSkillOfferPool(
      BASE_CONTEXT,
      definitions,
      ACTION_DEFINITIONS,
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        candidates: [
          { skillId: 'skill_weight_neutral', weight: 10 },
          { skillId: 'skill_weight_repeat', weight: 25 },
          { skillId: 'skill_weight_route', weight: 31 },
          { skillId: 'skill_weight_varied', weight: 23 },
        ],
      }),
    );
    expectDeepFrozen(result);
  });
});

describe('deterministic weighted offers', () => {
  const WEIGHTED_DEFINITIONS = [
    skillDefinition('skill_offer_d', { baseOfferWeight: 4 }),
    skillDefinition('skill_offer_b', { baseOfferWeight: 2 }),
    skillDefinition('skill_offer_a', { baseOfferWeight: 1 }),
    skillDefinition('skill_offer_c', { baseOfferWeight: 3 }),
  ] as const;

  it('is independent of both catalog input orders and samples exactly three distinct candidates without replacement', () => {
    const input = generationInput(createRng('canonical-offer'));
    const definitionsBefore = JSON.stringify(WEIGHTED_DEFINITIONS);
    const actionsBefore = JSON.stringify(ACTION_DEFINITIONS);
    const forward = generateSkillBreakthroughOffer(input, WEIGHTED_DEFINITIONS, ACTION_DEFINITIONS);
    const reversed = generateSkillBreakthroughOffer(
      input,
      [...WEIGHTED_DEFINITIONS].reverse(),
      [...ACTION_DEFINITIONS].reverse(),
    );

    expect(reversed).toEqual(forward);
    expect(JSON.stringify(WEIGHTED_DEFINITIONS)).toBe(definitionsBefore);
    expect(JSON.stringify(ACTION_DEFINITIONS)).toBe(actionsBefore);
    expect(forward.ok).toBe(true);
    if (!forward.ok || forward.offer === null) {
      throw new Error('Expected an offer.');
    }
    const canonicalPool = deriveEligibleWeightedSkillOfferPool(
      BASE_CONTEXT,
      WEIGHTED_DEFINITIONS,
      ACTION_DEFINITIONS,
    );
    if (!canonicalPool.ok) {
      throw new Error(canonicalPool.reason);
    }
    const expected = independentlySampleWeightedIds(input.rng, canonicalPool.candidates);
    expect(forward.offer.offeredSkillIds).toEqual(expected.ids);
    expect(forward.nextRng).toEqual(expected.nextRng);
    expect(new Set(forward.offer.offeredSkillIds).size).toBe(3);
    expect(forward.offer.rngDrawCountBefore).toBe(input.rng.drawCount);
    expect(forward.offer.rngDrawCountAfter).toBe(forward.nextRng.drawCount);
    expect(forward.offer.rngDrawCountAfter).toBeGreaterThanOrEqual(
      forward.offer.rngDrawCountBefore + 3,
    );
    expectDeepFrozen(forward);

    for (let seed = 0; seed < 32; seed += 1) {
      const generated = generateSkillBreakthroughOffer(
        generationInput(createRng(seed)),
        WEIGHTED_DEFINITIONS,
        ACTION_DEFINITIONS,
      );
      expect(generated.ok, `seed ${seed}`).toBe(true);
      if (!generated.ok || generated.offer === null) {
        throw new Error(`Expected an offer for seed ${seed}.`);
      }
      expect(generated.offer.offeredSkillIds).toHaveLength(3);
      expect(new Set(generated.offer.offeredSkillIds).size).toBe(3);
    }
  });

  it('pins rejection sampling, exact draw evidence, and reload continuation', () => {
    const rng = {
      algorithm: 'xoshiro128ss-v1',
      state: [1, 2_199_679_431, 2, 3],
      drawCount: 0,
    } as const satisfies RngState;
    const definitions = ['a', 'b', 'c'].map((suffix) =>
      skillDefinition(skillId(`exact_${suffix}`), { baseOfferWeight: 1 }),
    );
    const generated = generateSkillBreakthroughOffer(
      generationInput(rng),
      definitions,
      ACTION_DEFINITIONS,
    );

    expect(generated).toEqual({
      ok: true,
      offer: {
        offerIndex: 0,
        weekIndex: 5,
        offeredSkillIds: ['skill_exact_a', 'skill_exact_b', 'skill_exact_c'],
        rngDrawCountBefore: 0,
        rngDrawCountAfter: 4,
      },
      nextRng: {
        algorithm: 'xoshiro128ss-v1',
        state: [2_061_148_560, 3_057_435_421, 234_267_840, 3_477_371_288],
        drawCount: 4,
      },
    });
    expect(
      generateSkillBreakthroughOffer(
        jsonClone(generationInput(rng)),
        jsonClone(definitions),
        jsonClone(ACTION_DEFINITIONS),
      ),
    ).toEqual(generated);
  });

  it('returns null without drawing for fewer than three candidates and paired empty catalogs', () => {
    const rng = createRng('too-small-pool');
    const two = WEIGHTED_DEFINITIONS.slice(0, 2);
    for (const [skills, actions] of [
      [two, ACTION_DEFINITIONS],
      [[], []],
    ] as const) {
      const result = generateSkillBreakthroughOffer(generationInput(rng), skills, actions);
      expect(result).toEqual({ ok: true, offer: null, nextRng: rng });
      if (result.ok) {
        expect(result.nextRng).not.toBe(rng);
      }
    }
    expect(rng.drawCount).toBe(0);
  });

  it('rejects one-sided empty, incomplete, malformed, and non-exact inputs without consuming RNG', () => {
    const rng = createRng('offer-failures');
    const before = JSON.stringify(rng);
    const cases = [
      {
        result: generateSkillBreakthroughOffer(generationInput(rng), [], ACTION_DEFINITIONS),
        reason: 'skill_offer.invalid_skill_definitions',
      },
      {
        result: generateSkillBreakthroughOffer(generationInput(rng), WEIGHTED_DEFINITIONS, []),
        reason: 'skill_offer.invalid_action_definitions',
      },
      {
        result: generateSkillBreakthroughOffer(generationInput(rng), WEIGHTED_DEFINITIONS, [
          RECOVERY,
        ]),
        reason: 'skill_offer.missing_action_definition',
      },
      {
        result: generateSkillBreakthroughOffer(
          generationInput(rng),
          [WEIGHTED_DEFINITIONS[0], WEIGHTED_DEFINITIONS[0]],
          ACTION_DEFINITIONS,
        ),
        reason: 'skill_offer.invalid_skill_definitions',
      },
      {
        result: generateSkillBreakthroughOffer(generationInput(rng), WEIGHTED_DEFINITIONS, [
          ...ACTION_DEFINITIONS,
          ROUTE_DRILLS,
        ]),
        reason: 'skill_offer.invalid_action_definitions',
      },
      {
        result: generateSkillBreakthroughOffer(
          {
            ...generationInput(rng),
            extra: true,
          } as unknown as GenerateSkillBreakthroughOfferInput,
          WEIGHTED_DEFINITIONS,
          ACTION_DEFINITIONS,
        ),
        reason: 'skill_offer.invalid_input',
      },
      {
        result: generateSkillBreakthroughOffer(
          { ...generationInput(rng), offerIndex: 1 },
          WEIGHTED_DEFINITIONS,
          ACTION_DEFINITIONS,
        ),
        reason: 'skill_offer.invalid_input',
      },
      {
        result: generateSkillBreakthroughOffer(
          {
            ...generationInput(rng),
            ownedSkillIds: ['skill_already_owned'],
            offerIndex: 0,
          },
          WEIGHTED_DEFINITIONS,
          ACTION_DEFINITIONS,
        ),
        reason: 'skill_offer.invalid_input',
      },
      {
        result: generateSkillBreakthroughOffer(
          { ...generationInput(rng), weekIndex: 2 },
          WEIGHTED_DEFINITIONS,
          ACTION_DEFINITIONS,
        ),
        reason: 'skill_offer.invalid_input',
      },
    ] as const;

    for (const { result, reason } of cases) {
      expect(result).toEqual({ ok: false, reason });
    }
    expect(JSON.stringify(rng)).toBe(before);
  });

  it('rejects total-weight overflow and RNG exhaustion without mutating input state', () => {
    const overflowDefinitions = Array.from({ length: 614 }, (_, index) =>
      skillDefinition(skillId(`overflow_${index}`), {
        baseOfferWeight: 1_000_000,
        behaviorWeightRules: [
          { affinityTagId: 'action_focus_route_running', weightBonus: 1_000_000 },
        ],
      }),
    );
    const overflowContext = {
      ...BASE_CONTEXT,
      recentWeeklyActionIds: Array.from({ length: 6 }, () => 'action_route_drills'),
    } as const satisfies SkillOfferEligibilityContext;
    expect(
      deriveEligibleWeightedSkillOfferPool(
        overflowContext,
        overflowDefinitions,
        ACTION_DEFINITIONS,
      ),
    ).toEqual({ ok: false, reason: 'skill_offer.invalid_total_weight' });

    const baseRng = {
      algorithm: 'xoshiro128ss-v1',
      state: [1, 2_199_679_431, 2, 3],
      drawCount: Number.MAX_SAFE_INTEGER - 2,
    } as const satisfies RngState;
    const before = JSON.stringify(baseRng);
    const exactThree = ['a', 'b', 'c'].map((suffix) =>
      skillDefinition(skillId(`exhaust_${suffix}`), { baseOfferWeight: 1 }),
    );
    expect(
      generateSkillBreakthroughOffer(
        { ...generationInput(baseRng), recentWeeklyActionIds: [] },
        exactThree,
        ACTION_DEFINITIONS,
      ),
    ).toEqual({ ok: false, reason: 'skill_offer.rng_exhausted' });
    expect(JSON.stringify(baseRng)).toBe(before);
  });
});

describe('cadence and weekly advancement integration', () => {
  const OFFER_DEFINITIONS = ['a', 'b', 'c', 'd'].map((suffix) =>
    skillDefinition(skillId(`cadence_${suffix}`), { baseOfferWeight: 10 }),
  );

  it('uses completed-week cadence 1, 5, 9, 13 and persists one-revision offer transitions', () => {
    expect([1, 5, 9, 13].map(isSkillBreakthroughCadenceWeek)).toEqual([true, true, true, true]);
    expect(
      [0, 2, 4, 6, -1, 1.5, Number.MAX_SAFE_INTEGER].map(isSkillBreakthroughCadenceWeek),
    ).toEqual([false, false, false, false, false, false, false]);

    for (const inputWeek of [0, 4, 8, 12]) {
      const original = weekEndAt(inputWeek, `cadence-${inputWeek}`);
      const result = advanceDevelopmentWeek(
        original,
        DEVELOPMENT_CONFIG,
        OFFER_DEFINITIONS,
        ACTION_DEFINITIONS,
      );
      const advanced = commandCareer(result);
      expect(advanced.weekIndex).toBe(inputWeek + 1);
      expect(advanced.revision).toBe(original.revision + 1);
      expect(advanced.phase.type).toBe('SKILL_BREAKTHROUGH');
      if (advanced.phase.type !== 'SKILL_BREAKTHROUGH') {
        throw new Error('Expected skill breakthrough phase.');
      }
      expect(advanced.phase.offer).toEqual(
        expect.objectContaining({
          offerIndex: 0,
          weekIndex: inputWeek + 1,
          rngDrawCountBefore: original.rng.drawCount,
          rngDrawCountAfter: advanced.rng.drawCount,
        }),
      );
      expect(advanced.phase.offer.offeredSkillIds).toHaveLength(3);
      expect(new Set(advanced.phase.offer.offeredSkillIds).size).toBe(3);
      expect(advanced.lastPassiveBodyRecovery).toEqual(
        expect.objectContaining({ weekIndex: inputWeek, bodyBefore: 80, bodyAfter: 90 }),
      );
      expectValid(advanced);
      expectDeepFrozen(result);
    }
  });

  it('does not draw or mutate/freeze a mutable caller career on non-cadence advancement', () => {
    const original = weekEndAt(1, 'mutable-non-cadence');
    expect(Object.isFrozen(original)).toBe(false);
    expect(Object.isFrozen(original.rng)).toBe(false);
    expect(Object.isFrozen(original.rng.state)).toBe(false);
    const before = JSON.stringify(original);

    const advanced = commandCareer(advanceDevelopmentWeek(original, DEVELOPMENT_CONFIG));

    expect(JSON.stringify(original)).toBe(before);
    expect(Object.isFrozen(original)).toBe(false);
    expect(Object.isFrozen(original.rng)).toBe(false);
    expect(Object.isFrozen(original.rng.state)).toBe(false);
    expect(advanced.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(advanced.weekIndex).toBe(2);
    expect(advanced.rng).toEqual(original.rng);
    expect(advanced.rng).not.toBe(original.rng);
  });

  it('keeps a due week in PLAN and draws nothing when fewer than three skills are eligible', () => {
    const original = weekEndAt(0, 'cadence-small-pool');
    const advanced = commandCareer(
      advanceDevelopmentWeek(
        original,
        DEVELOPMENT_CONFIG,
        OFFER_DEFINITIONS.slice(0, 2),
        ACTION_DEFINITIONS,
      ),
    );
    expect(advanced.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(advanced.rng).toEqual(original.rng);
    expect(advanced.weekIndex).toBe(1);
    expect(advanced.revision).toBe(original.revision + 1);
  });

  it('derives ownership from acquisition history when excluding offered skills', () => {
    const ownedDefinition = OFFER_DEFINITIONS[0] as SkillMechanicsDefinition;
    const original = withOwnedSkills(
      weekEndAt(4, 'owned-exclusion'),
      [ownedDefinition.id],
      [ownedDefinition.id, null, null, null],
    );
    const advanced = commandCareer(
      advanceDevelopmentWeek(original, DEVELOPMENT_CONFIG, OFFER_DEFINITIONS, ACTION_DEFINITIONS),
    );
    if (advanced.phase.type !== 'SKILL_BREAKTHROUGH') {
      throw new Error('Expected skill breakthrough phase.');
    }
    expect(advanced.phase.offer.offerIndex).toBe(1);
    expect(advanced.phase.offer.offeredSkillIds).not.toContain(ownedDefinition.id);
    expect(advanced.phase.offer.offeredSkillIds).toHaveLength(3);
  });

  it('maps paired-catalog mismatch, malformed, overflow, and RNG exhaustion failures without state changes', () => {
    const original = weekEndAt(0, 'advance-failures');
    const malformed = [
      OFFER_DEFINITIONS[0] as SkillMechanicsDefinition,
      OFFER_DEFINITIONS[0] as SkillMechanicsDefinition,
    ];
    const overflow = Array.from({ length: 1_074 }, (_, index) =>
      skillDefinition(skillId(`advance_overflow_${index}`), {
        baseOfferWeight: 1_000_000,
        behaviorWeightRules: [{ affinityTagId: 'action_focus_body', weightBonus: 1_000_000 }],
      }),
    );
    const failures = [
      {
        result: advanceDevelopmentWeek(original, DEVELOPMENT_CONFIG, [], ACTION_DEFINITIONS),
        reason: 'weekly.invalid_skill_definitions',
      },
      {
        result: advanceDevelopmentWeek(original, DEVELOPMENT_CONFIG, OFFER_DEFINITIONS, []),
        reason: 'weekly.invalid_action_definitions',
      },
      {
        result: advanceDevelopmentWeek(original, DEVELOPMENT_CONFIG, malformed, ACTION_DEFINITIONS),
        reason: 'weekly.invalid_skill_definitions',
      },
      {
        result: advanceDevelopmentWeek(original, DEVELOPMENT_CONFIG, overflow, ACTION_DEFINITIONS),
        reason: 'weekly.invalid_skill_offer_weights',
      },
    ] as const;
    for (const { result, reason } of failures) {
      expectFailureUnchanged(result, original, reason);
    }

    const revisionExhausted = jsonClone(original);
    revisionExhausted.revision = Number.MAX_SAFE_INTEGER;
    expectValid(revisionExhausted);
    expectFailureUnchanged(
      advanceDevelopmentWeek(
        revisionExhausted,
        DEVELOPMENT_CONFIG,
        OFFER_DEFINITIONS,
        ACTION_DEFINITIONS,
      ),
      revisionExhausted,
      'weekly.revision_exhausted',
    );

    const exhausted = jsonClone(original);
    exhausted.rng = {
      algorithm: 'xoshiro128ss-v1',
      state: [1, 2_199_679_431, 2, 3],
      drawCount: Number.MAX_SAFE_INTEGER - 2,
    };
    expectValid(exhausted);
    const before = JSON.stringify(exhausted);
    const exhaustedResult = advanceDevelopmentWeek(
      exhausted,
      DEVELOPMENT_CONFIG,
      ['a', 'b', 'c'].map((suffix) =>
        skillDefinition(skillId(`advance_exhaust_${suffix}`), { baseOfferWeight: 1 }),
      ),
      ACTION_DEFINITIONS,
    );
    expectFailureUnchanged(exhaustedResult, exhausted, 'weekly.rng_exhausted');
    expect(JSON.stringify(exhausted)).toBe(before);
  });
});

describe('skill acquisition and loadout commands', () => {
  const OWNED_IDS = ['skill_owned_a', 'skill_owned_b', 'skill_owned_c', 'skill_owned_d'] as const;
  const OFFER_IDS = ['skill_new_a', 'skill_new_b', 'skill_new_c'] as const;

  it('copies the exact persisted offer into acquisition, equips the first open slot, and consumes no RNG', () => {
    const owned = withOwnedSkills(planAt(), OWNED_IDS.slice(0, 2), [
      OWNED_IDS[0],
      null,
      OWNED_IDS[1],
      null,
    ]);
    const pending = withPendingOffer(owned, OFFER_IDS);
    if (pending.phase.type !== 'SKILL_BREAKTHROUGH') {
      throw new Error('Expected pending offer.');
    }
    const offer = jsonClone(pending.phase.offer);
    const before = JSON.stringify(pending);
    const chosen = commandCareer(chooseSkillBreakthrough(pending, OFFER_IDS[1]));

    expect(JSON.stringify(pending)).toBe(before);
    expect(chosen.revision).toBe(pending.revision + 1);
    expect(chosen.rng).toEqual(pending.rng);
    expect(chosen.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(chosen.player.skillState.acquisitions.at(-1)).toEqual({
      ...offer,
      selectedSkillId: OFFER_IDS[1],
    });
    expect(chosen.player.skillState.equippedSkillIds).toEqual([
      OWNED_IDS[0],
      OFFER_IDS[1],
      OWNED_IDS[1],
      null,
    ]);
    expectDeepFrozen(chosen);
  });

  it('acquires a fifth skill without silently replacing a full loadout', () => {
    const full = withOwnedSkills(planAt(), OWNED_IDS, OWNED_IDS);
    const pending = withPendingOffer(full, OFFER_IDS);
    const chosen = commandCareer(chooseSkillBreakthrough(pending, OFFER_IDS[0]));

    expect(chosen.player.skillState.equippedSkillIds).toEqual(OWNED_IDS);
    expect(chosen.player.skillState.acquisitions).toHaveLength(5);
    expect(chosen.player.skillState.acquisitions.at(-1)?.selectedSkillId).toBe(OFFER_IDS[0]);
    expect(chosen.rng).toEqual(pending.rng);
  });

  it('continues identically after JSON reload and rejects choice failures by exact reference', () => {
    const pending = withPendingOffer(planAt(), OFFER_IDS);
    const parsed = parseCareerRunV2(JSON.stringify(pending));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(parsed.reason);
    }
    expect(chooseSkillBreakthrough(parsed.career, OFFER_IDS[2])).toEqual(
      chooseSkillBreakthrough(pending, OFFER_IDS[2]),
    );

    const wrongPhase = planAt();
    expectFailureUnchanged(
      chooseSkillBreakthrough(wrongPhase, OFFER_IDS[0]),
      wrongPhase,
      'skill.invalid_phase',
    );
    expectFailureUnchanged(
      chooseSkillBreakthrough(pending, 'not_a_skill' as SkillId),
      pending,
      'skill.invalid_skill_id',
    );
    expectFailureUnchanged(
      chooseSkillBreakthrough(pending, 'skill_not_offered'),
      pending,
      'skill.selection_not_offered',
    );
    const invalid = jsonClone(pending);
    if (invalid.phase.type !== 'SKILL_BREAKTHROUGH') {
      throw new Error('Expected pending offer.');
    }
    invalid.phase.offer.rngDrawCountAfter = invalid.phase.offer.rngDrawCountBefore + 2;
    expect(validateCareerRun(invalid).ok).toBe(false);
    expectFailureUnchanged(
      chooseSkillBreakthrough(invalid, OFFER_IDS[0]),
      invalid,
      'skill.invalid_career',
    );
    const exhausted = jsonClone(pending);
    exhausted.revision = Number.MAX_SAFE_INTEGER;
    expectValid(exhausted);
    expectFailureUnchanged(
      chooseSkillBreakthrough(exhausted, OFFER_IDS[0]),
      exhausted,
      'skill.revision_exhausted',
    );
  });

  it('sets, clears, and replaces exact PLAN slots immutably with one revision and zero draws', () => {
    const original = withOwnedSkills(planAt(), OWNED_IDS.slice(0, 3), [
      OWNED_IDS[0],
      null,
      OWNED_IDS[1],
      null,
    ]);
    const originalBefore = JSON.stringify(original);
    const set = commandCareer(setEquippedSkillSlot(original, 1, OWNED_IDS[2]));
    expect(JSON.stringify(original)).toBe(originalBefore);
    expect(set.player.skillState.equippedSkillIds).toEqual([
      OWNED_IDS[0],
      OWNED_IDS[2],
      OWNED_IDS[1],
      null,
    ]);
    expect(set.revision).toBe(original.revision + 1);
    expect(set.rng).toEqual(original.rng);
    expect(set.player.skillState.acquisitions).toEqual(original.player.skillState.acquisitions);

    const cleared = commandCareer(setEquippedSkillSlot(set, 0, null));
    expect(cleared.player.skillState.equippedSkillIds).toEqual([
      null,
      OWNED_IDS[2],
      OWNED_IDS[1],
      null,
    ]);
    const replaced = commandCareer(setEquippedSkillSlot(cleared, 2, OWNED_IDS[0]));
    expect(replaced.player.skillState.equippedSkillIds).toEqual([
      null,
      OWNED_IDS[2],
      OWNED_IDS[0],
      null,
    ]);
    expect(replaced.rng).toEqual(original.rng);
    expectDeepFrozen(replaced);
  });

  it('enforces PLAN-only slots, IDs, ownership, uniqueness, no-op, and revision exhaustion', () => {
    const plan = withOwnedSkills(planAt(), OWNED_IDS.slice(0, 3), [
      OWNED_IDS[0],
      null,
      OWNED_IDS[1],
      null,
    ]);
    const pending = withPendingOffer(plan, OFFER_IDS);
    expectFailureUnchanged(
      setEquippedSkillSlot(pending, 1, OWNED_IDS[2]),
      pending,
      'skill.invalid_phase',
    );

    const cases = [
      { slot: -1, skill: OWNED_IDS[2], reason: 'skill.invalid_slot_index' },
      { slot: 4, skill: OWNED_IDS[2], reason: 'skill.invalid_slot_index' },
      { slot: 1.5, skill: OWNED_IDS[2], reason: 'skill.invalid_slot_index' },
      { slot: 1, skill: 'not_a_skill' as SkillId, reason: 'skill.invalid_skill_id' },
      { slot: 1, skill: 'skill_unowned' as SkillId, reason: 'skill.skill_not_owned' },
      { slot: 1, skill: OWNED_IDS[0], reason: 'skill.duplicate_equipped' },
      { slot: 0, skill: OWNED_IDS[0], reason: 'skill.no_change' },
      { slot: 1, skill: null, reason: 'skill.no_change' },
    ] as const;
    const before = JSON.stringify(plan);
    for (const { slot, skill, reason } of cases) {
      expectFailureUnchanged(setEquippedSkillSlot(plan, slot, skill), plan, reason);
    }
    expect(JSON.stringify(plan)).toBe(before);

    const invalid = jsonClone(plan);
    invalid.player.skillState.equippedSkillIds[1] = OWNED_IDS[0];
    expect(validateCareerRun(invalid).ok).toBe(false);
    expectFailureUnchanged(
      setEquippedSkillSlot(invalid, 3, OWNED_IDS[2]),
      invalid,
      'skill.invalid_career',
    );

    const exhausted = jsonClone(plan);
    exhausted.revision = Number.MAX_SAFE_INTEGER;
    expectValid(exhausted);
    expectFailureUnchanged(
      setEquippedSkillSlot(exhausted, 1, OWNED_IDS[2]),
      exhausted,
      'skill.revision_exhausted',
    );
    expectFailureUnchanged(
      setEquippedSkillSlot(exhausted, 0, OWNED_IDS[0]),
      exhausted,
      'skill.no_change',
    );
  });

  it('preserves historical passive-recovery evidence while the current loadout changes', () => {
    const passive = skillDefinition('skill_passive_history', {
      effects: [{ type: 'passive_body_recovery_flat', delta: 4 }],
    });
    const weekEnd = withOwnedSkills(weekEndAt(1), [passive.id], [passive.id, null, null, null]);
    const plan = commandCareer(
      advanceDevelopmentWeek(weekEnd, DEVELOPMENT_CONFIG, [passive], ACTION_DEFINITIONS),
    );
    expect(plan.lastPassiveBodyRecovery?.appliedSkillEffects).toEqual([
      {
        type: 'passive_body_recovery_flat',
        skillId: passive.id,
        slotIndex: 0,
        effectIndex: 0,
        delta: 4,
      },
    ]);
    const evidence = jsonClone(plan.lastPassiveBodyRecovery);
    const cleared = commandCareer(setEquippedSkillSlot(plan, 0, null));
    const restored = commandCareer(setEquippedSkillSlot(cleared, 2, passive.id));
    expect(cleared.lastPassiveBodyRecovery).toEqual(evidence);
    expect(restored.lastPassiveBodyRecovery).toEqual(evidence);
    expectValid(restored);
  });
});

describe('bounded action history', () => {
  it('keeps the last six actions and makes the bounded suffix authoritative for later affinity', () => {
    const plan = jsonClone(planAt());
    plan.recentWeeklyActionIds = [
      'action_study_hall',
      'action_recovery',
      'action_recovery',
      'action_study_hall',
      'action_recovery',
      'action_recovery',
    ];
    expectValid(plan);
    const committed = commandCareer(
      commitWeeklyActionPlan(
        plan,
        ['action_route_drills', 'action_route_drills', 'action_route_drills'],
        ['action_route_drills'],
      ),
    );
    const resolved = commandCareer(
      resolveNextWeeklyAction(committed, ROUTE_DRILLS, DEVELOPMENT_CONFIG),
    );

    expect(resolved.recentWeeklyActionIds).toHaveLength(RECENT_WEEKLY_ACTION_ID_LIMIT);
    expect(resolved.recentWeeklyActionIds).toEqual([
      'action_recovery',
      'action_recovery',
      'action_study_hall',
      'action_recovery',
      'action_recovery',
      'action_route_drills',
    ]);
    expect(
      deriveSkillBehaviorAffinityCounts(resolved.recentWeeklyActionIds, ACTION_DEFINITIONS),
    ).toEqual(
      expect.objectContaining({
        ok: true,
        counts: expect.arrayContaining([
          { affinityTagId: 'behavior_repeat_action', count: 3 },
          { affinityTagId: 'behavior_varied_actions', count: 1 },
        ]),
      }),
    );
  });
});
