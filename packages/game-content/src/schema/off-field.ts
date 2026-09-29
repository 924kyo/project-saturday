import { z } from 'zod';

import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { PROGRAM_STRENGTH_BAND_IDS } from './programs.js';
import { WEEKLY_ACTION_IDS, weeklyActionIdSchema } from './weekly-actions.js';

export const RELATIONSHIP_ACTOR_IDS = [
  'relationship_actor_position_coach',
  'relationship_actor_teammate_leader',
  'relationship_actor_direct_competitor',
] as const;
export const RELATIONSHIP_SOURCE_IDS = [
  'relationship_source_bootstrap',
  'relationship_source_weekly_action',
  'relationship_source_event',
  'relationship_source_game_performance',
  'relationship_source_depth_review',
  'relationship_source_nil_obligation',
  'relationship_source_offseason',
  'relationship_source_transfer_commitment',
] as const;
export const RELATIONSHIP_CONTEXT_TAG_IDS = [
  'tag_relationship_position_coach_high',
  'tag_relationship_position_coach_low',
  'tag_relationship_teammate_leader_high',
  'tag_relationship_teammate_leader_low',
  'tag_relationship_direct_competitor_high',
  'tag_relationship_direct_competitor_low',
] as const;
export const ACADEMIC_STATUS_IDS = [
  'academic_status_eligible',
  'academic_status_warning',
  'academic_status_ineligible',
] as const;
export const ACADEMIC_CHECKPOINT_IDS = [
  'academic_checkpoint_midterm',
  'academic_checkpoint_final',
] as const;
export const OFF_FIELD_BENEFIT_IDS = [
  'off_field_benefit_recovery_access',
  'off_field_benefit_training_access',
  'off_field_benefit_advisor_insight',
  'off_field_benefit_appearance_style',
  'off_field_benefit_offer_visibility',
] as const;
export const NIL_CATEGORY_IDS = [
  'nil_category_local_business',
  'nil_category_community',
  'nil_category_equipment',
  'nil_category_media',
  'nil_category_regional',
] as const;
export const NIL_OBLIGATION_TYPE_IDS = [
  'nil_obligation_type_appearance',
  'nil_obligation_type_community_visit',
  'nil_obligation_type_product_feedback',
  'nil_obligation_type_media_session',
  'nil_obligation_type_campaign_work',
] as const;
export const NIL_OFFER_IDS = [
  'nil_offer_neighborhood_breakfast_feature',
  'nil_offer_corner_store_game_card',
  'nil_offer_youth_route_clinic',
  'nil_offer_campus_arts_collaboration',
  'nil_offer_receiver_glove_workshop',
  'nil_offer_reusable_bottle_field_test',
  'nil_offer_hometown_audio_diary',
  'nil_offer_game_week_notebook',
  'nil_offer_regional_travel_story',
  'nil_offer_alumni_market_showcase',
] as const;
export const NIL_OBLIGATION_IDS = [
  'nil_obligation_neighborhood_breakfast_feature',
  'nil_obligation_corner_store_game_card',
  'nil_obligation_youth_route_clinic',
  'nil_obligation_campus_arts_collaboration',
  'nil_obligation_receiver_glove_workshop',
  'nil_obligation_reusable_bottle_field_test',
  'nil_obligation_hometown_audio_diary',
  'nil_obligation_game_week_notebook',
  'nil_obligation_regional_travel_story',
  'nil_obligation_alumni_market_showcase',
] as const;
export const OFFSEASON_COACH_CHANGE_IDS = [
  'offseason_coach_change_continuity',
  'offseason_coach_change_position_staff',
  'offseason_coach_change_scheme_shift',
] as const;
export const TRANSFER_PROJECTION_FACTOR_IDS = [
  'transfer_factor_role',
  'transfer_factor_snaps',
  'transfer_factor_scheme_fit',
  'transfer_factor_development',
  'transfer_factor_program_outlook',
  'transfer_factor_nil',
  'transfer_factor_academics',
  'transfer_factor_relationships',
  'transfer_factor_familiarity',
] as const;
export const TRANSFER_CONFIDENCE_TIER_IDS = [
  'transfer_confidence_high',
  'transfer_confidence_medium',
  'transfer_confidence_low',
] as const;

const localizedFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

