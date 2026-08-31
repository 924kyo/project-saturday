import {
  NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES,
  SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS,
  SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS,
  SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS,
  WEEKLY_ACTION_IDS,
  advanceDevelopmentWeek,
  collectEquippedGameHooks,
  commitWeeklyActionPlan,
  derivePassiveBodyRecovery,
  isSkillActionScope,
  isSkillEffect,
  isSkillEffectCondition,
  isSkillMechanicsDefinition,
  isSkillMechanicsDefinitionCatalog,
  migrateCareerRunV1ToV2,
  nextUint32,
  parseCareerRunV2,
  resolveNextWeeklyAction,
  validateCareerRun,
  validateCareerRunV1,
  validateCareerRunV2,
  type CareerRun,
  type CareerRunV1,
  type DevelopmentWeekConfig,
  type EquippedSkillIds,
  type SkillEffect,
  type SkillEffectCondition,
  type SkillId,
  type SkillMechanicsDefinition,
  type WeeklyActionDefinition,
  type WeeklyActionId,
  type WeeklyActionResultV2,
  type WeeklyCommandResult,
} from '../src/index.js';
import {
  doesSkillActionScopeApply,
  doesSkillEffectConditionApply,
  type WeeklySkillEffectContext,
} from '../src/skills/effects.js';
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
  tagIds: ['action_focus_route_running'],
  attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 26 }],
  bodyDelta: -8,
  gpaDelta: 0,
  proficiencyId: 'proficiency_route_drills',
} as const satisfies WeeklyActionDefinition;

const FORMULA_ROUTE_DRILLS = {
  ...ROUTE_DRILLS,
  attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 25 }],
  bodyDelta: -7,
} as const satisfies WeeklyActionDefinition;

const RECOVERY = {
  id: 'action_recovery',
  tagIds: ['action_focus_recovery'],
  attributeXp: [],
  bodyDelta: 32,
  gpaDelta: 0,
  proficiencyId: null,
} as const satisfies WeeklyActionDefinition;

const ACTION_ROUTE_SCOPE = {
  type: 'action_ids',
  actionIds: ['action_route_drills'],
} as const;

const TAG_ROUTE_SCOPE = {
  type: 'action_tags',
  actionTagIds: ['action_focus_route_running'],
} as const;

const ALWAYS = { type: 'always' } as const;

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
  for (const nestedValue of Object.values(value)) {
    expectDeepFrozen(nestedValue);
  }
}

function skillDefinition(id: SkillId, effects: readonly SkillEffect[]): SkillMechanicsDefinition {
  return {
    id,
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
    effects,
  };
}

function careerWithSkills(
  definitions: readonly SkillMechanicsDefinition[],
  equippedSkillIds?: EquippedSkillIds,
  state: { readonly body?: number; readonly gpa?: number } = {},
): CareerRun {
  const base = migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.plan);
  let rng = base.rng;
  const acquisitions = definitions.map((definition, index) => {
    const rngDrawCountBefore = rng.drawCount;
    for (let draw = 0; draw < 3; draw += 1) {
      rng = nextUint32(rng).nextRng;
    }
    return {
      offerIndex: index,
      weekIndex: 1 + index * 4,
      offeredSkillIds: [
        definition.id,
        `${definition.id}_offer_a`,
        `${definition.id}_offer_b`,
      ] as const,
      selectedSkillId: definition.id,
      rngDrawCountBefore,
      rngDrawCountAfter: rng.drawCount,
    };
  });
  const defaultSlots = [
    definitions[0]?.id ?? null,
    definitions[1]?.id ?? null,
    definitions[2]?.id ?? null,
    definitions[3]?.id ?? null,
  ] as const satisfies EquippedSkillIds;
  const career: CareerRun = {
    ...base,
    weekIndex: Math.max(base.weekIndex, 1 + (definitions.length - 1) * 4),
    rng,
    phase: { type: 'PLAN_ACTIONS' },
    player: {
      ...base.player,
      state: {
        ...base.player.state,
        body: state.body ?? base.player.state.body,
        gpa: state.gpa ?? base.player.state.gpa,
      },
      skillState: {
        acquisitions,
        equippedSkillIds: equippedSkillIds ?? defaultSlots,
      },
    },
  };
  expect(validateCareerRun(career)).toEqual({ ok: true, issues: [] });
  return career;
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
  actionIds: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId],
): CareerRun {
  return commandCareer(commitWeeklyActionPlan(career, actionIds, WEEKLY_ACTION_IDS));
}

function resolve(
  career: CareerRun,
  definition: WeeklyActionDefinition,
  skillDefinitions: readonly SkillMechanicsDefinition[] = [],
): CareerRun {
  return commandCareer(
    resolveNextWeeklyAction(career, definition, DEVELOPMENT_CONFIG, skillDefinitions),
  );
}

function actionResults(career: CareerRun): readonly WeeklyActionResultV2[] {
  if (career.phase.type === 'PLAN_ACTIONS' || career.phase.type === 'SKILL_BREAKTHROUGH') {
    throw new Error('Expected a phase with weekly results.');
  }
  return career.phase.results;
}

function saturationDefinitions(direction: 'maximum' | 'minimum') {
  const multiplierPermille = direction === 'maximum' ? 1500 : 500;
  const bodyDelta = direction === 'maximum' ? 20 : -20;
  const gpaDeltaMilli = direction === 'maximum' ? 250 : -250;
  return ([0, 1, 2, 3] as const).map((index) => {
    const effects: SkillEffect[] = [];
    for (let repeat = 0; repeat < 3; repeat += 1) {
      effects.push({
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille,
      });
      effects.push({
        type: 'action_body_cost_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille,
      });
      effects.push({
        type: 'action_body_delta_flat',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        delta: bodyDelta,
      });
      effects.push({
        type: 'action_gpa_delta_milli',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        deltaMilli: gpaDeltaMilli,
      });
    }
    return skillDefinition(`skill_saturation_${direction}_${index}`, effects);
  });
}

