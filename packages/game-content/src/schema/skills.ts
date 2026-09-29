import { z } from 'zod';

import { WR_ARCHETYPE_IDS, wrArchetypeIdSchema } from './creation.js';
import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import {
  WEEKLY_ACTION_IDS,
  WEEKLY_ACTION_TAG_IDS,
  weeklyActionIdSchema,
  weeklyActionTagIdSchema,
} from './weekly-actions.js';

export const SKILL_IDS = [
  'skill_route_notebook_c',
  'skill_first_step_lab_b',
  'skill_secure_hands_routine_b',
  'skill_full_route_circuit_a',
  'skill_recovery_window_c',
  'skill_late_set_engine_b',
  'skill_empty_tank_reps_a',
  'skill_compressed_recovery_s',
  'skill_one_more_rep_c',
  'skill_broad_horizon_b',
  'skill_edge_of_focus_a',
  'skill_reset_ritual_b',
  'skill_coverage_ledger_b',
  'skill_high_point_wager_a',
  'skill_open_field_dare_s',
  'skill_study_buffer_c',
  'skill_balanced_calendar_b',
  'skill_two_track_week_a',
  'skill_assignment_echo_c',
  'skill_clean_install_b',
  'skill_package_memory_b',
  'skill_quiet_checkin_c',
  'skill_trust_window_a',
  'skill_signal_reader_a',
  'skill_coaches_key_s',
  'skill_composure_anchor_b',
  'skill_campus_bridge_b',
  'skill_stem_library_c',
  'skill_catch_point_map_b',
  'skill_acceleration_ladder_b',
  'skill_technique_chain_a',
  'skill_sideline_compass_c',
  'skill_leverage_snapshot_c',
  'skill_late_hands_b',
  'skill_stem_pressure_b',
  'skill_red_zone_patience_a',
  'skill_scramble_compass_a',
  'skill_fourth_quarter_spark_s',
  'skill_training_buffer_b',
  'skill_next_snap_reset_a',
] as const;

export const SKILL_GRADE_IDS = [
  'skill_grade_c',
  'skill_grade_b',
  'skill_grade_a',
  'skill_grade_s',
] as const;

export const SKILL_FAMILY_IDS = [
  'skill_family_development',
  'skill_family_role_coach',
  'skill_family_game_day',
  'skill_family_body',
  'skill_family_mindset',
  'skill_family_life',
] as const;

export const SKILL_EFFECT_TYPES = [
  'action_xp_multiplier',
  'action_body_cost_multiplier',
  'action_body_delta_flat',
  'action_gpa_delta_milli',
  'action_preparation_delta_flat',
  'action_confidence_delta_flat',
  'action_practice_impact_flat',
  'passive_body_recovery_flat',
  'injury_risk_multiplier',
  'game_hook',
  'life_hook',
] as const;

export const SKILL_EFFECT_CONDITION_TYPES = [
  'always',
  'body_at_least',
  'body_at_most',
  'action_occurrence_at_least',
  'plan_distinct_action_count_at_least',
  'previous_action_id',
] as const;

export const SKILL_GAME_HOOK_IDS = [
  'game_hook_coverage_clue_bonus',
  'game_hook_contested_catch_success_bonus',
  'game_hook_tipped_turnover_risk_bonus',
  'game_hook_yac_yardage_multiplier',
  'game_hook_fumble_risk_multiplier',
  'game_hook_assignment_reliability_bonus',
  'game_hook_package_snap_bonus',
  'game_hook_pressure_composure_bonus',
] as const;

export const SKILL_LIFE_HOOK_IDS = [
  'life_hook_nil_reward_multiplier',
  'life_hook_event_option_access',
  'life_hook_relationship_gain_multiplier',
] as const;

export const SKILL_BEHAVIOR_TAG_IDS = [
  'behavior_repeat_action',
  'behavior_varied_actions',
  'behavior_study_then_training',
] as const;

export const SKILL_BREAKTHROUGH_SOURCE_IDS = [
  'breakthrough_source_development',
  'breakthrough_source_role_coach',
  'breakthrough_source_game_day',
  'breakthrough_source_mindset',
  'breakthrough_source_body',
  'breakthrough_source_life',
] as const;

