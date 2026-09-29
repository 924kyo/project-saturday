import { z } from 'zod';

import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { PROGRAM_TRAIT_IDS } from './programs.js';
import { RELATIONSHIP_CONTEXT_TAG_IDS } from './off-field.js';

export const EVENT_MODEL_IDS = ['event_v1'] as const;
export const EVENT_CATEGORY_IDS = [
  'event_category_development',
  'event_category_team',
  'event_category_media',
  'event_category_game_week',
  'event_category_relationship',
  'event_category_wr',
  'event_category_depth',
  'event_category_identity',
  'event_category_background',
  'event_category_personality',
  'event_category_program',
  'event_category_academics',
  'event_category_body',
  'event_category_mindset',
  'event_category_opportunity',
] as const;
export const EVENT_PROGRAM_TRAIT_TAG_IDS = PROGRAM_TRAIT_IDS.map(
  (traitId) => `tag_${traitId}` as const,
);
export const EVENT_CONTEXT_TAG_IDS = [
  'tag_season_camp',
  'tag_season_regular',
  'tag_season_postseason',
  'tag_game_spotlight',
  'tag_game_home',
  'tag_game_away',
  'tag_skill_event_option_access',
  ...RELATIONSHIP_CONTEXT_TAG_IDS,
  ...EVENT_PROGRAM_TRAIT_TAG_IDS,
] as const;

export const eventIdSchema = stableContentIdSchema.refine(
  (value) => value.startsWith('event_') && !value.startsWith('event_choice_'),
  'Expected an event_ stable ID.',
);
export const eventChoiceIdSchema = stableContentIdSchema.refine(
  (value) => value.startsWith('event_choice_'),
  'Expected an event_choice_ stable ID.',
);
export const eventCategoryIdSchema = z.enum(EVENT_CATEGORY_IDS);
export const eventPlayerTagIdSchema = stableContentIdSchema.refine(
  (value) => value.startsWith('tag_'),
  'Expected a tag_ stable ID.',
);

export const eventStatePredicateSchema = z
  .object({
    fieldId: z.enum([
      'event_state_body',
      'event_state_preparation',
      'event_state_confidence',
      'event_state_coach_trust',
      'event_state_brand',
      'event_state_gpa_milli',
      'event_state_depth_rank',
      'event_state_week_index',
    ]),
    operatorId: z.enum(['event_predicate_eq', 'event_predicate_gte', 'event_predicate_lte']),
    value: z.number().int().min(0).max(4_000),
  })
  .strict();

export const eventRequirementsSchema = z
  .object({
    allTagIds: z.array(eventPlayerTagIdSchema).max(12),
    anyTagIds: z.array(eventPlayerTagIdSchema).max(12),
    excludedTagIds: z.array(eventPlayerTagIdSchema).max(12),
    statePredicates: z.array(eventStatePredicateSchema).max(8),
  })
  .strict()
  .superRefine((requirements, context) => {
    for (const key of ['allTagIds', 'anyTagIds', 'excludedTagIds'] as const) {
      if (new Set(requirements[key]).size !== requirements[key].length) {
        context.addIssue({ code: 'custom', message: `${key} must be unique.`, path: [key] });
      }
    }
    const excluded = new Set(requirements.excludedTagIds);
    if (
      requirements.allTagIds.some((tagId) => excluded.has(tagId)) ||
      requirements.anyTagIds.some((tagId) => excluded.has(tagId))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Required and excluded event tags cannot overlap.',
        path: ['excludedTagIds'],
      });
    }
  });

export const eventEffectSchema = z.discriminatedUnion('type', [
  z
    .object({
      delta: z
        .number()
        .int()
        .min(-20)
        .max(20)
        .refine((value) => value !== 0),
      stateId: z.enum([
        'event_state_body',
        'event_state_preparation',
        'event_state_confidence',
        'event_state_coach_trust',
        'event_state_brand',
      ]),
      type: z.literal('event_integer_state_delta'),
    })
    .strict(),
  z
    .object({
      deltaMilli: z
        .number()
        .int()
        .min(-500)
        .max(500)
        .refine((value) => value !== 0),
      type: z.literal('event_gpa_delta_milli'),
    })
    .strict(),
  z
    .object({
      points: z
        .number()
        .int()
        .min(-30)
        .max(30)
        .refine((value) => value !== 0),
      type: z.literal('event_breakthrough_gauge_delta'),
    })
    .strict(),
]);

export const eventChoiceDefinitionSchema = z
  .object({
    descriptionKey: messageKeyFormatSchema,
    effects: z.array(eventEffectSchema).min(1).max(3),
    id: eventChoiceIdSchema,
    kind: z.literal('event_choice'),
    nameKey: messageKeyFormatSchema,
  })
  .strict()
  .superRefine((choice, context) => {
    const targets = choice.effects.map((effect) =>
      effect.type === 'event_integer_state_delta' ? effect.stateId : effect.type,
    );
    if (new Set(targets).size !== targets.length) {
      context.addIssue({
        code: 'custom',
        message: 'A choice may affect each event target at most once.',
        path: ['effects'],
      });
    }
  });

export const eventDefinitionSchema = z
  .object({
    categoryIds: z.array(eventCategoryIdSchema).min(1).max(6),
    choices: z.array(eventChoiceDefinitionSchema).min(2).max(3),
    cooldownWeeks: z.number().int().min(0).max(52),
    descriptionKey: messageKeyFormatSchema,
    id: eventIdSchema,
    kind: z.literal('event'),
    nameKey: messageKeyFormatSchema,
    requirements: eventRequirementsSchema,
    weight: z.number().int().min(1).max(1_000),
  })
  .strict()
  .superRefine((event, context) => {
    if (new Set(event.categoryIds).size !== event.categoryIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Event categories must be unique.',
        path: ['categoryIds'],
      });
    }
    if (new Set(event.choices.map(({ id }) => id)).size !== event.choices.length) {
      context.addIssue({
        code: 'custom',
        message: 'Event choice IDs must be unique.',
        path: ['choices'],
      });
    }
    for (const [predicateIndex, predicate] of event.requirements.statePredicates.entries()) {
      const maximum =
        predicate.fieldId === 'event_state_gpa_milli'
          ? 4_000
          : predicate.fieldId === 'event_state_depth_rank'
            ? 8
            : predicate.fieldId === 'event_state_week_index'
              ? 64
              : 100;
      const minimum = predicate.fieldId === 'event_state_depth_rank' ? 1 : 0;
      if (predicate.value < minimum || predicate.value > maximum) {
        context.addIssue({
          code: 'custom',
          message: `Predicate value must be within ${minimum}–${maximum} for ${predicate.fieldId}.`,
          path: ['requirements', 'statePredicates', predicateIndex, 'value'],
        });
      }
    }
  });

export const eventContentSchema = z
  .object({
    events: z.array(eventDefinitionSchema).min(50).max(70),
    id: z.literal('events_wr_vertical_slice_v1'),
    model: z.enum(EVENT_MODEL_IDS),
    selectionTuning: z.object({ eventChancePermille: z.number().int().min(0).max(1_000) }).strict(),
  })
  .strict();

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type EventCategoryId = (typeof EVENT_CATEGORY_IDS)[number];
export type EventChoiceDefinition = DeepReadonly<z.infer<typeof eventChoiceDefinitionSchema>>;
export type EventContent = DeepReadonly<z.infer<typeof eventContentSchema>>;
export type EventDefinition = DeepReadonly<z.infer<typeof eventDefinitionSchema>>;
export type EventEffectDefinition = DeepReadonly<z.infer<typeof eventEffectSchema>>;