describe('closed skill mechanics definitions', () => {
  it('strictly validates the closed definition, scope, condition, and effect unions', () => {
    const validScopes = [ACTION_ROUTE_SCOPE, TAG_ROUTE_SCOPE] as const;
    for (const scope of validScopes) {
      expect(isSkillActionScope(scope)).toBe(true);
    }
    const invalidScopes: unknown[] = [
      { type: 'action_ids', actionIds: [] },
      {
        type: 'action_ids',
        actionIds: ['action_route_drills', 'action_route_drills'],
      },
      {
        type: 'action_ids',
        actionIds: ['action_route_drills'],
        actionTagIds: ['action_focus_route_running'],
      },
      { type: 'action_tags', actionTagIds: ['action_route_drills'] },
      { type: 'action_tags', actionTagIds: ['action_focus_route_running'], extra: true },
      { type: 'all_actions' },
    ];
    for (const scope of invalidScopes) {
      expect(isSkillActionScope(scope)).toBe(false);
    }

    const validConditions: readonly SkillEffectCondition[] = [
      ALWAYS,
      { type: 'body_at_least', body: 0 },
      { type: 'body_at_most', body: 100 },
      { type: 'action_occurrence_at_least', minimumCount: 2 },
      { type: 'action_occurrence_at_least', minimumCount: 3 },
      { type: 'plan_distinct_action_count_at_least', minimumCount: 2 },
      { type: 'plan_distinct_action_count_at_least', minimumCount: 3 },
      { type: 'previous_action_id', actionId: 'action_recovery' },
    ];
    for (const condition of validConditions) {
      expect(isSkillEffectCondition(condition)).toBe(true);
    }
    const invalidConditions: unknown[] = [
      { type: 'always', extra: true },
      { type: 'body_at_least', body: -1 },
      { type: 'body_at_most', body: 101 },
      { type: 'body_at_most', body: 50.5 },
      { type: 'action_occurrence_at_least', minimumCount: 1 },
      { type: 'action_occurrence_at_least', minimumCount: 4 },
      { type: 'plan_distinct_action_count_at_least', minimumCount: 1 },
      { type: 'previous_action_id', actionId: 'action_unknown' },
      { type: 'unknown' },
    ];
    for (const condition of invalidConditions) {
      expect(isSkillEffectCondition(condition)).toBe(false);
    }

    const validEffects: readonly SkillEffect[] = [
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 1200,
      },
      {
        type: 'action_body_cost_multiplier',
        scope: TAG_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 800,
      },
      {
        type: 'action_body_delta_flat',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        delta: 2,
      },
      {
        type: 'action_gpa_delta_milli',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        deltaMilli: 100,
      },
      { type: 'passive_body_recovery_flat', delta: 2 },
      {
        type: 'game_hook',
        hookId: 'game_hook_contested_catch_success_bonus',
        valueMilli: 100,
      },
    ];
    for (const effect of validEffects) {
      expect(isSkillEffect(effect)).toBe(true);
    }
    const invalidEffects: unknown[] = [
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 1000,
      },
      {
        type: 'action_body_cost_multiplier',
        scope: TAG_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 499,
      },
      {
        type: 'action_body_delta_flat',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        delta: 0,
      },
      {
        type: 'action_gpa_delta_milli',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        deltaMilli: 0,
      },
      { type: 'passive_body_recovery_flat', delta: 0 },
      {
        type: 'passive_body_recovery_flat',
        delta: 2,
        condition: ALWAYS,
      },
      {
        type: 'game_hook',
        hookId: 'game_hook_unknown',
        valueMilli: 100,
      },
      {
        type: 'game_hook',
        hookId: 'game_hook_fumble_risk_multiplier',
        valueMilli: 1000,
      },
      { type: 'flat_rating_bonus', delta: 1 },
    ];
    for (const effect of invalidEffects) {
      expect(isSkillEffect(effect)).toBe(false);
    }

    const valid = skillDefinition('skill_definition_valid', validEffects);
    expect(isSkillMechanicsDefinition(valid)).toBe(true);
    expect(isSkillMechanicsDefinitionCatalog([valid])).toBe(true);
    const invalidDefinitions: unknown[] = [
      { ...valid, extra: true },
      { ...valid, id: 'ability_definition_valid' },
      { ...valid, gradeId: 'skill_grade_legendary' },
      { ...valid, familyId: 'skill_family_unknown' },
      { ...valid, baseOfferWeight: 0 },
      { ...valid, behaviorWeightRules: [{ affinityTagId: 'unknown', weightBonus: 1 }] },
      {
        ...valid,
        behaviorWeightRules: [
          { affinityTagId: 'behavior_repeat_action', weightBonus: 1 },
          { affinityTagId: 'behavior_repeat_action', weightBonus: 2 },
        ],
      },
      { ...valid, effects: [] },
      { ...valid, effects: Array.from({ length: 13 }, () => validEffects[0]) },
      {
        ...valid,
        eligibility: {
          ...valid.eligibility,
          requiredPlayerTagIds: ['tag_shared'],
          excludedPlayerTagIds: ['tag_shared'],
        },
      },
      {
        ...valid,
        eligibility: { ...valid.eligibility, extra: true },
      },
    ];
    for (const definition of invalidDefinitions) {
      expect(isSkillMechanicsDefinition(definition)).toBe(false);
    }
    expect(isSkillMechanicsDefinitionCatalog([valid, valid])).toBe(false);
    expect(isSkillMechanicsDefinitionCatalog([valid, invalidDefinitions[0]])).toBe(false);
  });

  it('enforces every future game-hook value boundary, including the non-neutral fumble rule', () => {
    const validCases = [
      ['game_hook_coverage_clue_bonus', 1000],
      ['game_hook_contested_catch_success_bonus', 1],
      ['game_hook_contested_catch_success_bonus', 500],
      ['game_hook_tipped_turnover_risk_bonus', 1],
      ['game_hook_tipped_turnover_risk_bonus', 500],
      ['game_hook_yac_yardage_multiplier', 1001],
      ['game_hook_yac_yardage_multiplier', 1500],
      ['game_hook_fumble_risk_multiplier', 500],
      ['game_hook_fumble_risk_multiplier', 999],
      ['game_hook_fumble_risk_multiplier', 1001],
      ['game_hook_fumble_risk_multiplier', 1500],
    ] as const;
    for (const [hookId, valueMilli] of validCases) {
      expect(isSkillEffect({ type: 'game_hook', hookId, valueMilli })).toBe(true);
    }

    const invalidCases = [
      ['game_hook_coverage_clue_bonus', 999],
      ['game_hook_coverage_clue_bonus', 1001],
      ['game_hook_contested_catch_success_bonus', 0],
      ['game_hook_contested_catch_success_bonus', 501],
      ['game_hook_tipped_turnover_risk_bonus', 0],
      ['game_hook_tipped_turnover_risk_bonus', 501],
      ['game_hook_yac_yardage_multiplier', 1000],
      ['game_hook_yac_yardage_multiplier', 1501],
      ['game_hook_fumble_risk_multiplier', 499],
      ['game_hook_fumble_risk_multiplier', 1000],
      ['game_hook_fumble_risk_multiplier', 1501],
    ] as const;
    for (const [hookId, valueMilli] of invalidCases) {
      expect(isSkillEffect({ type: 'game_hook', hookId, valueMilli })).toBe(false);
    }
  });
});