export const SKILL_TRADEOFF_IDS = [
  'skill_first_step_lab_b',
  'skill_full_route_circuit_a',
  'skill_empty_tank_reps_a',
  'skill_compressed_recovery_s',
  'skill_broad_horizon_b',
  'skill_edge_of_focus_a',
  'skill_high_point_wager_a',
  'skill_open_field_dare_s',
  'skill_two_track_week_a',
  'skill_trust_window_a',
  'skill_coaches_key_s',
  'skill_acceleration_ladder_b',
  'skill_fourth_quarter_spark_s',
] as const;

export const SKILL_GRADE_BASE_OFFER_WEIGHTS = {
  skill_grade_a: 35,
  skill_grade_b: 70,
  skill_grade_c: 100,
  skill_grade_s: 10,
} as const;

export const SKILL_GRADE_NAME_KEYS = {
  skill_grade_a: 'skills.grade.a',
  skill_grade_b: 'skills.grade.b',
  skill_grade_c: 'skills.grade.c',
  skill_grade_s: 'skills.grade.s',
} as const;

export const SKILL_FAMILY_NAME_KEYS = {
  skill_family_body: 'skills.family.body',
  skill_family_development: 'skills.family.development',
  skill_family_role_coach: 'skills.family.roleCoach',
  skill_family_game_day: 'skills.family.gameDay',
  skill_family_life: 'skills.family.life',
  skill_family_mindset: 'skills.family.mindset',
} as const;

const EXPECTED_FAMILY_BY_SKILL_ID = {
  skill_balanced_calendar_b: 'skill_family_life',
  skill_broad_horizon_b: 'skill_family_mindset',
  skill_compressed_recovery_s: 'skill_family_body',
  skill_coverage_ledger_b: 'skill_family_game_day',
  skill_edge_of_focus_a: 'skill_family_mindset',
  skill_empty_tank_reps_a: 'skill_family_body',
  skill_first_step_lab_b: 'skill_family_development',
  skill_full_route_circuit_a: 'skill_family_development',
  skill_high_point_wager_a: 'skill_family_game_day',
  skill_late_set_engine_b: 'skill_family_body',
  skill_one_more_rep_c: 'skill_family_mindset',
  skill_open_field_dare_s: 'skill_family_game_day',
  skill_recovery_window_c: 'skill_family_body',
  skill_reset_ritual_b: 'skill_family_mindset',
  skill_route_notebook_c: 'skill_family_development',
  skill_secure_hands_routine_b: 'skill_family_development',
  skill_study_buffer_c: 'skill_family_life',
  skill_two_track_week_a: 'skill_family_life',
  skill_assignment_echo_c: 'skill_family_role_coach',
  skill_clean_install_b: 'skill_family_role_coach',
  skill_package_memory_b: 'skill_family_role_coach',
  skill_quiet_checkin_c: 'skill_family_role_coach',
  skill_trust_window_a: 'skill_family_role_coach',
  skill_signal_reader_a: 'skill_family_role_coach',
  skill_coaches_key_s: 'skill_family_role_coach',
  skill_composure_anchor_b: 'skill_family_mindset',
  skill_campus_bridge_b: 'skill_family_life',
  skill_stem_library_c: 'skill_family_development',
  skill_catch_point_map_b: 'skill_family_development',
  skill_acceleration_ladder_b: 'skill_family_development',
  skill_technique_chain_a: 'skill_family_development',
  skill_sideline_compass_c: 'skill_family_game_day',
  skill_leverage_snapshot_c: 'skill_family_game_day',
  skill_late_hands_b: 'skill_family_game_day',
  skill_stem_pressure_b: 'skill_family_game_day',
  skill_red_zone_patience_a: 'skill_family_game_day',
  skill_scramble_compass_a: 'skill_family_game_day',
  skill_fourth_quarter_spark_s: 'skill_family_game_day',
  skill_training_buffer_b: 'skill_family_body',
  skill_next_snap_reset_a: 'skill_family_mindset',
} as const satisfies Readonly<
  Record<(typeof SKILL_IDS)[number], (typeof SKILL_FAMILY_IDS)[number]>
>;