const canonicalTuple = <const TValues extends readonly string[]>(values: TValues) =>
  z
    .array(z.object({ id: z.enum(values), ...localizedFields }).passthrough())
    .length(values.length)
    .refine(
      (entries) => entries.every((entry, index) => entry.id === values[index]),
      'Definitions must remain in canonical stable-ID order.',
    );

export const relationshipActorDefinitionSchema = z
  .object({
    ...localizedFields,
    coachTrustWeightPermille: z.number().int().min(0).max(1_000),
    highThreshold: z.number().int().min(0).max(100),
    id: z.enum(RELATIONSHIP_ACTOR_IDS),
    informationWeightPermille: z.number().int().min(0).max(1_000),
    initialValue: z.number().int().min(0).max(100),
    lowThreshold: z.number().int().min(0).max(100),
    opportunityWeightPermille: z.number().int().min(0).max(1_000),
  })
  .strict()
  .superRefine((actor, context) => {
    if (!(actor.lowThreshold < actor.initialValue && actor.initialValue < actor.highThreshold)) {
      context.addIssue({
        code: 'custom',
        message: 'Relationship thresholds must surround the initial value.',
        path: ['initialValue'],
      });
    }
    if (
      actor.coachTrustWeightPermille +
        actor.informationWeightPermille +
        actor.opportunityWeightPermille !==
      1_000
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Relationship football-consequence weights must total 1,000 permille.',
        path: ['coachTrustWeightPermille'],
      });
    }
  });

export const relationshipSourceDefinitionSchema = z
  .object({ ...localizedFields, id: z.enum(RELATIONSHIP_SOURCE_IDS) })
  .strict();

export const relationshipWeeklyRuleSchema = z
  .object({
    actionId: weeklyActionIdSchema,
    effects: z
      .array(
        z
          .object({
            actorId: z.enum(RELATIONSHIP_ACTOR_IDS),
            delta: z
              .number()
              .int()
              .min(-5)
              .max(5)
              .refine((value) => value !== 0),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict()
  .refine(
    (rule) => new Set(rule.effects.map(({ actorId }) => actorId)).size === rule.effects.length,
    {
      message: 'A weekly relationship rule may affect each actor once.',
      path: ['effects'],
    },
  );

const relationshipWeeklyRulesSchema = z
  .array(relationshipWeeklyRuleSchema)
  .min(1)
  .max(WEEKLY_ACTION_IDS.length)
  .superRefine((rules, context) => {
    if (new Set(rules.map(({ actionId }) => actionId)).size !== rules.length) {
      context.addIssue({
        code: 'custom',
        message: 'Weekly relationship action IDs must be unique.',
      });
    }
    for (let index = 1; index < rules.length; index += 1) {
      if (
        WEEKLY_ACTION_IDS.indexOf(rules[index - 1]!.actionId) >=
        WEEKLY_ACTION_IDS.indexOf(rules[index]!.actionId)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Weekly relationship rules must follow canonical weekly-action order.',
          path: [index, 'actionId'],
        });
      }
    }
  });

export const academicStatusDefinitionSchema = z
  .object({ ...localizedFields, id: z.enum(ACADEMIC_STATUS_IDS) })
  .strict();

export const academicCheckpointDefinitionSchema = z
  .object({
    ...localizedFields,
    id: z.enum(ACADEMIC_CHECKPOINT_IDS),
    weekIndex: z.number().int().min(1).max(64),
  })
  .strict();

export const academicTuningSchema = z
  .object({
    model: z.literal('academic_v1'),
    eligibleGpaMilli: z.number().int().min(0).max(4_000),
    warningGpaMilli: z.number().int().min(0).max(4_000),
    restrictionGames: z.number().int().min(1).max(3),
  })
  .strict()
  .refine((tuning) => tuning.warningGpaMilli < tuning.eligibleGpaMilli, {
    message: 'Warning GPA must be lower than the safe eligibility threshold.',
    path: ['warningGpaMilli'],
  });

export const offFieldBenefitDefinitionSchema = z
  .object({
    ...localizedFields,
    id: z.enum(OFF_FIELD_BENEFIT_IDS),
    maximumStack: z.number().int().min(1).max(9),
  })
  .strict();

export const nilCategoryDefinitionSchema = z
  .object({ ...localizedFields, id: z.enum(NIL_CATEGORY_IDS) })
  .strict();

export const nilEffectSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('nil_integer_state_delta'),
      stateId: z.enum([
        'nil_state_body',
        'nil_state_preparation',
        'nil_state_confidence',
        'nil_state_coach_trust',
        'nil_state_brand',
      ]),
      delta: z
        .number()
        .int()
        .min(-12)
        .max(12)
        .refine((value) => value !== 0),
    })
    .strict(),
  z
    .object({
      type: z.literal('nil_gpa_delta_milli'),
      deltaMilli: z
        .number()
        .int()
        .min(-250)
        .max(250)
        .refine((value) => value !== 0),
    })
    .strict(),
  z
    .object({
      type: z.literal('nil_funds_delta_usd'),
      deltaUsd: z
        .number()
        .int()
        .min(-500)
        .max(2_500)
        .refine((value) => value !== 0),
    })
    .strict(),
  z
    .object({
      type: z.literal('nil_relationship_delta'),
      actorId: z.enum(RELATIONSHIP_ACTOR_IDS),
      delta: z
        .number()
        .int()
        .min(-12)
        .max(12)
        .refine((value) => value !== 0),
    })
    .strict(),
  z
    .object({
      type: z.literal('nil_benefit_grant'),
      benefitId: z.enum(OFF_FIELD_BENEFIT_IDS),
      quantity: z.number().int().min(1).max(3),
    })
    .strict(),
]);