describe('skill scopes and conditions', () => {
  it('matches mutually exclusive action-ID and action-tag scopes', () => {
    expect(doesSkillActionScopeApply(ACTION_ROUTE_SCOPE, ROUTE_DRILLS)).toBe(true);
    expect(doesSkillActionScopeApply(ACTION_ROUTE_SCOPE, RECOVERY)).toBe(false);
    expect(doesSkillActionScopeApply(TAG_ROUTE_SCOPE, ROUTE_DRILLS)).toBe(true);
    expect(doesSkillActionScopeApply(TAG_ROUTE_SCOPE, RECOVERY)).toBe(false);
  });

  it('evaluates every condition at its boundary and uses only the resolved repeat prefix', () => {
    const baseContext = {
      body: 70,
      actionId: 'action_route_drills',
      actionIndex: 2,
      planActionIds: ['action_route_drills', 'action_recovery', 'action_route_drills'],
      previousActionId: 'action_recovery',
    } as const satisfies WeeklySkillEffectContext;

    expect(doesSkillEffectConditionApply(ALWAYS, baseContext)).toBe(true);
    expect(doesSkillEffectConditionApply({ type: 'body_at_least', body: 70 }, baseContext)).toBe(
      true,
    );
    expect(doesSkillEffectConditionApply({ type: 'body_at_least', body: 71 }, baseContext)).toBe(
      false,
    );
    expect(doesSkillEffectConditionApply({ type: 'body_at_most', body: 70 }, baseContext)).toBe(
      true,
    );
    expect(doesSkillEffectConditionApply({ type: 'body_at_most', body: 69 }, baseContext)).toBe(
      false,
    );
    expect(
      doesSkillEffectConditionApply(
        { type: 'action_occurrence_at_least', minimumCount: 2 },
        { ...baseContext, actionIndex: 0 },
      ),
    ).toBe(false);
    expect(
      doesSkillEffectConditionApply(
        { type: 'action_occurrence_at_least', minimumCount: 2 },
        baseContext,
      ),
    ).toBe(true);
    expect(
      doesSkillEffectConditionApply(
        { type: 'action_occurrence_at_least', minimumCount: 3 },
        baseContext,
      ),
    ).toBe(false);
    expect(
      doesSkillEffectConditionApply(
        { type: 'plan_distinct_action_count_at_least', minimumCount: 2 },
        baseContext,
      ),
    ).toBe(true);
    expect(
      doesSkillEffectConditionApply(
        { type: 'plan_distinct_action_count_at_least', minimumCount: 3 },
        baseContext,
      ),
    ).toBe(false);
    expect(
      doesSkillEffectConditionApply(
        { type: 'previous_action_id', actionId: 'action_recovery' },
        baseContext,
      ),
    ).toBe(true);
    expect(
      doesSkillEffectConditionApply(
        { type: 'previous_action_id', actionId: 'action_recovery' },
        { ...baseContext, previousActionId: null },
      ),
    ).toBe(false);
  });

  it('applies repeat and previous-action effects only on the final route in [route, recovery, route]', () => {
    const definition = skillDefinition('skill_repeat_prefix', [
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: { type: 'action_occurrence_at_least', minimumCount: 2 },
        multiplierPermille: 1200,
      },
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: { type: 'previous_action_id', actionId: 'action_recovery' },
        multiplierPermille: 1200,
      },
    ]);
    let career = commit(careerWithSkills([definition]), [
      'action_route_drills',
      'action_recovery',
      'action_route_drills',
    ]);
    career = resolve(career, ROUTE_DRILLS, [definition]);
    career = resolve(career, RECOVERY, [definition]);
    career = resolve(career, ROUTE_DRILLS, [definition]);

    const results = actionResults(career);
    expect(results[0]?.skillEffectAggregates).toEqual(NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES);
    expect(results[0]?.appliedSkillEffects).toEqual([]);
    expect(results[1]?.skillEffectAggregates).toEqual(NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES);
    expect(results[1]?.appliedSkillEffects).toEqual([]);
    expect(results[2]?.skillEffectAggregates.xpMultiplierPermille).toBe(1400);
    expect(results[2]?.appliedSkillEffects).toEqual([
      {
        type: 'action_xp_multiplier',
        skillId: definition.id,
        slotIndex: 0,
        effectIndex: 0,
        multiplierPermille: 1200,
      },
      {
        type: 'action_xp_multiplier',
        skillId: definition.id,
        slotIndex: 0,
        effectIndex: 1,
        multiplierPermille: 1200,
      },
    ]);
    expect(results[2]?.attributeXp[0]?.awardedXp).toBe(32);
  });
});