const EXPECTED_GRADE_BY_SKILL_ID = {
  skill_balanced_calendar_b: 'skill_grade_b',
  skill_broad_horizon_b: 'skill_grade_b',
  skill_compressed_recovery_s: 'skill_grade_s',
  skill_coverage_ledger_b: 'skill_grade_b',
  skill_edge_of_focus_a: 'skill_grade_a',
  skill_empty_tank_reps_a: 'skill_grade_a',
  skill_first_step_lab_b: 'skill_grade_b',
  skill_full_route_circuit_a: 'skill_grade_a',
  skill_high_point_wager_a: 'skill_grade_a',
  skill_late_set_engine_b: 'skill_grade_b',
  skill_one_more_rep_c: 'skill_grade_c',
  skill_open_field_dare_s: 'skill_grade_s',
  skill_recovery_window_c: 'skill_grade_c',
  skill_reset_ritual_b: 'skill_grade_b',
  skill_route_notebook_c: 'skill_grade_c',
  skill_secure_hands_routine_b: 'skill_grade_b',
  skill_study_buffer_c: 'skill_grade_c',
  skill_two_track_week_a: 'skill_grade_a',
  skill_assignment_echo_c: 'skill_grade_c',
  skill_clean_install_b: 'skill_grade_b',
  skill_package_memory_b: 'skill_grade_b',
  skill_quiet_checkin_c: 'skill_grade_c',
  skill_trust_window_a: 'skill_grade_a',
  skill_signal_reader_a: 'skill_grade_a',
  skill_coaches_key_s: 'skill_grade_s',
  skill_composure_anchor_b: 'skill_grade_b',
  skill_campus_bridge_b: 'skill_grade_b',
  skill_stem_library_c: 'skill_grade_c',
  skill_catch_point_map_b: 'skill_grade_b',
  skill_acceleration_ladder_b: 'skill_grade_b',
  skill_technique_chain_a: 'skill_grade_a',
  skill_sideline_compass_c: 'skill_grade_c',
  skill_leverage_snapshot_c: 'skill_grade_c',
  skill_late_hands_b: 'skill_grade_b',
  skill_stem_pressure_b: 'skill_grade_b',
  skill_red_zone_patience_a: 'skill_grade_a',
  skill_scramble_compass_a: 'skill_grade_a',
  skill_fourth_quarter_spark_s: 'skill_grade_s',
  skill_training_buffer_b: 'skill_grade_b',
  skill_next_snap_reset_a: 'skill_grade_a',
} as const satisfies Readonly<Record<(typeof SKILL_IDS)[number], (typeof SKILL_GRADE_IDS)[number]>>;

export const skillIdSchema = z.enum(SKILL_IDS);
export const skillGradeIdSchema = z.enum(SKILL_GRADE_IDS);
export const skillFamilyIdSchema = z.enum(SKILL_FAMILY_IDS);
export const skillEffectTypeSchema = z.enum(SKILL_EFFECT_TYPES);
export const skillEffectConditionTypeSchema = z.enum(SKILL_EFFECT_CONDITION_TYPES);
export const skillGameHookIdSchema = z.enum(SKILL_GAME_HOOK_IDS);
export const skillLifeHookIdSchema = z.enum(SKILL_LIFE_HOOK_IDS);
export const skillBehaviorTagIdSchema = z.enum(SKILL_BEHAVIOR_TAG_IDS);
export const skillBreakthroughSourceIdSchema = z.enum(SKILL_BREAKTHROUGH_SOURCE_IDS);
export const skillBehaviorAffinityTagIdSchema = z.union([
  weeklyActionTagIdSchema,
  skillBehaviorTagIdSchema,
  skillBreakthroughSourceIdSchema,
]);

const playerTagIdSchema = stableContentIdSchema.refine((id) => id.startsWith('tag_'), {
  message: 'Player tags must use the tag_ namespace.',
});

function canonicalIndex<TValue extends string>(values: readonly TValue[], value: TValue): number {
  return values.indexOf(value);
}

function validateUniqueCanonicalList<TValue extends string>(
  values: readonly TValue[],
  canonicalValues: readonly TValue[],
  context: z.RefinementCtx,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: 'custom', message: 'IDs must be unique.' });
    return;
  }
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      canonicalIndex(canonicalValues, previous) >= canonicalIndex(canonicalValues, current)
    ) {
      context.addIssue({ code: 'custom', message: 'IDs must use canonical contract order.' });
      return;
    }
  }
}