const nilEffectListSchema = z
  .array(nilEffectSchema)
  .min(1)
  .max(4)
  .superRefine((effects, context) => {
    const targets = effects.map((effect) =>
      effect.type === 'nil_integer_state_delta'
        ? effect.stateId
        : effect.type === 'nil_relationship_delta'
          ? `${effect.type}:${effect.actorId}`
          : effect.type === 'nil_benefit_grant'
            ? `${effect.type}:${effect.benefitId}`
            : effect.type,
    );
    if (new Set(targets).size !== targets.length) {
      context.addIssue({
        code: 'custom',
        message: 'A NIL effect list may affect each target at most once.',
      });
    }
  });

export const nilOfferRequirementsSchema = z
  .object({
    maximumDepthRank: z.number().int().min(1).max(8),
    minimumBrand: z.number().int().min(0).max(100),
    minimumGpaMilli: z.number().int().min(0).max(4_000),
    programStrengthBandIds: z
      .array(z.enum(PROGRAM_STRENGTH_BAND_IDS))
      .min(1)
      .max(PROGRAM_STRENGTH_BAND_IDS.length),
    requiredTagIds: z
      .array(
        stableContentIdSchema.refine((value) => value.startsWith('tag_'), 'Expected a tag_ ID.'),
      )
      .max(4),
  })
  .strict()
  .superRefine((requirements, context) => {
    for (const key of ['programStrengthBandIds', 'requiredTagIds'] as const) {
      if (new Set(requirements[key]).size !== requirements[key].length) {
        context.addIssue({ code: 'custom', message: `${key} must be unique.`, path: [key] });
      }
    }
  });

export const nilObligationDefinitionSchema = z
  .object({
    ...localizedFields,
    defaultEffects: nilEffectListSchema,
    durationWeeks: z.number().int().min(1).max(3),
    focusCost: z.number().int().min(1).max(2),
    id: z.enum(NIL_OBLIGATION_IDS),
    typeId: z.enum(NIL_OBLIGATION_TYPE_IDS),
    weeklyEffects: nilEffectListSchema,
  })
  .strict();

export const nilOfferDefinitionSchema = z
  .object({
    ...localizedFields,
    categoryId: z.enum(NIL_CATEGORY_IDS),
    expirationWeeks: z.number().int().min(1).max(4),
    id: z.enum(NIL_OFFER_IDS),
    obligation: nilObligationDefinitionSchema,
    requirements: nilOfferRequirementsSchema,
    rewardEffects: nilEffectListSchema,
    weight: z.number().int().min(1).max(1_000),
  })
  .strict()
  .refine(
    (offer) =>
      offer.rewardEffects.some(
        (effect) =>
          effect.type === 'nil_benefit_grant' ||
          (effect.type === 'nil_funds_delta_usd' && effect.deltaUsd > 0) ||
          (effect.type === 'nil_integer_state_delta' &&
            effect.stateId === 'nil_state_brand' &&
            effect.delta > 0),
      ),
    {
      message: 'A NIL offer must provide funds, Brand, or a bounded benefit.',
      path: ['rewardEffects'],
    },
  );