describe('weekly skill aggregation and formulas', () => {
  it('stacks additively around 1000, rounds once, and traces slot/effect order instead of catalog order', () => {
    const first = skillDefinition('skill_formula_first', [
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 1250,
      },
      {
        type: 'action_body_cost_multiplier',
        scope: TAG_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 750,
      },
      {
        type: 'action_body_delta_flat',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        delta: 2,
      },
      {
        type: 'action_gpa_delta_milli',
        scope: TAG_ROUTE_SCOPE,
        condition: ALWAYS,
        deltaMilli: 100,
      },
    ]);
    const second = skillDefinition('skill_formula_second', [
      {
        type: 'action_xp_multiplier',
        scope: TAG_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 1250,
      },
      {
        type: 'action_body_cost_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 750,
      },
      {
        type: 'action_body_delta_flat',
        scope: TAG_ROUTE_SCOPE,
        condition: ALWAYS,
        delta: -1,
      },
      {
        type: 'action_gpa_delta_milli',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        deltaMilli: 50,
      },
    ]);
    const definitions = [second, first] as const;
    const career = commit(careerWithSkills([first, second]), [
      'action_route_drills',
      'action_route_drills',
      'action_route_drills',
    ]);
    const resolved = resolve(career, FORMULA_ROUTE_DRILLS, definitions);
    const result = actionResults(resolved)[0];

    expect(result?.skillEffectAggregates).toEqual({
      xpMultiplierPermille: 1500,
      bodyCostMultiplierPermille: 500,
      bodyDeltaFlat: 1,
      gpaDeltaMilli: 150,
    });
    expect(result).toEqual(
      expect.objectContaining({
        bodyBefore: 50,
        baseBodyDelta: -7,
        requestedBodyDelta: -3,
        actualBodyDelta: -3,
        bodyAfter: 47,
        gpaBefore: 3,
        baseGpaDelta: 0,
        requestedGpaDelta: 0.15,
        actualGpaDelta: 0.15,
        gpaAfter: 3.15,
      }),
    );
    expect(result?.attributeXp[0]?.awardedXp).toBe(30);
    expect(
      result?.appliedSkillEffects.map(({ skillId, slotIndex, effectIndex }) => ({
        skillId,
        slotIndex,
        effectIndex,
      })),
    ).toEqual([
      { skillId: first.id, slotIndex: 0, effectIndex: 0 },
      { skillId: first.id, slotIndex: 0, effectIndex: 1 },
      { skillId: first.id, slotIndex: 0, effectIndex: 2 },
      { skillId: first.id, slotIndex: 0, effectIndex: 3 },
      { skillId: second.id, slotIndex: 1, effectIndex: 0 },
      { skillId: second.id, slotIndex: 1, effectIndex: 1 },
      { skillId: second.id, slotIndex: 1, effectIndex: 2 },
      { skillId: second.id, slotIndex: 1, effectIndex: 3 },
    ]);
    expect(validateCareerRun(resolved)).toEqual({ ok: true, issues: [] });
    expectDeepFrozen(resolved);
  });

  it.each([
    {
      direction: 'maximum' as const,
      expectedAggregates: {
        xpMultiplierPermille: SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS.max,
        bodyCostMultiplierPermille: SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS.max,
        bodyDeltaFlat: SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS.max,
        gpaDeltaMilli: SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS.max,
      },
      expectedAwardedXp: 40,
      expectedRequestedBodyDelta: 26,
      expectedGpaAfter: 3.5,
    },
    {
      direction: 'minimum' as const,
      expectedAggregates: {
        xpMultiplierPermille: SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS.min,
        bodyCostMultiplierPermille: SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS.min,
        bodyDeltaFlat: SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS.min,
        gpaDeltaMilli: SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS.min,
      },
      expectedAwardedXp: 5,
      expectedRequestedBodyDelta: -42,
      expectedGpaAfter: 2.5,
    },
  ])(
    'saturates all four aggregate dimensions at the $direction bounds',
    ({
      direction,
      expectedAggregates,
      expectedAwardedXp,
      expectedRequestedBodyDelta,
      expectedGpaAfter,
    }) => {
      const definitions = saturationDefinitions(direction);
      const career = commit(careerWithSkills(definitions), [
        'action_route_drills',
        'action_route_drills',
        'action_route_drills',
      ]);
      const result = actionResults(
        resolve(career, FORMULA_ROUTE_DRILLS, [...definitions].reverse()),
      )[0];

      expect(result?.skillEffectAggregates).toEqual(expectedAggregates);
      expect(result?.attributeXp[0]?.awardedXp).toBe(expectedAwardedXp);
      expect(result?.requestedBodyDelta).toBe(expectedRequestedBodyDelta);
      expect(result?.gpaAfter).toBe(expectedGpaAfter);
      expect(result?.appliedSkillEffects).toHaveLength(48);
      expect(result?.appliedSkillEffects[0]).toEqual(
        expect.objectContaining({ slotIndex: 0, effectIndex: 0 }),
      );
      expect(result?.appliedSkillEffects[47]).toEqual(
        expect.objectContaining({ slotIndex: 3, effectIndex: 11 }),
      );
    },
  );

  it('applies and saturates passive recovery with bounded requested/actual evidence', () => {
    const positive = ([0, 1, 2, 3] as const).map((index) =>
      skillDefinition(`skill_passive_positive_${index}`, [
        { type: 'passive_body_recovery_flat', delta: 20 },
      ]),
    );
    const positiveCareer = careerWithSkills(positive);
    const capped = derivePassiveBodyRecovery(
      90,
      DEVELOPMENT_CONFIG.passiveBodyRecovery,
      positiveCareer.player.skillState,
      [...positive].reverse(),
      positiveCareer.weekIndex,
    );
    expect(capped).toEqual({
      ok: true,
      evidence: {
        weekIndex: positiveCareer.weekIndex,
        bodyBefore: 90,
        baseBodyDelta: 10,
        requestedBodyDelta: 50,
        actualBodyDelta: 10,
        bodyAfter: 100,
        appliedSkillEffects: positive.map((definition, slotIndex) => ({
          type: 'passive_body_recovery_flat',
          skillId: definition.id,
          slotIndex,
          effectIndex: 0,
          delta: 20,
        })),
      },
    });
    expectDeepFrozen(capped);

    let weekEnd = commit(positiveCareer, [
      'action_route_drills',
      'action_route_drills',
      'action_route_drills',
    ]);
    weekEnd = resolve(weekEnd, ROUTE_DRILLS, positive);
    weekEnd = resolve(weekEnd, ROUTE_DRILLS, positive);
    weekEnd = resolve(weekEnd, ROUTE_DRILLS, positive);
    const rngBefore = weekEnd.rng;
    const advanced = commandCareer(
      advanceDevelopmentWeek(weekEnd, DEVELOPMENT_CONFIG, positive, [ROUTE_DRILLS]),
    );
    expect(weekEnd.player.state.body).toBe(26);
    expect(advanced.player.state.body).toBe(76);
    expect(advanced.rng).toEqual(rngBefore);
    expect(advanced.lastPassiveBodyRecovery).toEqual({
      weekIndex: positiveCareer.weekIndex,
      bodyBefore: 26,
      baseBodyDelta: 10,
      requestedBodyDelta: 50,
      actualBodyDelta: 50,
      bodyAfter: 76,
      appliedSkillEffects: positive.map((definition, slotIndex) => ({
        type: 'passive_body_recovery_flat',
        skillId: definition.id,
        slotIndex,
        effectIndex: 0,
        delta: 20,
      })),
    });
    expect(validateCareerRunV2(advanced)).toEqual({ ok: true, issues: [] });
    const roundTrip = parseCareerRunV2(JSON.stringify(advanced));
    expect(roundTrip).toEqual({ ok: true, career: advanced });
    expectDeepFrozen(roundTrip);

    const negative = ([0, 1, 2, 3] as const).map((index) =>
      skillDefinition(`skill_passive_negative_${index}`, [
        { type: 'passive_body_recovery_flat', delta: -20 },
      ]),
    );
    const negativeCareer = careerWithSkills(negative);
    expect(
      derivePassiveBodyRecovery(
        50,
        DEVELOPMENT_CONFIG.passiveBodyRecovery,
        negativeCareer.player.skillState,
        negative,
        negativeCareer.weekIndex,
      ),
    ).toEqual(
      expect.objectContaining({
        ok: true,
        evidence: expect.objectContaining({
          requestedBodyDelta: 0,
          actualBodyDelta: 0,
          bodyAfter: 50,
        }),
      }),
    );
    expect(
      derivePassiveBodyRecovery(
        -1,
        10,
        negativeCareer.player.skillState,
        negative,
        negativeCareer.weekIndex,
      ),
    ).toEqual({ ok: false, reason: 'skill_registry.invalid_context' });
    expect(
      derivePassiveBodyRecovery(
        50,
        101,
        negativeCareer.player.skillState,
        negative,
        negativeCareer.weekIndex,
      ),
    ).toEqual({ ok: false, reason: 'skill_registry.invalid_context' });
  });

  it('validates persisted passive evidence independently of the current loadout and rejects tampering', () => {
    const definitions = ([0, 1, 2, 3] as const).map((index) =>
      skillDefinition(`skill_passive_history_${index}`, [
        { type: 'passive_body_recovery_flat', delta: 2 + index },
      ]),
    );
    let weekEnd = commit(careerWithSkills(definitions), [
      'action_route_drills',
      'action_route_drills',
      'action_route_drills',
    ]);
    for (let index = 0; index < 3; index += 1) {
      weekEnd = resolve(weekEnd, ROUTE_DRILLS, definitions);
    }
    const advanced = commandCareer(
      advanceDevelopmentWeek(weekEnd, DEVELOPMENT_CONFIG, definitions, [ROUTE_DRILLS]),
    );
    expect(advanced.lastPassiveBodyRecovery).not.toBeNull();

    const changedLoadout = jsonClone(advanced);
    changedLoadout.player.skillState.equippedSkillIds = [null, null, null, null];
    expect(validateCareerRunV2(changedLoadout)).toEqual({ ok: true, issues: [] });

    const tamperCases = [
      {
        name: 'week does not immediately precede the current week',
        expectedPath: 'career.lastPassiveBodyRecovery.weekIndex',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          evidence.weekIndex += 1;
        },
      },
      {
        name: 'requested delta does not match the trace aggregate',
        expectedPath: 'career.lastPassiveBodyRecovery.requestedBodyDelta',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          evidence.requestedBodyDelta += 1;
        },
      },
      {
        name: 'actual delta does not match the bounded result',
        expectedPath: 'career.lastPassiveBodyRecovery.actualBodyDelta',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          evidence.actualBodyDelta -= 1;
        },
      },
      {
        name: 'traces are reordered',
        expectedPath: 'career.lastPassiveBodyRecovery.appliedSkillEffects.1',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          evidence.appliedSkillEffects.reverse();
        },
      },
      {
        name: 'one historical skill is attributed to two different slots',
        expectedPath: 'career.lastPassiveBodyRecovery.appliedSkillEffects.1.skillId',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          const first = evidence.appliedSkillEffects[0];
          const second = evidence.appliedSkillEffects[1];
          if (first === undefined || second === undefined) {
            throw new Error('Expected two passive traces.');
          }
          second.skillId = first.skillId;
        },
      },
      {
        name: 'one historical slot is attributed to two different skills',
        expectedPath: 'career.lastPassiveBodyRecovery.appliedSkillEffects.1.skillId',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          const first = evidence.appliedSkillEffects[0];
          const second = evidence.appliedSkillEffects[1];
          if (first === undefined || second === undefined) {
            throw new Error('Expected two passive traces.');
          }
          second.slotIndex = first.slotIndex;
          second.effectIndex = first.effectIndex + 1;
        },
      },
      {
        name: 'trace type is outside the closed union',
        expectedPath: 'career.lastPassiveBodyRecovery.appliedSkillEffects.0.type',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          const trace = evidence.appliedSkillEffects[0] as unknown as Record<string, unknown>;
          trace['type'] = 'unknown_effect';
        },
      },
      {
        name: 'trace contains an unknown field',
        expectedPath: 'career.lastPassiveBodyRecovery.appliedSkillEffects.0.extra',
        mutate: (evidence: NonNullable<DeepMutable<CareerRun['lastPassiveBodyRecovery']>>) => {
          const trace = evidence.appliedSkillEffects[0] as unknown as Record<string, unknown>;
          trace['extra'] = true;
        },
      },
    ] as const;

    for (const { name, expectedPath, mutate } of tamperCases) {
      const tampered = jsonClone(advanced);
      const evidence = tampered.lastPassiveBodyRecovery;
      if (evidence === null) {
        throw new Error('Expected passive recovery evidence.');
      }
      mutate(evidence);
      const validation = validateCareerRunV2(tampered);
      expect(validation.ok, name).toBe(false);
      if (!validation.ok) {
        expect(
          validation.issues.map(({ path }) => path),
          name,
        ).toContain(expectedPath);
      }
      expect(parseCareerRunV2(tampered).ok, name).toBe(false);
    }
  });
});