const actionIdListSchema = z
  .array(weeklyActionIdSchema)
  .min(1)
  .max(WEEKLY_ACTION_IDS.length)
  .superRefine((ids, context) => {
    validateUniqueCanonicalList(ids, WEEKLY_ACTION_IDS, context);
  });

const actionTagIdListSchema = z
  .array(weeklyActionTagIdSchema)
  .min(1)
  .max(WEEKLY_ACTION_TAG_IDS.length)
  .superRefine((ids, context) => {
    validateUniqueCanonicalList(ids, WEEKLY_ACTION_TAG_IDS, context);
  });

export const skillActionScopeSchema = z.discriminatedUnion('type', [
  z.object({ actionIds: actionIdListSchema, type: z.literal('action_ids') }).strict(),
  z.object({ actionTagIds: actionTagIdListSchema, type: z.literal('action_tags') }).strict(),
]);

export const skillEffectConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('always') }).strict(),
  z.object({ body: z.number().int().min(0).max(100), type: z.literal('body_at_least') }).strict(),
  z.object({ body: z.number().int().min(0).max(100), type: z.literal('body_at_most') }).strict(),
  z
    .object({
      minimumCount: z.number().int().min(2).max(3),
      type: z.literal('action_occurrence_at_least'),
    })
    .strict(),
  z
    .object({
      minimumCount: z.number().int().min(2).max(3),
      type: z.literal('plan_distinct_action_count_at_least'),
    })
    .strict(),
  z.object({ actionId: weeklyActionIdSchema, type: z.literal('previous_action_id') }).strict(),
]);

const scopedEffectFields = {
  condition: skillEffectConditionSchema,
  scope: skillActionScopeSchema,
};