export const offseasonCoachChangeDefinitionSchema = z
  .object({
    ...localizedFields,
    changesScheme: z.boolean(),
    coachTrustRetentionPermille: z.number().int().min(0).max(1_000),
    id: z.enum(OFFSEASON_COACH_CHANGE_IDS),
    resetRelationshipActorIds: z.array(z.enum(RELATIONSHIP_ACTOR_IDS)).max(3),
    weight: z.number().int().min(1).max(1_000),
  })
  .strict()
  .refine(
    (change) =>
      new Set(change.resetRelationshipActorIds).size === change.resetRelationshipActorIds.length,
    { message: 'Reset relationship actors must be unique.', path: ['resetRelationshipActorIds'] },
  );

export const transferProjectionFactorDefinitionSchema = z
  .object({
    ...localizedFields,
    id: z.enum(TRANSFER_PROJECTION_FACTOR_IDS),
    weightPermille: z.number().int().min(1).max(1_000),
  })
  .strict();

export const transferConfidenceTierDefinitionSchema = z
  .object({
    ...localizedFields,
    id: z.enum(TRANSFER_CONFIDENCE_TIER_IDS),
    minimumInformationScore: z.number().int().min(0).max(100),
    uncertaintyPoints: z.number().int().min(0).max(30),
  })
  .strict();

export const offseasonTuningSchema = z
  .object({
    model: z.literal('offseason_v1'),
    advisorInsightInformationBonus: z.number().int().min(0).max(100),
    brandInformationDivisor: z.number().int().min(1).max(100),
    neutralTransferDepthRank: z.number().int().min(1).max(8),
    pressureMaximumInclusive: z.number().int().min(1).max(30),
    pressurePointsPerDepthRank: z.number().int().min(1).max(20),
    relationshipResetValue: z.number().int().min(0).max(100),
    stayFamiliarityBonus: z.number().int().min(0).max(20),
    transferCoachTrustRetentionPermille: z.number().int().min(0).max(1_000),
    transferFamiliarityScore: z.number().int().min(0).max(100),
    transferInformationBaseScore: z.number().int().min(0).max(100),
    transferShortlistSize: z.literal(3),
  })
  .strict();

export const offFieldContentSchema = z
  .object({
    academics: z
      .object({
        checkpoints: canonicalTuple(ACADEMIC_CHECKPOINT_IDS).pipe(
          z.array(academicCheckpointDefinitionSchema),
        ),
        statuses: canonicalTuple(ACADEMIC_STATUS_IDS).pipe(z.array(academicStatusDefinitionSchema)),
        tuning: academicTuningSchema,
      })
      .strict(),
    benefits: canonicalTuple(OFF_FIELD_BENEFIT_IDS).pipe(z.array(offFieldBenefitDefinitionSchema)),
    id: z.literal('off_field_wr_vertical_slice_v1'),
    model: z.literal('off_field_v1'),
    nil: z
      .object({
        categories: canonicalTuple(NIL_CATEGORY_IDS).pipe(z.array(nilCategoryDefinitionSchema)),
        offers: canonicalTuple(NIL_OFFER_IDS).pipe(z.array(nilOfferDefinitionSchema)),
      })
      .strict(),
    offseason: z
      .object({
        coachChanges: canonicalTuple(OFFSEASON_COACH_CHANGE_IDS).pipe(
          z.array(offseasonCoachChangeDefinitionSchema),
        ),
        confidenceTiers: canonicalTuple(TRANSFER_CONFIDENCE_TIER_IDS).pipe(
          z.array(transferConfidenceTierDefinitionSchema),
        ),
        projectionFactors: canonicalTuple(TRANSFER_PROJECTION_FACTOR_IDS).pipe(
          z.array(transferProjectionFactorDefinitionSchema),
        ),
        tuning: offseasonTuningSchema,
      })
      .strict(),
    relationships: z
      .object({
        actors: canonicalTuple(RELATIONSHIP_ACTOR_IDS).pipe(
          z.array(relationshipActorDefinitionSchema),
        ),
        sources: canonicalTuple(RELATIONSHIP_SOURCE_IDS).pipe(
          z.array(relationshipSourceDefinitionSchema),
        ),
        weeklyRules: relationshipWeeklyRulesSchema,
      })
      .strict(),
  })
  .strict();

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type OffFieldContent = DeepReadonly<z.infer<typeof offFieldContentSchema>>;
export type NilOfferDefinition = DeepReadonly<z.infer<typeof nilOfferDefinitionSchema>>;
export type NilEffectDefinition = DeepReadonly<z.infer<typeof nilEffectSchema>>;