describe('future game hooks and registry failures', () => {
  it('collects hooks in equipped-slot then effect order, independent of catalog order', () => {
    const laterSlot = skillDefinition('skill_hook_later_slot', [
      {
        type: 'game_hook',
        hookId: 'game_hook_coverage_clue_bonus',
        valueMilli: 1000,
      },
      {
        type: 'game_hook',
        hookId: 'game_hook_yac_yardage_multiplier',
        valueMilli: 1200,
      },
    ]);
    const firstSlot = skillDefinition('skill_hook_first_slot', [
      { type: 'passive_body_recovery_flat', delta: 1 },
      {
        type: 'game_hook',
        hookId: 'game_hook_contested_catch_success_bonus',
        valueMilli: 100,
      },
    ]);
    const career = careerWithSkills(
      [laterSlot, firstSlot],
      [firstSlot.id, null, laterSlot.id, null],
    );
    const result = collectEquippedGameHooks(career.player.skillState, [laterSlot, firstSlot]);

    expect(result).toEqual({
      ok: true,
      hooks: [
        {
          skillId: firstSlot.id,
          slotIndex: 0,
          effectIndex: 1,
          hookId: 'game_hook_contested_catch_success_bonus',
          valueMilli: 100,
        },
        {
          skillId: laterSlot.id,
          slotIndex: 2,
          effectIndex: 0,
          hookId: 'game_hook_coverage_clue_bonus',
          valueMilli: 1000,
        },
        {
          skillId: laterSlot.id,
          slotIndex: 2,
          effectIndex: 1,
          hookId: 'game_hook_yac_yardage_multiplier',
          valueMilli: 1200,
        },
      ],
    });
    expectDeepFrozen(result);
    expect(collectEquippedGameHooks(career.player.skillState, [laterSlot])).toEqual({
      ok: false,
      reason: 'skill_registry.missing_equipped_definition',
    });
    expect(collectEquippedGameHooks(career.player.skillState, [laterSlot, laterSlot])).toEqual({
      ok: false,
      reason: 'skill_registry.invalid_definitions',
    });
  });

  it('returns the original career without mutation or RNG consumption for missing/invalid registries', () => {
    const definition = skillDefinition('skill_registry_failure', [
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 1200,
      },
    ]);
    const committed = commit(careerWithSkills([definition]), [
      'action_route_drills',
      'action_route_drills',
      'action_route_drills',
    ]);
    const before = JSON.stringify(committed);
    const rngBefore = committed.rng;
    const missing = resolveNextWeeklyAction(committed, ROUTE_DRILLS, DEVELOPMENT_CONFIG, []);
    const invalid = resolveNextWeeklyAction(committed, ROUTE_DRILLS, DEVELOPMENT_CONFIG, [
      definition,
      definition,
    ]);

    expect(missing).toEqual({
      ok: false,
      career: committed,
      reason: 'weekly.missing_equipped_skill_definition',
    });
    expect(invalid).toEqual({
      ok: false,
      career: committed,
      reason: 'weekly.invalid_skill_definitions',
    });
    expect(missing.career).toBe(committed);
    expect(invalid.career).toBe(committed);
    expect(committed.rng).toEqual(rngBefore);
    expect(JSON.stringify(committed)).toBe(before);

    let weekEnd = committed;
    weekEnd = resolve(weekEnd, ROUTE_DRILLS, [definition]);
    weekEnd = resolve(weekEnd, ROUTE_DRILLS, [definition]);
    weekEnd = resolve(weekEnd, ROUTE_DRILLS, [definition]);
    const advanceBefore = JSON.stringify(weekEnd);
    const missingAdvance = advanceDevelopmentWeek(weekEnd, DEVELOPMENT_CONFIG, []);
    const invalidAdvance = advanceDevelopmentWeek(weekEnd, DEVELOPMENT_CONFIG, [
      definition,
      definition,
    ]);
    expect(missingAdvance).toEqual({
      ok: false,
      career: weekEnd,
      reason: 'weekly.missing_equipped_skill_definition',
    });
    expect(invalidAdvance).toEqual({
      ok: false,
      career: weekEnd,
      reason: 'weekly.invalid_skill_definitions',
    });
    expect(missingAdvance.career).toBe(weekEnd);
    expect(invalidAdvance.career).toBe(weekEnd);
    expect(JSON.stringify(weekEnd)).toBe(advanceBefore);
  });
});