export const skillEffectSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        ...scopedEffectFields,
        multiplierPermille: z
          .number()
          .int()
          .min(500)
          .max(1500)
          .refine((value) => value !== 1000),
        type: z.literal('action_xp_multiplier'),
      })
      .strict(),
    z
      .object({
        ...scopedEffectFields,
        multiplierPermille: z
          .number()
          .int()
          .min(500)
          .max(1500)
          .refine((value) => value !== 1000),
        type: z.literal('action_body_cost_multiplier'),
      })
      .strict(),
    z
      .object({
        ...scopedEffectFields,
        delta: z
          .number()
          .int()
          .min(-20)
          .max(20)
          .refine((value) => value !== 0),
        type: z.literal('action_body_delta_flat'),
      })
      .strict(),
    z
      .object({
        ...scopedEffectFields,
        deltaMilli: z
          .number()
          .int()
          .min(-250)
          .max(250)
          .refine((value) => value !== 0),
        type: z.literal('action_gpa_delta_milli'),
      })
      .strict(),
    z
      .object({
        ...scopedEffectFields,
        delta: z
          .number()
          .int()
          .min(-20)
          .max(20)
          .refine((value) => value !== 0),
        type: z.literal('action_preparation_delta_flat'),
      })
      .strict(),
    z
      .object({
        ...scopedEffectFields,
        delta: z
          .number()
          .int()
          .min(-20)
          .max(20)
          .refine((value) => value !== 0),
        type: z.literal('action_confidence_delta_flat'),
      })
      .strict(),
    z
      .object({
        ...scopedEffectFields,
        delta: z
          .number()
          .int()
          .min(-10)
          .max(10)
          .refine((value) => value !== 0),
        type: z.literal('action_practice_impact_flat'),
      })
      .strict(),
    z
      .object({
        delta: z
          .number()
          .int()
          .min(-20)
          .max(20)
          .refine((value) => value !== 0),
        type: z.literal('passive_body_recovery_flat'),
      })
      .strict(),
    z
      .object({
        multiplierPermille: z
          .number()
          .int()
          .min(500)
          .max(1500)
          .refine((value) => value !== 1000),
        type: z.literal('injury_risk_multiplier'),
      })
      .strict(),
    z
      .object({
        hookId: skillGameHookIdSchema,
        type: z.literal('game_hook'),
        valueMilli: z.number().int().min(1).max(1500),
      })
      .strict(),
    z
      .object({
        hookId: skillLifeHookIdSchema,
        type: z.literal('life_hook'),
        valueMilli: z.number().int().min(500).max(1500),
      })
      .strict(),
  ])
  .superRefine((effect, context) => {
    if (effect.type === 'life_hook') {
      const expected = {
        life_hook_event_option_access: { min: 1000, max: 1000 },
        life_hook_nil_reward_multiplier: { min: 500, max: 1500 },
        life_hook_relationship_gain_multiplier: { min: 1001, max: 1500 },
      } as const;
      const bounds = expected[effect.hookId];
      if (
        effect.valueMilli < bounds.min ||
        effect.valueMilli > bounds.max ||
        ((effect.hookId === 'life_hook_nil_reward_multiplier' ||
          effect.hookId === 'life_hook_relationship_gain_multiplier') &&
          effect.valueMilli === 1000)
      ) {
        context.addIssue({
          code: 'custom',
          message: `${effect.hookId} value is outside its supported contract.`,
          path: ['valueMilli'],
        });
      }
      return;
    }
    if (effect.type !== 'game_hook') {
      return;
    }
    const bounds = {
      game_hook_contested_catch_success_bonus: { min: 1, max: 500 },
      game_hook_coverage_clue_bonus: { min: 1000, max: 1000 },
      game_hook_fumble_risk_multiplier: { min: 500, max: 1500 },
      game_hook_assignment_reliability_bonus: { min: 1, max: 500 },
      game_hook_package_snap_bonus: { min: 1, max: 250 },
      game_hook_pressure_composure_bonus: { min: 1, max: 500 },
      game_hook_tipped_turnover_risk_bonus: { min: 1, max: 500 },
      game_hook_yac_yardage_multiplier: { min: 1001, max: 1500 },
    } as const;
    const expected = bounds[effect.hookId];
    if (
      effect.valueMilli < expected.min ||
      effect.valueMilli > expected.max ||
      (effect.hookId === 'game_hook_fumble_risk_multiplier' && effect.valueMilli === 1000)
    ) {
      context.addIssue({
        code: 'custom',
        message: `${effect.hookId} value is outside its supported contract.`,
        path: ['valueMilli'],
      });
    }
  });

export const skillEligibilitySchema = z
  .object({
    archetypeIds: z.array(wrArchetypeIdSchema).max(WR_ARCHETYPE_IDS.length),
    excludedPlayerTagIds: z.array(playerTagIdSchema).max(16),
    minWeekIndex: z.number().int().min(0).max(1_000_000),
    positionIds: z.array(z.literal('position_wr')).max(1),
    requiredPlayerTagIds: z.array(playerTagIdSchema).max(16),
  })
  .strict()
  .superRefine((eligibility, context) => {
    validateUniqueCanonicalList(eligibility.archetypeIds, WR_ARCHETYPE_IDS, context);
    for (const [field, values] of [
      ['requiredPlayerTagIds', eligibility.requiredPlayerTagIds],
      ['excludedPlayerTagIds', eligibility.excludedPlayerTagIds],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({ code: 'custom', message: 'Player tags must be unique.', path: [field] });
      }
    }
    const excluded = new Set(eligibility.excludedPlayerTagIds);
    if (eligibility.requiredPlayerTagIds.some((tagId) => excluded.has(tagId))) {
      context.addIssue({
        code: 'custom',
        message: 'Required and excluded player tags must be disjoint.',
      });
    }
  });

export const skillBehaviorWeightRuleSchema = z
  .object({
    affinityTagId: skillBehaviorAffinityTagIdSchema,
    weightBonus: z.number().int().min(1).max(1_000_000),
  })
  .strict();

const skillMechanicsFields = {
  baseOfferWeight: z.number().int().min(1).max(1_000_000),
  behaviorWeightRules: z.array(skillBehaviorWeightRuleSchema).min(1).max(8),
  effects: z.array(skillEffectSchema).min(1).max(12),
  eligibility: skillEligibilitySchema,
  familyId: skillFamilyIdSchema,
  gradeId: skillGradeIdSchema,
  id: skillIdSchema,
};

function refineSkillMechanics(
  definition: z.infer<z.ZodObject<typeof skillMechanicsFields>>,
  context: z.RefinementCtx,
): void {
  if (definition.baseOfferWeight !== SKILL_GRADE_BASE_OFFER_WEIGHTS[definition.gradeId]) {
    context.addIssue({
      code: 'custom',
      message: 'Base offer weight must match the card grade.',
      path: ['baseOfferWeight'],
    });
  }
  const affinityTagIds = definition.behaviorWeightRules.map(({ affinityTagId }) => affinityTagId);
  if (new Set(affinityTagIds).size !== affinityTagIds.length) {
    context.addIssue({
      code: 'custom',
      message: 'Behavior affinity tags must be unique within a card.',
      path: ['behaviorWeightRules'],
    });
  }
  if (
    !definition.effects.some(
      ({ type }) =>
        type !== 'game_hook' &&
        type !== 'life_hook' &&
        type !== 'passive_body_recovery_flat' &&
        type !== 'injury_risk_multiplier',
    )
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Every M2 card must have an immediately resolvable weekly action effect.',
      path: ['effects'],
    });
  }
}

export const skillMechanicsDefinitionSchema = z
  .object(skillMechanicsFields)
  .strict()
  .superRefine(refineSkillMechanics);

export function isMechanicallyInferredTradeoff(effects: readonly SkillEffect[]): boolean {
  let hasBenefit = false;
  let hasDrawback = false;
  for (const effect of effects) {
    switch (effect.type) {
      case 'action_xp_multiplier':
        hasBenefit ||= effect.multiplierPermille > 1000;
        hasDrawback ||= effect.multiplierPermille < 1000;
        break;
      case 'action_body_cost_multiplier':
        hasBenefit ||= effect.multiplierPermille < 1000;
        hasDrawback ||= effect.multiplierPermille > 1000;
        break;
      case 'action_body_delta_flat':
      case 'action_preparation_delta_flat':
      case 'action_confidence_delta_flat':
      case 'action_practice_impact_flat':
      case 'passive_body_recovery_flat':
        hasBenefit ||= effect.delta > 0;
        hasDrawback ||= effect.delta < 0;
        break;
      case 'action_gpa_delta_milli':
        hasBenefit ||= effect.deltaMilli > 0;
        hasDrawback ||= effect.deltaMilli < 0;
        break;
      case 'injury_risk_multiplier':
        hasBenefit ||= effect.multiplierPermille < 1000;
        hasDrawback ||= effect.multiplierPermille > 1000;
        break;
      case 'game_hook':
        if (effect.hookId === 'game_hook_fumble_risk_multiplier') {
          hasBenefit ||= effect.valueMilli < 1000;
          hasDrawback ||= effect.valueMilli > 1000;
        } else if (effect.hookId === 'game_hook_tipped_turnover_risk_bonus') {
          hasDrawback = true;
        } else {
          hasBenefit = true;
        }
        break;
      case 'life_hook':
        if (
          effect.hookId === 'life_hook_nil_reward_multiplier' ||
          effect.hookId === 'life_hook_relationship_gain_multiplier'
        ) {
          hasBenefit ||= effect.valueMilli > 1000;
          hasDrawback ||= effect.valueMilli < 1000;
        } else {
          hasBenefit = true;
        }
        break;
    }
  }
  return hasBenefit && hasDrawback;
}