describe('compatibility, immutability, and persisted evidence', () => {
  it('keeps an empty loadout mechanically identical to the M1 route result and consumes no RNG', () => {
    const plan = migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.plan);
    const committed = commit(plan, ['action_route_drills', 'action_recovery', 'action_study_hall']);
    const implicitEmpty = resolve(committed, ROUTE_DRILLS);
    const explicitEmpty = resolve(committed, ROUTE_DRILLS, []);
    expect(implicitEmpty).toEqual(explicitEmpty);
    expect(implicitEmpty.rng).toEqual(plan.rng);

    const result = actionResults(implicitEmpty)[0];
    expect(result).toEqual({
      actionId: 'action_route_drills',
      actionIndex: 0,
      weekIndex: 4,
      effectIds: ['effect_attribute_progress', 'effect_body_change', 'effect_proficiency_progress'],
      bodyBefore: 50,
      baseBodyDelta: -8,
      requestedBodyDelta: -8,
      actualBodyDelta: -8,
      bodyAfter: 42,
      bodyXpEfficiencyPermille: 800,
      gpaBefore: 3,
      baseGpaDelta: 0,
      requestedGpaDelta: 0,
      actualGpaDelta: 0,
      gpaAfter: 3,
      attributeXp: [
        {
          attributeId: 'attribute_wr_route_running',
          baseXp: 26,
          awardedXp: 20,
          appliedXp: 20,
          ratingBefore: 60,
          xpBefore: 0,
          ratingAfter: 60,
          xpAfter: 20,
        },
      ],
      proficiency: {
        proficiencyId: 'proficiency_route_drills',
        usesBefore: 0,
        usesAfter: 1,
        levelBefore: 0,
        levelAfter: 0,
        xpMultiplierPermille: 1000,
      },
      skillEffectAggregates: NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES,
      appliedSkillEffects: [],
    });
    expectDeepFrozen(implicitEmpty);
  });

  it('does not mutate caller definitions and deeply freezes successful trace output', () => {
    const definition = skillDefinition('skill_immutable_output', [
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 1200,
      },
    ]);
    const callerDefinitions = jsonClone([definition]);
    const definitionsBefore = JSON.stringify(callerDefinitions);
    const committed = commit(careerWithSkills([definition]), [
      'action_route_drills',
      'action_route_drills',
      'action_route_drills',
    ]);
    const resolved = resolve(committed, ROUTE_DRILLS, callerDefinitions);

    expect(JSON.stringify(callerDefinitions)).toBe(definitionsBefore);
    expect(Object.isFrozen(callerDefinitions)).toBe(false);
    expectDeepFrozen(resolved);
    const result = actionResults(resolved)[0];
    expect(Object.isFrozen(result?.skillEffectAggregates)).toBe(true);
    expect(Object.isFrozen(result?.appliedSkillEffects)).toBe(true);
    expect(Object.isFrozen(result?.appliedSkillEffects[0])).toBe(true);
  });

  it('rejects tampered v2 aggregates, traces, formula evidence, ordering, and unknown fields', () => {
    const first = skillDefinition('skill_trace_first', [
      {
        type: 'action_xp_multiplier',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        multiplierPermille: 1200,
      },
      {
        type: 'action_body_delta_flat',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        delta: 2,
      },
    ]);
    const second = skillDefinition('skill_trace_second', [
      {
        type: 'action_gpa_delta_milli',
        scope: ACTION_ROUTE_SCOPE,
        condition: ALWAYS,
        deltaMilli: 100,
      },
    ]);
    const valid = resolve(
      commit(careerWithSkills([first, second]), [
        'action_route_drills',
        'action_route_drills',
        'action_route_drills',
      ]),
      ROUTE_DRILLS,
      [second, first],
    );
    expect(validateCareerRunV2(valid)).toEqual({ ok: true, issues: [] });

    interface TamperCase {
      readonly name: string;
      readonly expectedPath: string;
      readonly mutate: (result: DeepMutable<WeeklyActionResultV2>) => void;
    }
    const cases: readonly TamperCase[] = [
      {
        name: 'aggregate does not match traces',
        expectedPath: 'career.phase.results.0.skillEffectAggregates.xpMultiplierPermille',
        mutate: (result) => {
          result.skillEffectAggregates.xpMultiplierPermille += 1;
        },
      },
      {
        name: 'traces are reordered',
        expectedPath: 'career.phase.results.0.appliedSkillEffects.1',
        mutate: (result) => {
          result.appliedSkillEffects.reverse();
        },
      },
      {
        name: 'trace points at a skill not equipped in its slot',
        expectedPath: 'career.phase.results.0.appliedSkillEffects.0.skillId',
        mutate: (result) => {
          const trace = result.appliedSkillEffects[0];
          if (trace !== undefined) {
            trace.skillId = 'skill_trace_unknown';
          }
        },
      },
      {
        name: 'effect index is out of bounds',
        expectedPath: 'career.phase.results.0.appliedSkillEffects.0.effectIndex',
        mutate: (result) => {
          const trace = result.appliedSkillEffects[0];
          if (trace !== undefined) {
            trace.effectIndex = -1;
          }
        },
      },
      {
        name: 'trace type is outside the closed union',
        expectedPath: 'career.phase.results.0.appliedSkillEffects.0.type',
        mutate: (result) => {
          const trace = result.appliedSkillEffects[0] as unknown as Record<string, unknown>;
          trace['type'] = 'unknown_effect';
        },
      },
      {
        name: 'trace contains an unknown field',
        expectedPath: 'career.phase.results.0.appliedSkillEffects.0.extra',
        mutate: (result) => {
          const trace = result.appliedSkillEffects[0] as unknown as Record<string, unknown>;
          trace['extra'] = true;
        },
      },
      {
        name: 'trace value becomes neutral',
        expectedPath: 'career.phase.results.0.appliedSkillEffects.0.multiplierPermille',
        mutate: (result) => {
          const trace = result.appliedSkillEffects[0] as unknown as Record<string, unknown>;
          trace['multiplierPermille'] = 1000;
        },
      },
      {
        name: 'requested Body delta no longer matches aggregates',
        expectedPath: 'career.phase.results.0.requestedBodyDelta',
        mutate: (result) => {
          result.requestedBodyDelta += 1;
        },
      },
      {
        name: 'requested GPA delta no longer matches aggregates',
        expectedPath: 'career.phase.results.0.requestedGpaDelta',
        mutate: (result) => {
          result.requestedGpaDelta += 0.001;
        },
      },
      {
        name: 'result contains an unknown field',
        expectedPath: 'career.phase.results.0.extra',
        mutate: (result) => {
          (result as unknown as Record<string, unknown>)['extra'] = true;
        },
      },
    ];

    for (const { name, expectedPath, mutate } of cases) {
      const tampered = jsonClone(valid);
      if (tampered.phase.type !== 'RESOLVE_ACTIONS') {
        throw new Error('Expected RESOLVE_ACTIONS.');
      }
      const result = tampered.phase.results[0];
      if (result === undefined) {
        throw new Error('Expected a persisted result.');
      }
      mutate(result);
      const validation = validateCareerRunV2(tampered);
      expect(validation.ok, name).toBe(false);
      if (!validation.ok) {
        expect(
          validation.issues.map(({ path }) => path),
          name,
        ).toContain(expectedPath);
      }
      expect(parseCareerRunV2(tampered).ok, name).toBe(false);
    }
  });

  it('keeps v1 results exact while migrating a non-grid GPA delta into neutral v2 evidence', () => {
    const legacy = jsonClone(CAREER_RUN_V1_PHASE_FIXTURES.resolve1);
    if (legacy.phase.type !== 'RESOLVE_ACTIONS') {
      throw new Error('Expected legacy RESOLVE_ACTIONS.');
    }
    const legacyResult = legacy.phase.results[0];
    if (legacyResult === undefined) {
      throw new Error('Expected a legacy result.');
    }
    legacyResult.effectIds = ['effect_body_change', 'effect_gpa_change'];
    legacyResult.gpaBefore = 3.137;
    legacyResult.requestedGpaDelta = 0.123;
    legacyResult.actualGpaDelta = 0.12;
    legacyResult.gpaAfter = 3.26;
    legacy.player.state.gpa = 3.26;
    expect(validateCareerRunV1(legacy)).toEqual({ ok: true, issues: [] });

    const before = JSON.stringify(legacy);
    const migrated = migrateCareerRunV1ToV2(legacy as unknown as CareerRunV1);
    expect(JSON.stringify(legacy)).toBe(before);
    expect(validateCareerRunV2(migrated)).toEqual({ ok: true, issues: [] });
    if (migrated.phase.type !== 'RESOLVE_ACTIONS') {
      throw new Error('Expected migrated RESOLVE_ACTIONS.');
    }
    const migratedResult = migrated.phase.results[0];
    expect(migratedResult).toEqual({
      ...legacyResult,
      baseBodyDelta: legacyResult.requestedBodyDelta,
      baseGpaDelta: 0.123,
      skillEffectAggregates: NEUTRAL_WEEKLY_SKILL_EFFECT_AGGREGATES,
      appliedSkillEffects: [],
    });
    expectDeepFrozen(migrated);

    const v1WithTrace = jsonClone(legacy);
    if (v1WithTrace.phase.type !== 'RESOLVE_ACTIONS') {
      throw new Error('Expected legacy RESOLVE_ACTIONS.');
    }
    (v1WithTrace.phase.results[0] as unknown as Record<string, unknown>)['baseGpaDelta'] = 0.123;
    expect(validateCareerRunV1(v1WithTrace)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          {
            code: 'invariant.unknown_field',
            path: 'career.phase.results.0.baseGpaDelta',
          },
        ]),
      }),
    );
  });
});