export const skillDefinitionSchema = z
  .object({
    ...skillMechanicsFields,
    descriptionKey: messageKeyFormatSchema,
    familyNameKey: messageKeyFormatSchema,
    gradeNameKey: messageKeyFormatSchema,
    isTradeoff: z.boolean(),
    nameKey: messageKeyFormatSchema,
  })
  .strict()
  .superRefine((definition, context) => {
    refineSkillMechanics(definition, context);
    if (definition.familyId !== EXPECTED_FAMILY_BY_SKILL_ID[definition.id]) {
      context.addIssue({ code: 'custom', message: 'Skill family does not match its stable ID.' });
    }
    if (definition.gradeId !== EXPECTED_GRADE_BY_SKILL_ID[definition.id]) {
      context.addIssue({ code: 'custom', message: 'Skill grade does not match its stable ID.' });
    }
    if (definition.familyNameKey !== SKILL_FAMILY_NAME_KEYS[definition.familyId]) {
      context.addIssue({
        code: 'custom',
        message: 'Family localization key must match the skill family.',
        path: ['familyNameKey'],
      });
    }
    if (definition.gradeNameKey !== SKILL_GRADE_NAME_KEYS[definition.gradeId]) {
      context.addIssue({
        code: 'custom',
        message: 'Grade localization key must match the skill grade.',
        path: ['gradeNameKey'],
      });
    }
    if (definition.isTradeoff !== isMechanicallyInferredTradeoff(definition.effects)) {
      context.addIssue({
        code: 'custom',
        message: 'Tradeoff metadata must match mechanically inferred benefits and drawbacks.',
        path: ['isTradeoff'],
      });
    }
  });

export const skillContentSchema = z
  .array(skillDefinitionSchema)
  .length(SKILL_IDS.length)
  .superRefine((definitions, context) => {
    for (const [index, expectedId] of SKILL_IDS.entries()) {
      if (definitions[index]?.id !== expectedId) {
        context.addIssue({
          code: 'custom',
          message: `Skill index ${index} must contain ${expectedId}.`,
          path: [index, 'id'],
        });
      }
    }
    const tradeoffIds = definitions.filter(({ isTradeoff }) => isTradeoff).map(({ id }) => id);
    if (
      tradeoffIds.length !== SKILL_TRADEOFF_IDS.length ||
      tradeoffIds.some((id, index) => id !== SKILL_TRADEOFF_IDS[index])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Explicit tradeoff cards must match the M2 contract.',
      });
    }
    const expectedFamilyCounts = {
      skill_family_body: 5,
      skill_family_development: 8,
      skill_family_role_coach: 7,
      skill_family_game_day: 10,
      skill_family_life: 4,
      skill_family_mindset: 6,
    } as const;
    for (const familyId of SKILL_FAMILY_IDS) {
      const actualCount = definitions.filter(
        (definition) => definition.familyId === familyId,
      ).length;
      if (actualCount !== expectedFamilyCounts[familyId]) {
        context.addIssue({
          code: 'custom',
          message: `${familyId} must contain exactly ${expectedFamilyCounts[familyId]} cards.`,
        });
      }
    }
  });

type DeepReadonly<T> = T extends object ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> } : T;

export type SkillId = (typeof SKILL_IDS)[number];
export type SkillGradeId = (typeof SKILL_GRADE_IDS)[number];
export type SkillFamilyId = (typeof SKILL_FAMILY_IDS)[number];
export type SkillEffectType = (typeof SKILL_EFFECT_TYPES)[number];
export type SkillEffectConditionType = (typeof SKILL_EFFECT_CONDITION_TYPES)[number];
export type SkillGameHookId = (typeof SKILL_GAME_HOOK_IDS)[number];
export type SkillLifeHookId = (typeof SKILL_LIFE_HOOK_IDS)[number];
export type SkillBehaviorTagId = (typeof SKILL_BEHAVIOR_TAG_IDS)[number];
export type SkillBreakthroughSourceId = (typeof SKILL_BREAKTHROUGH_SOURCE_IDS)[number];
export type SkillBehaviorAffinityTagId = z.infer<typeof skillBehaviorAffinityTagIdSchema>;
export type SkillActionScope = DeepReadonly<z.infer<typeof skillActionScopeSchema>>;
export type SkillEffectCondition = DeepReadonly<z.infer<typeof skillEffectConditionSchema>>;
export type SkillEffect = DeepReadonly<z.infer<typeof skillEffectSchema>>;
export type SkillEligibility = DeepReadonly<z.infer<typeof skillEligibilitySchema>>;
export type SkillBehaviorWeightRule = DeepReadonly<z.infer<typeof skillBehaviorWeightRuleSchema>>;
export type SkillMechanicsDefinition = DeepReadonly<z.infer<typeof skillMechanicsDefinitionSchema>>;
export type SkillDefinition = DeepReadonly<z.infer<typeof skillDefinitionSchema>>;
export type SkillContent = DeepReadonly<z.infer<typeof skillContentSchema>>;
